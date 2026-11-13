import { useEffect, useRef, useState } from "react";
import { Smilo, Sparkle, Cloud } from "@/components/brand/Smilo";

export const Reveal = ({ children, className = "" }) => {
  const ref = useRef(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); io.disconnect(); } }, { threshold: 0.12 });
    if (ref.current) io.observe(ref.current);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} className={`sal-reveal ${inView ? "is-in" : ""} ${className}`}>{children}</div>;
};

export const PageHeader = ({ eyebrow, title, subtitle, pose = "welcome", children, tone = "light", art }) => {
  const dark = tone === "dark";
  const artClass = art ? `sal-art-header sal-art-${art}` : "";
  return (
    <section className={`relative overflow-hidden ${dark ? "bg-[#7552D6] text-white" : "sal-sky"} ${artClass} sal-grain`}>
      <Cloud className="absolute left-[8%] top-6 w-28 opacity-70 sal-drift" />
      <Cloud className="absolute right-[30%] top-14 w-20 opacity-50 sal-drift sal-d3" />
      <Sparkle className="absolute right-[42%] bottom-10 h-5 w-5 text-[#FFDA79] sal-twinkle" />
      <div className="sal-container relative grid items-center gap-6 py-10 md:grid-cols-[1fr_auto] md:py-14">
        <div className="sal-rise">
          {eyebrow && <p className={`sal-eyebrow ${dark ? "!text-[#FFDA79]" : ""}`}>{eyebrow}</p>}
          <h1 className="mt-2 text-4xl font-bold sm:text-5xl" data-testid="page-title">{title}</h1>
          {subtitle && <p className={`mt-3 max-w-xl text-base md:text-lg ${dark ? "text-white/80" : "text-[#68748C]"}`}>{subtitle}</p>}
          {children && <div className="mt-6">{children}</div>}
        </div>
        <Smilo pose={pose} float className="hidden h-44 md:block lg:h-52" />
      </div>
    </section>
  );
};

export const EmptyState = ({ pose = "rest", title, text, children }) => (
  <div className="sal-card flex flex-col items-center px-6 py-12 text-center" data-testid="empty-state">
    <Smilo pose={pose} className="h-28" />
    <h3 className="mt-4 text-xl font-bold">{title}</h3>
    {text && <p className="mt-1 max-w-sm text-sm text-[#68748C]">{text}</p>}
    {children && <div className="mt-5">{children}</div>}
  </div>
);

export const Loading = ({ text = "SMILO sedang menyiapkan..." }) => (
  <div className="flex flex-col items-center py-16" data-testid="loading-state">
    <Smilo pose="think" className="h-24 sal-float" />
    <p className="mt-3 text-sm font-semibold text-[#68748C]">{text}</p>
  </div>
);
