#!/usr/bin/env python3
"""
Ponovna izdelava spletnih JSON/GeoJSON datotek iz očiščene joinane CSV zbirke.

Zahteve:
    pip install pandas pyproj
"""

from pathlib import Path
import json
import math
import pandas as pd
from pyproj import Transformer

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "data" / "source" / "ETN_Brezovica_posli_joined.csv"
OUT = ROOT / "public" / "data"
OUT.mkdir(parents=True, exist_ok=True)

df = pd.read_csv(SOURCE, sep=";", encoding="utf-8-sig")
transformer = Transformer.from_crs("EPSG:3794", "EPSG:4326", always_xy=True)

def value(v):
    if pd.isna(v):
        return None
    if hasattr(v, "item"):
        v = v.item()
    if isinstance(v, float) and math.isfinite(v) and v.is_integer():
        return int(v)
    return v

def split_pipe(v):
    if pd.isna(v) or not str(v).strip():
        return []
    return [x.strip() for x in str(v).split("|") if x.strip()]

transactions = []
features = []

for _, row in df.iterrows():
    e = value(row.get("e_centroid_povprecje"))
    n = value(row.get("n_centroid_povprecje"))
    lon = lat = None
    if isinstance(e, (int, float)) and isinstance(n, (int, float)):
        lon, lat = transformer.transform(float(e), float(n))
        if not (13.0 <= lon <= 17.0 and 45.0 <= lat <= 47.5):
            lon = lat = None

    item = {
        "id": int(row["id_posla"]),
        "contractDate": value(row.get("datum_sklenitve_pogodbe")),
        "contractYear": value(row.get("leto_pogodbe")),
        "priceEur": value(row.get("pogodbena_cena_eur")),
        "mainCategory": value(row.get("glavna_kategorija")),
        "analyticalUnit": value(row.get("analiticna_enota")),
        "quality": value(row.get("kakovost_analiticna")),
        "qualityReason": value(row.get("kakovost_razlog")),
        "marketability": value(row.get("trznost_opis")),
        "settlements": split_pipe(row.get("naselja")),
        "addresses": split_pipe(row.get("naslovi")),
        "parcels": split_pipe(row.get("parcele")),
        "buildingParts": split_pipe(row.get("stavbe_in_deli")),
        "soldUsableAreaM2": value(row.get("uporabna_povrsina_delez_sum_m2")),
        "soldLandAreaM2": value(row.get("povrsina_zemljisc_delez_sum_m2")),
        "analyticalAreaM2": value(row.get("analiticna_povrsina_m2")),
        "analyticalPriceEurM2": value(row.get("analiticna_cena_eur_m2")),
        "coordinate": {
            "longitude": lon,
            "latitude": lat,
            "sourceE": e,
            "sourceN": n,
        } if lon is not None and lat is not None else None,
    }
    transactions.append(item)

    if item["coordinate"]:
        features.append({
            "type": "Feature",
            "id": item["id"],
            "geometry": {
                "type": "Point",
                "coordinates": [lon, lat],
            },
            "properties": {
                "id": item["id"],
                "contractDate": item["contractDate"],
                "contractYear": item["contractYear"],
                "priceEur": item["priceEur"],
                "mainCategory": item["mainCategory"],
                "analyticalPriceEurM2": item["analyticalPriceEurM2"],
                "quality": item["quality"],
                "marketability": item["marketability"],
                "settlement": item["settlements"][0] if item["settlements"] else None,
                "address": item["addresses"][0] if item["addresses"] else None,
            },
        })

(OUT / "transactions.json").write_text(
    json.dumps(transactions, ensure_ascii=False, separators=(",", ":")),
    encoding="utf-8",
)
(OUT / "transactions.geojson").write_text(
    json.dumps({"type": "FeatureCollection", "features": features}, ensure_ascii=False, separators=(",", ":")),
    encoding="utf-8",
)

print(f"Ustvarjenih {len(transactions)} poslov in {len(features)} kartografskih točk.")
