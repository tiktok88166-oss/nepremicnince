# Glavni prompt za Codex

Delaj v repozitoriju:

`https://github.com/tiktok88166-oss/nepremicnince.git`

Repozitorij je na začetku prazen. Najprej preberi:
- `AGENTS.md`
- `docs/PROJECT_SPEC.md`
- `docs/DATA_MODEL.md`
- datoteke v `public/data`
- izvorni CSV v `data/source`

Nato samostojno izdelaj prvo produkcijsko različico spletne aplikacije za pregled in analizo podatkov GURS ETN za občino Brezovica.

## Obvezna izvedba

1. Inicializiraj sodoben Next.js projekt z App Routerjem, TypeScriptom, Tailwind CSS in ESLintom.
2. Uporabi:
   - shadcn/ui,
   - TanStack Table,
   - Recharts,
   - MapLibre GL JS,
   - Zod,
   - Vitest,
   - Playwright.
3. Ne uporabljaj SQLite ali druge lokalne baze v produkcijskem Vercel okolju.
4. Podatke beri iz `public/data/transactions.json` in `public/data/transactions.geojson`.
5. Naredi strani:
   - `/`
   - `/posli`
   - `/zemljevid`
   - `/analiza`
   - `/posli/[id]`
   - `/metodologija`
6. Naredi globalne filtre, zapisane v URL parametre.
7. Implementiraj skupno funkcijo filtriranja, ki jo uporabljajo tabela, grafi, KPI-ji in zemljevid.
8. Implementiraj mediane in percentile brez zunanjega API-ja.
9. Pri vsakem agregatu prikaži velikost vzorca.
10. Zemljevid naj uporablja gručenje GeoJSON točk in popup. Slog zemljevida naj se nastavi z `NEXT_PUBLIC_MAP_STYLE_URL`; za razvoj lahko uporabiš OpenFreeMap Liberty.
11. Vmesnik mora biti v slovenščini, odziven in dostopen.
12. Dodaj jasna metodološka opozorila:
    - cena pripada celotnemu poslu,
    - A/B/C ni uradna GURS oznaka,
    - EUR/m² ni na voljo pri vseh poslih,
    - podatki zadnjih let so lahko začasni.
13. Dodaj nogo z navedbo vira GURS ETN.
14. Dodaj README z lokalnim zagonom in navodili za Vercel.
15. Dodaj `.env.example` z:
    `NEXT_PUBLIC_MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty`
16. Dodaj teste za:
    - filtre,
    - mediano in percentile,
    - izločanje `null` cen,
    - pravilno štetje poslov brez podvajanja,
    - odpiranje podrobnosti posla,
    - osnovno delovanje zemljevida.
17. Pred zaključkom zaženi:
    - lint,
    - typecheck,
    - unit tests,
    - production build.
18. Odpravi vse napake, dokler vsi ukazi ne uspejo.
19. Naredi smiselne Git commite in potisni kodo v vejo `main`.
20. Ne nastavljaj Vercela brez mojega izrecnega potrjevanja. Pripravi pa projekt tako, da ga lahko nato neposredno uvozim v Vercel.

## Način dela
Najprej pripravi kratek načrt izvedbe in seznam datotek, nato začni kodirati. Ne čakaj na potrditve za običajne tehnične odločitve. Ustavi se samo, če bi potreboval skrivnost, plačljiv API ali zunanji poseg v račun.
