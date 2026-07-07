"""Iteration 3 tests: AI (chat + video) + regression (plans, TikTok, auth)."""
import json
import os
import time
import requests
import pytest

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://livestream-control-2.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "admin@creatools.co"
ADMIN_PASS = "admin123"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def auth_headers(token):
    return {"Authorization": f"Bearer {token}"}


# ─── Regression: auth /me ──────────────────────────────────────────────
def test_auth_me_admin_pro(auth_headers):
    r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    u = r.json().get("user", r.json())
    assert u.get("plan") == "pro"
    assert u.get("isAdmin") is True


# ─── Regression: public /api/plans ─────────────────────────────────────
def test_plans_public_with_limits():
    r = requests.get(f"{BASE_URL}/api/plans", timeout=15)
    assert r.status_code == 200
    plans = r.json().get("plans", [])
    assert len(plans) >= 3
    pro = next((p for p in plans if p["id"] == "pro"), None)
    assert pro is not None
    # Granular limit fields present
    for f in ("maxAiChatMessagesPerDay", "maxAiVideoGenerationsPerMonth",
              "maxLiveHoursPerDay", "maxActiveOverlays",
              "maxActiveScoreboards", "maxActiveMinigames"):
        assert f in pro, f"missing {f}"


# ─── TikTok verify regression ──────────────────────────────────────────
@pytest.mark.parametrize("handle,min_followers", [
    ("mrbeast", 1_000_000),
    ("charlidamelio", 1_000_000),
    ("khaby.lame", 1_000_000),
])
def test_tiktok_verify_real(handle, min_followers):
    r = requests.get(f"{BASE_URL}/api/tiktok/verify-username", params={"uniqueId": handle}, timeout=20)
    assert r.status_code == 200
    d = r.json()
    assert d.get("exists") is True, d
    assert d.get("nickname")
    assert d.get("profilePictureUrl")
    assert (d.get("followerCount") or 0) >= min_followers


def test_tiktok_verify_fake():
    r = requests.get(f"{BASE_URL}/api/tiktok/verify-username", params={"uniqueId": "xxxxx_fake_zzzzz_12345"}, timeout=20)
    assert r.status_code == 200
    assert r.json().get("exists") is False


# ─── AI Chat usage ─────────────────────────────────────────────────────
def test_ai_chat_usage_admin(auth_headers):
    r = requests.get(f"{BASE_URL}/api/ai/chat/usage", headers=auth_headers, timeout=15)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("limit") == -1
    assert d.get("unlimited") is True
    assert "used_today" in d


def test_ai_chat_usage_no_auth():
    r = requests.get(f"{BASE_URL}/api/ai/chat/usage", timeout=15)
    assert r.status_code == 401


# ─── AI Chat streaming (small prompt) ──────────────────────────────────
def test_ai_chat_stream(auth_headers):
    payload = {
        "session_id": f"test-{int(time.time())}",
        "message": "Diga apenas: Ola streamer!",
        "history": [],
    }
    with requests.post(
        f"{BASE_URL}/api/ai/chat/stream",
        headers={**auth_headers, "Accept": "text/event-stream"},
        json=payload,
        stream=True,
        timeout=60,
    ) as r:
        assert r.status_code == 200, r.text
        collected = ""
        got_done = False
        start = time.time()
        for line in r.iter_lines(decode_unicode=True):
            if time.time() - start > 45:
                break
            if not line or not line.startswith("data:"):
                continue
            try:
                data = json.loads(line[5:].strip())
            except Exception:
                continue
            if data.get("delta"):
                collected += data["delta"]
            if data.get("done"):
                got_done = True
                break
            if data.get("error"):
                pytest.fail(f"stream error: {data['error']}")
        assert got_done or len(collected) > 0, f"no content collected: {collected!r}"


# ─── AI Video generate (do NOT wait for completion) ────────────────────
def test_ai_video_usage(auth_headers):
    r = requests.get(f"{BASE_URL}/api/ai/video/usage", headers=auth_headers, timeout=15)
    assert r.status_code == 200
    d = r.json()
    assert d.get("limit") == 20  # pro plan
    assert d.get("unlimited") is False


def test_ai_video_generate_pending(auth_headers):
    r = requests.post(
        f"{BASE_URL}/api/ai/video/generate",
        headers=auth_headers,
        json={"prompt": "test small clip", "model": "sora-2", "size": "1024x1792", "duration": 4},
        timeout=30,
    )
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("status") == "pending"
    vid = d.get("video_id")
    assert vid
    # ensure listed
    r2 = requests.get(f"{BASE_URL}/api/ai/videos", headers=auth_headers, timeout=15)
    assert r2.status_code == 200
    ids = [v["id"] for v in r2.json().get("videos", [])]
    assert vid in ids
    # usage now >=1
    r3 = requests.get(f"{BASE_URL}/api/ai/video/usage", headers=auth_headers, timeout=15)
    assert r3.status_code == 200
    assert r3.json().get("used_this_month", 0) >= 1


def test_ai_video_generate_invalid_duration(auth_headers):
    r = requests.post(
        f"{BASE_URL}/api/ai/video/generate",
        headers=auth_headers,
        json={"prompt": "test", "model": "sora-2", "size": "1024x1792", "duration": 5},
        timeout=15,
    )
    assert r.status_code == 400
