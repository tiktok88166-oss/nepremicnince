"use client";

import { useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
import GeoJSON from "ol/format/GeoJSON";
import type Feature from "ol/Feature";
import { createEmpty, extend } from "ol/extent";
import type Geometry from "ol/geom/Geometry";
import Map from "ol/Map";
import View from "ol/View";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import { get as getProjection, transform, transformExtent } from "ol/proj";
import { register } from "ol/proj/proj4";
import OSM from "ol/source/OSM";
import TileWMS from "ol/source/TileWMS";
import Cluster from "ol/source/Cluster";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import proj4 from "proj4";
import type { FeatureCollection, Point } from "geojson";
import { X } from "lucide-react";
import type { MapBaseMode, MapColorMode, VisibleMapLayers } from "@/components/MapView";
import { GURS_ORTHO_WMS_FORMAT, GURS_ORTHO_WMS_LAYER, GURS_ORTHO_WMS_URL, GURS_ORTHO_WMS_VERSION } from "@/lib/gurs";
import { fetchJson, getMapManifest } from "@/lib/map-data";
import type { EnrichedTransaction } from "@/lib/schemas";

proj4.defs("EPSG:3794", "+proj=tmerc +lat_0=0 +lon_0=15 +k=0.9999 +x_0=500000 +y_0=-5000000 +ellps=GRS80 +units=m +no_defs");
register(proj4);
const projection = getProjection("EPSG:3794");
projection?.setExtent([360000, 30000, 650000, 210000]);

type SelectedFeature = { title: string; detail: string; href?: string };

export function GursOrthoMap({
  rows,
  layers,
  mode,
  colorMode,
  compact = false,
  onUnavailable,
}: {
  rows: EnrichedTransaction[];
  layers: VisibleMapLayers;
  mode: MapBaseMode;
  colorMode: MapColorMode;
  compact?: boolean;
  onUnavailable: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const layerRefs = useRef<{ sales?: VectorLayer; rentals?: VectorLayer; parcels?: VectorLayer; buildings?: VectorLayer }>({});
  const loadedParcels = useRef(new Set<string>());
  const loadedBuildings = useRef(new Set<string>());
  const layersRef = useRef(layers);
  const wmsFailureReported = useRef(false);
  const [selected, setSelected] = useState<SelectedFeature | null>(null);
  const salesData = useMemo<FeatureCollection<Point>>(() => ({
    type: "FeatureCollection",
    features: rows.filter((row) => row.coordinate).map((row) => ({
      type: "Feature",
      id: row.id,
      geometry: { type: "Point", coordinates: [row.coordinate?.longitude ?? 0, row.coordinate?.latitude ?? 0] },
      properties: { kind: "sale", id: row.id, priceEur: row.priceEur, category: row.mainCategory, quality: row.quality },
    })),
  }), [rows]);

  useEffect(() => {
    layersRef.current = layers;
    layerRefs.current.sales?.setVisible(layers.sales);
    layerRefs.current.rentals?.setVisible(layers.rentals);
    layerRefs.current.parcels?.setVisible(layers.parcels);
    layerRefs.current.buildings?.setVisible(layers.buildings);
    if (mapRef.current) void loadVisibleLayers(mapRef.current, layerRefs.current, layersRef, loadedParcels, loadedBuildings);
  }, [layers]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    loadedParcels.current.clear();
    loadedBuildings.current.clear();
    const viewProjection = mode === "ortho" ? "EPSG:3794" : "EPSG:3857";
    const baseLayers: TileLayer[] = [];
    if (mode === "basic") {
      baseLayers.push(new TileLayer({ source: new OSM({ crossOrigin: "anonymous" }) }));
    } else if (mode === "ortho") {
      wmsFailureReported.current = false;
      const wmsSource = new TileWMS({
        url: GURS_ORTHO_WMS_URL,
        params: { LAYERS: GURS_ORTHO_WMS_LAYER, VERSION: GURS_ORTHO_WMS_VERSION, FORMAT: GURS_ORTHO_WMS_FORMAT, TILED: true },
        projection: "EPSG:3794",
        crossOrigin: "anonymous",
        attributions: "Geodetska uprava Republike Slovenije - državni ortofoto DOF050",
      });
      wmsSource.on("tileloaderror", () => {
        if (!wmsFailureReported.current) {
          wmsFailureReported.current = true;
          onUnavailable();
        }
      });
      baseLayers.push(new TileLayer({ source: wmsSource }));
    }
    const salesSource = new VectorSource({ features: new GeoJSON().readFeatures(salesData, { dataProjection: "EPSG:4326", featureProjection: viewProjection }) });
    const clusteredSalesSource = new Cluster({ distance: 42, minDistance: 12, source: salesSource });
    const salesLayer = new VectorLayer({
      source: clusteredSalesSource,
      visible: layersRef.current.sales,
      style: (feature) => {
        const members = feature.get("features") as Feature<Geometry>[] | undefined;
        if (members && members.length > 1) {
          return new Style({
            image: new CircleStyle({
              radius: members.length >= 80 ? 24 : members.length >= 30 ? 20 : 16,
              fill: new Fill({ color: "rgba(47,111,86,0.9)" }),
              stroke: new Stroke({ color: "#ffffff", width: 1.5 }),
            }),
            text: new Text({ text: String(members.length), fill: new Fill({ color: "#ffffff" }), font: "600 12px Arial" }),
          });
        }
        const sale = members?.[0] ?? feature;
        return new Style({
          image: new CircleStyle({
            radius: 6,
            fill: new Fill({ color: saleColor(colorMode, sale.get("category"), sale.get("quality")) }),
            stroke: new Stroke({ color: "#ffffff", width: 1.5 }),
          }),
        });
      },
    });
    const rentalLayer = new VectorLayer({ source: new VectorSource(), visible: layersRef.current.rentals, style: new Style({ image: new CircleStyle({ radius: 6, fill: new Fill({ color: "#a83763" }), stroke: new Stroke({ color: "#ffffff", width: 1.5 }) }) }) });
    const parcelLayer = new VectorLayer({ source: new VectorSource(), visible: layersRef.current.parcels, minZoom: 12, style: new Style({ fill: new Fill({ color: "rgba(74,141,104,0.08)" }), stroke: new Stroke({ color: "#2f6f56", width: 1 }) }) });
    const buildingLayer = new VectorLayer({ source: new VectorSource(), visible: layersRef.current.buildings, minZoom: 11, style: new Style({ image: new CircleStyle({ radius: 4, fill: new Fill({ color: "#202a24" }), stroke: new Stroke({ color: "#ffffff", width: 1 }) }) }) });
    layerRefs.current = { sales: salesLayer, rentals: rentalLayer, parcels: parcelLayer, buildings: buildingLayer };

    const map = new Map({
      target: containerRef.current,
      layers: [...baseLayers, parcelLayer, buildingLayer, salesLayer, rentalLayer],
      view: new View({ projection: viewProjection, center: transform([14.42, 45.99], "EPSG:4326", viewProjection), zoom: 9 }),
    });
    mapRef.current = map;
    const salesExtent = salesSource.getExtent();
    if (salesSource.getFeatures().length > 0 && salesExtent) {
      map.getView().fit(salesExtent, { size: map.getSize(), padding: compact ? [24, 24, 24, 24] : [48, 48, 48, 48], maxZoom: 14 });
    }
    containerRef.current.setAttribute("data-map-ready", "true");
    containerRef.current.setAttribute("data-sales-features", String(salesSource.getFeatures().length));
    map.once("rendercomplete", () => containerRef.current?.setAttribute("data-map-rendered", "true"));
    map.renderSync();
    fetchJson<FeatureCollection>("/data/map/rentals.geojson").then((payload) => rentalLayer.getSource()?.addFeatures(new GeoJSON().readFeatures(payload, { dataProjection: "EPSG:4326", featureProjection: viewProjection }))).catch(() => undefined);
    map.on("moveend", () => void loadVisibleLayers(map, layerRefs.current, layersRef, loadedParcels, loadedBuildings));
    map.on("singleclick", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (candidate) => candidate);
      if (!feature) { setSelected(null); return; }
      const members = feature.get("features") as Feature<Geometry>[] | undefined;
      if (members && members.length > 1) {
        const extent = members.reduce((current, member) => {
          const geometry = member.getGeometry();
          return geometry ? extend(current, geometry.getExtent()) : current;
        }, createEmpty());
        map.getView().fit(extent, { size: map.getSize(), padding: [48, 48, 48, 48], maxZoom: 15, duration: 250 });
        setSelected(null);
        return;
      }
      const selectedFeature = members?.[0] ?? feature;
      const properties = selectedFeature.getProperties() as Record<string, unknown>;
      if (properties.kind === "sale") setSelected({ title: `Prodajni posel ${properties.id}`, detail: String(properties.category ?? ""), href: `/posli/${properties.id}` });
      else if (properties.eidParcel) setSelected({ title: `Parcela ${properties.cadastralMunicipalityCode}/${properties.parcelNumber}`, detail: String(properties.plannedUsePrimary ?? "Raba ni navedena"), href: `/parcele?eid=${properties.eidParcel}&ko=${properties.cadastralMunicipalityCode}` });
      else if (properties.eidBuilding) setSelected({ title: `Stavba ${properties.cadastralMunicipalityCode}/${properties.buildingNumber}`, detail: properties.yearBuilt ? `Leto izgradnje ${properties.yearBuilt}` : "Leto izgradnje ni navedeno", href: `/stavbe?eid=${properties.eidBuilding}&ko=${properties.cadastralMunicipalityCode}` });
      else if (properties.transactionId) setSelected({ title: `Najemni posel ${properties.transactionId}`, detail: String(properties.address ?? "Lokacija najema"), href: "/najemi" });
    });
    void loadVisibleLayers(map, layerRefs.current, layersRef, loadedParcels, loadedBuildings);
    return () => { map.setTarget(undefined); mapRef.current = null; };
  }, [colorMode, compact, mode, onUnavailable, salesData]);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        data-testid={mode === "ortho" ? "gurs-ortho-map" : "map"}
        className={`${compact ? "h-[320px] sm:h-[340px]" : "h-[58vh] min-h-[380px] sm:h-[68vh] sm:min-h-[460px]"} w-full overflow-hidden rounded-md border border-[#c8d2ca] shadow-[0_2px_8px_rgba(25,42,33,0.08)] ${mode === "none" ? "bg-white" : "bg-[#eef1ec]"}`}
      />
      {selected ? <div className="absolute bottom-3 left-3 max-w-xs rounded-md border border-[var(--border)] bg-white p-3 text-sm shadow-lg"><button className="absolute right-2 top-2" aria-label="Zapri podrobnosti" onClick={() => setSelected(null)}><X aria-hidden="true" className="h-4 w-4" /></button><p className="pr-6 font-semibold">{selected.title}</p><p className="mt-1 text-[var(--muted)]">{selected.detail}</p>{selected.href ? <a className="mt-2 inline-block font-medium text-[var(--accent)]" href={selected.href}>Odpri podrobnosti</a> : null}</div> : null}
      {mode === "ortho" ? <p className="mt-2 text-xs text-[var(--muted)]">Vir ortofota: Geodetska uprava Republike Slovenije, državni ortofoto DOF050. Prikaz uporablja izvorni CRS EPSG:3794.</p> : null}
    </div>
  );
}

