# Dodatni podatki GURS – navodilo za Codex

## Namen

Razširi obstoječo spletno aplikacijo `nepremicnince` z dodatnimi javnimi podatki GURS za občino Brezovica:

- kataster nepremičnin – parcele,
- kataster nepremičnin – stavbe in deli stavb,
- evidenca vrednotenja,
- najemni posli ETN za leto 2026.

Repozitorij:

```text
https://github.com/tiktok88166-oss/nepremicnince.git
```

Pred začetkom preberi tudi:

```text
AGENTS.md
docs/PROJECT_SPEC.md
docs/DATA_MODEL.md
CODEX_MASTER_PROMPT.md
```

To navodilo dopolnjuje obstoječo specifikacijo. Ne odstranjuj že izdelanih funkcionalnosti za kupoprodajne posle.

---

# 1. Vhodne datoteke

Uporabnik bo lokalno dodal naslednje datoteke:

```text
KN_008_PARCELE_20260726.zip
KN_008_STAVBE_20260726.zip
EV_008_EVIDENCA_VREDNOTENJA_20260725.zip
ETN_008_2026_NP_20260725.zip
```

Predlagana lokalna struktura:

```text
data/
├── raw-private/
│   ├── KN_008_PARCELE_20260726.zip
│   ├── KN_008_STAVBE_20260726.zip
│   ├── EV_008_EVIDENCA_VREDNOTENJA_20260725.zip
│   └── ETN_008_2026_NP_20260725.zip
├── source/
│   ├── ETN_Brezovica_posli_joined.csv
│   └── ETN_Brezovica_nepremicnine_long.csv
└── processed/
```

Mapa `data/raw-private` mora biti dodana v `.gitignore`.

```gitignore
data/raw-private/*
!data/raw-private/.gitkeep
data/processed/*.duckdb
data/processed/*.sqlite
data/processed/tmp/
```

---

# 2. Kritično pravilo glede osebnih podatkov

Paketi KN in EV vsebujejo tudi tabele z lastniki, imetniki pravic, osebami, naslovi, matičnimi številkami in drugimi osebnimi podatki.

## Teh datotek ne obdeluj za javno aplikacijo

Izloči vse datoteke, katerih ime vsebuje oziroma pomeni:

```text
osebe
oseba
imetniki_lastnistva
imetnik_lastnistva
pravice_lastnistva
pravica_lastnistva
lastnik_povezanih_parcel
upravljavci
upravljavec
upravniki
MS_OSEBE
EMSO_MS
```

Ne beri, ne kopiraj in ne objavljaj naslednjih vrst podatkov:

- ime ali naziv fizične osebe,
- EMSO,
- matična številka,
- stalni naslov,
- naslov za vročanje,
- lastniški delež posamezne osebe,
- identifikator osebe,
- povezava med konkretno osebo in nepremičnino.

## Obvezne varovalke

1. Surovih ZIP-datotek ne potisni v javni GitHub.
2. Nobena datoteka v `public/data` ne sme vsebovati osebnih podatkov.
3. Dodaj avtomatski test oziroma pregled izhodnih datotek za prepovedana polja:

```text
EMSO
MS_OSEBE
ID_OSEBA
OSEBA_ID
NASLOV_STALNI
NASLOV_VROCANJE
IMETNIK_LASTNISTVA_ID
PRAVICA_LASTNISTVA_ID
```

4. Če skripta zazna katero od teh polj v javnem izhodu, mora končati z napako.
5. Javni naslov nepremičnine iz ETN ali katastrskega zapisa ni isto kot osebni naslov lastnika. Osebnih tabel ne uporabljaj niti za dopolnjevanje naslovov nepremičnin.

---

# 3. Pregled dejanske vsebine paketov

Pri prvi analizi datotek so bili ugotovljeni naslednji obsegi.

## 3.1 Kataster parcel

Glavna geometrija parcel:

```text
KN_008_PARCELE_parcele_20260726.zip
```

Vsebuje približno:

```text
24.634 parcelnih poligonov
CRS: EPSG:3794
```

Pomembna polja v shapefile:

```text
EID_PARCEL
KO_ID
ST_PARCELE
POVRSINA
E_CEN
N_CEN
BONITETA
UPRAVNI_ST
DATUM_SYS
RPE_OBCINE
geometry
```

Pomembne dodatne tabele:

```text
KN_008_PARCELE_parcele_x_dejanske_rabe_20260726.csv
KN_008_PARCELE_parcele_x_namenske_rabe_20260726.csv
KN_008_PARCELE_parcele_x_posebni_rezimi_20260726.csv
KN_008_PARCELE_parcele_x_gozdno_gosp_obm_20260726.csv
KN_008_PARCELE_kat_dohodki_20260726.csv
KN_008_PARCELE_gradbene_parcele_x_parcele_20260726.csv
KN_008_PARCELE_gradbene_parcele_x_stavbe_20260726.csv
```

Priloženi so tudi šifranti:

```text
sifranti/VRSTE_DEJANSKE_RABE.CSV
sifranti/VRSTE_NAMENSKE_RABE.CSV
sifranti/UPRAVNI_STATUSI.CSV
sifranti/METODE_DOLOCITVE_POVRSINE.CSV
sifranti/VRSTE_GRADBENIH_PARCEL.CSV
```

