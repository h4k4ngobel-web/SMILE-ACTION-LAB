import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Trophy, HelpCircle, Compass, Star, ArrowRight, Zap, Crown } from "lucide-react";
import { useApi, useMe } from "@/lib/api";
import { Smilo, Sparkle } from "@/components/brand/Smilo";

const STYLE = {
  purple: { bg: "#8B6BE0", icon: Trophy }, mint: { bg: "#4FC6B0", icon: HelpCircle }, orange: { bg: "#FFA24A", icon: Compass },
};

const GameCard = ({ to, title, desc, color, meta, pose, testid }) => {
  const s = STYLE[color]; const I = s.icon;
  return (
    <Link to={to} className="sal-lift group relative overflow-hidden rounded-[28px] p-6 text-white" style={{ background: s.bg }} data-testid={testid}>
      <Sparkle className="absolute right-5 top-5 h-5 w-5 text-white/60 sal-twinkle" />
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20"><I className="h-6 w-6" /></div>
      <h3 className="mt-6 text-2xl font-bold">{title}</h3>
      <p className="mt-1 max-w-[70%] text-sm text-white/85">{desc}</p>
      <p className="mt-3 text-xs font-bold text-white/80">{meta}</p>
      <span className="mt-5 inline-flex items-center gap-1 rounded-full bg-[#FFDA79] px-4 py-2 text-sm font-bold text-[#19264C]">Mainkan <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
      <Smilo pose={pose} className="absolute -bottom-4 -right-4 h-32 transition-transform group-hover:scale-110" />
    </Link>
  );
};

export default function Play() {
  const api = useApi();
  const { me } = useMe();
  const [quizzes, setQuizzes] = useState([]);
  const [board, setBoard] = useState([]);
  useEffect(() => {
    api.get("/quizzes").then((r) => setQuizzes(r.data)).catch(() => {});
    api.get("/leaderboard").then((r) => setBoard(r.data)).catch(() => {});
  }, [api]);
  const today = new Date().toISOString().slice(0, 10);
  const dailyDone = me?.last_daily === today;
  return (
    <div className="sal-page-illustrated sal-art-games" data-testid="play-page">
      <section className="sal-art-hero sal-art-games relative overflow-hidden bg-[#7552D6] text-white sal-grain">
        <Sparkle className="absolute left-[30%] top-8 h-6 w-6 text-[#FFDA79] sal-twinkle" />
        <div className="sal-container relative grid items-center gap-6 py-12 md:grid-cols-[1fr_auto]">
          <div>
            <p className="sal-eyebrow !text-[#FFDA79]">Smile Play</p>
            <h1 className="mt-2 text-4xl font-bold sm:text-5xl" data-testid="page-title">Learn something. Play something. Grow together.</h1>
            <p className="mt-3 max-w-xl text-white/80">Kumpulkan XP, naik level, dan raih badge sambil belajar tentang GenRe.</p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-2 font-bold" data-testid="play-xp-display">
              <Star className="h-5 w-5 fill-[#FFDA79] text-[#FFDA79]" /> {me ? `${me.xp} XP · Level ${me.level}` : "Masuk untuk mengumpulkan XP"}
            </div>
          </div>
          <Smilo pose="play" float className="hidden h-52 md:block" />
        </div>
      </section>
      <div className="sal-container mt-10">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q) => (
            <GameCard key={q.id} to={`/play/quiz/${q.id}`} title={q.title} desc={q.description} color={q.color} pose={q.cover} meta={`${q.count} soal · hingga ${q.count * 10} XP`} testid={`game-card-${q.id}`} />
          ))}
          <GameCard to="/play/life-planner" title="Life Planner Simulator" desc="Ambil keputusan dan lihat masa depan yang kamu bangun." color="orange" pose="invite" meta="5 tahap · 50 XP" testid="game-card-life-planner" />
          <GameCard to="/play/word-search" title="Word Search: Kata Baik" desc="Cari istilah tentang empati, kesehatan, dan rencana masa depan." color="mint" pose="study" meta="5 kata · 30 XP" testid="game-card-word-search" />
          <GameCard to="/play/memory-match" title="Memory Match: Pasangan Makna" desc="Cocokkan keterampilan hidup dengan contoh sehari-harinya." color="purple" pose="think" meta="6 pasangan · 30 XP" testid="game-card-memory-match" />
          <GameCard to="/play/story-quest" title="Story Quest: Jadi Teman yang Hadir" desc="Pilih respons dalam cerita bercabang dan lihat dampaknya." color="orange" pose="care" meta="Cerita bercabang · 40 XP" testid="game-card-story-quest" />
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="sal-card flex items-center gap-5 p-6" data-testid="daily-challenge">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FFF4DC]"><Zap className="h-7 w-7 text-[#FFA24A]" /></div>
            <div className="flex-1">
              <p className="font-bold">Daily Challenge</p>
              <p className="text-sm text-[#68748C]">{dailyDone ? "Mantap! Tantangan hari ini selesai. Kembali besok, ya." : "Selesaikan 1 kuis hari ini dan dapatkan bonus +20 XP!"}</p>
            </div>
            {!dailyDone && quizzes[0] && <Link to={`/play/quiz/${quizzes[0].id}`} className="sal-btn-orange" data-testid="daily-challenge-start">Mulai</Link>}
          </div>
          <div className="sal-card p-6" data-testid="leaderboard">
            <p className="flex items-center gap-2 font-bold"><Crown className="h-5 w-5 text-[#FFA24A]" />Papan Skor</p>
            <ol className="mt-3 space-y-2">
              {board.length === 0 && <li className="text-sm text-[#68748C]">Jadilah yang pertama di papan skor!</li>}
              {board.map((b, i) => (
                <li key={i} className="flex items-center justify-between rounded-xl bg-[#F5F0FF]/60 px-3 py-2 text-sm">
                  <span><b className="mr-2 text-[#7552D6]">#{i + 1}</b>{b.name}</span><span className="font-bold">{b.xp} XP</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
