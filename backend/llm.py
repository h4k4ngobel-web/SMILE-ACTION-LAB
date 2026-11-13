import asyncio
import os
import re
from urllib.parse import quote_plus

from fastapi import HTTPException

try:
    from emergentintegrations.llm.chat import LlmChat, StreamDone, TextDelta, UserMessage
except ModuleNotFoundError as exc:
    if exc.name != "emergentintegrations":
        raise
    LlmChat = StreamDone = TextDelta = UserMessage = None


def get_chat_types():
    if LlmChat is None:
        raise HTTPException(status_code=503, detail="Paket AI admin belum terpasang")

    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise HTTPException(status_code=503, detail="AI untuk draf admin belum dikonfigurasi")

    return LlmChat, UserMessage, TextDelta, StreamDone, api_key


def gemini_available() -> bool:
    if not os.environ.get("GEMINI_API_KEY", "").strip():
        return False
    try:
        __import__("google.genai")
    except ModuleNotFoundError:
        return False
    return True


def local_reply(
    message: str,
    docs: list[dict] | None = None,
    flagged: bool = False,
    history: list[dict] | None = None,
) -> str:
    if flagged:
        return (
            "Terima kasih sudah memberi tahu. Keselamatanmu yang utama. Jika kamu merasa "
            "sedang dalam bahaya atau mungkin menyakiti diri, segera dekati orang yang "
            "kamu percaya dan minta ia menemanimu. Hubungi layanan darurat setempat "
            "(112 bila aktif di daerahmu; SEJIWA 119 ext 8 atau SAPA 129 untuk kekerasan "
            "terhadap perempuan dan anak). Percakapan ini juga dapat masuk antrean "
            "prioritas lewat tombol **Hubungkan ke konselor**, tetapi tim tidak selalu "
            "siaga 24 jam. Jangan menunggu balasan jika bahaya sedang terjadi."
        )

    text = message.lower()
    docs = docs or []
    history = history or []
    citation = " [1]" if docs else ""

    if history and len(message.split()) <= 8 and any(word in text for word in ("itu", "maksud", "contoh", "jelasin", "lanjut")):
        previous = next((item.get("text", "") for item in reversed(history) if item.get("role") == "assistant"), "")
        if previous:
            excerpt = re.sub(r"\s+", " ", previous).strip()[:320]
            return f"Maksudku, {excerpt} Kita bisa memakai contoh sehari-hari agar lebih jelas."

    if any(word in text for word in ("cemas", "overthinking", "takut")):
        return (
            "Pikiranmu terdengar sedang dipenuhi banyak kemungkinan. Kita bisa mulai "
            "dari satu hal yang masih bisa kamu kendalikan hari ini. Apa yang paling "
            "membuatmu cemas saat ini? Dari situ kita cari langkah kecil yang terasa mungkin."
        )
    if any(word in text for word in ("capek", "sedih", "stres", "bingung")):
        return (
            "Kedengarannya banyak hal sedang terasa menumpuk. Kita tidak perlu "
            "menyelesaikan semuanya sekaligus. Bagian mana yang paling berat untukmu "
            "sekarang? Setelah itu, kita bisa mencari satu langkah kecil yang realistis."
        )
    if any(word in text for word in ("hiv", "aids")):
        return (
            "HIV adalah virus yang menyerang sistem kekebalan tubuh; AIDS adalah kondisi "
            "yang dapat berkembang bila HIV tidak ditangani. HIV tidak menular lewat "
            "pelukan atau berbagi alat makan. Untuk informasi atau pemeriksaan pribadi, "
            f"tenaga kesehatan dapat memberi penjelasan sesuai kebutuhanmu{citation}. "
            "Bagian mana yang ingin kamu pahami lebih dulu: penularan, pencegahan, atau akses tes?"
        )
    if any(word in text for word in ("napza", "narkoba", "rokok", "vape", "alkohol")):
        return (
            "Jika ada yang menawari rokok, vape, alkohol, atau zat lain, kamu berhak "
            "menolak tanpa perlu memberi penjelasan panjang. Kamu bisa mengatakan, "
            "“Aku tidak mau. Tolong hormati keputusanku.” Jika tekanan berlanjut, "
            f"cari tempat aman dan dukungan orang yang kamu percaya{citation}. "
            "Apakah tekanan ini sedang terjadi sekarang?"
        )
    if any(word in text for word in ("batas", "pacar", "hubungan", "setuju", "izin", "consent")):
        return (
            "Persetujuan perlu diberikan dengan bebas dan bisa berubah kapan saja. "
            "Tekanan, ancaman, atau rasa takut bukan persetujuan. Kamu berhak menetapkan "
            f"batas dan mencari dukungan dari orang yang kamu percaya{citation}. "
            "Kita bisa membahas batas yang sedang membuatmu tidak nyaman."
        )
    if any(word in text for word in ("genre", "pik-r", "pikr", "remaja")):
        return (
            "GenRe membantu remaja menyiapkan masa depan melalui informasi, keterampilan, "
            f"dan perencanaan yang sesuai kebutuhan. PIK-R dapat menjadi ruang belajar "
            f"dan berdiskusi dengan teman sebaya{citation}. Bagian mana yang ingin kamu "
            "hubungkan dengan rencanamu?"
        )
    if any(word in text for word in ("uang", "menabung", "anggaran", "keuangan")):
        return (
            "Sebagai langkah awal, catat pemasukan dan pengeluaran, dahulukan kebutuhan, "
            "lalu tetapkan target tabungan yang realistis. Jangan mengambil produk "
            f"keuangan yang belum kamu pahami{citation}. Kita bisa menyusun contoh "
            "anggaran sederhana jika itu membantu."
        )

    if docs:
        doc = docs[0]
        summary = re.sub(r"\s+", " ", doc.get("summary", "")).strip()
        if not summary:
            summary = re.sub(r"\s+", " ", doc.get("content", "")).strip()[:320]
        if summary:
            return (
                f"Materi **{doc['title']}** menjelaskan bahwa {summary}{citation} "
                "Dari bagian ini, apa yang paling dekat dengan situasimu? Kita bisa "
                "mengubahnya menjadi satu langkah yang sesuai untukmu."
            )

    return (
        "Aku belum menemukan rujukan yang cukup untuk menjawab bagian itu dengan yakin, "
        "jadi aku tidak ingin menebak. Kalau kamu nyaman, ceritakan tujuan yang ingin "
        "kamu capai atau bagian yang paling membingungkan; kita bisa memilah pilihan "
        "dan menentukan langkah berikutnya bersama."
    )


