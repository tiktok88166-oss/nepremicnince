import type { ReactNode } from "react";

export function PageShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-7xl px-3 py-5 sm:px-4 sm:py-7">
      <div className="mb-5 border-l-[3px] border-[var(--accent)] pl-3 sm:mb-7 sm:pl-4">
        <h1 className="text-2xl font-semibold tracking-normal text-[var(--foreground)] sm:text-4xl">{title}</h1>
        <p className="mt-1.5 max-w-3xl text-sm leading-6 text-[var(--muted)] sm:mt-2 sm:text-base">{subtitle}</p>
      </div>
      {children}
    </main>
  );
}
