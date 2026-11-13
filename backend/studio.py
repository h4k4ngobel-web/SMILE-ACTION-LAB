import asyncio
import html
import logging
import os
import re
from datetime import datetime, timezone
from typing import Optional
from urllib import robotparser
from urllib.parse import urljoin, urlparse

import feedparser
import httpx
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field

try:
    from backend.llm import get_chat_types
    from backend.seed_v2 import CATEGORY_KEYWORDS
except ModuleNotFoundError:
    from llm import get_chat_types
    from seed_v2 import CATEGORY_KEYWORDS

logger = logging.getLogger(__name__)
UA = "SmileActionLabBot/1.0 (+edukasi remaja; kontak lab.smileaction@gmail.com)"
FEED_GUESSES = ["/feed", "/rss", "/rss.xml", "/feed.xml"]


def clean(text: str, n: int = 500) -> str:
    t = re.sub(r"<[^>]+>", " ", html.unescape(text or ""))
    return re.sub(r"\s+", " ", t).strip()[:n]


def guess_category(text: str) -> str:
    low = text.lower()
    for cat, words in CATEGORY_KEYWORDS.items():
        if any(w in low for w in words):
            return cat
    return "Umum"


async def robots_ok(client: httpx.AsyncClient, url: str) -> bool:
    p = urlparse(url)
    try:
        r = await client.get(f"{p.scheme}://{p.netloc}/robots.txt")
        if r.status_code >= 400:
            return True
        rp = robotparser.RobotFileParser()
        rp.parse(r.text.splitlines())
        return rp.can_fetch(UA, url)
    except httpx.HTTPError:
        return True


class SourceIn(BaseModel):
    name: str = Field(min_length=2, max_length=80)
    institution: str = Field(min_length=2, max_length=160)
    url: str = Field(pattern=r"^https://")
    feed_url: str = Field("", max_length=400)
    active: bool = True


class ReviewIn(BaseModel):
    action: str = Field(pattern="^(approve|reject)$")
    summary: str = Field("", max_length=1500)
    category: str = Field("Umum", max_length=40)
    title: str = Field("", max_length=200)


class DraftIn(BaseModel):
    topic: str = Field(min_length=3, max_length=160)
    category: str = Field(min_length=2, max_length=40)


class HandoverReply(BaseModel):
    text: str = Field(min_length=2, max_length=2000)


DRAFT_PROMPT = """Kamu edukator remaja untuk SMILE ACTION LAB (program GenRe). Tulis modul pembelajaran berbahasa Indonesia yang hangat dan mudah dipahami remaja (seperti kakak yang paham materi, bukan buku teks kaku), akurat, tidak vulgar, 1.500-2.200 kata, paragraf pendek, format Markdown.
Baris pertama WAJIB: "JUDUL: <judul yang memancing rasa ingin tahu tapi bukan clickbait>".
Lalu bagian (##) berurutan:
## Mulai dalam 3 Menit
## Cerita Pembuka
## Kenapa Ini Penting
## Tujuan Pembelajaran
## Penjelasan Utama
## Konsep Kunci
## Contoh Nyata dan Skenario
## Mitos vs Fakta
## Kesalahan yang Sering Terjadi
## Coba Refleksikan
## Uji Pemahaman (5 soal pilihan ganda + kunci jawaban)
## Checklist Aksi
## Ringkasan
## Bacaan Lanjutan
Gunakan > kutipan untuk insight penting. ATURAN KETAT: jangan mengarang statistik, angka, kutipan lembaga, nama peraturan, atau URL. Jika suatu klaim membutuhkan sumber, tulis [PERLU SUMBER]. Di Bacaan Lanjutan sebutkan hanya nama lembaga resmi relevan (BKKBN/Kemendukbangga, Kemenkes, WHO, UNICEF, UNFPA) tanpa URL."""


