import { Suspense } from "react";
import { DashboardClient } from "@/components/DashboardClient";
import { PageShell } from "@/components/PageShell";

export default function HomePage() {
  return (
    <PageShell
      title="ETN Brezovica"
      subtitle="Nadzorna plošča za javne kupoprodajne posle GURS ETN. Filtri v URL-ju veljajo za KPI-je, grafe, tabelo in zemljevid."
    >
      <Suspense fallback={<div className="rounded-lg border border-[var(--border)] bg-white p-8">Nalaganje nadzorne plošče ...</div>}>
        <DashboardClient />
      </Suspense>
    </PageShell>
  );
}
