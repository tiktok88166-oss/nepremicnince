#!/usr/bin/env python3
"""Build privacy-safe public GURS datasets for the Brezovica application.

The script intentionally opens only explicitly allow-listed archive members. It
never reads ownership, rights-holder, person, manager or administrator tables.

Requirements:
    pip install pandas pyshp pyproj shapely
"""

from __future__ import annotations

from collections import defaultdict
from datetime import date, datetime
from io import TextIOWrapper
import json
import math
from pathlib import Path
import re
import shutil
import tempfile
from typing import Any, Iterable
from zipfile import ZipFile

import pandas as pd
from pyproj import Transformer
import shapefile
from shapely.geometry import mapping, shape
from shapely.ops import transform as transform_geometry
from shapely.validation import make_valid


ROOT = Path(__file__).resolve().parents[1]
INPUT_DIRS = [ROOT / "data" / "raw-private", ROOT / "Vhodni podatki"]
SOURCE = ROOT / "data" / "source"
PUBLIC = ROOT / "public" / "data"
CATALOG = PUBLIC / "catalog"
PARCEL_CATALOG = CATALOG / "parcels"
BUILDING_CATALOG = CATALOG / "buildings"
MAP = PUBLIC / "map"
QUALITY = PUBLIC / "quality"

FORBIDDEN_TABLE_FRAGMENTS = (
    "osebe",
    "oseba",
    "imetniki_lastnistva",
    "imetnik_lastnistva",
    "pravice_lastnistva",
    "pravica_lastnistva",
    "lastnik_povezanih_parcel",
    "upravljavci",
    "upravljavec",
    "upravniki",
)
FORBIDDEN_PUBLIC_FIELDS = (
    "EMSO",
    "MS_OSEBE",
    "ID_OSEBA",
    "OSEBA_ID",
    "NASLOV_STALNI",
    "NASLOV_VROCANJE",
    "IMETNIK_LASTNISTVA_ID",
    "PRAVICA_LASTNISTVA_ID",
)

ACTUAL_USE_COLUMNS = {
    "KG_VRSTA_DEJANSKE_RABE_ID": "kmetijska",
    "PO_VRSTA_DEJANSKE_RABE_ID": "pozidana",
    "ST_VRSTA_DEJANSKE_RABE_ID": "stavbna",
    "IN_VRSTA_DEJANSKE_RABE_ID": "infrastruktura",
    "IN1_VRSTA_DEJANSKE_RABE_ID": "infrastruktura-1",
    "IN2_VRSTA_DEJANSKE_RABE_ID": "infrastruktura-2",
    "IN3_VRSTA_DEJANSKE_RABE_ID": "infrastruktura-3",
    "VZ_VRSTA_DEJANSKE_RABE_ID": "vodna",
    "NN_VRSTA_DEJANSKE_RABE_ID": "neopredeljena",
}

TO_WGS84 = Transformer.from_crs("EPSG:3794", "EPSG:4326", always_xy=True)


def latest_input(pattern: str) -> Path:
    candidates = [path for folder in INPUT_DIRS if folder.exists() for path in folder.glob(pattern)]
    if not candidates:
        raise FileNotFoundError(f"Manjka vhodna datoteka po vzorcu {pattern}")
    return max(candidates, key=lambda path: path.name)


def archive_date(path: Path) -> str | None:
    dates = re.findall(r"(20\d{6})", path.name)
    if not dates:
        return None
    return datetime.strptime(dates[-1], "%Y%m%d").date().isoformat()


def member_by_pattern(archive: ZipFile, pattern: str) -> str:
    matches = [name for name in archive.namelist() if re.fullmatch(pattern, name, re.IGNORECASE)]
    if len(matches) != 1:
        raise ValueError(f"Pričakovana je ena datoteka {pattern}, najdenih: {len(matches)}")
    name = matches[0]
    lowered = name.lower()
    if any(fragment in lowered for fragment in FORBIDDEN_TABLE_FRAGMENTS):
        raise ValueError(f"Poskus dostopa do prepovedane tabele: {name}")
    return name


def read_csv_member(archive: ZipFile, pattern: str, **kwargs: Any) -> pd.DataFrame:
    name = member_by_pattern(archive, pattern)
    with archive.open(name) as stream:
        return pd.read_csv(TextIOWrapper(stream, encoding="utf-8-sig"), dtype=str, **kwargs)


def require_columns(frame: pd.DataFrame, required: Iterable[str], source_name: str) -> None:
    missing = sorted(set(required) - set(frame.columns))
    if missing:
        raise ValueError(f"{source_name}: manjkajo obvezna polja: {', '.join(missing)}")


def text(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    normalized = str(value).strip()
    if not normalized or normalized.lower() == "nan":
        return None
    return normalized


def key_text(value: Any) -> str | None:
    normalized = text(value)
    if normalized is None:
        return None
    return re.sub(r"\.0$", "", normalized)


def number(value: Any) -> float | None:
    normalized = text(value)
    if normalized is None:
        return None
    try:
        parsed = float(normalized.replace(",", "."))
    except ValueError:
        return None
    return parsed if math.isfinite(parsed) else None


def integer(value: Any) -> int | None:
    parsed = number(value)
    return int(parsed) if parsed is not None and parsed.is_integer() else None


def boolean_code(value: Any) -> bool | None:
    normalized = key_text(value)
    if normalized in {"1", "DA", "Da", "da", "true", "True"}:
        return True
    if normalized in {"0", "NE", "Ne", "ne", "false", "False"}:
        return False
    return None


def json_value(value: Any) -> Any:
    if isinstance(value, (date, datetime)):
        return value.isoformat()
    if hasattr(value, "item"):
        value = value.item()
    if isinstance(value, float) and math.isnan(value):
        return None
    return value


def compact_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(payload, ensure_ascii=False, separators=(",", ":"), default=json_value),
        encoding="utf-8",
    )


def read_codebook(archive: ZipFile, pattern: str) -> dict[str, str]:
    frame = read_csv_member(archive, pattern)
    require_columns(frame, ["id", "nazivSl"], pattern)
    return {
        key_text(row["id"]): text(row["nazivSl"]) or key_text(row["id"]) or ""
        for _, row in frame.iterrows()
        if key_text(row["id"])
    }


