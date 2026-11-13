"""SMILE ACTION LAB V2 regression: public content, draft visibility, versions, role permissions,
verified events + status, discovery queue, sources, SMILO RAG + handover/counsel, AI draft, streak."""
import json
import uuid
from datetime import date, timedelta

import pytest
from dotenv import dotenv_values
from pymongo import MongoClient

from conftest import Client
from clerk_tokens import MEMBER_EMAIL, user_id_for

_env = dotenv_values("/app/backend/.env")
_db = MongoClient(_env["MONGO_URL"])[_env["DB_NAME"]]
MEMBER_UID = user_id_for(MEMBER_EMAIL)
CREATED = {"posts": [], "events": [], "sources": [], "talk": []}
FUT = (date.today() + timedelta(days=60)).isoformat()
PAST = (date.today() - timedelta(days=30)).isoformat()


def sse(resp):
    text, final = "", None
    for line in resp.iter_lines(decode_unicode=True):
        if line and line.startswith("data: "):
            d = json.loads(line[6:])
            text += d.get("t", "")
            if d.get("done"):
                final = d
    return text, final


def set_role(role):
    _db.users.update_one({"user_id": MEMBER_UID}, {"$set": {"role": role}})


POST = {"kind": "learn", "title": "TEST_Draf Rahasia", "category": "GenRe", "summary": "ringkas", "content": "Isi materi panjang sekali.", "read_min": 3}
EVENT = {"title": "TEST_Event V2", "date": FUT, "time": "09:00", "location": "Serang", "province": "Banten", "mode": "Online",
         "event_type": "Webinar", "organizer": "TEST", "description": "desc", "quota": 5, "verified": True,
         "source_url": "https://www.bkkbn.go.id/", "registration_link": "https://example.com/daftar"}


# ---------- Public content ----------
class TestPublicV2:
    def test_learn_published_only(self, anon):
        p = anon.get("/api/posts?kind=learn").json()
        assert len(p) >= 9
        assert all(x.get("status") in ("published", None) for x in p)

    def test_news(self, anon):
        r = anon.get("/api/posts?kind=news")
        assert r.status_code == 200 and isinstance(r.json(), list)

    def test_curriculum(self, anon):
        c = anon.get("/api/curriculum").json()
        assert [t["code"] for t in c] == list("ABCDEFG")
        assert any(t["post_id"] for tr in c for t in tr["topics"])

    def test_events_verified_https(self, anon):
        for e in anon.get("/api/events").json():
            assert e["verified"] is True and e["source_url"].startswith("https://") and e["status"]

    def test_stats(self, anon):
        s = anon.get("/api/stats/public").json()
        assert {"materi", "pikr", "events", "members"} <= set(s)


# ---------- Drafts / versions ----------
class TestDrafts:
    def test_draft_hidden_and_versions(self, admin, anon, member):
        p = admin.post("/api/admin/posts", json={**POST, "status": "draft"}).json()
        CREATED["posts"].append(p["id"])
        assert p["status"] == "draft"
        assert all(x["id"] != p["id"] for x in anon.get("/api/posts?kind=learn").json())
        assert anon.get(f"/api/posts/{p['id']}").status_code == 404
        assert member.get(f"/api/posts/{p['id']}").status_code == 404
        assert admin.get(f"/api/posts/{p['id']}").status_code == 200
        # publish in future -> still hidden
        assert admin.put(f"/api/admin/posts/{p['id']}", json={**POST, "status": "published", "publish_at": FUT}).status_code == 200
        assert anon.get(f"/api/posts/{p['id']}").status_code == 404
        v = admin.get(f"/api/admin/posts/{p['id']}/versions").json()
        assert len(v) == 1 and v[0]["status"] == "draft"
        # publish now -> visible
        assert admin.put(f"/api/admin/posts/{p['id']}", json={**POST, "status": "published", "title": "TEST_Terbit"}).status_code == 200
        assert anon.get(f"/api/posts/{p['id']}").json()["title"] == "TEST_Terbit"
        assert len(admin.get(f"/api/admin/posts/{p['id']}/versions").json()) == 2


