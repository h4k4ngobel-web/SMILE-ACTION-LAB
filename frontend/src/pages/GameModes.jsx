import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CheckCircle2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useApi, useMe, errMsg } from "@/lib/api";
import { useSafeAuth } from "@/lib/auth";
import { lineBetween, makeWordGrid, SIZE, WORDS } from "./GameModesLogic";

function useCompletion(game) {
  const api = useApi();
  const { isSignedIn } = useSafeAuth();
  const { refresh } = useMe();
  const completed = useRef(false);
  const complete = useCallback(async () => {
    if (completed.current) return;
    completed.current = true;
    if (!isSignedIn) return;
    try {
      const { data } = await api.post("/play/complete", { game });
      if (data.xp_gained) toast.success(`Permainan selesai! +${data.xp_gained} XP.`);
      else toast.info("Permainan selesai! XP untuk game ini sudah pernah kamu terima.");
      refresh();
    } catch (e) {
      completed.current = false;
      toast.error(errMsg(e));
    }
  }, [api, game, isSignedIn, refresh]);
  return { complete, isSignedIn };
}

function GameShell({ title, children }) {
  return (
    <div className="sal-page-illustrated sal-art-games min-h-[calc(100vh-4rem)] py-10">
      <div className="sal-container max-w-3xl">
        <Link to="/play" className="inline-flex items-center gap-1 text-sm font-bold text-[#7552D6]"><ArrowLeft className="h-4 w-4" />Smile Play</Link>
        <h1 className="mt-3 text-3xl font-bold sm:text-4xl">{title}</h1>
        {children}
      </div>
    </div>
  );
}

function Completion({ isSignedIn, onRetry, children }) {
  return (
    <div className="sal-card mt-6 p-8 text-center" data-testid="game-result">
      <CheckCircle2 className="mx-auto h-12 w-12 text-[#2BA58E]" aria-hidden="true" />
      <h2 className="mt-3 text-2xl font-bold">{children}</h2>
      {!isSignedIn && <p className="mt-2 text-sm text-[#68748C]"><Link to="/sign-in" className="font-bold text-[#7552D6]">Masuk</Link> agar XP-mu tersimpan.</p>}
      <div className="mt-6 flex justify-center gap-3">
        <button onClick={onRetry} className="sal-btn-ghost"><RotateCcw className="h-4 w-4" />Main lagi</button>
        <Link to="/play" className="sal-btn-primary">Game lain</Link>
      </div>
    </div>
  );
}

export function WordSearch() {
  const [grid, setGrid] = useState(makeWordGrid);
  const [start, setStart] = useState(null);
  const [found, setFound] = useState([]);
  const [foundCells, setFoundCells] = useState([]);
  const done = found.length === WORDS.length;
  const { complete, isSignedIn } = useCompletion("word-search");
  useEffect(() => { if (done) complete(); }, [complete, done]);

  const selectCell = (end) => {
    if (start === null) { setStart(end); return; }
    const path = lineBetween(start, end);
    const value = path.map((i) => grid[i]).join("");
    const reverse = value.split("").reverse().join("");
    const word = WORDS.find((item) => item === value || item === reverse);
    if (word && !found.includes(word)) {
      setFound((items) => [...items, word]);
      setFoundCells((items) => [...new Set([...items, ...path])]);
      setStart(null);
      return;
    }
    setStart(end);
  };
  const reset = () => { setGrid(makeWordGrid()); setFound([]); setFoundCells([]); setStart(null); };

  return (
    <GameShell title="Word Search: Kata Baik">
      <p className="mt-2 text-sm text-[#68748C]">Temukan kata tentang keterampilan hidup. Pilih huruf awal, lalu huruf akhir; kata bisa mendatar, tegak, atau diagonal.</p>
      {done ? <Completion isSignedIn={isSignedIn} onRetry={reset}>Semua kata ditemukan. Mantap!</Completion> : (
        <div className="mt-6 grid gap-5 md:grid-cols-[1fr_220px]">
          <div className="sal-card p-3 sm:p-5" data-testid="word-search-board">
            <div className="grid grid-cols-10 gap-1">
              {grid.map((letter, i) => (
                <button key={i} onClick={() => selectCell(i)} aria-label={`Baris ${Math.floor(i / SIZE) + 1}, kolom ${i % SIZE + 1}, ${letter}`}
                  className={`aspect-square rounded-md text-sm font-bold sm:rounded-xl sm:text-lg ${foundCells.includes(i) ? "bg-[#70D6C3] text-[#123B34]" : start === i ? "bg-[#7552D6] text-white" : "bg-[#F5F0FF] hover:bg-[#E3F7F2]"}`}>
                  {letter}
                </button>
              ))}
            </div>
          </div>
          <div className="sal-card p-5">
            <h2 className="font-bold">Kata yang dicari</h2>
            <ul className="mt-3 space-y-2">
              {WORDS.map((word) => <li key={word} className={`rounded-xl px-3 py-2 text-sm font-bold ${found.includes(word) ? "bg-[#E3F7F2] text-[#2BA58E] line-through" : "bg-[#F5F0FF]"}`}>{word}</li>)}
            </ul>
            <button onClick={reset} className="sal-btn-ghost mt-4 w-full"><RotateCcw className="h-4 w-4" />Acak ulang</button>
          </div>
        </div>
      )}
    </GameShell>
  );
}

