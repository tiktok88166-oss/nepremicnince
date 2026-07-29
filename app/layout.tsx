import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nepremičnince | ETN Brezovica",
  description: "Pregled in analiza javnih kupoprodajnih podatkov GURS ETN za občino Brezovica.",
};

const navigation = [
  { href: "/", label: "Pregled" },
  { href: "/posli", label: "Prodajni posli" },
  { href: "/najemi", label: "Najemni posli" },
  { href: "/zemljevid", label: "Zemljevid" },
  { href: "/parcele", label: "Parcele" },
  { href: "/stavbe", label: "Stavbe" },
  { href: "/analiza", label: "Analize" },
  { href: "/metodologija", label: "Metodologija" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="sl">
      <body>
        <header className="border-b border-[var(--border)] bg-white">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <Link href="/" className="text-xl font-semibold tracking-normal">
              Nepremičnince
            </Link>
            <nav aria-label="Glavna navigacija" className="flex flex-wrap gap-1">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[var(--muted)] hover:bg-[#eef3ee] hover:text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
        </header>
        {children}
        <footer className="border-t border-[var(--border)] bg-white">
          <div className="mx-auto max-w-7xl px-4 py-6 text-sm text-[var(--muted)]">
            Vir: Geodetska uprava Republike Slovenije, ETN, kataster nepremičnin in evidenca vrednotenja. Cena pripada celotnemu poslu.
          </div>
        </footer>
      </body>
    </html>
  );
}
