"use client";

interface GeolocationGateProps {
  onAllow: () => void;
  onSkip: () => void;
}

export default function GeolocationGate({ onAllow, onSkip }: GeolocationGateProps) {
  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 px-6">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)", backgroundSize: "32px 32px" }} />

      <div className="relative z-10 max-w-sm w-full text-center space-y-6 animate-fade-in-up">
        {/* Logo */}
        <div>
          <div className="w-20 h-20 bg-white rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-4">
            <img src="/logo.svg" alt="Safez" className="w-12 h-12" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight">Safez</h1>
          <p className="text-blue-200 text-sm mt-1">La tua sicurezza in città</p>
        </div>

        {/* Permission card */}
        <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 space-y-4">
          <div className="w-14 h-14 bg-blue-500/30 rounded-2xl flex items-center justify-center mx-auto">
            <span className="material-symbols-outlined text-white text-[32px]">location_on</span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-2">Abilita la posizione</h2>
            <p className="text-blue-100 text-sm leading-relaxed">
              Safez usa la tua posizione per mostrare le segnalazioni vicino a te, guidarti verso percorsi sicuri e permettere ai tuoi cari di trovarti in caso di emergenza.
            </p>
          </div>

          <div className="space-y-2 text-left">
            {[
              { icon: "shield", text: "Segnalazioni di sicurezza in tempo reale" },
              { icon: "route", text: "Percorsi sicuri personalizzati" },
              { icon: "family_restroom", text: "Condivisione posizione con la famiglia" },
            ].map((f) => (
              <div key={f.icon} className="flex items-center gap-3">
                <div className="w-7 h-7 bg-blue-500/40 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-blue-200 text-[14px]">{f.icon}</span>
                </div>
                <span className="text-blue-100 text-xs">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onAllow}
            className="w-full py-4 bg-white text-blue-700 font-bold text-base rounded-2xl shadow-lg hover:bg-blue-50 transition active:scale-98 flex items-center justify-center gap-2"
          >
            <span className="material-symbols-outlined text-[20px]">gps_fixed</span>
            Usa la mia posizione
          </button>
          <button
            onClick={onSkip}
            className="w-full py-3 text-blue-300 text-sm font-medium hover:text-white transition"
          >
            Continua senza posizione
          </button>
        </div>

        <p className="text-blue-400 text-[10px]">
          La posizione viene usata solo all&apos;interno dell&apos;app e non viene condivisa con terze parti senza il tuo consenso.
        </p>
      </div>
    </div>
  );
}
