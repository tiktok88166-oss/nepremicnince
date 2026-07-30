import { databaseConfigured, requireDatabase } from "@/lib/db";

export type MunicipalityCode = "008" | "061";
export type PropertyType = "address" | "parcel" | "building" | "building-part";

export const municipalities = [
  { code: "061" as const, name: "Ljubljana" },
  { code: "008" as const, name: "Brezovica" },
];

export function normalizeMunicipality(value: string | null | undefined): MunicipalityCode {
  return value === "008" ? "008" : "061";
}

export async function getOverview(municipality: MunicipalityCode) {
  if (!databaseConfigured) return null;
  const sql = requireDatabase();
  const [coverage] = await sql`
    SELECT code, name, addresses, parcels, buildings, building_parts, sales, rentals
    FROM data_coverage WHERE code = ${municipality}
  `;
  const yearly = await sql`
    SELECT contract_year AS year,
      count(*) FILTER (WHERE NOT is_pending) :: int AS sales,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY price_eur)
        FILTER (WHERE NOT is_pending AND price_eur > 0) AS median_price
    FROM sales
    WHERE municipality_code = ${municipality}
    GROUP BY contract_year ORDER BY contract_year
  `;
  const categories = await sql`
    SELECT COALESCE(sc.property_type, 'Ni podatka') AS name, count(DISTINCT s.source_key) :: int AS value
    FROM sales s JOIN sale_components sc ON sc.sale_key = s.source_key
    WHERE s.municipality_code = ${municipality} AND NOT s.is_pending
    GROUP BY sc.property_type ORDER BY value DESC LIMIT 8
  `;
  const [market] = await sql`
    SELECT count(*) FILTER (WHERE NOT is_pending) :: int AS confirmed_sales,
      count(*) FILTER (WHERE is_pending) :: int AS pending_sales,
      percentile_cont(0.5) WITHIN GROUP (ORDER BY price_eur)
        FILTER (WHERE NOT is_pending AND price_eur > 0) AS median_price
    FROM sales WHERE municipality_code = ${municipality}
  `;
  return { coverage, yearly, categories, market };
}

export async function getCoverage() {
  if (!databaseConfigured) return [];
  return requireDatabase()`SELECT * FROM data_coverage ORDER BY code`;
}

export async function getMunicipalityComparison() {
  const [ljubljana, brezovica] = await Promise.all([getOverview("061"), getOverview("008")]);
  return { ljubljana, brezovica };
}

export async function searchProperties(query: string, municipality: MunicipalityCode, limit = 20) {
  if (!databaseConfigured || query.trim().length < 2) return [];
  const sql = requireDatabase();
  const needle = query.trim().toLocaleLowerCase("sl");
  const like = `%${needle}%`;
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const cadastral = needle.match(/^(\d{4})[\s-]+([\d/]+)(?:[\s-]+(\d+))?$/);

  if (!cadastral) {
    return sql`
      SELECT 'address' AS type, a.eid AS id, a.label,
        concat_ws(' · ', a.postal_code, a.quarter, a.school_district) AS detail
      FROM addresses a
      WHERE a.municipality_code = ${municipality}
        AND (a.search_text ILIKE ${like} OR a.search_text % ${needle})
      ORDER BY
        CASE WHEN a.search_text = ${needle} OR a.search_text LIKE ${`${needle},%`} THEN 1 ELSE 0 END DESC,
        similarity(a.search_text, ${needle}) DESC, a.label
      LIMIT ${safeLimit}
    `;
  }

  const [, cadastralMunicipality, objectNumber, partNumber] = cadastral;
  if (partNumber) {
    return sql`
      SELECT 'building-part' AS type, bp.eid AS id,
        'Del ' || b.cadastral_municipality_code || '-' || b.building_number || '-' || bp.part_number AS label,
        concat_ws(' · ', bp.actual_use, bp.usable_area_m2::int || ' m²') AS detail
      FROM building_parts bp JOIN buildings b ON b.eid = bp.building_eid
      WHERE bp.municipality_code = ${municipality}
        AND b.cadastral_municipality_code = ${cadastralMunicipality}
        AND b.building_number = ${objectNumber} AND bp.part_number = ${partNumber}
      LIMIT ${safeLimit}
    `;
  }

  return sql`
    SELECT type, id, label, detail FROM (
      SELECT 'parcel' AS type, p.eid AS id,
        'Parcela ' || p.cadastral_municipality_code || ' ' || p.parcel_number AS label,
        concat_ws(' · ', p.area_m2::int || ' m²', p.planned_use) AS detail
      FROM parcels p
      WHERE p.municipality_code = ${municipality}
        AND p.cadastral_municipality_code = ${cadastralMunicipality} AND p.parcel_number = ${objectNumber}
      UNION ALL
      SELECT 'building', b.eid,
        'Stavba ' || b.cadastral_municipality_code || '-' || b.building_number,
        concat_ws(' · ', b.year_built::text, b.area_m2::int || ' m²')
      FROM buildings b
      WHERE b.municipality_code = ${municipality}
        AND b.cadastral_municipality_code = ${cadastralMunicipality} AND b.building_number = ${objectNumber}
    ) results LIMIT ${safeLimit}
  `;
}