const PAIRS = [
  ["Empati", "Mendengar tanpa menghakimi"],
  ["Batas diri", "Menghormati kata tidak"],
  ["PIK-R", "Ruang informasi remaja"],
  ["Rencana", "Langkah kecil ke tujuan"],
  ["Sehat", "Merawat tubuh dan pikiran"],
  ["Berani", "Mencari bantuan saat perlu"],
];

function shuffledMemoryDeck() {
  const cards = PAIRS.flatMap(([a, b], pair) => [
    { id: `${pair}-a`, pair, label: a }, { id: `${pair}-b`, pair, label: b },
  ]);
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}

export function MemoryMatch() {
  const [cards, setCards] = useState(shuffledMemoryDeck);
  const [open, setOpen] = useState([]);
  const [matched, setMatched] = useState([]);
  const [moves, setMoves] = useState(0);
  const timer = useRef(null);
  const done = matched.length === PAIRS.length;
  const { complete, isSignedIn } = useCompletion("memory-match");
  useEffect(() => { if (done) complete(); }, [complete, done]);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const flip = (card) => {
    if (open.length === 2 || open.includes(card.id) || matched.includes(card.pair)) return;
    const next = [...open, card.id];
    setOpen(next);
    if (next.length === 2) {
      setMoves((n) => n + 1);
      const first = cards.find((item) => item.id === next[0]);
      if (first.pair === card.pair) {
        setMatched((items) => [...items, card.pair]);
        setOpen([]);
      } else {
        timer.current = window.setTimeout(() => setOpen([]), 850);
      }
    }
  };
  const reset = () => {
    setCards(shuffledMemoryDeck());
    setOpen([]); setMatched([]); setMoves(0);
  };

  return (
    <GameShell title="Memory Match: Pasangan Makna">
      <p className="mt-2 text-sm text-[#68748C]">Buka dua kartu untuk mencocokkan keterampilan dan contoh penerapannya. Coba selesaikan dengan langkah sesedikit mungkin.</p>
      {done ? <Completion isSignedIn={isSignedIn} onRetry={reset}>Semua pasangan cocok dalam {moves} langkah!</Completion> : (
        <div className="sal-card mt-6 p-4 sm:p-6" data-testid="memory-match-board">
          <p className="mb-4 text-sm font-bold text-[#68748C]">Pasangan ditemukan: {matched.length}/{PAIRS.length} · Langkah: {moves}</p>
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {cards.map((card) => {
              const visible = open.includes(card.id) || matched.includes(card.pair);
              return <button key={card.id} onClick={() => flip(card)} aria-label={visible ? card.label : "Kartu tertutup"}
                className={`min-h-24 rounded-2xl border-2 p-3 text-center text-sm font-bold transition-all sm:min-h-28 ${matched.includes(card.pair) ? "border-[#70D6C3] bg-[#E3F7F2] text-[#2BA58E]" : visible ? "border-[#7552D6] bg-[#F5F0FF]" : "border-[#EDE6FF] bg-white hover:-translate-y-1 hover:border-[#7552D6]"}`}>
                {visible ? card.label : "?"}
              </button>;
            })}
          </div>
        </div>
      )}
    </GameShell>
  );
}

