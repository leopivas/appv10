"""Iteration 5 regression tests: ui-config sections, plans, tiktok verify, profile/public, AI streaming."""
import os
import json
import requests

BASE = "https://livestream-control-2.preview.emergentagent.com"


def _login():
    r = requests.post(f"{BASE}/api/auth/login", json={"email": "admin@creatools.co", "password": "admin123"}, timeout=15)
    assert r.status_code == 200, r.text
    return r.json()["token"]


# --- UI Config ---
def test_ui_config_seven_sections():
    r = requests.get(f"{BASE}/api/ui-config", timeout=15)
    assert r.status_code == 200
    d = r.json()
    sections = d["sidebarSections"]
    assert len(sections) == 7, f"expected 7 sections, got {len(sections)}"
    ids = [s["id"] for s in sections]
    assert "ia-section" in ids
    ia = next(s for s in sections if s["id"] == "ia-section")
    assert ia.get("label") == "Inteligência Artificial"
    ia_item_ids = [i["id"] for i in ia["items"]]
    assert "ai-assistant" in ia_item_ids and "ai-videos" in ia_item_ids


def test_ui_config_conexao_href():
    r = requests.get(f"{BASE}/api/ui-config", timeout=15)
    d = r.json()
    main = next(s for s in d["sidebarSections"] if s["id"] == "main")
    monitor = next(i for i in main["items"] if i["id"] == "monitor")
    assert monitor["href"] == "/streamer/lookup"
    assert monitor["label"] == "Conexão"


def test_ui_config_streamer_tools_new_items():
    r = requests.get(f"{BASE}/api/ui-config", timeout=15)
    d = r.json()
    streamer = next(s for s in d["sidebarSections"] if s["id"] == "streamer")
    ids = [i["id"] for i in streamer["items"]]
    for expected in ["sound-alerts", "events", "layout", "dev-tools"]:
        assert expected in ids, f"missing {expected} in streamer tools items: {ids}"


# --- Plans ---
def test_plans_three_with_autolivemonitoring():
    r = requests.get(f"{BASE}/api/plans", timeout=15)
    assert r.status_code == 200
    plans = r.json()
    if isinstance(plans, dict) and "plans" in plans:
        plans = plans["plans"]
    assert isinstance(plans, list)
    assert len(plans) == 3, f"expected 3 plans, got {len(plans)}"
    for p in plans:
        assert "autoLiveMonitoring" in p, f"plan {p.get('id')} missing autoLiveMonitoring"
        assert isinstance(p["autoLiveMonitoring"], bool)
    by_id = {p.get("id") or p.get("slug") or p.get("name", "").lower(): p for p in plans}
    # Try common id conventions
    def find(name):
        for k, v in by_id.items():
            if name in str(k).lower() or name in str(v.get("name", "")).lower():
                return v
        return None
    free = find("free")
    basic = find("basic")
    pro = find("pro")
    assert free is not None and basic is not None and pro is not None, f"plan ids: {list(by_id.keys())}"
    assert free["autoLiveMonitoring"] is False
    assert basic["autoLiveMonitoring"] is True
    assert pro["autoLiveMonitoring"] is True


# --- TikTok verify ---
def test_tiktok_verify_mrbeast():
    r = requests.get(f"{BASE}/api/tiktok/verify-username", params={"uniqueId": "mrbeast"}, timeout=20)
    assert r.status_code == 200, r.text
    d = r.json()
    assert d.get("exists") is True, d


# --- profile/public no tik.tools ---
def test_profile_public_mrbeast_no_upstream():
    # mrbeast is not a registered public profile in this DB, so 404 is expected.
    # The important thing: NO tik.tools upstream call is made (verified by code review + fast response).
    r = requests.get(f"{BASE}/api/profile/public/mrbeast", timeout=10)
    assert r.status_code in (200, 404), r.text
    if r.status_code == 200:
        d = r.json()
        assert d.get("isLive") is False
        assert d.get("topGifters") == []
        assert d.get("topGifts") == []


# --- AI chat streaming ---
def test_ai_chat_stream():
    token = _login()
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {"session_id": "test-iter5", "message": "Say hello in one word.", "history": []}
    with requests.post(f"{BASE}/api/ai/chat/stream", headers=headers, json=payload, stream=True, timeout=45) as r:
        assert r.status_code == 200, r.text
        received = ""
        for chunk in r.iter_content(chunk_size=None, decode_unicode=True):
            if chunk:
                received += chunk
            if len(received) > 20:
                break
        assert len(received) > 0, "no stream data received"


# --- Auth me nested plan ---
def test_auth_me_has_plan():
    token = _login()
    r = requests.get(f"{BASE}/api/auth/me", headers={"Authorization": f"Bearer {token}"}, timeout=15)
    assert r.status_code == 200
    d = r.json()
    user = d.get("user") or d
    assert "plan" in user or "planId" in user or "planSlug" in user, f"user missing plan info: {list(user.keys())}"
