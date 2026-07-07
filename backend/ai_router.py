"""
Creatools AI Router — Claude Sonnet 4.5 (chat) + Sora 2 (video) + Emergent Object Storage.

Mounted BEFORE the Node proxy in server.py. All routes are under /api/ai/*.
Auth: Bearer JWT (validated against Node backend at /api/auth/me).
"""
from __future__ import annotations

import asyncio
import json
import logging
import os
import uuid
from datetime import datetime, timezone
from typing import Any, AsyncGenerator, Optional

import httpx
import requests
from dotenv import load_dotenv
from fastapi import APIRouter, Depends, Header, HTTPException, Response
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

load_dotenv()

log = logging.getLogger("ai")
router = APIRouter(prefix="/api/ai", tags=["ai"])

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY", "")
NODE_URL = "http://127.0.0.1:8081"
STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
APP_NAME = "creatools"

# ── Simple in-process rate-limit / usage tracking ────────────────────────────
# NOTE: for production, move to Postgres. This is intentionally lightweight.
_chat_usage: dict[str, list[float]] = {}  # user_id -> list[timestamp]
_video_usage: dict[str, list[float]] = {}  # user_id -> list[timestamp]

_storage_key: Optional[str] = None


def _init_storage() -> Optional[str]:
    global _storage_key
    if _storage_key:
        return _storage_key
    if not EMERGENT_LLM_KEY:
        return None
    try:
        r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_LLM_KEY}, timeout=30)
        r.raise_for_status()
        _storage_key = r.json()["storage_key"]
        log.info("Object storage initialized")
        return _storage_key
    except Exception as e:  # noqa: BLE001
        log.warning("Storage init failed: %s", e)
        return None


def _put_object(path: str, data: bytes, content_type: str) -> dict[str, Any]:
    key = _init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Object storage unavailable")
    r = requests.put(
        f"{STORAGE_URL}/objects/{path}",
        headers={"X-Storage-Key": key, "Content-Type": content_type},
        data=data,
        timeout=120,
    )
    if r.status_code == 403:
        # storage key expired — retry once
        global _storage_key
        _storage_key = None
        key = _init_storage()
        if key:
            r = requests.put(
                f"{STORAGE_URL}/objects/{path}",
                headers={"X-Storage-Key": key, "Content-Type": content_type},
                data=data,
                timeout=120,
            )
    r.raise_for_status()
    return r.json()


def _get_object(path: str) -> tuple[bytes, str]:
    key = _init_storage()
    if not key:
        raise HTTPException(status_code=503, detail="Object storage unavailable")
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": key}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")