## 3.2 Kataster stavb

Glavne točke stavb:

```text
KN_008_STAVBE_stavbe_20260726.zip
```

Vsebuje približno:

```text
6.804 stavb
CRS: EPSG:3794
```

Pomembna polja:

```text
EID_STAVBA
KO_ID
ST_STAVBE
STEVILO_ET
STEVILO_ST
TIP_STAVBE
ELEKTRIKA
PLIN
VODOVOD
KANALIZACIJA
LETO_IZGRADNJE
LETO_OBNOVE_STREHE
LETO_OBNOVE_FASADE
NOSILNA_KONSTRUKCIJA
BRUTO_TLORISNA_POVRSINA
STATUS_VPISA
geometry
```

Imena polj v shapefile so lahko skrajšana zaradi omejitve DBF. Ne zanašaj se slepo na zgornji opis, temveč ob uvozu izpiši in preveri dejansko shemo.

Uporabne geometrije:

```text
KN_008_STAVBE_nadzemni_tloris_20260726.zip
KN_008_STAVBE_tloris_20260726.zip
KN_008_STAVBE_tloris_zps_20260726.zip
KN_008_STAVBE_podzemni_tloris_20260726.zip
```

Glavna tabela delov stavb:

```text
KN_008_STAVBE_deli_stavb_20260726.csv
```

Vsebuje približno:

```text
8.498 delov stavb
```

Ključna polja:

```text
EID_DEL_STAVBE
EID_STAVBA
ST_DELA_STAVBE
VRSTA_DEJANSKE_RABE_DEL_ST_ID
POVRSINA
UPORABNA_POVRSINA
LETO_OBNOVE_INSTALACIJ
LETO_OBNOVE_OKEN
DVIGALO
ST_STANOVANJA
VRSTA_STANOVANJA_ID
STATUS
```

Tabela prostorov:

```text
KN_008_STAVBE_prostori_20260726.csv
```

Vsebuje približno:

```text
21.740 prostorov
```

Povezava:

```text
EID_PROSTOR → EID_DEL_STAVBE
```

## 3.3 Evidenca vrednotenja

Pomembne osnovne tabele:

```text
EV_008_EVIDENCA_VREDNOTENJA_parcela_20260725.csv
EV_008_EVIDENCA_VREDNOTENJA_stavba_20260725.csv
EV_008_EVIDENCA_VREDNOTENJA_del_stavbe_20260725.csv
EV_008_EVIDENCA_VREDNOTENJA_parc_enota_20260725.csv
EV_008_EVIDENCA_VREDNOTENJA_del_stavbe_enota_20260725.csv
EV_008_EVIDENCA_VREDNOTENJA_SIF_MODEL_20260725.csv
```

Približni obseg:

```text
24.628 parcel
6.802 stavb
8.496 delov stavb
34.808 parcelnih vrednostnih enot
8.496 vrednostnih enot delov stavb
```

Ključni modeli vrednotenja:

```text
STA – stanovanja
HIS – hiše
GAR – garaže
PPL – lokali
PPP – pisarne
TUR – stavbe za turizem
IND – industrija
INP – posebna industrija
SDP – stavbe splošnega družbenega pomena
KDS – kmetijske in druge stavbe
DRZ – druga zemljišča
STZ – stavbna zemljišča
KME – kmetijska zemljišča
GOZ – gozd
ZPS – zemljišče pod stavbami
```

Ključ za vrednotenje delov stavb:

```text
EID_DEL_STAVBE
```

Ključ za vrednotenje parcel:

```text
EID_PARCELA
```

Posamezna parcela ima lahko več vrstic v `parc_enota`, ker je lahko vrednotena po več modelih oziroma delih rabe. Za skupno trenutno posplošeno vrednost parcele seštej:

```text
SUM(POSPLOSENA_VREDNOST)
GROUP BY EID_PARCELA
```

Ne združuj več vrstic parcelne vrednosti z navadnim JOIN-om brez predhodne agregacije.

## 3.4 Najemni posli ETN

Datoteka:

```text
ETN_008_2026_NP_20260725.zip
```

Vsebuje:

```text
21 najemnih poslov
33 zapisov oddanih delov stavb
```

Tabeli:

```text
ETN_008_2026_NP_2026_POSLI_20260725.csv
ETN_008_2026_NP_2026_DELISTAVB_20260725.csv
```

Povezava:

```text
ID_POSLA
```

Pomembna ugotovitev za trenutno stanje:

```text
20 poslov ima status "V preverjanju"
1 posel ima status "Neopredeljen posel"
0 poslov ima dokončni status "Tržen posel"
```

Najemnih poslov zato za zdaj ne prikazuj kot dokončno uradno statistiko tržnih najemnin.

---

# 4. Tehnična arhitektura obdelave

## 4.1 Produkcijska aplikacija

V Vercelu še naprej ne uporabljaj lokalne SQLite baze.

Produkcijska aplikacija naj bere predhodno pripravljene statične podatke:

```text
public/data/
```

Surova obdelava se izvede lokalno s Pythonom.

Priporočeni paketi:

