#!/usr/bin/env python3
"""Import the privacy-safe Phase 1 GURS subset into PostgreSQL/PostGIS."""

from __future__ import annotations

from collections import defaultdict
from datetime import datetime
from io import TextIOWrapper
import json
import os
from pathlib import Path
import re
from typing import Any, Iterable
from zipfile import ZipFile

import pandas as pd
import psycopg


ROOT = Path(__file__).resolve().parents[1]
INPUT = ROOT / "Vhodni podatki"
MIGRATION = ROOT / "db" / "migrations" / "001_initial.sql"
MUNICIPALITIES = {"008": "Brezovica", "061": "Ljubljana"}
FORBIDDEN = (
    "oseba", "imetnik", "lastnik", "pravice_lastnistva", "upravljav", "upravnik",
)


def load_local_env() -> None:
    paths = (ROOT / ".env.import.local", ROOT / ".env.local")
    for path in paths:
        if not path.exists():
            continue
        load_env_file(path)


def load_env_file(path: Path) -> None:
    for raw_line in path.read_text(encoding="utf-8-sig").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        if key in os.environ and os.environ[key] != "[SENSITIVE]":
            continue
        value = value.strip()
        if value.startswith('"'):
            try:
                value = json.loads(value)
            except json.JSONDecodeError:
                value = value.strip('"')
        if value != "[SENSITIVE]":
            os.environ[key] = value


def latest(pattern: str) -> Path:
    matches = list(INPUT.glob(pattern))
    if not matches:
        raise FileNotFoundError(f"Manjka vhodni arhiv: {pattern}")
    return sorted(matches)[-1]


def archive_date(path: Path):
    match = re.findall(r"20\d{6}", path.name)
    return datetime.strptime(match[-1], "%Y%m%d").date() if match else None


def allowed_member(archive: ZipFile, pattern: str) -> str:
    matches = [name for name in archive.namelist() if re.fullmatch(pattern, name, re.I)]
    if len(matches) != 1:
        raise ValueError(f"Pričakovana je ena dovoljena tabela {pattern}, najdenih {len(matches)}")
    lowered = matches[0].lower()
    if any(term in lowered for term in FORBIDDEN):
        raise ValueError(f"Dostop do prepovedane tabele: {matches[0]}")
    return matches[0]


def read_csv(archive: ZipFile, pattern: str, **kwargs: Any) -> pd.DataFrame:
    member = allowed_member(archive, pattern)
    with archive.open(member) as stream:
        return pd.read_csv(TextIOWrapper(stream, encoding="utf-8-sig"), dtype=str, **kwargs)


def value(raw: Any) -> str | None:
    if raw is None or pd.isna(raw):
        return None
    result = str(raw).strip()
    return result if result and result.lower() != "nan" else None


def number(raw: Any) -> float | None:
    text = value(raw)
    if text is None:
        return None
    try:
        return float(text.replace(",", "."))
    except ValueError:
        return None


def integer(raw: Any) -> int | None:
    parsed = number(raw)
    return int(parsed) if parsed is not None and parsed.is_integer() else None


def boolean(raw: Any) -> bool | None:
    text = (value(raw) or "").lower()
    if text in {"1", "da", "true"}:
        return True
    if text in {"0", "ne", "false"}:
        return False
    return None


def parsed_date(raw: Any):
    text = value(raw)
    if not text:
        return None
    parsed = pd.to_datetime(text, errors="coerce", dayfirst=True)
    return None if pd.isna(parsed) else parsed.date()


def address_text(row: pd.Series) -> str | None:
    street = value(row.get("ULICA"))
    house = "".join(filter(None, [value(row.get("HISNA_STEVILKA")), value(row.get("DODATEK_HS"))]))
    settlement = value(row.get("NASELJE"))
    return " ".join(filter(None, [street, house])) or settlement


def codebook(archive: ZipFile, name: str) -> dict[str, str]:
    frame = read_csv(archive, r".*sifranti_\d{8}\.csv")
    selected = frame[frame["SIFRANT"] == name]
    return {
        value(row["NUMERICNA_VREDNOST"]) or "": value(row["OPIS"]) or ""
        for _, row in selected.iterrows()
    }


