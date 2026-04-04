"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { createAuthClient } from "@/lib/auth";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const supabase = createAuthClient();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/update-password`,
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 flex items-center justify-center px-4">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

      <div className="relative z-10 w-full max-w-sm animate-fade-in-up">
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-2xl shadow-xl mb-3">
            <img src="/logo.svg" alt="BearInvention" className="w-9 h-9" />
          </Link>
          <h1 className="text-2xl font-bold text-white">Password dimenticata</h1>
          <p className="text-blue-200 text-sm mt-1">Ti mandiamo il link di recupero</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-6">
          {sent ? (
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-green-500 text-[32px]">mark_email_read</span>
              </div>
              <div>
                <h3 className="font-bold text-gray-800 mb-1">Email inviata!</h3>
                <p className="text-sm text-gray-500">
                  Controlla <strong>{email}</strong> — troverai un link per reimpostare la password.
                  Potrebbe impiegare qualche minuto.
                </p>
              </div>
              <Link href="/auth/login" className="block w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition text-center">
                Torna al login
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <p className="text-sm text-gray-500">
                Inserisci l&apos;email con cui ti sei registrato. Ti invieremo un link per reimpostare la password.
              </p>
              <div>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="la-tua@email.it"
                  required
                  className="w-full px-4 py-3 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl border border-red-100">
                  <span className="material-symbols-outlined text-red-500 text-[16px]">error</span>
                  <span className="text-xs text-red-700">{error}</span>
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm hover:bg-blue-700 transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                Invia link di recupero
              </button>
              <p className="text-center text-xs text-gray-500">
                <Link href="/auth/login" className="text-blue-600 hover:underline">← Torna al login</Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
