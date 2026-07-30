#!/usr/bin/env python3
"""Small, credential-safe smoke check for the imported Neon database."""

from __future__ import annotations

import os

import psycopg

from import_neon import load_local_env


def main() -> None:
    load_local_env()
    connection = os.environ.get("DATABASE_URL_UNPOOLED")
    if not connection:
        raise RuntimeError("Manjka DATABASE_URL_UNPOOLED.")
    with psycopg.connect(connection) as conn:
        size = conn.execute(
            "SELECT pg_size_pretty(pg_database_size(current_database())), pg_database_size(current_database())"
        ).fetchone()
        address = conn.execute(
            "SELECT label FROM addresses WHERE municipality_code = '061' "
            "AND search_text ILIKE '%slovenska cesta 1%' LIMIT 3"
        ).fetchall()
        parcel = conn.execute(
            "SELECT cadastral_municipality_code, parcel_number FROM parcels "
            "WHERE municipality_code = '061' AND parcel_number ILIKE '%45/2%' LIMIT 3"
        ).fetchall()
        largest = conn.execute(
            "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) "
            "FROM pg_catalog.pg_statio_user_tables "
            "ORDER BY pg_total_relation_size(relid) DESC LIMIT 8"
        ).fetchall()
    print("Velikost:", size)
    print("Naslovni zadetki:", address)
    print("Parcelni zadetki:", parcel)
    print("Največje relacije:", largest)


if __name__ == "__main__":
    main()
