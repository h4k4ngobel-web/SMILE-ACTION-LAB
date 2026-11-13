import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Clock, FolderOpen, FileText, ExternalLink } from "lucide-react";
import { useApi } from "@/lib/api";
import { PageHeader, EmptyState, Loading } from "@/components/common";
import { SmiloCover, Smilo } from "@/components/brand/Smilo";

const TRACK_COLORS = ["#7552D6", "#FFA24A", "#4FC6B0", "#F08B8A", "#E0B43C", "#5B8DEF", "#19264C"];

export const Discovery = () => {
  const api = useApi();
  const [tracks, setTracks] = useState([]);
  const [active, setActive] = useState(0);
  useEffect(() => { api.get("/curriculum").then((r) => setTracks(r.data)).catch(() => {}); }, [api]);
  if (!tracks.length) return null;
  const t = tracks[active];
  const ready = t.topics.filter((x) => x.post_id).length;
  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]" data-testid="discovery-map">
      <div className="flex gap-2 overflow-x-auto pb-2 lg:flex-col lg:overflow-visible">
        {tracks.map((x, i) => (
          <button key={x.code} onClick={() => setActive(i)} data-testid={`discovery-track-${x.code}`}
            className={`flex shrink-0 items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-bold transition-transform ${i === active ? "scale-[1.02] text-white shadow-lg" : "bg-white hover:translate-x-1"}`}
            style={i === active ? { background: TRACK_COLORS[i] } : {}}>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/25 font-display" style={i === active ? {} : { color: TRACK_COLORS[i], background: "#F5F0FF" }}>{x.code}</span>{x.name}
          </button>
        ))}
      </div>
      <div className="sal-card relative overflow-hidden p-6 md:p-8">
        <p className="sal-eyebrow" style={{ color: TRACK_COLORS[active] }}>Jalur {t.code}</p>
        <h3 className="mt-1 text-3xl font-bold">{t.name}</h3>
        <p className="mt-1 text-sm text-[#68748C]">{ready} dari {t.topics.length} modul sudah tersedia. Modul lain sedang disusun dan ditinjau tim editor.</p>
        <div className="mt-3 h-2 w-full max-w-sm overflow-hidden rounded-full bg-[#F5F0FF]"><div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${(ready / t.topics.length) * 100}%`, background: TRACK_COLORS[active] }} /></div>
        <div className="mt-6 flex flex-wrap gap-2">
          {t.topics.map((x) => x.post_id ? (
            <Link key={x.topic} to={`/learn/${x.post_id}`} className="rounded-full border-2 px-4 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5" style={{ borderColor: TRACK_COLORS[active], color: TRACK_COLORS[active] }} data-testid="discovery-topic-ready">{x.topic}</Link>
          ) : (
            <span key={x.topic} className="rounded-full border-2 border-dashed border-[#E2DCF5] px-4 py-2 text-sm text-[#68748C]" title="Segera hadir">{x.topic}</span>
          ))}
        </div>
        <Smilo pose="think" className="absolute -bottom-4 -right-2 hidden h-28 opacity-90 md:block" />
      </div>
    </div>
  );
};

const CATS = ["Semua", "GenRe", "TRIAD KRR", "Keluarga", "Life Planning", "Pengembangan Diri", "Kesehatan", "Kesehatan Mental", "Kesehatan Remaja", "Life Skills"];

export const PostCard = ({ p, base = "/learn" }) => (
  <Link to={`${base}/${p.id}`} className="sal-card sal-lift group overflow-hidden" data-testid={`post-card-${p.id}`}>
    <SmiloCover pose={p.cover} className="h-40" />
    <div className="p-5">
      <span className="sal-pill bg-[#F5F0FF] text-[#7552D6]">{p.category}</span>
      <h3 className="mt-3 text-lg font-bold leading-snug group-hover:text-[#7552D6]">{p.title}</h3>
      <p className="mt-1.5 line-clamp-2 text-sm text-[#68748C]">{p.summary}</p>
      <p className="mt-3 flex items-center gap-1 text-xs text-[#68748C]"><Clock className="h-3.5 w-3.5" />{p.read_min} menit baca</p>
    </div>
  </Link>
);

export const Resources = () => {
  const api = useApi();
  const [r, setR] = useState(null);
  useEffect(() => { api.get("/resources").then((x) => setR(x.data)).catch(() => {}); }, [api]);
  if (!r) return null;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <a href={r.drive} target="_blank" rel="noreferrer" className="sal-card sal-lift flex items-center gap-4 p-5" data-testid="resource-drive-link">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#E3F7F2] text-[#2BA58E]"><FolderOpen className="h-6 w-6" /></div>
        <div className="flex-1"><p className="font-bold">Folder Materi PIK-R</p><p className="text-sm text-[#68748C]">Kumpulan materi lengkap di Google Drive</p></div>
        <ExternalLink className="h-4 w-4 text-[#68748C]" />
      </a>
      <a href={r.ebook} target="_blank" rel="noreferrer" className="sal-card sal-lift flex items-center gap-4 p-5" data-testid="resource-ebook-link">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#FFF4DC] text-[#E08A2E]"><FileText className="h-6 w-6" /></div>
        <div className="flex-1"><p className="font-bold">E-Book Himpunan Materi GenRe</p><p className="text-sm text-[#68748C]">PDF · baca atau unduh</p></div>
        <ExternalLink className="h-4 w-4 text-[#68748C]" />
      </a>
    </div>
  );
};

export default function Learn() {
  const api = useApi();
  const [cat, setCat] = useState("Semua");
  const [q, setQ] = useState("");
  const [items, setItems] = useState(null);
  useEffect(() => {
    const t = setTimeout(() => {
      api.get("/posts", { params: { kind: "learn", category: cat === "Semua" ? "" : cat, q } }).then((r) => setItems(r.data)).catch(() => setItems([]));
    }, 250);
    return () => clearTimeout(t);
  }, [api, cat, q]);
  return (
    <div className="sal-page-illustrated sal-art-learn" data-testid="learn-page">
      <PageHeader eyebrow="Smile Learn" title="Belajar GenRe jadi lebih seru!" subtitle="Ikuti komik bergambar bersama Alya, Raka, dan SMILO, lalu buka penjelasan lengkap dan aktivitas belajarnya." pose="read" art="learn">
        <div className="flex max-w-md items-center gap-2 rounded-full border border-[#EDE6FF] bg-white px-4 py-2.5">
          <Search className="h-4 w-4 text-[#68748C]" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari materi..." className="flex-1 bg-transparent text-sm outline-none" data-testid="learn-search-input" />
        </div>
      </PageHeader>
      <div className="sal-container mt-8">
        <div className="flex flex-wrap gap-2">
          {CATS.map((c) => (
            <button key={c} onClick={() => setCat(c)} data-testid={`learn-cat-${c.toLowerCase().replace(/\s/g, "-")}`}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${cat === c ? "bg-[#7552D6] text-white" : "bg-white text-[#19264C] hover:bg-[#F5F0FF]"}`}>{c}</button>
          ))}
        </div>
        <div className="mt-8">
          {items === null ? <Loading /> : items.length === 0 ? (
            <EmptyState title="Materi belum ditemukan" text="Coba kata kunci atau kategori lain, ya." />
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{items.map((p) => <PostCard key={p.id} p={p} />)}</div>
          )}
        </div>
        <h2 className="mb-4 mt-16 text-2xl font-bold">SMILE Discovery: peta kurikulum</h2>
        <Discovery />
        <h2 className="mb-4 mt-16 text-2xl font-bold">Sumber belajar tambahan</h2>
        <Resources />
      </div>
    </div>
  );
}
