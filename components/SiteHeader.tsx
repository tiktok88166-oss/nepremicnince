"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, BookOpen, Building2, Database, GitCompareArrows, Home, Map, Menu, Search, X, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation: Array<{ href: string; label: string; icon: LucideIcon }> = [
  { href: "/", label: "Pregled", icon: Home },
  { href: "/iskanje", label: "Iskanje", icon: Search },
  { href: "/analiza", label: "Analize", icon: BarChart3 },
  { href: "/primerjava-nepremicnin", label: "Primerjaj", icon: GitCompareArrows },
  { href: "/primerjava", label: "Občini", icon: Building2 },
  { href: "/zemljevid", label: "Zemljevid", icon: Map },
  { href: "/pokritost", label: "Pokritost", icon: Database },
  { href: "/metodologija", label: "Metodologija", icon: BookOpen },
];

const mobileNavigation = navigation.filter((item) => ["/", "/iskanje", "/zemljevid", "/analiza", "/primerjava-nepremicnin"].includes(item.href));

export function SiteHeader() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-white/95 shadow-[0_1px_8px_rgba(25,42,33,0.06)] backdrop-blur">
        <div className="mx-auto flex min-h-14 max-w-7xl items-center justify-between gap-3 px-3 sm:min-h-16 sm:px-4">
          <Link href="/" className="inline-flex items-center gap-2.5 text-lg font-semibold sm:text-xl">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[var(--accent)] text-white shadow-[0_3px_10px_rgba(16,101,105,0.22)]"><Building2 aria-hidden="true" className="h-5 w-5" /></span>
            <span>Nepremičnince</span>
          </Link>
          <button type="button" className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-transparent hover:border-[var(--border)] hover:bg-[var(--surface-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] lg:hidden" aria-label={open ? "Zapri navigacijo" : "Odpri navigacijo"} aria-expanded={open} aria-controls="mobile-more-navigation" title={open ? "Zapri navigacijo" : "Odpri navigacijo"} onClick={() => setOpen((current) => !current)}>
            {open ? <X aria-hidden="true" className="h-5 w-5" /> : <Menu aria-hidden="true" className="h-5 w-5" />}
          </button>
          <nav aria-label="Glavna navigacija" className="hidden items-center gap-0.5 lg:flex">
            {navigation.map((item) => <NavigationLink key={item.href} item={item} pathname={pathname} />)}
          </nav>
        </div>
        {open ? (
          <nav id="mobile-more-navigation" aria-label="Vse strani" className="grid grid-cols-2 gap-1 border-t border-[var(--border)] bg-[var(--surface-subtle)] px-3 py-3 lg:hidden">
            {navigation.map((item) => <NavigationLink key={item.href} item={item} pathname={pathname} onNavigate={() => setOpen(false)} withIcon />)}
          </nav>
        ) : null}
      </header>

      <nav aria-label="Mobilna navigacija" className="fixed inset-x-0 bottom-0 z-50 grid grid-cols-5 border-t border-[var(--border)] bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_18px_rgba(25,42,33,0.08)] backdrop-blur lg:hidden">
        {mobileNavigation.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href, pathname);
          return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("flex min-h-16 min-w-0 flex-col items-center justify-center gap-1 px-1 text-[10px] font-semibold", active ? "text-[var(--accent-strong)]" : "text-[var(--muted)]")}><Icon aria-hidden="true" className={cn("h-5 w-5", active && "stroke-[2.5]")} /><span className="max-w-full truncate">{item.label}</span></Link>;
        })}
      </nav>
    </>
  );
}

function NavigationLink({ item, pathname, onNavigate, withIcon = false }: { item: (typeof navigation)[number]; pathname: string; onNavigate?: () => void; withIcon?: boolean }) {
  const active = isActive(item.href, pathname);
  const Icon = item.icon;
  return (
    <Link href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("inline-flex items-center gap-2 rounded-md px-2.5 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--accent)] lg:py-2", active ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]" : "text-[var(--muted)] hover:bg-[var(--surface-subtle)] hover:text-[var(--foreground)]")}>
      {withIcon ? <Icon aria-hidden="true" className="h-4 w-4" /> : null}{item.label}
    </Link>
  );
}

function isActive(href: string, pathname: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
