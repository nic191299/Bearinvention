"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Mappa", icon: "map" },
  { href: "/safety", label: "Sicurezza", icon: "shield" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop top bar */}
      <nav className="hidden md:flex fixed top-0 left-0 right-0 z-50 glass-dark text-white h-14 items-center px-6 border-b border-white/10">
        <Link href="/" className="flex items-center gap-2 mr-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-sm font-bold">
            U
          </div>
          <span className="font-bold text-lg tracking-tight">UrbanMove</span>
          <span className="text-[10px] bg-blue-600/30 text-blue-300 px-1.5 py-0.5 rounded font-medium ml-1">
            ROMA
          </span>
        </Link>

        <div className="flex gap-1">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                pathname === item.href
                  ? "bg-white/15 text-white"
                  : "text-gray-300 hover:text-white hover:bg-white/10"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-live-pulse" />
            Live
          </div>
        </div>
      </nav>

      {/* Mobile bottom bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 glass border-t border-gray-200 pb-safe">
        <div className="flex">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center py-2 pt-3 gap-0.5 text-[10px] font-medium transition ${
                pathname === item.href ? "text-blue-600" : "text-gray-400"
              }`}
            >
              <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