# ── Auth: validate token via Node backend /api/auth/me ──────────────────────
async def get_current_user(authorization: str = Header(default="")) -> dict[str, Any]:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing bearer token")
    token = authorization.removeprefix("Bearer ").strip()
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(
            f"{NODE_URL}/api/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
    if r.status_code != 200:
        raise HTTPException(status_code=401, detail="Invalid token")
    data = r.json()
    return data.get("user", data)


# ── Plan enforcement ────────────────────────────────────────────────────────
async def _get_plan_limits(plan_id: str) -> dict[str, int]:
    """Fetch plan limits from Node backend public GET /api/plans."""
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(f"{NODE_URL}/api/plans")
        if r.status_code != 200:
            return {}
        for p in r.json().get("plans", []):
            if p.get("id") == plan_id:
                return p
    return {}


def _check_limit(usage_map: dict[str, list[float]], user_id: str, limit: int, window_seconds: int) -> tuple[bool, int]:
    """Returns (allowed, count_in_window). limit=-1 => unlimited, 0 => blocked."""
    now = datetime.now(timezone.utc).timestamp()
    cutoff = now - window_seconds
    used = [t for t in usage_map.get(user_id, []) if t >= cutoff]
    usage_map[user_id] = used
    if limit == -1:
        return True, len(used)
    if limit == 0:
        return False, len(used)
    return len(used) < limit, len(used)


def _record_use(usage_map: dict[str, list[float]], user_id: str) -> None:
    now = datetime.now(timezone.utc).timestamp()
    usage_map.setdefault(user_id, []).append(now)


# ═════════════════════════════════════════════════════════════════════════════
# Chat with Claude Sonnet 4.5 (streaming SSE)
# ═════════════════════════════════════════════════════════════════════════════

class ChatMessage(BaseModel):
    role: str  # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    session_id: str = Field(..., description="Persistent conversation id")
    message: str
    history: list[ChatMessage] = Field(default_factory=list)


SYSTEM_PROMPT_PT = (
    "Você é o assistente oficial do Creatools, uma plataforma completa para streamers "
    "do TikTok Live (overlays, scoreboards, minigames, análises, gifts, alertas). "
    "Ajude o criador a: crescer a audiência, otimizar streams, entender métricas, "
    "escrever títulos e descrições, sugerir ideias de conteúdo, e configurar as "
    "ferramentas do Creatools. Responda em português (pt-BR) por padrão, seja "
    "objetivo, prático, e use bullet points quando fizer sentido. Se o usuário "
    "escrever em outro idioma, responda no mesmo idioma."
)


@router.post("/chat/stream")
async def chat_stream(req: ChatRequest, user: dict = Depends(get_current_user)):
    """SSE endpoint streaming Claude Sonnet 4.5 tokens."""
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="EMERGENT_LLM_KEY not configured")

    plan = user.get("plan", "free")
    limits = await _get_plan_limits(plan)
    daily = int(limits.get("maxAiChatMessagesPerDay", 0))
    allowed, used = _check_limit(_chat_usage, user["id"], daily, 24 * 3600)
    if not allowed:
        raise HTTPException(
            status_code=402,
            detail=f"Limite de mensagens IA atingido ({used}/{daily}). Faça upgrade do plano.",
        )
    _record_use(_chat_usage, user["id"])

    from emergentintegrations.llm.chat import LlmChat, UserMessage, TextDelta, StreamDone

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=req.session_id,
        system_message=SYSTEM_PROMPT_PT,
    ).with_model("anthropic", "claude-sonnet-4-5-20250929")

    # Replay history so Claude has full context
    for m in req.history[-20:]:  # cap to last 20 turns
        if m.role == "user":
            # emergentintegrations manages history internally per session_id
            pass  # we rely on session_id continuity

    async def event_gen() -> AsyncGenerator[bytes, None]:
        try:
            async for ev in chat.stream_message(UserMessage(text=req.message)):
                if isinstance(ev, TextDelta):
                    payload = json.dumps({"delta": ev.content})
                    yield f"data: {payload}\n\n".encode()
                elif isinstance(ev, StreamDone):
                    yield b"data: {\"done\": true}\n\n"
                    break
        except Exception as e:  # noqa: BLE001
            log.exception("chat stream failed")
            err = json.dumps({"error": str(e)})
            yield f"data: {err}\n\n".encode()

    return StreamingResponse(
        event_gen(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@router.get("/chat/usage")
async def chat_usage(user: dict = Depends(get_current_user)) -> dict[str, Any]:
    plan = user.get("plan", "free")
    limits = await _get_plan_limits(plan)
    daily = int(limits.get("maxAiChatMessagesPerDay", 0))
    _, used = _check_limit(_chat_usage, user["id"], daily, 24 * 3600)
    return {"used_today": used, "limit": daily, "unlimited": daily == -1}


# ═════════════════════════════════════════════════════════════════════════════
# Video generation with Sora 2  →  Object Storage
# ═════════════════════════════════════════════════════════════════════════════

class VideoRequest(BaseModel):
    prompt: str
    model: str = "sora-2"          # or "sora-2-pro"
    size: str = "1024x1792"        # vertical for TikTok
    duration: int = 4              # 4, 8, or 12

class VideoRecord(BaseModel):
    id: str
    user_id: str
    prompt: str
    model: str
    size: str
    duration: int
    status: str  # pending | ready | failed
    storage_path: Optional[str] = None
    error: Optional[str] = None
    created_at: str


_videos: dict[str, VideoRecord] = {}  # in-memory registry (moves to DB later)


def _generate_video_sync(record_id: str, prompt: str, model: str, size: str, duration: int, user_id: str) -> None:
    """Runs in background thread. Persists result in _videos + object storage."""
    from emergentintegrations.llm.openai.video_generation import OpenAIVideoGeneration
    try:
        vg = OpenAIVideoGeneration(api_key=EMERGENT_LLM_KEY)
        video_bytes = vg.text_to_video(
            prompt=prompt,
            model=model,
            size=size,
            duration=duration,
            max_wait_time=900,
        )
        if not video_bytes:
            _videos[record_id].status = "failed"
            _videos[record_id].error = "empty response"
            return
        path = f"{APP_NAME}/ai-videos/{user_id}/{record_id}.mp4"
        _put_object(path, video_bytes, "video/mp4")
        _videos[record_id].storage_path = path
        _videos[record_id].status = "ready"
        log.info("video %s ready at %s", record_id, path)
    except Exception as e:  # noqa: BLE001
        log.exception("video %s failed", record_id)
        _videos[record_id].status = "failed"
        _videos[record_id].error = str(e)[:500]


@router.post("/video/generate")
async def video_generate(req: VideoRequest, user: dict = Depends(get_current_user)) -> dict[str, Any]:
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=503, detail="EMERGENT_LLM_KEY not configured")

    plan = user.get("plan", "free")
    limits = await _get_plan_limits(plan)
    monthly = int(limits.get("maxAiVideoGenerationsPerMonth", 0))
    allowed, used = _check_limit(_video_usage, user["id"], monthly, 30 * 24 * 3600)
    if not allowed:
        raise HTTPException(
            status_code=402,
            detail=f"Limite de vídeos IA atingido ({used}/{monthly} este mês). Faça upgrade do plano.",
        )

    if req.size not in ("1280x720", "1792x1024", "1024x1792", "1024x1024"):
        raise HTTPException(status_code=400, detail="Tamanho inválido")
    if req.duration not in (4, 8, 12):
        raise HTTPException(status_code=400, detail="Duração deve ser 4, 8 ou 12s")
    if req.model not in ("sora-2", "sora-2-pro"):
        raise HTTPException(status_code=400, detail="Modelo inválido")

    _record_use(_video_usage, user["id"])

    record_id = str(uuid.uuid4())
    _videos[record_id] = VideoRecord(
        id=record_id,
        user_id=user["id"],
        prompt=req.prompt,
        model=req.model,
        size=req.size,
        duration=req.duration,
        status="pending",
        created_at=datetime.now(timezone.utc).isoformat(),
    )

    # fire and forget
    loop = asyncio.get_running_loop()
    loop.run_in_executor(None, _generate_video_sync, record_id, req.prompt, req.model, req.size, req.duration, user["id"])

    return {"video_id": record_id, "status": "pending"}


@router.get("/video/usage")
async def video_usage(user: dict = Depends(get_current_user)) -> dict[str, Any]:
    plan = user.get("plan", "free")
    limits = await _get_plan_limits(plan)
    monthly = int(limits.get("maxAiVideoGenerationsPerMonth", 0))
    _, used = _check_limit(_video_usage, user["id"], monthly, 30 * 24 * 3600)
    return {"used_this_month": used, "limit": monthly, "unlimited": monthly == -1}


@router.get("/video/{video_id}")
async def video_status(video_id: str, user: dict = Depends(get_current_user)) -> dict[str, Any]:
    rec = _videos.get(video_id)
    if not rec or rec.user_id != user["id"]:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    return rec.model_dump()


@router.get("/video/{video_id}/file")
async def video_file(video_id: str, auth: str = "", authorization: str = Header(default="")) -> Response:
    # Accept ?auth= for direct <video src> loading
    header = authorization or (f"Bearer {auth}" if auth else "")
    user = await get_current_user(header)
    rec = _videos.get(video_id)
    if not rec or rec.user_id != user["id"]:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    if rec.status != "ready" or not rec.storage_path:
        raise HTTPException(status_code=425, detail="Ainda processando")
    data, ct = _get_object(rec.storage_path)
    return Response(content=data, media_type=ct)


@router.get("/videos")
async def list_videos(user: dict = Depends(get_current_user)) -> dict[str, Any]:
    mine = [v.model_dump() for v in _videos.values() if v.user_id == user["id"]]
    mine.sort(key=lambda x: x["created_at"], reverse=True)
    return {"videos": mine}


@router.delete("/video/{video_id}")
async def delete_video(video_id: str, user: dict = Depends(get_current_user)) -> dict[str, Any]:
    rec = _videos.get(video_id)
    if not rec or rec.user_id != user["id"]:
        raise HTTPException(status_code=404, detail="Vídeo não encontrado")
    _videos.pop(video_id, None)
    return {"ok": True}


# Init storage lazily; do not fail startup if unavailable
_init_storage()
