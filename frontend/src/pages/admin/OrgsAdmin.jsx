import { useCallback, useEffect, useState } from "react";
import { Check, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useApi, fmtDate, errMsg } from "@/lib/api";

const STATUS = { pending: ["Menunggu", "bg-[#FFF4DC] text-[#E08A2E]"], verified: ["Terverifikasi", "bg-[#E3F7F2] text-[#2BA58E]"], rejected: ["Ditolak", "bg-[#FDE7E7] text-[#D86A68]"] };

const OrgRow = ({ o, reload }) => {
  const api = useApi();
  const [note, setNote] = useState(o.admin_note || "");
  const setStatus = async (status) => {
    try { await api.patch(`/admin/orgs/${o.id}`, { status, admin_note: note }); toast.success(status === "verified" ? "PIK-R diverifikasi, email terkirim" : "PIK-R ditolak, email terkirim"); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  const del = async () => { if (!window.confirm("Hapus PIK-R ini?")) return; await api.delete(`/admin/orgs/${o.id}`); reload(); };
  return (
    <div className="rounded-2xl border border-[#EDE6FF] p-4" data-testid={`admin-org-row-${o.id}`}>
      <div className="flex flex-wrap items-center gap-2">
        <p className="flex-1 font-bold">{o.name}</p>
        <span className={`sal-pill ${STATUS[o.status][1]}`}>{STATUS[o.status][0]}</span>
      </div>
      <p className="mt-1 text-sm text-[#68748C]">{o.institution} · {o.city}, {o.province} · {o.category}</p>
      <p className="mt-1 text-sm">{o.description}</p>
      <p className="mt-1 text-xs text-[#68748C]">Kontak: {o.contact} · Pengaju: {o.owner_email || "-"} · {fmtDate(o.created_at)}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Catatan untuk pengurus (opsional)" className="min-w-0 flex-1 rounded-full border border-[#EDE6FF] px-4 py-2 text-sm" data-testid={`admin-org-note-${o.id}`} />
        <button onClick={() => setStatus("verified")} className="sal-btn !py-2 bg-[#70D6C3] text-[#19264C]" data-testid={`admin-org-verify-${o.id}`}><Check className="h-4 w-4" />Verifikasi</button>
        <button onClick={() => setStatus("rejected")} className="sal-btn !py-2 bg-[#F6B6B5] text-[#19264C]" data-testid={`admin-org-reject-${o.id}`}><X className="h-4 w-4" />Tolak</button>
        <button onClick={del} className="rounded-full p-2 text-[#D86A68] hover:bg-[#FDE7E7]" data-testid={`admin-org-delete-${o.id}`}><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

export default function OrgsAdmin() {
  const api = useApi();
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const load = useCallback(() => api.get("/admin/orgs", { params: { status } }).then((r) => setRows(r.data)).catch(() => {}), [api, status]);
  useEffect(() => { load(); }, [load]);
  return (
    <div className="sal-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <p className="mr-auto font-bold">Verifikasi PIK-R</p>
        {[["pending", "Menunggu"], ["verified", "Terverifikasi"], ["rejected", "Ditolak"], ["", "Semua"]].map(([v, l]) => (
          <button key={v || "all"} onClick={() => setStatus(v)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${status === v ? "bg-[#7552D6] text-white" : "bg-[#F5F0FF]"}`} data-testid={`admin-org-filter-${v || "all"}`}>{l}</button>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-sm text-[#68748C]">Tidak ada data.</p>}
        {rows.map((o) => <OrgRow key={o.id} o={o} reload={load} />)}
      </div>
    </div>
  );
}