# ---------- Roles ----------
class TestRoles:
    @pytest.mark.parametrize("path", ["/api/admin/stats", "/api/admin/posts", "/api/admin/sources", "/api/admin/discovery", "/api/counsel/queue", "/api/users"])
    def test_member_403(self, member, path):
        set_role("member")
        assert member.get(path).status_code == 403

    @pytest.mark.parametrize("path", ["/api/admin/posts", "/api/admin/sources", "/api/admin/discovery", "/api/counsel/queue", "/api/admin/audit"])
    def test_no_token_401(self, anon, path):
        assert anon.get(path).status_code == 401

    def test_editor(self, member):
        set_role("editor")
        try:
            assert member.get("/api/admin/posts").status_code == 200
            assert member.get("/api/admin/sources").status_code == 200
            assert member.get("/api/admin/discovery").status_code == 200
            assert member.post("/api/admin/events", json={**EVENT, "verified": False}).status_code == 403
            assert member.get("/api/users").status_code == 403
            assert member.get("/api/counsel/queue").status_code == 403
        finally:
            set_role("member")

    def test_event_manager(self, member, admin):
        set_role("event_manager")
        try:
            r = member.post("/api/admin/events", json={**EVENT, "verified": False, "title": "TEST_EM Event"})
            assert r.status_code == 200
            CREATED["events"].append(r.json()["id"])
            assert member.post("/api/admin/posts", json=POST).status_code == 403
            assert member.get("/api/admin/posts").status_code == 403
        finally:
            set_role("member")

    def test_counselor(self, member):
        set_role("counselor")
        try:
            assert member.get("/api/counsel/queue").status_code == 200
            assert member.get("/api/admin/posts").status_code == 403
            assert member.get("/api/admin/audit").status_code == 403
        finally:
            set_role("member")

    def test_users_roles_list(self, admin):
        u = admin.get("/api/users").json()
        assert set(u["roles"]) == {"admin", "editor", "fact_checker", "event_manager", "counselor", "moderator", "member"}


# ---------- Events ----------
class TestEventsV2:
    def test_verified_future_event(self, admin, anon, member):
        e = admin.post("/api/admin/events", json=EVENT).json()
        CREATED["events"].append(e["id"])
        lst = anon.get("/api/events", params={"mode": "Online", "province": "Banten"}).json()
        got = next(x for x in lst if x["id"] == e["id"])
        assert got["status"] == "Pendaftaran dibuka"
        assert any(x["id"] == e["id"] for x in anon.get("/api/events", params={"status": "Pendaftaran dibuka"}).json())
        assert all(x["id"] != e["id"] for x in anon.get("/api/events", params={"status": "Selesai"}).json())
        assert all(x["id"] != e["id"] for x in anon.get("/api/events", params={"mode": "Offline"}).json())

    def test_unverified_hidden(self, admin, anon):
        e = admin.post("/api/admin/events", json={**EVENT, "verified": False, "title": "TEST_Unverified"}).json()
        CREATED["events"].append(e["id"])
        assert all(x["id"] != e["id"] for x in anon.get("/api/events").json())
        assert anon.get(f"/api/events/{e['id']}").status_code == 404

    def test_verified_without_https_hidden(self, admin, anon):
        e = admin.post("/api/admin/events", json={**EVENT, "source_url": "http://x.id", "title": "TEST_NoHttps"}).json()
        CREATED["events"].append(e["id"])
        assert all(x["id"] != e["id"] for x in anon.get("/api/events").json())

    def test_past_event_selesai_409(self, admin, anon, member):
        e = admin.post("/api/admin/events", json={**EVENT, "date": PAST, "title": "TEST_Past"}).json()
        CREATED["events"].append(e["id"])
        got = anon.get(f"/api/events/{e['id']}").json()
        assert got["status"] == "Selesai"
        assert member.post(f"/api/events/{e['id']}/register", json={}).status_code == 409


# ---------- Sources / discovery ----------
class TestStudio:
    def test_sources_crud(self, admin):
        s = admin.get("/api/admin/sources").json()
        assert len([x for x in s if not x["name"].startswith("TEST_")]) >= 9
        n = admin.post("/api/admin/sources", json={"name": "TEST_Src", "institution": "TEST Inst", "url": "https://example.com"}).json()
        CREATED["sources"].append(n["id"])
        assert admin.put(f"/api/admin/sources/{n['id']}", json={"name": "TEST_Src2", "institution": "TEST Inst", "url": "https://example.com", "active": False}).status_code == 200
        assert next(x for x in admin.get("/api/admin/sources").json() if x["id"] == n["id"])["name"] == "TEST_Src2"
        assert admin.post("/api/admin/sources", json={"name": "TEST_bad", "institution": "x1", "url": "http://x"}).status_code == 422
        assert admin.delete(f"/api/admin/sources/{n['id']}").status_code == 200
        CREATED["sources"].remove(n["id"])

    def test_discovery_approve_reject(self, admin, anon):
        items = admin.get("/api/admin/discovery").json()
        if len(items) < 2:
            pytest.skip("not enough pending discovery items")
        a, b = items[0], items[1]
        r = admin.patch(f"/api/admin/discovery/{a['id']}", json={"action": "approve", "summary": "TEST_ Ringkasan editor untuk berita ini.", "category": "Umum"}).json()
        pid = r["post_id"]
        CREATED["posts"].append(pid)
        post = anon.get(f"/api/posts/{pid}").json()
        assert post["review_status"] == "Ringkasan impor" and post["source_url"] == a["link"] and post["source_name"]
        assert any(x["id"] == pid for x in anon.get("/api/posts?kind=news").json())
        assert admin.patch(f"/api/admin/discovery/{b['id']}", json={"action": "reject"}).status_code == 200
        assert any(x["id"] == b["id"] for x in admin.get("/api/admin/discovery?status=rejected").json())
        # restore reviewed items to pending (not our data)
        _db.discoveries.update_many({"id": {"$in": [a["id"], b["id"]]}}, {"$set": {"status": "pending"}, "$unset": {"post_id": "", "reviewed_by": ""}})

    def test_discovery_double_approve(self, admin):
        items = admin.get("/api/admin/discovery").json()
        if not items:
            pytest.skip("no items")
        a = items[0]
        body = {"action": "approve", "summary": "TEST_ Ringkasan ganda untuk uji.", "category": "Umum"}
        p1 = admin.patch(f"/api/admin/discovery/{a['id']}", json=body).json()["post_id"]
        CREATED["posts"].append(p1)
        r2 = admin.patch(f"/api/admin/discovery/{a['id']}", json=body)
        if r2.status_code == 200 and r2.json().get("post_id"):
            CREATED["posts"].append(r2.json()["post_id"])
        _db.discoveries.update_one({"id": a["id"]}, {"$set": {"status": "pending"}, "$unset": {"post_id": "", "reviewed_by": ""}})
        assert r2.status_code in (400, 409), "approving an already-approved item creates a duplicate news post"


