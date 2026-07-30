import { NextRequest, NextResponse } from "next/server";
import { databaseConfigured, requireDatabase } from "@/lib/db";
import { normalizeMunicipality } from "@/lib/property-repository";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!databaseConfigured) return NextResponse.json({ type: "FeatureCollection", features: [] });
  const municipality = normalizeMunicipality(request.nextUrl.searchParams.get("municipality"));
  const kind = request.nextUrl.searchParams.get("kind") === "rentals" ? "rentals" : "sales";
  const sql = requireDatabase();
  try {
    const rows = kind === "sales"
      ? await sql`
          SELECT source_key AS id, contract_date, price_eur AS amount, marketability,
            ST_X(ST_Transform(ST_SetSRID(ST_MakePoint(e, n), 3794), 4326)) AS longitude,
            ST_Y(ST_Transform(ST_SetSRID(ST_MakePoint(e, n), 3794), 4326)) AS latitude
          FROM sales
          WHERE municipality_code = ${municipality} AND NOT is_pending AND e IS NOT NULL AND n IS NOT NULL
          ORDER BY contract_date DESC NULLS LAST LIMIT 5000
        `
      : await sql`
          SELECT r.source_key AS id, r.contract_date, COALESCE(rc.individual_rent_eur, r.rent_eur) AS amount,
            r.marketability, ST_X(ST_Transform(ST_SetSRID(ST_MakePoint(rc.e, rc.n), 3794), 4326)) AS longitude,
            ST_Y(ST_Transform(ST_SetSRID(ST_MakePoint(rc.e, rc.n), 3794), 4326)) AS latitude
          FROM rental_components rc JOIN rentals r ON r.source_key = rc.rental_key
          WHERE r.municipality_code = ${municipality} AND NOT r.is_pending AND rc.e IS NOT NULL AND rc.n IS NOT NULL
          ORDER BY r.contract_date DESC NULLS LAST LIMIT 5000
        `;
    return NextResponse.json({
      type: "FeatureCollection",
      features: rows.map((row) => ({
        type: "Feature",
        id: row.id,
        geometry: { type: "Point", coordinates: [Number(row.longitude), Number(row.latitude)] },
        properties: { id: row.id, date: row.contract_date, amount: row.amount, marketability: row.marketability, kind },
      })),
    });
  } catch (error) {
    console.error("Map query failed", error);
    return NextResponse.json({ error: "Zemljevid trenutno ni dosegljiv.", type: "FeatureCollection", features: [] }, { status: 503 });
  }
}