export async function getPropertyReport(type: PropertyType, id: string) {
  if (!databaseConfigured) return null;
  const sql = requireDatabase();
  if (type === "parcel") {
    const [property] = await sql`SELECT * FROM parcels WHERE eid = ${id}`;
    if (!property) return null;
    const sales = await sql`
      SELECT s.source_key, s.contract_date, s.price_eur, s.marketability, sc.sold_area_m2, sc.sold_share
      FROM sale_components sc JOIN sales s ON s.source_key = sc.sale_key
      WHERE sc.component_type = 'parcel'
        AND sc.cadastral_municipality_code = ${property.cadastral_municipality_code}
        AND sc.parcel_number = ${property.parcel_number}
      ORDER BY s.contract_date DESC NULLS LAST
    `;
    const comparables = await comparableSales("parcel", property.e, property.n, property.area_m2);
    return { type, property, sales, rentals: [], parts: [], comparables };
  }
  if (type === "building") {
    const [property] = await sql`SELECT * FROM buildings WHERE eid = ${id}`;
    if (!property) return null;
    const parts = await sql`SELECT * FROM building_parts WHERE building_eid = ${id} ORDER BY part_number`;
    const sales = await sql`
      SELECT DISTINCT s.source_key, s.contract_date, s.price_eur, s.marketability
      FROM sale_components sc JOIN sales s ON s.source_key = sc.sale_key
      WHERE sc.cadastral_municipality_code = ${property.cadastral_municipality_code}
        AND sc.building_number = ${property.building_number}
      ORDER BY s.contract_date DESC NULLS LAST
    `;
    const comparables = await comparableSales("building_part", property.e, property.n, property.area_m2);
    return { type, property, sales, rentals: [], parts, comparables };
  }
  if (type === "building-part") {
    const [property] = await sql`
      SELECT bp.*, b.cadastral_municipality_code, b.building_number, b.year_built, b.e, b.n, a.label AS address
      FROM building_parts bp JOIN buildings b ON b.eid = bp.building_eid
      LEFT JOIN LATERAL (SELECT label FROM addresses WHERE house_number_eid = bp.house_number_eid LIMIT 1) a ON true
      WHERE bp.eid = ${id}
    `;
    if (!property) return null;
    const sales = await sql`
      SELECT s.source_key, s.contract_date, s.price_eur, s.marketability, sc.sold_area_m2, sc.sold_share
      FROM sale_components sc JOIN sales s ON s.source_key = sc.sale_key
      WHERE sc.cadastral_municipality_code = ${property.cadastral_municipality_code}
        AND sc.building_number = ${property.building_number}
        AND sc.building_part_number = ${property.part_number}
      ORDER BY s.contract_date DESC NULLS LAST
    `;
    const rentals = await sql`
      SELECT r.source_key, r.contract_date, r.rent_eur, r.marketability, rc.area_m2, rc.rent_eur_m2
      FROM rental_components rc JOIN rentals r ON r.source_key = rc.rental_key
      WHERE rc.cadastral_municipality_code = ${property.cadastral_municipality_code}
        AND rc.building_number = ${property.building_number}
        AND rc.building_part_number = ${property.part_number}
      ORDER BY r.contract_date DESC NULLS LAST
    `;
    const comparables = await comparableSales("building_part", property.e, property.n, property.usable_area_m2 ?? property.area_m2);
    return { type, property, sales, rentals, parts: [], comparables };
  }
  const [property] = await sql`SELECT * FROM addresses WHERE eid = ${id}`;
  if (!property) return null;
  const parts = property.building_eid
    ? await sql`
        SELECT bp.*, b.cadastral_municipality_code, b.building_number
        FROM building_parts bp JOIN buildings b ON b.eid = bp.building_eid
        WHERE bp.building_eid = ${property.building_eid} ORDER BY bp.part_number
      `
    : [];
  const comparables = await comparableSales("building_part", property.e, property.n, null);
  return { type, property, sales: [], rentals: [], parts, comparables };
}

async function comparableSales(componentType: "parcel" | "building_part", e: unknown, n: unknown, area: unknown) {
  const east = Number(e);
  const north = Number(n);
  const targetArea = area == null ? null : Number(area);
  if (!Number.isFinite(east) || !Number.isFinite(north)) return [];
  const sql = requireDatabase();
  return sql`
    SELECT s.source_key, s.contract_date, s.price_eur, sc.property_type, sc.sold_area_m2,
      round((s.price_eur / NULLIF(sc.sold_area_m2, 0))::numeric, 0) AS price_eur_m2,
      round(sqrt(power(sc.e - ${east}, 2) + power(sc.n - ${north}, 2))::numeric, 0) AS distance_m
    FROM sale_components sc JOIN sales s ON s.source_key = sc.sale_key
    WHERE sc.component_type = ${componentType} AND NOT s.is_pending
      AND s.component_count = 1 AND s.price_eur > 0 AND sc.sold_area_m2 > 0
      AND sc.e BETWEEN ${east - 2000} AND ${east + 2000}
      AND sc.n BETWEEN ${north - 2000} AND ${north + 2000}
      AND sqrt(power(sc.e - ${east}, 2) + power(sc.n - ${north}, 2)) <= 2000
      AND (${targetArea}::double precision IS NULL OR sc.sold_area_m2 BETWEEN ${targetArea == null ? 0 : targetArea * 0.6} AND ${targetArea == null ? 1e12 : targetArea * 1.4})
    ORDER BY s.contract_date DESC NULLS LAST, distance_m
    LIMIT 8
  `;
}
