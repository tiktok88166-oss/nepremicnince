import { Suspense } from "react";
import { PageShell } from "@/components/PageShell";
import { TransactionsClient } from "@/components/TransactionsClient";

export default function TransactionsPage() {
  return (
    <PageShell title="Posli" subtitle="Tabela kupoprodajnih poslov z iskanjem, sortiranjem, paginacijo, skrivanjem stolpcev in CSV izvozom.">
      <Suspense fallback={<div className="rounded-lg border border-[var(--border)] bg-white p-8">Nalaganje poslov ...</div>}>
        <TransactionsClient />
      </Suspense>
    </PageShell>
  );
}
