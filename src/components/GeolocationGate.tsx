"use client";

interface GeolocationGateProps {
  onAllow: () => void;
  onSkip: () => void;
}

export default function GeolocationGate({ onAllow, onSkip }: GeolocationGateProps) {
  return (
    <div
      className="fixed inset-0 z-[200] flex flex-col items-center justify-center px-6"
      style={{ background: "linear-gradient(145deg, #061826 0%, #0A2438 50%, #061826 100%)" }}
    >
      {/* Subtle teal dot grid */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, #05C3B2 1px, transparent 0)", backgroundSize: "28px 28px" }}
      />

      <div className="relative z-10 max-w-sm w-full text-center space-y-6 animate-fade-in-up">
        {/* Logo + brand */}
        <div>
          <div
            className="w-20 h-20 rounded-3xl shadow-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "#05C3B2", boxShadow: "0 16px 48px rgba(5,195,178,0.4)" }}
          >
            <img src="/logo.svg" alt="Salvo" className="w-12 h-12" style={{ filter: "brightness(0) invert(1)" }} />
          </div>
          <h1 className="text-4xl font-black tracking-tight" style={{ color: "#05C3B2" }}>Salvo</h1>
          <p className="text-white/40 text-sm mt-1">La tua sicurezza in città</p>
        </div>

        {/* Permission card */}
        <div
          className="rounded-3xl p-6 border space-y-4"
          style={{ background: "rgba(255,255,255,0.05)", borderColor: "rgba(5,195,178,0.2)" }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto"
            style={{ background: "rgba(5,195,178,0.15)" }}
          >
            <span className="material-symbols-outlined text-[32px]" style={{ color: "#05C3B2" }}>location_on</span>
          </div>

          <div>
            <h2 className="text-lg font-bold text-white mb-2">Abilita la posizione</h2>
            <p className="text-white/50 text-sm leading-relaxed">
              Salvo usa la tua posizione per mostrare le segnalazioni vicino a te, guidarti verso percorsi sicuri e permettere ai tuoi cari di trovarti in caso di emergenza.
            </p>
          </div>

          <div className="space-y-2 text-left">
            {[
              { icon: "shield",          text: "Segnalazioni di sicurezza in tempo reale" },
              { icon: "route",           text: "Percorsi sicuri personalizzati" },
              { icon: "family_restroom", text: "Condivisione posizione con la famiglia" },
            ].map((f) => (
              <div key={f.icon} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(5,195,178,0.15)" }}
                >
                  <span className="material-symbols-outlined text-[14px]" style={{ color: "#05C3B2" }}>{f.icon}</span>
                </div>
                <span className="text-white/60 text-xs">{f.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Buttons */}
        <div className="space-y-3">
          <button
            onClick={onAllow}
            className="w-full py-4 font-bold text-base rounded-2xl shadow-lg transition active:scale-95 flex items-center justify-center gap-2 text-white"
            style={{ background: "linear-gradient(135deg, #07DCC8 0%, #05C3B2 100%)", boxShadow: "0 8px 28px rgba(5,195,178,0.45)" }}
          >
            <span className="material-symbols-outlined text-[20px]">gps_fixed</span>
            Usa la mia posizione
          </button>
          <button
            onClick={onSkip}
            className="w-full py-3 text-sm font-medium transition"
            style={{ color: "rgba(5,195,178,0.5)" }}
          >
            Continua senza posizione
          </button>
        </div>

        <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.25)" }}>
          La posizione viene usata solo all&apos;interno dell&apos;app e non viene condivisa con terze parti senza il tuo consenso.
        </p>
      </div>
    </div>
  );
}