def video_recommendations(message: str) -> list[dict]:
    text = message.lower()
    topics = [
        (("mental", "cemas", "stres", "sedih", "overthinking"), "Kesehatan mental remaja", "WHO adolescent mental health official"),
        (("hiv", "aids", "seksualitas", "reproduksi"), "Kesehatan remaja", "WHO adolescent sexual health education"),
        (("napza", "narkoba", "rokok", "vape"), "Pencegahan NAPZA", "Kemenkes RI edukasi remaja NAPZA"),
        (("uang", "menabung", "anggaran", "keuangan"), "Literasi keuangan", "OJK edukasi keuangan remaja"),
        (("keluarga", "orang tua", "orangtua", "komunikasi"), "Komunikasi keluarga", "UNICEF Indonesia komunikasi remaja"),
        (("genre", "pik-r", "pikr", "karier", "masa depan"), "Perencanaan masa depan remaja", "GenRe Indonesia perencanaan remaja"),
    ]
    for words, title, query in topics:
        if any(word in text for word in words):
            return [{
                "title": f"Cari video: {title}",
                "url": f"https://www.youtube.com/results?search_query={quote_plus(query)}",
                "note": "Pilih video dari kanal resmi lembaga yang disebut.",
            }]
    return []


def _generate_gemini_reply(message: str, knowledge: str, system_prompt: str) -> str:
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("Gemini belum dikonfigurasi")

    from google import genai

    client = genai.Client(api_key=api_key)
    prompt = (
        "Pesan remaja yang diizinkan untuk diproses: \n"
        f"{message}\n\n"
        "Materi edukasi publik yang boleh dipakai sebagai rujukan:\n"
        f"{knowledge or '(Tidak ada materi yang cocok.)'}\n\n"
        "Jangan menganggap riwayat percakapan tersedia. Jangan mengarang fakta atau tautan."
    )
    response = client.models.generate_content(
        model=os.environ.get("GEMINI_MODEL", "gemini-2.5-flash"),
        contents=prompt,
        config={
            "system_instruction": system_prompt,
            "temperature": 0.5,
            "max_output_tokens": 500,
        },
    )
    answer = (response.text or "").strip()
    if not answer:
        raise RuntimeError("Gemini tidak menghasilkan jawaban")
    return answer


async def generate_gemini_reply(message: str, knowledge: str, system_prompt: str) -> str:
    return await asyncio.to_thread(_generate_gemini_reply, message, knowledge, system_prompt)
