import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useSafeAuth } from "@/lib/auth";
import { Search, MapPin, BadgeCheck, Plus, Mail, School } from "lucide-react";
import { toast } from "sonner";
import { useApi, errMsg } from "@/lib/api";
import { PageHeader, Loading, EmptyState } from "@/components/common";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import indonesiaMap from "@svg-maps/indonesia";

export const PROVINCES = ["Aceh", "Sumatera Utara", "Sumatera Barat", "Riau", "Kepulauan Riau", "Jambi", "Sumatera Selatan", "Bangka Belitung", "Bengkulu", "Lampung",
  "DKI Jakarta", "Banten", "Jawa Barat", "Jawa Tengah", "DI Yogyakarta", "Jawa Timur", "Bali", "Nusa Tenggara Barat", "Nusa Tenggara Timur",
  "Kalimantan Barat", "Kalimantan Tengah", "Kalimantan Selatan", "Kalimantan Timur", "Kalimantan Utara", "Sulawesi Utara", "Gorontalo", "Sulawesi Tengah",
  "Sulawesi Barat", "Sulawesi Selatan", "Sulawesi Tenggara", "Maluku", "Maluku Utara", "Papua", "Papua Barat", "Papua Barat Daya", "Papua Tengah", "Papua Pegunungan", "Papua Selatan"];

const PROVINCE_CAPITALS = {
  Aceh: [95.32, 5.55], "Sumatera Utara": [98.67, 3.59], "Sumatera Barat": [100.36, -0.95], Riau: [101.45, 0.51],
  "Kepulauan Riau": [104.45, 0.92], Jambi: [103.61, -1.61], "Sumatera Selatan": [104.75, -2.99],
  "Bangka Belitung": [106.12, -2.13], Bengkulu: [102.26, -3.8], Lampung: [105.26, -5.43],
  "DKI Jakarta": [106.85, -6.2], Banten: [106.15, -6.12], "Jawa Barat": [107.62, -6.9],
  "Jawa Tengah": [110.42, -6.97], "DI Yogyakarta": [110.36, -7.8], "Jawa Timur": [112.75, -7.25],
  Bali: [115.22, -8.67], "Nusa Tenggara Barat": [116.12, -8.58], "Nusa Tenggara Timur": [123.61, -10.18],
  "Kalimantan Barat": [109.34, -0.02], "Kalimantan Tengah": [113.92, -2.21], "Kalimantan Selatan": [114.59, -3.32],
  "Kalimantan Timur": [117.15, -0.5], "Kalimantan Utara": [117.37, 2.84], "Sulawesi Utara": [124.84, 1.49],
  Gorontalo: [123.06, 0.54], "Sulawesi Tengah": [119.87, -0.9], "Sulawesi Barat": [118.89, -2.68],
  "Sulawesi Selatan": [119.41, -5.14], "Sulawesi Tenggara": [122.51, -3.99], Maluku: [128.18, -3.7],
  "Maluku Utara": [127.57, 0.73], Papua: [140.72, -2.53], "Papua Barat": [134.07, -0.86],
  "Papua Barat Daya": [131.25, -0.86], "Papua Tengah": [135.5, -3.36], "Papua Pegunungan": [139.53, -3.96],
  "Papua Selatan": [140.4, -8.49],
};

const mapPoint = (province) => {
  const [longitude, latitude] = PROVINCE_CAPITALS[province];
  return {
    x: ((longitude - 94.5) / (141.1 - 94.5)) * 793,
    y: 29 + ((6.1 - latitude) / (6.1 + 11)) * 288,
  };
};

