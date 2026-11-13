import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { SignOutButton } from "@clerk/react";
import { Menu, X, Star, LayoutDashboard, ShieldCheck, Instagram, Mail, Flame, LogOut } from "lucide-react";
import { useSafeAuth, useAuthMode } from "@/lib/auth";

const STAFF_ROLES = ["admin", "editor", "fact_checker", "event_manager", "counselor", "moderator"];
import { Logo } from "@/components/brand/Logo";
import { useMe } from "@/lib/api";

const LINKS = [
  ["/", "Beranda"], ["/talk", "Smile Talk"], ["/learn", "Smile Learn"], ["/play", "Smile Play"],
  ["/update", "Smile Update"], ["/komunitas", "Komunitas"], ["/pikr", "PIK-R Hub"],
];

const NavItems = ({ onClick }) =>
  LINKS.map(([to, label]) => (
    <NavLink key={to} to={to} end={to === "/"} onClick={onClick} data-testid={`nav-${label.toLowerCase().replace(/\s/g, "-")}`}
      className={({ isActive }) => `rounded-full px-3 py-2 text-sm font-semibold transition-colors ${isActive ? "bg-[#F5F0FF] text-[#7552D6]" : "text-[#19264C]/80 hover:text-[#7552D6]"}`}>
      {label}
    </NavLink>
  ));

const UserArea = () => {
  const { me } = useMe();
  const { enabled } = useAuthMode();
  const { isSignedIn } = useSafeAuth();

  if (!enabled) {
    return (
      <>
        <Link to="/sign-in" className="sal-btn-primary !py-2" data-testid="nav-login-btn">Masuk</Link>
        <Link to="/sign-up" className="sal-btn-ghost !py-2" data-testid="nav-sign-up-btn">Daftar</Link>
      </>
    );
  }

  if (!isSignedIn) {
    return (
      <>
        <Link to="/sign-in" className="sal-btn-primary !py-2" data-testid="nav-login-btn">Masuk</Link>
        <Link to="/sign-up" className="sal-btn-ghost !py-2" data-testid="nav-sign-up-btn">Daftar</Link>
      </>
    );
  }

  return (
    <>
      {me && (
        <Link to="/dashboard" className="sal-pill bg-[#FFF4DC] text-[#19264C]" data-testid="nav-xp-pill">
          <Star className="h-3.5 w-3.5 fill-[#FFA24A] text-[#FFA24A]" /> Lv {me.level} · {me.xp} XP{me.streak ? <span className="ml-1 inline-flex items-center gap-0.5 text-[#E0592A]"><Flame className="h-3.5 w-3.5" />{me.streak}</span> : null}
        </Link>
      )}
      {me && STAFF_ROLES.includes(me.role) && (
        <Link to="/admin" className="hidden rounded-full p-2 text-[#7552D6] hover:bg-[#F5F0FF] sm:inline-flex" title="SMILE Content Studio" data-testid="nav-admin-link">
          <ShieldCheck className="h-5 w-5" />
        </Link>
      )}
      <Link to="/dashboard" className="hidden rounded-full p-2 text-[#7552D6] hover:bg-[#F5F0FF] sm:inline-flex" title="Dashboard" data-testid="nav-dashboard-link">
        <LayoutDashboard className="h-5 w-5" />
      </Link>
      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7552D6] text-xs font-bold text-white" data-testid="nav-user-badge">{me?.name?.[0] || "U"}</div>
      <SignOutButton redirectUrl="/">
        <button type="button" className="sal-btn-ghost !py-2" data-testid="nav-logout-btn">
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Keluar</span>
        </button>
      </SignOutButton>
    </>
  );
};

export const Navbar = () => {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[#EDE6FF] bg-white/80 backdrop-blur-xl">
      <div className="sal-container flex h-16 items-center justify-between gap-4">
        <Link to="/" data-testid="nav-home-logo"><Logo compact /></Link>
        <nav className="hidden items-center gap-0.5 xl:flex"><NavItems /></nav>
        <div className="flex items-center gap-2">
          <UserArea />
          <button className="rounded-full p-2 xl:hidden" onClick={() => setOpen(!open)} data-testid="nav-mobile-toggle" aria-label="Menu">
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="sal-container flex flex-col gap-1 pb-4 xl:hidden" data-testid="nav-mobile-menu">
          <NavItems onClick={() => setOpen(false)} />
        </nav>
      )}
    </header>
  );
};

const Footer = () => (
  <footer className="mt-24 bg-[#19264C] text-white">
    <div className="sal-container grid gap-10 py-14 md:grid-cols-4">
      <div className="md:col-span-2">
        <Logo variant="white" />
        <p className="mt-5 max-w-md text-sm text-white/70">
          Ekosistem digital pemberdayaan remaja. Inovasi Duta GenRe Provinsi Banten, terbuka untuk remaja dan PIK-R di seluruh Indonesia.
        </p>
        <p className="mt-4 font-display text-lg text-[#FFDA79]">And together we find the smile.</p>
      </div>
      <div className="flex flex-col gap-2 text-sm text-white/80">
        <span className="mb-1 font-bold text-white">Jelajahi</span>
        {LINKS.slice(1).map(([to, l]) => <Link key={to} to={to} className="hover:text-[#FFDA79]">{l}</Link>)}
        <Link to="/brand" className="hover:text-[#FFDA79]" data-testid="footer-brand-link">Aset Brand</Link>
      </div>
      <div className="flex flex-col gap-2 text-sm text-white/80">
        <span className="mb-1 font-bold text-white">Butuh bantuan segera?</span>
        <span>Darurat: 112</span>
        <span>SEJIWA: 119 ext 8</span>
        <span>SAPA (kekerasan): 129</span>
        <a href="mailto:lab.smileaction@gmail.com" className="mt-2 inline-flex items-center gap-2 hover:text-[#FFDA79]"><Mail className="h-4 w-4" />lab.smileaction@gmail.com</a>
        <span className="inline-flex items-center gap-2 text-white/50"><Instagram className="h-4 w-4" />[@instagram]</span>
      </div>
    </div>
    <div className="border-t border-white/10 py-5 text-center text-xs text-white/50">© 2026 SMILE ACTION LAB · We Listen. We Care. We Guide.</div>
  </footer>
);

export default function Layout() {
  const { pathname } = useLocation();
  const hideFooter = pathname.startsWith("/talk");
  return (
    <div className="min-h-screen">
      <Navbar />
      <main><Outlet /></main>
      {!hideFooter && <Footer />}
    </div>
  );
}