```text
pandas
geopandas
pyogrio
pyproj
shapely
duckdb
```

Lokalno lahko za ETL uporabiš DuckDB ali SQLite, vendar lokalne baze ne objavi kot produkcijsko bazo Vercela.

## 4.2 Nova skripta

Dodaj:

```text
scripts/build_gurs_enriched_data.py
```

Skripta mora:

1. poiskati vhodne ZIP-datoteke,
2. odpreti tudi ZIP-e, ki so ugnezdeni v zunanjih ZIP-ih,
3. prebrati CSV, DBF in shapefile,
4. preveriti obvezna polja,
5. standardizirati tipe,
6. povezati šifrante,
7. izdelati varne, neosebne izhodne podatke,
8. izdelati poročilo o kakovosti,
9. končati z napako pri neskladju ali osebnih podatkih.

Ne razširjaj vseh datotek trajno v repozitorij. Uporabi začasno mapo:

```text
data/processed/tmp/
```

in jo po uspešni obdelavi počisti.

---

# 5. Standardizacija ključev

## 5.1 Parcelna številka

Parcelne številke obravnavaj kot niz.

Dovoljeno:

```text
1126/26
211
*56
```

Ne pretvarjaj jih v števila.

Normalizacija:

- odstrani začetne in končne presledke,
- odstrani nepotreben zapis `.0`,
- ohrani `/`,
- ohrani `*`,
- ne odstranjuj vodilnih ničel brez preverjanja,
- ne spreminjaj zgodovinskih parcelnih številk.

## 5.2 Številka stavbe in dela stavbe

Normaliziraj v kanonični tekstovni zapis:

```text
"4815"
"1"
```

Odstrani samo tehnični zapis:

```text
4815.0 → 4815
```

## 5.3 EID

Vse EID-identifikatorje obravnavaj kot besedilo, tudi če vsebujejo samo številke.

Nikoli jih ne pretvarjaj v JavaScript `number`, ker so lahko daljši od varnega celoštevilskega območja.

Uporabi:

```ts
type EntityId = string;
```

---

# 6. Pravila povezovanja

## 6.1 ETN parcela → KN parcela

ETN:

```text
SIFRA_KO
PARCELNA_STEVILKA
```

KN parcela:

```text
KO_ID
ST_PARCELE
EID_PARCELA
```

Povezava:

```text
ETN.SIFRA_KO = KN.KO_ID
ETN.PARCELNA_STEVILKA = KN.ST_PARCELE
```

Rezultat:

```text
EID_PARCELA
```

## 6.2 ETN stavba → KN stavba

ETN:

```text
SIFRA_KO
STEVILKA_STAVBE
```

KN:

```text
KO_ID
ST_STAVBE
EID_STAVBA
```

Povezava:

```text
ETN.SIFRA_KO = KN.KO_ID
ETN.STEVILKA_STAVBE = KN.ST_STAVBE
```

## 6.3 ETN del stavbe → KN del stavbe

Najprej poveži stavbo, nato del stavbe:

```text
SIFRA_KO
STEVILKA_STAVBE
STEVILKA_DELA_STAVBE
```

z:

```text
KO_ID
ST_STAVBE
ST_DELA_STAVBE
```

Rezultat:

```text
EID_STAVBA
EID_DEL_STAVBE
```

## 6.4 KN → evidenca vrednotenja

```text
KN.EID_PARCELA = EV.EID_PARCELA
KN.EID_STAVBA = EV.EID_STAVBA
KN.EID_DEL_STAVBE = EV.EID_DEL_STAVBE
```

---

# 7. Pričakovani kontrolni rezultati povezovanja

Na trenutno pripravljeni zbirki kupoprodajnih poslov je bilo mogoče neposredno povezati približno:

```text
537 od 567 delov stavb = 94,7 %
1.272 od 1.397 parcel = 91,1 %
```

Pri najemnih podatkih:

```text
33 od 33 delov stavb = 100 %
```

To uporabi kot kontrolni prag, ne kot zahtevo po umetnem 100-odstotnem ujemanju.

## Neujemanja

Neujemanja so lahko posledica:

- parcelacije,
- združitve parcel,
- preštevilčenja,
- izbrisa stare parcele,
- spremembe številke stavbe,
- starejšega stanja v ETN,
- napake v poročanem poslu.

Ne izvajaj približnega samodejnega povezovanja samo po podobni številki.

Vsaka sestavina naj dobi:

```text
matchStatus:
  exact
  unmatched
  ambiguous
```

in:

```text
matchReason
```

Neujemajočih poslov ne izbriši.

---

# 8. Nova normalizirana podatkovna struktura

Lokalno izdelaj naslednje logične tabele.

## 8.1 `parcels`

Ena vrstica na:

```text
EID_PARCELA
```

Predlagana polja:

```text
eidParcel
cadastralMunicipalityCode
parcelNumber
areaM2
centroidE
centroidN
longitude
latitude
boniteta
administrativeStatusCode
administrativeStatus
systemDate
geometryReference
```

## 8.2 `parcel_actual_uses`

Več vrstic na parcelo:

```text
eidParcel
sourceType
useCode
useName
sharePercent
compositeUseCode
systemDate
```

