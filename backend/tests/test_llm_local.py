from backend import llm


def test_local_reply_uses_learning_material_and_context():
    docs = [{"title": "GenRe", "summary": "GenRe membantu remaja merencanakan masa depan."}]
    first = llm.local_reply("Apa itu GenRe?", docs)
    follow_up = llm.local_reply("Bisa kasih contoh?", docs, history=[{"role": "assistant", "text": first}])

    assert "[1]" in first
    assert "GenRe" in first
    assert "contoh" in follow_up
    assert "GenRe" in follow_up


def test_distress_reply_uses_calm_professional_language():
    text = llm.local_reply("Aku lagi sedih dan stres soal sekolah")

    assert "langkah kecil" in text
    assert "gak" not in text.lower()
    assert "Bagian mana" in text


def test_anxiety_reply_helps_choose_a_realistic_next_step():
    text = llm.local_reply("Aku cemas banget menghadapi ujian")

    assert "bisa kamu kendalikan" in text
    assert "Apa yang paling membuatmu cemas" in text
    assert "langkah kecil" in text


def test_priority_reply_does_not_depend_on_an_external_provider():
    text = llm.local_reply("aku ingin mati", flagged=True)

    assert "antrean prioritas" in text
    assert "jangan menunggu" in text.lower()


def test_gemini_is_not_advertised_without_a_backend_key(monkeypatch):
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)

    assert llm.gemini_available() is False


def test_video_recommendation_uses_a_generic_official_search():
    items = llm.video_recommendations("Aku lagi stres dan cemas")

    assert len(items) == 1
    assert "WHO" in items[0]["url"]
    assert "stres dan cemas" not in items[0]["url"]


def test_gemini_receives_only_the_current_message_and_public_material(monkeypatch):
    sent = {}

    class FakeResponse:
        text = "Kita bisa mulai dari satu langkah kecil."

    class FakeModels:
        def generate_content(self, **kwargs):
            sent.update(kwargs)
            return FakeResponse()

    class FakeClient:
        def __init__(self, api_key):
            self.models = FakeModels()

    from google import genai

    monkeypatch.setattr(genai, "Client", FakeClient)
    monkeypatch.setenv("GEMINI_API_KEY", "test-key")
    answer = llm._generate_gemini_reply(
        "Pesan saat ini",
        "[1] Materi publik",
        "Aturan sistem",
    )

    assert answer == "Kita bisa mulai dari satu langkah kecil."
    assert "Pesan saat ini" in sent["contents"]
    assert "Materi publik" in sent["contents"]
    assert "riwayat" in sent["contents"].lower()
    assert sent["config"]["system_instruction"] == "Aturan sistem"
