"""SMILE ACTION LAB backend regression tests (public, talk, learn, play, events, community, PIK-R, dashboard, admin)."""
import json
import uuid
import pytest
from datetime import datetime, timezone

CREATED = {"community": [], "orgs": [], "posts": [], "events": [], "talk": []}


def sse(resp):
    text, final = "", None
    for line in resp.iter_lines(decode_unicode=True):
        if line and line.startswith("data: "):
            d = json.loads(line[6:])
            if "t" in d:
                text += d["t"]
            if d.get("done"):
                final = d
    return text, final


# ---------- Public ----------
class TestPublic:
    def test_root_and_stats(self, anon):
        assert anon.get("/api/").json()["message"] == "SMILE ACTION LAB API"
        s = anon.get("/api/stats/public").json()
        assert s["materi"] > 0 and s["events"] > 0 and s["pikr"] > 0

    def test_posts_filter_search(self, anon):
        allp = anon.get("/api/posts?kind=learn").json()
        assert len(allp) > 0 and "content" not in allp[0]
        cat = allp[0]["category"]
        f = anon.get("/api/posts", params={"kind": "learn", "category": cat}).json()
        assert f and all(p["category"] == cat for p in f)
        word = allp[0]["title"].split()[0]
        q = anon.get("/api/posts", params={"kind": "learn", "q": word}).json()
        assert any(p["id"] == allp[0]["id"] for p in q)
        news = anon.get("/api/posts?kind=news").json()
        assert len(news) > 0
        full = anon.get(f"/api/posts/{allp[0]['id']}").json()
        assert len(full["content"]) > 10
        assert anon.get("/api/posts/nope").status_code == 404

    def test_resources_events_orgs_quizzes_leaderboard(self, anon):
        r = anon.get("/api/resources").json()
        assert r["ebook"] and r["drive"]
        ev = anon.get("/api/events").json()
        assert ev and "registered" in ev[0]
        e = anon.get(f"/api/events/{ev[0]['id']}").json()
        assert e["is_registered"] is False
        orgs = anon.get("/api/orgs").json()
        assert orgs and all("owner_id" not in o for o in orgs)
        qz = anon.get("/api/quizzes").json()
        assert len(qz) >= 1 and qz[0]["count"] > 0
        q = anon.get(f"/api/quizzes/{qz[0]['id']}").json()
        assert "answer" not in q["questions"][0]
        assert isinstance(anon.get("/api/leaderboard").json(), list)


# ---------- Auth guards ----------
class TestAuthGuards:
    @pytest.mark.parametrize("path", ["/api/me", "/api/admin/stats", "/api/users", "/api/admin/flags", "/api/admin/orgs"])
    def test_no_token_401(self, anon, path):
        assert anon.get(path).status_code == 401

    @pytest.mark.parametrize("path", ["/api/admin/stats", "/api/users", "/api/admin/flags", "/api/admin/orgs"])
    def test_member_403(self, member, path):
        assert member.get(path).status_code == 403

    def test_member_cannot_create_post(self, member):
        r = member.post("/api/admin/posts", json={"kind": "learn", "title": "TEST_x", "category": "GenRe", "summary": "s", "content": "0123456789ab"})
        assert r.status_code == 403

    def test_bad_token_401(self, anon):
        assert anon.get("/api/me", headers={"Authorization": "Bearer abc.def.ghi"}).status_code == 401