Datoteka dejanske rabe ima več možnih stolpcev vira:

```text
KG_VRSTA_DEJANSKE_RABE_ID
PO_VRSTA_DEJANSKE_RABE_ID
ST_VRSTA_DEJANSKE_RABE_ID
IN_VRSTA_DEJANSKE_RABE_ID
IN1_VRSTA_DEJANSKE_RABE_ID
IN2_VRSTA_DEJANSKE_RABE_ID
IN3_VRSTA_DEJANSKE_RABE_ID
VZ_VRSTA_DEJANSKE_RABE_ID
NN_VRSTA_DEJANSKE_RABE_ID
```

Ne izberi enega stolpca kot edine resnice. Pretvori vse neprazne kode v normalizirane vrstice z oznako vira.

Za povzetek parcele lahko uporabiš:

```text
SESTAVLJENA_VRSTA_DRABE_SIFRA
```

vendar ohrani tudi posamezne kode.

## 8.3 `parcel_planned_uses`

```text
eidParcel
plannedUseCode
plannedUseName
sharePercent
municipalityId
systemDate
```

Poveži:

```text
VRSTA_NAMENSKE_RABE_ID
```

s šifrantom:

```text
VRSTE_NAMENSKE_RABE.CSV
```

## 8.4 `buildings`

```text
eidBuilding
cadastralMunicipalityCode
buildingNumber
buildingTypeCode
buildingType
yearBuilt
roofRenovationYear
facadeRenovationYear
constructionCode
construction
floorCount
apartmentCount
businessSpaceCount
grossFloorAreaM2
hasElectricity
hasWater
hasSewer
hasGas
statusCode
status
longitude
latitude
geometryReference
```

## 8.5 `building_parts`

```text
eidBuildingPart
eidBuilding
partNumber
actualUseCode
actualUse
areaM2
usableAreaM2
apartmentNumber
apartmentType
windowRenovationYear
installationRenovationYear
hasElevator
status
```

## 8.6 `spaces`

```text
eidSpace
eidBuildingPart
spaceTypeCode
spaceType
areaM2
```

## 8.7 `parcel_valuations`

Najprej agregiraj vse vrednostne enote po parceli.

Ohrani tudi razčlenitev po modelu:

```text
eidParcel
modelId
modelName
level
surfaceShare
generalisedValueEur
```

Povzetek:

```text
eidParcel
generalisedValueTotalEur
valuationModelCount
valuationModels
```

## 8.8 `building_part_valuations`

```text
eidBuildingPart
modelId
modelName
level
influence
generalisedValueEur
```

## 8.9 `rent_transactions`

Ena vrstica na najemni posel:

```text
id
contractDate
effectiveDate
rentStartDate
rentEndDate
contractRentEur
rentalTypeCode
rentalType
marketabilityCode
marketability
durationType
durationMonths
operatingCostsIncluded
vatIncluded
vatRate
componentCount
quality
qualityReason
```

## 8.10 `rent_components`

```text
id
transactionId
eidBuilding
eidBuildingPart
cadastralMunicipalityCode
buildingNumber
buildingPartNumber
spaceType
furnished
microlocation
areaM2
usableAreaM2
individualRentEur
rentEurM2
address
longitude
latitude
matchStatus
```

---

# 9. Izračun najemnine na m²

Uporabi stroga pravila.

## Primer A – individualna najemnina je navedena

Če je izpolnjeno:

```text
POGODBENA_NAJEMNINA_POSAMEZNIH_ODDANIH_PROSTOROV
```

izračunaj:

```text
rentEurM2 =
individualRentEur / areaM2
```

## Primer B – posel ima samo eno oddano sestavino

Če individualna najemnina ni navedena, posel pa ima natanko eno sestavino:

```text
rentEurM2 =
contractRentEur / areaM2
```

## Primer C – več sestavin brez individualnih najemnin

Če je sestavin več in ni posameznih najemnin:

```text
rentEurM2 = null
```

Skupne najemnine ne deli sorazmerno po površini brez izrecnega podatka.

Vedno jasno prikaži:

- ali so obratovalni stroški vključeni,
- ali je DDV vključen,
- ali je posel za določen ali nedoločen čas,
- uradni status tržnosti.

---

# 10. Vrednotenje in primerjava s prodajno ceno

## 10.1 Trenutna posplošena vrednost transakcije

Za vsak kupoprodajni posel:

1. poišči vse enolične prodane `EID_DEL_STAVBE`,
2. poišči vse enolične prodane `EID_PARCELA`,
3. upoštevaj prodani delež,
4. pri parcelah najprej seštej vse njihove vrednostne enote,
5. nato seštej vrednosti vseh prodanih sestavin.

Primer:

```text
transactionCurrentGeneralisedValueEur =
SUM(buildingPartGeneralisedValue × soldShare)
+
SUM(parcelGeneralisedValueTotal × soldShare)
```

## 10.2 Preprečevanje podvajanja

Pred seštevanjem dedupliciraj po:

```text
ID_POSLA + EID_DEL_STAVBE
ID_POSLA + EID_PARCELA
```

Če se isti EID v istem poslu pojavi večkrat:

