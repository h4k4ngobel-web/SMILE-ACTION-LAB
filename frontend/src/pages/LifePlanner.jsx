import { useState } from "react";
import { Link } from "react-router-dom";
import { useSafeAuth } from "@/lib/auth";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useApi, useMe, errMsg } from "@/lib/api";
import { Smilo } from "@/components/brand/Smilo";
import { Progress } from "@/components/ui/progress";

const STEPS = [
  { pose: "study", q: "Kamu baru lulus SMA. Apa langkah pertamamu?", opts: [
    ["Lanjut kuliah atau kursus sesuai minat", 3, "Investasi ilmu adalah bekal terbaik masa depan."],
    ["Bekerja sambil mengasah keterampilan", 3, "Mandiri sejak dini sambil terus belajar, keren!"],
    ["Langsung menikah dengan pacar", 0, "Menikah butuh kesiapan fisik, mental, dan ekonomi. PUP menyarankan usia 21 (perempuan) dan 25 (laki-laki)."]] },
  { pose: "think", q: "Teman nongkrong menawarkan rokok elektrik dan 'obat penenang'. Responsmu?", opts: [
    ["Menolak dengan tegas tapi tetap santai", 3, "Berani bilang tidak adalah life skill penting."],
    ["Coba sedikit biar tidak dianggap cupu", 0, "Coba-coba bisa menjadi awal ketergantungan NAPZA."],
    ["Pergi dan cari teman yang lebih positif", 2, "Lingkungan yang sehat membantumu bertumbuh."]] },
  { pose: "care", q: "Belakangan kamu sering merasa tertekan dan sulit tidur. Apa yang kamu lakukan?", opts: [
    ["Memendam sendiri, nanti juga hilang", 0, "Perasaan yang dipendam bisa makin berat. Kamu tidak harus menanggungnya sendirian."],
    ["Cerita ke orang tua, guru BK, atau konselor PIK-R", 3, "Meminta bantuan adalah tanda keberanian."],
    ["Ngobrol dulu dengan SMILO lalu cari bantuan", 2, "Langkah awal yang baik! Lanjutkan ke orang yang kamu percaya, ya."]] },
  { pose: "invite", q: "Kapan rencana usia idealmu untuk menikah?", opts: [
    ["Sebelum 20 tahun", 0, "Terlalu dini meningkatkan risiko kesehatan dan ekonomi."],
    ["Sesuai PUP: perempuan 21+, laki-laki 25+", 3, "Tepat! Usia ini lebih siap secara fisik dan mental."],
    ["Belum terpikir, fokus berkarya dulu", 2, "Fokus pada pengembangan diri itu bagus."]] },
  { pose: "cheer", q: "Kamu dapat uang saku tambahan. Mau diapakan?", opts: [
    ["Ditabung sebagian untuk tujuan masa depan", 3, "Perencanaan keuangan bagian dari life planning."],
    ["Dipakai ikut pelatihan atau beli buku", 3, "Investasi diri yang cerdas!"],
    ["Dihabiskan untuk barang yang sedang tren", 1, "Boleh sesekali, tapi seimbangkan dengan menabung."]] },
];

const MAX = STEPS.length * 3;

export default function LifePlanner() {
  const api = useApi();
  const { isSignedIn } = useSafeAuth();
  const { refresh } = useMe();
  const [step, setStep] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState(null);
  const done = step >= STEPS.length;

  const pick = (o) => { if (picked) return; setPicked(o); setScore((s) => s + o[1]); };
  const next = async () => {
    setPicked(null);
    const n = step + 1; setStep(n);
    if (n >= STEPS.length && isSignedIn) {
      try { const r = await api.post("/play/complete", { game: "life-planner" }); if (r.data.xp_gained) toast.success(`+${r.data.xp_gained} XP!`); refresh(); }
      catch (e) { toast.error(errMsg(e)); }
    }
  };
  const reset = () => { setStep(0); setScore(0); setPicked(null); };
  const tier = score >= MAX * 0.8 ? ["Perencana Hebat!", "cheer", "Pilihanmu menunjukkan kamu siap merancang masa depan yang matang. Terus jadi inspirasi!"]
    : score >= MAX * 0.5 ? ["Sedang Bertumbuh", "invite", "Kamu sudah di jalur yang baik. Pelajari lagi materi Smile Learn untuk makin siap."]
    : ["Ayo Rancang Ulang", "care", "Setiap orang bisa belajar. Yuk baca materi GenRe dan coba lagi!"];

  return (
    <div className="sal-page-illustrated sal-art-games min-h-[calc(100vh-4rem)] py-10" data-testid="life-planner-page">
      <div className="sal-container max-w-2xl">
        <Link to="/play" className="inline-flex items-center gap-1 text-sm font-bold text-[#7552D6]"><ArrowLeft className="h-4 w-4" />Smile Play</Link>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl" data-testid="page-title">Life Planner Simulator</h1>
        {done ? (
          <div className="sal-card mt-6 p-8 text-center" data-testid="life-result">
            <Smilo pose={tier[1]} float className="mx-auto h-40" />
            <h2 className="mt-4 text-3xl font-bold">{tier[0]}</h2>
            <p className="mt-2 text-lg">Skor kesiapan: <b data-testid="life-score">{score}/{MAX}</b></p>
            <p className="mx-auto mt-3 max-w-md text-[#68748C]">{tier[2]}</p>
            {!isSignedIn && <p className="mt-3 text-sm"><Link to="/sign-in" className="font-bold text-[#7552D6]">Masuk</Link> untuk mendapat 50 XP.</p>}
            <div className="mt-6 flex justify-center gap-3">
              <button onClick={reset} className="sal-btn-ghost" data-testid="life-retry-btn"><RotateCcw className="h-4 w-4" />Main lagi</button>
              <Link to="/learn" className="sal-btn-primary">Baca materi</Link>
            </div>
          </div>
        ) : (
          <div className="sal-card mt-6 p-6 md:p-8" data-testid="life-step-card">
            <div className="flex items-center justify-between text-sm font-bold text-[#68748C]"><span>Tahap {step + 1} dari {STEPS.length}</span><Smilo pose={STEPS[step].pose} className="h-14" /></div>
            <Progress value={((step + 1) / STEPS.length) * 100} className="mt-2 h-2" />
            <h2 className="mt-6 text-xl font-bold md:text-2xl">{STEPS[step].q}</h2>
            <div className="mt-6 grid gap-3">
              {STEPS[step].opts.map((o, i) => (
                <button key={i} onClick={() => pick(o)} disabled={!!picked} data-testid={`life-option-${i}`}
                  className={`rounded-2xl border-2 px-5 py-4 text-left font-semibold transition-colors ${picked === o ? "border-[#7552D6] bg-[#F5F0FF]" : "border-[#EDE6FF] bg-white enabled:hover:border-[#7552D6]/50"}`}>{o[0]}</button>
              ))}
            </div>
            {picked && (
              <div className="mt-5 rounded-2xl bg-[#FFF4DC] p-4 text-sm" data-testid="life-feedback">
                <p><b>SMILO bilang:</b> {picked[2]}</p>
                <button onClick={next} className="sal-btn-primary mt-4" data-testid="life-next-btn">{step === STEPS.length - 1 ? "Lihat hasil" : "Lanjut"}</button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