const ProvinceMap = ({ counts, selected, onSelect, error }) => {
  const total = counts ? Object.values(counts).reduce((sum, count) => sum + count, 0) : null;
  return (
    <section className="sal-card mt-8 overflow-hidden p-4 md:p-6" data-testid="pikr-province-map">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="sal-eyebrow text-[#2BA58E]">Jaringan PIK-R</p>
          <h2 className="mt-1 text-2xl font-bold">Jelajahi Indonesia</h2>
          <p className="mt-1 text-sm text-[#68748C]">Pilih titik atau provinsi untuk melihat PIK-R yang sudah diverifikasi.</p>
        </div>
        <div className="rounded-2xl bg-[#E3F7F2] px-4 py-2 text-sm font-bold text-[#2BA58E]" data-testid="pikr-verified-total">
          {counts ? `${total} PIK-R terverifikasi` : error ? "Jumlah belum tersedia" : "Memuat jumlah..."}
        </div>
      </div>
      {error && <p className="mt-3 rounded-xl bg-[#FDE7E7] p-3 text-sm text-[#9F4747]" role="alert">Jumlah PIK-R belum dapat dimuat: {error}</p>}
      <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(250px,1fr)]">
        <div className="rounded-3xl bg-[#EAF5FF] p-3 md:p-5">
          <svg viewBox={indonesiaMap.viewBox} className="w-full" role="group" aria-label="Peta Indonesia dengan penanda ibu kota provinsi">
            <title>Peta lokasi provinsi Indonesia</title>
            <desc>Penanda menunjukkan ibu kota sebagai titik referensi. Pilih penanda untuk menyaring direktori PIK-R.</desc>
            <g aria-hidden="true">
              {indonesiaMap.locations.map((location) => (
                <path key={location.id} d={location.path} fill="#CDEFE4" stroke="#B5E5D6" strokeWidth="0.7" />
              ))}
            </g>
            {PROVINCES.map((province) => {
              const { x, y } = mapPoint(province);
              const isSelected = selected === province;
              const count = counts ? counts[province] || 0 : null;
              return (
                <g key={province} transform={`translate(${x - 6},${y - 11}) scale(0.5)`} role="button" tabIndex={0}
                  aria-label={`${province}: ${count === null ? "jumlah belum tersedia" : `${count} PIK-R terverifikasi`}`}
                  onClick={() => onSelect(isSelected ? "" : province)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      onSelect(isSelected ? "" : province);
                    }
                  }}
                  className="cursor-pointer outline-none focus-visible:opacity-70">
                  <title>{province}: {count === null ? "jumlah belum tersedia" : `${count} PIK-R terverifikasi`}</title>
                  <path d="M12 22s8-4.3 8-12a8 8 0 1 0-16 0c0 7.7 8 12 8 12Z" fill={isSelected ? "#FFA24A" : "#7552D6"} stroke="white" strokeWidth="1.5" />
                  <circle cx="12" cy="10" r="2.6" fill="white" />
                </g>
              );
            })}
          </svg>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#68748C]">
            <span>Titik menandai ibu kota provinsi, bukan alamat organisasi.</span>
            <a href="https://github.com/VictorCazanave/svg-maps/tree/master/packages/indonesia" target="_blank" rel="noreferrer" className="underline underline-offset-2">Sumber siluet peta · CC BY 4.0</a>
          </div>
        </div>
        <div className="flex min-h-0 flex-col rounded-3xl border border-[#EDE6FF] bg-white p-3 md:p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="font-bold">Provinsi</p>
            {selected && <button onClick={() => onSelect("")} className="text-xs font-semibold text-[#7552D6] hover:underline">Tampilkan semua</button>}
          </div>
          <div className="mt-2 max-h-72 overflow-y-auto pr-1" data-testid="pikr-province-counts">
            {PROVINCES.map((province) => (
              <button key={province} onClick={() => onSelect(selected === province ? "" : province)}
                className={`flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-left text-sm transition-colors ${selected === province ? "bg-[#F5F0FF] text-[#7552D6]" : "hover:bg-[#F7F7FB]"}`}
                data-testid={`pikr-province-${province.toLowerCase().replace(/\s/g, "-")}`}>
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="flex-1">{province}</span>
                <span className="min-w-7 rounded-full bg-[#E3F7F2] px-2 py-0.5 text-center text-xs font-bold text-[#2BA58E]">
                  {counts ? counts[province] || 0 : "—"}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

const EMPTY = { name: "", institution: "", city: "", province: "Banten", contact: "", description: "", category: "Jalur Pendidikan" };
const sel = "h-10 w-full rounded-md border border-input bg-white px-3 text-sm";

const RegisterOrg = () => {
  const api = useApi();
  const { isSignedIn } = useSafeAuth();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try { await api.post("/orgs", f); toast.success("Pengajuan terkirim! Kami akan mengabarimu lewat email."); setF(EMPTY); setOpen(false); }
    catch (err) { toast.error(errMsg(err)); } finally { setBusy(false); }
  };
  if (!isSignedIn) return <Link to="/sign-in" className="sal-btn-orange" data-testid="pikr-register-login">Daftarkan PIK-R-mu</Link>;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><button className="sal-btn-orange" data-testid="pikr-register-open"><Plus className="h-4 w-4" />Daftarkan PIK-R-mu</button></DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl">
        <DialogHeader><DialogTitle>Daftarkan PIK-R</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-3" data-testid="pikr-register-form">
          <Input required placeholder="Nama PIK-R" value={f.name} onChange={set("name")} data-testid="pikr-name-input" />
          <Input required placeholder="Sekolah / kampus / instansi" value={f.institution} onChange={set("institution")} data-testid="pikr-institution-input" />
          <div className="grid grid-cols-2 gap-3">
            <Input required placeholder="Kota / kabupaten" value={f.city} onChange={set("city")} data-testid="pikr-city-input" />
            <select value={f.province} onChange={set("province")} className={sel} data-testid="pikr-province-select">{PROVINCES.map((p) => <option key={p}>{p}</option>)}</select>
          </div>
          <select value={f.category} onChange={set("category")} className={sel} data-testid="pikr-category-select"><option>Jalur Pendidikan</option><option>Jalur Masyarakat</option></select>
          <Input required placeholder="Kontak (email / Instagram)" value={f.contact} onChange={set("contact")} data-testid="pikr-contact-input" />
          <Textarea required minLength={10} placeholder="Ceritakan kegiatan PIK-R kalian" value={f.description} onChange={set("description")} data-testid="pikr-description-input" />
          <p className="text-xs text-[#68748C]">PIK-R akan tampil di direktori setelah diverifikasi admin.</p>
          <button disabled={busy} className="sal-btn-primary w-full disabled:opacity-50" data-testid="pikr-submit-btn">{busy ? "Mengirim..." : "Kirim pengajuan"}</button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default function PikrHub() {
  const api = useApi();
  const [q, setQ] = useState("");
  const [prov, setProv] = useState("");
  const [orgs, setOrgs] = useState(null);
  const [provinceCounts, setProvinceCounts] = useState(null);
  const [statsError, setStatsError] = useState("");
  useEffect(() => {
    const t = setTimeout(() => api.get("/orgs", { params: { q, province: prov } }).then((r) => setOrgs(r.data)).catch(() => setOrgs([])), 250);
    return () => clearTimeout(t);
  }, [api, q, prov]);
  useEffect(() => {
    api.get("/orgs/stats").then((r) => { setProvinceCounts(r.data); setStatsError(""); })
      .catch((error) => { setProvinceCounts(null); setStatsError(errMsg(error)); });
  }, [api]);
  return (
    <div className="sal-page-illustrated sal-art-pikr" data-testid="pikr-page">
      <PageHeader eyebrow="PIK-R Hub" title="Kolaborasi PIK-R se-Indonesia" subtitle="Temukan Pusat Informasi dan Konseling Remaja yang sudah terverifikasi, atau daftarkan PIK-R-mu." pose="invite" art="pikr">
        <RegisterOrg />
      </PageHeader>
      <div className="sal-container mt-8">
        <ProvinceMap counts={provinceCounts} selected={prov} onSelect={setProv} error={statsError} />
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="flex flex-1 items-center gap-2 rounded-full border border-[#EDE6FF] bg-white px-4 py-2.5">
            <Search className="h-4 w-4 text-[#68748C]" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari nama PIK-R..." className="flex-1 bg-transparent text-sm outline-none" data-testid="pikr-search-input" />
          </div>
          <select value={prov} onChange={(e) => setProv(e.target.value)} className="rounded-full border border-[#EDE6FF] bg-white px-4 py-2.5 text-sm" data-testid="pikr-filter-province">
            <option value="">Semua provinsi</option>{PROVINCES.map((p) => <option key={p}>{p}</option>)}
          </select>
        </div>
        <div className="mt-8">
          {orgs === null ? <Loading /> : orgs.length === 0 ? <EmptyState title="Belum ada PIK-R di sini" text="Jadilah PIK-R pertama yang terdaftar dari daerahmu!" pose="think" /> : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {orgs.map((o) => (
                <div key={o.id} className="sal-card sal-lift p-6" data-testid={`pikr-card-${o.id}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5F0FF] text-[#7552D6]"><School className="h-6 w-6" /></div>
                    <span className="sal-pill bg-[#E3F7F2] text-[#2BA58E]"><BadgeCheck className="h-3.5 w-3.5" />Terverifikasi</span>
                  </div>
                  <h3 className="mt-4 text-lg font-bold">{o.name}</h3>
                  <p className="text-sm text-[#68748C]">{o.institution} · {o.category}</p>
                  <p className="mt-2 flex items-center gap-1 text-sm text-[#68748C]"><MapPin className="h-4 w-4" />{o.city}, {o.province}</p>
                  <p className="mt-3 line-clamp-3 text-sm">{o.description}</p>
                  <p className="mt-3 flex items-center gap-1 text-sm font-semibold text-[#7552D6]"><Mail className="h-4 w-4" />{o.contact}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
