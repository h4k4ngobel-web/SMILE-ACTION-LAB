import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSafeAuth } from "@/lib/auth";
import { ArrowLeft, CalendarDays, MapPin, Users, CheckCircle2, Building2, ExternalLink } from "lucide-react";
import { STATUS_TONE } from "@/pages/Update";
import { toast } from "sonner";
import { useApi, useMe, fmtDate, errMsg } from "@/lib/api";
import { Loading, EmptyState } from "@/components/common";
import { SmiloCover } from "@/components/brand/Smilo";
import { Input } from "@/components/ui/input";

export default function EventDetail() {
  const { id } = useParams();
  const api = useApi();
  const { isSignedIn, isLoaded } = useSafeAuth();
  const { refresh } = useMe();
  const [e, setE] = useState(undefined);
  const [form, setForm] = useState({ phone: "", institution: "" });
  const [busy, setBusy] = useState(false);

  const load = () => api.get(`/events/${id}`).then((r) => setE(r.data)).catch(() => setE(null));
  useEffect(() => { if (isLoaded) load(); }, [api, id, isLoaded]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async (ev) => {
    ev.preventDefault(); setBusy(true);
    try { await api.post(`/events/${id}/register`, form); toast.success("Pendaftaran berhasil! Cek email konfirmasimu."); load(); refresh(); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };

  if (e === undefined) return <Loading />;
  if (e === null) return <div className="sal-container py-16"><EmptyState title="Event tidak ditemukan" /></div>;
  const full = e.registered >= e.quota;
  const open = ["Pendaftaran dibuka", "Akan datang"].includes(e.status);
  return (
    <div className="sal-container max-w-5xl py-10" data-testid="event-detail-page">
      <Link to="/update" className="inline-flex items-center gap-1 text-sm font-bold text-[#7552D6]"><ArrowLeft className="h-4 w-4" />Smile Update</Link>
      <div className="mt-5 grid gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SmiloCover pose={e.cover} className="h-60 rounded-[32px]" />
          <span className="sal-pill mt-6 bg-[#FFF4DC] text-[#E08A2E]">{e.mode}</span>
          <h1 className="mt-3 text-4xl font-bold leading-tight" data-testid="event-title">{e.title}</h1>
          <div className="mt-4 space-y-2 text-[#68748C]">
            <p className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-[#7552D6]" />{fmtDate(e.date)} {e.time && `· ${e.time}`}</p>
            <p className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[#7552D6]" />{e.location}</p>
            <p className="flex items-center gap-2"><Building2 className="h-4 w-4 text-[#7552D6]" />{e.organizer}</p>
            <p className="flex items-center gap-2"><Users className="h-4 w-4 text-[#7552D6]" /><span data-testid="event-registered-count">{e.registered}</span>/{e.quota} peserta via SMILE ACTION LAB</p>
          </div>
          <span className={`sal-pill mt-4 ${STATUS_TONE[e.status]}`} data-testid="event-status-badge">{e.status}</span>
          <p className="mt-6 whitespace-pre-line leading-relaxed">{e.description}</p>
          <div className="sal-card mt-6 space-y-1.5 p-5 text-sm" data-testid="event-verification">
            {e.eligibility && <p><b>Syarat peserta:</b> {e.eligibility}</p>}
            {e.reg_deadline && <p><b>Batas pendaftaran:</b> {fmtDate(e.reg_deadline)}{e.link_expired ? " (sudah lewat)" : ""}</p>}
            <p><b>Jenis & jenjang:</b> {e.event_type} · {e.education_level} · {e.province}</p>
            {e.source_url && <p><b>Sumber resmi:</b> <a href={e.source_url} target="_blank" rel="noreferrer" className="font-semibold text-[#7552D6] underline" data-testid="event-source-link">{new URL(e.source_url).hostname}</a></p>}
            {e.last_verified && <p className="text-xs text-[#68748C]">Terakhir diverifikasi {fmtDate(e.last_verified)}</p>}
            {e.link_ok === false && <p className="text-xs font-bold text-[#D86A68]">Tautan pendaftaran tidak dapat diakses saat pengecekan terakhir.</p>}
          </div>
        </div>
        <div className="sal-card h-fit p-6" data-testid="event-register-panel">
          {e.registration_link && open ? (
            <div className="mb-4 text-center"><a href={e.registration_link} target="_blank" rel="noreferrer" className="sal-btn-orange w-full" data-testid="event-external-register">Daftar di situs penyelenggara <ExternalLink className="h-4 w-4" /></a></div>
          ) : null}
          {!open ? <p className="text-center font-bold">Event ini {e.status.toLowerCase()}.</p> : e.is_registered ? (
            <div className="text-center"><CheckCircle2 className="mx-auto h-12 w-12 text-[#2BA58E]" /><p className="mt-3 text-lg font-bold" data-testid="event-registered-msg">Kamu sudah tercatat!</p><p className="text-sm text-[#68748C]">Email konfirmasi sudah dikirim.{e.registration_link ? " Pastikan juga mendaftar di situs penyelenggara." : ""}</p></div>
          ) : !isSignedIn ? (
            <div className="text-center"><p className="font-bold">Daftar event ini</p><p className="mt-1 text-sm text-[#68748C]">Masuk dulu agar pendaftaranmu tercatat.</p><Link to="/sign-in" className="sal-btn-primary mt-4" data-testid="event-login-btn">Masuk untuk daftar</Link></div>
          ) : full ? <p className="text-center font-bold">Kuota sudah penuh</p> : (
            <form onSubmit={submit} className="space-y-3">
              <p className="text-lg font-bold">{e.registration_link ? "Ingatkan aku & catat di dashboard" : "Form pendaftaran"}</p>
              <Input placeholder="No. WhatsApp (opsional)" value={form.phone} onChange={(x) => setForm({ ...form, phone: x.target.value })} data-testid="event-phone-input" />
              <Input placeholder="Sekolah / kampus / PIK-R (opsional)" value={form.institution} onChange={(x) => setForm({ ...form, institution: x.target.value })} data-testid="event-institution-input" />
              <button disabled={busy} className="sal-btn-orange w-full disabled:opacity-50" data-testid="event-register-btn">{busy ? "Mendaftar..." : "Daftar sekarang (+15 XP)"}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
