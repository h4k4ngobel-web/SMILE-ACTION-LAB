import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircleHeart, BookOpen, Gamepad2, Newspaper, Award, Lock, CalendarDays, School, Bookmark, Pencil, ShieldCheck, Flame } from "lucide-react";
import { toast } from "sonner";
import { useApi, useMe, fmtDate, errMsg } from "@/lib/api";
import { Loading } from "@/components/common";
import { Smilo } from "@/components/brand/Smilo";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const TILES = [
  ["/talk", MessageCircleHeart, "Smile Talk", "Curhat ke SMILO", "#F5F0FF", "#7552D6"],
  ["/learn", BookOpen, "Smile Learn", "Materi GenRe", "#FFF4DC", "#E08A2E"],
  ["/play", Gamepad2, "Smile Play", "Game & kuis", "#E3F7F2", "#2BA58E"],
  ["/update", Newspaper, "Smile Update", "Berita & event", "#FDE7E7", "#D86A68"],
];
const STATUS = { pending: ["Menunggu", "bg-[#FFF4DC] text-[#E08A2E]"], verified: ["Terverifikasi", "bg-[#E3F7F2] text-[#2BA58E]"], rejected: ["Ditolak", "bg-[#FDE7E7] text-[#D86A68]"] };

const EditProfile = ({ me, onSaved }) => {
  const api = useApi();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ name: me.name || "", school: me.school || "", city: me.city || "" });
  const save = async () => {
    try { await api.patch("/me", f); toast.success("Profil disimpan"); setOpen(false); onSaved(); } catch (e) { toast.error(errMsg(e)); }
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button className="sal-btn-ghost !py-2 text-xs" data-testid="dashboard-edit-profile"><Pencil className="h-3.5 w-3.5" />Edit profil</button></DialogTrigger>
      <DialogContent className="rounded-3xl">
        <DialogHeader><DialogTitle>Edit profil</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <Input placeholder="Nama" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} data-testid="profile-name-input" />
          <Input placeholder="Sekolah / kampus" value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} data-testid="profile-school-input" />
          <Input placeholder="Kota" value={f.city} onChange={(e) => setF({ ...f, city: e.target.value })} data-testid="profile-city-input" />
          <button onClick={save} disabled={!f.name.trim()} className="sal-btn-primary w-full" data-testid="profile-save-btn">Simpan</button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Panel = ({ title, icon: I, children, testid }) => (
  <div className="sal-card p-6" data-testid={testid}>
    <p className="flex items-center gap-2 font-bold"><I className="h-5 w-5 text-[#7552D6]" />{title}</p>
    <div className="mt-4 space-y-2">{children}</div>
  </div>
);