def extract_nested_shape(archive: ZipFile, pattern: str, temp_root: Path) -> Path:
    member = member_by_pattern(archive, pattern)
    nested_path = temp_root / Path(member).name
    with archive.open(member) as source, nested_path.open("wb") as target:
        shutil.copyfileobj(source, target)
    output = temp_root / nested_path.stem
    output.mkdir()
    with ZipFile(nested_path) as nested:
        nested.extractall(output)
    shapes = list(output.glob("*.shp"))
    if len(shapes) != 1:
        raise ValueError(f"{member}: pričakovan je en shapefile, najdenih {len(shapes)}")
    return shapes[0]


def shape_rows(path: Path) -> Iterable[tuple[dict[str, Any], Any]]:
    reader = shapefile.Reader(str(path), encoding="utf-8")
    try:
        for item in reader.iterShapeRecords():
            yield item.record.as_dict(), item.shape.__geo_interface__
    finally:
        reader.close()


def transformed_point(e: Any, n: Any) -> tuple[float | None, float | None]:
    east, north = number(e), number(n)
    if east is None or north is None:
        return None, None
    lon, lat = TO_WGS84.transform(east, north)
    if not (13 <= lon <= 17 and 45 <= lat <= 47.5):
        return None, None
    return round(lon, 7), round(lat, 7)


def calculate_rent_eur_m2(
    individual_rent: float | None,
    contract_rent: float | None,
    area_m2: float | None,
    component_count: int,
) -> float | None:
    if area_m2 is None or area_m2 <= 0:
        return None
    if individual_rent is not None:
        return individual_rent / area_m2
    if component_count == 1 and contract_rent is not None:
        return contract_rent / area_m2
    return None


