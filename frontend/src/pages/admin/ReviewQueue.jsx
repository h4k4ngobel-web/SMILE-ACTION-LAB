import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Check, X, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useApi, fmtDate, errMsg } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const Item = ({ d, reload }) => {
  const api = useApi();
  const [title, setTitle] = useState(d.title);
  const [summary, setSummary] = useState(d.summary);
  const [category, setCategory] = useState(d.category);
  const act = async (action) => {
    try { await api.patch(`/admin/discovery/${d.id}`, { action, title, summary, category }); toast.success(action === "approve" ? "Diterbitkan sebagai ringkasan" : "Ditolak"); reload(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <div className="rounded-2xl border border-[#EDE6FF] p-4" data-testid={`queue-item-${d.id}`}>
      <p className="text-xs font-bold text-[#68748C]">{d.institution} · terbit {d.published || "tanggal tidak tersedia"} · ditemukan {fmtDate(d.discovered_at)}</p>
      <Input value={title} onChange={(e) => setTitle(e.target.value)} className="mt-2 font-semibold" data-testid={`queue-title-${d.id}`} />
      <Textarea value={summary} onChange={(e) => setSummary(e.target.value)} className="mt-2 min-h-20 text-sm" placeholder="Tulis ulang ringkasan dengan kata-katamu sendiri" data-testid={`queue-summary-${d.id}`} />
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Input value={category} onChange={(e) => setCategory(e.target.value)} className="w-44" data-testid={`queue-category-${d.id}`} />
        <a href={d.link} target="_blank" rel="noreferrer" className="sal-pill bg-[#F5F0FF] text-[#7552D6]">Buka sumber <ExternalLink className="h-3 w-3" /></a>
        {d.status === "pending" && <>
          <button onClick={() => act("approve")} className="sal-btn !py-2 ml-auto bg-[#70D6C3] text-[#19264C]" data-testid={`queue-approve-${d.id}`}><Check className="h-4 w-4" />Setujui & terbitkan</button>
          <button onClick={() => act("reject")} className="sal-btn !py-2 bg-[#F6B6B5] text-[#19264C]" data-testid={`queue-reject-${d.id}`}><X className="h-4 w-4" />Tolak</button>
        </>}
      </div>
    </div>
  );
};

export default function ReviewQueue() {
  const api = useApi();
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => api.get("/admin/discovery", { params: { status } }).then((r) => setRows(r.data)).catch(() => {}), [api, status]);
  useEffect(() => { load(); }, [load]);
  const run = async () => {
    setBusy(true);
    try { const r = await api.post("/admin/discovery/run"); toast.success(`${r.data.new_items} konten baru ditemukan`); load(); } catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="sal-card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <div className="mr-auto"><p className="font-bold">Antrian review konten</p><p className="text-xs text-[#68748C]">Sumber resmi dicek otomatis tiap 12 jam. Tidak ada yang terbit tanpa persetujuan editor.</p></div>
        {[["pending", "Menunggu"], ["approved", "Disetujui"], ["rejected", "Ditolak"]].map(([v, l]) => <button key={v} onClick={() => setStatus(v)} className={`rounded-full px-4 py-1.5 text-sm font-semibold ${status === v ? "bg-[#7552D6] text-white" : "bg-[#F5F0FF]"}`} data-testid={`queue-filter-${v}`}>{l}</button>)}
        <button onClick={run} disabled={busy} className="sal-btn-primary !py-2" data-testid="queue-run-discovery"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />Cek sumber sekarang</button>
      </div>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-sm text-[#68748C]">Tidak ada item. Tambahkan URL RSS resmi di tab Sumber agar penemuan konten lebih banyak.</p>}
        {rows.map((d) => <Item key={d.id} d={d} reload={load} />)}
      </div>
    </div>
  );
}
