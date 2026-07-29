import { PageShell } from "@/components/PageShell";
import { RentalsClient } from "@/components/RentalsClient";
import { rentals } from "@/lib/data";

export default function RentalsPage() {
  return (
    <PageShell title="Najemni posli" subtitle="Prejeti podatki ETN o najemih za leto 2026, z jasno ločitvijo začasnih in dokončnih tržnih zapisov.">
      <RentalsClient rows={rentals} />
    </PageShell>
  );
}
