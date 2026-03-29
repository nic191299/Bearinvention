import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UrbanMove Roma — Non restare bloccato",
  description:
    "Community + AI per muoverti quando il mezzo non arriva. Segnalazioni in tempo reale, alternative smart, chatbot mobilità.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <head>
        <link
          rel="stylesheet"
          href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
