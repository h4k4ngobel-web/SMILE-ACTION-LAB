import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useSafeAuth } from "@/lib/auth";
import { ArrowLeft, Check, X, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useApi, useMe, errMsg } from "@/lib/api";
import { Loading } from "@/components/common";
import { Smilo } from "@/components/brand/Smilo";
import { Progress } from "@/components/ui/progress";

const Result = ({ quiz, result, answers, onRetry, isSignedIn }) => {
  const pct = result.correct / result.total;
  return (
    <div className="sal-card p-8 text-center" data-testid="quiz-result">
      <Smilo pose={pct >= 0.7 ? "cheer" : pct >= 0.4 ? "invite" : "care"} float className="mx-auto h-40" />
      <h2 className="mt-4 text-3xl font-bold">{pct >= 0.7 ? "Luar biasa!" : pct >= 0.4 ? "Kerja bagus!" : "Tetap semangat!"}</h2>
      <p className="mt-2 text-lg" data-testid="quiz-score">Skor kamu: <b>{result.correct}/{result.total}</b></p>
      {isSignedIn ? (
        <p className="mt-1 font-bold text-[#FFA24A]" data-testid="quiz-xp-gained">+{result.xp_gained} XP</p>
      ) : (
        <p className="mt-1 text-sm text-[#68748C]"><Link to="/sign-in" className="font-bold text-[#7552D6]">Masuk</Link> agar XP-mu tersimpan.</p>
      )}
      <div className="mt-8 space-y-3 text-left">
        {quiz.questions.map((q, i) => {
          const r = result.review[i];
          return (
            <div key={i} className={`rounded-2xl border p-4 ${r.correct ? "border-[#70D6C3] bg-[#E3F7F2]" : "border-[#F6B6B5] bg-[#FDE7E7]"}`}>
              <p className="flex gap-2 text-sm font-bold">{r.correct ? <Check className="h-4 w-4 shrink-0 text-[#2BA58E]" /> : <X className="h-4 w-4 shrink-0 text-[#D86A68]" />}{q.q}</p>
              <p className="mt-1 pl-6 text-xs text-[#68748C]">Jawaban: <b>{q.options[r.answer]}</b>{answers[i] !== r.answer && answers[i] >= 0 ? ` · pilihanmu: ${q.options[answers[i]]}` : ""}. {r.explain}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-8 flex justify-center gap-3">
        <button onClick={onRetry} className="sal-btn-ghost" data-testid="quiz-retry-btn"><RotateCcw className="h-4 w-4" />Ulangi</button>
        <Link to="/play" className="sal-btn-primary" data-testid="quiz-back-play">Game lain</Link>
      </div>
    </div>
  );
};

export default function QuizRun() {
  const { id } = useParams();
  const api = useApi();
  const { isSignedIn } = useSafeAuth();
  const { refresh } = useMe();
  const [quiz, setQuiz] = useState(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => { api.get(`/quizzes/${id}`).then((r) => setQuiz(r.data)).catch(() => toast.error("Kuis tidak ditemukan")); }, [api, id]);
  if (!quiz) return <Loading />;
  const q = quiz.questions[idx];
  const chosen = answers[idx];
  const last = idx === quiz.questions.length - 1;

  const choose = (i) => { const a = [...answers]; a[idx] = i; setAnswers(a); };
  const next = async () => {
    if (!last) return setIdx(idx + 1);
    setBusy(true);
    try { setResult((await api.post(`/quizzes/${id}/submit`, { answers })).data); refresh(); }
    catch (e) { toast.error(errMsg(e)); } finally { setBusy(false); }
  };
  const retry = () => { setIdx(0); setAnswers([]); setResult(null); };

  return (
    <div className="sal-page-illustrated sal-art-games min-h-[calc(100vh-4rem)] py-10" data-testid="quiz-page">
      <div className="sal-container max-w-2xl">
        <Link to="/play" className="inline-flex items-center gap-1 text-sm font-bold text-[#7552D6]"><ArrowLeft className="h-4 w-4" />Smile Play</Link>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl" data-testid="page-title">{quiz.title}</h1>
        {result ? <div className="mt-6"><Result quiz={quiz} result={result} answers={answers} onRetry={retry} isSignedIn={isSignedIn} /></div> : (
          <div className="sal-card mt-6 p-6 md:p-8" data-testid="quiz-question-card">
            <div className="flex items-center justify-between text-sm font-bold text-[#68748C]"><span>Soal {idx + 1} dari {quiz.questions.length}</span><Smilo pose="think" className="h-12" /></div>
            <Progress value={((idx + 1) / quiz.questions.length) * 100} className="mt-2 h-2" />
            <h2 className="mt-6 text-xl font-bold leading-snug md:text-2xl" data-testid="quiz-question-text">{q.q}</h2>
            <div className={`mt-6 grid gap-3 ${q.options.length === 2 ? "grid-cols-2" : ""}`}>
              {q.options.map((o, i) => (
                <button key={i} onClick={() => choose(i)} data-testid={`quiz-option-${i}`}
                  className={`rounded-2xl border-2 px-5 py-4 text-left font-semibold transition-colors ${chosen === i ? "border-[#7552D6] bg-[#F5F0FF] text-[#7552D6]" : "border-[#EDE6FF] bg-white hover:border-[#7552D6]/50"} ${q.options.length === 2 ? "text-center text-lg" : ""}`}>{o}</button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <button disabled={idx === 0} onClick={() => setIdx(idx - 1)} className="sal-btn-ghost disabled:opacity-40" data-testid="quiz-prev-btn">Sebelumnya</button>
              <button disabled={chosen === undefined || busy} onClick={next} className="sal-btn-primary disabled:opacity-40" data-testid="quiz-next-btn">{last ? "Selesai" : "Lanjut"}</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
