import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { useSafeAuth } from "@/lib/auth";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, BookOpen, CheckCircle2, Clock, ExternalLink, FileDown, Library, MessageCircleHeart, Presentation, RotateCcw, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { useApi, useMe, fmtDate, errMsg } from "@/lib/api";
import { Loading, EmptyState } from "@/components/common";
import { SmiloCover, Smilo } from "@/components/brand/Smilo";
import ComicIllustration from "@/components/learn/ComicIllustration";
import { LEARN_COMICS } from "@/data/learnComics";
import { PostCard } from "@/pages/Learn";

const REVIEW_TONE = { "Publikasi resmi": "bg-[#E3F7F2] text-[#2BA58E]", "Diadaptasi": "bg-[#FFF4DC] text-[#E08A2E]", "Ringkasan impor": "bg-[#EAF5FF] text-[#3A7BC8]" };

const ReadingBar = () => {
  const [p, setP] = useState(0);
  useEffect(() => {
    const on = () => { const h = document.documentElement; setP(Math.min(100, (h.scrollTop / Math.max(1, h.scrollHeight - h.clientHeight)) * 100)); };
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return <div className="fixed left-0 top-16 z-30 h-1 bg-[#FFA24A] transition-[width]" style={{ width: `${p}%` }} data-testid="reading-progress" />;
};

const videoEmbed = (u) => {
  const m = u?.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]{6,})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
};

const References = ({ p, extra = [] }) => {
  const references = [...(p.references || []), ...extra].filter((reference, index, all) =>
    all.findIndex((item) => item.url === reference.url && item.title === reference.title) === index);

  return (
    <section className="sal-card mt-10 p-6" data-testid="article-references">
      <p className="flex items-center gap-2 font-bold"><Library className="h-5 w-5 text-[#7552D6]" />Sumber & referensi</p>
      {p.source_name && <p className="mt-2 text-sm">Sumber asli: <b>{p.source_name}</b>{p.original_date && ` · terbit ${p.original_date}`}</p>}
      {references.length === 0 ? <p className="mt-2 text-sm text-[#68748C]">Belum ada referensi tercatat.</p> : (
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">
          {references.map((r, i) => (
            <li key={`${r.url || r.title}-${i}`}>
              {r.url ? <a href={r.url} target="_blank" rel="noreferrer" className="font-semibold text-[#7552D6] hover:underline">{r.title}</a> : <b>{r.title}</b>}
              <span className="text-[#68748C]"> · {r.institution}{r.published && ` · terbit ${r.published}`}{r.accessed && ` · diakses ${r.accessed}`}</span>
            </li>
          ))}
        </ol>
      )}
      <p className="mt-4 text-xs text-[#68748C]">Status editorial: {p.review_status || "Tulisan independen"} · Diperbarui {fmtDate(p.updated_at || p.created_at)}{p.reviewed_by ? " · ditinjau tim editor" : ""}</p>
    </section>
  );
};

const LearningActivity = ({ activity, index }) => {
  const [picked, setPicked] = useState(null);
  return (
    <section className="sal-card mt-6 p-5" data-testid={`article-activity-${index}`}>
      <p className="text-sm font-bold text-[#7552D6]">{activity.title || "Coba interaktif"}</p>
      <h2 className="mt-2 text-lg font-bold">{activity.prompt}</h2>
      <div className="mt-4 grid gap-2">
        {(activity.options || []).map((option, i) => (
          <button key={i} onClick={() => setPicked(i)} className={`rounded-2xl border-2 px-4 py-3 text-left text-sm font-medium transition-colors ${picked === i ? "border-[#7552D6] bg-[#F5F0FF]" : "border-[#EDE6FF] bg-white hover:border-[#7552D6]/50"}`}>
            {option}
          </button>
        ))}
      </div>
      {picked !== null && activity.feedback?.[picked] && (
        <p className="mt-4 rounded-xl bg-[#E3F7F2] p-3 text-sm" role="status">{activity.feedback[picked]}</p>
      )}
    </section>
  );
};

