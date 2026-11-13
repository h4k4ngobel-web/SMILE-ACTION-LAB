import { useCallback, useEffect, useState } from "react";
import { ShieldAlert, HeartHandshake, Send, CheckCircle2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useApi, fmtDate, errMsg } from "@/lib/api";
import { Textarea } from "@/components/ui/textarea";

const LABEL = { user: "Remaja", assistant: "SMILO (AI)", counselor: "Konselor" };

const Thread = ({ sid, onClose }) => {
  const api = useApi();
  const [data, setData] = useState(null);
  const [text, setText] = useState("");
  const load = useCallback(() => api.get(`/counsel/sessions/${sid}`).then((r) => setData(r.data)).catch((e) => toast.error(errMsg(e))), [api, sid]);
  useEffect(() => { load(); }, [load]);
  const reply = async () => { try { await api.post(`/counsel/sessions/${sid}/reply`, { text }); setText(""); load(); } catch (e) { toast.error(errMsg(e)); } };
  const close = async () => {
    try { await api.patch(`/counsel/sessions/${sid}/close`); toast.success("Sesi ditutup"); onClose(); }
    catch (e) { toast.error(errMsg(e)); }
  };
  if (!data) return null;
  return (
    <div className="mt-4 rounded-2xl border border-[#EDE6FF] bg-[#FBFAFF] p-4" data-testid="counsel-thread">
      {data.session.handover_note && <p className="mb-3 rounded-xl bg-[#FFF4DC] p-3 text-sm"><b>Catatan remaja:</b> {data.session.handover_note}</p>}
      <div className="max-h-96 space-y-2 overflow-y-auto">
        {data.messages.map((m) => <div key={m.id} className={`rounded-xl p-3 text-sm ${m.role === "user" ? "bg-white" : m.role === "counselor" ? "bg-[#E3F7F2]" : "bg-[#F5F0FF]"}`}><p className="text-xs font-bold">{LABEL[m.role]} · {fmtDate(m.created_at)}</p><p className="mt-1 whitespace-pre-wrap">{m.text}</p></div>)}
      </div>
      <Textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-3" placeholder="Balas dengan empati. Jangan meminta data pribadi." data-testid="counsel-reply-input" />
      <div className="mt-2 flex gap-2">
        <button disabled={text.trim().length < 2} onClick={reply} className="sal-btn-primary !py-2 disabled:opacity-40" data-testid="counsel-reply-btn"><Send className="h-4 w-4" />Kirim balasan</button>
        <button onClick={close} className="sal-btn-ghost !py-2" data-testid="counsel-close-btn"><CheckCircle2 className="h-4 w-4" />Tutup sesi</button>
      </div>
    </div>
  );
};

export default function CounselAdmin() {
  const api = useApi();
  const [rows, setRows] = useState([]);
  const [open, setOpen] = useState(null);
  const load = useCallback(() => api.get("/counsel/queue").then((r) => setRows(r.data)).catch((e) => toast.error(errMsg(e))), [api]);
  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, [load]);
  return (
    <div className="sal-card p-6">
      <div className="flex items-center justify-between gap-3">
        <p className="font-bold">Antrian konseling</p>
        <button onClick={load} className="sal-btn-ghost !py-1.5 text-xs" data-testid="counsel-refresh"><RefreshCw className="h-3.5 w-3.5" />Segarkan</button>
      </div>
      <p className="text-xs text-[#68748C]">Hanya sesi yang meminta konselor atau terdeteksi darurat. Setiap pembukaan sesi tercatat di log audit. Untuk risiko keselamatan anak, ikuti prosedur rujukan lembaga (orang tua/wali, guru BK, layanan SAPA 129).</p>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-sm text-[#68748C]">Tidak ada sesi yang menunggu.</p>}
        {rows.map((s) => (
          <div key={s.id} className="rounded-2xl border border-[#EDE6FF] p-4" data-testid={`counsel-row-${s.id}`}>
            <div className="flex flex-wrap items-center gap-2">
              {s.flagged && <span className="sal-pill bg-[#FDE7E7] text-[#D86A68]"><ShieldAlert className="h-3 w-3" />Prioritas keselamatan</span>}
              {s.handover && !(s.flagged && !s.handled && s.handover === "closed") && <span className="sal-pill bg-[#E3F7F2] text-[#2BA58E]"><HeartHandshake className="h-3 w-3" />{s.handover === "requested" ? "Minta konselor" : s.handover === "active" ? "Sedang ditangani" : "Ditutup"}</span>}
              <span className="text-sm font-semibold">{s.is_anonymous ? "Anonim" : "Pengguna terdaftar"} · {fmtDate(s.updated_at)}</span>
              <button onClick={() => setOpen(open === s.id ? null : s.id)} className="sal-btn-ghost !py-1.5 ml-auto text-xs" data-testid={`counsel-open-${s.id}`}>{open === s.id ? "Sembunyikan" : "Buka percakapan"}</button>
            </div>
            {open === s.id && <Thread sid={s.id} onClose={() => { setOpen(null); load(); }} />}
          </div>
        ))}
      </div>
    </div>
  );
}
