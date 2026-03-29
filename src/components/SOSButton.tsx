"use client";

import { useState } from "react";
import { LatLng } from "@/lib/types";

interface SOSButtonProps {
  userPosition: LatLng;
}

export default function SOSButton({ userPosition }: SOSButtonProps) {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  const handleCall = () => {
    window.location.href = "tel:112";
    setOpen(false);
  };

  const handleSMS = () => {
    const coords = `${userPosition.lat.toFixed(6)},${userPosition.lng.toFixed(6)}`;
    const mapsUrl = `https://maps.google.com/?q=${coords}`;
    const body = encodeURIComponent(`SOS - Ho bisogno di aiuto. La mia posizione: ${mapsUrl}`);
    window.location.href = `sms:112?body=${body}`;
    setOpen(false);
  };

  const handleShare = async () => {
    const coords = `${userPosition.lat.toFixed(6)},${userPosition.lng.toFixed(6)}`;
    const mapsUrl = `https://maps.google.com/?q=${coords}`;
    const text = `SOS - Ho bisogno di aiuto.\nPosizione: ${mapsUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({ title: "SOS R-Home", text });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(text);
      setSent(true);
      setTimeout(() => setSent(false), 2000);
    }
    setOpen(false);
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="absolute bottom-20 md:bottom-6 left-[68px] z-20 w-[48px] h-[48px] rounded-full bg-red-600 text-white shadow-xl flex items-center justify-center hover:bg-red-700 transition active:scale-90"
      >
        <span className="material-symbols-outlined text-[22px]">sos</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 animate-fade-in">
          <div className="bg-white w-[320px] rounded-3xl shadow-2xl overflow-hidden animate-slide-in-up">
            <div className="bg-red-600 text-white px-5 py-4 flex items-center gap-3">
              <span className="material-symbols-outlined text-[28px]">emergency</span>
              <div>
                <h3 className="font-bold text-base">SOS Emergenza</h3>
                <p className="text-[11px] text-red-100">Contatta le autorità in modo sicuro</p>
              </div>
            </div>

            <div className="p-4 space-y-2.5">
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
                onClick={handleSMS}
                className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-orange-50 hover:bg-orange-100 transition text-left"
              >
                <div className="w-11 h-11 bg-orange-500 rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-white text-[20px]">sms</span>
                </div>
                <div>
                  <div className="text-sm font-bold text-gray-800">SMS silenzioso al 112</div>
                  <div className="text-[10px] text-gray-500">Invia la tua posizione GPS senza parlare</div>
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
                  <div className="text-[10px] text-gray-500">Invia la tua posizione a un contatto fidato</div>
                </div>
              </button>
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => setOpen(false)}
                className="w-full py-2.5 text-sm text-gray-500 font-medium hover:text-gray-700 transition"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {sent && (
        <div className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[400] bg-green-500 text-white rounded-xl shadow-xl px-4 py-2.5 flex items-center gap-2 animate-fade-in-up text-sm font-medium">
          <span className="material-symbols-outlined text-[16px]">check_circle</span>
          Posizione copiata
        </div>
      )}
    </>
  );
}
