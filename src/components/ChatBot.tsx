"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage, LatLng } from "@/lib/types";
import { WeatherData, getWeatherInfo } from "@/lib/weather";

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  userPosition: LatLng;
  weather?: WeatherData | null;
}

export default function ChatBot({ isOpen, onClose, userPosition, weather }: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Ciao! Dimmi dove devi andare e ti trovo il percorso migliore a piedi o con i mezzi. Se c'e' un problema sulla tua strada, te lo dico subito." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg: ChatMessage = { role: "user", content: input };
    const msgs = [...messages, userMsg];
    setMessages(msgs);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: msgs.map((m) => ({ role: m.role, content: m.content })),
          userLocation: userPosition,
          nearbyReports: weather ? [{ message: `[Meteo] ${getWeatherInfo(weather.weatherCode).label}, ${Math.round(weather.temperature)}°C, pioggia: ${weather.precipitation}mm` }] : [],
        }),
      });
      const data = await res.json();
      setMessages([...msgs, { role: "assistant", content: data.error || data.message }]);
    } catch {
      setMessages([...msgs, { role: "assistant", content: "Errore di connessione." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white w-full sm:w-[420px] h-[85vh] sm:h-[600px] sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-slide-in-up sm:animate-fade-in-up">
        <div className="bg-gray-900 text-white px-4 py-3 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[18px]">smart_toy</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm">UrbanMove AI</h3>
              <p className="text-[10px] text-gray-400">Roma - Pedoni e Mezzi</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll bg-gray-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}>
              <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user" ? "bg-blue-600 text-white rounded-br-lg" : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-lg"
              }`}>{msg.content}</div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-2xl shadow-sm border border-gray-100 flex gap-1">
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          )}
        </div>

        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap shrink-0">
            {["Come arrivo al Colosseo?", "C'e' sciopero oggi?", "Piove, che faccio?", "Bus 64 passa?"].map((p, i) => (
              <button key={i} onClick={() => setInput(p)} className="text-[11px] bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 transition font-medium">{p}</button>
            ))}
          </div>
        )}

        <div className="p-3 border-t border-gray-100 bg-white shrink-0 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="Scrivi..."
            className="flex-1 px-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={loading}
          />
          <button onClick={send} disabled={loading || !input.trim()} className="w-11 h-11 bg-blue-600 text-white rounded-xl flex items-center justify-center disabled:opacity-40 transition">
            <span className="material-symbols-outlined text-[18px]">send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
