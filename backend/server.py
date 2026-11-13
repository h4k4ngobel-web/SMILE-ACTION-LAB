import asyncio
import json
import os
import re
import logging
import uuid
from contextlib import suppress
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional, List

import requests
from dotenv import load_dotenv
from fastapi import FastAPI, APIRouter, Depends, HTTPException, Request, Query
from fastapi.responses import StreamingResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from pymongo import ASCENDING, DESCENDING, IndexModel, ReturnDocument
from starlette.middleware.cors import CORSMiddleware

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

try:
    from backend.clerk_auth import clerk_router, require_user
    from backend import emailer
    from backend.seed_data import LEARN, NEWS, EVENTS, ORGS, QUIZZES, PDF_EBOOK, DRIVE_PIKR
    from backend.seed_v2 import SOURCES, EBOOK_REF, CURRICULUM, TRACKS
    from backend import studio
    from backend.llm import generate_gemini_reply, gemini_available, local_reply, video_recommendations
except ModuleNotFoundError:
    from clerk_auth import clerk_router, require_user
    import emailer
    from seed_data import LEARN, NEWS, EVENTS, ORGS, QUIZZES, PDF_EBOOK, DRIVE_PIKR
    from seed_v2 import SOURCES, EBOOK_REF, CURRICULUM, TRACKS
    import studio
    from llm import generate_gemini_reply, gemini_available, local_reply, video_recommendations

client = AsyncIOMotorClient(os.environ['MONGO_URL'])
db = client[os.environ['DB_NAME']]
logger = logging.getLogger(__name__)

INDEXES: dict[str, list[IndexModel]] = {
    "users": [IndexModel([("user_id", ASCENDING)], name="user_id", unique=True)],
    "posts": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("kind", ASCENDING), ("created_at", DESCENDING)], name="kind_created")],
    "events": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("date", ASCENDING)], name="date")],
    "registrations": [IndexModel([("event_id", ASCENDING), ("user_id", ASCENDING)], name="event_user", unique=True)],
    "orgs": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("status", ASCENDING)], name="status")],
    "quizzes": [IndexModel([("id", ASCENDING)], name="id", unique=True)],
    "talk_sessions": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("owner", ASCENDING), ("updated_at", DESCENDING)], name="owner_updated")],
    "talk_messages": [IndexModel([("session_id", ASCENDING), ("created_at", ASCENDING)], name="session_created"), IndexModel([("owner", ASCENDING), ("created_at", DESCENDING)], name="owner_created")],
    "community": [IndexModel([("id", ASCENDING)], name="id", unique=True), IndexModel([("created_at", DESCENDING)], name="created")],
    "discoveries": [IndexModel([("link", ASCENDING)], name="link"), IndexModel([("status", ASCENDING), ("discovered_at", DESCENDING)], name="status_disc")],
    "sources": [IndexModel([("slug", ASCENDING)], name="slug", unique=True)],
    "post_versions": [IndexModel([("post_id", ASCENDING), ("saved_at", DESCENDING)], name="post_saved")],
}


async def ensure_indexes() -> None:
    for collection, models in INDEXES.items():
        for model in models:
            try:
                await db[collection].create_indexes([model])
            except Exception as exc:
                logger.error("ensure_indexes(%s.%s): %s", collection, model.document["name"], exc)


app = FastAPI()
api = APIRouter(prefix="/api")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# ---------------- Roles ----------------
ROLES = ["admin", "editor", "fact_checker", "event_manager", "counselor", "moderator", "member"]
STAFF = [r for r in ROLES if r != "member"]
DEFAULT_ROLE = "member"
RETIRED_ROLES = {}
RANK = {r: len(ROLES) - i for i, r in enumerate(ROLES)}
ENV = "live" if os.environ.get("CLERK_PUBLISHABLE_KEY", "").startswith("pk_live_") else "preview"
IN_ENV = {"env": {"$in": [ENV, None]}}


def effective_role(role) -> str:
    role = RETIRED_ROLES.get(role, role)
    return role if role in ROLES else DEFAULT_ROLE


def _configured_admin_emails() -> set[str]:
    return {e.strip().lower() for e in os.environ.get("ADMIN_EMAIL", "").split(",") if e.strip()}


def _clerk_profile(user_id: str) -> dict:
    r = requests.get(f"https://api.clerk.com/v1/users/{user_id}", timeout=10,
                     headers={"Authorization": f"Bearer {os.environ['CLERK_SECRET_KEY']}", "User-Agent": "emergent-app"})
    r.raise_for_status()
    data = r.json()
    emails = data.get("email_addresses", [])
    admins = _configured_admin_emails()
    is_admin = any(e["email_address"].lower() in admins and (e.get("verification") or {}).get("status") == "verified" for e in emails)
    primary = next((e["email_address"] for e in emails if e["id"] == data.get("primary_email_address_id")), emails[0]["email_address"] if emails else "")
    name = " ".join(x for x in [data.get("first_name"), data.get("last_name")] if x) or primary.split("@")[0]
    return {"is_admin": is_admin, "email": primary, "name": name, "avatar": data.get("image_url", "")}