def kn_codebook(archive: ZipFile, filename: str) -> dict[str, str]:
    frame = read_csv(archive, rf"sifranti/{filename}\.CSV")
    return {value(row["id"]) or "": value(row["nazivSl"]) or "" for _, row in frame.iterrows()}


def copy_rows(conn: psycopg.Connection, table: str, columns: Iterable[str], rows: Iterable[tuple[Any, ...]]) -> int:
    columns = tuple(columns)
    count = 0
    with conn.cursor() as cursor:
        with cursor.copy(f"COPY {table} ({', '.join(columns)}) FROM STDIN") as copy:
            for row in rows:
                copy.write_row(row)
                count += 1
    return count


def reset_database(conn: psycopg.Connection) -> None:
    conn.execute(MIGRATION.read_text(encoding="utf-8"))
    conn.execute(
        "TRUNCATE rental_components, rentals, sale_components, sales, building_parts, "
        "buildings, parcels, spatial_units, addresses, municipalities RESTART IDENTITY CASCADE"
    )
    copy_rows(
        conn,
        "municipalities",
        ("code", "name", "source_updated_on"),
        ((code, name, datetime(2026, 7, 26).date()) for code, name in MUNICIPALITIES.items()),
    )
    conn.commit()


def import_addresses(conn: psycopg.Connection) -> None:
    units: set[tuple[str, str, str]] = set()

    def rows():
        for municipality in MUNICIPALITIES:
            path = latest(f"RN_{municipality}_NASLOVI_*.zip")
            with ZipFile(path) as archive:
                frame = read_csv(archive, rf"RN_{municipality}_NASLOVI_register_naslovov_ob_\d{{8}}\.csv")
            frame["_house_key"] = frame["EID_HISNA_STEVILKA"].fillna(frame["EID_NASLOV"])
            frame["_is_house"] = frame["ST_STANOVANJA"].isna()
            frame = frame.sort_values("_is_house", ascending=False).drop_duplicates("_house_key", keep="first")
            for _, row in frame.iterrows():
                eid = value(row.get("EID_NASLOV"))
                settlement = value(row.get("NASELJE_NAZIV"))
                house = value(row.get("HS_STEVILKA"))
                if not eid or not settlement or not house:
                    continue
                street = value(row.get("ULICA_NAZIV"))
                suffix = value(row.get("HS_DODATEK"))
                apartment = None
                postal_code = value(row.get("POSTNI_OKOLIS_SIFRA"))
                postal_name = value(row.get("POSTNI_OKOLIS_NAZIV"))
                label = f"{street + ' ' if street else ''}{house}{suffix or ''}, {settlement}"
                for unit_type, column in (
                    ("naselje", "NASELJE_NAZIV"),
                    ("četrtna skupnost", "CETRTNA_SKUPNOST_NAZIV"),
                    ("krajevna skupnost", "KRAJEVNA_SKUPNOST_NAZIV"),
                    ("šolski okoliš", "SOLSKI_OKOLIS_NAZIV"),
                    ("poštni okoliš", "POSTNI_OKOLIS_NAZIV"),
                    ("statistična regija", "STATISTICNA_REGIJA_NAZIV"),
                ):
                    unit_name = value(row.get(column))
                    if unit_name:
                        units.add((municipality, unit_type, unit_name))
                yield (
                    eid, value(row.get("EID_HISNA_STEVILKA")), municipality, settlement, street,
                    house, suffix, apartment, postal_code, postal_name, value(row.get("EID_STAVBA")),
                    value(row.get("CETRTNA_SKUPNOST_NAZIV")), value(row.get("KRAJEVNA_SKUPNOST_NAZIV")),
                    value(row.get("SOLSKI_OKOLIS_NAZIV")), value(row.get("STATISTICNA_REGIJA_NAZIV")),
                    number(row.get("E")), number(row.get("N")), label, label.lower(),
                )

    count = copy_rows(
        conn, "addresses",
        ("eid", "house_number_eid", "municipality_code", "settlement", "street", "house_number",
         "house_suffix", "apartment_number", "postal_code", "postal_name", "building_eid", "quarter",
         "local_community", "school_district", "statistical_region", "e", "n", "label", "search_text"),
        rows(),
    )
    copy_rows(conn, "spatial_units", ("municipality_code", "unit_type", "name"), sorted(units))
    conn.commit()
    print(f"Naslovi: {count:,}; prostorske enote: {len(units):,}")