- ne seštevaj ga večkrat,
- preveri prodani delež,
- ob neskladnih deležih označi posel za ročni pregled.

## 10.3 Pokritost vrednotenja

Dodaj:

```text
valuationCoverage:
  complete
  partial
  none
```

in:

```text
matchedValuationComponentCount
totalValuationComponentCount
```

Razmerje izračunaj samo pri popolni pokritosti:

```text
priceToCurrentGeneralisedValueRatio =
contractPriceEur / transactionCurrentGeneralisedValueEur
```

## 10.4 Pomembna metodološka omejitev

Vrednosti v paketu EV predstavljajo trenutno stanje evidence na dan izvoza leta 2025.

Zato razmerja za starejše prodaje ne poimenuj:

```text
SPAR indeks
```

Pravilno poimenovanje:

```text
Razmerje prodajne cene do trenutne posplošene vrednosti
```

Dodaj opozorilo:

> Trenutna posplošena vrednost ni nujno vrednost, ki je veljala na datum starejše prodaje. Primerjava je informativna in ne predstavlja uradnega časovnega indeksa GURS.

---

# 11. Geometrije in spletna zmogljivost

## 11.1 Koordinatni sistem

Vhodne geometrije so:

```text
EPSG:3794
```

Za spletni zemljevid jih pretvori v:

```text
EPSG:4326
```

Ohrani izvorni CRS v metapodatkih.

## 11.2 Parcel ne nalagaj v enem velikem GeoJSON-u

Približno 24.634 parcelnih poligonov ne dodajaj v:

```text
transactions.json
```

in jih ne nalagaj vseh ob začetku aplikacije.

Prednostni možnosti:

### Možnost 1 – PMTiles oziroma vektorske ploščice

Priporočena rešitev:

```text
public/tiles/brezovica-parcels.pmtiles
public/tiles/brezovica-buildings.pmtiles
```

Uporabi MapLibre in PMTiles protokol.

### Možnost 2 – razdeljeni GeoJSON

Če lokalno orodje za vektorske ploščice ni dosegljivo:

- poenostavi samo prikazno geometrijo,
- razdeli podatke po katastrskih občinah ali mrežnih celicah,
- pripravi manifest z `bbox`,
- nalagaj samo datoteke, ki sekajo trenutni pogled,
- parcelni sloj aktiviraj šele pri večji povečavi.

Primer:

```text
public/data/map/parcels/manifest.json
public/data/map/parcels/1724.geojson
public/data/map/parcels/1652.geojson
```

## 11.3 Geometrijska pravila

- izvorne geometrije ne spreminjaj v lokalni analitični bazi,
- za splet ustvari ločeno poenostavljeno kopijo,
- popravi neveljavne geometrije z varnim postopkom,
- ne poenostavljaj tako močno, da se parcelne meje vidno premaknejo,
- geometrije z istim EID in več deli po potrebi združi z `dissolve`,
- izmeri in zapiši razliko med izvorno in poenostavljeno površino.

---


## 11.4 Ortofoto – neposredno iz javnega WMS GURS

Ortofota ne prenašaj, ne obdeluj in ne shranjuj v repozitorij.

Kot privzeto ortofoto podlago na zemljevidu uporabi javni WMS GURS.

Priporočena konfiguracija:

```text
WMS endpoint:
https://ipi.eprostor.gov.si/gwc-si-gurs-dts/service/wms

Sloj:
SI.GURS.ZPDZ:DOF050

Format:
image/png

WMS različica:
1.1.1
```

Kot rezervni netiled WMS endpoint lahko uporabiš:

```text
https://ipi.eprostor.gov.si/wms-si-gurs-dts/wms
```

Pred implementacijo vedno preveri trenutno stanje z:

```text
https://ipi.eprostor.gov.si/gwc-si-gurs-dts/service/wms?SERVICE=WMS&REQUEST=GetCapabilities
```

oziroma:

```text
https://ipi.eprostor.gov.si/wms-si-gurs-dts/wms?SERVICE=WMS&REQUEST=GetCapabilities
```

Če se ime sloja ali podprti koordinatni sistem spremeni, ne zakodiraj nedelujoče vrednosti. Ustavi se z razumljivo napako in izpiši razpoložljive sloje.

### MapLibre raster source

Za MapLibre pripravi namensko funkcijo za izdelavo WMS URL-ja.

Primer, če GURS WMS v trenutnem `GetCapabilities` podpira `EPSG:3857`:

```ts
const gursOrthoWmsUrl =
  "https://ipi.eprostor.gov.si/gwc-si-gurs-dts/service/wms" +
  "?SERVICE=WMS" +
  "&VERSION=1.1.1" +
  "&REQUEST=GetMap" +
  "&LAYERS=SI.GURS.ZPDZ:DOF050" +
  "&STYLES=" +
  "&FORMAT=image/png" +
  "&TRANSPARENT=false" +
  "&SRS=EPSG:3857" +
  "&WIDTH=256" +
  "&HEIGHT=256" +
  "&BBOX={bbox-epsg-3857}";
```

MapLibre source:

```ts
{
  type: "raster",
  tiles: [gursOrthoWmsUrl],
  tileSize: 256,
  attribution:
    "Geodetska uprava Republike Slovenije – državni ortofoto DOF050"
}
```