async def current_member(user: dict = Depends(require_user)) -> dict:
    uid = user["user_id"]
    member = await db.users.find_one({"user_id": uid}, {"_id": 0})
    if member is None or not member.get("role"):
        prof = await asyncio.to_thread(_clerk_profile, uid)
        role = "admin" if prof["is_admin"] else DEFAULT_ROLE
        await db.users.update_one({"user_id": uid, "role": {"$in": [None, ""]}}, {"$set": {"role": role}})
        member = await db.users.find_one_and_update(
            {"user_id": uid},
            {"$setOnInsert": {"user_id": uid, "role": role, "email": prof["email"], "name": prof["name"], "avatar": prof["avatar"],
                              "xp": 0, "quizzes_done": [], "reads": [], "bookmarks": [], "games": [], "last_daily": "",
                              "school": "", "city": "", "created_at": now_iso()}},
            upsert=True, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    elif (
        effective_role(member.get("role")) != "admin"
        and (member.get("email") or "").strip().lower() in _configured_admin_emails()
    ):
        prof = await asyncio.to_thread(_clerk_profile, uid)
        if prof["is_admin"]:
            await db.users.update_one({"user_id": uid}, {"$set": {"role": "admin"}})
            member["role"] = "admin"
    if member.get("env") != ENV:
        await db.users.update_one({"user_id": uid}, {"$set": {"env": ENV}})
    return {**member, "env": ENV, "role": effective_role(member["role"])}


def require_role(*roles: str):
    async def check(member: dict = Depends(current_member)) -> dict:
        if member["role"] not in roles:
            raise HTTPException(status_code=403, detail="Tidak diizinkan")
        return member
    return check


async def optional_member(request: Request) -> Optional[dict]:
    if not request.headers.get("authorization"):
        return None
    try:
        user = require_user(request)
    except HTTPException:
        return None
    return await current_member(user)


admin_only = require_role("admin")
content_staff = require_role("admin", "editor", "fact_checker")
event_staff = require_role("admin", "event_manager")
counsel_staff = require_role("admin", "counselor")
any_staff = require_role(*STAFF)


def today() -> str:
    return datetime.now(timezone.utc).date().isoformat()


# ---------------- Me / Dashboard ----------------
def level_of(xp: int) -> dict:
    return {"level": xp // 100 + 1, "level_xp": xp % 100}


async def badges_of(m: dict) -> list:
    posts = await db.community.count_documents({"user_id": m["user_id"]})
    regs = await db.registrations.count_documents({"user_id": m["user_id"]})
    defs = [
        ("langkah-pertama", "Langkah Pertama", m.get("xp", 0) > 0),
        ("pembelajar", "Pembelajar Rajin", len(m.get("reads", [])) >= 3),
        ("juara-kuis", "Juara Kuis", len(m.get("quizzes_done", [])) >= 2),
        ("perencana", "Perencana Masa Depan", "life-planner" in m.get("games", [])),
        ("penggerak", "Penggerak Komunitas", posts >= 1),
        ("peserta", "Peserta Aktif", regs >= 1),
    ]
    return [{"id": i, "name": n, "earned": bool(e)} for i, n, e in defs]


@api.get("/me")
async def me(m: dict = Depends(current_member)):
    return {**m, **level_of(m.get("xp", 0)), "badges": await badges_of(m)}


class ProfileIn(BaseModel):
    name: str = Field(min_length=1, max_length=80)
    school: str = Field("", max_length=120)
    city: str = Field("", max_length=80)


@api.patch("/me")
async def update_me(body: ProfileIn, m: dict = Depends(current_member)):
    await db.users.update_one({"user_id": m["user_id"]}, {"$set": body.model_dump()})
    return {"ok": True}


@api.get("/me/activity")
async def my_activity(m: dict = Depends(current_member)):
    regs = await db.registrations.find({"user_id": m["user_id"]}, {"_id": 0}).sort("created_at", -1).to_list(50)
    orgs = await db.orgs.find({"owner_id": m["user_id"]}, {"_id": 0}).to_list(20)
    bms = await db.posts.find({"id": {"$in": m.get("bookmarks", [])}}, {"_id": 0, "content": 0}).to_list(100)
    return {"registrations": regs, "orgs": orgs, "bookmarks": bms}


async def add_xp(uid: str, amount: int):
    await db.users.update_one({"user_id": uid}, {"$inc": {"xp": amount}})
    u = await db.users.find_one({"user_id": uid}, {"_id": 0, "last_active": 1, "streak": 1})
    t = today()
    if u and u.get("last_active") != t:
        yest = (datetime.now(timezone.utc).date().toordinal() - 1)
        cont = u.get("last_active") and datetime.fromisoformat(u["last_active"]).date().toordinal() == yest
        streak = (u.get("streak") or 0) + 1 if cont else 1
        await db.users.update_one({"user_id": uid}, {"$set": {"last_active": t, "streak": streak}, "$max": {"best_streak": streak}})


# ---------------- Posts (Learn + News) ----------------
class PostIn(BaseModel):
    kind: str = Field(pattern="^(learn|news)$")
    title: str = Field(min_length=3, max_length=160)
    category: str = Field(min_length=2, max_length=40)
    summary: str = Field(max_length=300)
    content: str = Field(min_length=10, max_length=20000)
    cover: str = "welcome"
    read_min: int = Field(5, ge=1, le=60)
    link: str = Field("", max_length=500)
    status: str = Field("draft", pattern="^(draft|review|published)$")
    publish_at: str = Field("", max_length=10)
    review_status: str = Field("Tulisan independen", max_length=60)
    references: List[dict] = []
    activities: Optional[List[dict]] = None
    seo_title: str = Field("", max_length=120)
    seo_description: str = Field("", max_length=300)
    attachment_url: str = Field("", max_length=500)
    video_url: str = Field("", max_length=500)
    source_name: str = Field("", max_length=160)
    source_url: str = Field("", max_length=500)
    original_date: str = Field("", max_length=60)
    expires_at: str = Field("", max_length=10)


def published_filter() -> dict:
    return {"status": {"$in": ["published", None]}, "$or": [{"publish_at": {"$in": ["", None]}}, {"publish_at": {"$lte": today()}}]}


@api.get("/posts")
async def list_posts(kind: str = Query("learn", pattern="^(learn|news)$"), category: str = "", q: str = ""):
    flt = {"kind": kind, **published_filter()}
    if category:
        flt["category"] = category
    if q:
        flt["title"] = {"$regex": q[:50].replace("\\", ""), "$options": "i"}
    return await db.posts.find(flt, {"_id": 0, "content": 0}).sort("created_at", -1).to_list(200)


@api.get("/curriculum")
async def curriculum():
    posts = await db.posts.find({"kind": "learn", **published_filter()}, {"_id": 0, "id": 1, "title": 1, "track": 1}).to_list(500)
    out = []
    for code, name, topics in CURRICULUM:
        items = []
        for t in topics:
            match = next((p for p in posts if p.get("track") == t or p["title"].lower() == t.lower()), None)
            items.append({"topic": t, "post_id": match["id"] if match else None})
        out.append({"code": code, "name": name, "topics": items})
    return out


@api.get("/admin/posts")
async def admin_posts(m: dict = Depends(content_staff)):
    return await db.posts.find({}, {"_id": 0, "content": 0}).sort("created_at", -1).to_list(1000)


@api.get("/posts/{post_id}")
async def get_post(post_id: str, m: Optional[dict] = Depends(optional_member)):
    p = await db.posts.find_one({"id": post_id}, {"_id": 0})
    staff = m and m["role"] in ("admin", "editor", "fact_checker")
    if p and not staff and not await db.posts.find_one({"id": post_id, **published_filter()}, {"_id": 1}):
        p = None
    if not p:
        raise HTTPException(404, "Materi tidak ditemukan")
    return p


@api.post("/posts/{post_id}/read")
async def mark_read(post_id: str, m: dict = Depends(current_member)):
    if not await db.posts.find_one({"id": post_id}, {"_id": 1}):
        raise HTTPException(404, "Materi tidak ditemukan")
    res = await db.users.update_one({"user_id": m["user_id"], "reads": {"$ne": post_id}}, {"$push": {"reads": post_id}})
    if res.modified_count:
        await add_xp(m["user_id"], 5)
    return {"xp_gained": 5 if res.modified_count else 0}


@api.post("/posts/{post_id}/bookmark")
async def toggle_bookmark(post_id: str, m: dict = Depends(current_member)):
    if post_id in m.get("bookmarks", []):
        await db.users.update_one({"user_id": m["user_id"]}, {"$pull": {"bookmarks": post_id}})
        return {"bookmarked": False}
    await db.users.update_one({"user_id": m["user_id"]}, {"$addToSet": {"bookmarks": post_id}})
    return {"bookmarked": True}


@api.post("/admin/posts")
async def create_post(body: PostIn, a: dict = Depends(content_staff)):
    doc = {**body.model_dump(exclude_none=True), "id": new_id(), "slug": new_id(), "created_at": now_iso(), "updated_at": now_iso(), "author": a.get("email", "")}
    await db.posts.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/posts/{post_id}")
async def update_post(post_id: str, body: PostIn, a: dict = Depends(content_staff)):
    old = await db.posts.find_one({"id": post_id}, {"_id": 0})
    if not old:
        raise HTTPException(404, "Tidak ditemukan")
    await db.post_versions.insert_one({"post_id": post_id, "saved_at": now_iso(), "saved_by": a.get("email", ""), "title": old["title"],
                                       "status": old.get("status", "published"), "content": old.get("content", "")})
    await db.posts.update_one({"id": post_id}, {"$set": {**body.model_dump(exclude_none=True), "updated_at": now_iso(), "reviewed_by": a.get("email", "")}})
    return {"ok": True}


@api.delete("/admin/posts/{post_id}")
async def delete_post(post_id: str, a: dict = Depends(require_role("admin", "editor"))):
    await db.posts.delete_one({"id": post_id})
    return {"ok": True}


@api.get("/resources")
async def resources():
    return {"ebook": PDF_EBOOK, "drive": DRIVE_PIKR}


# ---------------- Events ----------------
class EventIn(BaseModel):
    title: str = Field(min_length=3, max_length=160)
    date: str = Field(pattern=r"^\d{4}-\d{2}-\d{2}$")
    end_date: str = Field("", max_length=10)
    time: str = Field("", max_length=40)
    location: str = Field(min_length=2, max_length=160)
    province: str = Field("Nasional", max_length=60)
    mode: str = Field("Online", pattern="^(Online|Offline|Hybrid)$")
    event_type: str = Field("Webinar", max_length=40)
    education_level: str = Field("Semua", max_length=40)
    organizer: str = Field(min_length=2, max_length=120)
    description: str = Field(max_length=3000)
    eligibility: str = Field("", max_length=500)
    reg_deadline: str = Field("", max_length=10)
    registration_link: str = Field("", max_length=500)
    source_url: str = Field("", max_length=500)
    last_verified: str = Field("", max_length=10)
    verified: bool = False
    cancelled: bool = False
    cover: str = "invite"
    quota: int = Field(100, ge=1, le=100000)


def event_status(e: dict) -> str:
    t = today()
    if e.get("cancelled"):
        return "Dibatalkan"
    if not e.get("verified") or not e.get("source_url"):
        return "Belum terverifikasi"
    end = e.get("end_date") or e["date"]
    if end < t:
        return "Selesai"
    if e["date"] <= t:
        return "Berlangsung"
    if (e.get("reg_deadline") or e["date"]) >= t and (e.get("registration_link") or not e.get("reg_deadline")):
        return "Pendaftaran dibuka"
    return "Akan datang"


async def with_counts(events: list) -> list:
    for e in events:
        e["registered"] = await db.registrations.count_documents({"event_id": e["id"]})
        e["status"] = event_status(e)
    return events


@api.get("/events")
async def list_events(province: str = "", mode: str = "", event_type: str = "", education_level: str = "", status: str = ""):
    flt = {"verified": True, "source_url": {"$regex": "^https://"}}
    for k, v in (("province", province), ("mode", mode), ("event_type", event_type), ("education_level", education_level)):
        if v:
            flt[k] = v
    rows = await with_counts(await db.events.find(flt, {"_id": 0}).sort("date", 1).to_list(500))
    return [e for e in rows if not status or e["status"] == status]


@api.get("/admin/events")
async def admin_events(m: dict = Depends(event_staff)):
    return await with_counts(await db.events.find({}, {"_id": 0}).sort("date", -1).to_list(1000))


@api.get("/events/{event_id}")
async def get_event(event_id: str, m: Optional[dict] = Depends(optional_member)):
    e = await db.events.find_one({"id": event_id}, {"_id": 0})
    if not e or (not e.get("verified") and not (m and m["role"] in ("admin", "event_manager"))):
        raise HTTPException(404, "Event tidak ditemukan")
    (e,) = await with_counts([e])
    e["is_registered"] = bool(m and await db.registrations.find_one({"event_id": event_id, "user_id": m["user_id"]}))
    return e


class RegisterIn(BaseModel):
    phone: str = Field("", max_length=30)
    institution: str = Field("", max_length=120)


@api.post("/events/{event_id}/register")
async def register_event(event_id: str, body: RegisterIn, m: dict = Depends(current_member)):
    e = await db.events.find_one({"id": event_id, "verified": True}, {"_id": 0})
    if not e:
        raise HTTPException(404, "Event tidak ditemukan")
    if event_status(e) in ("Selesai", "Dibatalkan"):
        raise HTTPException(409, "Event ini sudah tidak menerima pendaftaran")
    if await db.registrations.find_one({"event_id": event_id, "user_id": m["user_id"]}):
        raise HTTPException(409, "Kamu sudah terdaftar di event ini")
    if await db.registrations.count_documents({"event_id": event_id}) >= e["quota"]:
        raise HTTPException(409, "Kuota event sudah penuh")
    await db.registrations.insert_one({"id": new_id(), "event_id": event_id, "event_title": e["title"], "event_date": e["date"],
                                       "user_id": m["user_id"], "name": m.get("name", ""), "email": m.get("email", ""),
                                       **body.model_dump(), "created_at": now_iso()})
    await add_xp(m["user_id"], 15)
    emailer.event_registration(m.get("email", ""), m.get("name", ""), e)
    return {"ok": True}


@api.post("/admin/events")
async def create_event(body: EventIn, a: dict = Depends(event_staff)):
    doc = {**body.model_dump(), "id": new_id(), "slug": new_id(), "created_at": now_iso()}
    await db.events.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.put("/admin/events/{event_id}")
async def update_event(event_id: str, body: EventIn, a: dict = Depends(event_staff)):
    r = await db.events.update_one({"id": event_id}, {"$set": body.model_dump()})
    if not r.matched_count:
        raise HTTPException(404, "Tidak ditemukan")
    return {"ok": True}


@api.delete("/admin/events/{event_id}")
async def delete_event(event_id: str, a: dict = Depends(event_staff)):
    await db.events.delete_one({"id": event_id})
    await db.registrations.delete_many({"event_id": event_id})
    return {"ok": True}


@api.get("/admin/events/{event_id}/registrations")
async def event_regs(event_id: str, a: dict = Depends(event_staff)):
    return await db.registrations.find({"event_id": event_id}, {"_id": 0}).sort("created_at", -1).to_list(5000)


# ---------------- PIK-R Hub ----------------
class OrgIn(BaseModel):
    name: str = Field(min_length=3, max_length=120)
    institution: str = Field(min_length=2, max_length=120)
    city: str = Field(min_length=2, max_length=80)
    province: str = Field(min_length=2, max_length=60)
    contact: str = Field(min_length=3, max_length=120)
    contact_person: str = Field("", max_length=80)
    official_email: str = Field("", max_length=120)
    instagram: str = Field("", max_length=80)
    website: str = Field("", max_length=200)
    sk_url: str = Field("", max_length=500)
    evidence_url: str = Field("", max_length=500)
    description: str = Field(min_length=10, max_length=1500)
    category: str = Field("Jalur Pendidikan", pattern="^(Jalur Pendidikan|Jalur Masyarakat)$")


PRIVATE_ORG = {"_id": 0, "owner_id": 0, "owner_email": 0, "admin_note": 0, "sk_url": 0, "evidence_url": 0, "official_email": 0, "contact_person": 0}


def norm(s: str) -> str:
    return re.sub(r"[^a-z0-9]", "", (s or "").lower().replace("pik-r", "").replace("pikr", ""))


async def find_duplicate(body, exclude: str = "") -> Optional[dict]:
    async for o in db.orgs.find({"id": {"$ne": exclude}, "status": {"$nin": ["rejected"]}}, {"_id": 0, "id": 1, "name": 1, "institution": 1, "city": 1}):
        if norm(o["name"]) == norm(body.name) or (norm(o["institution"]) == norm(body.institution) and norm(o["city"]) == norm(body.city)):
            return o
    return None


@api.get("/orgs")
async def list_orgs(province: str = "", q: str = ""):
    flt = {"status": "verified"}
    if province:
        flt["province"] = province
    if q:
        flt["name"] = {"$regex": q[:50].replace("\\", ""), "$options": "i"}
    return await db.orgs.find(flt, PRIVATE_ORG).sort("name", 1).to_list(500)


@api.get("/orgs/stats")
async def org_stats_by_province():
    rows = await db.orgs.aggregate([
        {"$match": {"status": "verified"}},
        {"$group": {"_id": "$province", "count": {"$sum": 1}}},
    ]).to_list(100)
    stats = {}
    aliases = {"Jakarta Raya": "DKI Jakarta", "Yogyakarta": "DI Yogyakarta"}
    for row in rows:
        raw_province = (row.get("_id") or "").strip()
        province = aliases.get(raw_province, raw_province)
        if province:
            stats[province] = stats.get(province, 0) + row["count"]
    return stats


@api.get("/orgs/{org_id}")
async def get_org(org_id: str):
    o = await db.orgs.find_one({"id": org_id, "status": "verified"}, PRIVATE_ORG)
    if not o:
        raise HTTPException(404, "PIK-R tidak ditemukan")
    return o


@api.put("/orgs/{org_id}")
async def correct_org(org_id: str, body: OrgIn, m: dict = Depends(current_member)):
    o = await db.orgs.find_one({"id": org_id, "owner_id": m["user_id"]}, {"_id": 0, "status": 1})
    if not o:
        raise HTTPException(404, "Tidak ditemukan")
    if o["status"] not in ("needs_correction", "submitted", "rejected"):
        raise HTTPException(409, "Pengajuan ini sedang ditinjau atau sudah diverifikasi")
    if await find_duplicate(body, org_id):
        raise HTTPException(409, "PIK-R dengan nama atau sekolah yang sama sudah terdaftar")
    await db.orgs.update_one({"id": org_id}, {"$set": {**body.model_dump(), "status": "submitted", "updated_at": now_iso()}})
    return {"ok": True}


@api.post("/orgs")
async def submit_org(body: OrgIn, m: dict = Depends(current_member)):
    if await db.orgs.count_documents({"owner_id": m["user_id"], "status": {"$in": ["submitted", "under_review"]}}) >= 3:
        raise HTTPException(429, "Kamu masih punya 3 pengajuan yang menunggu verifikasi")
    dup = await find_duplicate(body)
    if dup:
        raise HTTPException(409, f"Kemungkinan duplikat: {dup['name']} ({dup['institution']}) sudah terdaftar. Hubungi admin bila ini keliru.")
    doc = {**body.model_dump(), "id": new_id(), "status": "submitted", "owner_id": m["user_id"],
           "owner_email": m.get("email", ""), "admin_note": "", "created_at": now_iso()}
    await db.orgs.insert_one(doc)
    return {"ok": True, "id": doc["id"]}


@api.get("/admin/orgs")
async def admin_orgs(status: str = "", a: dict = Depends(admin_only)):
    flt = {"status": status} if status else {}
    return await db.orgs.find(flt, {"_id": 0}).sort("created_at", -1).to_list(1000)


class OrgStatusIn(BaseModel):
    status: str = Field(pattern="^(submitted|under_review|needs_correction|verified|rejected|suspended)$")
    admin_note: str = Field("", max_length=500)


@api.patch("/admin/orgs/{org_id}")
async def set_org_status(org_id: str, body: OrgStatusIn, a: dict = Depends(admin_only)):
    org = await db.orgs.find_one_and_update({"id": org_id}, {"$set": body.model_dump()}, projection={"_id": 0}, return_document=ReturnDocument.AFTER)
    if not org:
        raise HTTPException(404, "Tidak ditemukan")
    if body.status in ("verified", "rejected", "needs_correction", "suspended") and org.get("owner_email"):
        emailer.org_status(org["owner_email"], org)
    return org


@api.delete("/admin/orgs/{org_id}")
async def delete_org(org_id: str, a: dict = Depends(admin_only)):
    await db.orgs.delete_one({"id": org_id})
    return {"ok": True}


# ---------------- SMILE PLAY ----------------
@api.get("/quizzes")
async def list_quizzes():
    qs = await db.quizzes.find({}, {"_id": 0}).to_list(100)
    return [{**{k: v for k, v in q.items() if k != "questions"}, "count": len(q["questions"])} for q in qs]


@api.get("/quizzes/{quiz_id}")
async def get_quiz(quiz_id: str):
    q = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Kuis tidak ditemukan")
    q["questions"] = [{"q": x["q"], "options": x["options"]} for x in q["questions"]]
    return q


class SubmitIn(BaseModel):
    answers: List[int]


@api.post("/quizzes/{quiz_id}/submit")
async def submit_quiz(quiz_id: str, body: SubmitIn, m: Optional[dict] = Depends(optional_member)):
    q = await db.quizzes.find_one({"id": quiz_id}, {"_id": 0})
    if not q:
        raise HTTPException(404, "Kuis tidak ditemukan")
    review, correct = [], 0
    for i, item in enumerate(q["questions"]):
        given = body.answers[i] if i < len(body.answers) else -1
        ok = given == item["answer"]
        correct += ok
        review.append({"correct": ok, "answer": item["answer"], "explain": item["explain"]})
    xp = 0
    if m:
        if quiz_id not in m.get("quizzes_done", []):
            xp += correct * 10
            await db.users.update_one({"user_id": m["user_id"]}, {"$addToSet": {"quizzes_done": quiz_id}})
        today = datetime.now(timezone.utc).date().isoformat()
        if m.get("last_daily") != today:
            xp += 20
            await db.users.update_one({"user_id": m["user_id"]}, {"$set": {"last_daily": today}})
        if xp:
            await add_xp(m["user_id"], xp)
    return {"correct": correct, "total": len(q["questions"]), "review": review, "xp_gained": xp}


class GameIn(BaseModel):
    game: str = Field(pattern="^(life-planner|word-search|memory-match|story-quest)$")


GAME_XP = {"life-planner": 50, "word-search": 30, "memory-match": 30, "story-quest": 40}


@api.post("/play/complete")
async def complete_game(body: GameIn, m: dict = Depends(current_member)):
    res = await db.users.update_one({"user_id": m["user_id"], "games": {"$ne": body.game}}, {"$push": {"games": body.game}})
    if res.modified_count:
        await add_xp(m["user_id"], GAME_XP[body.game])
    return {"xp_gained": GAME_XP[body.game] if res.modified_count else 0}


class QuestionIn(BaseModel):
    q: str = Field(min_length=3, max_length=400)
    options: List[str] = Field(min_length=2, max_length=6)
    answer: int = Field(ge=0, le=5)
    explain: str = Field("", max_length=500)


class QuizIn(BaseModel):
    title: str = Field(min_length=3, max_length=120)
    description: str = Field("", max_length=300)
    kind: str = Field("quiz", pattern="^(quiz|mythfact)$")
    difficulty: str = Field("Sedang", pattern="^(Mudah|Sedang|Sulit)$")
    topic: str = Field("GenRe", max_length=60)
    color: str = Field("purple", pattern="^(purple|mint|orange)$")
    cover: str = "cheer"
    questions: List[QuestionIn] = Field(min_length=1, max_length=100)


@api.get("/admin/quizzes")
async def admin_quizzes(m: dict = Depends(content_staff)):
    return await db.quizzes.find({}, {"_id": 0}).to_list(500)


@api.post("/admin/quizzes")
async def create_quiz(body: QuizIn, m: dict = Depends(content_staff)):
    if any(q.answer >= len(q.options) for q in body.questions):
        raise HTTPException(400, "Kunci jawaban di luar pilihan")
    doc = {**body.model_dump(), "id": new_id(), "slug": new_id()}
    await db.quizzes.insert_one(doc)
    return {"id": doc["id"]}


@api.put("/admin/quizzes/{qid}")
async def update_quiz(qid: str, body: QuizIn, m: dict = Depends(content_staff)):
    if any(q.answer >= len(q.options) for q in body.questions):
        raise HTTPException(400, "Kunci jawaban di luar pilihan")
    if not (await db.quizzes.update_one({"id": qid}, {"$set": body.model_dump()})).matched_count:
        raise HTTPException(404, "Tidak ditemukan")
    return {"ok": True}


@api.delete("/admin/quizzes/{qid}")
async def delete_quiz(qid: str, m: dict = Depends(require_role("admin", "editor"))):
    await db.quizzes.delete_one({"id": qid})
    return {"ok": True}


@api.get("/leaderboard")
async def leaderboard():
    top = await db.users.find({**IN_ENV, "xp": {"$gt": 0}}, {"_id": 0, "name": 1, "xp": 1}).sort("xp", -1).limit(10).to_list(10)
    return [{"name": (t.get("name") or "Sahabat")[:20], "xp": t["xp"]} for t in top]


# ---------------- Community ----------------
class CommunityIn(BaseModel):
    text: str = Field(min_length=5, max_length=1500)
    topic: str = Field("Cerita", pattern="^(Cerita|Pertanyaan|Inspirasi)$")
    anonymous: bool = True


class ReplyIn(BaseModel):
    text: str = Field(min_length=2, max_length=800)
    anonymous: bool = False


def public_post(p: dict, uid: str = "") -> dict:
    out = {k: v for k, v in p.items() if k not in ("user_id", "_id")}
    out["mine"] = p.get("user_id") == uid
    out["replies"] = [{k: v for k, v in r.items() if k != "user_id"} for r in p.get("replies", [])]
    return out


@api.get("/community")
async def list_community(topic: str = "", m: Optional[dict] = Depends(optional_member)):
    flt = {"topic": topic} if topic else {}
    posts = await db.community.find(flt, {"_id": 0}).sort("created_at", -1).to_list(200)
    return [public_post(p, m["user_id"] if m else "") for p in posts]


@api.post("/community")
async def create_community(body: CommunityIn, m: dict = Depends(current_member)):
    doc = {"id": new_id(), "user_id": m["user_id"], "author": "Anonim" if body.anonymous else m.get("name", "Sahabat"),
           "text": body.text, "topic": body.topic, "replies": [], "hearts": [], "created_at": now_iso()}
    await db.community.insert_one(doc)
    await add_xp(m["user_id"], 5)
    return public_post(doc, m["user_id"])


@api.post("/community/{post_id}/replies")
async def reply_community(post_id: str, body: ReplyIn, m: dict = Depends(current_member)):
    badge = {"admin": "Admin", "counselor": "Konselor", "moderator": "Moderator"}.get(m["role"], "")
    r = {"id": new_id(), "user_id": m["user_id"], "author": "Anonim" if body.anonymous else m.get("name", "Sahabat"),
         "badge": badge, "text": body.text, "created_at": now_iso()}
    res = await db.community.update_one({"id": post_id}, {"$push": {"replies": r}})
    if not res.matched_count:
        raise HTTPException(404, "Tidak ditemukan")
    return {"ok": True}


@api.post("/community/{post_id}/heart")
async def heart_community(post_id: str, m: dict = Depends(current_member)):
    p = await db.community.find_one({"id": post_id}, {"_id": 0, "hearts": 1})
    if p is None:
        raise HTTPException(404, "Tidak ditemukan")
    op = "$pull" if m["user_id"] in p.get("hearts", []) else "$addToSet"
    await db.community.update_one({"id": post_id}, {op: {"hearts": m["user_id"]}})
    return {"ok": True}


@api.delete("/community/{post_id}")
async def delete_community(post_id: str, m: dict = Depends(current_member)):
    scope = {} if m["role"] in ("admin", "moderator") else {"user_id": m["user_id"]}
    if not (await db.community.delete_one({"id": post_id, **scope})).deleted_count:
        raise HTTPException(404, "Tidak ditemukan")
    return {"ok": True}


# ---------------- SMILE TALK ----------------
SYSTEM_PROMPT = """Kamu adalah SMILO, asisten AI (bukan manusia) di SMILE ACTION LAB, program inovasi Duta GenRe. Motto: We Listen. We Care. We Guide.
CARA BICARA:
- Gunakan bahasa Indonesia yang tenang, hangat, profesional, dan mudah dipahami. Sapa dengan "kamu"; hindari slang berlebihan, jargon, dan nada menggurui.
- Tanggapi isi cerita secara spesifik. Akui perasaan tanpa menebak atau membesar-besarkannya; hindari pembuka klise seperti "Aku mengerti perasaanmu" jika tidak didukung cerita.
- Gunakan gaya pendamping yang kolaboratif, bukan ceramah: dengarkan dulu, bantu pengguna memilah apa yang paling penting, lalu sepakati satu langkah kecil yang realistis. Bila konteks belum cukup, ajukan satu pertanyaan terbuka; jangan membanjiri pengguna dengan banyak saran.
- Untuk curhat, hubungkan saran dengan situasi yang diceritakan. Tawarkan pilihan, bukan perintah, dan tanyakan apakah langkah itu terasa mungkin. Jangan memaksa pengguna bercerita dan jangan selalu mengakhiri jawaban dengan pertanyaan.
- Jawab secukupnya; gunakan poin hanya jika membuat langkah-langkah lebih jelas. Jangan memperkenalkan diri berulang, memakai template, atau menutup dengan "ada pertanyaan lain?". Emoji biasanya tidak perlu.
- Jangan menghakimi, menjanjikan kerahasiaan mutlak, atau menambahkan disclaimer di setiap pesan.
CONTOH: Remaja: "akhir-akhir ini aku bingung banget sama masa depan." SMILO: "Kedengarannya beberapa pilihan sedang terasa berat. Kita tidak harus memutuskan semuanya hari ini. Pilihan apa yang paling mendesak, dan informasi apa yang bisa membantumu mengambil satu langkah kecil?"
PENGETAHUAN: Untuk fakta (GenRe, PIK-R, PUP, TRIAD KRR, kesehatan), utamakan potongan BASIS PENGETAHUAN yang diberikan dan sebut nomornya seperti [1]. Jika basis pengetahuan tidak memuat jawabannya dan kamu tidak yakin, katakan terus terang bahwa kamu belum yakin dan sarankan sumber resmi (BKKBN/Kemendukbangga, Kemenkes) atau konselor. Jangan mengarang angka, kebijakan, aturan hukum, nama program, atau tautan.
BATASAN: Jangan mengaku sebagai psikolog, dokter, atau konselor manusia; jangan mendiagnosis atau menyarankan obat. Bila topiknya berat atau pribadi, tawarkan tombol "Hubungkan ke konselor" di layar (konselor manusia membalas pada jam layanan, bukan 24 jam).
DARURAT: Jika ada tanda bahaya (ingin bunuh diri, menyakiti diri, kekerasan, pelecehan), tanggapi sangat peduli, minta segera menghubungi orang dewasa tepercaya dan layanan: darurat 112, SEJIWA 119 ext 8, SAPA 129.
Jangan meminta data pribadi (alamat, nomor telepon, nama sekolah lengkap)."""

STOP = {"yang", "dan", "itu", "apa", "aku", "kamu", "sih", "ini", "ada", "di", "ke", "dari", "untuk", "dengan", "gimana", "bagaimana", "nya", "juga", "saya", "tidak", "gak", "ga", "mau"}


async def retrieve(text: str, k: int = 3) -> list:
    words = {w for w in re.findall(r"[a-z0-9-]{3,}", text.lower()) if w not in STOP}
    if not words:
        return []
    posts = await db.posts.find({"kind": "learn", **published_filter(), "review_status": {"$ne": "Draf AI - perlu verifikasi"}},
                                {"_id": 0, "id": 1, "title": 1, "summary": 1, "content": 1}).to_list(500)
    scored = []
    for p in posts:
        hay = f"{p['title']} {p['title']} {p.get('summary', '')} {p.get('content', '')}".lower()
        s = sum(hay.count(w) for w in words)
        if s >= 2:
            scored.append((s, p))
    scored.sort(key=lambda x: -x[0])
    return [p for _, p in scored[:k]]

RISK_WORDS = [
    "bunuh diri", "ingin mati", "tidak ingin hidup", "gak ingin hidup", "enggak ingin hidup",
    "pengen mati", "pingin mati", "mau mati", "akhiri hidup", "mengakhiri hidup", "mengakhiri nyawa",
    "menyakiti diri", "self harm", "selfharm", "melukai diri", "sayat", "dilecehkan", "pelecehan",
    "diperkosa", "kekerasan", "dipukuli", "dianiaya", "diancam", "dipaksa", "suicide",
]
ANON_DAILY = 20
USER_DAILY = 100


class TalkIn(BaseModel):
    message: str = Field(min_length=1, max_length=2000)
    session_id: Optional[str] = None
    anon_id: Optional[str] = Field(None, max_length=64)
    gemini_consent: bool = False


async def talk_owner(request: Request, anon_id: Optional[str]) -> str:
    m = await optional_member(request)
    if m:
        return "u:" + m["user_id"]
    if not anon_id or len(anon_id) < 8:
        raise HTTPException(400, "anon_id diperlukan")
    return "a:" + anon_id


@api.get("/talk/config")
async def talk_config():
    return {"gemini_available": gemini_available()}


@api.post("/talk/stream")
async def talk_stream(body: TalkIn, request: Request):
    owner = await talk_owner(request, body.anon_id)
    day_start = datetime.now(timezone.utc).date().isoformat()
    used = await db.talk_messages.count_documents({"owner": owner, "role": "user", "created_at": {"$gte": day_start}})
    if used >= (USER_DAILY if owner.startswith("u:") else ANON_DAILY):
        raise HTTPException(429, "Batas pesan harian tercapai. Masuk dengan akun atau coba lagi besok, ya.")

    sid = body.session_id
    sess = None
    if sid:
        sess = await db.talk_sessions.find_one({"id": sid, "owner": owner}, {"_id": 0})
        if not sess:
            raise HTTPException(404, "Sesi tidak ditemukan")

    risky = any(w in body.message.lower() for w in RISK_WORDS)
    if body.gemini_consent and not risky and not gemini_available():
        raise HTTPException(503, "Gemini belum dikonfigurasi. Matikan opsi Gemini untuk memakai mode lokal.")

    history = []
    search_text = body.message
    if sid and (not body.gemini_consent or risky):
        history = await db.talk_messages.find({"session_id": sid}, {"_id": 0, "role": 1, "text": 1}).sort("created_at", -1).to_list(8)
        history.reverse()
        search_text += " " + " ".join(item["text"] for item in history if item.get("role") == "user")[-1000:]
    docs = await retrieve(search_text)
    sources = [{"id": d["id"], "title": d["title"]} for d in docs]
    knowledge = "\n\n".join(f"[{i + 1}] {d['title']}: {d.get('content', '')[:1500]}" for i, d in enumerate(docs))
    if risky:
        answer = local_reply(body.message, docs, flagged=True)
        mode = "local-priority"
    elif body.gemini_consent:
        try:
            answer = await generate_gemini_reply(body.message, knowledge, SYSTEM_PROMPT)
        except Exception as exc:
            logger.error("Gemini counseling request failed: %s", type(exc).__name__)
            raise HTTPException(
                502,
                "Gemini gagal merespons. Pesanmu tidak dialihkan ke layanan lain. "
                "Matikan opsi Gemini untuk memakai mode lokal, atau coba lagi.",
            ) from exc
        mode = "gemini"
    else:
        answer = local_reply(body.message, docs, history=history)
        mode = "local"

    recommendations = [] if risky else video_recommendations(body.message)
    if not sid:
        sid = new_id()
        sess = {
            "id": sid, "owner": owner, "title": body.message[:48], "flagged": False, "handled": False,
            "created_at": now_iso(), "updated_at": now_iso(),
        }
        await db.talk_sessions.insert_one(sess)
    await db.talk_messages.insert_one({
        "id": new_id(), "session_id": sid, "owner": owner, "role": "user",
        "text": body.message, "created_at": now_iso(),
    })
    if risky:
        await db.talk_sessions.update_one(
            {"id": sid},
            {"$set": {"flagged": True, "priority": "urgent", "handled": False, "flagged_at": now_iso(), "updated_at": now_iso()}},
        )
        if not (sess or {}).get("flagged") or (sess or {}).get("handled"):
            emailer.urgent_alert(sid)
    await db.talk_messages.insert_one({
        "id": new_id(), "session_id": sid, "owner": owner, "role": "assistant", "text": answer,
        "sources": sources, "recommendations": recommendations, "mode": mode, "created_at": now_iso(),
    })
    await db.talk_sessions.update_one({"id": sid}, {"$set": {"updated_at": now_iso()}})

    async def gen():
        for start in range(0, len(answer), 80):
            yield f"data: {json.dumps({'t': answer[start:start + 80]})}\n\n"
        yield f"data: {json.dumps({'done': True, 'session_id': sid, 'flagged': risky, 'sources': sources, 'recommendations': recommendations, 'mode': mode})}\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@api.get("/talk/sessions")
async def talk_sessions(request: Request, anon_id: Optional[str] = None):
    owner = await talk_owner(request, anon_id)
    return await db.talk_sessions.find({"owner": owner}, {"_id": 0, "owner": 0, "flag_excerpt": 0}).sort("updated_at", -1).to_list(100)


class HandoverIn(BaseModel):
    note: str = Field("", max_length=500)
    anon_id: Optional[str] = Field(None, max_length=64)


@api.post("/talk/sessions/{sid}/handover")
async def talk_handover(sid: str, body: HandoverIn, request: Request):
    owner = await talk_owner(request, body.anon_id)
    r = await db.talk_sessions.update_one({"id": sid, "owner": owner}, {"$set": {"handover": "requested", "handover_note": body.note, "handover_at": now_iso()}})
    if not r.matched_count:
        raise HTTPException(404, "Sesi tidak ditemukan")
    emailer.urgent_alert(sid)
    return {"ok": True}


@api.get("/talk/sessions/{sid}")
async def talk_messages(sid: str, request: Request, anon_id: Optional[str] = None):
    owner = await talk_owner(request, anon_id)
    if not await db.talk_sessions.find_one({"id": sid, "owner": owner}, {"_id": 1}):
        raise HTTPException(404, "Sesi tidak ditemukan")
    return await db.talk_messages.find({"session_id": sid}, {"_id": 0, "owner": 0}).sort("created_at", 1).to_list(500)


@api.delete("/talk/sessions/{sid}")
async def talk_delete(sid: str, request: Request, anon_id: Optional[str] = None):
    owner = await talk_owner(request, anon_id)
    if not (await db.talk_sessions.delete_one({"id": sid, "owner": owner})).deleted_count:
        raise HTTPException(404, "Sesi tidak ditemukan")
    await db.talk_messages.delete_many({"session_id": sid})
    return {"ok": True}


# ---------------- Admin ----------------
@api.get("/admin/stats")
async def admin_stats(a: dict = Depends(any_staff)):
    return {
        "users": await db.users.count_documents(IN_ENV),
        "talk_sessions": await db.talk_sessions.count_documents({}),
        "posts": await db.posts.count_documents({}),
        "events": await db.events.count_documents({}),
        "registrations": await db.registrations.count_documents({}),
        "orgs_verified": await db.orgs.count_documents({"status": "verified"}),
        "orgs_pending": await db.orgs.count_documents({"status": {"$in": ["submitted", "under_review", "pending"]}}),
        "flags_open": await db.talk_sessions.count_documents({"flagged": True, "handled": False}),
        "community": await db.community.count_documents({}),
        "handover_open": await db.talk_sessions.count_documents({"handover": "requested"}),
        "review_queue": await db.discoveries.count_documents({"status": "pending"}),
        "drafts": await db.posts.count_documents({"status": {"$in": ["draft", "review"]}}),
        "expiring": await db.posts.count_documents({"expires_at": {"$nin": ["", None], "$lte": today()}}),
    }


@api.get("/admin/flags")
async def admin_flags(a: dict = Depends(counsel_staff)):
    rows = await db.talk_sessions.find({"flagged": True}, {"_id": 0}).sort("flagged_at", -1).to_list(200)
    for r in rows:
        r["is_anonymous"] = r.pop("owner", "").startswith("a:")
    return rows


@api.patch("/admin/flags/{sid}")
async def handle_flag(sid: str, a: dict = Depends(counsel_staff)):
    r = await db.talk_sessions.update_one({"id": sid, "flagged": True}, {"$set": {"handled": True}})
    if not r.matched_count:
        raise HTTPException(404, "Tidak ditemukan")
    return {"ok": True}


@api.get("/users")
async def list_users(admin: dict = Depends(admin_only)):
    people = await db.users.find(IN_ENV, {"_id": 0, "reads": 0, "bookmarks": 0}).sort("created_at", -1).to_list(1000)
    return {"roles": [r for r in ROLES if RANK[r] <= RANK[admin["role"]]],
            "users": [{**p, "role": effective_role(p.get("role"))} for p in people]}


class RoleIn(BaseModel):
    role: str


@api.patch("/users/{user_id}/role")
async def set_role(user_id: str, body: RoleIn, admin: dict = Depends(admin_only)):
    if body.role not in ROLES or RANK[body.role] > RANK[admin["role"]]:
        raise HTTPException(status_code=403, detail="Tidak diizinkan")
    target = await db.users.find_one({"user_id": user_id, **IN_ENV}, {"_id": 0})
    if target is None:
        raise HTTPException(status_code=404, detail="Tidak ditemukan")
    if (effective_role(target.get("role")) == "admin" and body.role != "admin"
            and await db.users.count_documents({"role": "admin", **IN_ENV}) <= 1):
        raise HTTPException(status_code=409, detail="Minimal harus ada satu admin")
    await db.users.update_one({"user_id": user_id}, {"$set": {"role": body.role}})
    return {"user_id": user_id, "role": body.role}


@api.get("/stats/public")
async def public_stats():
    return {"materi": await db.posts.count_documents({"kind": "learn", **published_filter()}),
            "pikr": await db.orgs.count_documents({"status": "verified"}),
            "events": await db.events.count_documents({"verified": True}),
            "members": await db.users.count_documents(IN_ENV)}


@api.get("/")
async def root():
    return {"message": "SMILE ACTION LAB API"}


# ---------------- Seed ----------------
async def seed():
    for it in LEARN:
        await db.posts.update_one(
            {"slug": it["slug"]},
            {"$setOnInsert": {**it, "kind": "learn", "status": "published", "id": new_id(), "link": "", "created_at": now_iso()}},
            upsert=True,
        )
    await db.posts.update_many({"slug": {"$in": [x["slug"] for x in LEARN]}, "status": {"$exists": False}},
                               {"$set": {"status": "published", "updated_at": now_iso()}})
    await db.posts.update_many({"slug": {"$in": [x["slug"] for x in LEARN]}, "references": {"$exists": False}},
                               {"$set": {"references": [EBOOK_REF]}})
    await db.posts.update_many({"slug": {"$in": [x["slug"] for x in LEARN]}, "review_status": {"$exists": False}},
                               {"$set": {"review_status": "Diadaptasi"}})
    for slug, track in TRACKS.items():
        await db.posts.update_one({"slug": slug, "track": {"$exists": False}}, {"$set": {"track": track}})
    # Remove V1 illustrative news/events/orgs: only traceable content is allowed.
    await db.posts.delete_many({"slug": {"$in": [x["slug"] for x in NEWS]}})
    old_events = [e["id"] async for e in db.events.find({"slug": {"$in": [x["slug"] for x in EVENTS]}}, {"id": 1})]
    await db.events.delete_many({"id": {"$in": old_events}})
    await db.registrations.delete_many({"event_id": {"$in": old_events}})
    await db.orgs.delete_many({"is_sample": True})
    for it in SOURCES:
        await db.sources.update_one({"slug": it["slug"]}, {"$setOnInsert": {**it, "id": new_id(), "active": True, "last_checked": "", "last_error": "", "created_at": now_iso()}}, upsert=True)
    await db.orgs.update_many({"status": "pending"}, {"$set": {"status": "submitted"}})
    for it in QUIZZES:
        await db.quizzes.update_one({"slug": it["slug"]}, {"$setOnInsert": {**it, "id": it["slug"]}}, upsert=True)


studio_router, run_discovery = studio.build(db, require_role, new_id, now_iso)
app.include_router(api)
app.include_router(studio_router)
app.include_router(clerk_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')


@app.on_event("startup")
async def startup():
    for old, new in RETIRED_ROLES.items():
        await db.users.update_many({"role": old}, {"$set": {"role": new}})
    await seed()
    app.state.index_task = asyncio.create_task(ensure_indexes())
    app.state.discovery_task = asyncio.create_task(discovery_loop())


async def discovery_loop():
    await asyncio.sleep(120)
    while True:
        try:
            n = await run_discovery()
            logger.info("discovery: %s new items", n)
        except Exception as exc:
            logger.warning("discovery loop: %s", exc)
        await asyncio.sleep(12 * 3600)


@app.on_event("shutdown")
async def shutdown_db_client():
    app.state.index_task.cancel()
    app.state.discovery_task.cancel()
    with suppress(asyncio.CancelledError):
        await app.state.index_task
    client.close()
