import { Suspense } from "react";
import { AnalysisClient } from "@/components/AnalysisClient";
import { PageShell } from "@/components/PageShell";

export default function AnalysisPage() {
  return (
    <PageShell title="Analiza" subtitle="Mediane, percentili in porazdelitve po letu, mesecu, kategoriji, naselju, kakovosti in uradni tržnosti GURS.">
      <Suspense fallback={<div className="rounded-lg border border-[var(--border)] bg-white p-8">Nalaganje analize ...</div>}>
        <AnalysisClient />
      </Suspense>
    </PageShell>
  );
}