const STORY = {
  start: {
    title: "Ada pesan yang bikin khawatir",
    text: "Dina mengirim pesan: “Aku capek banget. Rasanya gak ada yang ngerti.” Kamu ingin merespons dengan cara yang mendukung.",
    options: [
      { label: "“Mau cerita bagian mana yang paling berat?”", next: "listen", points: 2, note: "Kamu membuka ruang tanpa memaksa." },
      { label: "“Jangan dipikirin, besok juga lupa.”", next: "minimize", points: 0, note: "Niatmu mungkin menenangkan, tapi perasaan Dina belum sempat didengar." },
      { label: "“Aku janji merahasiakan apa pun.”", next: "secret", points: 0, note: "Teman butuh kepercayaan, tetapi jangan menjanjikan rahasia jika keselamatannya terancam." },
    ],
  },
  listen: {
    title: "Dina mulai bercerita",
    text: "Dina bilang tugas sekolah dan masalah di rumah menumpuk. Ia belum menyebut bahaya langsung. Apa langkah berikutnya?",
    options: [
      { label: "Tanya bantuan apa yang ia inginkan dan tawarkan menemani mencari dukungan.", next: "support", points: 3, note: "Kamu menghormati pilihannya dan tidak mengambil alih." },
      { label: "Langsung ceritakan masalah Dina ke grup kelas.", next: "privacy", points: 0, note: "Menyebarkan cerita tanpa izin bisa merusak rasa aman." },
      { label: "Beri banyak nasihat sebelum ia selesai bicara.", next: "advice", points: 1, note: "Nasihat bisa menunggu; pastikan dulu apa yang ia butuhkan." },
    ],
  },
  minimize: {
    title: "Dina jadi diam",
    text: "Kamu melihat Dina berhenti membalas. Kamu sadar ucapanmu mungkin terasa meremehkan.",
    options: [
      { label: "Minta maaf, lalu tanya apakah ia ingin bercerita.", next: "support", points: 2, note: "Memperbaiki percakapan juga bagian dari menjadi teman." },
      { label: "Menyuruhnya berhenti bersikap sensitif.", next: "privacy", points: 0, note: "Menyalahkan perasaan biasanya membuat orang makin sulit terbuka." },
    ],
  },
  secret: {
    title: "Dina bilang ia merasa tidak aman",
    text: "Ia meminta kamu merahasiakan semuanya. Kamu belum tahu detailnya, tetapi kamu merasa ada risiko keselamatan.",
    options: [
      { label: "Tetap mendampingi dan ajak bicara orang dewasa yang dipercaya.", next: "support", points: 3, note: "Jangan tangani bahaya sendirian; keselamatan lebih penting daripada janji rahasia." },
      { label: "Simpan sendiri karena sudah telanjur berjanji.", next: "privacy", points: 0, note: "Dalam situasi bahaya, libatkan orang dewasa tepercaya meski teman meminta rahasia." },
    ],
  },
  support: {
    title: "Kamu menemani Dina mencari dukungan",
    text: "Kamu mendengarkan dan menanyakan apakah ia ingin ditemani bicara dengan guru BK, keluarga yang dipercaya, atau konselor. Kamu juga ingat bahwa kamu tidak harus menangani semuanya sendirian.",
    ending: true,
  },
  privacy: {
    title: "Dina butuh ruang yang lebih aman",
    text: "Berbagi cerita pribadi tanpa izin dapat membuat teman kehilangan rasa aman. Jika ada risiko keselamatan, jangan menyebarkannya ke grup—ajak orang dewasa yang tepat untuk membantu.",
    ending: true,
  },
  advice: {
    title: "Kamu menyadari ia belum selesai bercerita",
    text: "Kamu berhenti sebentar lalu bertanya, “Kamu ingin aku dengarkan dulu atau kita pikirkan langkah bersama?” Memberi pilihan membantu menjaga percakapan tetap setara.",
    ending: true,
  },
};

export function StoryQuest() {
  const [nodeId, setNodeId] = useState("start");
  const [choice, setChoice] = useState(null);
  const [points, setPoints] = useState(0);
  const node = STORY[nodeId];
  const { complete, isSignedIn } = useCompletion("story-quest");
  useEffect(() => { if (node.ending) complete(); }, [complete, node.ending]);
  const reset = () => { setNodeId("start"); setChoice(null); setPoints(0); };
  const advance = () => {
    if (!choice) return;
    setPoints((score) => score + choice.points);
    setNodeId(choice.next);
    setChoice(null);
  };

  return (
    <GameShell title="Story Quest: Jadi Teman yang Hadir">
      <p className="mt-2 text-sm text-[#68748C]">Cerita bercabang: pilih respons dan lihat dampaknya. Ini latihan, bukan penilaian atas pengalamanmu.</p>
      {node.ending ? (
        <Completion isSignedIn={isSignedIn} onRetry={reset}>
          {points >= 5 ? "Kamu memberi dukungan dengan empati." : "Setiap pilihan bisa jadi kesempatan belajar."}
        </Completion>
      ) : (
        <div className="sal-card mt-6 p-6 sm:p-8" data-testid="story-quest-card">
          <p className="text-xs font-bold uppercase tracking-wider text-[#7552D6]">Cerita bercabang</p>
          <h2 className="mt-2 text-2xl font-bold">{node.title}</h2>
          <p className="mt-3 leading-relaxed text-[#68748C]">{node.text}</p>
          <div className="mt-6 grid gap-3">
            {node.options.map((option, i) => (
              <button key={i} onClick={() => setChoice(option)} className={`rounded-2xl border-2 px-4 py-4 text-left font-semibold ${choice === option ? "border-[#7552D6] bg-[#F5F0FF]" : "border-[#EDE6FF] bg-white hover:border-[#7552D6]/50"}`}>
                {option.label}
              </button>
            ))}
          </div>
          {choice && (
            <div className="mt-5 rounded-2xl bg-[#FFF4DC] p-4 text-sm">
              <p>{choice.note}</p>
              <button onClick={advance} className="sal-btn-primary mt-4">Lanjutkan cerita</button>
            </div>
          )}
        </div>
      )}
    </GameShell>
  );
}
