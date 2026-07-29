# Podatkovni model

## `public/data/transactions.json`
Ena vrstica predstavlja en kupoprodajni posel.

Najpomembnejša polja:
- `id`
- `contractDate`
- `contractYear`
- `priceEur`
- `mainCategory`
- `analyticalUnit`
- `quality`
- `qualityReason`
- `marketability`
- `settlements`
- `addresses`
- `parcels`
- `buildingParts`
- `soldUsableAreaM2`
- `soldLandAreaM2`
- `analyticalAreaM2`
- `analyticalPriceEurM2`
- `coordinate`

## `public/data/transactions.geojson`
Vsebuje samo posle z uporabnimi koordinatami v EPSG:4326. Lastnosti so zmanjšane na podatke, ki so potrebni za zemljevid in popup.

## `public/data/summary.json`
Osnovni že pripravljeni seštevki za začetni prikaz. Po uporabi filtrov se statistika izračuna v brskalniku iz `transactions.json`.

## `public/data/meta.json`
Metodološka opozorila, opis vira in koordinatnih sistemov.

## Izvorni podatki
CSV datoteki v `data/source` ostaneta nespremenjeni. Spletna aplikacija ju ne sme brati neposredno.

## Koordinate
Izvorne E/N koordinate so pri pripravi spletnih podatkov pretvorjene iz EPSG:3794 v EPSG:4326. Pred javno objavo naj se nekaj naključnih točk vizualno preveri na območju občine Brezovica.
