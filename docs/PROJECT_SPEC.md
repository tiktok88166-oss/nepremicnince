# Specifikacija spletne aplikacije ETN Brezovica

## 1. Cilj
Izdelati pregledno spletno aplikacijo, ki omogoča:
- pregled kupoprodajnih poslov na zemljevidu in v tabeli,
- filtriranje po času, vrsti, lokaciji, ceni in kakovosti,
- osnovno analizo prodajnih cen in aktivnosti trga,
- pregled podrobnosti posameznega posla,
- jasno razlago omejitev podatkov.

## 2. Predlagane strani

### `/`
Nadzorna plošča:
- število filtriranih poslov,
- skupna vrednost poslov,
- mediana pogodbene cene,
- mediana analitične cene na m², kjer obstaja,
- trend števila poslov po letih,
- trend mediane po letih,
- razdelitev po glavnih kategorijah,
- opozorilo o kakovosti in začasnosti podatkov.

### `/posli`
Tabela:
- iskanje po ID, naslovu, naselju, parceli in katastrski občini,
- stolpci z možnostjo skrivanja,
- razvrščanje,
- straničenje,
- izvoz trenutno filtriranih vrstic v CSV,
- klik na vrstico odpre podrobnosti.

### `/zemljevid`
Zemljevid:
- OpenLayers v izvorni projekciji EPSG:3794,
- gručenje točk,
- barvanje po glavni kategoriji ali kakovosti,
- popup z datumom, ceno, kategorijo in lokacijo,
- sinhronizacija filtrov z drugimi stranmi,
- klik vodi na `/posli/[id]`,
- legenda in navedba kartografskega vira.

### `/analiza`
Grafi:
- število poslov po letu ali mesecu,
- mediana cene po obdobju,
- mediana EUR/m² samo za ustrezne analitične enote,
- razdelitev po kategoriji, naselju, kakovosti in tržnosti,
- prikaz velikosti vzorca pri vsaki statistiki,
- možnost primerjave dveh filtrov.

### `/posli/[id]`
Podrobnost:
- osnovni podatki posla,
- cena in datum,
- uradna tržnost GURS,
- interna kakovost A/B/C z razlago,
- vse povezane parcele, stavbe, deli stavb in površine,
- lokacija na manjšem zemljevidu,
- metodološko opozorilo, da skupne cene ni mogoče poljubno deliti med sestavine.

### `/metodologija`
- vir podatkov,
- razlika med tržnostjo GURS in interno kakovostjo,
- razlaga čistih in mešanih poslov,
- razlaga mediane in velikosti vzorca,
- datum stanja podatkov,
- navedba vira GURS.

## 3. Globalni filtri
- datum od/do,
- leto pogodbe,
- glavna kategorija,
- analitična enota,
- katastrska občina,
- naselje,
- kakovost A/B/C,
- uradna tržnost,
- vrsta posla,
- cena od/do,
- površina zemljišča od/do,
- uporabna površina od/do,
- EUR/m² od/do,
- samo posli z lokacijo,
- samo polni deleži.

Filtri morajo biti zapisani v URL in ohranjeni ob prehodu med stranmi.

## 4. Statistika
Uporabi:
- mediano,
- 25. in 75. percentil,
- minimum in maksimum samo kot dodatni podatek,
- število poslov v vzorcu.

Ne uporabljaj povprečja kot glavnega kazalnika. Ne računaj EUR/m², kadar podatkovni model tega ne dovoljuje.

## 5. Vizualni slog
- sodoben analitični dashboard,
- nevtralna svetla tema,
- dobra čitljivost,
- poudarek na zemljevidu, podatkih in filtrih,
- brez nepotrebnih animacij,
- odzivna postavitev,
- temni način je zaželen, vendar ni nujen za prvo verzijo.

## 6. Tehnična izvedba
- Next.js App Router,
- statični JSON/GeoJSON v `public/data`,
- statična ali hibridna aplikacija brez uporabniških računov,
- brez strežniške baze v prvi fazi,
- podatke naloži enkrat in filtriraj na odjemalcu,
- dinamično uvozi zemljevid, da ne povzroča težav pri SSR,
- osnovni vektorski prikaz naj deluje brez zunanjega kartografskega sloga; ortofoto uporablja nastavljiv GURS WMS.

## 7. Kriteriji sprejema
- `npm run lint` uspe,
- `npm run typecheck` uspe,
- `npm run test` uspe,
- `npm run build` uspe,
- aplikacija se brez posebnih nastavitev postavi na Vercel,
- vsi filtri pravilno vplivajo na KPI, tabelo, graf in zemljevid,
- nobena cena posla ni pomotoma pomnožena zaradi joinov,
- povezava do posameznega posla deluje tudi po osvežitvi strani,
- vir GURS je naveden v nogi in na metodološki strani.