# ---------- SMILE TALK ----------
class TestTalk:
    def test_anon_talk_and_isolation(self, anon, admin):
        a1, a2 = "TEST_" + uuid.uuid4().hex[:12], "TEST_" + uuid.uuid4().hex[:12]
        r = anon.post("/api/talk/stream", json={"message": "Halo SMILO, apa itu GenRe? jawab singkat", "anon_id": a1}, stream=True)
        assert r.status_code == 200
        text, final = sse(r)
        assert final and final["session_id"] and len(text) > 5
        sid = final["session_id"]
        CREATED["talk"].append((sid, a1))
        assert final["flagged"] is False
        s1 = anon.get("/api/talk/sessions", params={"anon_id": a1}).json()
        assert any(s["id"] == sid for s in s1)
        s2 = anon.get("/api/talk/sessions", params={"anon_id": a2}).json()
        assert all(s["id"] != sid for s in s2)
        msgs = anon.get(f"/api/talk/sessions/{sid}", params={"anon_id": a1}).json()
        assert [m["role"] for m in msgs] == ["user", "assistant"]
        assert anon.get(f"/api/talk/sessions/{sid}", params={"anon_id": a2}).status_code == 404
        assert anon.delete(f"/api/talk/sessions/{sid}", params={"anon_id": a2}).status_code == 404
        # signed-in admin must not see anon session
        assert all(s["id"] != sid for s in admin.get("/api/talk/sessions").json())
        assert anon.get("/api/talk/sessions").status_code == 400

    def test_risk_flag(self, anon, admin):
        a = "TEST_" + uuid.uuid4().hex[:12]
        r = anon.post("/api/talk/stream", json={"message": "aku ingin mati", "anon_id": a}, stream=True)
        text, final = sse(r)
        assert final["flagged"] is True
        sid = final["session_id"]
        CREATED["talk"].append((sid, a))
        flags = admin.get("/api/admin/flags").json()
        f = next(x for x in flags if x["id"] == sid)
        assert f["is_anonymous"] is True and f["handled"] is False
        assert admin.patch(f"/api/admin/flags/{sid}").status_code == 200
        f = next(x for x in admin.get("/api/admin/flags").json() if x["id"] == sid)
        assert f["handled"] is True
        # delete
        assert anon.delete(f"/api/talk/sessions/{sid}", params={"anon_id": a}).status_code == 200
        assert anon.get(f"/api/talk/sessions/{sid}", params={"anon_id": a}).status_code == 404
        CREATED["talk"].remove((sid, a))


# ---------- Learn ----------
class TestLearn:
    def test_read_xp_once_and_bookmark(self, member, anon):
        me = member.get("/api/me").json()
        posts = anon.get("/api/posts?kind=learn").json()
        unread = [p for p in posts if p["id"] not in me.get("reads", [])]
        pid = (unread or posts)[0]["id"]
        r1 = member.post(f"/api/posts/{pid}/read").json()
        assert r1["xp_gained"] == (5 if unread else 0)
        assert member.post(f"/api/posts/{pid}/read").json()["xp_gained"] == 0
        me2 = member.get("/api/me").json()
        assert me2["xp"] == me["xp"] + r1["xp_gained"]
        was = pid in me2.get("bookmarks", [])
        b1 = member.post(f"/api/posts/{pid}/bookmark").json()["bookmarked"]
        assert b1 is (not was)
        act = member.get("/api/me/activity").json()
        assert any(b["id"] == pid for b in act["bookmarks"]) is b1
        b2 = member.post(f"/api/posts/{pid}/bookmark").json()["bookmarked"]
        assert b2 is was
        assert anon.post(f"/api/posts/{pid}/read").status_code == 401


# ---------- Play ----------
class TestPlay:
    def test_quiz_anon_and_signed_in(self, anon, member):
        qz = anon.get("/api/quizzes").json()
        me = member.get("/api/me").json()
        q = next((x for x in qz if x["id"] not in me.get("quizzes_done", [])), qz[0])
        n = q["count"]
        r = anon.post(f"/api/quizzes/{q['id']}/submit", json={"answers": [0] * n}).json()
        assert r["xp_gained"] == 0 and r["total"] == n
        right = [x["answer"] for x in r["review"]]
        r2 = member.post(f"/api/quizzes/{q['id']}/submit", json={"answers": right}).json()
        assert r2["correct"] == n
        today = datetime.now(timezone.utc).date().isoformat()
        exp = (n * 10 if q["id"] not in me.get("quizzes_done", []) else 0) + (20 if me.get("last_daily") != today else 0)
        assert r2["xp_gained"] == exp
        r3 = member.post(f"/api/quizzes/{q['id']}/submit", json={"answers": right}).json()
        assert r3["xp_gained"] == 0
        assert member.get("/api/me").json()["xp"] == me["xp"] + exp

    def test_life_planner(self, member, anon):
        me = member.get("/api/me").json()
        r = member.post("/api/play/complete", json={"game": "life-planner"}).json()
        assert r["xp_gained"] == (0 if "life-planner" in me.get("games", []) else 50)
        assert member.post("/api/play/complete", json={"game": "life-planner"}).json()["xp_gained"] == 0
        assert member.post("/api/play/complete", json={"game": "other"}).status_code == 422
        assert anon.post("/api/play/complete", json={"game": "life-planner"}).status_code == 401


