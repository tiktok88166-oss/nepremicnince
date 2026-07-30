import { PropertyComparisonClient } from "@/components/PropertyComparisonClient";
import { PageShell } from "@/components/PageShell";

export default function PropertyComparisonPage() {
  return (
    <PageShell title="Primerjava nepremičnin" subtitle="Postavite do štiri parcele, stavbe ali dele stavb ob bok in primerjajte ključne evidentirane podatke.">
      <PropertyComparisonClient />
    </PageShell>
  );
}
