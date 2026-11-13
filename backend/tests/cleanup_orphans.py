# One-off: delete orphan community post created by the failed test run (own record, by id)
from conftest import Client
from clerk_tokens import MEMBER_EMAIL

m = Client(MEMBER_EMAIL)
for p in m.get("/api/community").json():
    if p.get("mine") and p["text"] == "TEST_cerita anonim saya":
        print("deleting", p["id"], m.delete(f"/api/community/{p['id']}").status_code)