# ---------- Events ----------
class TestEvents:
    def test_admin_event_register_flow(self, admin, member, anon):
        body = {"title": "TEST_Event Regresi", "date": "2026-12-01", "time": "09:00", "location": "Serang", "mode": "Online",
                "organizer": "TEST", "description": "desc", "quota": 5}
        e = admin.post("/api/admin/events", json=body).json()
        CREATED["events"].append(e["id"])
        assert anon.get(f"/api/events/{e['id']}").json()["registered"] == 0
        assert anon.post(f"/api/events/{e['id']}/register", json={}).status_code == 401
        r = member.post(f"/api/events/{e['id']}/register", json={"phone": "0812", "institution": "TEST_SMA"})
        assert r.status_code == 200
        assert member.post(f"/api/events/{e['id']}/register", json={}).status_code == 409
        d = member.get(f"/api/events/{e['id']}").json()
        assert d["registered"] == 1 and d["is_registered"] is True
        act = member.get("/api/me/activity").json()
        assert any(x["event_id"] == e["id"] for x in act["registrations"])
        regs = admin.get(f"/api/admin/events/{e['id']}/registrations").json()
        assert len(regs) == 1 and regs[0]["institution"] == "TEST_SMA"
        assert admin.put(f"/api/admin/events/{e['id']}", json={**body, "title": "TEST_Event Edit"}).status_code == 200
        assert anon.get(f"/api/events/{e['id']}").json()["title"] == "TEST_Event Edit"
        assert admin.post("/api/admin/events", json={**body, "date": "01-12-2026"}).status_code == 422
        assert admin.delete(f"/api/admin/events/{e['id']}").status_code == 200
        assert anon.get(f"/api/events/{e['id']}").status_code == 404
        CREATED["events"].remove(e["id"])


# ---------- Admin posts ----------
class TestAdminPosts:
    def test_posts_crud(self, admin, anon):
        body = {"kind": "learn", "title": "TEST_Materi Regresi", "category": "GenRe", "summary": "ringkas", "content": "Isi materi panjang sekali.", "read_min": 3}
        p = admin.post("/api/admin/posts", json=body).json()
        CREATED["posts"].append(p["id"])
        assert anon.get(f"/api/posts/{p['id']}").json()["title"] == body["title"]
        assert admin.put(f"/api/admin/posts/{p['id']}", json={**body, "title": "TEST_Materi Edit"}).status_code == 200
        assert anon.get(f"/api/posts/{p['id']}").json()["title"] == "TEST_Materi Edit"
        assert admin.delete(f"/api/admin/posts/{p['id']}").status_code == 200
        assert anon.get(f"/api/posts/{p['id']}").status_code == 404
        CREATED["posts"].remove(p["id"])


# ---------- Community ----------
class TestCommunity:
    def test_community_flow(self, member, admin, anon):
        me = member.get("/api/me").json()
        p = member.post("/api/community", json={"text": "TEST_cerita anonim saya", "topic": "Cerita", "anonymous": True}).json()
        CREATED["community"].append(p["id"])
        assert p["author"] == "Anonim" and p["mine"] is True and "user_id" not in p
        p2 = member.post("/api/community", json={"text": "TEST_cerita bernama", "topic": "Inspirasi", "anonymous": False}).json()
        CREATED["community"].append(p2["id"])
        assert p2["author"] == me["name"]
        assert anon.post("/api/community", json={"text": "TEST_noauth", "topic": "Cerita"}).status_code == 401
        assert member.post(f"/api/community/{p['id']}/replies", json={"text": "TEST_balasan"}).status_code == 200
        assert admin.post(f"/api/community/{p['id']}/replies", json={"text": "TEST_admin balas"}).status_code == 200
        assert member.post(f"/api/community/{p['id']}/heart").status_code == 200
        lst = anon.get("/api/community").json()
        got = next(x for x in lst if x["id"] == p["id"])
        assert len(got["replies"]) == 2 and got["replies"][1]["badge"] == "Admin" and got["mine"] is False
        assert len(got["hearts"]) == 1
        member.post(f"/api/community/{p['id']}/heart")
        got = next(x for x in anon.get("/api/community").json() if x["id"] == p["id"])
        assert len(got["hearts"]) == 0
        # admin (other user) can delete; member cannot delete admin's post
        ap = admin.post("/api/community", json={"text": "TEST_post admin", "topic": "Pertanyaan", "anonymous": True}).json()
        CREATED["community"].append(ap["id"])
        assert member.delete(f"/api/community/{ap['id']}").status_code == 404
        assert admin.delete(f"/api/community/{p2['id']}").status_code == 200
        CREATED["community"].remove(p2["id"])
        assert member.delete(f"/api/community/{p['id']}").status_code == 200
        CREATED["community"].remove(p["id"])
        assert admin.delete(f"/api/community/{ap['id']}").status_code == 200
        CREATED["community"].remove(ap["id"])


