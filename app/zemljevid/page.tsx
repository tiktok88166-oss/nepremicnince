import { Suspense } from "react";
import { DynamicMapClient } from "@/components/DynamicMapClient";
import { PageShell } from "@/components/PageShell";

export default function MapPage() {
  return (
    <PageShell title="Zemljevid" subtitle="Gručen prikaz poslov z lokacijo. Klik na točko odpre osnovne podatke in povezavo do podrobnosti posla.">
      <Suspense fallback={<div className="rounded-lg border border-[var(--border)] bg-white p-8">Nalaganje zemljevida ...</div>}>
        <DynamicMapClient />
      </Suspense>
    </PageShell>
  );
}
