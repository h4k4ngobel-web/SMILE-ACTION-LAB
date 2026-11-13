import { Download } from "lucide-react";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { Smilo, POSES, POSE_LABEL } from "@/components/brand/Smilo";
import { PageHeader } from "@/components/common";

const FILES = [
  ["Logo horizontal", "/brand/logo-horizontal.svg"], ["Ikon logo", "/brand/logo-icon.svg"], ["Versi putih", "/brand/logo-white.svg"],
  ["Monokrom", "/brand/logo-mono.svg"], ["Ikon aplikasi", "/brand/app-icon.svg"], ["Logo asli (PNG)", "/brand/logo-full.png"],
];
const COLORS = [["Dreamy Purple", "#7552D6"], ["Sky Blue", "#EAF5FF"], ["Happy Orange", "#FFA24A"], ["Fresh Mint", "#70D6C3"], ["Sunny Yellow", "#FFDA79"], ["Lavender Mist", "#F5F0FF"], ["Soft Coral", "#F6B6B5"], ["Deep Navy", "#19264C"]];

export default function Brand() {
  return (
    <div data-testid="brand-page">
      <PageHeader eyebrow="Aset Brand" title="Identitas SMILE ACTION LAB" subtitle="Logo, maskot SMILO, dan palet warna resmi untuk digunakan secara konsisten." pose="hero" />
      <div className="sal-container mt-10 space-y-12">
        <section className="grid gap-5 md:grid-cols-3">
          <div className="sal-card flex items-center justify-center p-8"><Logo /></div>
          <div className="flex items-center justify-center rounded-[28px] bg-[#7552D6] p-8"><Logo variant="white" /></div>
          <div className="sal-card flex items-center justify-center gap-6 p-8"><LogoMark className="h-14 w-14" /><LogoMark variant="mono" className="h-14 w-14" /><Logo compact /></div>
        </section>
        <section>
          <h2 className="text-2xl font-bold">Unduh file</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {FILES.map(([l, f]) => (
              <a key={f} href={f} download className="sal-card sal-lift flex items-center justify-between px-5 py-4 text-sm font-bold" data-testid={`brand-download-${f.split("/").pop()}`}>
                <span className="flex items-center gap-3"><img src={f} alt={l} className="h-8 w-8 rounded-lg bg-[#F5F0FF] object-contain p-1" />{l}</span><Download className="h-4 w-4 text-[#7552D6]" />
              </a>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-bold">Pose SMILO</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {POSES.map((p) => (
              <a key={p} href={`/brand/smilo-${p}.png`} download className="sal-card sal-lift flex flex-col items-center p-4" data-testid={`brand-pose-${p}`}>
                <Smilo pose={p} className="h-32" /><span className="mt-2 text-sm font-bold">{POSE_LABEL[p]}</span>
              </a>
            ))}
          </div>
        </section>
        <section>
          <h2 className="text-2xl font-bold">Palet warna</h2>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {COLORS.map(([n, c]) => (
              <div key={c} className="sal-card overflow-hidden"><div className="h-20" style={{ background: c }} /><div className="p-3 text-sm"><b>{n}</b><p className="text-[#68748C]">{c}</p></div></div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
