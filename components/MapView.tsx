"use client";

import { useCallback, useState } from "react";
import { Layers3 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckboxField, Select } from "@/components/ui/field";
import { GursOrthoMap } from "@/components/GursOrthoMap";
import { formatNumber } from "@/lib/format";
import type { EnrichedTransaction } from "@/lib/schemas";

export type VisibleMapLayers = {
  sales: boolean;
  rentals: boolean;
  parcels: boolean;
  buildings: boolean;
};

export type MapBaseMode = "basic" | "ortho" | "none";
export type MapColorMode = "category" | "quality";

export function MapView({ rows, compact = false }: { rows: EnrichedTransaction[]; compact?: boolean }) {
  const [baseMode, setBaseMode] = useState<MapBaseMode>("basic");
  const [colorMode, setColorMode] = useState<MapColorMode>("category");
  const [layers, setLayers] = useState<VisibleMapLayers>({ sales: true, rentals: false, parcels: false, buildings: false });
  const [mapNotice, setMapNotice] = useState<string | null>(null);

  function toggleLayer(key: keyof VisibleMapLayers, value: boolean) {
    setLayers((current) => ({ ...current, [key]: value }));
  }

  const handleOrthoUnavailable = useCallback(() => {
    setMapNotice("GURS ortofoto trenutno ni dosegljiv. Prikazana je osnovna podlaga.");
    setBaseMode("basic");
  }, []);

  if (compact) {
    return (
      <GursOrthoMap
        rows={rows}
        layers={layers}
        mode="basic"
        colorMode={colorMode}
        compact
        onUnavailable={handleOrthoUnavailable}
      />
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <CardTitle>Zemljevid poslov n = {formatNumber(rows.filter((item) => item.coordinate).length)}</CardTitle>
          <p className="mt-1 text-sm text-[var(--muted)]">Katastrski sloji se naložijo šele pri ustrezni povečavi.</p>
        </div>
        <div className="flex flex-wrap items-end gap-4">
          <label className="grid gap-1 text-sm font-medium">
            <span>Podlaga</span>
            <Select value={baseMode} onChange={(event) => setBaseMode(event.target.value as MapBaseMode)}>
              <option value="basic">Osnovni zemljevid</option>
              <option value="ortho">GURS ortofoto</option>
              <option value="none">Brez podlage</option>
            </Select>
          </label>
          <label className="grid gap-1 text-sm font-medium">
            <span>Barvanje prodaj</span>
            <Select value={colorMode} onChange={(event) => setColorMode(event.target.value as MapColorMode)}>
              <option value="category">Kategorija</option>
              <option value="quality">Kakovost</option>
            </Select>
          </label>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {mapNotice ? <p className="rounded-md border border-[#ead7b7] bg-[#fff8e9] px-3 py-2 text-sm text-[#68420d]">{mapNotice}</p> : null}
        <div className="flex flex-wrap items-center gap-4 rounded-md border border-[var(--border)] bg-[#f7f8f5] px-3 py-2">
          <span className="inline-flex items-center gap-2 text-sm font-semibold"><Layers3 aria-hidden="true" className="h-4 w-4" />Sloji</span>
          <CheckboxField label="Prodajni posli" checked={layers.sales} onChange={(value) => toggleLayer("sales", value)} />
          <CheckboxField label="Najemni posli" checked={layers.rentals} onChange={(value) => toggleLayer("rentals", value)} />
          <CheckboxField label="Parcelne meje" checked={layers.parcels} onChange={(value) => toggleLayer("parcels", value)} />
          <CheckboxField label="Stavbe" checked={layers.buildings} onChange={(value) => toggleLayer("buildings", value)} />
        </div>
        <GursOrthoMap
          rows={rows}
          layers={layers}
          mode={baseMode}
          colorMode={colorMode}
          onUnavailable={handleOrthoUnavailable}
        />
        <div className="flex flex-wrap gap-4 text-sm text-[var(--muted)]">
          <span>Prodaje: barvne točke.</span><span>Najemi: rožnati krogi.</span><span>Parcele: zelene meje.</span><span>Stavbe: temne točke.</span>
        </div>
      </CardContent>
    </Card>
  );
}
