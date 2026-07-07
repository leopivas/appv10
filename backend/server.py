from fastapi import FastAPI, Request, Response
from fastapi.responses import StreamingResponse, PlainTextResponse
import atexit
import logging
import os
import pathlib
import signal
import subprocess
import time

import httpx
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("proxy")

app = FastAPI(title="Creatools Proxy")

# ── AI router (Claude + Sora + Object Storage) ── mounted BEFORE proxy catch-all
from ai_router import router as ai_router  # noqa: E402
app.include_router(ai_router)

NODE_URL = "http://127.0.0.1:8081"
node_proc: subprocess.Popen | None = None

def start_node():
    global node_proc
    if node_proc and node_proc.poll() is None:
        return
    workdir = pathlib.Path("/app/tiks/artifacts/api-server")
    env = os.environ.copy()
    env["PORT"] = "8081"
    env["NODE_ENV"] = env.get("NODE_ENV", "development")
    env["JWT_SECRET"] = env.get("JWT_SECRET", "creatools-secret-change-in-production")
    log.info("Starting Node api-server on 8081...")
    node_proc = subprocess.Popen(
        ["node", "--enable-source-maps", "./dist/index.mjs"],
        cwd=str(workdir), env=env,
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        start_new_session=True,
    )
    # wait until healthy
    for _ in range(40):
        try:
            r = httpx.get(f"{NODE_URL}/api/healthz", timeout=1.0)
            if r.status_code == 200:
                log.info("Node ready")
                return
        except Exception:
            pass
        time.sleep(0.5)
    log.warning("Node health check timed out")

def stop_node():
    global node_proc
    if node_proc and node_proc.poll() is None:
        try:
            os.killpg(os.getpgid(node_proc.pid), signal.SIGTERM)
        except Exception:
            pass
atexit.register(stop_node)

@app.on_event("startup")
async def _startup():
    start_node()

_client = httpx.AsyncClient(base_url=NODE_URL, timeout=60.0)

@app.get("/api/_proxy/health")
async def health():
    try:
        r = await _client.get("/api/healthz")
        return {"proxy": "ok", "node": r.json()}
    except Exception as e:
        return {"proxy": "ok", "node_error": str(e)}

@app.api_route("/api/{full_path:path}", methods=["GET","POST","PUT","PATCH","DELETE","OPTIONS","HEAD"])
async def proxy(full_path: str, request: Request):
    if node_proc is None or node_proc.poll() is not None:
        start_node()
    body = await request.body()
    headers = {k: v for k, v in request.headers.items() if k.lower() not in ("host", "content-length")}
    try:
        r = await _client.request(
            request.method, f"/api/{full_path}",
            params=request.query_params, content=body, headers=headers,
        )
    except httpx.RequestError as e:
        return PlainTextResponse(f"upstream error: {e}", status_code=502)
    resp_headers = {k: v for k, v in r.headers.items() if k.lower() not in ("content-encoding", "transfer-encoding", "content-length", "connection")}
    return Response(content=r.content, status_code=r.status_code, headers=resp_headers, media_type=r.headers.get("content-type"))
