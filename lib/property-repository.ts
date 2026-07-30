import { databaseConfigured, requireDatabase } from "@/lib/db";
import { analyseComparableSales, type ComparableSource } from "@/lib/property-estimate";

export type MunicipalityCode = "008" | "061";
export type SearchMunicipality = MunicipalityCode | "all";
export type PropertyType = "address" | "parcel" | "building" | "building-part";
export type SearchResultType = PropertyType | "sale";
export type DatabaseEntityType = "address" | "parcel" | "building" | "building-part" | "sale" | "rental";

export type DatabaseSearchFilters = {
  type: DatabaseEntityType;
  municipality: SearchMunicipality;
  query: string;
  minArea: number | null;
  maxArea: number | null;
  minValue: number | null;
  maxValue: number | null;
  yearFrom: number | null;
  yearTo: number | null;
  use: string;
  sort: "relevance" | "newest" | "value-desc" | "value-asc" | "area-desc" | "area-asc";
  page: number;
  pageSize?: number;
};

export const municipalities = [
  { code: "061" as const, name: "Ljubljana" },
  { code: "008" as const, name: "Brezovica" },
];

export function normalizeMunicipality(value: string | null | undefined): MunicipalityCode {
  return value === "008" ? "008" : "061";
}

export function normalizeSearchMunicipality(value: string | null | undefined): SearchMunicipality {
  return value === "008" || value === "061" ? value : "all";
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
  return requireDatabase()`
    SELECT dc.*, m.source_updated_on
    FROM data_coverage dc JOIN municipalities m ON m.code = dc.code
    ORDER BY dc.code
  `;
}

export async function getMethodologyOverview() {
  if (!databaseConfigured) return { coverage: [], layerDates: [] };
  const sql = requireDatabase();
  const [coverage, layerDates] = await Promise.all([
    getCoverage(),
    sql`
      SELECT layer, max(source_updated_on) AS source_updated_on FROM (
        SELECT 'Parcele' AS layer, source_updated_on FROM parcels
        UNION ALL SELECT 'Stavbe', source_updated_on FROM buildings
        UNION ALL SELECT 'Deli stavb', source_updated_on FROM building_parts
        UNION ALL SELECT 'Prodaje', source_updated_on FROM sales
        UNION ALL SELECT 'Najemi', source_updated_on FROM rentals
      ) dates
      GROUP BY layer ORDER BY layer
    `,
  ]);
  return { coverage, layerDates };
}

export async function getMunicipalityComparison() {
  const [ljubljana, brezovica] = await Promise.all([getOverview("061"), getOverview("008")]);
  return { ljubljana, brezovica };
}

