"use client";

import { useEffect, useRef, useState } from "react";
import Feature from "ol/Feature";
import Map from "ol/Map";
import View from "ol/View";
import GeoJSON from "ol/format/GeoJSON";
import Point from "ol/geom/Point";
import TileLayer from "ol/layer/Tile";
import VectorLayer from "ol/layer/Vector";
import Cluster from "ol/source/Cluster";
import OSM from "ol/source/OSM";
import VectorSource from "ol/source/Vector";
import { Circle as CircleStyle, Fill, Stroke, Style, Text } from "ol/style";
import { fromLonLat } from "ol/proj";
import { LoaderCircle, MapPinned } from "lucide-react";
import { Select } from "@/components/ui/field";
import { formatEur } from "@/lib/format";
import type { MunicipalityCode } from "@/lib/property-repository";

type Kind = "sales" | "rentals";
type Selection = { date?: string; amount?: number; marketability?: string; count?: number } | null;

export function MarketMapClient() {
  const target = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  const source = useRef(new VectorSource());
  const [municipality, setMunicipality] = useState<MunicipalityCode>("061");
  const [kind, setKind] = useState<Kind>("sales");
  const [loading, setLoading] = useState(true);
  const [count, setCount] = useState(0);
  const [selection, setSelection] = useState<Selection>(null);

  useEffect(() => {
    if (!target.current || map.current) return;
    const clusters = new Cluster({ distance: 38, minDistance: 12, source: source.current });
    const vector = new VectorLayer({
      source: clusters,
      style: (feature) => {
        const size = (feature.get("features") as Feature[]).length;
        const radius = size > 99 ? 18 : size > 9 ? 15 : 10;
        return new Style({
          image: new CircleStyle({ radius, fill: new Fill({ color: size > 1 ? "#28694fe6" : "#a46710e6" }), stroke: new Stroke({ color: "#fff", width: 2 }) }),
          text: size > 1 ? new Text({ text: String(size), fill: new Fill({ color: "#fff" }), font: "600 12px Segoe UI" }) : undefined,
        });
      },
    });
    map.current = new Map({
      target: target.current,
      layers: [new TileLayer({ source: new OSM({ crossOrigin: "anonymous" }) }), vector],
      view: new View({ center: fromLonLat([14.5058, 46.0569]), zoom: 12, minZoom: 8, maxZoom: 19 }),
    });
    map.current.on("singleclick", (event) => {
      const feature = map.current?.forEachFeatureAtPixel(event.pixel, (candidate) => candidate);
      const members = feature?.get("features") as Feature<Point>[] | undefined;
      if (!members?.length) return setSelection(null);
      if (members.length > 1) return setSelection({ count: members.length });
      const properties = members[0].getProperties();
      setSelection({ date: properties.date ? String(properties.date) : undefined, amount: properties.amount == null ? undefined : Number(properties.amount), marketability: properties.marketability ? String(properties.marketability) : undefined });
    });
    return () => { map.current?.setTarget(undefined); map.current = null; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/map?municipality=${municipality}&kind=${kind}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((geojson) => {
        const features = new GeoJSON().readFeatures(geojson, { dataProjection: "EPSG:4326", featureProjection: "EPSG:3857" });
        source.current.clear();
        source.current.addFeatures(features);
        setCount(features.length);
        const center = municipality === "008" ? [14.392, 46.02] : [14.5058, 46.0569];
        map.current?.getView().animate({ center: fromLonLat(center), zoom: municipality === "008" ? 13 : 12, duration: 300 });
      })
      .catch((error) => { if ((error as Error).name !== "AbortError") setCount(0); })
      .finally(() => setLoading(false));
    return () => controller.abort();
  }, [municipality, kind]);

  function changeMunicipality(next: MunicipalityCode) {
    setLoading(true);
    setSelection(null);
    setMunicipality(next);
  }

  function changeKind(next: Kind) {
    setLoading(true);
    setSelection(null);
    setKind(next);
  }

  return (
    <div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:w-[560px]">
        <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">Občina<Select value={municipality} onChange={(event) => changeMunicipality(event.target.value as MunicipalityCode)}><option value="061">Ljubljana</option><option value="008">Brezovica</option></Select></label>
        <label className="grid gap-1 text-xs font-semibold text-[var(--muted)]">Prikaz<Select value={kind} onChange={(event) => changeKind(event.target.value as Kind)}><option value="sales">Prodajni posli</option><option value="rentals">Najemni posli</option></Select></label>
      </div>
      <div className="relative overflow-hidden rounded-md border border-[var(--border)] bg-[#e9eeea]">
        <div ref={target} className="h-[62vh] min-h-[430px] w-full" aria-label="Interaktivni zemljevid poslov" />
        <div className="absolute left-3 top-3 flex min-h-9 items-center gap-2 rounded-md border border-[var(--border)] bg-white/95 px-3 text-xs font-semibold shadow-sm">
          {loading ? <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" /> : <MapPinned aria-hidden="true" className="h-4 w-4 text-[var(--accent)]" />}
          {loading ? "Nalaganje" : `${count.toLocaleString("sl-SI")} lokacij`}
        </div>
        {selection ? <div className="absolute bottom-3 left-3 right-3 max-w-sm rounded-md border border-[var(--border)] bg-white p-3 text-sm shadow-lg sm:right-auto">{selection.count ? <strong>{selection.count} poslov na tem območju</strong> : <><strong>{selection.amount == null ? "Znesek ni naveden" : formatEur(selection.amount)}</strong><p className="mt-1 text-xs text-[var(--muted)]">{[selection.date, selection.marketability].filter(Boolean).join(" · ")}</p></>}</div> : null}
      </div>
    </div>
  );
}