function saleColor(mode: MapColorMode, category: unknown, quality: unknown) {
  if (mode === "quality") {
    if (quality === "A") return "#2f6f56";
    if (quality === "B") return "#2c627e";
    if (quality === "C") return "#a86c16";
    return "#6d6a73";
  }
  if (category === "STANOVANJE") return "#2c627e";
  if (category === "STAVBNO ZEMLJIŠČE") return "#a86c16";
  if (category === "HIŠA S PRIPADAJOČIM ZEMLJIŠČEM") return "#2f6f56";
  return "#6d6a73";
}

async function loadVisibleLayers(
  map: Map,
  layerRefs: { sales?: VectorLayer; rentals?: VectorLayer; parcels?: VectorLayer; buildings?: VectorLayer },
  layersRef: MutableRefObject<VisibleMapLayers>,
  loadedParcels: MutableRefObject<Set<string>>,
  loadedBuildings: MutableRefObject<Set<string>>,
) {
  const size = map.getSize();
  if (!size) return;
  const viewProjection = map.getView().getProjection().getCode();
  const extent = transformExtent(map.getView().calculateExtent(size), viewProjection, "EPSG:4326");
  const zoom = map.getView().getZoom() ?? 0;
  if (layersRef.current.parcels && zoom >= 12) {
    const manifest = await getMapManifest("parcels");
    for (const tile of manifest.tiles.filter((item) => intersects(extent, item.bbox) && !loadedParcels.current.has(item.cadastralMunicipalityCode))) {
      loadedParcels.current.add(tile.cadastralMunicipalityCode);
      const payload = await fetchJson<FeatureCollection>(tile.url).catch((error) => {
        loadedParcels.current.delete(tile.cadastralMunicipalityCode);
        throw error;
      });
      layerRefs.parcels?.getSource()?.addFeatures(new GeoJSON().readFeatures(payload, { dataProjection: "EPSG:4326", featureProjection: viewProjection }));
    }
  }
  if (layersRef.current.buildings && zoom >= 11) {
    const manifest = await getMapManifest("buildings");
    for (const tile of manifest.tiles.filter((item) => intersects(extent, item.bbox) && !loadedBuildings.current.has(item.cadastralMunicipalityCode))) {
      loadedBuildings.current.add(tile.cadastralMunicipalityCode);
      const payload = await fetchJson<FeatureCollection>(tile.url).catch((error) => {
        loadedBuildings.current.delete(tile.cadastralMunicipalityCode);
        throw error;
      });
      layerRefs.buildings?.getSource()?.addFeatures(new GeoJSON().readFeatures(payload, { dataProjection: "EPSG:4326", featureProjection: viewProjection }));
    }
  }
}

function intersects(a: number[], b: number[]) { return a[0] <= b[2] && a[2] >= b[0] && a[1] <= b[3] && a[3] >= b[1]; }
