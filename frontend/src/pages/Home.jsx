import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, CalendarDays, Gamepad2, Heart, MapPin, MessageCircleHeart, Newspaper, Play, Rocket, Users, Zap } from "lucide-react";
import { Smilo, SmiloCover, Sparkle, Cloud, Hills } from "@/components/brand/Smilo";
import { Reveal } from "@/components/common";
import { Discovery } from "@/pages/Learn";
import { useApi, fmtDate } from "@/lib/api";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const INTRO_VIDEO_URL = process.env.REACT_APP_INTRO_VIDEO_URL || "/videos/smile-action-lab-intro.mp4";

const FEATURES = [
  { to: "/talk", icon: MessageCircleHeart, title: "Smile Talk", text: "Cerita apa saja ke SMILO, aman dan bisa anonim.", bg: "#F5F0FF", fg: "#7552D6", pose: "care" },
  { to: "/learn", icon: BookOpen, title: "Smile Learn", text: "Materi GenRe, TRIAD KRR, dan life planning yang mudah dipahami.", bg: "#FFF4DC", fg: "#E08A2E", pose: "read" },
  { to: "/play", icon: Gamepad2, title: "Smile Play", text: "Kuis, Myth or Fact, dan simulasi masa depan berhadiah XP.", bg: "#E3F7F2", fg: "#2BA58E", pose: "play" },
  { to: "/update", icon: Newspaper, title: "Smile Update", text: "Berita, tips, dan event remaja terbaru.", bg: "#FDE7E7", fg: "#D86A68", pose: "invite" },
];

