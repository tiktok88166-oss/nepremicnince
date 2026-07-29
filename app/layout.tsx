import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nepremičnince | ETN Brezovica",
  description: "Pregled in analiza javnih kupoprodajnih podatkov GURS ETN za občino Brezovica.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sl">
      <body>
        <SiteHeader />
        {children}
        <footer className="border-t border-[var(--border)] bg-white">
          <div className="mx-auto max-w-7xl px-3 py-5 text-sm text-[var(--muted)] sm:px-4 sm:py-6">
            Vir: Geodetska uprava Republike Slovenije, ETN, kataster nepremičnin in evidenca vrednotenja. Cena pripada celotnemu poslu.
          </div>
        </footer>
      </body>
    </html>
  );
}
