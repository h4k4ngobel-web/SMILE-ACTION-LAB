import os
import re
import ipaddress
import logging
import asyncio
import httpx
from html import escape
from html.parser import HTMLParser
from urllib.parse import urlparse
from dotenv import load_dotenv
from fastapi import HTTPException

load_dotenv()
logger = logging.getLogger(__name__)

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ["EMERGENT_EMAIL_KEY"]
EMAIL_FROM_NAME = os.environ["EMAIL_FROM_NAME"]
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO")

_SHORTENERS = ("bit.ly", "tinyurl.com", "t.co", "is.gd", "cutt.ly", "goo.gl", "rebrand.ly")
_CRED_ASK = ("reply with your password", "reply with the code", "send your password", "cvv",
             "send us your password", "enter your password below", "confirm your card number",
             "your full card number", "seed phrase", "recovery phrase", "verify your card",
             "social security number", "confirm your bank details")
_HOSTISH = re.compile(r"\b(?:https?://)?((?:[a-z0-9-]+\.)+[a-z]{2,})", re.I)


def _host_ok(host: str) -> bool:
    if not host or "xn--" in host:
        return False
    try:
        ipaddress.ip_address(host)
        return False
    except ValueError:
        pass
    return not any(host == s or host.endswith("." + s) for s in _SHORTENERS)


def _same_site(shown: str, real: str) -> bool:
    return shown == real or real.endswith("." + shown) or shown.endswith("." + real)


class _EmailScan(HTMLParser):
    def __init__(self):
        super().__init__()
        self.tags, self.urls, self.anchors = set(), [], []
        self._href, self._text = None, []

    def handle_starttag(self, tag, attrs):
        self.tags.add(tag.lower())
        self.urls += [v for k, v in attrs if k.lower() in ("href", "src") and v]
        if tag.lower() == "a":
            self._href = dict((k.lower(), v) for k, v in attrs).get("href")
            self._text = []

    def handle_data(self, data):
        if self._href is not None:
            self._text.append(data)

    def handle_endtag(self, tag):
        if tag.lower() == "a" and self._href is not None:
            self.anchors.append((self._href, "".join(self._text)))
            self._href, self._text = None, []


def _assert_safe_email(subject: str, html: str) -> None:
    scan = _EmailScan(); scan.feed(html)
    if scan.tags & {"form", "input", "textarea", "select"}:
        raise ValueError("No forms or input fields in email (G2)")
    body = f"{subject}\n{html}".lower()
    for p in _CRED_ASK:
        if p in body:
            raise ValueError(f"Email asks the recipient for credentials: {p!r} (G2)")
    for url in scan.urls:
        low = url.strip().lower()
        if low.startswith(("mailto:", "tel:", "cid:", "#")):
            continue
        if not low.startswith("https://"):
            raise ValueError(f"Email links/assets must be absolute https: {url!r} (G3)")
        host = urlparse(low).hostname or ""
        if not _host_ok(host) or urlparse(low).username is not None:
            raise ValueError(f"Shortened, numeric-host or credential-bearing URL: {url!r} (G3)")
    for href, text in scan.anchors:
        real = urlparse(href.strip().lower()).hostname or ""
        if not real:
            continue
        for m in _HOSTISH.finditer(text):
            if not _same_site(m.group(1).lower(), real):
                raise ValueError(f"Anchor text {m.group(1)!r} ≠ real link host {real!r} (G3)")


async def send_email(*, to: str, subject: str, html: str, reply_to: str | None = None) -> str | None:
    _assert_safe_email(subject, html)
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to or EMAIL_REPLY_TO:
        payload["contact_email"] = reply_to or EMAIL_REPLY_TO
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                                     headers={"X-Email-Key": EMAIL_KEY}, json=payload)
        resp.raise_for_status()
        return resp.json().get("id")
    except httpx.HTTPStatusError as e:
        try:
            code = e.response.json().get("code", "")
        except ValueError:
            code = ""
        if code in ("insufficient_credits", "integration_disabled", "daily_limit_reached"):
            logger.warning(f"Email paused: {code} ({e.response.status_code}): {e.response.json().get('message', '')}")
            raise HTTPException(status_code=503, detail="Email is temporarily unavailable")
        logger.error(f"Email send failed: {e.response.status_code} {e.response.text}")
        raise HTTPException(status_code=502, detail="Failed to send email")
    except Exception as e:
        logger.error(f"Email send error: {str(e)}")
        raise HTTPException(status_code=500, detail="Failed to send email")


def _wrap(title: str, body_html: str) -> str:
    return (f'<table role="presentation" width="100%" style="background:#F5F0FF"><tr><td style="padding:24px;'
            f'font-family:Arial,sans-serif;color:#19264C">'
            f'<h2 style="color:#7552D6;margin:0 0 12px">{escape(title)}</h2>{body_html}'
            f'<p style="font-size:12px;color:#68748C;margin-top:24px">Dikirim oleh {escape(EMAIL_FROM_NAME)} - '
            f'We Listen. We Care. We Guide. Kami tidak pernah meminta kata sandi Anda lewat email.</p>'
            f'</td></tr></table>')


def fire(to: str, subject: str, title: str, body_html: str) -> None:
    """Send in background; failures are logged, never block the request."""
    async def _run():
        try:
            await send_email(to=to, subject=subject, html=_wrap(title, body_html))
        except Exception as exc:
            logger.warning("email to %s failed: %s", to, exc)
    if to:
        asyncio.create_task(_run())


def event_registration(to: str, name: str, event: dict) -> None:
    body = (f'<p>Halo {escape(name or "Sahabat SMILE")},</p>'
            f'<p>Pendaftaranmu untuk <strong>{escape(event["title"])}</strong> sudah kami terima.</p>'
            f'<p>Tanggal: {escape(event.get("date", ""))}<br>Lokasi: {escape(event.get("location", ""))}</p>'
            f'<p>Sampai jumpa di acara, ya!</p>')
    fire(to, f'Pendaftaran event dikonfirmasi: {event["title"]}', "Pendaftaran Berhasil", body)


def org_status(to: str, org: dict) -> None:
    ok = org["status"] == "verified"
    msgs = {"verified": "selamat, organisasimu kini <strong>terverifikasi</strong> dan tampil di direktori PIK-R Hub.",
            "rejected": "mohon maaf, pengajuan organisasimu <strong>belum dapat diverifikasi</strong>.",
            "needs_correction": "pengajuan organisasimu <strong>perlu diperbaiki</strong>. Buka Dashboard SMILE ACTION LAB untuk memperbaikinya tanpa mengulang dari awal.",
            "suspended": "status organisasimu di direktori <strong>ditangguhkan sementara</strong>."}
    msg = msgs.get(org["status"], "") if not ok else msgs["verified"]
    note = f'<p>Catatan admin: {escape(org.get("admin_note") or "-")}</p>'
    fire(to, f'Status verifikasi PIK-R: {org["name"]}', "Status Verifikasi PIK-R",
         f'<p>Halo pengurus {escape(org["name"])}, {msg}</p>{note}')


def urgent_alert(session_id: str) -> None:
    body = (f'<p>SMILE TALK menandai sesi prioritas {escape(session_id[:8])}.</p>'
            f'<p>Silakan buka antrean konseling di Dashboard untuk menindaklanjuti. '
            f'Isi percakapan tidak disertakan dalam email ini.</p>')
    for to in [e.strip() for e in os.environ.get("ADMIN_EMAIL", "").split(",") if e.strip()]:
        fire(to, "Kasus mendesak di SMILE TALK", "Peringatan Kasus Mendesak", body)
