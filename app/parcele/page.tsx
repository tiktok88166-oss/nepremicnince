import { Suspense } from "react";
import { CatalogClient } from "@/components/CatalogClient";
import { PageShell } from "@/components/PageShell";

export default function ParcelsPage() {
  return (
    <PageShell title="Parcele" subtitle="Trenutni neosebni podatki katastra parcel, rabe in posplošene vrednosti za občino Brezovica.">
      <Suspense fallback={<p className="text-sm text-[var(--muted)]">Nalagam katalog parcel ...</p>}>
        <CatalogClient kind="parcels" />
      </Suspense>
    </PageShell>
  );
}