export async function searchProperties(query: string, municipality: SearchMunicipality, limit = 20) {
  if (!databaseConfigured || query.trim().length < 2) return [];
  const sql = requireDatabase();
  const needle = query.trim().toLocaleLowerCase("sl");
  const like = `%${needle}%`;
  const safeLimit = Math.min(Math.max(limit, 1), 50);
  const cadastral = needle.match(/^(\d{4})[\s-]+([\d/]+)(?:[\s-]+(\d+))?$/);
  const allMunicipalities = municipality === "all";
  const municipalityCode = allMunicipalities ? "061" : municipality;

  if (!cadastral) {
    return sql`
      SELECT type, id, label, detail FROM (
        SELECT 'address' AS type, a.eid AS id, a.label,
          concat_ws(' · ', a.postal_code, a.postal_name, a.quarter) AS detail,
          CASE WHEN a.search_text = ${needle} OR a.search_text LIKE ${`${needle},%`} THEN 2 ELSE similarity(a.search_text, ${needle}) END AS rank
        FROM addresses a
        WHERE (${allMunicipalities} OR a.municipality_code = ${municipalityCode})
          AND (a.search_text ILIKE ${like} OR a.search_text % ${needle})
        UNION ALL
        SELECT 'sale', s.source_key,
          'Posel ' || s.transaction_id,
          concat_ws(' · ', s.contract_date::text, round(s.price_eur)::bigint::text || ' EUR', s.sale_type),
          CASE WHEN lower(s.transaction_id) = ${needle} OR lower(s.source_key) = ${needle} THEN 3 ELSE 1 END
        FROM sales s
        WHERE (${allMunicipalities} OR s.municipality_code = ${municipalityCode})
          AND (lower(s.transaction_id) = ${needle} OR lower(s.source_key) = ${needle}
            OR (${needle.length >= 4} AND (s.transaction_id ILIKE ${like} OR s.source_key ILIKE ${like})))
      ) results
      ORDER BY rank DESC, label
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
      WHERE (${allMunicipalities} OR bp.municipality_code = ${municipalityCode})
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
      WHERE (${allMunicipalities} OR p.municipality_code = ${municipalityCode})
        AND p.cadastral_municipality_code = ${cadastralMunicipality} AND p.parcel_number = ${objectNumber}
      UNION ALL
      SELECT 'building', b.eid,
        'Stavba ' || b.cadastral_municipality_code || '-' || b.building_number,
        concat_ws(' · ', b.year_built::text, b.area_m2::int || ' m²')
      FROM buildings b
      WHERE (${allMunicipalities} OR b.municipality_code = ${municipalityCode})
        AND b.cadastral_municipality_code = ${cadastralMunicipality} AND b.building_number = ${objectNumber}
    ) results LIMIT ${safeLimit}
  `;
}

export async function searchDatabase(filters: DatabaseSearchFilters) {
  if (!databaseConfigured) return { rows: [], total: 0, page: filters.page, pageSize: filters.pageSize ?? 25 };
  const sql = requireDatabase();
  const pageSize = Math.min(Math.max(filters.pageSize ?? 25, 10), 50);
  const page = Math.max(filters.page, 1);
  const offset = (page - 1) * pageSize;
  const query = filters.query.trim().toLocaleLowerCase("sl");
  const like = `%${query}%`;
  const useLike = `%${filters.use.trim()}%`;
  const allMunicipalities = filters.municipality === "all";
  const municipality = allMunicipalities ? "061" : filters.municipality;
  let rows;

  if (filters.type === "address") {
    rows = await sql`
      SELECT 'address' AS entity_type, a.eid AS id, a.label AS title,
        concat_ws(' · ', a.postal_code, a.postal_name, a.quarter) AS detail,
        a.municipality_code, NULL::double precision AS area_m2, NULL::double precision AS value_eur,
        NULL::integer AS record_year, NULL::date AS record_date, a.settlement AS use_label,
        count(*) OVER()::int AS total_count
      FROM addresses a
      WHERE (${allMunicipalities} OR a.municipality_code = ${municipality})
        AND (${query === ""} OR a.search_text ILIKE ${like} OR a.search_text % ${query})
        AND (${filters.use === ""} OR a.settlement ILIKE ${useLike} OR a.quarter ILIKE ${useLike})
      ORDER BY CASE WHEN ${filters.sort === "relevance" && query !== ""} THEN similarity(a.search_text, ${query}) END DESC NULLS LAST, a.label
      LIMIT ${pageSize} OFFSET ${offset}
    `;
  } else if (filters.type === "parcel") {
    rows = await sql`
      SELECT 'parcel' AS entity_type, p.eid AS id,
        'Parcela ' || p.cadastral_municipality_code || ' ' || p.parcel_number AS title,
        concat_ws(' · ', round(p.area_m2)::bigint::text || ' m²', p.planned_use) AS detail,
        p.municipality_code, p.area_m2, p.generalised_value_eur AS value_eur,
        NULL::integer AS record_year, p.source_updated_on AS record_date, p.planned_use AS use_label,
        count(*) OVER()::int AS total_count
      FROM parcels p
      WHERE (${allMunicipalities} OR p.municipality_code = ${municipality})
        AND (${query === ""} OR lower(p.cadastral_municipality_code || '-' || p.parcel_number) ILIKE ${like} OR p.planned_use ILIKE ${like})
        AND (${filters.minArea}::double precision IS NULL OR p.area_m2 >= ${filters.minArea})
        AND (${filters.maxArea}::double precision IS NULL OR p.area_m2 <= ${filters.maxArea})
        AND (${filters.minValue}::double precision IS NULL OR p.generalised_value_eur >= ${filters.minValue})
        AND (${filters.maxValue}::double precision IS NULL OR p.generalised_value_eur <= ${filters.maxValue})
        AND (${filters.use === ""} OR p.planned_use ILIKE ${useLike})
      ORDER BY
        CASE WHEN ${filters.sort === "value-desc"} THEN p.generalised_value_eur END DESC NULLS LAST,
        CASE WHEN ${filters.sort === "value-asc"} THEN p.generalised_value_eur END ASC NULLS LAST,
        CASE WHEN ${filters.sort === "area-desc"} THEN p.area_m2 END DESC NULLS LAST,
        CASE WHEN ${filters.sort === "area-asc"} THEN p.area_m2 END ASC NULLS LAST,
        p.cadastral_municipality_code, p.parcel_number
      LIMIT ${pageSize} OFFSET ${offset}
    `;
  } else if (filters.type === "building") {
    rows = await sql`
      SELECT 'building' AS entity_type, b.eid AS id,
        'Stavba ' || b.cadastral_municipality_code || '-' || b.building_number AS title,
        concat_ws(' · ', 'leto ' || b.year_built::text, round(b.area_m2)::bigint::text || ' m²', b.floor_count::text || ' etaž') AS detail,
        b.municipality_code, b.area_m2, NULL::double precision AS value_eur,
        b.year_built AS record_year, b.source_updated_on AS record_date, NULL::text AS use_label,
        count(*) OVER()::int AS total_count
      FROM buildings b
      WHERE (${allMunicipalities} OR b.municipality_code = ${municipality})
        AND (${query === ""} OR lower(b.cadastral_municipality_code || '-' || b.building_number) ILIKE ${like})
        AND (${filters.minArea}::double precision IS NULL OR b.area_m2 >= ${filters.minArea})
        AND (${filters.maxArea}::double precision IS NULL OR b.area_m2 <= ${filters.maxArea})
        AND (${filters.yearFrom}::integer IS NULL OR b.year_built >= ${filters.yearFrom})
        AND (${filters.yearTo}::integer IS NULL OR b.year_built <= ${filters.yearTo})
      ORDER BY
        CASE WHEN ${filters.sort === "newest"} THEN b.year_built END DESC NULLS LAST,
        CASE WHEN ${filters.sort === "area-desc"} THEN b.area_m2 END DESC NULLS LAST,
        CASE WHEN ${filters.sort === "area-asc"} THEN b.area_m2 END ASC NULLS LAST,
        b.cadastral_municipality_code, b.building_number
      LIMIT ${pageSize} OFFSET ${offset}
    `;
  } else if (filters.type === "building-part") {
    rows = await sql`
      SELECT 'building-part' AS entity_type, bp.eid AS id,
        'Del stavbe ' || b.cadastral_municipality_code || '-' || b.building_number || '-' || bp.part_number AS title,
        concat_ws(' · ', bp.actual_use, round(bp.usable_area_m2)::bigint::text || ' m²', 'stavba ' || b.year_built::text) AS detail,
        bp.municipality_code, COALESCE(bp.usable_area_m2, bp.area_m2) AS area_m2,
        bp.generalised_value_eur AS value_eur, b.year_built AS record_year,
        bp.source_updated_on AS record_date, bp.actual_use AS use_label,
        count(*) OVER()::int AS total_count
      FROM building_parts bp JOIN buildings b ON b.eid = bp.building_eid
      WHERE (${allMunicipalities} OR bp.municipality_code = ${municipality})
        AND (${query === ""} OR lower(b.cadastral_municipality_code || '-' || b.building_number || '-' || bp.part_number) ILIKE ${like} OR bp.actual_use ILIKE ${like})
        AND (${filters.minArea}::double precision IS NULL OR COALESCE(bp.usable_area_m2, bp.area_m2) >= ${filters.minArea})
        AND (${filters.maxArea}::double precision IS NULL OR COALESCE(bp.usable_area_m2, bp.area_m2) <= ${filters.maxArea})
        AND (${filters.minValue}::double precision IS NULL OR bp.generalised_value_eur >= ${filters.minValue})
        AND (${filters.maxValue}::double precision IS NULL OR bp.generalised_value_eur <= ${filters.maxValue})
        AND (${filters.yearFrom}::integer IS NULL OR b.year_built >= ${filters.yearFrom})
        AND (${filters.yearTo}::integer IS NULL OR b.year_built <= ${filters.yearTo})
        AND (${filters.use === ""} OR bp.actual_use ILIKE ${useLike})
      ORDER BY
        CASE WHEN ${filters.sort === "value-desc"} THEN bp.generalised_value_eur END DESC NULLS LAST,
        CASE WHEN ${filters.sort === "value-asc"} THEN bp.generalised_value_eur END ASC NULLS LAST,
        CASE WHEN ${filters.sort === "area-desc"} THEN COALESCE(bp.usable_area_m2, bp.area_m2) END DESC NULLS LAST,
        CASE WHEN ${filters.sort === "area-asc"} THEN COALESCE(bp.usable_area_m2, bp.area_m2) END ASC NULLS LAST,
        CASE WHEN ${filters.sort === "newest"} THEN b.year_built END DESC NULLS LAST,
        b.cadastral_municipality_code, b.building_number, bp.part_number
      LIMIT ${pageSize} OFFSET ${offset}
    `;
  } else if (filters.type === "sale") {
    rows = await sql`
      SELECT 'sale' AS entity_type, s.source_key AS id, 'Posel ' || s.transaction_id AS title,
        concat_ws(' · ', s.sale_type, s.marketability, s.component_count::text || ' sestavin') AS detail,
        s.municipality_code, NULL::double precision AS area_m2, s.price_eur AS value_eur,
        s.contract_year AS record_year, s.contract_date AS record_date, s.sale_type AS use_label,
        count(*) OVER()::int AS total_count
      FROM sales s
      WHERE (${allMunicipalities} OR s.municipality_code = ${municipality})
        AND (${query === ""} OR s.transaction_id ILIKE ${like} OR s.source_key ILIKE ${like} OR s.sale_type ILIKE ${like})
        AND (${filters.minValue}::double precision IS NULL OR s.price_eur >= ${filters.minValue})
        AND (${filters.maxValue}::double precision IS NULL OR s.price_eur <= ${filters.maxValue})
        AND (${filters.yearFrom}::integer IS NULL OR s.contract_year >= ${filters.yearFrom})
        AND (${filters.yearTo}::integer IS NULL OR s.contract_year <= ${filters.yearTo})
        AND (${filters.use === ""} OR s.sale_type ILIKE ${useLike} OR s.marketability ILIKE ${useLike})
      ORDER BY
        CASE WHEN ${filters.sort === "value-desc"} THEN s.price_eur END DESC NULLS LAST,
        CASE WHEN ${filters.sort === "value-asc"} THEN s.price_eur END ASC NULLS LAST,
        s.contract_date DESC NULLS LAST, s.source_key
      LIMIT ${pageSize} OFFSET ${offset}
    `;
  } else {
    rows = await sql`
      SELECT 'rental' AS entity_type, r.source_key AS id, 'Najem ' || r.transaction_id AS title,
        concat_ws(' · ', r.rental_type, r.marketability, r.duration_months::text || ' mesecev') AS detail,
        r.municipality_code, NULL::double precision AS area_m2, r.rent_eur AS value_eur,
        r.contract_year AS record_year, r.contract_date AS record_date, r.rental_type AS use_label,
        count(*) OVER()::int AS total_count
      FROM rentals r
      WHERE (${allMunicipalities} OR r.municipality_code = ${municipality})
        AND (${query === ""} OR r.transaction_id ILIKE ${like} OR r.source_key ILIKE ${like} OR r.rental_type ILIKE ${like})
        AND (${filters.minValue}::double precision IS NULL OR r.rent_eur >= ${filters.minValue})
        AND (${filters.maxValue}::double precision IS NULL OR r.rent_eur <= ${filters.maxValue})
        AND (${filters.yearFrom}::integer IS NULL OR r.contract_year >= ${filters.yearFrom})
        AND (${filters.yearTo}::integer IS NULL OR r.contract_year <= ${filters.yearTo})
        AND (${filters.use === ""} OR r.rental_type ILIKE ${useLike} OR r.marketability ILIKE ${useLike})
      ORDER BY
        CASE WHEN ${filters.sort === "value-desc"} THEN r.rent_eur END DESC NULLS LAST,
        CASE WHEN ${filters.sort === "value-asc"} THEN r.rent_eur END ASC NULLS LAST,
        r.contract_date DESC NULLS LAST, r.source_key
      LIMIT ${pageSize} OFFSET ${offset}
    `;
  }

  return { rows, total: Number(rows[0]?.total_count ?? 0), page, pageSize };
}

export async function getPropertyReport(type: PropertyType, id: string) {
  if (!databaseConfigured) return null;
  const sql = requireDatabase();
  if (type === "parcel") {
    const [property] = await sql`SELECT * FROM parcels WHERE eid = ${id}`;
    if (!property) return null;
    const sales = await sql`
      SELECT s.source_key, s.contract_date, s.price_eur, s.marketability, sc.sold_area_m2, sc.sold_share,
      round((s.price_eur / NULLIF(sc.sold_area_m2, 0))::numeric, 2) AS price_eur_m2
      FROM sale_components sc JOIN sales s ON s.source_key = sc.sale_key
      WHERE sc.component_type = 'parcel'
        AND sc.cadastral_municipality_code = ${property.cadastral_municipality_code}
        AND sc.parcel_number = ${property.parcel_number}
      ORDER BY s.contract_date DESC NULLS LAST
    `;
    const analysis = analyseRows(await comparableSales("parcel", property.e, property.n, property.area_m2, property.planned_use), property.area_m2);
    return { type, property, sales, rentals: [], parts: [], ...analysis };
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
    const analysis = analyseRows(await comparableSales("building_part", property.e, property.n, null, null), null);
    return { type, property, sales, rentals: [], parts, ...analysis };
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
      SELECT s.source_key, s.contract_date, s.price_eur, s.marketability, sc.sold_area_m2, sc.sold_share,
      round((s.price_eur / NULLIF(sc.sold_area_m2, 0))::numeric, 2) AS price_eur_m2
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
    const targetArea = property.usable_area_m2 ?? property.area_m2;
    const analysis = analyseRows(await comparableSales("building_part", property.e, property.n, targetArea, property.actual_use), targetArea);
    return { type, property, sales, rentals, parts: [], ...analysis };
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
  const analysis = analyseRows(await comparableSales("building_part", property.e, property.n, null, null), null);
  return { type, property, sales: [], rentals: [], parts, ...analysis };
}

export async function getSaleReport(id: string) {
  if (!databaseConfigured) return null;
  const sql = requireDatabase();
  const [sale] = await sql`SELECT * FROM sales WHERE source_key = ${id}`;
  if (!sale) return null;
  const components = await sql`
    SELECT sc.*,
      CASE WHEN sc.component_type = 'parcel' THEN p.eid ELSE bp.eid END AS property_eid,
      CASE WHEN sc.component_type = 'parcel' THEN 'parcel' ELSE 'building-part' END AS property_route
    FROM sale_components sc
    LEFT JOIN parcels p ON sc.component_type = 'parcel'
      AND p.cadastral_municipality_code = sc.cadastral_municipality_code
      AND p.parcel_number = sc.parcel_number
    LEFT JOIN buildings b ON sc.component_type = 'building_part'
      AND b.cadastral_municipality_code = sc.cadastral_municipality_code
      AND b.building_number = sc.building_number
    LEFT JOIN building_parts bp ON bp.building_eid = b.eid AND bp.part_number = sc.building_part_number
    WHERE sc.sale_key = ${id}
    ORDER BY sc.id
  `;
  return { sale, components };
}

export async function getRentalReport(id: string) {
  if (!databaseConfigured) return null;
  const sql = requireDatabase();
  const [rental] = await sql`SELECT * FROM rentals WHERE source_key = ${id}`;
  if (!rental) return null;
  const components = await sql`
    SELECT rc.*, bp.eid AS property_eid
    FROM rental_components rc
    LEFT JOIN buildings b ON b.cadastral_municipality_code = rc.cadastral_municipality_code
      AND b.building_number = rc.building_number
    LEFT JOIN building_parts bp ON bp.building_eid = b.eid AND bp.part_number = rc.building_part_number
    WHERE rc.rental_key = ${id}
    ORDER BY rc.id
  `;
  return { rental, components };
}

async function comparableSales(componentType: "parcel" | "building_part", e: unknown, n: unknown, area: unknown, use: unknown) {
  const east = Number(e);
  const north = Number(n);
  const targetArea = area == null ? null : Number(area);
  const useGroup = comparableUseGroup(componentType, use);
  if (!Number.isFinite(east) || !Number.isFinite(north)) return [];
  const sql = requireDatabase();
  return sql`
    SELECT s.source_key, s.contract_date, s.price_eur, sc.property_type, sc.sold_area_m2,
      round((s.price_eur / NULLIF(sc.sold_area_m2, 0))::numeric, 2) AS price_eur_m2,
      round(sqrt(power(sc.e - ${east}, 2) + power(sc.n - ${north}, 2))::numeric, 0) AS distance_m
    FROM sale_components sc JOIN sales s ON s.source_key = sc.sale_key
    WHERE sc.component_type = ${componentType} AND NOT s.is_pending
      AND s.component_count = 1 AND s.price_eur > 0 AND sc.sold_area_m2 > 0
      AND sc.e BETWEEN ${east - 2000} AND ${east + 2000}
      AND sc.n BETWEEN ${north - 2000} AND ${north + 2000}
      AND sqrt(power(sc.e - ${east}, 2) + power(sc.n - ${north}, 2)) <= 2000
      AND (${targetArea}::double precision IS NULL OR sc.sold_area_m2 BETWEEN ${targetArea == null ? 0 : targetArea * 0.6} AND ${targetArea == null ? 1e12 : targetArea * 1.4})
      AND (
        ${useGroup} = 'all'
        OR (${useGroup} = 'building-land' AND (sc.property_type ILIKE '%gradnj%' OR sc.property_type ILIKE '%stavb%'))
        OR (${useGroup} = 'agriculture' AND sc.property_type ILIKE '%kmetij%')
        OR (${useGroup} = 'forest' AND sc.property_type ILIKE '%gozd%')
        OR (${useGroup} = 'apartment' AND sc.property_type ILIKE '%stanovan%')
        OR (${useGroup} = 'garage' AND (sc.property_type ILIKE '%garaž%' OR sc.property_type ILIKE '%parkir%'))
        OR (${useGroup} = 'commercial' AND (sc.property_type ILIKE '%poslov%' OR sc.property_type ILIKE '%lokal%'))
      )
    ORDER BY s.contract_date DESC NULLS LAST, distance_m
    LIMIT 12
  `;
}

function comparableUseGroup(componentType: "parcel" | "building_part", value: unknown) {
  const use = String(value ?? "").toLocaleLowerCase("sl");
  if (!use) return "all";
  if (componentType === "parcel") {
    if (use.includes("kmet")) return "agriculture";
    if (use.includes("gozd")) return "forest";
    if (["stanov", "naselj", "poselit", "central", "proizvod", "turiz", "stavb"].some((term) => use.includes(term))) return "building-land";
    return "all";
  }
  if (use.includes("stanovan")) return "apartment";
  if (use.includes("garaž") || use.includes("parkir")) return "garage";
  if (use.includes("poslov") || use.includes("lokal")) return "commercial";
  return "all";
}

function analyseRows(rows: Iterable<Record<string, unknown>>, area: unknown) {
  const targetArea = area == null ? null : Number(area);
  return analyseComparableSales(
    [...rows] as Array<ComparableSource & Record<string, unknown>>,
    Number.isFinite(targetArea) ? targetArea : null,
  );
}
