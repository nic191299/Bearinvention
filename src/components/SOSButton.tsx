"use client";

import { useState } from "react";
import { LatLng } from "@/lib/types";
import { getSessionId } from "@/lib/session";
import type { UserProfile } from "@/lib/auth";

interface SOSButtonProps {
  userPosition: LatLng;
  userProfile?: UserProfile | null;
  userId?: string;
  forceOpen?: boolean;
  onClose?: () => void;
}

export default function SOSButton({ userPosition, userProfile, userId, forceOpen, onClose }: SOSButtonProps) {
  const [open, setOpen] = useState(false);
  const isOpen = forceOpen !== undefined ? forceOpen : open;
  const handleClose = () => { setOpen(false); onClose?.(); };
  const [sent, setSent] = useState<string | null>(null);

  const coords = `${userPosition.lat.toFixed(6)},${userPosition.lng.toFixed(6)}`;
  const mapsUrl = `https://maps.google.com/?q=${coords}`;

  // Log SOS event to DB (silent, no UI interaction)
  const logSos = async (type: string) => {
    try {
      await fetch("/api/sos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lat: userPosition.lat,
          lng: userPosition.lng,
          type,
          userId: userId || null,
          sessionId: getSessionId(),
        }),
      });
    } catch { /* non-critical */ }
  };

  const handleCall = () => {
    logSos("call_112");
    window.location.href = "tel:112";
    handleClose();
  };

  const handleSilentSMS = () => {
    logSos("silent_sms");
    const body = encodeURIComponent(`SOS - Ho bisogno di aiuto. La mia posizione: ${mapsUrl}`);
    window.location.href = `sms:112?body=${body}`;
    handleClose();
  };

  const handleTrustedContact = () => {
    if (!userProfile?.trusted_contact_phone) return;
    logSos("trusted_contact");
    const name = userProfile.trusted_contact_name || "Contatto";
    const msg = encodeURIComponent(
      `🚨 SOS — ${name}, ho bisogno di aiuto!\nLa mia posizione attuale:\n${mapsUrl}\n\nInviato automaticamente da Salvo`
    );
    const phone = userProfile.trusted_contact_phone.replace(/\s/g, "");
    const waUrl = `https://wa.me/${phone.replace("+", "")}?text=${msg}`;
    window.open(waUrl, "_blank");
    handleClose();
    setSent(`Messaggio preparato per ${name}`);
    setTimeout(() => setSent(null), 3000);
  };

  const handleShare = async () => {
    logSos("share");
    const text = `🚨 SOS — Ho bisogno di aiuto.\nPosizione: ${mapsUrl}`;
    if (navigator.share) {
      try { await navigator.share({ title: "SOS Salvo", text }); } catch { /* cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      setSent("Posizione copiata negli appunti");
      setTimeout(() => setSent(null), 2500);
    }
    handleClose();
  };

  const hasTrustedContact = !!(userProfile?.trusted_contact_phone);

  return (
    <>
      {/* Only render trigger button when not externally controlled */}
      {forceOpen === undefined && (
        <button
          onClick={() => setOpen(true)}
          className="absolute bottom-20 md:bottom-6 left-[122px] z-20 w-[48px] h-[48px] rounded-full bg-red-600 text-white shadow-xl flex items-center justify-center hover:bg-red-700 transition active:scale-90"
        >
          <span className="material-symbols-outlined text-[22px]">sos</span>
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 animate-fade-in">
          <div className="bg-white w-[320px] rounded-3xl shadow-2xl overflow-hidden animate-slide-in-up">
            <div className="bg-red-600 text-white px-5 py-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-[28px]">emergency</span>
              <div>
                <h3 className="font-bold text-base">SOS Emergenza</h3>
                <p className="text-[11px] text-red-100">Posizione GPS registrata automaticamente</p>
              </div>
            </div>

            <div className="p-4 space-y-2.5">
              {/* Trusted contact — top priority if set */}
              {hasTrustedContact && (
                <button
                  onClick={handleTrustedContact}
                  className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-purple-50 hover:bg-purple-100 transition text-left border-2 border-purple-200"
                >
                  <div className="w-11 h-11 bg-purple-600 rounded-xl flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-white text-[20px]">favorite</span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">Avvisa {userProfile?.trusted_contact_name || "Contatto fidato"}</div>
                    <div className="text-[10px] text-gray-500">Manda su WhatsApp la tua posizione</div>
                  </div>
                </button>
              )}

              <button
                onClick={handleCall}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-red-50 hover:bg-red-100 transition text-left"
              >
                <div className="w-11 h-11 bg-red-600 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-[20px]">call</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">Chiama 112</div>
                  <div className="text-[10px] text-gray-500">Chiamata diretta alle autorità</div>
                </div>
              </button>

              <button
                onClick={handleSilentSMS}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-orange-50 hover:bg-orange-100 transition text-left"
              >
                <div className="w-11 h-11 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-[20px]">sms</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">SMS silenzioso al 112</div>
                  <div className="text-[10px] text-gray-500">Posizione GPS — premi solo Invia</div>
                </div>
              </button>

              <button
                onClick={handleShare}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-blue-50 hover:bg-blue-100 transition text-left"
              >
                <div className="w-11 h-11 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-[20px]">share_location</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">Condividi posizione</div>
                  <div className="text-[10px] text-gray-500">Invia via qualsiasi app installata</div>
                </div>
              </button>

              {!hasTrustedContact && (
                <a
                  href="/profile#sos"
                  onClick={() => setOpen(false)}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-purple-600 hover:text-purple-800 transition"
                >
                  <span className="material-symbols-outlined text-[14px]">add_circle</span>
                  Aggiungi un contatto fidato nel profilo
                </a>
              )}
            </div>

            <div className="px-4 pb-4">
              <button onClick={handleClose} className="w-full py-2.5 text-sm text-gray-500 font-medium hover:text-gray-700 transition">
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {sent && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[400] bg-green-500 text-white rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-2 animate-fade-in-up text-sm font-medium whitespace-nowrap">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          {sent}
        </div>
      )}
    </>
  );
}
