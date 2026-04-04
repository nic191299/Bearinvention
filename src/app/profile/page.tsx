"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createAuthClient, LEVEL_CONFIG, getLevelProgress, UserProfile } from "@/lib/auth";
import type { User } from "@supabase/supabase-js";

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [activeSection, setActiveSection] = useState<"info" | "sos" | "password">("info");

  // Editable fields
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [trustedName, setTrustedName] = useState("");
  const [trustedPhone, setTrustedPhone] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwError, setPwError] = useState("");

  const supabase = createAuthClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { router.push("/auth/login"); return; }
      setUser(user);
      // Load profile
      supabase.from("profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => {
          if (data) {
            setProfile(data as UserProfile);
            setFullName(data.full_name || "");
            setUsername(data.username || "");
            setTrustedName(data.trusted_contact_name || "");
            setTrustedPhone(data.trusted_contact_phone || "");
          }
          setLoading(false);
        });
    });
  }, []);

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from("profiles").upsert({
      id: user.id,
      full_name: fullName,
      username: username || null,
      trusted_contact_name: trustedName || null,
      trusted_contact_phone: trustedPhone || null,
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (newPassword.length < 8) { setPwError("Minimo 8 caratteri"); return; }
    if (newPassword !== confirmPassword) { setPwError("Le password non coincidono"); return; }
    setPwError("");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) { setPwError(error.message); }
    else { setNewPassword(""); setConfirmPassword(""); setSaved(true); setTimeout(() => setSaved(false), 2000); }
    setSaving(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const level = profile?.level || "rookie";
  const levelCfg = LEVEL_CONFIG[level];
  const score = profile?.score || 0;
  const progress = getLevelProgress(score, level);
  const nextLevel = levelCfg.nextScore ? Object.entries(LEVEL_CONFIG).find(([, v]) => v.minScore === levelCfg.nextScore)?.[1] : null;

  const initials = (fullName || user?.email || "?").substring(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center gap-3">
          <Link href="/" className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
            <span className="material-symbols-outlined text-gray-600 text-[20px]">arrow_back</span>
          </Link>
          <h1 className="text-base font-bold text-gray-800 flex-1">Il mio profilo</h1>
          <button onClick={handleLogout} className="text-xs text-red-500 font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px]">logout</span>
            Esci
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">
        {/* Profile card with score */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div className="relative">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-bold text-white shadow-md"
                style={{ backgroundColor: levelCfg.color }}>
                {initials}
              </div>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center shadow-sm"
                style={{ backgroundColor: levelCfg.color }}>
                <span className="material-symbols-outlined text-white text-[12px]">{levelCfg.icon}</span>
              </div>
            </div>

            <div className="flex-1">
              <div className="font-bold text-gray-800 text-base">{fullName || "Utente"}</div>
              <div className="text-xs text-gray-400">{user?.email}</div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-bold px-2 py-0.5 rounded-full text-white" style={{ backgroundColor: levelCfg.color }}>
                  {levelCfg.label}
                </span>
                <span className="text-xs font-bold text-gray-700">{score} pt</span>
              </div>
            </div>
          </div>

          {/* Score progress */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-[10px] text-gray-500 mb-1">
              <span>{score} pt</span>
              {nextLevel ? <span>{levelCfg.nextScore} pt → {nextLevel.label}</span> : <span>Livello massimo!</span>}
            </div>
            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${progress}%`, backgroundColor: levelCfg.color }} />
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            {[
              { label: "Segnalazioni", value: profile?.reports_count || 0, icon: "warning", color: "#f97316" },
              { label: "Conferme date", value: profile?.confirmations_given || 0, icon: "thumb_up", color: "#10b981" },
              { label: "Punteggio", value: score, icon: "star", color: "#f59e0b" },
            ].map((s) => (
              <div key={s.label} className="text-center p-3 bg-gray-50 rounded-xl">
                <span className="material-symbols-outlined text-[18px] block mb-1" style={{ color: s.color }}>{s.icon}</span>
                <div className="text-lg font-bold text-gray-800">{s.value}</div>
                <div className="text-[9px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Score guide */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <h3 className="text-xs font-bold text-gray-700 mb-3 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-amber-500">emoji_events</span>
            Come guadagni punti
          </h3>
          <div className="space-y-2">
            {[
              { action: "Fai una segnalazione", points: "+5 pt", color: "#3b82f6" },
              { action: "La tua segnalazione viene confermata", points: "+2 pt", color: "#10b981" },
              { action: "Confermi la segnalazione di un altro", points: "+1 pt", color: "#6366f1" },
            ].map((r) => (
              <div key={r.action} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-xs text-gray-600">{r.action}</span>
                <span className="text-xs font-bold" style={{ color: r.color }}>{r.points}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Section tabs */}
        <div className="flex gap-2">
          {[
            { key: "info", label: "Dati", icon: "person" },
            { key: "sos", label: "SOS", icon: "emergency" },
            { key: "password", label: "Password", icon: "lock" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveSection(t.key as typeof activeSection)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold transition ${
                activeSection === t.key ? "bg-blue-600 text-white" : "bg-white text-gray-500 border border-gray-200"
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {/* Info section */}
        {activeSection === "info" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-800">Informazioni personali</h3>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Nome completo</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Username (opzionale)</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@il-tuo-username"
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Email</label>
              <input type="email" value={user?.email || ""} disabled className="w-full px-3 py-2.5 bg-gray-100 rounded-xl text-sm text-gray-400 cursor-not-allowed" />
            </div>
            <SaveButton onClick={handleSaveProfile} saving={saving} saved={saved} />
          </div>
        )}

        {/* SOS section */}
        {activeSection === "sos" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <div className="flex items-start gap-3 p-3 bg-red-50 rounded-xl border border-red-100">
              <span className="material-symbols-outlined text-red-500 text-[20px] shrink-0">emergency</span>
              <div className="text-xs text-red-700">
                <div className="font-bold mb-1">Contatto di emergenza</div>
                In caso di SOS, l&apos;app può inviare automaticamente la tua posizione a questa persona tramite WhatsApp o SMS.
              </div>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Nome contatto fidato</label>
              <input
                type="text"
                value={trustedName}
                onChange={(e) => setTrustedName(e.target.value)}
                placeholder="Es. Mamma, Marco, ..."
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Numero di telefono</label>
              <input
                type="tel"
                value={trustedPhone}
                onChange={(e) => setTrustedPhone(e.target.value)}
                placeholder="+39 333 123 4567"
                className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-gray-400 mt-1">Formato internazionale: +39 per l&apos;Italia</p>
            </div>
            <SaveButton onClick={handleSaveProfile} saving={saving} saved={saved} />
          </div>
        )}

        {/* Password section */}
        {activeSection === "password" && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 space-y-3">
            <h3 className="text-sm font-bold text-gray-800">Cambia password</h3>
            {user?.app_metadata?.provider === "google" || user?.app_metadata?.provider === "facebook" ? (
              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-xl text-xs text-blue-700">
                <span className="material-symbols-outlined text-[16px]">info</span>
                Hai effettuato l&apos;accesso con {user.app_metadata.provider}. La password non è gestita da noi.
              </div>
            ) : (
              <>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Nuova password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Minimo 8 caratteri"
                    minLength={8}
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 mb-1 block">Conferma nuova password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Ripeti la nuova password"
                    className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {pwError && <p className="text-xs text-red-500">{pwError}</p>}
                <SaveButton onClick={handleChangePassword} saving={saving} saved={saved} label="Cambia password" />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SaveButton({ onClick, saving, saved, label = "Salva modifiche" }: { onClick: () => void; saving: boolean; saved: boolean; label?: string }) {
  return (
    <button
      onClick={onClick}
      disabled={saving}
      className={`w-full py-3 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
        saved ? "bg-green-500 text-white" : "bg-blue-600 text-white hover:bg-blue-700"
      } disabled:opacity-50`}
    >
      {saving ? (
        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
      ) : saved ? (
        <><span className="material-symbols-outlined text-[16px]">check_circle</span>Salvato!</>
      ) : (
        label
      )}
    </button>
  );
}
