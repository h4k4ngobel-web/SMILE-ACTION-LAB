from backend.seed_data import LEARN


EXPECTED_MODULES = {
    "jaga-kesehatan-mental-remaja",
    "temani-teman-yang-sedang-berat",
    "hubungan-sehat-dan-batas-diri",
    "literasi-keuangan-pelajar",
    "rencana-kuliah-karier-langkah-kecil",
    "komunikasi-hangat-dengan-keluarga",
}


def test_new_learning_modules_include_interactive_activity_and_references():
    modules = {item["slug"]: item for item in LEARN if item["slug"] in EXPECTED_MODULES}

    assert set(modules) == EXPECTED_MODULES
    for module in modules.values():
        assert module["activities"]
        assert len(module["activities"][0]["options"]) >= 2
        assert len(module["activities"][0]["feedback"]) == len(module["activities"][0]["options"])
        assert module["references"]
        assert all(ref["url"].startswith("https://") for ref in module["references"])
