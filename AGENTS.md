# AGENTS.md

## Namen projekta
Projekt `nepremicnince` je javna spletna aplikacija za pregled in osnovno analizo javnih podatkov GURS ETN za občino Brezovica.

## Tehnološke zahteve
- Next.js z App Routerjem
- TypeScript s strogim načinom
- Tailwind CSS
- shadcn/ui za osnovne komponente
- TanStack Table za podatkovno tabelo
- Recharts za grafe
- MapLibre GL JS za zemljevid
- Zod za validacijo podatkov
- Vitest za enotske teste
- Playwright za ključne uporabniške poti

Uporabi aktualne stabilne različice paketov. Ne zaklepaj se na zastarele različice brez razloga.

## Arhitektura podatkov
- V produkciji ne uporabljaj SQLite.
- Spletna aplikacija bere generirane datoteke iz `public/data`.
- `transactions.json` je glavni vir za filtre, tabelo, KPI-je in podrobnosti.
- `transactions.geojson` je vir za zemljevid.
- Izvorni CSV je v `data/source` in ni neposredno uporabljen v brskalniku.
- Če se podatkovni model kasneje razširi na vso Slovenijo, pripravi migracijo na Postgres, ne pa lokalne SQLite baze v Vercelu.

## Obvezna metodološka pravila
1. Pogodbena cena je cena celotnega posla.
2. Cene posla ne pripisuj vsaki parceli ali delu stavbe.
3. Za časovne analize uporabljaj `contractDate` oziroma `contractYear`.
4. Kakovost A/B/C je interna razvrstitev in mora biti jasno ločena od uradne `marketability`.
5. `analyticalPriceEurM2` prikazuj samo, kadar ni `null`.
6. Pri hišah ne predstavljaj preproste cene stavbe na m² kot zanesljive tržne vrednosti.
7. Pri vseh grafih prikazuj tudi število poslov v vzorcu.
8. Mediana ima prednost pred aritmetičnim povprečjem.

## Jezik in oblikovanje
- Celoten uporabniški vmesnik naj bo v slovenščini.
- Valuta: EUR.
- Datumi: `dd. MM. yyyy`.
- Decimalna vejica in slovensko oblikovanje števil.
- Dostopnost najmanj WCAG AA.
- Aplikacija mora dobro delovati na telefonu in računalniku.

## Kakovost kode
- Ne uporabljaj `any`, razen z dokumentirano utemeljitvijo.
- Poslovna logika naj bo v ločenih funkcijah in naj bo testirana.
- Komponente naj bodo majhne in ponovno uporabne.
- Filtri naj se zapisujejo v URL parametre.
- Ne dodajaj skrivnosti ali API ključev v repozitorij.
- Pred zaključkom vedno zaženi lint, typecheck, test in build.

## Git
- Delaj v smiselnih, majhnih commitih.
- Ne prepisuj zgodovine.
- Pred vsakim pushom preveri, da `npm run build` uspe.
