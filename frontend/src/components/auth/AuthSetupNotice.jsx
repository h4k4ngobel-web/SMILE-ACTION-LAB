import { Link } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";

export default function AuthSetupNotice({ mode }) {
  const isSignUp = mode === "sign-up";

  return (
    <div className="sal-container max-w-xl py-12">
      <section className="sal-card p-6 sm:p-8" data-testid="auth-setup-notice">
        <p className="sal-pill bg-[#FFF4DC] text-[#E08A2E]">Login belum aktif</p>
        <h1 className="mt-4 text-3xl font-bold">
          {isSignUp ? "Daftar akun" : "Masuk ke akun"}
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-[#68748C]">
          Login email dan Google memakai Clerk. Kunci dari project Clerk
          belum dimasukkan ke backend, jadi autentikasi belum bisa digunakan.
        </p>
        <div className="mt-5 rounded-2xl bg-[#F5F0FF] p-4 text-sm">
          <p className="font-bold">Langkah berikutnya:</p>
          <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-[#68748C]">
            <li>
              Buat aplikasi di Clerk, lalu salin publishable key dan secret key
              ke file <code>backend/.env</code>.
            </li>
            <li>
              Aktifkan email dan Google sebagai metode masuk di pengaturan
              aplikasi Clerk.
            </li>
            <li>Restart backend agar konfigurasi baru terbaca.</li>
          </ol>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/sign-in"
            className="sal-btn-primary"
            data-testid="auth-sign-in-link"
          >
            <LogIn className="h-4 w-4" />
            Masuk
          </Link>
          <Link
            to="/sign-up"
            className="sal-btn-ghost"
            data-testid="auth-sign-up-link"
          >
            <UserPlus className="h-4 w-4" />
            Daftar
          </Link>
        </div>
      </section>
    </div>
  );
}