Ne predpostavi podpore `EPSG:3857` brez preverjanja `GetCapabilities`.

Če WMS podpira samo `EPSG:3794`, navadnega rastrskega sloja ne priklapljaj z napačnim `BBOX` oziroma napačnim CRS. V tem primeru:

1. preveri, ali uradni GURS GeoWebCache endpoint podpira zahtevano spletno projekcijo;
2. če je ne, pripravi varen tehnični način prikaza brez premikanja ortofota;
3. ne izvajaj približne transformacije rastrske slike v brskalniku;
4. dokumentiraj izbrano rešitev in jo testiraj na parcelnih mejah.

### Nastavitve okolja

Dodaj v `.env.example`:

```env
NEXT_PUBLIC_GURS_ORTHO_WMS_URL=https://ipi.eprostor.gov.si/gwc-si-gurs-dts/service/wms
NEXT_PUBLIC_GURS_ORTHO_WMS_LAYER=SI.GURS.ZPDZ:DOF050
NEXT_PUBLIC_GURS_ORTHO_WMS_VERSION=1.1.1
NEXT_PUBLIC_GURS_ORTHO_WMS_FORMAT=image/png
```

Če spremenljivke niso nastavljene, uporabi zgornje javne GURS vrednosti kot privzete.

### Uporabniški vmesnik

V nadzor slojev dodaj podlage:

```text
Osnovni zemljevid
GURS ortofoto
Brez podlage
```

Privzeto lahko ostane lažji osnovni zemljevid zaradi hitrejšega prvega nalaganja, vendar mora biti `GURS ortofoto` jasno dostopen kot glavna ortofoto podlaga.

Ko uporabnik izbere ortofoto:

- skrij napise osnovnega zemljevida, če zmanjšujejo čitljivost;
- omogoči ločen sloj cest oziroma krajevnih imen nad ortofotom;
- ohrani parcelne meje, stavbe in prodajne posle nad ortofotom;
- omogoči nastavitev prosojnosti ortofota;
- ortofota ne poskušaj vnaprej prenesti za celotno občino.

### Navedba vira in pogoji uporabe

Na zemljevidu in strani `Metodologija` vedno prikaži:

```text
Vir ortofota: Geodetska uprava Republike Slovenije, državni ortofoto DOF050.
```

Če je mogoče iz metapodatkov določiti datum oziroma obdobje snemanja, ga prikaži ob navedbi vira.

Upoštevaj pogoje uporabe GURS in licenco CC BY 4.0.

### Razpoložljivost storitve

Ker je WMS zunanji javni servis:

- napaka WMS ne sme sesuti celotne aplikacije;
- ob nedosegljivosti prikaži osnovni zemljevid in obvestilo;
- nastavi razumen čas čakanja;
- ne izvajaj agresivnega ponavljanja zahtev;
- ne posreduj WMS slik prek Vercel API-ja, če to ni nujno;
- spoštuj predpomnilne glave, ki jih vrne GURS;
- ne izdeluj trajnega lastnega arhiva WMS ploščic.

### Obvezni testi za ortofoto

Dodaj teste oziroma kontrole za:

1. pravilno sestavljen WMS `GetMap` URL;
2. pravilno kodirano ime sloja;
3. pravilen `BBOX` placeholder;
4. pravilno navedbo CRS/SRS glede na WMS različico;
5. prikaz navedbe vira GURS;
6. preklop med osnovnim zemljevidom in ortofotom;
7. delovanje aplikacije, če WMS ni dosegljiv;
8. pravilno poravnavo parcelnih mej in stavb z ortofotom na več kontrolnih lokacijah;
9. da ortofoto ni vključen v Git kot rastrska datoteka;
10. da začetno nalaganje aplikacije ne sproži množičnega prenosa ortofoto ploščic.

### Prednost tega navodila

To poglavje ima prednost pred morebitnimi starejšimi navodili, ki kot glavno podlago določajo samo OpenFreeMap ali drug zunanji kartografski vir.

OpenFreeMap oziroma druga osnovna karta se lahko ohrani kot lahka rezervna podlaga, ortofoto pa mora biti zagotovljen neposredno prek javnega servisa GURS.


# 12. Javne izhodne datoteke

Predlagana struktura:

```text
public/data/
├── meta.json
├── summary.json
├── transactions.json
├── transactions-enriched.json
├── rentals.json
├── catalog/
│   ├── parcels.json
│   ├── buildings.json
│   ├── building-parts.json
│   └── valuation-models.json
├── map/
│   ├── parcels/
│   │   └── manifest.json
│   ├── buildings/
│   │   └── manifest.json
│   └── rentals.geojson
└── quality/
    └── data-quality-report.json
```

Ne podvajaj celotnih podatkov parcele ali stavbe v vsakem poslu.

Kupoprodajni posel naj vsebuje reference:

```text
parcelEids
buildingEids
buildingPartEids
```

Podrobne lastnosti naj se berejo iz katalogov.

---

# 13. Razširitev uporabniškega vmesnika

## 13.1 Glavna navigacija

Dodaj oziroma prilagodi:

```text
Pregled
Prodajni posli
Najemni posli
Zemljevid
Parcele
Stavbe
Analize
Metodologija
```