def import_cadastre(conn: psycopg.Connection) -> None:
    building_eids: set[str] = set()
    for municipality in MUNICIPALITIES:
        valuation_path = latest(f"{municipality == '061' and 'Ljubljana' or 'Brezovica'}/EV_{municipality}_EVIDENCA_VREDNOTENJA_*.zip")
        parcel_path = latest(f"{municipality == '061' and 'Ljubljana' or 'Brezovica'}/KN_{municipality}_PARCELE_*.zip")
        building_path = latest(f"{municipality == '061' and 'Ljubljana' or 'Brezovica'}/KN_{municipality}_STAVBE_*.zip")
        updated = archive_date(valuation_path)
        with ZipFile(valuation_path) as valuation, ZipFile(parcel_path) as parcel_archive, ZipFile(building_path) as building_archive:
            parcel_frame = read_csv(valuation, rf"EV_{municipality}_EVIDENCA_VREDNOTENJA_parcela_\d{{8}}\.csv")
            parcel_values = read_csv(valuation, rf"EV_{municipality}_EVIDENCA_VREDNOTENJA_parc_enota_\d{{8}}\.csv")
            building_frame = read_csv(valuation, rf"EV_{municipality}_EVIDENCA_VREDNOTENJA_stavba_\d{{8}}\.csv")
            part_frame = read_csv(building_archive, rf"KN_{municipality}_STAVBE_deli_stavb_\d{{8}}\.csv")
            part_values = read_csv(valuation, rf"EV_{municipality}_EVIDENCA_VREDNOTENJA_del_stavbe_enota_\d{{8}}\.csv")
            planned_frame = read_csv(parcel_archive, rf"KN_{municipality}_PARCELE_parcele_x_namenske_rabe_\d{{8}}\.csv")
            planned_codes = kn_codebook(parcel_archive, "VRSTE_NAMENSKE_RABE")
            part_codes = kn_codebook(building_archive, "VRSTE_DEJANSKIH_RAB_DEL_ST")

        parcel_value = parcel_values.groupby("EID_PARCELA")["POSPLOSENA_VREDNOST"].apply(
            lambda series: sum(filter(lambda item: item is not None, (number(item) for item in series)))
        ).to_dict()
        planned_frame["_share"] = planned_frame["DELEZ"].map(number).fillna(0)
        planned_primary = planned_frame.sort_values("_share").drop_duplicates("EID_PARCELA", keep="last")
        planned = {
            value(row["EID_PARCELA"]): planned_codes.get(value(row["VRSTA_NAMENSKE_RABE_ID"]) or "")
            for _, row in planned_primary.iterrows()
        }
        parcel_count = copy_rows(
            conn, "parcels",
            ("eid", "municipality_code", "cadastral_municipality_code", "parcel_number", "area_m2",
             "planned_use", "generalised_value_eur", "e", "n", "source_updated_on"),
            ((value(row["EID_PARCELA"]), municipality, value(row["KO_SIFKO"]), value(row["PARCELA"]),
              number(row.get("POVRSINA")), planned.get(value(row["EID_PARCELA"])),
              parcel_value.get(value(row["EID_PARCELA"])), number(row.get("E")), number(row.get("N")), updated)
             for _, row in parcel_frame.iterrows() if value(row.get("EID_PARCELA")) and value(row.get("PARCELA"))),
        )
        building_rows = []
        for _, row in building_frame.iterrows():
            eid = value(row.get("EID_STAVBA"))
            if not eid:
                continue
            building_eids.add(eid)
            building_rows.append((
                eid, municipality, value(row.get("KO_SIFKO")), value(row.get("STEV_ST")),
                integer(row.get("LETO_IZG_STA")), integer(row.get("ST_ETAZ")), number(row.get("POV_STAVBE")),
                integer(row.get("ST_STANOVANJ")), integer(row.get("ST_POSLOVNIH_PROSTOROV")),
                integer(row.get("LETO_OBN_STREHE")), integer(row.get("LETO_OBN_FASADE")),
                number(row.get("E")), number(row.get("N")), updated,
            ))
        building_count = copy_rows(
            conn, "buildings",
            ("eid", "municipality_code", "cadastral_municipality_code", "building_number", "year_built",
             "floor_count", "area_m2", "apartment_count", "business_space_count", "roof_renovation_year",
             "facade_renovation_year", "e", "n", "source_updated_on"),
            building_rows,
        )
        part_value = part_values.groupby("EID_DEL_STAVBE")["POSPLOSENA_VREDNOST"].apply(
            lambda series: sum(filter(lambda item: item is not None, (number(item) for item in series)))
        ).to_dict()
        part_count = copy_rows(
            conn, "building_parts",
            ("eid", "building_eid", "municipality_code", "part_number", "apartment_number", "actual_use",
             "area_m2", "usable_area_m2", "generalised_value_eur", "house_number_eid",
             "window_renovation_year", "installation_renovation_year", "has_elevator", "source_updated_on"),
            ((value(row["EID_DEL_STAVBE"]), value(row["EID_STAVBA"]), municipality,
              value(row["ST_DELA_STAVBE"]), value(row.get("ST_STANOVANJA")),
              part_codes.get(value(row.get("VRSTA_DEJANSKE_RABE_DEL_ST_ID")) or ""), number(row.get("POVRSINA")),
              number(row.get("UPORABNA_POVRSINA")), part_value.get(value(row["EID_DEL_STAVBE"])),
              value(row.get("EID_HISNA_STEVILKA")), integer(row.get("LETO_OBNOVE_OKEN")),
              integer(row.get("LETO_OBNOVE_INSTALACIJ")), boolean(row.get("DVIGALO")), updated)
             for _, row in part_frame.iterrows()
             if value(row.get("EID_DEL_STAVBE")) and value(row.get("EID_STAVBA")) in building_eids and value(row.get("ST_DELA_STAVBE"))),
        )
        conn.commit()
        print(f"{MUNICIPALITIES[municipality]} kataster: {parcel_count:,} parcel, {building_count:,} stavb, {part_count:,} delov")


