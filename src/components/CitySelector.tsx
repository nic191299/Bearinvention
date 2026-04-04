"use client";

import { useState } from "react";
import { CityInfo, CITIES, saveCityToStorage } from "@/lib/cityData";

interface CitySelectorProps {
  onSelect: (city: CityInfo) => void;
}

export default function CitySelector({ onSelect }: CitySelectorProps) {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState<string | null>(null);

  const filtered = query.length > 0
    ? CITIES.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()))
    : CITIES;

  const handleSelect = async (city: CityInfo) => {
    setLoading(city.name);
    // Try to get the city ID from Supabase
    try {
      const res = await fetch(`/api/city?name=${encodeURIComponent(city.name)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.id) city = { ...city, id: data.id };
      }
    } catch { /* use city without ID */ }
    saveCityToStorage(city);
    onSelect(city);
    setLoading(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: "radial-gradient(circle at 2px 2px, white 1px, transparent 0)",
        backgroundSize: "32px 32px"
      }} />

      <div className="relative z-10 w-full max-w-md mx-4 animate-fade-in-up">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white rounded-2xl shadow-xl mb-4">
            <img src="/logo.svg" alt="BearInvention" className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-white">BearInvention</h1>
          <p className="text-blue-200 mt-1 text-sm">Sicurezza e mobilità urbana</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">Scegli la tua città</h2>
          <p className="text-xs text-gray-400 mb-4">Potrai cambiarla in qualsiasi momento</p>

          {/* Search */}
          <div className="relative mb-3">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Cerca città..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-gray-50 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* City list */}
          <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto custom-scroll">
            {filtered.map((city) => (
              <button
                key={city.name}
                onClick={() => handleSelect(city)}
                disabled={loading !== null}
                className="flex items-center gap-2.5 p-3 rounded-xl border border-gray-100 hover:border-blue-300 hover:bg-blue-50 transition-all group disabled:opacity-50 text-left"
              >
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-blue-600 text-[16px]">location_city</span>
                </div>
                <div>
                  <div className="text-sm font-semibold text-gray-800 group-hover:text-blue-700">{city.name}</div>
                  <div className="text-[10px] text-gray-400">{city.country}</div>
                </div>
                {loading === city.name && (
                  <div className="ml-auto w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin shrink-0" />
                )}
              </button>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-6 text-gray-400 text-sm">
              Nessuna città trovata per &ldquo;{query}&rdquo;
            </div>
          )}
        </div>

        <p className="text-center text-blue-300 text-xs mt-4">
          Più città italiane in arrivo
        </p>
      </div>
    </div>
  );
}
