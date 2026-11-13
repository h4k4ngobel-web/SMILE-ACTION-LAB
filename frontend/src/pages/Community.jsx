import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSafeAuth, useAuthMode } from "@/lib/auth";
import { Heart, MessageCircle, Trash2, Send } from "lucide-react";
import { toast } from "sonner";
import { useApi, useMe, fmtDate, errMsg } from "@/lib/api";
import { PageHeader, Loading, EmptyState } from "@/components/common";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";

const TOPICS = ["Cerita", "Pertanyaan", "Inspirasi"];
const TOPIC_COLOR = { Cerita: "bg-[#F5F0FF] text-[#7552D6]", Pertanyaan: "bg-[#FFF4DC] text-[#E08A2E]", Inspirasi: "bg-[#E3F7F2] text-[#2BA58E]" };

const Composer = ({ onDone }) => {
  const api = useApi();
  const { refresh } = useMe();
  const [text, setText] = useState("");
  const [topic, setTopic] = useState("Cerita");
  const [anon, setAnon] = useState(true);
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true);
    try { await api.post("/community", { text, topic, anonymous: anon }); setText(""); toast.success("Terkirim! +5 XP"); onDone(); refresh(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="sal-card p-5" data-testid="community-composer">
      <Textarea value={text} onChange={(e) => setText(e.target.value)} maxLength={1500} placeholder="Bagikan cerita, pertanyaan, atau inspirasimu..." className="min-h-24 rounded-2xl" data-testid="community-text-input" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {TOPICS.map((t) => <button key={t} onClick={() => setTopic(t)} className={`sal-pill ${topic === t ? TOPIC_COLOR[t] + " ring-2 ring-current" : "bg-[#F7F7FB] text-[#68748C]"}`} data-testid={`community-topic-${t.toLowerCase()}`}>{t}</button>)}
        <label className="ml-auto flex items-center gap-2 text-sm"><Switch checked={anon} onCheckedChange={setAnon} data-testid="community-anon-switch" />Anonim</label>
        <button disabled={busy || text.trim().length < 5} onClick={submit} className="sal-btn-primary disabled:opacity-40" data-testid="community-submit-btn"><Send className="h-4 w-4" />Kirim</button>
      </div>
    </div>
  );
};

const PostItem = ({ p, me, reload }) => {
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [reply, setReply] = useState("");
  const liked = me && p.hearts?.includes(me.user_id);
  const act = async (fn) => { try { await fn(); reload(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div className="sal-card p-5" data-testid={`community-post-${p.id}`}>
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FFDA79] font-bold text-[#19264C]">{p.author[0]}</div>
        <div className="flex-1"><p className="text-sm font-bold">{p.author}</p><p className="text-xs text-[#68748C]">{fmtDate(p.created_at)}</p></div>
        <span className={`sal-pill ${TOPIC_COLOR[p.topic]}`}>{p.topic}</span>
      </div>
      <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed">{p.text}</p>
      <div className="mt-4 flex items-center gap-4 text-sm text-[#68748C]">
        <button disabled={!me} onClick={() => act(() => api.post(`/community/${p.id}/heart`))} className={`flex items-center gap-1 ${liked ? "text-[#D86A68]" : ""}`} data-testid={`community-heart-${p.id}`}>
          <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />{p.hearts?.length || 0}
        </button>
        <button onClick={() => setOpen(!open)} className="flex items-center gap-1" data-testid={`community-replies-toggle-${p.id}`}><MessageCircle className="h-4 w-4" />{p.replies.length} balasan</button>
        {(p.mine || me?.role === "admin") && <button onClick={() => act(() => api.delete(`/community/${p.id}`))} className="ml-auto flex items-center gap-1 hover:text-[#D86A68]" data-testid={`community-delete-${p.id}`}><Trash2 className="h-4 w-4" />Hapus</button>}
      </div>
      {open && (
        <div className="mt-4 space-y-3 border-t border-[#EDE6FF] pt-4">
          {p.replies.map((r) => (
            <div key={r.id} className="rounded-2xl bg-[#F5F0FF]/60 p-3 text-sm">
              <p className="font-bold">{r.author} {r.badge && <span className="sal-pill ml-1 bg-[#7552D6] text-white">{r.badge}</span>}</p>
              <p className="mt-1">{r.text}</p>
            </div>
          ))}
          {me && (
            <div className="flex gap-2">
              <input value={reply} onChange={(e) => setReply(e.target.value)} maxLength={800} placeholder="Tulis balasan yang suportif..." className="flex-1 rounded-full border border-[#EDE6FF] px-4 py-2 text-sm outline-none focus:border-[#7552D6]" data-testid={`community-reply-input-${p.id}`} />
              <button disabled={reply.trim().length < 2} onClick={() => act(async () => { await api.post(`/community/${p.id}/replies`, { text: reply }); setReply(""); })} className="sal-btn-primary !px-4 disabled:opacity-40" data-testid={`community-reply-btn-${p.id}`}><Send className="h-4 w-4" /></button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default function Community() {
  const api = useApi();
  const { me } = useMe();
  const { isSignedIn } = useSafeAuth();
  const { enabled } = useAuthMode();
  const [topic, setTopic] = useState("");
  const [posts, setPosts] = useState(null);
  const load = useCallback(() => api.get("/community", { params: { topic } }).then((r) => setPosts(r.data)).catch(() => setPosts([])), [api, topic]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="sal-page-illustrated sal-art-community" data-testid="community-page">
      <PageHeader eyebrow="Komunitas" title="Ruang cerita yang saling menguatkan" subtitle="Berbagi cerita dan pertanyaan secara anonim. Saling dukung, tanpa menghakimi." pose="care" art="community" />
      <div className="sal-container mt-8 grid max-w-4xl gap-6">
        {enabled && isSignedIn ? <Composer onDone={load} /> : null}
        {(!enabled || !isSignedIn) ? (
          <div className="sal-card flex flex-wrap items-center justify-between gap-3 p-5">
            <p className="text-sm"><b>Mau ikut berbagi?</b> Masuk atau daftar untuk menulis dan membalas.</p>
            <div className="flex gap-2">
              <Link to="/sign-in" className="sal-btn-primary" data-testid="community-login-btn">Masuk</Link>
              <Link to="/sign-up" className="sal-btn-ghost" data-testid="community-sign-up-btn">Daftar</Link>
            </div>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {["", ...TOPICS].map((t) => <button key={t || "all"} onClick={() => setTopic(t)} className={`rounded-full px-4 py-2 text-sm font-semibold ${topic === t ? "bg-[#7552D6] text-white" : "bg-white"}`} data-testid={`community-filter-${t || "semua"}`}>{t || "Semua"}</button>)}
        </div>
        <p className="text-xs text-[#68748C]">Aturan: hormati sesama, jangan bagikan data pribadi, dan laporkan konten berbahaya ke lab.smileaction@gmail.com.</p>
        {posts === null ? <Loading /> : posts.length === 0 ? <EmptyState title="Belum ada cerita" text="Jadilah yang pertama berbagi!" /> : posts.map((p) => <PostItem key={p.id} p={p} me={me} reload={load} />)}
      </div>
    </div>
  );
}
