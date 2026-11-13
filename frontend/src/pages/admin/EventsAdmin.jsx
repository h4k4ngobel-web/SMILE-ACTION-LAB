import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { useApi, fmtDate, errMsg } from "@/lib/api";
import { POSES, POSE_LABEL } from "@/components/brand/Smilo";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { sel } from "@/pages/admin/PostsAdmin";
import { PROVINCES } from "@/pages/PikrHub";
import { EVENT_TYPES, STATUS_TONE } from "@/pages/Update";

const EMPTY = { title: "", date: "", end_date: "", time: "", location: "", province: "Nasional", mode: "Online", event_type: "Webinar", education_level: "Semua", organizer: "",
  description: "", eligibility: "", reg_deadline: "", registration_link: "", source_url: "", last_verified: "", verified: false, cancelled: false, cover: "invite", quota: 100 };
const FIELDS = Object.keys(EMPTY);
const L = ({ t, children }) => <label className="block text-xs font-bold text-[#68748C]">{t}<div className="mt-1 font-normal text-[#19264C]">{children}</div></label>;

const EventForm = ({ initial, onClose, onSaved }) => {
  const api = useApi();
  const [f, setF] = useState({ ...EMPTY, ...initial });
  const set = (k) => (e) => setF({ ...f, [k]: k === "quota" ? Number(e.target.value) : e.target.value });
  const save = async (e) => {
    e.preventDefault();
    if (f.verified && !f.source_url.startsWith("https://")) return toast.error("Event terverifikasi wajib punya URL sumber resmi (https).");
    const body = Object.fromEntries(FIELDS.map((k) => [k, f[k] ?? EMPTY[k]]));
    try { if (f.id) await api.put(`/admin/events/${f.id}`, body); else await api.post("/admin/events", body); toast.success("Tersimpan"); onSaved(); onClose(); }
    catch (err) { toast.error(errMsg(err)); }
  };
  return (
    <form onSubmit={save} className="space-y-3" data-testid="admin-event-form">
      <L t="Judul"><Input required minLength={3} value={f.title} onChange={set("title")} data-testid="admin-event-title" /></L>
      <div className="grid grid-cols-3 gap-3">
        <L t="Tanggal mulai"><Input required type="date" value={f.date} onChange={set("date")} data-testid="admin-event-date" /></L>
        <L t="Tanggal selesai"><Input type="date" value={f.end_date} onChange={set("end_date")} /></L>
        <L t="Batas daftar"><Input type="date" value={f.reg_deadline} onChange={set("reg_deadline")} data-testid="admin-event-deadline" /></L>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <L t="Penyelenggara"><Input required value={f.organizer} onChange={set("organizer")} data-testid="admin-event-organizer" /></L>
        <L t="Jam"><Input value={f.time} onChange={set("time")} /></L>
        <L t="Lokasi"><Input required value={f.location} onChange={set("location")} data-testid="admin-event-location" /></L>
        <L t="Provinsi"><select value={f.province} onChange={set("province")} className={sel}><option>Nasional</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select></L>
        <L t="Mode"><select value={f.mode} onChange={set("mode")} className={sel}><option>Online</option><option>Offline</option><option>Hybrid</option></select></L>
        <L t="Jenis"><select value={f.event_type} onChange={set("event_type")} className={sel}>{EVENT_TYPES.map((t) => <option key={t}>{t}</option>)}</select></L>
        <L t="Jenjang"><select value={f.education_level} onChange={set("education_level")} className={sel}>{["Semua", "SMP", "SMA/SMK", "Mahasiswa", "Umum"].map((t) => <option key={t}>{t}</option>)}</select></L>
        <L t="Kuota catatan internal"><Input type="number" min={1} value={f.quota} onChange={set("quota")} /></L>
      </div>
      <L t="Deskripsi"><Textarea value={f.description} onChange={set("description")} /></L>
      <L t="Syarat peserta"><Input value={f.eligibility} onChange={set("eligibility")} /></L>
      <L t="Tautan pendaftaran resmi"><Input value={f.registration_link} onChange={set("registration_link")} data-testid="admin-event-reglink" /></L>
      <L t="URL sumber resmi (wajib untuk terbit)"><Input value={f.source_url} onChange={set("source_url")} data-testid="admin-event-source" /></L>
      <div className="grid grid-cols-2 gap-3">
        <L t="Tanggal verifikasi terakhir"><Input type="date" value={f.last_verified} onChange={set("last_verified")} /></L>
        <L t="Ilustrasi"><select value={f.cover} onChange={set("cover")} className={sel}>{POSES.map((p) => <option key={p} value={p}>{POSE_LABEL[p]}</option>)}</select></L>
      </div>
      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2"><Switch checked={f.verified} onCheckedChange={(v) => setF({ ...f, verified: v, last_verified: v ? new Date().toISOString().slice(0, 10) : f.last_verified })} data-testid="admin-event-verified" />Terverifikasi (tampil publik)</label>
        <label className="flex items-center gap-2"><Switch checked={f.cancelled} onCheckedChange={(v) => setF({ ...f, cancelled: v })} />Dibatalkan</label>
      </div>
      <button className="sal-btn-primary w-full" data-testid="admin-event-save">Simpan</button>
    </form>
  );
};

