import asyncio
import os
import sys
import uuid
from datetime import datetime, timezone

sys.path.insert(0, "/app/backend")
from dotenv import load_dotenv
load_dotenv("/app/backend/.env")
from motor.motor_asyncio import AsyncIOMotorClient
from studio import write_module

TOPICS = [
    ("Definisi dan filosofi GenRe", "GenRe"), ("PIK-R", "GenRe"), ("Konselor sebaya", "GenRe"), ("Pendidik sebaya", "GenRe"),
    ("Pendewasaan Usia Perkawinan", "Life Planning"), ("8 fungsi keluarga", "Keluarga"), ("Pencegahan perkawinan anak", "Life Planning"),
    ("Pendidikan seksualitas", "TRIAD KRR"), ("Edukasi HIV/AIDS", "TRIAD KRR"), ("Pencegahan penyalahgunaan NAPZA", "TRIAD KRR"),
    ("Pubertas", "Kesehatan"), ("Kesejahteraan mental", "Kesehatan"), ("Manajemen stres", "Kesehatan"), ("Hubungan yang sehat", "Pengembangan Diri"),
    ("Batasan pribadi", "Pengembangan Diri"), ("Pengambilan keputusan", "Life Skills"), ("Komunikasi efektif", "Life Skills"), ("Regulasi emosi", "Life Skills"),
    ("Pencegahan perundungan", "Pengembangan Diri"), ("Kesejahteraan digital", "Literasi Digital"), ("Cek fakta dan misinformasi", "Literasi Digital"),
    ("Eksplorasi karier", "Pendidikan & Karier"), ("Literasi keuangan", "Life Skills"), ("Public speaking", "Pendidikan & Karier"),
    ("Cara mendirikan PIK-R", "Pengembangan PIK-R"), ("Rencana kerja tahunan", "Pengembangan PIK-R"), ("Pelaporan", "Pengembangan PIK-R"),
]


async def main():
    db = AsyncIOMotorClient(os.environ["MONGO_URL"])[os.environ["DB_NAME"]]
    now = lambda: datetime.now(timezone.utc).isoformat()
    for topic, cat in TOPICS:
        if await db.posts.find_one({"track": topic, "review_status": "Draf AI - perlu verifikasi"}):
            continue
        try:
            r = await write_module(db, lambda: str(uuid.uuid4()), now, topic, cat, track=topic, author="SMILE AI Draft")
            print(topic, r["words"], flush=True)
        except Exception as exc:
            print("FAIL", topic, exc, flush=True)


asyncio.run(main())
