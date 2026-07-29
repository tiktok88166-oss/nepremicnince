# Nepremičnince

Javna spletna aplikacija za pregled in analizo prodajnih ter najemnih poslov ETN, katastra nepremičnin in evidence vrednotenja za občino Brezovica.

## Lokalni zagon

```bash
npm install
npm run dev
```

Aplikacija se odpre na `http://localhost:3000`.

## Preverjanje

```bash
npm run lint
npm run typecheck
npm run test
npm run test:data
npm run build
```

Za ključne uporabniške poti:

```bash
npm run test:e2e
```

## Podatki

Produkcijska aplikacija ne uporablja SQLite ali druge lokalne baze. V brskalniku bere statične datoteke:

- `public/data/transactions-enriched.json`
- `public/data/rentals.json`
- `public/data/catalog/*-index.json` in katalogi, razdeljeni po katastrskih občinah
- `public/data/map/`
- `public/data/quality/data-quality-report.json`
- `public/data/summary.json`
- `public/data/meta.json`

Izvorni očiščeni CSV datoteki sta v `data/source`. Surovi arhivi KN, EV in ETN se poiščejo v `data/raw-private` ali `Vhodni podatki` in niso del produkcijske gradnje.

Za ponovno izdelavo varnih javnih podatkov:

```bash
python -m pip install pandas pyshp pyproj shapely
python scripts/build_gurs_enriched_data.py
```

ETL odpira samo dovoljene tabele. Tabel oseb, lastnikov, imetnikov pravic in upravljavcev ne bere; ob zaznavi prepovedanega osebnega polja v javnem izhodu se konča z napako.

## Zemljevid

Osnovni vektorski prikaz, gručenje prodaj in leno naloženi katastrski sloji uporabljajo OpenLayers brez zunanje kartografske odvisnosti. GURS DOF050 je na dan preverjanja za ta sloj oglaševal EPSG:3794, zato tudi ortofoto deluje v izvorni projekciji. Nastavitve WMS so dokumentirane v `.env.example`.

## Vercel

Repozitorij lahko neposredno uvoziš v Vercel kot Next.js projekt. Build ukaz je `npm run build`, produkcijski podatki pa so že v `public/data`.

## Metodološka opozorila

Pogodbena cena pripada celotnemu poslu. Kakovost A/B/C je interna analitična razvrstitev, uradna oznaka GURS je tržnost. Trenutna posplošena vrednost ni zgodovinska vrednost na datum starejše prodaje. Najemni zapisi 2026 so še v preverjanju oziroma neopredeljeni in so privzeto izključeni iz tržnih KPI-jev.
