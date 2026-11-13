# Helper: obtain Clerk session tokens for test users via Clerk Backend API (secret never printed)
import os
import time
import requests
from dotenv import dotenv_values

_SK = dotenv_values("/app/backend/.env").get("CLERK_SECRET_KEY")
API = "https://api.clerk.com/v1"
H = {"Authorization": f"Bearer {_SK}", "User-Agent": "emergent-test-agent", "Content-Type": "application/json"}

ADMIN_EMAIL = "testadmin+clerk_test@example.com"
MEMBER_EMAIL = "testmember+clerk_test@example.com"

_sessions = {}
_cache = {}


def user_id_for(email):
    r = requests.get(f"{API}/users", params={"email_address": email}, headers=H, timeout=15)
    r.raise_for_status()
    data = r.json()
    return data[0]["id"] if data else None


def token_for(email):
    now = time.time()
    if email in _cache and now - _cache[email][1] < 40:
        return _cache[email][0]
    if email not in _sessions:
        uid = user_id_for(email)
        if not uid:
            return None
        r = requests.post(f"{API}/sessions", json={"user_id": uid}, headers=H, timeout=15)
        r.raise_for_status()
        _sessions[email] = r.json()["id"]
    r = requests.post(f"{API}/sessions/{_sessions[email]}/tokens", json={}, headers=H, timeout=15)
    r.raise_for_status()
    tok = r.json()["jwt"]
    _cache[email] = (tok, now)
    return tok


def sign_in_ticket(email):
    uid = user_id_for(email)
    r = requests.post(f"{API}/sign_in_tokens", json={"user_id": uid, "expires_in_seconds": 600}, headers=H, timeout=15)
    r.raise_for_status()
    return r.json()["token"]


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 2 and sys.argv[1] == "ticket":
        print(sign_in_ticket(sys.argv[2]))
    else:
        for e in (ADMIN_EMAIL, MEMBER_EMAIL):
            print(e, user_id_for(e), bool(token_for(e)))
