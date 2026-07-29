import { AlertTriangle } from "lucide-react";

export function MethodWarning() {
  return (
    <section className="rounded-lg border border-[#ead7b7] bg-[#fff8e9] p-4 text-sm text-[#68420d]">
      <div className="flex items-start gap-3">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-5 w-5 shrink-0" />
        <div className="space-y-1">
          <p className="font-semibold">Metodološko opozorilo</p>
          <p>
            Pogodbena cena pripada celotnemu poslu, ne posamezni parceli ali delu stavbe. Kakovost A/B/C je interna
            razvrstitev in ni uradna oznaka GURS. EUR/m2 je prikazan samo tam, kjer je v podatkih dovoljena analitična
            enota; zadnja leta so lahko začasna.
          </p>
        </div>
      </div>
    </section>
  );
}
