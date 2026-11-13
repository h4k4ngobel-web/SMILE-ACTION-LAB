import { useCallback, useEffect, useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { useApi, fmtDate, errMsg } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

const Row = ({ s, reload }) => {
  const api = useApi();
  const [f, setF] = useState({ name: s.name, institution: s.institution, url: s.url, feed_url: s.feed_url || "", active: s.active });
  const save = async () => { try { await api.put(`/admin/sources/${s.id}`, f); toast.success("Sumber disimpan"); reload(); } catch (e) { toast.error(errMsg(e)); } };
  const del = async () => { if (!window.confirm("Hapus sumber?")) return; try { await api.delete(`/admin/sources/${s.id}`); reload(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div className="rounded-2xl border border-[#EDE6FF] p-4" data-testid={`source-row-${s.id}`}>
      <div className="grid gap-2 md:grid-cols-2">
        <Input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Input value={f.institution} onChange={(e) => setF({ ...f, institution: e.target.value })} />
        <Input value={f.url} onChange={(e) => setF({ ...f, url: e.target.value })} />
        <Input value={f.feed_url} onChange={(e) => setF({ ...f, feed_url: e.target.value })} placeholder="URL RSS resmi (opsional)" data-testid={`source-feed-${s.id}`} />
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-[#68748C]">
        <label className="flex items-center gap-2"><Switch checked={f.active} onCheckedChange={(v) => setF({ ...f, active: v })} />Aktif</label>
        <span>Cek terakhir: {s.last_checked ? fmtDate(s.last_checked) : "belum"}</span>
        {s.last_error && <span className="text-[#D86A68]">{s.last_error}</span>}
        <button onClick={save} className="sal-btn-primary !py-1.5 ml-auto text-xs" data-testid={`source-save-${s.id}`}><Save className="h-3.5 w-3.5" />Simpan</button>
        <button onClick={del} className="rounded-full p-2 text-[#D86A68]"><Trash2 className="h-4 w-4" /></button>
      </div>
    </div>
  );
};

export default function SourcesAdmin() {
  const api = useApi();
  const [rows, setRows] = useState([]);
  const [n, setN] = useState({ name: "", institution: "", url: "https://", feed_url: "", active: true });
  const load = useCallback(() => api.get("/admin/sources").then((r) => setRows(r.data)).catch(() => {}), [api]);
  useEffect(() => { load(); }, [load]);
  const add = async () => { try { await api.post("/admin/sources", n); setN({ name: "", institution: "", url: "https://", feed_url: "", active: true }); load(); } catch (e) { toast.error(errMsg(e)); } };
  return (
    <div className="sal-card p-6">
      <p className="font-bold">Sumber terpercaya ({rows.length})</p>
      <p className="text-xs text-[#68748C]">Penemuan konten hanya membaca RSS publik dan menghormati robots.txt. Situs tanpa RSS tetap bisa dikurasi manual lewat tab Konten.</p>
      <div className="mt-4 grid gap-2 rounded-2xl bg-[#F5F0FF]/60 p-4 md:grid-cols-5">
        <Input placeholder="Nama" value={n.name} onChange={(e) => setN({ ...n, name: e.target.value })} data-testid="source-new-name" />
        <Input placeholder="Lembaga" value={n.institution} onChange={(e) => setN({ ...n, institution: e.target.value })} data-testid="source-new-institution" />
        <Input placeholder="https://situs" value={n.url} onChange={(e) => setN({ ...n, url: e.target.value })} data-testid="source-new-url" />
        <Input placeholder="URL RSS (opsional)" value={n.feed_url} onChange={(e) => setN({ ...n, feed_url: e.target.value })} data-testid="source-new-feed" />
        <button onClick={add} className="sal-btn-primary" data-testid="source-add-btn"><Plus className="h-4 w-4" />Tambah</button>
      </div>
      <div className="mt-4 space-y-3">{rows.map((s) => <Row key={s.id} s={s} reload={load} />)}</div>
    </div>
  );
}