def import_sales(conn: psycopg.Connection) -> None:
    total_sales = total_components = 0
    for municipality, folder in (("008", "Brezovica"), ("061", "Ljubljana")):
        for path in sorted((INPUT / folder).glob(f"ETN_{municipality}_*_KPP_*.zip")):
            match = re.search(rf"ETN_{municipality}_(\d{{4}})_KPP", path.name)
            if not match:
                continue
            year = int(match.group(1))
            with ZipFile(path) as archive:
                deals = read_csv(archive, rf"ETN_{municipality}_{year}_KPP_{year}_POSLI_\d{{8}}\.csv")
                parts = read_csv(archive, rf"ETN_{municipality}_{year}_KPP_{year}_DELISTAVB_\d{{8}}\.csv")
                lands = read_csv(archive, rf"ETN_{municipality}_{year}_KPP_{year}_ZEMLJISCA_\d{{8}}\.csv")
                sale_types = codebook(archive, "Vrsta kupoprodajnega posla")
                market_types = codebook(archive, "Tržnost posla")
                part_types = codebook(archive, "Vrsta dela stavbe")
                land_types = codebook(archive, "Vrsta zemljišča")
            counts = pd.concat([parts[["ID_POSLA"]], lands[["ID_POSLA"]]]).value_counts("ID_POSLA").to_dict()
            centers: dict[str, tuple[float | None, float | None]] = {}
            for frame in (parts, lands):
                for _, row in frame.iterrows():
                    transaction_id = value(row.get("ID_POSLA"))
                    if transaction_id and transaction_id not in centers:
                        centers[transaction_id] = (number(row.get("E_CENTROID")), number(row.get("N_CENTROID")))
            sales_rows = []
            for _, row in deals.iterrows():
                transaction_id = value(row.get("ID_POSLA"))
                if not transaction_id:
                    continue
                source_key = f"{municipality}-{year}-{transaction_id}"
                market_code = value(row.get("TRZNOST_POSLA"))
                e, n = centers.get(transaction_id, (None, None))
                sales_rows.append((source_key, transaction_id, municipality, parsed_date(row.get("DATUM_SKLENITVE_POGODBE")),
                    year, number(row.get("POGODBENA_CENA_ODSKODNINA")),
                    sale_types.get(value(row.get("VRSTA_KUPOPRODAJNEGA_POSLA")) or ""), market_code,
                    market_types.get(market_code or ""), market_code == "5", counts.get(transaction_id, 0), e, n, archive_date(path)))
            total_sales += copy_rows(conn, "sales", ("source_key", "transaction_id", "municipality_code", "contract_date",
                "contract_year", "price_eur", "sale_type", "marketability_code", "marketability", "is_pending",
                "component_count", "e", "n", "source_updated_on"), sales_rows)

            def component_rows():
                for _, row in lands.iterrows():
                    transaction_id = value(row.get("ID_POSLA"))
                    if transaction_id:
                        yield (f"{municipality}-{year}-{transaction_id}", "parcel", value(row.get("SIFRA_KO")),
                            value(row.get("PARCELNA_STEVILKA")), None, None, None, None,
                            land_types.get(value(row.get("VRSTA_ZEMLJISCA")) or ""), number(row.get("POVRSINA_PARCELE")),
                            None, number(row.get("PRODANI_DELEZ_PARCELE")), number(row.get("POGODBENA_CENA_PARCELE")),
                            number(row.get("E_CENTROID")), number(row.get("N_CENTROID")))
                for _, row in parts.iterrows():
                    transaction_id = value(row.get("ID_POSLA"))
                    if transaction_id:
                        yield (f"{municipality}-{year}-{transaction_id}", "building_part", value(row.get("SIFRA_KO")),
                            None, value(row.get("STEVILKA_STAVBE")), value(row.get("STEVILKA_DELA_STAVBE")),
                            value(row.get("NASELJE")), address_text(row), part_types.get(value(row.get("VRSTA_DELA_STAVBE")) or ""),
                            number(row.get("PRODANA_POVRSINA_DELA_STAVBE")) or number(row.get("PRODANA_POVRSINA")),
                            number(row.get("PRODANA_UPORABNA_POVRSINA_DELA_STAVBE")), number(row.get("PRODANI_DELEZ_DELA_STAVBE")),
                            number(row.get("POGODBENA_CENA_DELA_STAVBE")), number(row.get("E_CENTROID")), number(row.get("N_CENTROID")))
            total_components += copy_rows(conn, "sale_components", ("sale_key", "component_type", "cadastral_municipality_code",
                "parcel_number", "building_number", "building_part_number", "settlement", "address", "property_type",
                "sold_area_m2", "usable_area_m2", "sold_share", "price_eur", "e", "n"), component_rows())
            conn.commit()
            print(f"Prodaje {municipality}/{year}: {len(sales_rows):,}")
    print(f"Prodaje skupaj: {total_sales:,}; sestavine: {total_components:,}")