const Hero = () => {
  const [introOpen, setIntroOpen] = useState(false);
  return (
    <>
  <section className="sal-sky sal-art-hero sal-art-home sal-grain relative overflow-hidden">
    <Cloud className="absolute left-[4%] top-10 w-36 opacity-80 sal-drift" />
    <Cloud className="absolute left-[46%] top-6 w-24 opacity-60 sal-drift sal-d2" />
    <Cloud className="absolute right-[6%] top-24 w-32 opacity-80 sal-drift sal-d4" />
    <Sparkle className="absolute left-[44%] top-[38%] h-7 w-7 text-[#FFDA79] sal-twinkle" />
    <Sparkle className="absolute right-[10%] top-[16%] h-5 w-5 text-[#FFA24A] sal-twinkle sal-d3" />
    <div className="sal-container relative grid items-center gap-8 pb-28 pt-12 md:grid-cols-[1.1fr_1fr] md:pt-20">
      <div className="relative z-10">
        <span className="sal-pill sal-rise bg-white text-[#7552D6]" data-testid="hero-badge">
          <Heart className="h-3.5 w-3.5 fill-[#F6B6B5] text-[#F6B6B5]" /> Inovasi Duta GenRe · Untuk remaja se-Indonesia
        </span>
        <h1 className="sal-rise sal-d1 mt-5 text-4xl font-bold leading-[1.05] sm:text-5xl lg:text-6xl" data-testid="hero-title">
          Ceritamu Berarti.<br />Masa Depanmu <span className="text-[#7552D6]">Dimulai</span> <span className="relative inline-block">di Sini.
            <svg viewBox="0 0 200 14" className="absolute -bottom-2 left-0 w-full" aria-hidden="true"><path d="M2 10 Q 100 0 198 9" stroke="#FFA24A" strokeWidth="5" fill="none" strokeLinecap="round" /></svg>
          </span>
        </h1>
        <p className="sal-rise sal-d2 mt-6 max-w-lg text-base text-[#68748C] md:text-lg">
          Ruang aman untuk bercerita, belajar, bermain, dan tumbuh bersama. We listen. We care. We guide. And together we find the smile.
        </p>
        <div className="sal-rise sal-d3 mt-8 flex flex-wrap gap-3">
          <Link to="/talk" className="sal-btn-primary" data-testid="hero-start-btn">Mulai Cerita ke SMILO <ArrowRight className="h-4 w-4" /></Link>
          <Link to="/learn" className="sal-btn-ghost" data-testid="hero-explore-btn">Jelajahi Materi</Link>
          <button type="button" onClick={() => setIntroOpen(true)} className="sal-btn-ghost" data-testid="hero-intro-btn"><Play className="h-4 w-4" />Tonton intro</button>
        </div>
        <div className="sal-rise sal-d4 mt-10 flex flex-wrap gap-3">
          {[[BookOpen, "Belajar", "lebih seru"], [Heart, "Peduli", "lebih dekat"], [Rocket, "Bertumbuh", "bersama"]].map(([I, a, b]) => (
            <div key={a} className="flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 shadow-sm">
              <I className="h-5 w-5 text-[#7552D6]" />
              <div className="text-xs leading-tight"><b className="block text-sm">{a}</b><span className="text-[#68748C]">{b}</span></div>
            </div>
          ))}
        </div>
      </div>
      <div className="relative flex justify-center">
        <div className="absolute bottom-6 h-64 w-64 rounded-full bg-[#FFDA79]/50 blur-3xl md:h-80 md:w-80" />
        <Smilo pose="hero" float alt="SMILO menyapa" className="relative h-72 cursor-pointer transition-transform duration-300 hover:rotate-[-4deg] hover:scale-105 active:scale-95 sm:h-96 lg:h-[440px]" />
        {[["PUP", "left-0 top-10", "#FFF4DC"], ["TRIAD KRR", "right-0 top-24", "#E3F7F2"], ["Life Skills", "left-4 bottom-24", "#F5F0FF"], ["PIK-R", "right-6 bottom-36", "#FDE7E7"]].map(([t, pos, bg], i) => (
          <Link key={t} to="/learn" className={`absolute ${pos} hidden rounded-2xl px-4 py-2 text-sm font-bold shadow-lg transition-transform hover:scale-110 md:block sal-float`} style={{ background: bg, animationDelay: `${i * 0.6}s` }} data-testid={`hero-topic-${i}`}>{t}</Link>
        ))}
      </div>
    </div>
    <Hills className="absolute bottom-0 left-0 h-24 w-full md:h-32" />
  </section>
    <Dialog open={introOpen} onOpenChange={setIntroOpen}>
      <DialogContent className="max-w-4xl rounded-3xl">
        <DialogHeader><DialogTitle>Kenalan dengan SMILE ACTION LAB</DialogTitle></DialogHeader>
        <DialogDescription>Video perkenalan berdurasi singkat. Pemutaran dimulai tanpa suara; atur suara lewat kontrol video.</DialogDescription>
        {introOpen && (
          <video src={INTRO_VIDEO_URL} controls autoPlay muted playsInline preload="metadata"
            poster="/brand/smilo-hero.png" aria-label="Video perkenalan SMILE ACTION LAB"
            className="mt-2 max-h-[75vh] w-full rounded-2xl bg-[#19264C] object-contain" data-testid="hero-intro-video" />
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

const Features = () => (
  <section className="sal-container -mt-10 relative z-10">
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {FEATURES.map(({ to, icon: I, title, text, bg, fg, pose }, i) => (
        <Link key={to} to={to} className={`sal-card sal-lift sal-rise group relative overflow-hidden p-6 sal-d${i + 1}`} data-testid={`feature-card-${to.slice(1)}`}>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: bg, color: fg }}><I className="h-6 w-6" /></div>
          <h3 className="mt-5 text-xl font-bold">{title}</h3>
          <p className="mt-1.5 pr-14 text-sm text-[#68748C]">{text}</p>
          <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold" style={{ color: fg }}>Buka <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
          <Smilo pose={pose} className="absolute -bottom-3 -right-3 h-24 opacity-90 transition-transform group-hover:scale-110" />
        </Link>
      ))}
    </div>
  </section>
);

const Motto = () => (
  <section className="sal-container mt-24 grid items-center gap-10 md:grid-cols-[1fr_1.2fr]">
    <div className="relative rounded-[36px] bg-[#7552D6] p-8 text-white md:p-12">
      <Sparkle className="absolute right-8 top-8 h-6 w-6 text-[#FFDA79] sal-twinkle" />
      <p className="sal-eyebrow !text-[#FFDA79]">Motto kami</p>
      <p className="mt-4 font-display text-3xl font-bold leading-tight md:text-4xl">We Listen.<br />We Care.<br />We Guide.</p>
      <p className="mt-4 text-lg text-white/80">And together we find the smile.</p>
      <Smilo pose="care" className="absolute -bottom-6 -right-4 h-36" />
    </div>
    <div>
      <p className="sal-eyebrow">Tentang SMILE ACTION LAB</p>
      <h2 className="mt-3 text-3xl font-bold md:text-4xl">Satu ekosistem untuk remaja yang punya rencana</h2>
      <p className="mt-4 text-base text-[#68748C] md:text-lg">
        Diinisiasi sebagai program inovasi Duta GenRe Provinsi Banten, SMILE ACTION LAB terbuka untuk semua remaja dan PIK-R dari Sabang sampai Merauke.
        Belajar tentang Generasi Berencana, bercerita tanpa takut dihakimi, terhubung dengan PIK-R terverifikasi, dan kembangkan potensimu.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {[[Users, "Komunitas", "/komunitas"], [MapPin, "PIK-R Hub", "/pikr"], [CalendarDays, "Event", "/update"]].map(([I, l, to]) => (
          <Link to={to} key={l} className="sal-lift flex items-center gap-2 rounded-2xl border border-[#EDE6FF] bg-white px-4 py-3 text-sm font-bold" data-testid={`about-link-${l.toLowerCase().replace(/\s/g, "-")}`}>
            <I className="h-4 w-4 text-[#FFA24A]" /> {l}
          </Link>
        ))}
      </div>
    </div>
  </section>
);

const Stats = ({ stats }) => (
  <section className="sal-container mt-20">
    <div className="grid grid-cols-2 gap-4 rounded-[32px] bg-white p-6 md:grid-cols-4 md:p-8 sal-card">
      {[["materi", "Materi edukasi"], ["pikr", "PIK-R terverifikasi"], ["events", "Event & kegiatan"], ["members", "Sahabat SMILE"]].map(([k, l]) => (
        <div key={k} className="text-center" data-testid={`stat-${k}`}>
          <p className="font-display text-4xl font-bold text-[#7552D6]">{stats?.[k] ?? "–"}</p>
          <p className="mt-1 text-sm text-[#68748C]">{l}</p>
        </div>
      ))}
    </div>
  </section>
);

const Events = ({ events }) => (
  <section className="sal-art-panel sal-art-events mt-20 py-10">
    <div className="sal-container">
      <div className="flex items-end justify-between gap-4">
        <div><p className="sal-eyebrow">Jangan sampai ketinggalan</p><h2 className="mt-2 text-3xl font-bold">Event mendatang</h2></div>
        <Link to="/update" className="text-sm font-bold text-[#7552D6]" data-testid="home-events-all">Lihat semua</Link>
      </div>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {events.slice(0, 3).map((e) => (
          <Link to={`/events/${e.id}`} key={e.id} className="sal-card sal-lift flex items-center gap-4 p-5" data-testid={`home-event-${e.id}`}>
            <div className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-2xl bg-[#FFF4DC] text-[#19264C]">
              <span className="text-xl font-bold leading-none">{e.date.slice(8)}</span>
              <span className="text-[10px] font-bold uppercase">{new Date(e.date).toLocaleDateString("id-ID", { month: "short" })}</span>
            </div>
            <div className="min-w-0"><p className="font-bold leading-snug">{e.title}</p><p className="mt-1 text-xs text-[#68748C]">{e.mode} · {fmtDate(e.date)}</p></div>
          </Link>
        ))}
      </div>
    </div>
  </section>
);

const Cta = () => (
  <section className="sal-container mt-20">
    <div className="relative overflow-hidden rounded-[36px] bg-[#19264C] px-8 py-12 text-white md:px-14">
      <Sparkle className="absolute left-[40%] top-6 h-6 w-6 text-[#FFDA79] sal-twinkle" />
      <div className="relative z-10 max-w-xl">
        <h2 className="text-3xl font-bold md:text-4xl">Kamu tidak sendiri. SMILO selalu di sini.</h2>
        <p className="mt-3 text-white/70">Mulai ngobrol tanpa akun dengan mode anonim, atau buat akun untuk menyimpan progres, XP, dan pencapaianmu.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/talk" className="sal-btn-orange" data-testid="cta-talk-btn">Ngobrol dengan SMILO</Link>
          <Link to="/sign-up" className="sal-btn border-2 border-white/30 text-white hover:border-white" data-testid="cta-signup-btn">Buat akun gratis</Link>
        </div>
      </div>
      <Smilo pose="cheer" className="absolute -bottom-4 right-6 hidden h-56 md:block" />
    </div>
  </section>
);

const Featured = ({ posts, news, orgs }) => (
  <section className="sal-container mt-24">
    <div className="grid gap-8 lg:grid-cols-[1.5fr_1fr]">
      <Reveal>
        <p className="sal-eyebrow">Pilihan editor</p>
        <h2 className="mt-2 text-3xl font-bold md:text-4xl">Modul untuk mulai hari ini</h2>
        <div className="mt-6 grid gap-5 sm:grid-cols-2">
          {posts.slice(0, 1).map((p) => (
            <Link key={p.id} to={`/learn/${p.id}`} className="sal-card sal-lift group overflow-hidden sm:col-span-2 sm:grid sm:grid-cols-2" data-testid={`home-featured-${p.id}`}>
              <SmiloCover pose={p.cover} className="h-48 sm:h-full" />
              <div className="p-6"><span className="sal-pill bg-[#F5F0FF] text-[#7552D6]">{p.category}</span><h3 className="mt-3 font-display text-2xl font-bold group-hover:text-[#7552D6]">{p.title}</h3><p className="mt-2 text-sm text-[#68748C]">{p.summary}</p></div>
            </Link>
          ))}
          {posts.slice(1, 5).map((p) => (
            <Link key={p.id} to={`/learn/${p.id}`} className="sal-card sal-lift group flex items-center gap-4 p-4" data-testid={`home-module-${p.id}`}>
              <Smilo pose={p.cover} className="h-16 w-16 shrink-0" />
              <div><p className="text-xs font-bold text-[#7552D6]">{p.category}</p><p className="font-bold leading-snug group-hover:text-[#7552D6]">{p.title}</p></div>
            </Link>
          ))}
        </div>
      </Reveal>
      <Reveal className="space-y-6">
        <div className="rounded-[32px] bg-[#FFDA79] p-6" data-testid="home-daily-challenge">
          <p className="flex items-center gap-2 font-display text-xl font-bold"><Zap className="h-5 w-5" />Daily Challenge</p>
          <p className="mt-1 text-sm">Selesaikan 1 kuis hari ini: bonus +20 XP dan jaga SMILE Streak-mu.</p>
          <Link to="/play" className="sal-btn-primary mt-4" data-testid="home-daily-btn">Main sekarang</Link>
        </div>
        <div className="sal-card p-6" data-testid="home-news">
          <p className="font-display text-xl font-bold">Kabar terverifikasi</p>
          {news.length === 0 ? <p className="mt-2 text-sm text-[#68748C]">Belum ada kabar yang lolos verifikasi editor. Kami tidak menampilkan berita tanpa sumber.</p> :
            news.slice(0, 3).map((n) => <Link key={n.id} to={`/update/${n.id}`} className="mt-3 block rounded-2xl bg-[#F5F0FF]/60 p-3 hover:bg-[#F5F0FF]"><p className="text-sm font-bold">{n.title}</p><p className="text-xs text-[#68748C]">{n.source_name || "SMILE ACTION LAB"} · {n.original_date || fmtDate(n.created_at)}</p></Link>)}
        </div>
        <div className="sal-card p-6" data-testid="home-pikr">
          <p className="font-display text-xl font-bold">PIK-R terverifikasi</p>
          {orgs.length === 0 ? <p className="mt-2 text-sm text-[#68748C]">Belum ada PIK-R terverifikasi. <Link to="/pikr" className="font-bold text-[#7552D6]">Daftarkan PIK-R-mu</Link> dan jadilah yang pertama.</p> :
            orgs.slice(0, 3).map((o) => <p key={o.id} className="mt-3 flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-[#FFA24A]" /><b>{o.name}</b><span className="text-[#68748C]">{o.province}</span></p>)}
        </div>
      </Reveal>
    </div>
  </section>
);

const Explore = () => (
  <section className="sal-container mt-24">
    <Reveal>
      <p className="sal-eyebrow">SMILE Discovery</p>
      <h2 className="mt-2 max-w-2xl text-3xl font-bold md:text-5xl">Mau tumbuh ke arah mana? Pilih jalurmu.</h2>
      <div className="mt-8"><Discovery /></div>
    </Reveal>
  </section>
);

export default function Home() {
  const api = useApi();
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [posts, setPosts] = useState([]);
  const [news, setNews] = useState([]);
  const [orgs, setOrgs] = useState([]);
  useEffect(() => {
    api.get("/stats/public").then((r) => setStats(r.data)).catch(() => {});
    api.get("/events").then((r) => setEvents(r.data.filter((e) => ["Pendaftaran dibuka", "Akan datang", "Berlangsung"].includes(e.status)))).catch(() => {});
    api.get("/posts", { params: { kind: "learn" } }).then((r) => setPosts(r.data)).catch(() => {});
    api.get("/posts", { params: { kind: "news" } }).then((r) => setNews(r.data)).catch(() => {});
    api.get("/orgs").then((r) => setOrgs(r.data)).catch(() => {});
  }, [api]);
  return (
    <div data-testid="home-page">
      <Hero />
      <Features />
      <Explore />
      <Featured posts={posts} news={news} orgs={orgs} />
      <Motto />
      <Stats stats={stats} />
      {events.length > 0 && <Events events={events} />}
      <Cta />
    </div>
  );
}