# ---------- Talk / counsel ----------
class TestTalkCounsel:
    def test_rag_handover_counsel(self, anon, admin):
        a1 = "TEST_" + uuid.uuid4().hex[:12]
        r = anon.post("/api/talk/stream", json={"message": "apa itu GenRe?", "anon_id": a1}, stream=True, timeout=120)
        text, final = sse(r)
        assert final and len(text) > 10
        sid = final["session_id"]
        CREATED["talk"].append((sid, a1))
        assert isinstance(final["sources"], list) and len(final["sources"]) >= 1
        assert final["flagged"] is False
        assert anon.post(f"/api/talk/sessions/{sid}/handover", json={"note": "TEST_ butuh konselor", "anon_id": "TEST_other12345"}).status_code == 404
        assert anon.post(f"/api/talk/sessions/{sid}/handover", json={"note": "TEST_ butuh konselor", "anon_id": a1}).status_code == 200
        q = admin.get("/api/counsel/queue").json()
        assert any(x["id"] == sid and x["is_anonymous"] for x in q)
        v = admin.get(f"/api/counsel/sessions/{sid}").json()
        assert len(v["messages"]) == 2
        assert any(x["target"] == sid and x["action"] == "view_session" for x in admin.get("/api/admin/audit").json())
        assert admin.post(f"/api/counsel/sessions/{sid}/reply", json={"text": "TEST_ halo dari konselor"}).status_code == 200
        msgs = anon.get(f"/api/talk/sessions/{sid}", params={"anon_id": a1}).json()
        assert msgs[-1]["role"] == "counselor"
        assert anon.get(f"/api/talk/sessions/{sid}", params={"anon_id": "TEST_other12345"}).status_code == 404
        assert admin.patch(f"/api/counsel/sessions/{sid}/close").status_code == 200

    def test_risky_flag(self, anon):
        a = "TEST_" + uuid.uuid4().hex[:12]
        r = anon.post("/api/talk/stream", json={"message": "aku ingin mati", "anon_id": a}, stream=True, timeout=120)
        text, final = sse(r)
        CREATED["talk"].append((final["session_id"], a))
        assert final["flagged"] is True and len(text) > 10


# ---------- AI draft ----------
class TestAIDraft:
    def test_ai_draft(self, admin, anon):
        r = admin.post("/api/admin/ai/draft", json={"topic": "TEST_Cara mendirikan PIK-R", "category": "Pengembangan PIK-R"}, timeout=180)
        assert r.status_code == 200, r.text[:200]
        pid = r.json()["id"]
        CREATED["posts"].append(pid)
        p = admin.get(f"/api/posts/{pid}").json()
        assert p["status"] == "draft" and p["review_status"] == "Draf AI - perlu verifikasi" and len(p["content"]) > 500
        assert anon.get(f"/api/posts/{pid}").status_code == 404


# ---------- Streak ----------
class TestStreak:
    def test_streak(self, member, anon):
        set_role("member")
        qz = anon.get("/api/quizzes").json()
        member.post(f"/api/quizzes/{qz[0]['id']}/submit", json={"answers": [0] * qz[0]["count"]})
        me = member.get("/api/me").json()
        assert me.get("streak", 0) >= 1


def teardown_module(module):
    from clerk_tokens import ADMIN_EMAIL
    set_role("member")
    a = Client(ADMIN_EMAIL)
    for i in CREATED["posts"]:
        a.delete(f"/api/admin/posts/{i}")
    for i in CREATED["events"]:
        a.delete(f"/api/admin/events/{i}")
    for i in CREATED["sources"]:
        a.delete(f"/api/admin/sources/{i}")
    for sid, aid in CREATED["talk"]:
        Client().delete(f"/api/talk/sessions/{sid}", params={"anon_id": aid})
        _db.audit.delete_many({"target": sid})
