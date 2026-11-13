import { useCallback, useEffect, useState } from "react";
import { Users, MessageCircleHeart, FileText, CalendarDays, School, ShieldAlert, Check, Ticket, Hourglass } from "lucide-react";
import { toast } from "sonner";
import { useApi, fmtDate, errMsg } from "@/lib/api";
import { Loading } from "@/components/common";
import { Smilo } from "@/components/brand/Smilo";

const CARDS = [["users", "Total pengguna", Users], ["talk_sessions", "Sesi SMILE TALK", MessageCircleHeart], ["posts", "Total konten", FileText], ["drafts", "Draf & ditinjau", FileText],
  ["review_queue", "Antrian review", Hourglass], ["expiring", "Perlu ditinjau ulang", Hourglass], ["events", "Event", CalendarDays], ["registrations", "Pendaftar event", Ticket],
  ["orgs_verified", "PIK-R terverifikasi", School], ["orgs_pending", "PIK-R menunggu", Hourglass], ["handover_open", "Minta konselor", ShieldAlert], ["flags_open", "Kasus mendesak", ShieldAlert]];

export default function Overview() {
  const api = useApi();
  const [stats, setStats] = useState(null);
  const [flags, setFlags] = useState(null);
  const load = useCallback(() => {
    api.get("/admin/stats").then((r) => setStats(r.data)).catch(() => {});
    api.get("/admin/flags").then((r) => setFlags(r.data)).catch(() => setFlags(null));
  }, [api]);
  useEffect(() => { load(); }, [load]);
  const handle = async (id) => { try { await api.patch(`/admin/flags/${id}`); toast.success("Ditandai sudah ditangani"); load(); } catch (e) { toast.error(errMsg(e)); } };
  if (!stats) return <Loading />;
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {CARDS.map(([k, l, I]) => (
          <div key={k} className="sal-card flex items-center gap-4 p-5" data-testid={`admin-stat-${k}`}>
            <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${k === "flags_open" && stats[k] ? "bg-[#FDE7E7] text-[#D86A68]" : "bg-[#F5F0FF] text-[#7552D6]"}`}><I className="h-5 w-5" /></div>
            <div><p className="text-xs text-[#68748C]">{l}</p><p className="font-display text-2xl font-bold">{stats[k]}</p></div>
          </div>
        ))}
      </div>
      {flags !== null && <div className="sal-card p-6" data-testid="admin-flags">
        <p className="flex items-center gap-2 font-bold"><ShieldAlert className="h-5 w-5 text-[#D86A68]" />Kasus mendesak SMILE TALK</p>
        <p className="mt-1 text-xs text-[#68748C]">Sesi yang ditandai prioritas keselamatan. Email hanya dikirim jika notifikasi dikonfigurasi; isi percakapan tidak disertakan.</p>
        <div className="mt-4 space-y-3">
          {flags.length === 0 && <div className="flex items-center gap-3 text-sm text-[#68748C]"><Smilo pose="rest" className="h-16" />Tidak ada kasus. Semua aman.</div>}
          {flags.map((f) => (
            <div key={f.id} className={`flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center ${f.handled ? "border-[#EDE6FF] opacity-60" : "border-[#F6B6B5] bg-[#FDE7E7]/50"}`} data-testid={`admin-flag-${f.id}`}>
              <div className="flex-1 text-sm">
                <p className="font-bold">{f.is_anonymous ? "Pengguna anonim" : "Pengguna terdaftar"} · {fmtDate(f.flagged_at)}</p>
                <p className="mt-1 text-[#68748C]">Buka antrean konseling untuk membaca percakapan secara aman.</p>
              </div>
              {f.handled ? <span className="sal-pill bg-[#E3F7F2] text-[#2BA58E]">Ditangani</span> :
                <button onClick={() => handle(f.id)} className="sal-btn-primary !py-2 text-xs" data-testid={`admin-flag-handle-${f.id}`}><Check className="h-4 w-4" />Tandai ditangani</button>}
            </div>
          ))}
        </div>
      </div>}
    </div>
  );
}