## 13.2 Zemljevid

Dodaj sloje:

- prodajni posli,
- najemni posli,
- parcelne meje,
- stavbe,
- nadzemni tlorisi,
- namenska raba,
- dejanska raba.

Dodaj nadzor slojev in legendo.

Na klik parcele prikaži:

- katastrsko občino,
- parcelno številko,
- površino,
- namensko rabo z deleži,
- dejansko rabo z deleži,
- boniteto,
- trenutno posplošeno vrednost,
- povezane stavbe,
- zgodovino prodaj iz ETN, če obstaja.

Na klik stavbe prikaži:

- številko stavbe,
- leto izgradnje,
- leto obnove strehe in fasade,
- konstrukcijo,
- število etaž,
- število stanovanj,
- komunalno opremljenost,
- dele stavbe,
- trenutne posplošene vrednosti delov,
- povezane prodajne in najemne posle.

## 13.3 Stran posameznega prodajnega posla

Dodaj razdelek:

```text
Trenutni katastrski podatki
```

in:

```text
Trenutna posplošena vrednost
```

Prikaži:

- stanje ujemanja,
- povezane EID-je,
- pokritost vrednotenja,
- trenutno skupno posplošeno vrednost,
- razmerje prodajne cene do trenutne posplošene vrednosti,
- opozorilo glede različnega referenčnega časa.

## 13.4 Najemni posli

Dodaj ločeno stran:

```text
/najemi
```

Za trenutno zbirko mora biti vidno opozorilo:

> Najemni podatki za leto 2026 so še v preverjanju oziroma neopredeljeni. Rezultati niso dokončna uradna statistika tržnih najemnin.

Privzeto ne vključuj poslov s statusom:

```text
V preverjanju
Neopredeljen posel
Drug posel
```

v glavni tržni KPI.

Uporabnik jih lahko vključi z izrecnim filtrom:

```text
Prikaži tudi začasne in netržne posle
```

## 13.5 Analize

Dodaj:

- število prodaj po namenski rabi,
- mediano prodajne cene zemljišč po namenski rabi,
- mediano prodajne cene glede na trenutno posplošeno vrednost,
- porazdelitev razmerja prodajna cena / trenutna posplošena vrednost,
- prodaje po letu izgradnje stavbe,
- prodaje po letu obnove,
- najemnine po vrsti prostorov,
- najemnine na m² samo pri čistih poslih,
- velikost vzorca pri vsakem kazalniku.

Ne prikazuj mediane za skupino z manj kot tremi uporabnimi posli brez opozorila.

---

# 14. Posebna pravila za rabe parcel

## 14.1 Namenska raba

Parcela ima lahko več namenskih rab.

Ne izberi samo prve vrstice.

Prikaži na primer:

```text
Stanovanjske površine: 72,4 %
Druge urejene zelene površine: 27,6 %
```

Glavna namenska raba:

```text
plannedUsePrimary =
raba z največjim deležem
```

Ohrani vse deleže.

## 14.2 Dejanska raba

Tudi dejanska raba je večvrednostna.

Prikaži:

- vse kode rabe,
- njihove nazive,
- vir rabe,
- delež,
- sestavljeno šifro.

## 14.3 Kontrola deležev

Za vsako parcelo preveri:

```text
SUM(DELEZ)
```

Dovoli majhno odstopanje zaradi zaokroževanja.

Predlagana toleranca:

```text
99,5 % do 100,5 %
```

Odstopanja zapiši v poročilo kakovosti.

---

# 15. Poročilo o kakovosti

Generiraj:

```text
public/data/quality/data-quality-report.json
```

Vsebina:

```text
dataAsOf
inputFiles
rowCounts
duplicateKeyCounts
invalidGeometryCounts
missingRequiredFieldCounts
matchRates
unmatchedExamples
ambiguousMatchCounts
valuationCoverage
coordinateBounds
forbiddenPersonalFieldScan
outputFileSizes
warnings
```

V poročilu posebej navedi:

- koliko ETN parcel je bilo povezanih s KN,
- koliko delov stavb je bilo povezanih,
- koliko poslov ima popolno vrednotenje,
- koliko poslov ima delno vrednotenje,
- koliko parcel nima geometrije,
- koliko stavb nima dela stavbe,
- koliko najemnih poslov je tržnih, v preverjanju ali drugih.

---

# 16. Obvezni testi

Dodaj enotske in integracijske teste za:

1. normalizacijo parcelnih številk,
2. ohranjanje `*` in `/`,
3. EID kot besedilo,
4. povezovanje ETN parcele s KN,
5. povezovanje ETN dela stavbe s KN,
6. preprečevanje kartezičnega podvajanja,
7. agregacijo več parcelnih vrednostnih enot,
8. upoštevanje prodanega deleža,
9. deduplikacijo istega EID v istem poslu,
10. izračun pokritosti vrednotenja,
11. neizračunavanje razmerja pri delni pokritosti,
12. najemnino na m² pri eni sestavini,
13. `null` najemnino na m² pri več sestavinah brez individualnih cen,
14. izločitev netržnih najemnih poslov iz privzetih KPI-jev,
15. transformacijo EPSG:3794 v EPSG:4326,
16. preverjanje koordinat znotraj Slovenije,
17. prepoved osebnih polj v javnih izhodih,
18. pravilno prikazovanje slojev na zemljevidu,
19. odpiranje podrobnosti parcele in stavbe,
20. produkcijski `npm run build`.