export default function Dashboard() {
  const api = useApi();
  const { me, refresh } = useMe();
  const [act, setAct] = useState(null);
  useEffect(() => { api.get("/me/activity").then((r) => setAct(r.data)).catch(() => setAct({ registrations: [], orgs: [], bookmarks: [] })); }, [api]);
  if (!me) return <Loading />;
  const first = (me.name || "Sahabat").split(" ")[0];
  return (
    <div className="sal-sky min-h-screen pb-10" data-testid="dashboard-page">
      <div className="sal-container py-10">
        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="sal-card relative overflow-hidden p-7">
            <p className="sal-eyebrow">Dashboard</p>
            <h1 className="mt-2 text-4xl font-bold" data-testid="dashboard-greeting">Halo, {first}!</h1>
            <p className="mt-1 text-[#68748C]">Siap bertumbuh hari ini?</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <EditProfile me={me} onSaved={refresh} />
              {me.role !== "member" && <Link to="/admin" className="sal-btn-primary !py-2 text-xs" data-testid="dashboard-admin-link"><ShieldCheck className="h-3.5 w-3.5" />Content Studio</Link>}
              <span className="sal-pill bg-[#FFE9D6] text-[#E0592A]" data-testid="dashboard-streak"><Flame className="h-3.5 w-3.5" />SMILE Streak: {me.streak || 0} hari</span>
            </div>
            <Smilo pose="welcome" className="absolute -bottom-2 right-4 hidden h-40 sm:block" />
          </div>
          <div className="sal-card p-7" data-testid="dashboard-level-card">
            <div className="flex items-center justify-between">
              <div><p className="text-sm text-[#68748C]">Level</p><p className="font-display text-5xl font-bold text-[#7552D6]" data-testid="dashboard-level">{me.level}</p></div>
              <div className="text-right"><p className="text-sm text-[#68748C]">Total XP</p><p className="font-display text-3xl font-bold" data-testid="dashboard-xp">{me.xp}</p></div>
            </div>
            <Progress value={me.level_xp} className="mt-5 h-3" />
            <p className="mt-2 text-xs text-[#68748C]">{100 - me.level_xp} XP lagi menuju level {me.level + 1}</p>
          </div>
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-4">
          {TILES.map(([to, I, t, s, bg, fg]) => (
            <Link key={to} to={to} className="sal-card sal-lift p-5 text-center" data-testid={`dashboard-tile-${to.slice(1)}`}>
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: bg, color: fg }}><I className="h-6 w-6" /></div>
              <p className="mt-3 font-bold">{t}</p><p className="text-xs text-[#68748C]">{s}</p>
            </Link>
          ))}
        </div>
        <div className="mt-6 sal-card p-6" data-testid="dashboard-badges">
          <p className="flex items-center gap-2 font-bold"><Award className="h-5 w-5 text-[#FFA24A]" />Pencapaian</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {me.badges.map((b) => (
              <div key={b.id} className={`rounded-2xl p-4 text-center ${b.earned ? "bg-[#FFF4DC]" : "bg-[#F7F7FB] opacity-60"}`} data-testid={`badge-${b.id}`}>
                {b.earned ? <Award className="mx-auto h-8 w-8 text-[#FFA24A]" /> : <Lock className="mx-auto h-8 w-8 text-[#68748C]" />}
                <p className="mt-2 text-xs font-bold">{b.name}</p>
              </div>
            ))}
          </div>
        </div>
        {!act ? <Loading /> : (
          <div className="mt-6 grid gap-6 lg:grid-cols-3">
            <Panel title="Event saya" icon={CalendarDays} testid="dashboard-events">
              {act.registrations.length === 0 ? <p className="text-sm text-[#68748C]">Belum ada. <Link to="/update" className="font-bold text-[#7552D6]">Lihat event</Link></p> :
                act.registrations.map((r) => <Link key={r.id} to={`/events/${r.event_id}`} className="block rounded-xl bg-[#F5F0FF]/60 px-3 py-2 text-sm"><b>{r.event_title}</b><span className="block text-xs text-[#68748C]">{fmtDate(r.event_date)}</span></Link>)}
            </Panel>
            <Panel title="Pengajuan PIK-R" icon={School} testid="dashboard-orgs">
              {act.orgs.length === 0 ? <p className="text-sm text-[#68748C]">Belum ada. <Link to="/pikr" className="font-bold text-[#7552D6]">Daftarkan</Link></p> :
                act.orgs.map((o) => <div key={o.id} className="flex items-center justify-between rounded-xl bg-[#F5F0FF]/60 px-3 py-2 text-sm"><b>{o.name}</b><span className={`sal-pill ${STATUS[o.status][1]}`}>{STATUS[o.status][0]}</span></div>)}
            </Panel>
            <Panel title="Bookmark" icon={Bookmark} testid="dashboard-bookmarks">
              {act.bookmarks.length === 0 ? <p className="text-sm text-[#68748C]">Simpan materi favoritmu dari Smile Learn.</p> :
                act.bookmarks.map((b) => <Link key={b.id} to={`/${b.kind === "news" ? "update" : "learn"}/${b.id}`} className="block rounded-xl bg-[#F5F0FF]/60 px-3 py-2 text-sm font-semibold">{b.title}</Link>)}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
