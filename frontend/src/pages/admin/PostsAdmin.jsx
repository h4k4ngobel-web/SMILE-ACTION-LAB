import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Sparkles, History, Eye } from "lucide-react";
import { toast } from "sonner";
import { useApi, fmtDate, errMsg } from "@/lib/api";
import { POSES, POSE_LABEL } from "@/components/brand/Smilo";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const sel = "h-10 w-full rounded-md border border-input bg-white px-3 text-sm";
const EMPTY = { kind: "learn", title: "", category: "GenRe", summary: "", content: "", cover: "welcome", read_min: 5, link: "", status: "draft", publish_at: "",
  review_status: "Tulisan independen", references: [], seo_title: "", seo_description: "", attachment_url: "", video_url: "", source_name: "", source_url: "", original_date: "", expires_at: "" };
const KEYS = Object.keys(EMPTY);
const REVIEW = ["Publikasi resmi", "Diadaptasi", "Tulisan independen", "Ringkasan impor", "Draf AI - perlu verifikasi"];
const STATUS = { draft: ["Draf", "bg-[#F1F1F5] text-[#68748C]"], review: ["Ditinjau", "bg-[#FFF4DC] text-[#E08A2E]"], published: ["Terbit", "bg-[#E3F7F2] text-[#2BA58E]"] };

const refsToText = (refs) => (refs || []).map((r) => [r.title, r.institution, r.url, r.published, r.accessed].join(" | ")).join("\n");
const textToRefs = (t) => t.split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((x) => x[0]).map(([title, institution = "", url = "", published = "", accessed = ""]) => ({ title, institution, url, published, accessed }));

const Field = ({ label, children }) => <label className="block text-xs font-bold text-[#68748C]">{label}<div className="mt-1 font-normal text-[#19264C]">{children}</div></label>;

const PostForm = ({ initial, onClose, onSaved }) => {
  const api = useApi();
  const [f, setF] = useState({ ...EMPTY, ...initial });
  const [refs, setRefs] = useState(refsToText(initial.references));
  const set = (k) => (e) => setF({ ...f, [k]: k === "read_min" ? Number(e.target.value) : e.target.value });
  const save = async (e) => {
    e.preventDefault();
    const body = Object.fromEntries(KEYS.map((k) => [k, f[k] ?? EMPTY[k]]));
    body.references = textToRefs(refs);
    if (body.status === "published" && body.review_status === "Draf AI - perlu verifikasi") return toast.error("Ubah status editorial setelah fakta diverifikasi sebelum menerbitkan.");
    try { if (f.id) await api.put(`/admin/posts/${f.id}`, body); else await api.post("/admin/posts", body); toast.success("Tersimpan"); onSaved(); onClose(); }
    catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <form onSubmit={save} className="space-y-3" data-testid="admin-post-form">
      <div className="grid grid-cols-3 gap-3">
        <Field label="Jenis"><select value={f.kind} onChange={set("kind")} className={sel} data-testid="admin-post-kind"><option value="learn">Modul (Learn)</option><option value="news">Berita (Update)</option></select></Field>
        <Field label="Status"><select value={f.status} onChange={set("status")} className={sel} data-testid="admin-post-status"><option value="draft">Draf</option><option value="review">Ditinjau</option><option value="published">Terbit</option></select></Field>
        <Field label="Jadwal terbit"><Input type="date" value={f.publish_at} onChange={set("publish_at")} data-testid="admin-post-publish-at" /></Field>
      </div>
      <Field label="Judul"><Input required minLength={3} value={f.title} onChange={set("title")} data-testid="admin-post-title" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kategori"><Input required value={f.category} onChange={set("category")} data-testid="admin-post-category" /></Field>
        <Field label="Status editorial"><select value={f.review_status} onChange={set("review_status")} className={sel} data-testid="admin-post-review">{REVIEW.map((r) => <option key={r}>{r}</option>)}</select></Field>
      </div>
      <Field label="Ringkasan"><Input value={f.summary} onChange={set("summary")} data-testid="admin-post-summary" /></Field>
      <Field label="Isi (Markdown: ## judul bagian, - poin, **tebal**)"><Textarea required minLength={10} value={f.content} onChange={set("content")} className="min-h-64 font-mono text-xs" data-testid="admin-post-content" /></Field>
      <Field label="Referensi (satu per baris: Judul | Lembaga | URL | Tanggal terbit | Tanggal akses)"><Textarea value={refs} onChange={(e) => setRefs(e.target.value)} className="min-h-20 text-xs" data-testid="admin-post-references" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Nama sumber asli"><Input value={f.source_name} onChange={set("source_name")} /></Field>
        <Field label="Tanggal terbit asli"><Input value={f.original_date} onChange={set("original_date")} /></Field>
        <Field label="Tautan sumber / baca selengkapnya"><Input value={f.link} onChange={set("link")} /></Field>
        <Field label="File PDF/PPT (tautan Google Drive)"><Input value={f.attachment_url} onChange={set("attachment_url")} data-testid="admin-post-attachment" /></Field>
        <Field label="Video YouTube resmi"><Input value={f.video_url} onChange={set("video_url")} /></Field>
        <Field label="Tinjau ulang sebelum (pengingat)"><Input type="date" value={f.expires_at} onChange={set("expires_at")} /></Field>
        <Field label="Judul SEO"><Input value={f.seo_title} onChange={set("seo_title")} /></Field>
        <Field label="Deskripsi SEO"><Input value={f.seo_description} onChange={set("seo_description")} /></Field>
        <Field label="Ilustrasi SMILO"><select value={f.cover} onChange={set("cover")} className={sel}>{POSES.map((p) => <option key={p} value={p}>{POSE_LABEL[p]}</option>)}</select></Field>
        <Field label="Menit baca"><Input type="number" min={1} max={60} value={f.read_min} onChange={set("read_min")} /></Field>
      </div>
      <button className="sal-btn-primary w-full" data-testid="admin-post-save">Simpan</button>
    </form>
  );
};