def import_rentals(conn: psycopg.Connection) -> None:
    total_rentals = total_components = 0
    for municipality, folder in (("008", "Brezovica"), ("061", "Ljubljana")):
        for path in sorted((INPUT / folder).glob(f"ETN_{municipality}_*_NP_*.zip")):
            match = re.search(rf"ETN_{municipality}_(\d{{4}})_NP", path.name)
            if not match:
                continue
            year = int(match.group(1))
            with ZipFile(path) as archive:
                deals = read_csv(archive, rf"ETN_{municipality}_{year}_NP_{year}_POSLI_\d{{8}}\.csv")
                parts = read_csv(archive, rf"ETN_{municipality}_{year}_NP_{year}_DELISTAVB_\d{{8}}\.csv")
                rental_types = codebook(archive, "Vrsta najemnega posla")
                market_types = codebook(archive, "Tržnost posla")
                part_types = codebook(archive, "Vrsta oddanih prostorov")
            counts = parts.value_counts("ID_POSLA").to_dict()
            rental_rows = []
            for _, row in deals.iterrows():
                transaction_id = value(row.get("ID_POSLA"))
                if not transaction_id:
                    continue
                market_code = value(row.get("TRZNOST_POSLA"))
                rental_rows.append((f"{municipality}-{year}-{transaction_id}", transaction_id, municipality,
                    parsed_date(row.get("DATUM_SKLENITVE_POGODBE")), year, number(row.get("POGODBENA_NAJEMNINA")),
                    rental_types.get(value(row.get("VRSTA_NAJEMNEGA_POSLA")) or ""), market_code,
                    market_types.get(market_code or ""), market_code == "5", number(row.get("TRAJANJE_NAJEMA")),
                    counts.get(transaction_id, 0), archive_date(path)))
            total_rentals += copy_rows(conn, "rentals", ("source_key", "transaction_id", "municipality_code", "contract_date",
                "contract_year", "rent_eur", "rental_type", "marketability_code", "marketability", "is_pending",
                "duration_months", "component_count", "source_updated_on"), rental_rows)

            def component_rows():
                for _, row in parts.iterrows():
                    transaction_id = value(row.get("ID_POSLA"))
                    if not transaction_id:
                        continue
                    area = number(row.get("POVRSINA_ODDANIH_PROSTOROV"))
                    rent = number(row.get("POGODBENA_NAJEMNINA_POSAMEZNIH_ODDANIH_PROSTOROV"))
                    yield (f"{municipality}-{year}-{transaction_id}", value(row.get("SIFRA_KO")),
                        value(row.get("STEVILKA_STAVBE")), value(row.get("STEVILKA_DELA_STAVBE")),
                        value(row.get("NASELJE")), address_text(row), part_types.get(value(row.get("VRSTA_ODDANIH_PROSTOROV")) or ""),
                        area, number(row.get("UPORABNA_POVRSINA_ODDANIH_PROSTOROV")), rent,
                        rent / area if rent is not None and area else None, number(row.get("E_CENTROID")), number(row.get("N_CENTROID")))
            total_components += copy_rows(conn, "rental_components", ("rental_key", "cadastral_municipality_code", "building_number",
                "building_part_number", "settlement", "address", "property_type", "area_m2", "usable_area_m2",
                "individual_rent_eur", "rent_eur_m2", "e", "n"), component_rows())
            conn.commit()
            print(f"Najemi {municipality}/{year}: {len(rental_rows):,}")
    print(f"Najemi skupaj: {total_rentals:,}; sestavine: {total_components:,}")


def main() -> None:
    load_local_env()
    connection = os.environ.get("DATABASE_URL_UNPOOLED") or os.environ.get("POSTGRES_URL_NON_POOLING") or os.environ.get("DATABASE_URL")
    if not connection or connection == "[SENSITIVE]":
        raise RuntimeError("Manjka DATABASE_URL_UNPOOLED ali DATABASE_URL.")
    print("Povezujem se z Neonom (poverilnice ostanejo skrite).")
    with psycopg.connect(connection, autocommit=False) as conn:
        reset_database(conn)
        import_addresses(conn)
        import_cadastre(conn)
        import_sales(conn)
        import_rentals(conn)
        conn.execute("ANALYZE")
        coverage = conn.execute("SELECT * FROM data_coverage ORDER BY code").fetchall()
        conn.commit()
    print("Pokritost:")
    for row in coverage:
        print(row)


if __name__ == "__main__":
    main()
