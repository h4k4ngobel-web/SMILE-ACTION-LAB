import { useEffect, useState } from "react";
import { useApi, fmtDate } from "@/lib/api";

export default function AuditAdmin() {
  const api = useApi();
  const [rows, setRows] = useState([]);
  useEffect(() => { api.get("/admin/audit").then((r) => setRows(r.data)).catch(() => {}); }, [api]);
  return (
    <div className="sal-card p-6">
      <p className="font-bold">Log audit rahasia</p>
      <p className="text-xs text-[#68748C]">Catatan siapa membuka atau membalas sesi konseling.</p>
      <div className="mt-4 divide-y divide-[#EDE6FF] text-sm">
        {rows.length === 0 && <p className="text-[#68748C]">Belum ada aktivitas.</p>}
        {rows.map((r) => <p key={r.id} className="py-2" data-testid="audit-row"><b>{r.actor}</b> ({r.role}) · {r.action} · sesi {r.target.slice(0, 8)} · {fmtDate(r.at)} {r.at.slice(11, 16)} UTC</p>)}
      </div>
    </div>
  );
}
