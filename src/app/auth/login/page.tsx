"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createAuthClient } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPw, setShowPw] = useState(false);

  const supabase = createAuthClient();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === "Invalid login credentials" ? "Email o password errati" : error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
  };

  const handleFacebook = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "facebook",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/` },
    });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "linear-gradient(145deg, #061826 0%, #0A2438 50%, #061826 100%)" }}
    >
      {/* Subtle dot grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #05C3B2 1px, transparent 0)", backgroundSize: "28px 28px" }}
      />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        {/* Logo + brand */}
        <div className="text-center mb-7">
          <Link href="/" className="inline-flex flex-col items-center gap-3">
            <div
              className="w-16 h-16 rounded-3xl shadow-2xl flex items-center justify-center"
              style={{ background: "#05C3B2", boxShadow: "0 12px 40px rgba(5,195,178,0.4)" }}
            >
              <img src="/logo.svg" alt="Salvo" className="w-10 h-10" style={{ filter: "brightness(0) invert(1)" }} />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight" style={{ color: "#05C3B2" }}>Salvo</h1>
              <p className="text-white/40 text-sm mt-0.5">Accedi al tuo account</p>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6 space-y-4">
          {/* OAuth buttons */}
          <button
            onClick={handleGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition font-medium text-sm text-gray-700 disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continua con Google
          </button>

          <button
            onClick={handleFacebook}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#1877F2] rounded-xl hover:bg-[#166FE5] transition font-medium text-sm text-white disabled:opacity-50"
          >
            <svg className="w-5 h-5 fill-white" viewBox="0 0 24 24">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
            </svg>
            Continua con Facebook
          </button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400 font-medium">oppure</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          {/* Email/password form */}
          <form onSubmit={handleLogin} className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="la-tua@email.it"
                required
                className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05C3B2]"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#05C3B2] pr-11"
                />
                <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-3 top-1/2 -translate-y-1/2">
                  <span className="material-symbols-outlined text-gray-400 text-[18px]">{showPw ? "visibility_off" : "visibility"}</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                <span className="material-symbols-outlined text-red-500 text-[16px]">error</span>
                <span className="text-xs text-red-700">{error}</span>
              </div>
            )}

            <div className="text-right">
              <Link href="/auth/forgot-password" className="text-xs font-medium hover:underline" style={{ color: "#05C3B2" }}>
                Password dimenticata?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 text-white rounded-xl font-bold text-sm transition disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: loading ? "#04A899" : "linear-gradient(135deg, #07DCC8 0%, #05C3B2 100%)", boxShadow: "0 6px 20px rgba(5,195,178,0.35)" }}
            >
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" style={{ animation: "salvoSpin 0.8s linear infinite" }} />
                : null}
              Accedi
            </button>
          </form>

          <p className="text-center text-xs text-gray-500">
            Non hai un account?{" "}
            <Link href="/auth/register" className="font-bold hover:underline" style={{ color: "#05C3B2" }}>
              Registrati
            </Link>
          </p>
        </div>

        <p className="text-center text-xs mt-4" style={{ color: "rgba(5,195,178,0.5)" }}>
          Salvo — La tua sicurezza in città
        </p>
      </div>
    </div>
  );
}
