import { Suspense } from "react";
import { CatalogClient } from "@/components/CatalogClient";
import { PageShell } from "@/components/PageShell";

export default function BuildingsPage() {
  return (
    <PageShell title="Stavbe" subtitle="Trenutni neosebni podatki katastra stavb in delov stavb za občino Brezovica.">
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Nalagam katalog stavb ...</p>}>
        <CatalogClient kind="buildings" />
      </Suspense>
    </PageShell>
  );
}
