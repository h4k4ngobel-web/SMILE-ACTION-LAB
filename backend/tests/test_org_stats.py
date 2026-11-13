import asyncio
from types import SimpleNamespace

from backend import server


def test_org_stats_counts_only_verified_rows_and_merges_legacy_provinces(monkeypatch):
    rows = [
        {"_id": "Banten", "count": 2},
        {"_id": "Jakarta Raya", "count": 1},
        {"_id": "DKI Jakarta", "count": 3},
        {"_id": "Yogyakarta", "count": 1},
    ]

    class Cursor:
        async def to_list(self, limit):
            assert limit == 100
            return rows

    class Collection:
        def aggregate(self, pipeline):
            assert pipeline == [
                {"$match": {"status": "verified"}},
                {"$group": {"_id": "$province", "count": {"$sum": 1}}},
            ]
            return Cursor()

    monkeypatch.setattr(server, "db", SimpleNamespace(orgs=Collection()))

    result = asyncio.run(server.org_stats_by_province())

    assert result == {"Banten": 2, "DKI Jakarta": 4, "DI Yogyakarta": 1}
