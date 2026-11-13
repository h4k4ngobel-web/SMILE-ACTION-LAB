import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, MapPin, Users, Clock } from "lucide-react";
import { useApi, fmtDate } from "@/lib/api";
import { PageHeader, Loading, EmptyState } from "@/components/common";
import { SmiloCover } from "@/components/brand/Smilo";
import { PostCard } from "@/pages/Learn";
import { PROVINCES } from "@/pages/PikrHub";

export const STATUS_TONE = {
  "Pendaftaran dibuka": "bg-[#E3F7F2] text-[#2BA58E]", "Akan datang": "bg-[#F5F0FF] text-[#7552D6]", "Berlangsung": "bg-[#FFF4DC] text-[#E08A2E]",
  "Selesai": "bg-[#F1F1F5] text-[#68748C]", "Dibatalkan": "bg-[#FDE7E7] text-[#D86A68]", "Belum terverifikasi": "bg-[#FDE7E7] text-[#D86A68]",
};
export const EVENT_TYPES = ["Webinar", "Workshop", "Pelatihan", "Konferensi", "Lomba", "Beasiswa", "Relawan", "Kampanye", "Program pemerintah"];
const LEVELS = ["Semua", "SMP", "SMA/SMK", "Mahasiswa", "Umum"];

export const EventCard = ({ e }) => (
  <Link to={`/events/${e.id}`} className="sal-card sal-lift group grid overflow-hidden sm:grid-cols-[150px_1fr]" data-testid={`event-card-${e.id}`}>
    <SmiloCover pose={e.cover} className="h-32 sm:h-full" />
    <div className="p-5">
      <div className="flex flex-wrap gap-2">
        <span className={`sal-pill ${STATUS_TONE[e.status]}`} data-testid="event-status">{e.status}</span>
        <span className="sal-pill bg-[#FFF4DC] text-[#E08A2E]">{e.event_type || "Event"} · {e.mode}</span>
      </div>
      <h3 className="mt-3 text-lg font-bold leading-snug group-hover:text-[#7552D6]">{e.title}</h3>
      <p className="mt-1 text-xs font-semibold text-[#68748C]">{e.organizer}</p>
      <p className="mt-2 flex items-center gap-1.5 text-sm text-[#68748C]"><CalendarDays className="h-4 w-4" />{fmtDate(e.date)} {e.time && `· ${e.time}`}</p>
      <p className="mt-1 flex items-center gap-1.5 text-sm text-[#68748C]"><MapPin className="h-4 w-4" />{e.location} · {e.province}</p>
      {e.reg_deadline && <p className="mt-1 flex items-center gap-1.5 text-xs text-[#68748C]"><Clock className="h-3.5 w-3.5" />Batas daftar {fmtDate(e.reg_deadline)}</p>}
    </div>
  </Link>
);

const Filters = ({ f, setF }) => {
  const s = "rounded-full border border-[#EDE6FF] bg-white px-4 py-2 text-sm";
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <div className="flex flex-wrap gap-2" data-testid="event-filters">
      <select value={f.province} onChange={set("province")} className={s} data-testid="event-filter-province"><option value="">Semua provinsi</option><option>Nasional</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select>
      <select value={f.mode} onChange={set("mode")} className={s} data-testid="event-filter-mode"><option value="">Online & offline</option><option>Online</option><option>Offline</option><option>Hybrid</option></select>
      <select value={f.event_type} onChange={set("event_type")} className={s} data-testid="event-filter-type"><option value="">Semua jenis</option>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select>
      <select value={f.education_level} onChange={set("education_level")} className={s} data-testid="event-filter-level"><option value="">Semua jenjang</option>{LEVELS.map((t) => <option key={t}>{t}</option>)}</select>
      <select value={f.status} onChange={set("status")} className={s} data-testid="event-filter-status"><option value="">Semua status</option>{["Pendaftaran dibuka", "Akan datang", "Berlangsung", "Selesai", "Dibatalkan"].map((t) => <option key={t}>{t}</option>)}</select>
    </div>
  );
};