async def write_module(db, new_id, now_iso, topic: str, category: str, track: str = "", author: str = "") -> dict:
    LlmChat, UserMessage, TextDelta, StreamDone, llm_api_key = get_chat_types()
    chat = LlmChat(api_key=llm_api_key, session_id=new_id(), system_message=DRAFT_PROMPT).with_model("openai", "gpt-6-luna")
    text = ""
    async for ev in chat.stream_message(UserMessage(text=f"Topik modul: {topic}\nKategori: {category}")):
        if isinstance(ev, TextDelta):
            text += ev.content
        elif isinstance(ev, StreamDone):
            break
    if len(text) < 200:
        raise HTTPException(502, "AI gagal membuat draf. Coba lagi.")
    title = topic
    first, _, rest = text.strip().partition("\n")
    if first.upper().startswith("JUDUL:"):
        title, text = first.split(":", 1)[1].strip().strip('"'), rest.strip()
    words = len(text.split())
    post = {"id": new_id(), "slug": new_id(), "kind": "learn", "title": title[:160], "category": category, "track": track or topic,
            "summary": f"Modul {category}: {topic}.", "content": text, "cover": "study", "read_min": max(3, words // 200),
            "link": "", "status": "review", "publish_at": "", "review_status": "Draf AI - perlu verifikasi", "references": [],
            "seo_title": "", "seo_description": "", "created_at": now_iso(), "updated_at": now_iso(), "author": author}
    await db.posts.insert_one(post)
    return {"id": post["id"], "words": words}


def build(db, require_role, new_id, now_iso):
    r = APIRouter(prefix="/api")
    content_staff = require_role("admin", "editor", "fact_checker")
    counsel_staff = require_role("admin", "counselor")
    admin_only = require_role("admin")

    async def audit(actor: dict, action: str, target: str):
        await db.audit.insert_one({"id": new_id(), "actor": actor.get("email") or actor["user_id"], "role": actor["role"],
                                   "action": action, "target": target, "at": now_iso()})

    # ---- Sources ----
    @r.get("/admin/sources")
    async def list_sources(m: dict = Depends(content_staff)):
        return await db.sources.find({}, {"_id": 0}).sort("name", 1).to_list(200)

    @r.post("/admin/sources")
    async def add_source(body: SourceIn, m: dict = Depends(content_staff)):
        doc = {**body.model_dump(), "id": new_id(), "slug": new_id(), "last_checked": "", "last_error": "", "created_at": now_iso()}
        await db.sources.insert_one(doc)
        doc.pop("_id", None)
        return doc

    @r.put("/admin/sources/{sid}")
    async def edit_source(sid: str, body: SourceIn, m: dict = Depends(content_staff)):
        if not (await db.sources.update_one({"id": sid}, {"$set": body.model_dump()})).matched_count:
            raise HTTPException(404, "Tidak ditemukan")
        return {"ok": True}

    @r.delete("/admin/sources/{sid}")
    async def del_source(sid: str, m: dict = Depends(admin_only)):
        await db.sources.delete_one({"id": sid})
        return {"ok": True}

    # ---- Discovery ----
    async def check_source(client, src) -> int:
        candidates = [src["feed_url"]] if src.get("feed_url") else [urljoin(src["url"] + "/", g.lstrip("/")) for g in FEED_GUESSES]
        found, err = 0, "Tidak ada RSS yang ditemukan. Isi URL feed resmi jika tersedia."
        for feed in candidates:
            if not await robots_ok(client, feed):
                err = "Diblokir robots.txt"
                continue
            try:
                resp = await client.get(feed)
            except httpx.HTTPError as exc:
                err = f"Gagal terhubung: {type(exc).__name__}"
                continue
            if resp.status_code != 200:
                continue
            parsed = feedparser.parse(resp.content)
            if not parsed.entries:
                continue
            err = ""
            for e in parsed.entries[:20]:
                link = e.get("link", "")
                title = clean(e.get("title", ""), 200)
                if not link or not title:
                    continue
                if await db.discoveries.find_one({"$or": [{"link": link}, {"title": title}]}, {"_id": 1}):
                    continue
                summary = clean(e.get("summary", ""))
                await db.discoveries.insert_one({
                    "id": new_id(), "source_id": src["id"], "source_name": src["name"], "institution": src["institution"],
                    "title": title, "link": link, "published": e.get("published", "") or e.get("updated", ""),
                    "summary": summary, "category": guess_category(title + " " + summary), "status": "pending", "discovered_at": now_iso()})
                found += 1
            break
        await db.sources.update_one({"id": src["id"]}, {"$set": {"last_checked": now_iso(), "last_error": err}})
        return found

    async def check_event_links(client):
        today = datetime.now(timezone.utc).date().isoformat()
        async for ev in db.events.find({"registration_link": {"$regex": "^https://"}}, {"_id": 0, "id": 1, "registration_link": 1, "reg_deadline": 1}):
            ok = True
            try:
                resp = await client.head(ev["registration_link"], follow_redirects=True)
                ok = resp.status_code < 400 or resp.status_code in (403, 405)
            except httpx.HTTPError:
                ok = False
            expired = bool(ev.get("reg_deadline")) and ev["reg_deadline"] < today
            await db.events.update_one({"id": ev["id"]}, {"$set": {"link_ok": ok, "link_expired": expired, "link_checked": now_iso()}})

    async def run_discovery() -> int:
        total = 0
        async with httpx.AsyncClient(timeout=15, headers={"User-Agent": UA}, follow_redirects=True) as client:
            async for src in db.sources.find({"active": True}, {"_id": 0}):
                try:
                    total += await check_source(client, src)
                except Exception as exc:
                    logger.warning("discovery %s: %s", src["name"], exc)
                await asyncio.sleep(1)
            await check_event_links(client)
        return total

    @r.post("/admin/discovery/run")
    async def discovery_run(m: dict = Depends(content_staff)):
        return {"new_items": await run_discovery()}

    @r.get("/admin/discovery")
    async def discovery_list(status: str = "pending", m: dict = Depends(content_staff)):
        return await db.discoveries.find({"status": status} if status else {}, {"_id": 0}).sort("discovered_at", -1).to_list(300)

    @r.patch("/admin/discovery/{did}")
    async def discovery_review(did: str, body: ReviewIn, m: dict = Depends(content_staff)):
        d = await db.discoveries.find_one({"id": did}, {"_id": 0})
        if not d:
            raise HTTPException(404, "Tidak ditemukan")
        if body.action == "reject":
            await db.discoveries.update_one({"id": did}, {"$set": {"status": "rejected", "reviewed_by": m.get("email")}})
            return {"ok": True}
        summary = body.summary or d["summary"]
        if len(summary) < 10:
            raise HTTPException(400, "Tulis ringkasan minimal 10 karakter sebelum menerbitkan")
        post = {"id": new_id(), "slug": new_id(), "kind": "news", "title": body.title or d["title"], "category": body.category or d["category"],
                "summary": summary[:300], "content": summary, "cover": "read", "read_min": 2, "link": d["link"], "status": "published",
                "publish_at": "", "review_status": "Ringkasan impor", "source_name": d["institution"], "source_url": d["link"],
                "original_date": d.get("published", ""), "references": [{"title": d["title"], "institution": d["institution"], "url": d["link"],
                "published": d.get("published", ""), "accessed": now_iso()[:10]}], "created_at": now_iso(), "updated_at": now_iso(),
                "reviewed_by": m.get("email", "")}
        await db.posts.insert_one(post)
        await db.discoveries.update_one({"id": did}, {"$set": {"status": "approved", "post_id": post["id"], "reviewed_by": m.get("email")}})
        return {"ok": True, "post_id": post["id"]}

    # ---- AI draft (never published automatically) ----
    @r.post("/admin/ai/draft")
    async def ai_draft(body: DraftIn, m: dict = Depends(content_staff)):
        return await write_module(db, new_id, now_iso, body.topic, body.category, author=m.get("email", ""))

    @r.get("/admin/posts/{pid}/versions")
    async def versions(pid: str, m: dict = Depends(content_staff)):
        return await db.post_versions.find({"post_id": pid}, {"_id": 0}).sort("saved_at", -1).to_list(50)

    # ---- Counselor handover ----
    @r.get("/counsel/queue")
    async def counsel_queue(m: dict = Depends(counsel_staff)):
        rows = await db.talk_sessions.find(
            {"$or": [{"handover": {"$in": ["requested", "active"]}}, {"flagged": True, "handled": False}]},
            {"_id": 0},
        ).sort([("flagged", -1), ("updated_at", -1)]).to_list(200)
        for x in rows:
            x["is_anonymous"] = x.pop("owner", "").startswith("a:")
        return rows

    @r.get("/counsel/sessions/{sid}")
    async def counsel_view(sid: str, m: dict = Depends(counsel_staff)):
        s = await db.talk_sessions.find_one({"id": sid, "$or": [{"handover": {"$exists": True}}, {"flagged": True}]}, {"_id": 0, "owner": 0})
        if not s:
            raise HTTPException(404, "Tidak ditemukan")
        await audit(m, "view_session", sid)
        msgs = await db.talk_messages.find({"session_id": sid}, {"_id": 0, "owner": 0}).sort("created_at", 1).to_list(500)
        return {"session": s, "messages": msgs}

    @r.post("/counsel/sessions/{sid}/reply")
    async def counsel_reply(sid: str, body: HandoverReply, m: dict = Depends(counsel_staff)):
        s = await db.talk_sessions.find_one({"id": sid, "$or": [{"handover": {"$exists": True}}, {"flagged": True}]}, {"_id": 0, "owner": 1})
        if not s:
            raise HTTPException(404, "Tidak ditemukan")
        await db.talk_messages.insert_one({"id": new_id(), "session_id": sid, "owner": s["owner"], "role": "counselor", "text": body.text, "created_at": now_iso()})
        await db.talk_sessions.update_one({"id": sid}, {"$set": {"handover": "active", "updated_at": now_iso()}})
        await audit(m, "reply_session", sid)
        return {"ok": True}

    @r.patch("/counsel/sessions/{sid}/close")
    async def counsel_close(sid: str, m: dict = Depends(counsel_staff)):
        await db.talk_sessions.update_one({"id": sid}, {"$set": {"handover": "closed", "handled": True}})
        await audit(m, "close_session", sid)
        return {"ok": True}

    @r.get("/admin/audit")
    async def audit_log(m: dict = Depends(admin_only)):
        return await db.audit.find({}, {"_id": 0}).sort("at", -1).to_list(300)

    return r, run_discovery
