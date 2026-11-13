export const POSES = ["welcome", "study", "think", "cheer", "care", "read", "play", "invite", "rest", "hero"];

export const POSE_LABEL = {
  welcome: "Menyapa", study: "Belajar", think: "Berpikir", cheer: "Semangat", care: "Peduli",
  read: "Membaca", play: "Bermain", invite: "Mengajak", rest: "Istirahat", hero: "Halo!",
};

export const Smilo = ({ pose = "welcome", className = "", alt, float = false }) => (
  <img
    src={`/brand/smilo-${pose}.png`}
    alt={alt || `SMILO ${POSE_LABEL[pose] || ""}`}
    className={`select-none object-contain ${float ? "sal-float" : ""} ${className}`}
    draggable={false}
    loading="lazy"
  />
);

const COVERS = {
  welcome: "#EAF5FF", study: "#F5F0FF", think: "#FFF4DC", cheer: "#FFE9D6", care: "#FDE7E7",
  read: "#E3F7F2", play: "#EDE6FF", invite: "#FFF4DC", rest: "#EAF5FF", hero: "#F5F0FF",
};

export const SmiloCover = ({ pose = "welcome", className = "" }) => (
  <div className={`relative overflow-hidden ${className}`} style={{ background: COVERS[pose] || "#F5F0FF" }}>
    <Sparkle className="absolute left-4 top-4 h-5 w-5 text-[#FFDA79] sal-twinkle" />
    <Sparkle className="absolute right-6 bottom-6 h-3 w-3 text-[#7552D6]/40 sal-twinkle sal-d2" />
    <div className="absolute -bottom-10 -right-6 h-32 w-32 rounded-full bg-white/60" />
    <Smilo pose={pose} className="relative mx-auto h-full max-h-40 py-3" />
  </div>
);

export const Sparkle = ({ className = "" }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
    <path d="M12 0c.9 6.5 5.5 11.1 12 12-6.5.9-11.1 5.5-12 12-.9-6.5-5.5-11.1-12-12C6.5 11.1 11.1 6.5 12 0z" />
  </svg>
);

export const Cloud = ({ className = "" }) => (
  <svg viewBox="0 0 120 50" className={className} fill="white" aria-hidden="true">
    <path d="M20 48c-11 0-20-7-20-16s8-15 18-15c3-10 13-17 25-17 13 0 23 8 26 19 2-1 5-1 7-1 11 0 20 7 20 15 0 1 0 2-.2 3C104 37 120 39 120 44c0 3-4 4-8 4H20z" />
  </svg>
);

export const Hills = ({ className = "" }) => (
  <svg viewBox="0 0 1440 160" preserveAspectRatio="none" className={className} aria-hidden="true">
    <path d="M0 110 C 220 40 420 40 640 100 S 1060 150 1440 70 L1440 160 L0 160Z" fill="#BFEBD9" />
    <path d="M0 135 C 260 85 520 95 760 130 S 1200 150 1440 115 L1440 160 L0 160Z" fill="#8FDCC2" />
  </svg>
);
