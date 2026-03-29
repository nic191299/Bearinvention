"use client";

import { useState, useRef, useEffect } from "react";
import { ChatMessage, LatLng, TransportReport, SafetyReport } from "@/lib/types";

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
  userPosition: LatLng;
  transportReports: TransportReport[];
  safetyReports: SafetyReport[];
}

export default function ChatBot({ isOpen, onClose, userPosition, transportReports, safetyReports }: ChatBotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Ciao! Sono l'assistente UrbanMove. Dimmi dove sei e dove devi andare, oppure chiedimi qualsiasi cosa sulla mobilita e sicurezza a Roma. Se sei bloccato alla fermata, ti trovo subito un'alternativa!",
    },
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
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
          userLocation: userPosition,
          nearbyReports: [
            ...transportReports.slice(0, 4).map((r) => ({ message: `[Trasporto] ${r.message}` })),
            ...safetyReports.slice(0, 3).map((r) => ({ message: `[Sicurezza] ${r.message}` })),
          ],
        }),
      });
      const data = await res.json();
      setMessages([...newMessages, { role: "assistant", content: data.error ? `Errore: ${data.error}` : data.message }]);
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "Errore di connessione. Riprova." }]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "Il mio bus non arriva!",
    "Percorso sicuro per camminare?",
    "Alternative a piedi da qui?",
    "La metro funziona?",
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/50 animate-fade-in">
      <div className="bg-white w-full sm:w-[440px] h-[90vh] sm:h-[650px] sm:rounded-3xl flex flex-col shadow-2xl overflow-hidden animate-slide-in-up sm:animate-fade-in-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white px-5 py-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">smart_toy</span>
            </div>
            <div>
              <h3 className="font-semibold text-sm">UrbanMove AI</h3>
              <p className="text-[10px] text-gray-400">Assistente mobilita e sicurezza</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 transition">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 custom-scroll bg-gray-50">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}>
              <div className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-lg"
                  : "bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-lg"
              }`}>
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white px-4 py-3 rounded-2xl rounded-bl-lg shadow-sm border border-gray-100">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-4 pb-2 flex gap-2 flex-wrap shrink-0">
            {quickPrompts.map((p, i) => (
              <button key={i} onClick={() => setInput(p)}
                className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full hover:bg-blue-100 transition font-medium">
                {p}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-white shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Scrivi un messaggio..."
              className="flex-1 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              disabled={loading}
            />
            <button
              onClick={send}
              disabled={loading || !input.trim()}
              className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center hover:bg-blue-700 disabled:opacity-40 transition"
            >
              <span className="material-symbols-outlined text-[20px]">send</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
