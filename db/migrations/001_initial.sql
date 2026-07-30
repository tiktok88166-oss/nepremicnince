CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS unaccent;

DROP VIEW IF EXISTS data_coverage;
DROP TABLE IF EXISTS rental_components, rentals, sale_components, sales,
  building_parts, buildings, parcels, spatial_units, addresses, municipalities CASCADE;

CREATE TABLE IF NOT EXISTS municipalities (
  code text PRIMARY KEY,
  name text NOT NULL,
  source_updated_on date
);

CREATE TABLE IF NOT EXISTS addresses (
  eid text PRIMARY KEY,
  house_number_eid text,
  municipality_code text NOT NULL REFERENCES municipalities(code),
  settlement text NOT NULL,
  street text,
  house_number text NOT NULL,
  house_suffix text,
  apartment_number text,
  postal_code text,
  postal_name text,
  building_eid text,
  quarter text,
  local_community text,
  school_district text,
  statistical_region text,
  e double precision,
  n double precision,
  label text NOT NULL,
  search_text text NOT NULL
);

CREATE TABLE IF NOT EXISTS spatial_units (
  id bigserial PRIMARY KEY,
  municipality_code text NOT NULL REFERENCES municipalities(code),
  unit_type text NOT NULL,
  name text NOT NULL,
  UNIQUE (municipality_code, unit_type, name)
);

CREATE TABLE IF NOT EXISTS parcels (
  eid text PRIMARY KEY,
  municipality_code text NOT NULL REFERENCES municipalities(code),
  cadastral_municipality_code text NOT NULL,
  parcel_number text NOT NULL,
  area_m2 double precision,
  planned_use text,
  generalised_value_eur double precision,
  e double precision,
  n double precision,
  source_updated_on date,
  UNIQUE (cadastral_municipality_code, parcel_number)
);

CREATE TABLE IF NOT EXISTS buildings (
  eid text PRIMARY KEY,
  municipality_code text NOT NULL REFERENCES municipalities(code),
  cadastral_municipality_code text NOT NULL,
  building_number text NOT NULL,
  year_built integer,
  floor_count integer,
  area_m2 double precision,
  apartment_count integer,
  business_space_count integer,
  roof_renovation_year integer,
  facade_renovation_year integer,
  e double precision,
  n double precision,
  source_updated_on date,
  UNIQUE (cadastral_municipality_code, building_number)
);

CREATE TABLE IF NOT EXISTS building_parts (
  eid text PRIMARY KEY,
  building_eid text NOT NULL REFERENCES buildings(eid) ON DELETE CASCADE,
  municipality_code text NOT NULL REFERENCES municipalities(code),
  part_number text NOT NULL,
  apartment_number text,
  actual_use text,
  area_m2 double precision,
  usable_area_m2 double precision,
  generalised_value_eur double precision,
  house_number_eid text,
  window_renovation_year integer,
  installation_renovation_year integer,
  has_elevator boolean,
  source_updated_on date,
  UNIQUE (building_eid, part_number)
);

CREATE TABLE IF NOT EXISTS sales (
  source_key text PRIMARY KEY,
  transaction_id text NOT NULL,
  municipality_code text NOT NULL REFERENCES municipalities(code),
  contract_date date,
  contract_year integer NOT NULL,
  price_eur double precision,
  sale_type text,
  marketability_code text,
  marketability text,
  is_pending boolean NOT NULL DEFAULT false,
  component_count integer NOT NULL DEFAULT 0,
  e double precision,
  n double precision,
  source_updated_on date
);

CREATE TABLE IF NOT EXISTS sale_components (
  id bigserial PRIMARY KEY,
  sale_key text NOT NULL REFERENCES sales(source_key) ON DELETE CASCADE,
  component_type text NOT NULL CHECK (component_type IN ('parcel', 'building_part')),
  cadastral_municipality_code text,
  parcel_number text,
  building_number text,
  building_part_number text,
  settlement text,
  address text,
  property_type text,
  sold_area_m2 double precision,
  usable_area_m2 double precision,
  sold_share double precision,
  price_eur double precision,
  e double precision,
  n double precision
);

CREATE TABLE IF NOT EXISTS rentals (
  source_key text PRIMARY KEY,
  transaction_id text NOT NULL,
  municipality_code text NOT NULL REFERENCES municipalities(code),
  contract_date date,
  contract_year integer NOT NULL,
  rent_eur double precision,
  rental_type text,
  marketability_code text,
  marketability text,
  is_pending boolean NOT NULL DEFAULT false,
  duration_months double precision,
  component_count integer NOT NULL DEFAULT 0,
  source_updated_on date
);

CREATE TABLE IF NOT EXISTS rental_components (
  id bigserial PRIMARY KEY,
  rental_key text NOT NULL REFERENCES rentals(source_key) ON DELETE CASCADE,
  cadastral_municipality_code text,
  building_number text,
  building_part_number text,
  settlement text,
  address text,
  property_type text,
  area_m2 double precision,
  usable_area_m2 double precision,
  individual_rent_eur double precision,
  rent_eur_m2 double precision,
  e double precision,
  n double precision
);

CREATE INDEX IF NOT EXISTS addresses_municipality_idx ON addresses (municipality_code);
CREATE INDEX IF NOT EXISTS addresses_search_trgm_idx ON addresses USING gin (search_text gin_trgm_ops);
CREATE INDEX IF NOT EXISTS parcels_lookup_idx ON parcels (municipality_code, cadastral_municipality_code, parcel_number);
CREATE INDEX IF NOT EXISTS parcels_number_trgm_idx ON parcels USING gin (parcel_number gin_trgm_ops);
CREATE INDEX IF NOT EXISTS buildings_lookup_idx ON buildings (municipality_code, cadastral_municipality_code, building_number);
CREATE INDEX IF NOT EXISTS building_parts_lookup_idx ON building_parts (municipality_code, building_eid, part_number);
CREATE INDEX IF NOT EXISTS sales_filter_idx ON sales (municipality_code, is_pending, contract_year, contract_date);
CREATE INDEX IF NOT EXISTS sale_components_property_idx ON sale_components (component_type, cadastral_municipality_code, parcel_number, building_number, building_part_number);
CREATE INDEX IF NOT EXISTS rentals_filter_idx ON rentals (municipality_code, is_pending, contract_year, contract_date);
CREATE INDEX IF NOT EXISTS rental_components_property_idx ON rental_components (cadastral_municipality_code, building_number, building_part_number);

CREATE OR REPLACE VIEW data_coverage AS
SELECT m.code, m.name,
  (SELECT count(*) FROM addresses a WHERE a.municipality_code = m.code) AS addresses,
  (SELECT count(*) FROM parcels p WHERE p.municipality_code = m.code) AS parcels,
  (SELECT count(*) FROM buildings b WHERE b.municipality_code = m.code) AS buildings,
  (SELECT count(*) FROM building_parts bp WHERE bp.municipality_code = m.code) AS building_parts,
  (SELECT count(*) FROM sales s WHERE s.municipality_code = m.code) AS sales,
  (SELECT count(*) FROM rentals r WHERE r.municipality_code = m.code) AS rentals
FROM municipalities m;