export default function EventsAdmin() {
  const api = useApi();
  const [rows, setRows] = useState([]);
  const [edit, setEdit] = useState(null);
  const [regs, setRegs] = useState(null);
  const load = useCallback(() => api.get("/admin/events").then((r) => setRows(r.data)).catch(() => {}), [api]);
  useEffect(() => { load(); }, [load]);
  const del = async (id) => { if (!window.confirm("Hapus event ini beserta pendaftarnya?")) return; await api.delete(`/admin/events/${id}`); toast.success("Dihapus"); load(); };
  const showRegs = async (e) => setRegs({ title: e.title, rows: (await api.get(`/admin/events/${e.id}/registrations`)).data });
  return (
    <div className="sal-card p-6">
      <div className="flex items-center justify-between"><div><p className="font-bold">Event & peluang ({rows.length})</p><p className="text-xs text-[#68748C]">Hanya event terverifikasi dengan sumber resmi yang tampil publik. Status dihitung otomatis dari tanggal.</p></div>
        <button onClick={() => setEdit(EMPTY)} className="sal-btn-primary !py-2" data-testid="admin-event-new"><Plus className="h-4 w-4" />Tambah</button></div>
      <div className="mt-4 divide-y divide-[#EDE6FF]">
        {rows.length === 0 && <p className="py-3 text-sm text-[#68748C]">Belum ada event. Tambahkan event nyata beserta tautan sumber resminya.</p>}
        {rows.map((e) => (
          <div key={e.id} className="flex flex-wrap items-center gap-2 py-3" data-testid={`admin-event-row-${e.id}`}>
            <span className={`sal-pill ${STATUS_TONE[e.status]}`}>{e.status}</span>
            {e.link_ok === false && <span className="sal-pill bg-[#FDE7E7] text-[#D86A68]">Tautan rusak</span>}
            {e.link_expired && <span className="sal-pill bg-[#FDE7E7] text-[#D86A68]">Pendaftaran lewat</span>}
            <div className="min-w-0 flex-1"><p className="truncate font-semibold">{e.title}</p><p className="text-xs text-[#68748C]">{fmtDate(e.date)} · {e.organizer} · {e.registered} tercatat</p></div>
            <button onClick={() => showRegs(e)} className="rounded-full p-2 hover:bg-[#F5F0FF]" data-testid={`admin-event-regs-${e.id}`}><Users className="h-4 w-4" /></button>
            <button onClick={() => setEdit(e)} className="rounded-full p-2 hover:bg-[#F5F0FF]" data-testid={`admin-event-edit-${e.id}`}><Pencil className="h-4 w-4" /></button>
            <button onClick={() => del(e.id)} className="rounded-full p-2 text-[#D86A68] hover:bg-[#FDE7E7]" data-testid={`admin-event-delete-${e.id}`}><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      <Dialog open={!!edit} onOpenChange={(o) => !o && setEdit(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle>{edit?.id ? "Edit event" : "Event baru"}</DialogTitle></DialogHeader>
          {edit && <EventForm initial={edit} onClose={() => setEdit(null)} onSaved={load} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!regs} onOpenChange={(o) => !o && setRegs(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
          <DialogHeader><DialogTitle>Pendaftar: {regs?.title}</DialogTitle></DialogHeader>
          <div className="space-y-2" data-testid="admin-event-regs-list">
            {regs?.rows.length === 0 && <p className="text-sm text-[#68748C]">Belum ada pendaftar.</p>}
            {regs?.rows.map((r) => <div key={r.id} className="rounded-xl bg-[#F5F0FF]/60 px-3 py-2 text-sm"><b>{r.name}</b> · {r.email}<p className="text-xs text-[#68748C]">{r.phone || "-"} · {r.institution || "-"}</p></div>)}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
