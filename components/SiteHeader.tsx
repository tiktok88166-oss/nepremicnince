"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

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

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-white shadow-[0_1px_3px_rgba(25,42,33,0.05)]">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-3 px-3 sm:px-4">
        <Link href="/" className="inline-flex items-center gap-2.5 text-lg font-semibold sm:text-xl">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[var(--accent)] text-white shadow-[0_2px_5px_rgba(22,80,58,0.18)]">
            <Building2 aria-hidden="true" className="h-5 w-5" />
          </span>
          <span>Nepremičnince</span>
        </Link>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-transparent text-[var(--foreground)] hover:border-[var(--border)] hover:bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] lg:hidden"
          aria-label={open ? "Zapri navigacijo" : "Odpri navigacijo"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
          title={open ? "Zapri navigacijo" : "Odpri navigacijo"}
          onClick={() => setOpen((current) => !current)}
        >
          {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
        </button>
        <nav aria-label="Glavna navigacija" className="hidden items-center gap-1 lg:flex">
          {navigation.map((item) => <NavigationLink key={item.href} item={item} pathname={pathname} />)}
        </nav>
      </div>
      {open ? (
        <nav id="mobile-navigation" aria-label="Mobilna navigacija" className="grid grid-cols-2 gap-1 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-3 lg:hidden">
          {navigation.map((item) => <NavigationLink key={item.href} item={item} pathname={pathname} onNavigate={() => setOpen(false)} />)}
        </nav>
      ) : null}
    </header>
  );
}

function NavigationLink({ item, pathname, onNavigate }: { item: (typeof navigation)[number]; pathname: string; onNavigate?: () => void }) {
  const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-md px-3 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)] lg:py-2",
        active ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "text-[var(--muted)] hover:bg-[#edf2ee] hover:text-[var(--foreground)]",
      )}
    >
      {item.label}
    </Link>
  );
}
