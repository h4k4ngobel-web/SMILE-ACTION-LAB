import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSafeAuth } from "@/lib/auth";
import { Send, Plus, Trash2, ShieldAlert, Lock, UserRound, History, HeartHandshake } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { API, anonId, useApi, errMsg } from "@/lib/api";
import { Smilo } from "@/components/brand/Smilo";

const STARTERS = ["Aku lagi overthinking nih...", "Gimana cara bilang tidak ke teman?", "Apa itu Pendewasaan Usia Perkawinan?", "Aku bingung mau kuliah atau kerja"];

const Bubble = ({ m }) => (
  <div className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`} data-testid={`chat-msg-${m.role}`}>
    {m.role === "assistant" && <img src="/brand/smilo-welcome.png" alt="SMILO" className="h-9 w-9 shrink-0 rounded-full bg-[#FFF4DC] object-contain p-0.5" />}
    {m.role === "counselor" && <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#70D6C3] text-xs font-bold">K</div>}
    <div className="max-w-[80%]">
      {m.role === "counselor" && <p className="mb-1 text-xs font-bold text-[#2BA58E]">Konselor (manusia)</p>}
      <div className={`whitespace-pre-wrap rounded-3xl px-4 py-3 text-sm leading-relaxed ${m.role === "user" ? "rounded-br-md bg-[#7552D6] text-white" : m.role === "counselor" ? "rounded-bl-md border border-[#70D6C3] bg-[#E3F7F2]" : "rounded-bl-md bg-white text-[#19264C] shadow-sm"}`}>
        {m.text || <span className="sal-typing"><span /><span /><span /></span>}
      </div>
      {m.role === "assistant" && m.mode && <p className="mt-1 text-[10px] text-[#68748C]">{m.mode === "gemini" ? "Dibantu Gemini atas persetujuanmu" : m.mode === "local-priority" ? "Respons prioritas lokal" : "Mode lokal berbasis materi"}</p>}
      {m.sources?.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5" data-testid="chat-sources">
          {m.sources.map((s, i) => <Link key={s.id} to={`/learn/${s.id}`} className="sal-pill bg-[#F5F0FF] text-[#7552D6] hover:bg-[#EDE6FF]">[{i + 1}] {s.title}</Link>)}
        </div>
      )}
      {m.recommendations?.length > 0 && (
        <div className="mt-2 space-y-1.5" data-testid="chat-recommendations">
          {m.recommendations.map((item) => <a key={item.url} href={item.url} target="_blank" rel="noreferrer" className="block rounded-xl bg-[#EAF5FF] px-3 py-2 text-xs font-semibold text-[#3A7BC8] hover:underline">{item.title}<span className="mt-0.5 block font-normal">{item.note}</span></a>)}
        </div>
      )}
    </div>
  </div>
);

const Handover = ({ sid, isSignedIn, getToken }) => {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);
  const send = async () => {
    try {
      const headers = { "Content-Type": "application/json" };
      const token = isSignedIn ? await getToken() : null;
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API}/talk/sessions/${sid}/handover`, { method: "POST", headers, body: JSON.stringify({ note, anon_id: anonId() }) });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || "Gagal mengirim permintaan");
      }
      setSent(true);
      toast.success("Permintaan terkirim ke tim konselor");
    } catch (e) { toast.error(e.message || "Gagal mengirim permintaan"); }
  };
  if (!sid) return null;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button className="sal-pill bg-[#E3F7F2] text-[#2BA58E]" data-testid="talk-handover-open"><HeartHandshake className="h-3.5 w-3.5" />Hubungkan ke konselor</button></DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle>Bicara dengan konselor manusia</DialogTitle></DialogHeader>
        {sent ? <p className="text-sm" data-testid="talk-handover-sent">Permintaanmu sudah diterima. Balasan konselor akan muncul di percakapan ini pada jam layanan. Buka lagi riwayat chat ini nanti, ya. Jika ada bahaya langsung, cari orang dewasa yang kamu percaya atau layanan darurat setempat (112 bila aktif di daerahmu).</p> : (
          <div className="space-y-3 text-sm">
            <p>Konselor terlatih dari tim SMILE ACTION LAB akan membaca percakapan ini dan membalas di sini. Layanan ini <b>tidak 24 jam</b>. Identitasmu tetap anonim jika kamu tidak masuk akun. Setiap akses konselor dicatat dalam log rahasia.</p>
            <Textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Catatan singkat untuk konselor (opsional)" data-testid="talk-handover-note" />
            <button onClick={send} className="sal-btn-primary w-full" data-testid="talk-handover-submit">Kirim permintaan</button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

const CrisisBanner = () => (
  <div className="mx-4 mb-3 flex gap-3 rounded-2xl border border-[#F6B6B5] bg-[#FDE7E7] p-4 text-sm" data-testid="talk-crisis-banner">
    <ShieldAlert className="h-5 w-5 shrink-0 text-[#D86A68]" />
    <p><b>Keselamatanmu yang utama.</b> Sesi ini ditandai sebagai prioritas di antrean konselor, tetapi tim tidak selalu siaga 24 jam. Kalau ada bahaya langsung, cari orang dewasa yang kamu percaya atau layanan darurat setempat (112 bila aktif di daerahmu). Untuk kekerasan terhadap perempuan atau anak, kamu juga dapat menghubungi SAPA 129.</p>
  </div>
);

const Sidebar = ({ sessions, sid, onNew, onOpen, onDelete, isSignedIn }) => (
  <aside className="hidden w-72 shrink-0 flex-col border-r border-[#EDE6FF] bg-white/70 p-4 md:flex">
    <h2 className="text-xl font-bold">SMILE TALK</h2>
    <p className="text-xs text-[#68748C]">Ruang aman untuk cerita.</p>
    <button onClick={onNew} className="sal-btn-primary mt-4 w-full" data-testid="talk-new-chat-btn"><Plus className="h-4 w-4" />Chat Baru</button>
    <p className="mt-6 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#68748C]"><History className="h-3.5 w-3.5" />Riwayat</p>
    <div className="mt-2 flex-1 space-y-1 overflow-y-auto">
      {sessions.length === 0 && <p className="text-xs text-[#68748C]">Belum ada percakapan.</p>}
      {sessions.map((s) => (
        <div key={s.id} className={`group flex items-center gap-1 rounded-xl px-3 py-2 text-sm ${s.id === sid ? "bg-[#F5F0FF] font-semibold text-[#7552D6]" : "hover:bg-[#F5F0FF]/60"}`}>
          <button onClick={() => onOpen(s.id)} className="flex-1 truncate text-left" data-testid={`talk-session-${s.id}`}>{s.title}</button>
          <button onClick={() => onDelete(s.id)} className="opacity-0 group-hover:opacity-100" aria-label="Hapus" data-testid={`talk-delete-${s.id}`}><Trash2 className="h-3.5 w-3.5" /></button>
        </div>
      ))}
    </div>
    <div className="mt-4 rounded-2xl bg-[#F5F0FF] p-3 text-xs" data-testid="talk-mode-info">
      <p className="flex items-center gap-1.5 font-bold">{isSignedIn ? <><UserRound className="h-3.5 w-3.5" />Mode: Dengan Akun</> : <><Lock className="h-3.5 w-3.5" />Mode: Anonim</>}</p>
      <p className="mt-1 text-[#68748C]">{isSignedIn ? "Riwayat tersimpan di akunmu dan hanya bisa dibuka olehmu. Konselor hanya melihat sesi yang kamu minta atau yang terdeteksi darurat." : <>Tanpa nama dan email. Riwayat hanya tersimpan untuk browser ini, maks 20 pesan/hari. <Link to="/sign-in" className="font-bold text-[#7552D6]">Masuk</Link> untuk lebih.</>}</p>
    </div>
  </aside>
);

export default function Talk() {
  const { isSignedIn, getToken, isLoaded } = useSafeAuth();
  const api = useApi();
  const [sessions, setSessions] = useState([]);
  const [sid, setSid] = useState(null);
  const [msgs, setMsgs] = useState([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [geminiAvailable, setGeminiAvailable] = useState(false);
  const [geminiConsent, setGeminiConsent] = useState(false);
  const endRef = useRef(null);

  const loadSessions = useCallback(async () => {
    try { setSessions((await api.get("/talk/sessions", { params: { anon_id: anonId() } })).data); }
    catch (e) { toast.error(errMsg(e)); }
  }, [api]);
  useEffect(() => { if (isLoaded) loadSessions(); }, [isLoaded, loadSessions]);
  useEffect(() => { api.get("/talk/config").then((r) => setGeminiAvailable(Boolean(r.data.gemini_available))).catch(() => setGeminiAvailable(false)); }, [api]);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  const openSession = async (id) => {
    try {
      const data = (await api.get(`/talk/sessions/${id}`, { params: { anon_id: anonId() } })).data;
      setGeminiConsent(false);
      setSid(id); setFlagged(sessions.find((s) => s.id === id)?.flagged || false);
      setMsgs(data);
    } catch (e) { toast.error(errMsg(e)); }
  };
  const newChat = () => { setSid(null); setMsgs([]); setFlagged(false); setGeminiConsent(false); };
  const deleteSession = async (id) => {
    try {
      await api.delete(`/talk/sessions/${id}`, { params: { anon_id: anonId() } });
      if (id === sid) newChat();
      loadSessions();
    } catch (e) { toast.error(errMsg(e)); }
  };

  const send = async (text) => {
    const message = (text ?? input).trim();
    if (!message || busy) return;
    const sendToGemini = geminiConsent;
    setGeminiConsent(false);
    setInput(""); setBusy(true);
    setMsgs((m) => [...m, { role: "user", text: message }, { role: "assistant", text: "" }]);
    const headers = { "Content-Type": "application/json" };
    try {
      const token = isSignedIn ? await getToken() : null;
      if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch(`${API}/talk/stream`, { method: "POST", headers, body: JSON.stringify({ message, session_id: sid, anon_id: anonId(), gemini_consent: sendToGemini }) });
      if (!res.ok) throw { response: { data: await res.json() } };
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const parts = buf.split("\n\n"); buf = parts.pop();
        for (const p of parts) {
          if (!p.startsWith("data: ")) continue;
          const d = JSON.parse(p.slice(6));
          if (d.t) setMsgs((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], text: c[c.length - 1].text + d.t }; return c; });
          if (d.done) { setSid(d.session_id); if (d.flagged) setFlagged(true); setMsgs((m) => { const c = [...m]; c[c.length - 1] = { ...c[c.length - 1], sources: d.sources || [], recommendations: d.recommendations || [], mode: d.mode }; return c; }); loadSessions(); }
        }
      }
    } catch (e) {
      toast.error(errMsg(e));
      setMsgs((m) => m.slice(0, -2));
    } finally { setBusy(false); }
  };

  return (
    <div className="sal-page-illustrated sal-art-talk flex h-[calc(100vh-4rem)]" data-testid="talk-page">
      <Sidebar sessions={sessions} sid={sid} onNew={newChat} onOpen={openSession} onDelete={deleteSession} isSignedIn={isSignedIn} />
      <section className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-3 border-b border-[#EDE6FF] bg-white/70 px-4 py-3 backdrop-blur">
          <img src="/brand/smilo-welcome.png" alt="" className="h-10 w-10 rounded-full bg-[#FFF4DC] object-contain p-0.5" />
          <div className="flex-1"><p className="font-bold leading-tight">SMILO</p><p className="text-xs text-[#2BA58E]">Teman ngobrol untuk mencari langkah kecil · bukan konselor manusia</p></div>
          <Handover sid={sid} isSignedIn={isSignedIn} getToken={getToken} />
          <button onClick={newChat} className="rounded-full p-2 text-[#7552D6] md:hidden" data-testid="talk-new-chat-mobile"><Plus className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto px-4 py-6 md:px-10" data-testid="talk-messages">
          {msgs.length === 0 && (
            <div className="mx-auto flex max-w-lg flex-col items-center pt-6 text-center">
              <Smilo pose="care" float className="h-36" />
              <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Hai! Aku SMILO.</h1>
              <p className="mt-2 text-sm text-[#68748C]">Apa yang sedang kamu pikirkan hari ini? Aku bisa mendengarkan dan membantu mencari langkah kecil yang terasa mungkin.</p>
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {STARTERS.map((s, i) => <button key={s} onClick={() => send(s)} className="rounded-full border border-[#EDE6FF] bg-white px-4 py-2 text-sm font-medium hover:border-[#7552D6]" data-testid={`talk-starter-${i}`}>{s}</button>)}
              </div>
            </div>
          )}
          {msgs.map((m, i) => <Bubble key={i} m={m} />)}
          <div ref={endRef} />
        </div>
        {flagged && <CrisisBanner />}
        <form onSubmit={(e) => { e.preventDefault(); send(); }} className="border-t border-[#EDE6FF] bg-white/80 p-3 md:px-10">
          {geminiAvailable && (
            <label className="mx-auto mb-2 flex max-w-3xl items-start gap-2 text-xs text-[#68748C]" data-testid="talk-gemini-consent">
              <input type="checkbox" checked={geminiConsent} onChange={(e) => setGeminiConsent(e.target.checked)} className="mt-0.5 accent-[#7552D6]" />
              <span><b>Opsional: gunakan Gemini untuk pesan ini.</b> Jika dicentang, pesan yang kamu kirim sekarang dikirim ke Google untuk membuat balasan; riwayat chat tidak ikut dikirim. Persetujuan ini mati lagi setelah pesan terkirim. Pesan prioritas tetap diproses secara lokal.</span>
            </label>
          )}
          <div className="flex items-end gap-2 rounded-3xl border border-[#EDE6FF] bg-white p-2 pl-4 focus-within:border-[#7552D6]">
            <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              rows={1} maxLength={2000} placeholder="Tulis pesanmu..." className="max-h-32 flex-1 resize-none bg-transparent py-2 text-sm outline-none" data-testid="talk-input" />
            <button type="submit" disabled={busy || !input.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-[#7552D6] text-white transition-transform hover:scale-105 disabled:opacity-40" data-testid="talk-send-btn"><Send className="h-4 w-4" /></button>
          </div>
          <p className="mt-2 text-center text-[11px] text-[#68748C]">Mode lokal berbasis materi selalu tersedia; pesan hanya dikirim ke Google jika kamu mencentang pilihan Gemini. SMILO bukan pengganti psikolog atau tenaga medis.</p>
        </form>
      </section>
    </div>
  );
}