# ---------- PIK-R ----------
class TestOrgs:
    def test_org_verify_reject_flow(self, member, admin, anon):
        baseline = anon.get("/api/orgs/stats").json().get("Banten", 0)
        body = {"name": "TEST_PIK-R Regresi", "institution": "TEST_SMA 1", "city": "Serang", "province": "Banten",
                "contact": "@test", "description": "Deskripsi PIK-R untuk tes.", "category": "Jalur Pendidikan"}
        r = member.post("/api/orgs", json=body)
        assert r.status_code == 200
        oid = r.json()["id"]
        CREATED["orgs"].append(oid)
        assert all(o["id"] != oid for o in anon.get("/api/orgs").json())
        mine = member.get("/api/me/activity").json()["orgs"]
        assert next(o for o in mine if o["id"] == oid)["status"] == "pending"
        assert any(o["id"] == oid for o in admin.get("/api/admin/orgs?status=pending").json())
        v = admin.patch(f"/api/admin/orgs/{oid}", json={"status": "verified"}).json()
        assert v["status"] == "verified"
        assert any(o["id"] == oid for o in anon.get("/api/orgs", params={"q": "TEST_PIK-R"}).json())
        assert anon.get("/api/orgs/stats").json()["Banten"] == baseline + 1
        admin.patch(f"/api/admin/orgs/{oid}", json={"status": "rejected", "admin_note": "TEST alasan"})
        assert all(o["id"] != oid for o in anon.get("/api/orgs").json())
        assert anon.get("/api/orgs/stats").json().get("Banten", 0) == baseline
        mine = member.get("/api/me/activity").json()["orgs"]
        o = next(o for o in mine if o["id"] == oid)
        assert o["status"] == "rejected" and o["admin_note"] == "TEST alasan"
        assert admin.patch(f"/api/admin/orgs/{oid}", json={"status": "bogus"}).status_code == 422
        assert admin.delete(f"/api/admin/orgs/{oid}").status_code == 200
        CREATED["orgs"].remove(oid)
        assert member.post("/api/orgs", json={**body, "description": "short"}).status_code == 422


# ---------- Dashboard / Admin ----------
class TestDashboardAdmin:
    def test_me_and_profile(self, member):
        me = member.get("/api/me").json()
        assert me["role"] == "member" and me["level"] == me["xp"] // 100 + 1 and len(me["badges"]) == 6
        orig = {"name": me["name"], "school": me.get("school", ""), "city": me.get("city", "")}
        assert member.patch("/api/me", json={"name": "TEST Member", "school": "TEST_SMA", "city": "Serang"}).status_code == 200
        m2 = member.get("/api/me").json()
        assert m2["name"] == "TEST Member" and m2["school"] == "TEST_SMA"
        assert member.patch("/api/me", json={"name": ""}).status_code == 422
        member.patch("/api/me", json=orig)

    def test_admin_stats_users_roles(self, admin):
        s = admin.get("/api/admin/stats").json()
        for k in ["users", "talk_sessions", "posts", "events", "registrations", "orgs_verified", "orgs_pending", "flags_open", "community"]:
            assert isinstance(s[k], int)
        u = admin.get("/api/users").json()
        assert u["roles"] == ["admin", "member"]
        admins = [x for x in u["users"] if x["role"] == "admin"]
        me = admin.get("/api/me").json()
        assert admin.patch(f"/api/users/{me['user_id']}/role", json={"role": "superuser"}).status_code == 403
        assert admin.patch("/api/users/nope/role", json={"role": "member"}).status_code == 404
        if len(admins) == 1:
            assert admin.patch(f"/api/users/{me['user_id']}/role", json={"role": "member"}).status_code == 409
        else:
            pytest.skip(f"{len(admins)} admins exist; not demoting real users")


def teardown_module(module):
    from conftest import Client
    from clerk_tokens import ADMIN_EMAIL
    a = Client(ADMIN_EMAIL)
    for i in CREATED["community"]:
        a.delete(f"/api/community/{i}")
    for i in CREATED["orgs"]:
        a.delete(f"/api/admin/orgs/{i}")
    for i in CREATED["posts"]:
        a.delete(f"/api/admin/posts/{i}")
    for i in CREATED["events"]:
        a.delete(f"/api/admin/events/{i}")
    for sid, aid in CREATED["talk"]:
        Client().delete(f"/api/talk/sessions/{sid}", params={"anon_id": aid})