const NewsCard = ({ p }) => (
  <Link to={`/update/${p.id}`} className="sal-card sal-lift group block p-5" data-testid={`news-card-${p.id}`}>
    <div className="flex flex-wrap gap-2">
      <span className="sal-pill bg-[#FDE7E7] text-[#D86A68]">{p.category}</span>
      {p.review_status === "Ringkasan impor" && <span className="sal-pill bg-[#EAF5FF] text-[#3A7BC8]">Ringkasan</span>}
    </div>
    <h3 className="mt-3 text-lg font-bold leading-snug group-hover:text-[#7552D6]">{p.title}</h3>
    <p className="mt-1.5 line-clamp-3 text-sm text-[#68748C]">{p.summary}</p>
    <p className="mt-3 text-xs font-semibold text-[#19264C]">{p.source_name || "SMILE ACTION LAB"} · {p.original_date || fmtDate(p.created_at)}</p>
  </Link>
);

export default function Update() {
  const api = useApi();
  const [news, setNews] = useState(null);
  const [events, setEvents] = useState(null);
  const [f, setF] = useState({ province: "", mode: "", event_type: "", education_level: "", status: "" });
  useEffect(() => { api.get("/posts", { params: { kind: "news" } }).then((r) => setNews(r.data)).catch(() => setNews([])); }, [api]);
  useEffect(() => { api.get("/events", { params: f }).then((r) => setEvents(r.data)).catch(() => setEvents([])); }, [api, f]);
  const [feat, ...rest] = news || [];
  return (
    <div className="sal-page-illustrated sal-art-update" data-testid="update-page">
      <PageHeader eyebrow="Smile Update" title="Kabar terverifikasi & peluang untukmu" subtitle="Setiap berita dan event berasal dari sumber yang bisa ditelusuri, lengkap dengan tanggal terbit aslinya." pose="invite" art="update" />
      <div className="sal-container mt-10">
        {news === null ? <Loading /> : news.length === 0 ? (
          <EmptyState title="Belum ada berita terverifikasi" text="Tim editor sedang meninjau kabar dari sumber resmi. Kami tidak menampilkan berita yang belum terverifikasi." />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <Link to={`/update/${feat.id}`} className="sal-card sal-lift group overflow-hidden" data-testid={`news-featured-${feat.id}`}>
              <SmiloCover pose={feat.cover} className="h-56" />
              <div className="p-6">
                <span className="sal-pill bg-[#FDE7E7] text-[#D86A68]">{feat.category}</span>
                <h2 className="mt-3 text-2xl font-bold group-hover:text-[#7552D6]">{feat.title}</h2>
                <p className="mt-2 text-[#68748C]">{feat.summary}</p>
                <p className="mt-3 text-xs font-semibold">{feat.source_name || "SMILE ACTION LAB"} · {feat.original_date || fmtDate(feat.created_at)}</p>
              </div>
            </Link>
            <div className="grid gap-6">{rest.slice(0, 2).map((p) => <NewsCard key={p.id} p={p} />)}</div>
          </div>
        )}
        {rest.length > 2 && <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">{rest.slice(2).map((p) => <NewsCard key={p.id} p={p} />)}</div>}
        <section className="sal-art-panel sal-art-events mt-16 rounded-[32px] p-5 md:p-8">
          <h2 className="mb-2 text-3xl font-bold" id="events">SMILE Opportunities</h2>
          <p className="mb-5 text-sm text-[#68748C]">Event, pelatihan, lomba, dan beasiswa yang sumbernya sudah diverifikasi tim kami.</p>
          <Filters f={f} setF={setF} />
          <div className="mt-6">
            {events === null ? <Loading /> : events.length === 0 ? <EmptyState title="Belum ada peluang terverifikasi" text="Coba ubah filter, atau kembali lagi nanti. Kami hanya menampilkan event dengan sumber resmi." pose="rest" /> : (
              <div className="grid gap-6 md:grid-cols-2">{events.map((e) => <EventCard key={e.id} e={e} />)}</div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
