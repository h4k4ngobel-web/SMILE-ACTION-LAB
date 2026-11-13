const PALETTE = {
  color: { left: "#7552D6", right: "#FFA24A", smile: "#FFFFFF", text: "#19264C", accent: "#FFA24A", tag: "#7552D6" },
  white: { left: "#FFFFFF", right: "#FFFFFF", smile: "#7552D6", text: "#FFFFFF", accent: "#FFDA79", tag: "#FFFFFF" },
  mono: { left: "#19264C", right: "#19264C", smile: "#FFFFFF", text: "#19264C", accent: "#19264C", tag: "#19264C" },
};

export const LogoMark = ({ variant = "color", className = "h-10 w-10" }) => {
  const p = PALETTE[variant];
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="SMILE ACTION LAB">
      <path d="M30 6C16 6 6 16 6 29c0 9 5 16 12 20-1 4-4 8-8 10 8 0 14-3 18-8h2V6z" fill={p.left} />
      <path d="M34 6c14 0 24 10 24 23 0 9-5 16-12 20 1 4 4 8 8 10-8 0-14-3-18-8h-2V6z" fill={p.right} />
      <circle cx="20" cy="24" r="3.6" fill={p.smile} />
      <circle cx="44" cy="24" r="3.6" fill={p.smile} />
      <path d="M18 34c4 8 24 8 28 0" stroke={p.smile} strokeWidth="5" strokeLinecap="round" fill="none" />
    </svg>
  );
};

export const Logo = ({ variant = "color", compact = false, className = "" }) => {
  const p = PALETTE[variant];
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} data-testid="brand-logo">
      <LogoMark variant={variant} className={compact ? "h-9 w-9" : "h-11 w-11"} />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[15px] font-bold tracking-tight" style={{ color: p.text }}>
          SMILE <span style={{ color: variant === "color" ? "#7552D6" : p.text }}>ACTION</span> LAB
        </span>
        {!compact && (
          <span className="mt-1 text-[9px] font-bold tracking-[0.16em]" style={{ color: p.tag }}>
            WE LISTEN. WE CARE. WE GUIDE.
          </span>
        )}
      </span>
    </span>
  );
};
