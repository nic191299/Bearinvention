import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "UrbanMove Roma",
  description: "Mobilità smart, sicurezza community-driven, navigazione intelligente per Roma.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,1,0"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <meta name="theme-color" content="#0f172a" />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