---

# 17. Zmogljivostni cilji

Aplikacija ne sme ob prvem obisku prenesti vseh parcelnih poligonov.

Cilji:

```text
začetni JavaScript brez zemljevida: čim manjši
transactions.json: brez podvojenih parcelnih geometrij
parcelni sloj: leno nalaganje
zemljevid: dinamični import brez SSR
tabela: virtualizacija ali straničenje
```

Za velike JSON datoteke:

- odstrani nepotrebna prazna polja,
- ne ponavljaj šifrantov v vsaki vrstici,
- uporabi ločene kataloge,
- izmeri velikosti datotek,
- zapiši jih v poročilo kakovosti.

---

# 18. Posodobitve podatkov

Skripta mora podpirati novejše datoteke z enako strukturo.

Ne zakodiraj datuma samo na eno ime.

Poišči najnovejšo datoteko z vzorcem, na primer:

```text
KN_008_PARCELE_*.zip
KN_008_STAVBE_*.zip
EV_008_EVIDENCA_VREDNOTENJA_*.zip
ETN_008_*_NP_*.zip
```

Iz imena preberi datum stanja in ga zapiši v:

```text
meta.json
```

Ob spremembi sheme:

- ne nadaljuj tiho,
- izpiši manjkajoča ali nova polja,
- ustavi obdelavo, če manjka obvezni ključ,
- dovoljena dodatna polja zapiši v opozorilo.

---

# 19. Git in Vercel

## V Git lahko shraniš

- programsko kodo,
- varne izpeljane JSON/GeoJSON oziroma vektorske ploščice,
- šifrante brez osebnih podatkov,
- poročilo kakovosti,
- metodološka navodila.

## V Git ne shrani

- surovih ZIP-paketov,
- tabel oseb,
- lastnikov,
- imetnikov pravic,
- EMSO oziroma matičnih številk,
- lokalne DuckDB/SQLite baze,
- začasnih shapefile datotek.

Vercelov `npm run build` ne sme biti odvisen od lokalnih surovih ZIP-datotek.

Podatke pripravi lokalno in v Git shrani samo varne končne javne datoteke.

---

# 20. Zaporedje izvedbe za Codex

Izvedi po fazah.

## Faza A – pregled in varnost

1. Preberi vse specifikacije.
2. Preveri `.gitignore`.
3. Preglej sheme ZIP-datotek.
4. Izpiši seznam varnih in prepovedanih tabel.
5. Pripravi test za osebne podatke.

## Faza B – podatkovni ETL

1. Izdelaj `build_gurs_enriched_data.py`.
2. Uvozi parcele in stavbe.
3. Uvozi šifrante.
4. Izdelaj EID-preslikave.
5. Poveži obstoječe kupoprodajne posle.
6. Poveži vrednotenja.
7. Uvozi najemne posle.
8. Generiraj poročilo kakovosti.

## Faza C – zemljevid

1. Pripravi optimizirane geometrije.
2. Dodaj parcelne in stavbne sloje.
3. Dodaj klik in prikaz podrobnosti.
4. Poveži prodajne in najemne posle z entitetami.

## Faza D – uporabniški vmesnik

1. Dodaj strani parcel, stavb in najemov.
2. Razširi podrobnosti prodajnega posla.
3. Dodaj filtre in analize.
4. Dodaj metodološka opozorila.

## Faza E – kontrole

Zaženi:

```text
python scripts/build_gurs_enriched_data.py
npm run lint
npm run typecheck
npm run test
npm run build
```

Odpravi vse napake.

---

# 21. Kriteriji uspešnosti

Naloga je končana šele, ko velja vse naslednje:

- obstoječi pregled prodajnih poslov še vedno deluje,
- parcele se pravilno povežejo z EID,
- stavbe in deli stavb se pravilno povežejo,
- vrednosti se ne podvajajo,
- prodani deleži so upoštevani,
- najemne cene se ne delijo med več sestavin brez podatka,
- začasni najemni posli so jasno označeni,
- osebni podatki niso vključeni v javni izhod,
- surovi ZIP-i niso v Git repozitoriju,
- zemljevid ne nalaga vseh parcel ob prvem obisku,
- vse strani delujejo po neposrednem odprtju in osvežitvi,
- `npm run build` uspe,
- aplikacija je pripravljena za Vercel.

---

# 22. Končno navodilo

Najprej pripravi kratek načrt, nato samostojno izvedi podatkovno obdelavo in razširitev aplikacije.

Ne čakaj na potrditve za običajne tehnične odločitve.

Ustavi se in opozori uporabnika samo, če:

- bi bilo treba objaviti osebne podatke,
- vhodna shema nima ključnih polj,
- je povezava dvoumna in bi zahtevala ugibanje,
- bi potreboval plačljiv zunanji servis,
- bi moral izvesti zunanji poseg v GitHub ali Vercel, ki še ni bil potrjen.
