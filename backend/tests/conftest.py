import os
import sys
import pytest
import requests
from dotenv import dotenv_values

sys.path.insert(0, os.path.dirname(__file__))
from clerk_tokens import token_for, ADMIN_EMAIL, MEMBER_EMAIL  # noqa: E402

BASE_URL = (os.environ.get("REACT_APP_BACKEND_URL") or dotenv_values("/app/frontend/.env")["REACT_APP_BACKEND_URL"]).rstrip("/")


class Client:
    """requests wrapper that injects a fresh Clerk token per request"""

    def __init__(self, email=None):
        self.email = email
        self.s = requests.Session()

    def _h(self, kw):
        h = kw.pop("headers", {}) or {}
        if self.email:
            h["Authorization"] = f"Bearer {token_for(self.email)}"
        kw["headers"] = h
        kw.setdefault("timeout", 60)
        return kw

    def get(self, p, **kw):
        return self.s.get(BASE_URL + p, **self._h(kw))

    def post(self, p, **kw):
        return self.s.post(BASE_URL + p, **self._h(kw))

    def put(self, p, **kw):
        return self.s.put(BASE_URL + p, **self._h(kw))

    def patch(self, p, **kw):
        return self.s.patch(BASE_URL + p, **self._h(kw))

    def delete(self, p, **kw):
        return self.s.delete(BASE_URL + p, **self._h(kw))


@pytest.fixture(scope="session")
def anon():
    return Client()


@pytest.fixture(scope="session")
def admin():
    c = Client(ADMIN_EMAIL)
    r = c.get("/api/me")
    if r.status_code != 200 or r.json().get("role") != "admin":
        pytest.skip(f"admin not available: {r.status_code} {r.text[:200]}")
    return c


@pytest.fixture(scope="session")
def member():
    c = Client(MEMBER_EMAIL)
    r = c.get("/api/me")
    if r.status_code != 200:
        pytest.skip(f"member not available: {r.status_code}")
    return c