const LessonSlides = ({ content }) => {
  const slides = content.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);
  const [active, setActive] = useState(0);
  const [complete, setComplete] = useState(false);
  const slideCount = Math.max(slides.length, 1);
  const current = slides[active] || content;
  const heading = current.match(/^#{1,6}\s+(.+)$/m)?.[1];
  const slideBody = heading ? current.replace(/^#{1,6}\s+.+(?:\r?\n)?/, "") : current;

  useEffect(() => { setActive(0); setComplete(false); }, [content]);

  const next = () => {
    if (active < slideCount - 1) setActive((index) => index + 1);
    else setComplete(true);
  };
  const previous = () => {
    setActive((index) => Math.max(0, index - 1));
    setComplete(false);
  };

  return (
    <section className="sal-card mt-8 overflow-hidden p-5 md:p-7" data-testid="lesson-slides">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-bold text-[#7552D6]"><Presentation className="h-4 w-4" />Belajar per slide</p>
        <p className="text-xs font-semibold text-[#68748C]" data-testid="lesson-slide-count">Slide {active + 1} dari {slideCount}</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#F5F0FF]" role="progressbar" aria-label="Kemajuan materi"
        aria-valuemin={0} aria-valuemax={slideCount} aria-valuenow={active + 1}>
        <div className="h-full rounded-full bg-[#7552D6] transition-[width] duration-300" style={{ width: `${((active + 1) / slideCount) * 100}%` }} />
      </div>
      <article className="mt-5 min-h-56 rounded-3xl bg-[#F8F6FF] p-5 md:p-8" aria-live="polite" data-testid="lesson-slide">
        <p className="sal-eyebrow text-[#FFA24A]">Pokok bahasan {active + 1}</p>
        {heading && <h2 className="mt-2 text-xl font-bold">{heading}</h2>}
        <div className="prose-sal mt-3 text-base leading-relaxed text-[#19264C]/90">
          <ReactMarkdown>{slideBody}</ReactMarkdown>
        </div>
      </article>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={previous} disabled={active === 0} className="sal-btn-ghost disabled:opacity-40" data-testid="lesson-slide-previous">
          <ArrowLeft className="h-4 w-4" />Sebelumnya
        </button>
        {complete ? (
          <div className="flex flex-wrap items-center gap-3">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-[#2BA58E]" role="status"><CheckCircle2 className="h-4 w-4" />Materi selesai. Pilih satu hal kecil yang ingin kamu coba.</p>
            <button type="button" onClick={() => { setActive(0); setComplete(false); }} className="sal-btn-ghost" data-testid="lesson-slide-restart"><RotateCcw className="h-4 w-4" />Ulangi</button>
          </div>
        ) : (
          <button type="button" onClick={next} className="sal-btn-primary" data-testid="lesson-slide-next">
            {active === slideCount - 1 ? "Selesai belajar" : "Lanjut"}<ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>
    </section>
  );
};

const LessonComic = ({ content, story, title }) => {
  const fallbackScenes = content.split(/\n\s*\n/).map((part, index) => ({
    title: `Bagian ${index + 1}`,
    setting: "community",
    narration: "SMILO merangkum satu bagian materi.",
    dialogue: [{ speaker: "SMILO", text: part.trim() }],
  })).filter((scene) => scene.dialogue[0].text);
  const scenes = story?.scenes?.length ? story.scenes : fallbackScenes;
  const [active, setActive] = useState(0);
  const [complete, setComplete] = useState(false);
  const sceneCount = Math.max(scenes.length, 1);
  const scene = scenes[active] || scenes[0];

  useEffect(() => { setActive(0); setComplete(false); }, [content, story]);

  const next = () => {
    if (active < sceneCount - 1) setActive((index) => index + 1);
    else setComplete(true);
  };
  const previous = () => {
    setActive((index) => Math.max(0, index - 1));
    setComplete(false);
  };

  return (
    <section className="sal-comic-lesson mt-8 overflow-hidden rounded-[32px]" data-testid="lesson-comic">
      <header className="flex flex-wrap items-center justify-between gap-2 bg-[#19264C] px-5 py-4 text-white">
        <p className="flex items-center gap-2 text-sm font-bold"><MessageCircleHeart className="h-4 w-4 text-[#FFDA79]" />{story?.title || `Cerita ${title}`}</p>
        <p className="text-xs font-semibold text-white/80" data-testid="lesson-comic-count">Adegan {active + 1} dari {sceneCount}</p>
      </header>
      <div className="sal-comic-page" aria-live="polite" data-testid="lesson-comic-panel">
        <figure className="sal-comic-scene">
          <div className="sal-comic-illustration">
            <ComicIllustration setting={scene.setting} title={scene.title} />
          </div>
          <figcaption className="sal-comic-narration"><span>Narasi</span>{scene.narration}</figcaption>
        </figure>
        <div className="sal-comic-story">
          <h2 className="text-2xl font-bold">{scene.title}</h2>
          <div className="mt-4 grid gap-3">
            {(scene.dialogue || []).map((line, index) => (
              <div key={`${active}-${line.speaker}-${index}`} className={`sal-comic-dialogue ${line.speaker === "SMILO" ? "sal-comic-dialogue-smilo" : ""}`}>
                <p className="sal-comic-speaker">{line.speaker}</p>
                <div className="prose-sal text-sm leading-relaxed"><ReactMarkdown>{line.text}</ReactMarkdown></div>
              </div>
            ))}
          </div>
          {scene.takeaway && (
            <aside className="sal-comic-takeaway mt-4" data-testid="lesson-comic-takeaway">
              <b>Yang perlu diingat</b>
              <p>{scene.takeaway}</p>
            </aside>
          )}
        </div>
      </div>
      <div className="px-4 pb-5 md:px-6">
        <div className="h-2 overflow-hidden rounded-full bg-[#EDE6FF]" role="progressbar" aria-label="Kemajuan komik"
          aria-valuemin={0} aria-valuemax={sceneCount} aria-valuenow={active + 1}>
          <div className="h-full rounded-full bg-[#FFA24A] transition-[width] duration-300" style={{ width: `${((active + 1) / sceneCount) * 100}%` }} />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={previous} disabled={active === 0} className="sal-btn-ghost disabled:opacity-40" data-testid="lesson-comic-previous">
            <ArrowLeft className="h-4 w-4" />Sebelumnya
          </button>
          {complete ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="flex items-center gap-1.5 text-sm font-semibold text-[#2BA58E]" role="status"><CheckCircle2 className="h-4 w-4" />Cerita selesai! Coba pilih satu ide yang ingin kamu ingat.</p>
              <button type="button" onClick={() => { setActive(0); setComplete(false); }} className="sal-btn-ghost" data-testid="lesson-comic-restart"><RotateCcw className="h-4 w-4" />Ulangi</button>
            </div>
          ) : (
            <button type="button" onClick={next} className="sal-btn-primary" data-testid="lesson-comic-next">
              {active === sceneCount - 1 ? "Selesai membaca cerita" : "Lanjut adegan"}<ArrowRight className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
};

const LessonReflection = () => {
  const [note, setNote] = useState("");
  const [complete, setComplete] = useState(false);
  return (
    <form onSubmit={(event) => { event.preventDefault(); if (note.trim()) setComplete(true); }}
      className="sal-card mt-6 p-5" data-testid="lesson-reflection">
      <p className="flex items-center gap-2 font-bold"><BookOpen className="h-4 w-4 text-[#7552D6]" />Bawa satu ide ke kehidupan nyata</p>
      <p className="mt-1 text-sm text-[#68748C]">Apa satu langkah kecil dari materi ini yang ingin kamu coba?</p>
      <textarea value={note} onChange={(event) => { setNote(event.target.value); setComplete(false); }}
        maxLength={240} rows={3} placeholder="Tulis rencana singkatmu..." className="mt-3 w-full rounded-2xl border border-[#EDE6FF] bg-white p-3 text-sm outline-none focus:border-[#7552D6]"
        data-testid="lesson-reflection-input" />
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-[#68748C]">Catatan ini hanya tampil selama halaman terbuka, tidak dikirim atau disimpan.</p>
        <button type="submit" disabled={!note.trim()} className="sal-btn-primary disabled:opacity-40" data-testid="lesson-reflection-submit">Tandai rencanaku</button>
      </div>
      {complete && <p className="mt-3 rounded-xl bg-[#E3F7F2] p-3 text-sm text-[#2BA58E]" role="status">Rencana kecil sudah ditandai. Semoga langkahnya terasa pas untukmu.</p>}
    </form>
  );
};

export default function Article() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const back = pathname.startsWith("/update") ? "/update" : "/learn";
  const api = useApi();
  const { isSignedIn, isLoaded } = useSafeAuth();
  const { me, refresh } = useMe();
  const [p, setP] = useState(undefined);
  const [next, setNext] = useState([]);
  const [viewMode, setViewMode] = useState("comic");

  useEffect(() => { if (isLoaded) api.get(`/posts/${id}`).then((r) => setP(r.data)).catch(() => setP(null)); }, [api, id, isLoaded]);
  useEffect(() => { setViewMode("comic"); }, [id]);
  useEffect(() => {
    if (!p) return;
    api.get("/posts", { params: { kind: p.kind, category: p.category } }).then((r) => setNext(r.data.filter((x) => x.id !== p.id).slice(0, 3))).catch(() => {});
    if (isSignedIn) api.post(`/posts/${id}/read`).then((r) => { if (r.data.xp_gained) { toast.success(`+${r.data.xp_gained} XP karena sudah membaca!`); refresh(); } }).catch(() => {});
  }, [api, id, isSignedIn, p, refresh]);

  const bookmarked = me?.bookmarks?.includes(id);
  const presentationMode = viewMode !== "reading";
  const toggle = async () => {
    if (!isSignedIn) return toast("Masuk dulu untuk menyimpan materi.");
    try { const r = await api.post(`/posts/${id}/bookmark`); toast.success(r.data.bookmarked ? "Disimpan ke bookmark" : "Dihapus dari bookmark"); refresh(); }
    catch (e) { toast.error(errMsg(e)); }
  };

  if (p === undefined) return <Loading />;
  if (p === null) return <div className="sal-container py-16"><EmptyState title="Materi tidak ditemukan" /></div>;
  const vid = videoEmbed(p.video_url);
  const isLesson = p.kind === "learn";
  const comicStory = isLesson ? LEARN_COMICS[p.slug] : null;
  return (
    <div className="sal-page-illustrated sal-art-learn">
      <article className="sal-container max-w-3xl py-10" data-testid="article-page">
      {!(isLesson && presentationMode) && <ReadingBar />}
      <Link to={back} className="inline-flex items-center gap-1 text-sm font-bold text-[#7552D6]" data-testid="article-back-link"><ArrowLeft className="h-4 w-4" />Kembali</Link>
      {p.status && p.status !== "published" && <p className="mt-4 rounded-2xl bg-[#FDE7E7] p-3 text-sm font-bold text-[#D86A68]" data-testid="article-draft-banner">Pratinjau draf - belum terbit untuk publik.</p>}
      <SmiloCover pose={p.cover} className="mt-5 h-56 rounded-[32px]" />
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <span className="sal-pill bg-[#F5F0FF] text-[#7552D6]">{p.category}</span>
        <span className={`sal-pill ${REVIEW_TONE[p.review_status] || "bg-[#F7F7FB] text-[#68748C]"}`} data-testid="article-review-status"><ShieldCheck className="h-3 w-3" />{p.review_status || "Tulisan independen"}</span>
        <span className="flex items-center gap-1 text-xs text-[#68748C]"><Clock className="h-3.5 w-3.5" />{p.read_min} menit baca · diperbarui {fmtDate(p.updated_at || p.created_at)}</span>
      </div>
      <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl" data-testid="article-title">{p.title}</h1>
      <p className="mt-3 text-lg text-[#68748C]">{p.summary}</p>
      {p.review_status === "Ringkasan impor" && <p className="mt-4 rounded-2xl bg-[#EAF5FF] p-3 text-sm">Ini <b>ringkasan</b> dari publikasi {p.source_name}, bukan artikel asli. Baca versi lengkap di sumbernya.</p>}
      {isLesson && (
        <div className="mt-6 flex flex-wrap gap-2" role="group" aria-label="Pilihan tampilan materi">
          <button type="button" onClick={() => setViewMode("comic")} aria-pressed={viewMode === "comic"}
            className={`sal-pill ${viewMode === "comic" ? "bg-[#7552D6] text-white" : "bg-white text-[#68748C]"}`} data-testid="article-mode-comic">
            <MessageCircleHeart className="h-3.5 w-3.5" />Mode komik
          </button>
          <button type="button" onClick={() => setViewMode("slides")} aria-pressed={viewMode === "slides"}
            className={`sal-pill ${viewMode === "slides" ? "bg-[#7552D6] text-white" : "bg-white text-[#68748C]"}`} data-testid="article-mode-slides">
            <Presentation className="h-3.5 w-3.5" />Mode slide
          </button>
          <button type="button" onClick={() => setViewMode("reading")} aria-pressed={viewMode === "reading"}
            className={`sal-pill ${viewMode === "reading" ? "bg-[#7552D6] text-white" : "bg-white text-[#68748C]"}`} data-testid="article-mode-reading">
            <BookOpen className="h-3.5 w-3.5" />Baca lengkap
          </button>
        </div>
      )}
      {isLesson && viewMode === "comic" ? <LessonComic content={p.content} story={comicStory} title={p.title} /> : null}
      {isLesson && viewMode === "slides" ? <LessonSlides content={p.content} /> : null}
      {(!isLesson || viewMode === "reading") && (
        <div className="prose-sal mt-8 text-base leading-relaxed text-[#19264C]/90" data-testid="article-content">
          <ReactMarkdown>{p.content}</ReactMarkdown>
        </div>
      )}
      {isLesson && viewMode === "comic" && (
        <details className="sal-card mt-6 p-5" data-testid="article-full-material">
          <summary className="cursor-pointer font-bold text-[#7552D6]">Buka materi lengkap & penjelasan</summary>
          <div className="prose-sal mt-4 text-base leading-relaxed text-[#19264C]/90">
            <ReactMarkdown>{p.content}</ReactMarkdown>
          </div>
        </details>
      )}
      {vid && <div className="mt-8 aspect-video overflow-hidden rounded-3xl"><iframe src={vid} title="Video materi" className="h-full w-full" allowFullScreen /></div>}
      {(p.activities || []).map((activity, i) => <LearningActivity key={`${id}-activity-${i}`} activity={activity} index={i} />)}
      {isLesson && <LessonReflection />}
      <div className="mt-8 flex flex-wrap gap-3">
        {p.link && <a href={p.link} target="_blank" rel="noreferrer" className="sal-btn-ghost" data-testid="article-extra-link">Baca di sumber asli <ExternalLink className="h-4 w-4" /></a>}
        {p.attachment_url && <a href={p.attachment_url} target="_blank" rel="noreferrer" className="sal-btn-ghost" data-testid="article-attachment"><FileDown className="h-4 w-4" />Unduh materi</a>}
        <button onClick={toggle} className="sal-btn-ghost" data-testid="article-bookmark-btn">
          {bookmarked ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}{bookmarked ? "Tersimpan" : "Simpan"}
        </button>
        <Link to="/talk" className="sal-btn-primary" data-testid="article-ask-smilo"><MessageCircleHeart className="h-4 w-4" />Tanya SMILO soal ini</Link>
      </div>
      <References p={p} extra={comicStory?.references} />
      {next.length > 0 && (
        <section className="mt-12"><h2 className="mb-4 text-2xl font-bold">Lanjut belajar</h2><div className="grid gap-5 sm:grid-cols-3">{next.map((n) => <PostCard key={n.id} p={n} base={back} />)}</div></section>
      )}
      <div className="sal-card mt-12 flex items-center gap-4 p-5">
        <Smilo pose="cheer" className="h-20" />
        <p className="text-sm"><b>Uji pemahamanmu!</b> Main GenRe Quiz Battle dan kumpulkan XP. <Link to="/play" className="font-bold text-[#7552D6]">Main sekarang</Link></p>
      </div>
      </article>
    </div>
  );
}