const AiDraft = ({ onDone }) => {
  const api = useApi();
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("GenRe");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { const r = await api.post("/admin/ai/draft", { topic, category }, { timeout: 180000 }); toast.success(`Draf ${r.data.words} kata dibuat. Verifikasi fakta sebelum terbit.`); setTopic(""); onDone(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="mt-4 flex flex-wrap gap-2 rounded-2xl bg-[#FFF4DC] p-4" data-testid="ai-draft-panel">
      <p className="w-full text-xs font-bold"><Sparkles className="mr-1 inline h-3.5 w-3.5" />Asisten AI: buat draf modul terstruktur (13 bagian). Draf tidak pernah terbit otomatis; tanda [PERLU SUMBER] wajib diisi editor.</p>
      <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Topik, mis. Cara mendirikan PIK-R" className="min-w-52 flex-1 bg-white" data-testid="ai-draft-topic" />
      <Input value={category} onChange={(e) => setCategory(e.target.value)} className="w-40 bg-white" data-testid="ai-draft-category" />
      <button disabled={busy || topic.length < 3} onClick={go} className="sal-btn-orange disabled:opacity-50" data-testid="ai-draft-btn">{busy ? "Menulis... (±1 menit)" : "Buat draf"}</button>
    </div>
  );
};

export default function PostsAdmin() {
  const api = useApi();
  const [rows, setRows] = useState([]);
  const [edit, setEdit] = useState(null);
  const [versions, setVersions] = useState(null);
  const load = useCallback(() => api.get("/admin/posts").then((r) => setRows(r.data)).catch(() => {}), [api]);
  useEffect(() => { load(); }, [load]);
  const openEdit = async (p) => setEdit((await api.get(`/posts/${p.id}`)).data);
  const del = async (id) => { if (!window.confirm("Hapus konten ini?")) return; try { await api.delete(`/admin/posts/${id}`); toast.success("Dihapus"); load(); } catch (e) { toast.error(errMsg(e)); } };
  const showVersions = async (p) => setVersions({ title: p.title, rows: (await api.get(`/admin/posts/${p.id}/versions`)).data });
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div className="sal-card p-6">
      <div className="flex items-center justify-between"><p className="font-bold">Konten ({rows.length})</p>
        <button onClick={() => setEdit(EMPTY)} className="sal-btn-primary !py-2" data-testid="admin-post-new"><Plus className="h-4 w-4" />Tulis baru</button></div>
      <AiDraft onDone={load} />
      <div className="mt-4 divide-y divide-[#EDE6FF]">
        {rows.map((p) => {
          const st = STATUS[p.status || "published"];
          return (
            <div key={p.id} className="flex flex-wrap items-center gap-2 py-3" data-testid={`admin-post-row-${p.id}`}>
              <span className={`sal-pill ${st[1]}`}>{st[0]}</span>
              <span className="sal-pill bg-[#F5F0FF] text-[#7552D6]">{p.kind === "news" ? "Berita" : "Modul"}</span>
              {p.expires_at && p.expires_at <= today && <span className="sal-pill bg-[#FDE7E7] text-[#D86A68]">Perlu ditinjau ulang</span>}
              <div className="min-w-0 flex-1"><p className="truncate font-semibold">{p.title}</p><p className="text-xs text-[#68748C]">{p.review_status || "-"} · {p.category} · {fmtDate(p.updated_at || p.created_at)}</p></div>
              <Link to={`/${p.kind === "news" ? "update" : "learn"}/${p.id}`} className="rounded-full p-2 hover:bg-[#F5F0FF]" title="Pratinjau"><Eye className="h-4 w-4" /></Link>
              <button onClick={() => showVersions(p)} className="rounded-full p-2 hover:bg-[#F5F0FF]" title="Riwayat versi" data-testid={`admin-post-versions-${p.id}`}><History className="h-4 w-4" /></button>
              <button onClick={() => openEdit(p)} className="rounded-full p-2 hover:bg-[#F5F0FF]" data-testid={`admin-post-edit-${p.id}`}><Pencil className="h-4 w-4" /></button>
              <button onClick={() => del(p.id)} className="rounded-full p-2 text-[#D86A68] hover:bg-[#FDE7E7]" data-testid={`admin-post-delete-${p.id}`}><Trash2 className="h-4 w-4" /></button>
            </div>
          );
        })}
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit konten" : "Konten baru"}</DialogTitle></DialogHeader>
          {edit && <PostForm initial={edit} onClose={() => setEdit(null)} onSaved={load} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!versions} onOpenChange={(o) => !o && setVersions(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle>Riwayat versi: {versions?.title}</DialogTitle></DialogHeader>
          {versions?.rows.length === 0 && <p className="text-sm text-[#68748C]">Belum ada versi sebelumnya.</p>}
          {versions?.rows.map((v, i) => <details key={i} className="rounded-xl bg-[#F5F0FF]/60 p-3 text-sm"><summary className="cursor-pointer font-semibold">{fmtDate(v.saved_at)} {v.saved_at.slice(11, 16)} · {v.saved_by} · {v.status}</summary><pre className="mt-2 whitespace-pre-wrap text-xs">{v.content.slice(0, 3000)}</pre></details>)}
        </DialogContent>
      </Dialog>
    </div>
  );
}
