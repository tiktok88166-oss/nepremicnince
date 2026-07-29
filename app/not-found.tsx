import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="text-3xl font-semibold">Stran ni najdena</h1>
      <p className="mt-3 text-[var(--muted)]">Iskani posel ali stran ne obstaja v pripravljenem naboru podatkov.</p>
      <Link className="mt-6 inline-flex rounded-md bg-[var(--accent)] px-4 py-2 text-white" href="/posli">
        Nazaj na posle
      </Link>
    </main>
  );
}
