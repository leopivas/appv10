"""
Regression + feature tests for:
  1) TikTok verify-username fix (oEmbed primary)
  2) Auth login / /me regression
  3) Granular plan limits (admin PATCH + GET /admin/plans)
"""
import os
import pytest
import requests

BASE_URL = "https://livestream-control-2.preview.emergentagent.com"
ADMIN_EMAIL = "admin@creatools.co"
ADMIN_PASSWORD = "admin123"


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=15,
    )
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    assert "token" in data and data["user"]["isAdmin"] is True
    return data["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}


# ---------- AUTH REGRESSION ----------
class TestAuthRegression:
    def test_login_success(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
            timeout=15,
        )
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["email"] == ADMIN_EMAIL
        assert d["user"]["plan"] == "pro"
        assert d["user"]["isAdmin"] is True

    def test_me_endpoint(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=admin_headers, timeout=15)
        assert r.status_code == 200
        d = r.json()
        # /me might return { user: {...} } or a flat user; accept both
        user = d.get("user", d)
        assert user["email"] == ADMIN_EMAIL

    def test_login_invalid(self):
        r = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": ADMIN_EMAIL, "password": "wrongpw"},
            timeout=15,
        )
        assert r.status_code in (400, 401, 403)


# ---------- TIKTOK VERIFY ----------
class TestTikTokVerify:
    @pytest.mark.parametrize("uid", ["mrbeast", "charlidamelio", "khaby.lame"])
    def test_real_users(self, uid, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/tiktok/verify-username",
            params={"uniqueId": uid},
            headers=admin_headers,
            timeout=20,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d.get("exists") is True, f"expected exists=true for {uid}, got {d}"
        assert d.get("uniqueId", "").lower() == uid.lower()
        assert d.get("nickname"), f"missing nickname for {uid}"
        assert d.get("profilePictureUrl"), f"missing avatar for {uid}"

    def test_fake_user(self, admin_headers):
        r = requests.get(
            f"{BASE_URL}/api/tiktok/verify-username",
            params={"uniqueId": "xxxxxx_fake_yyyy_12345"},
            headers=admin_headers,
            timeout=20,
        )
        assert r.status_code == 200
        d = r.json()
        assert d.get("exists") is False

    def test_link_via_profile_patch(self, admin_headers):
        # Link a TikTok account through PATCH /api/auth/profile
        r = requests.patch(
            f"{BASE_URL}/api/auth/profile",
            headers=admin_headers,
            json={"tiktokUsername": "mrbeast"},
            timeout=20,
        )
        # Might be limited if change count exceeded; accept both success + limit err
        assert r.status_code in (200, 400, 403, 429), r.text
        if r.status_code == 200:
            d = r.json()
            user = d.get("user", d)
            assert user.get("tiktokUsername", "").lower() == "mrbeast"


# ---------- ADMIN PLANS GRANULAR LIMITS ----------
NEW_FIELDS = [
    "maxLiveHoursPerDay",
    "maxActiveOverlays",
    "maxActiveScoreboards",
    "maxActiveMinigames",
    "maxAiChatMessagesPerDay",
    "maxAiVideoGenerationsPerMonth",
]


class TestPlansGranular:
    def test_list_plans_has_new_fields(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/plans", headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        plans = data if isinstance(data, list) else data.get("plans", [])
        assert plans, "no plans returned"
        p0 = plans[0]
        missing = [f for f in NEW_FIELDS if f not in p0]
        assert not missing, f"missing fields in plan: {missing} — plan keys: {list(p0.keys())}"

    def test_patch_plan_persists(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/plans", headers=admin_headers, timeout=15)
        plans = r.json() if isinstance(r.json(), list) else r.json().get("plans", [])
        plan = plans[0]
        plan_id = plan.get("id") or plan.get("_id") or plan.get("slug")
        assert plan_id, f"no plan id, plan keys: {list(plan.keys())}"

        payload = {
            "maxLiveHoursPerDay": 12,
            "maxActiveOverlays": 5,
            "maxActiveScoreboards": 3,
            "maxActiveMinigames": 4,
            "maxAiChatMessagesPerDay": 200,
            "maxAiVideoGenerationsPerMonth": 25,
        }
        r2 = requests.patch(
            f"{BASE_URL}/api/admin/plans/{plan_id}",
            headers=admin_headers,
            json=payload,
            timeout=15,
        )
        assert r2.status_code in (200, 204), r2.text

        # Verify persistence via GET
        r3 = requests.get(f"{BASE_URL}/api/admin/plans", headers=admin_headers, timeout=15)
        plans2 = r3.json() if isinstance(r3.json(), list) else r3.json().get("plans", [])
        got = next((p for p in plans2 if (p.get("id") or p.get("_id") or p.get("slug")) == plan_id), None)
        assert got is not None
        for k, v in payload.items():
            assert got.get(k) == v, f"{k} not persisted: got {got.get(k)} want {v}"


# ---------- OVERLAYS REGRESSION ----------
class TestOverlaysRegression:
    def test_layouts_list(self, admin_headers):
        # Overlay Studio backend is served under /api/layouts
        r = requests.get(f"{BASE_URL}/api/layouts", headers=admin_headers, timeout=15)
        assert r.status_code == 200, r.text