def valuation_coverage(matched: int, total: int) -> str:
    if matched == 0:
        return "none"
    return "complete" if matched == total else "partial"


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for folder in (CATALOG, PARCEL_CATALOG, BUILDING_CATALOG, MAP / "parcels", MAP / "buildings", QUALITY):
        folder.mkdir(parents=True, exist_ok=True)

    parcel_zip = latest_input("KN_008_PARCELE_*.zip")
    building_zip = latest_input("KN_008_STAVBE_*.zip")
    valuation_zip = latest_input("EV_008_EVIDENCA_VREDNOTENJA_*.zip")
    rental_zip = latest_input("ETN_008_*_NP_*.zip")
    input_files = [parcel_zip, building_zip, valuation_zip, rental_zip]

    invalid_geometries = 0
    geometry_area_differences: list[float] = []
    simplification_fallbacks = 0
    missing_required: dict[str, int] = defaultdict(int)
    warnings: list[str] = []

    with tempfile.TemporaryDirectory(
        prefix="gurs-etl-", dir=ROOT / "data" / "processed" / "tmp", ignore_cleanup_errors=True
    ) as tmp:
        temp_root = Path(tmp)
        with ZipFile(parcel_zip) as parcel_archive, ZipFile(building_zip) as building_archive, ZipFile(
            valuation_zip
        ) as valuation_archive, ZipFile(rental_zip) as rental_archive:
            parcel_shape = extract_nested_shape(
                parcel_archive, r"KN_008_PARCELE_parcele_\d{8}\.zip", temp_root
            )
            building_shape = extract_nested_shape(
                building_archive, r"KN_008_STAVBE_stavbe_\d{8}\.zip", temp_root
            )

            planned_use_codes = read_codebook(parcel_archive, r"sifranti/VRSTE_NAMENSKE_RABE\.CSV")
            actual_use_codes = read_codebook(parcel_archive, r"sifranti/VRSTE_DEJANSKE_RABE\.CSV")
            admin_status_codes = read_codebook(parcel_archive, r"sifranti/UPRAVNI_STATUSI\.CSV")
            building_type_codes = read_codebook(building_archive, r"sifranti/TIPI_STAVB\.CSV")
            construction_codes = read_codebook(building_archive, r"sifranti/NOSILNE_KONSTRUKCIJE\.CSV")
            building_status_codes = read_codebook(building_archive, r"sifranti/STATUSI_VPISA_STAVBE\.CSV")
            part_use_codes = read_codebook(building_archive, r"sifranti/VRSTE_DEJANSKIH_RAB_DEL_ST\.CSV")
            part_status_codes = read_codebook(building_archive, r"sifranti/STATUSI_VPISA_DELA_STAVBE\.CSV")
            apartment_type_codes = read_codebook(building_archive, r"sifranti/VRSTE_STANOVANJ\.CSV")
            space_type_codes = read_codebook(building_archive, r"sifranti/VRSTE_PROSTOROV\.CSV")

            planned_uses_frame = read_csv_member(
                parcel_archive, r"KN_008_PARCELE_parcele_x_namenske_rabe_\d{8}\.csv"
            )
            actual_uses_frame = read_csv_member(
                parcel_archive, r"KN_008_PARCELE_parcele_x_dejanske_rabe_\d{8}\.csv"
            )
            parts_frame = read_csv_member(building_archive, r"KN_008_STAVBE_deli_stavb_\d{8}\.csv")
            spaces_frame = read_csv_member(building_archive, r"KN_008_STAVBE_prostori_\d{8}\.csv")
            models_frame = read_csv_member(
                valuation_archive, r"EV_008_EVIDENCA_VREDNOTENJA_SIF_MODEL_\d{8}\.csv"
            )
            parcel_values_frame = read_csv_member(
                valuation_archive, r"EV_008_EVIDENCA_VREDNOTENJA_parc_enota_\d{8}\.csv"
            )
            part_values_frame = read_csv_member(
                valuation_archive, r"EV_008_EVIDENCA_VREDNOTENJA_del_stavbe_enota_\d{8}\.csv"
            )
            rent_frame = read_csv_member(rental_archive, r"ETN_008_\d{4}_NP_\d{4}_POSLI_\d{8}\.csv")
            rent_parts_frame = read_csv_member(
                rental_archive, r"ETN_008_\d{4}_NP_\d{4}_DELISTAVB_\d{8}\.csv"
            )

            require_columns(planned_uses_frame, ["EID_PARCELA", "VRSTA_NAMENSKE_RABE_ID", "DELEZ"], "namenske rabe")
            require_columns(actual_uses_frame, ["EID_PARCELA", "DELEZ", *ACTUAL_USE_COLUMNS], "dejanske rabe")
            require_columns(parts_frame, ["EID_DEL_STAVBE", "EID_STAVBA", "ST_DELA_STAVBE"], "deli stavb")
            require_columns(spaces_frame, ["EID_PROSTOR", "EID_DEL_STAVBE"], "prostori")
            require_columns(parcel_values_frame, ["EID_PARCELA", "ID_MODEL", "POSPLOSENA_VREDNOST"], "vrednosti parcel")
            require_columns(part_values_frame, ["EID_DEL_STAVBE", "ID_MODEL", "POSPLOSENA_VREDNOST"], "vrednosti delov")
            require_columns(rent_frame, ["ID_POSLA", "POGODBENA_NAJEMNINA", "TRZNOST_POSLA"], "najemni posli")
            require_columns(
                rent_parts_frame,
                ["ID_POSLA", "SIFRA_KO", "STEVILKA_STAVBE", "STEVILKA_DELA_STAVBE"],
                "oddani deli stavb",
            )

            model_names = {
                key_text(row["ID_MODEL"]): text(row["NAZIV"]) or key_text(row["ID_MODEL"]) or ""
                for _, row in models_frame.iterrows()
            }

            planned_by_parcel: dict[str, list[dict[str, Any]]] = defaultdict(list)
            planned_share_outliers = 0
            for _, row in planned_uses_frame.iterrows():
                eid = key_text(row["EID_PARCELA"])
                code = key_text(row["VRSTA_NAMENSKE_RABE_ID"])
                if not eid or not code:
                    continue
                planned_by_parcel[eid].append(
                    {
                        "code": code,
                        "name": planned_use_codes.get(code, code),
                        "sharePercent": number(row.get("DELEZ")),
                        "municipalityId": key_text(row.get("OBCINA_ID")),
                        "systemDate": text(row.get("DATUM_SYS")),
                    }
                )
            for uses in planned_by_parcel.values():
                share_sum = sum(item["sharePercent"] or 0 for item in uses)
                if share_sum and not 99.5 <= share_sum <= 100.5:
                    planned_share_outliers += 1

            actual_by_parcel: dict[str, list[dict[str, Any]]] = defaultdict(list)
            actual_share_outliers = 0
            for _, row in actual_uses_frame.iterrows():
                eid = key_text(row["EID_PARCELA"])
                if not eid:
                    continue
                for column, source_type in ACTUAL_USE_COLUMNS.items():
                    code = key_text(row.get(column))
                    if code:
                        actual_by_parcel[eid].append(
                            {
                                "sourceType": source_type,
                                "code": code,
                                "name": actual_use_codes.get(code, code),
                                "sharePercent": number(row.get("DELEZ")),
                                "compositeUseCode": text(row.get("SESTAVLJENA_VRSTA_DRABE_SIFRA")),
                                "systemDate": text(row.get("DATUM_SYS")),
                            }
                        )
            for uses in actual_by_parcel.values():
                distinct_rows: dict[tuple[str | None, str | None], float] = {}
                for item in uses:
                    distinct_rows[(item["compositeUseCode"], item["systemDate"])] = item["sharePercent"] or 0
                share_sum = sum(distinct_rows.values())
                if share_sum and not 99.5 <= share_sum <= 100.5:
                    actual_share_outliers += 1

            parcel_value_details: dict[str, list[dict[str, Any]]] = defaultdict(list)
            parcel_value_totals: dict[str, float] = defaultdict(float)
            for _, row in parcel_values_frame.iterrows():
                eid = key_text(row["EID_PARCELA"])
                model_id = key_text(row["ID_MODEL"])
                value = number(row["POSPLOSENA_VREDNOST"])
                if not eid or value is None:
                    continue
                parcel_value_totals[eid] += value
                parcel_value_details[eid].append(
                    {
                        "modelId": model_id,
                        "modelName": model_names.get(model_id, model_id),
                        "level": key_text(row.get("RAVEN")),
                        "surfaceShare": number(row.get("DELEZ_POVRSINE")),
                        "generalisedValueEur": value,
                    }
                )

            part_value_details: dict[str, list[dict[str, Any]]] = defaultdict(list)
            part_value_totals: dict[str, float] = defaultdict(float)
            for _, row in part_values_frame.iterrows():
                eid = key_text(row["EID_DEL_STAVBE"])
                model_id = key_text(row["ID_MODEL"])
                value = number(row["POSPLOSENA_VREDNOST"])
                if not eid or value is None:
                    continue
                part_value_totals[eid] += value
                part_value_details[eid].append(
                    {
                        "modelId": model_id,
                        "modelName": model_names.get(model_id, model_id),
                        "level": key_text(row.get("RAVEN")),
                        "influence": number(row.get("VPLIV")),
                        "generalisedValueEur": value,
                    }
                )

            spaces: list[dict[str, Any]] = []
            spaces_by_part: dict[str, list[dict[str, Any]]] = defaultdict(list)
            for _, row in spaces_frame.iterrows():
                eid = key_text(row["EID_PROSTOR"])
                part_eid = key_text(row["EID_DEL_STAVBE"])
                code = key_text(row.get("VRSTA_PROSTORA_ID"))
                if not eid or not part_eid:
                    continue
                item = {
                    "eidSpace": eid,
                    "eidBuildingPart": part_eid,
                    "spaceTypeCode": code,
                    "spaceType": space_type_codes.get(code, code),
                    "areaM2": number(row.get("POVRSINA")),
                }
                spaces.append(item)
                spaces_by_part[part_eid].append(item)

            building_parts: list[dict[str, Any]] = []
            parts_by_building: dict[str, list[str]] = defaultdict(list)
            part_by_eid: dict[str, dict[str, Any]] = {}
            for _, row in parts_frame.iterrows():
                eid = key_text(row["EID_DEL_STAVBE"])
                building_eid = key_text(row["EID_STAVBA"])
                if not eid or not building_eid:
                    continue
                use_code = key_text(row.get("VRSTA_DEJANSKE_RABE_DEL_ST_ID"))
                status_code = key_text(row.get("STATUS"))
                apartment_code = key_text(row.get("VRSTA_STANOVANJA_ID"))
                item = {
                    "eidBuildingPart": eid,
                    "eidBuilding": building_eid,
                    "partNumber": key_text(row.get("ST_DELA_STAVBE")),
                    "actualUseCode": use_code,
                    "actualUse": part_use_codes.get(use_code, use_code),
                    "areaM2": number(row.get("POVRSINA")),
                    "usableAreaM2": number(row.get("UPORABNA_POVRSINA")),
                    "apartmentNumber": key_text(row.get("ST_STANOVANJA")),
                    "apartmentType": apartment_type_codes.get(apartment_code, apartment_code),
                    "windowRenovationYear": integer(row.get("LETO_OBNOVE_OKEN")),
                    "installationRenovationYear": integer(row.get("LETO_OBNOVE_INSTALACIJ")),
                    "hasElevator": boolean_code(row.get("DVIGALO")),
                    "status": part_status_codes.get(status_code, status_code),
                    "spaceCount": len(spaces_by_part.get(eid, [])),
                    "generalisedValueEur": round(part_value_totals[eid], 2) if eid in part_value_totals else None,
                    "valuationModels": part_value_details.get(eid, []),
                }
                building_parts.append(item)
                part_by_eid[eid] = item
                parts_by_building[building_eid].append(eid)

            parcels: list[dict[str, Any]] = []
            parcel_by_eid: dict[str, dict[str, Any]] = {}
            parcel_match_index: dict[tuple[str, str], list[str]] = defaultdict(list)
            parcel_features: dict[str, list[dict[str, Any]]] = defaultdict(list)
            parcel_bounds: dict[str, list[float]] = {}
            for attrs, raw_geometry in shape_rows(parcel_shape):
                eid = key_text(attrs.get("EID_PARCEL"))
                ko = key_text(attrs.get("KO_ID"))
                parcel_number = key_text(attrs.get("ST_PARCELE"))
                if not eid or not ko or not parcel_number:
                    missing_required["parcels"] += 1
                    continue
                lon, lat = transformed_point(attrs.get("E_CEN"), attrs.get("N_CEN"))
                planned = planned_by_parcel.get(eid, [])
                planned_primary = max(planned, key=lambda item: item["sharePercent"] or 0, default=None)
                status_code = key_text(attrs.get("UPRAVNI_ST"))
                item = {
                    "eidParcel": eid,
                    "cadastralMunicipalityCode": ko,
                    "parcelNumber": parcel_number,
                    "areaM2": number(attrs.get("POVRSINA")),
                    "centroidE": number(attrs.get("E_CEN")),
                    "centroidN": number(attrs.get("N_CEN")),
                    "longitude": lon,
                    "latitude": lat,
                    "boniteta": integer(attrs.get("BONITETA")),
                    "administrativeStatusCode": status_code,
                    "administrativeStatus": admin_status_codes.get(status_code, status_code),
                    "systemDate": json_value(attrs.get("DATUM_SYS")),
                    "plannedUsePrimary": planned_primary,
                    "plannedUses": planned,
                    "actualUses": actual_by_parcel.get(eid, []),
                    "generalisedValueTotalEur": round(parcel_value_totals[eid], 2) if eid in parcel_value_totals else None,
                    "valuationModelCount": len(parcel_value_details.get(eid, [])),
                    "valuationModels": parcel_value_details.get(eid, []),
                    "geometryReference": f"map/parcels/{ko}.geojson",
                }
                parcels.append(item)
                parcel_by_eid[eid] = item
                parcel_match_index[(ko, parcel_number)].append(eid)

                geometry = shape(raw_geometry)
                if not geometry.is_valid:
                    invalid_geometries += 1
                    geometry = make_valid(geometry)
                original_area = geometry.area
                simplified = geometry.simplify(0.15, preserve_topology=True)
                if original_area > 0:
                    area_difference = abs(simplified.area - original_area) / original_area * 100
                    if area_difference > 0.5:
                        simplified = geometry
                        area_difference = 0.0
                        simplification_fallbacks += 1
                    geometry_area_differences.append(area_difference)
                web_geometry = transform_geometry(TO_WGS84.transform, simplified)
                bounds = web_geometry.bounds
                if ko not in parcel_bounds:
                    parcel_bounds[ko] = list(bounds)
                else:
                    current = parcel_bounds[ko]
                    parcel_bounds[ko] = [
                        min(current[0], bounds[0]), min(current[1], bounds[1]),
                        max(current[2], bounds[2]), max(current[3], bounds[3]),
                    ]
                parcel_features[ko].append(
                    {
                        "type": "Feature",
                        "id": eid,
                        "geometry": mapping(web_geometry),
                        "properties": {
                            "eidParcel": eid,
                            "parcelNumber": parcel_number,
                            "cadastralMunicipalityCode": ko,
                            "areaM2": item["areaM2"],
                            "plannedUsePrimary": planned_primary["name"] if planned_primary else None,
                            "generalisedValueTotalEur": item["generalisedValueTotalEur"],
                        },
                    }
                )

            buildings: list[dict[str, Any]] = []
            building_by_eid: dict[str, dict[str, Any]] = {}
            building_match_index: dict[tuple[str, str], list[str]] = defaultdict(list)
            part_match_index: dict[tuple[str, str, str], list[str]] = defaultdict(list)
            building_features: dict[str, list[dict[str, Any]]] = defaultdict(list)
            building_bounds: dict[str, list[float]] = {}
            for attrs, raw_geometry in shape_rows(building_shape):
                eid = key_text(attrs.get("EID_STAVBA"))
                ko = key_text(attrs.get("KO_ID"))
                building_number = key_text(attrs.get("ST_STAVBE"))
                if not eid or not ko or not building_number:
                    missing_required["buildings"] += 1
                    continue
                coordinates = raw_geometry.get("coordinates")
                e, n = coordinates if coordinates and len(coordinates) == 2 else (None, None)
                lon, lat = transformed_point(e, n)
                type_code = key_text(attrs.get("TIP_STAVBE"))
                construction_code = key_text(attrs.get("NOSILNA_KO"))
                status_code = key_text(attrs.get("STATUS_VPI"))
                item = {
                    "eidBuilding": eid,
                    "cadastralMunicipalityCode": ko,
                    "buildingNumber": building_number,
                    "buildingTypeCode": type_code,
                    "buildingType": building_type_codes.get(type_code, type_code),
                    "yearBuilt": integer(attrs.get("LETO_IZGRA")),
                    "roofRenovationYear": integer(attrs.get("LETO_OBNOV")),
                    "facadeRenovationYear": integer(attrs.get("LETO_OBNO0")),
                    "constructionCode": construction_code,
                    "construction": construction_codes.get(construction_code, construction_code),
                    "floorCount": integer(attrs.get("STEVILO_ET")),
                    "apartmentCount": integer(attrs.get("STEVILO_ST")),
                    "businessSpaceCount": integer(attrs.get("STEVILO_PO")),
                    "grossFloorAreaM2": number(attrs.get("BRUTO_TLOR")),
                    "hasElectricity": boolean_code(attrs.get("ELEKTRIKA")),
                    "hasWater": boolean_code(attrs.get("VODOVOD")),
                    "hasSewer": boolean_code(attrs.get("KANALIZACI")),
                    "hasGas": boolean_code(attrs.get("PLIN")),
                    "statusCode": status_code,
                    "status": building_status_codes.get(status_code, status_code),
                    "longitude": lon,
                    "latitude": lat,
                    "buildingPartEids": parts_by_building.get(eid, []),
                    "geometryReference": f"map/buildings/{ko}.geojson",
                }
                buildings.append(item)
                building_by_eid[eid] = item
                building_match_index[(ko, building_number)].append(eid)
                if lon is not None and lat is not None:
                    if ko not in building_bounds:
                        building_bounds[ko] = [lon, lat, lon, lat]
                    else:
                        current = building_bounds[ko]
                        building_bounds[ko] = [min(current[0], lon), min(current[1], lat), max(current[2], lon), max(current[3], lat)]
                    building_features[ko].append(
                        {
                            "type": "Feature",
                            "id": eid,
                            "geometry": {"type": "Point", "coordinates": [lon, lat]},
                            "properties": {
                                "eidBuilding": eid,
                                "buildingNumber": building_number,
                                "cadastralMunicipalityCode": ko,
                                "yearBuilt": item["yearBuilt"],
                                "buildingType": item["buildingType"],
                            },
                        }
                    )

            for part in building_parts:
                building = building_by_eid.get(part["eidBuilding"])
                if building and part["partNumber"]:
                    part_match_index[(building["cadastralMunicipalityCode"], building["buildingNumber"], part["partNumber"])].append(
                        part["eidBuildingPart"]
                    )

            for ko, features in parcel_features.items():
                compact_json(MAP / "parcels" / f"{ko}.geojson", {"type": "FeatureCollection", "features": features})
            compact_json(
                MAP / "parcels" / "manifest.json",
                {
                    "sourceCrs": "EPSG:3794",
                    "webCrs": "EPSG:4326",
                    "minimumZoom": 14,
                    "tiles": [
                        {"cadastralMunicipalityCode": ko, "url": f"/data/map/parcels/{ko}.geojson", "bbox": parcel_bounds[ko], "featureCount": len(features)}
                        for ko, features in sorted(parcel_features.items())
                    ],
                },
            )
            for ko, features in building_features.items():
                compact_json(MAP / "buildings" / f"{ko}.geojson", {"type": "FeatureCollection", "features": features})
            compact_json(
                MAP / "buildings" / "manifest.json",
                {
                    "sourceCrs": "EPSG:3794",
                    "webCrs": "EPSG:4326",
                    "minimumZoom": 13,
                    "tiles": [
                        {"cadastralMunicipalityCode": ko, "url": f"/data/map/buildings/{ko}.geojson", "bbox": building_bounds[ko], "featureCount": len(features)}
                        for ko, features in sorted(building_features.items())
                    ],
                },
            )

            transactions = json.loads((PUBLIC / "transactions.json").read_text(encoding="utf-8"))
            transaction_by_id = {str(item["id"]): item for item in transactions}
            long_frame = pd.read_csv(SOURCE / "ETN_Brezovica_nepremicnine_long.csv", sep=";", dtype=str)
            require_columns(long_frame, ["id_posla", "tip_sestavine", "identifikator", "sifra_ko", "prodani_delez_decimal"], "ETN sestavine")
            matches_by_transaction: dict[str, list[dict[str, Any]]] = defaultdict(list)
            parcel_match_total = parcel_match_exact = building_part_match_total = building_part_match_exact = 0
            for _, row in long_frame.iterrows():
                transaction_id = key_text(row["id_posla"])
                component_type = text(row["tip_sestavine"])
                identifier = text(row["identifikator"]) or ""
                ko = key_text(row["sifra_ko"])
                share = number(row.get("prodani_delez_decimal"))
                candidates: list[str] = []
                entity_type = "unknown"
                if component_type == "ZEMLJISCE":
                    parcel_match_total += 1
                    entity_type = "parcel"
                    parsed = re.search(r"parcela\s+(.+)$", identifier, flags=re.IGNORECASE)
                    parcel_number = key_text(parsed.group(1)) if parsed else None
                    if ko and parcel_number:
                        candidates = parcel_match_index.get((ko, parcel_number), [])
                    if len(candidates) == 1:
                        parcel_match_exact += 1
                elif component_type == "DEL_STAVBE":
                    building_part_match_total += 1
                    entity_type = "buildingPart"
                    parsed = re.search(r"stavba\s+([^,]+),\s*del\s+(.+)$", identifier, flags=re.IGNORECASE)
                    if parsed and ko:
                        candidates = part_match_index.get((ko, key_text(parsed.group(1)) or "", key_text(parsed.group(2)) or ""), [])
                    if len(candidates) == 1:
                        building_part_match_exact += 1
                status = "exact" if len(candidates) == 1 else "ambiguous" if len(candidates) > 1 else "unmatched"
                reason = "Točno ujemanje katastrske občine in identifikatorja." if status == "exact" else (
                    "Več trenutnih katastrskih entitet ima isti ključ." if status == "ambiguous" else "V trenutnem katastru ni točnega ujemanja."
                )
                matches_by_transaction[transaction_id].append(
                    {
                        "componentType": entity_type,
                        "sourceIdentifier": identifier,
                        "eid": candidates[0] if len(candidates) == 1 else None,
                        "buildingEid": part_by_eid[candidates[0]]["eidBuilding"] if entity_type == "buildingPart" and len(candidates) == 1 else None,
                        "cadastralMunicipalityCode": ko,
                        "soldShare": share,
                        "matchStatus": status,
                        "matchReason": reason,
                    }
                )

            enriched_transactions: list[dict[str, Any]] = []
            valuation_coverage_counts = defaultdict(int)
            duplicate_component_warnings = 0
            valuation_review_transactions = 0
            for transaction_id, transaction in transaction_by_id.items():
                component_matches = matches_by_transaction.get(transaction_id, [])
                unique_entities: dict[tuple[str, str], dict[str, Any]] = {}
                unmatched_components: set[tuple[str, str]] = set()
                matched_components = 0
                current_value = 0.0
                review_reasons: set[str] = set()
                for match in component_matches:
                    eid = match["eid"]
                    if not eid:
                        unmatched_components.add((match["componentType"], match["sourceIdentifier"]))
                        continue
                    key = (match["componentType"], eid)
                    if key in unique_entities:
                        if unique_entities[key]["soldShare"] != match["soldShare"]:
                            duplicate_component_warnings += 1
                            review_reasons.add("Ista katastrska entiteta ima v poslu več različnih prodanih deležev.")
                        continue
                    unique_entities[key] = match
                    value = parcel_value_totals.get(eid) if match["componentType"] == "parcel" else part_value_totals.get(eid)
                    if value is not None and match["soldShare"] is not None:
                        matched_components += 1
                        current_value += value * match["soldShare"]
                    elif value is not None:
                        review_reasons.add("Za ovrednoteno sestavino manjka prodani delež.")
                total_components = len(unique_entities) + len(unmatched_components)
                coverage = valuation_coverage(matched_components, total_components)
                valuation_coverage_counts[coverage] += 1
                review_required = bool(review_reasons)
                if review_required:
                    valuation_review_transactions += 1
                current_value_output = round(current_value, 2) if matched_components and not review_required else None
                ratio = (
                    round(transaction["priceEur"] / current_value, 4)
                    if coverage == "complete" and current_value > 0 and not review_required
                    else None
                )
                enriched_transactions.append(
                    {
                        **transaction,
                        "parcelEids": sorted({eid for kind, eid in unique_entities if kind == "parcel"}),
                        "buildingPartEids": sorted({eid for kind, eid in unique_entities if kind == "buildingPart"}),
                        "buildingEids": sorted(
                            {
                                part_by_eid[eid]["eidBuilding"]
                                for kind, eid in unique_entities
                                if kind == "buildingPart" and eid in part_by_eid
                            }
                        ),
                        "currentPlannedUses": sorted(
                            {
                                parcel_by_eid[eid]["plannedUsePrimary"]["name"]
                                for kind, eid in unique_entities
                                if kind == "parcel" and eid in parcel_by_eid and parcel_by_eid[eid]["plannedUsePrimary"]
                            }
                        ),
                        "currentBuildingYears": sorted(
                            {
                                building_by_eid[part_by_eid[eid]["eidBuilding"]]["yearBuilt"]
                                for kind, eid in unique_entities
                                if kind == "buildingPart" and eid in part_by_eid and part_by_eid[eid]["eidBuilding"] in building_by_eid
                                and building_by_eid[part_by_eid[eid]["eidBuilding"]]["yearBuilt"] is not None
                            }
                        ),
                        "currentRenovationYears": sorted(
                            {
                                year
                                for kind, eid in unique_entities
                                if kind == "buildingPart" and eid in part_by_eid and part_by_eid[eid]["eidBuilding"] in building_by_eid
                                for year in (
                                    building_by_eid[part_by_eid[eid]["eidBuilding"]]["roofRenovationYear"],
                                    building_by_eid[part_by_eid[eid]["eidBuilding"]]["facadeRenovationYear"],
                                )
                                if year is not None
                            }
                        ),
                        "componentMatches": component_matches,
                        "valuationCoverage": coverage,
                        "matchedValuationComponentCount": matched_components,
                        "totalValuationComponentCount": total_components,
                        "valuationReviewRequired": review_required,
                        "valuationReviewReasons": sorted(review_reasons),
                        "transactionCurrentGeneralisedValueEur": current_value_output,
                        "priceToCurrentGeneralisedValueRatio": ratio,
                    }
                )

            marketability_labels = {"4": "Neopredeljen posel", "5": "V preverjanju"}
            duration_labels = {"1": "Določen čas", "2": "Nedoločen čas"}
            rental_type_labels = {"1": "Nova najemna pogodba", "2": "Sprememba ali podaljšanje najema"}
            rent_parts_by_transaction: dict[str, list[pd.Series]] = defaultdict(list)
            for _, row in rent_parts_frame.iterrows():
                rent_parts_by_transaction[key_text(row["ID_POSLA"]) or ""].append(row)
            rentals: list[dict[str, Any]] = []
            rental_features: list[dict[str, Any]] = []
            rental_part_match_exact = 0
            for _, rent in rent_frame.iterrows():
                transaction_id = key_text(rent["ID_POSLA"])
                if not transaction_id:
                    continue
                source_components = rent_parts_by_transaction.get(transaction_id, [])
                contract_rent = number(rent.get("POGODBENA_NAJEMNINA"))
                components: list[dict[str, Any]] = []
                for index, component in enumerate(source_components, start=1):
                    ko = key_text(component.get("SIFRA_KO"))
                    building_number = key_text(component.get("STEVILKA_STAVBE"))
                    part_number = key_text(component.get("STEVILKA_DELA_STAVBE"))
                    candidates = part_match_index.get((ko or "", building_number or "", part_number or ""), [])
                    status = "exact" if len(candidates) == 1 else "ambiguous" if len(candidates) > 1 else "unmatched"
                    if status == "exact":
                        rental_part_match_exact += 1
                    eid_part = candidates[0] if len(candidates) == 1 else None
                    eid_building = part_by_eid[eid_part]["eidBuilding"] if eid_part and eid_part in part_by_eid else None
                    area = number(component.get("POVRSINA_ODDANIH_PROSTOROV"))
                    individual_rent = number(component.get("POGODBENA_NAJEMNINA_POSAMEZNIH_ODDANIH_PROSTOROV"))
                    rent_per_m2 = calculate_rent_eur_m2(individual_rent, contract_rent, area, len(source_components))
                    lon, lat = transformed_point(component.get("E_CENTROID"), component.get("N_CENTROID"))
                    address_parts = [
                        text(component.get("ULICA")),
                        "".join(filter(None, [text(component.get("HISNA_STEVILKA")), text(component.get("DODATEK_HS"))])),
                        text(component.get("NASELJE")),
                    ]
                    address = " ".join(part for part in address_parts if part)
                    item = {
                        "id": f"{transaction_id}-{index}",
                        "transactionId": transaction_id,
                        "eidBuilding": eid_building,
                        "eidBuildingPart": eid_part,
                        "cadastralMunicipalityCode": ko,
                        "buildingNumber": building_number,
                        "buildingPartNumber": part_number,
                        "spaceTypeCode": key_text(component.get("VRSTA_ODDANIH_PROSTOROV")),
                        "furnished": boolean_code(component.get("OPREMLJENOST_ODDANIH_PROSTOROV")),
                        "microlocationCode": key_text(component.get("MIKROLOKACIJA_ODDANIH_PROSTOROV")),
                        "areaM2": area,
                        "usableAreaM2": number(component.get("UPORABNA_POVRSINA_ODDANIH_PROSTOROV")),
                        "individualRentEur": individual_rent,
                        "rentEurM2": round(rent_per_m2, 2) if rent_per_m2 is not None else None,
                        "address": address or None,
                        "longitude": lon,
                        "latitude": lat,
                        "matchStatus": status,
                    }
                    components.append(item)
                    if lon is not None and lat is not None:
                        rental_features.append(
                            {
                                "type": "Feature",
                                "id": item["id"],
                                "geometry": {"type": "Point", "coordinates": [lon, lat]},
                                "properties": {"transactionId": transaction_id, "address": item["address"], "contractRentEur": contract_rent},
                            }
                        )
                marketability_code = key_text(rent.get("TRZNOST_POSLA"))
                rentals.append(
                    {
                        "id": transaction_id,
                        "contractDate": text(rent.get("DATUM_SKLENITVE_POGODBE")),
                        "effectiveDate": text(rent.get("DATUM_UVELJAVITVE")),
                        "rentStartDate": text(rent.get("DATUM_ZACETKA_NAJEMA")),
                        "rentEndDate": text(rent.get("DATUM_PRENEHANJA_NAJEMA")),
                        "contractRentEur": contract_rent,
                        "rentalTypeCode": key_text(rent.get("VRSTA_NAJEMNEGA_POSLA")),
                        "rentalType": rental_type_labels.get(key_text(rent.get("VRSTA_NAJEMNEGA_POSLA")), "Druga vrsta najema"),
                        "marketabilityCode": marketability_code,
                        "marketability": marketability_labels.get(marketability_code, f"Status {marketability_code}"),
                        "durationType": duration_labels.get(key_text(rent.get("CAS_NAJEMA")), "Ni navedeno"),
                        "durationMonths": integer(rent.get("TRAJANJE_NAJEMA")),
                        "operatingCostsIncluded": boolean_code(rent.get("VKLJUCENOST_OBRATOVALNIH_STROSKOV_V_NAJEMNINO")),
                        "vatIncluded": boolean_code(rent.get("VKLJUCENOST_DDV")),
                        "vatRate": number(rent.get("STOPNJA_DDV")),
                        "componentCount": len(components),
                        "quality": "C",
                        "qualityReason": "Posel še nima dokončnega statusa tržnega najema.",
                        "components": components,
                    }
                )

    for obsolete_path in (CATALOG / "parcels.json", CATALOG / "buildings.json", CATALOG / "spaces.json"):
        obsolete_path.unlink(missing_ok=True)
    compact_json(
        CATALOG / "parcels-index.json",
        [
            {
                "eidParcel": item["eidParcel"],
                "cadastralMunicipalityCode": item["cadastralMunicipalityCode"],
                "parcelNumber": item["parcelNumber"],
                "areaM2": item["areaM2"],
                "plannedUsePrimary": item["plannedUsePrimary"]["name"] if item["plannedUsePrimary"] else None,
                "generalisedValueTotalEur": item["generalisedValueTotalEur"],
            }
            for item in parcels
        ],
    )
    compact_json(
        CATALOG / "buildings-index.json",
        [
            {
                "eidBuilding": item["eidBuilding"],
                "cadastralMunicipalityCode": item["cadastralMunicipalityCode"],
                "buildingNumber": item["buildingNumber"],
                "buildingType": item["buildingType"],
                "yearBuilt": item["yearBuilt"],
                "partCount": len(item["buildingPartEids"]),
            }
            for item in buildings
        ],
    )
    parcels_by_ko: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in parcels:
        parcels_by_ko[item["cadastralMunicipalityCode"]].append(item)
    for ko, items in parcels_by_ko.items():
        compact_json(PARCEL_CATALOG / f"{ko}.json", items)
    buildings_by_ko: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for item in buildings:
        buildings_by_ko[item["cadastralMunicipalityCode"]].append(item)
    for ko, items in buildings_by_ko.items():
        compact_json(BUILDING_CATALOG / f"{ko}.json", items)
    compact_json(CATALOG / "building-parts.json", building_parts)
    compact_json(CATALOG / "valuation-models.json", [{"id": key, "name": value} for key, value in sorted(model_names.items())])
    compact_json(PUBLIC / "transactions-enriched.json", enriched_transactions)
    compact_json(PUBLIC / "rentals.json", rentals)
    compact_json(MAP / "rentals.geojson", {"type": "FeatureCollection", "features": rental_features})

    meta_path = PUBLIC / "meta.json"
    meta = json.loads(meta_path.read_text(encoding="utf-8"))
    meta["gursDataAsOf"] = {
        "parcels": archive_date(parcel_zip),
        "buildings": archive_date(building_zip),
        "valuation": archive_date(valuation_zip),
        "rentals": archive_date(rental_zip),
    }
    meta["gursSourceFiles"] = [path.name for path in input_files]
    meta["gursWms"] = {
        "endpoint": "https://ipi.eprostor.gov.si/gwc-si-gurs-dts/service/wms",
        "layer": "SI.GURS.ZPDZ:DOF050",
        "advertisedCrs": ["EPSG:3794"],
        "checkedAt": datetime.now().astimezone().isoformat(timespec="seconds"),
        "webMercatorAvailable": False,
    }
    compact_json(meta_path, meta)

    output_paths = [
        CATALOG / "parcels-index.json", CATALOG / "buildings-index.json", CATALOG / "building-parts.json",
        CATALOG / "valuation-models.json", PUBLIC / "transactions-enriched.json", PUBLIC / "rentals.json",
        MAP / "rentals.geojson", MAP / "parcels" / "manifest.json", MAP / "buildings" / "manifest.json",
        *sorted(PARCEL_CATALOG.glob("*.json")), *sorted(BUILDING_CATALOG.glob("*.json")),
        *sorted((MAP / "parcels").glob("*.geojson")), *sorted((MAP / "buildings").glob("*.geojson")), meta_path,
    ]
    forbidden_hits: list[dict[str, str]] = []
    for path in output_paths:
        content_upper = path.read_text(encoding="utf-8").upper()
        for forbidden in FORBIDDEN_PUBLIC_FIELDS:
            if forbidden in content_upper:
                forbidden_hits.append({"file": str(path.relative_to(ROOT)), "field": forbidden})
    if forbidden_hits:
        raise RuntimeError(f"Javni izhod vsebuje prepovedana osebna polja: {forbidden_hits}")

    report = {
        "dataAsOf": meta["gursDataAsOf"],
        "inputFiles": [path.name for path in input_files],
        "rowCounts": {
            "parcels": len(parcels), "buildings": len(buildings), "buildingParts": len(building_parts), "spaces": len(spaces),
            "saleTransactions": len(enriched_transactions), "rentTransactions": len(rentals), "rentComponents": sum(len(item["components"]) for item in rentals),
        },
        "duplicateKeyCounts": {
            "parcels": len(parcels) - len(parcel_by_eid), "buildings": len(buildings) - len(building_by_eid),
            "buildingParts": len(building_parts) - len(part_by_eid), "conflictingTransactionShares": duplicate_component_warnings,
        },
        "invalidGeometryCounts": {"repairedParcels": invalid_geometries},
        "missingRequiredFieldCounts": dict(missing_required),
        "matchRates": {
            "saleParcels": {"exact": parcel_match_exact, "total": parcel_match_total, "percent": round(parcel_match_exact / parcel_match_total * 100, 1)},
            "saleBuildingParts": {"exact": building_part_match_exact, "total": building_part_match_total, "percent": round(building_part_match_exact / building_part_match_total * 100, 1)},
            "rentBuildingParts": {"exact": rental_part_match_exact, "total": sum(len(item["components"]) for item in rentals), "percent": round(rental_part_match_exact / max(1, sum(len(item["components"]) for item in rentals)) * 100, 1)},
        },
        "ambiguousMatchCounts": {
            "saleComponents": sum(match["matchStatus"] == "ambiguous" for matches in matches_by_transaction.values() for match in matches),
            "rentComponents": sum(component["matchStatus"] == "ambiguous" for item in rentals for component in item["components"]),
        },
        "valuationCoverage": dict(valuation_coverage_counts),
        "valuationReviewRequiredTransactions": valuation_review_transactions,
        "coordinateBounds": {"sourceCrs": "EPSG:3794", "webCrs": "EPSG:4326", "municipalityApproximation": [14.25, 45.85, 14.62, 46.12]},
        "parcelUseShareChecks": {"plannedOutliers": planned_share_outliers, "actualOutliers": actual_share_outliers},
        "geometrySimplification": {
            "toleranceMetres": 0.15,
            "maximumAllowedAreaDifferencePercent": 0.5,
            "fallbackToOriginalGeometryCount": simplification_fallbacks,
            "maximumAreaDifferencePercent": round(max(geometry_area_differences, default=0), 5),
            "meanAreaDifferencePercent": round(sum(geometry_area_differences) / max(1, len(geometry_area_differences)), 5),
        },
        "forbiddenPersonalFieldScan": {"status": "passed", "fieldsChecked": len(FORBIDDEN_PUBLIC_FIELDS), "filesChecked": len(output_paths)},
        "outputFileSizes": {str(path.relative_to(PUBLIC)).replace("\\", "/"): path.stat().st_size for path in output_paths},
        "warnings": [
            "Najemni posli 2026 še niso dokončna uradna statistika tržnih najemnin.",
            "Trenutne posplošene vrednosti niso nujno vrednosti na datum starejše prodaje.",
            "GURS WMS je 29. 7. 2026 za sloj DOF050 oglaševal samo EPSG:3794; neposreden Web Mercator raster ni omogočen.",
            f"Iz obdelave je po pravilih izključenih več kategorij občutljivih tabel ({len(FORBIDDEN_TABLE_FRAGMENTS)} vzorcev).",
            *warnings,
        ],
    }
    compact_json(QUALITY / "data-quality-report.json", report)
    print(
        f"GURS ETL complete: {len(parcels)} parcels, {len(buildings)} buildings, "
        f"{len(building_parts)} parts, {len(rentals)} rentals."
    )


if __name__ == "__main__":
    (ROOT / "data" / "processed" / "tmp").mkdir(parents=True, exist_ok=True)
    main()
