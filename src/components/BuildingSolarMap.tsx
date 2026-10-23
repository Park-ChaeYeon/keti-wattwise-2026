"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState } from "react";
import DeckGL from "@deck.gl/react";
import { GeoJsonLayer } from "@deck.gl/layers";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

const MAP_STYLE = {
  version: 8 as const,
  sources: {
    carto: {
      type: "raster" as const,
      tiles: [
        "https://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
        "https://b.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png",
      ],
      tileSize: 256,
      attribution: "© CARTO © OpenStreetMap contributors",
    },
  },
  layers: [{ id: "carto", type: "raster" as const, source: "carto" }],
};

function ramp(p: number): [number, number, number] {
  const stops: [number, number[]][] = [
    [0.0, [255, 245, 200]],
    [0.35, [254, 196, 79]],
    [0.65, [236, 112, 20]],
    [0.85, [204, 41, 32]],
    [1.0, [128, 12, 20]],
  ];
  for (let i = 0; i < stops.length - 1; i++) {
    const [a, ca] = stops[i];
    const [b, cb] = stops[i + 1];
    if (p <= b) {
      const t = (p - a) / (b - a || 1);
      return [0, 1, 2].map((k) => Math.round(ca[k] + (cb[k] - ca[k]) * t)) as [number, number, number];
    }
  }
  return [128, 12, 20];
}

type FC = { meta?: { center?: [number, number]; count?: number } };
export type SelectedSolarBuilding = {
  idx: number;
  loc: [number, number];
  kwh: number;
  h: number;
  area: number;
  address?: string;
  source?: "search" | "dataset";
};
export type SearchedBuilding = { label: string; loc: [number, number]; geometry: GeoJSON.Geometry; addressType?: string };

function featureCenter(feature: any): [number, number] {
  const ring = feature.geometry?.coordinates?.[0] ?? [];
  if (!ring.length) return [127.028, 37.588];
  const total = ring.reduce((sum: [number, number], point: [number, number]) => [sum[0] + point[0], sum[1] + point[1]], [0, 0]);
  return [total[0] / ring.length, total[1] / ring.length];
}

function buildingArea(geometry: any, latitude: number) {
  if (geometry?.type !== "Polygon" || !geometry.coordinates?.[0]?.length) return 120;
  const ring = geometry.coordinates[0] as [number, number][];
  const mx = 111320 * Math.cos(latitude * Math.PI / 180);
  const my = 110540;
  let sum = 0;
  for (let i = 0; i < ring.length; i++) {
    const [x1, y1] = ring[i]; const [x2, y2] = ring[(i + 1) % ring.length];
    sum += x1 * mx * y2 * my - x2 * mx * y1 * my;
  }
  return Math.max(20, Math.round(Math.abs(sum) / 2));
}

export default function BuildingSolarMap({
  focusIdx,
  focusLoc,
  height = 460,
  onBuildingSelect,
  searchedBuilding,
}: {
  focusIdx?: number;
  focusLoc?: [number, number];
  height?: number;
  onBuildingSelect?: (building: SelectedSolarBuilding) => void;
  searchedBuilding?: SearchedBuilding;
}) {
  const [data, setData] = useState<(GeoJSON.FeatureCollection & FC) | null>(null);
  const [hover, setHover] = useState<{ x: number; y: number; kwh: number; h: number; area: number } | null>(null);

  useEffect(() => {
    fetch("/seoul_buildings.geojson")
      .then((r) => r.json())
      .then((d: GeoJSON.FeatureCollection & FC) => {
        d.features.forEach((f, i) => ((f.properties as any).idx = i));
        setData(d);
      })
      .catch(() => setData(null));
  }, []);

  const center = focusLoc ?? data?.meta?.center ?? [127.028, 37.588];
  const focused = typeof focusIdx === "number";
  const focusLongitude = focusLoc?.[0];
  const focusLatitude = focusLoc?.[1];
  const [viewState, setViewState] = useState({ longitude: center[0], latitude: center[1], zoom: 15.2, pitch: 52, bearing: -18 });

  useEffect(() => {
    if (focusLongitude == null || focusLatitude == null) return;
    setViewState((v) => ({ ...v, longitude: focusLongitude, latitude: focusLatitude, zoom: focused ? 17.4 : 16.3, pitch: 55 }));
  }, [focusLongitude, focusLatitude, focused]);

  const layer = new GeoJsonLayer({
    id: "buildings",
    data: data ?? { type: "FeatureCollection", features: [] },
    extruded: true,
    getElevation: (f: any) => (f.properties.idx === focusIdx ? f.properties.h * 1.4 + 10 : f.properties.h),
    getFillColor: (f: any) =>
      f.properties.idx === focusIdx
        ? [10, 154, 168, 255]
        : ([...ramp(f.properties.p), focused ? 150 : 235] as [number, number, number, number]),
    getLineColor: (f: any) => (f.properties.idx === focusIdx ? [255, 255, 255, 255] : [255, 255, 255, 40]),
    lineWidthMinPixels: (focused ? 1.5 : 0.5) as any,
    pickable: true,
    onHover: (info: any) =>
      setHover(
        info.object
          ? { x: info.x, y: info.y, kwh: info.object.properties.kwh, h: info.object.properties.h, area: info.object.properties.area }
          : null
      ),
    onClick: (info: any) => {
      if (!info.object || !onBuildingSelect) return;
      const props = info.object.properties;
      onBuildingSelect({ idx: props.idx, loc: featureCenter(info.object), kwh: props.kwh, h: props.h, area: props.area, source: "dataset" });
    },
    updateTriggers: { getFillColor: focusIdx, getElevation: focusIdx, getLineColor: focusIdx },
  });

  const searchGeometry = searchedBuilding?.geometry?.type === "Point"
    ? { type: "Polygon", coordinates: [[[-0.00007, -0.000055], [0.00007, -0.000055], [0.00007, 0.000055], [-0.00007, 0.000055], [-0.00007, -0.000055]].map(([x, y]) => [searchedBuilding.loc[0] + x, searchedBuilding.loc[1] + y])] }
    : searchedBuilding?.geometry;
  const searchedArea = searchedBuilding ? buildingArea(searchGeometry, searchedBuilding.loc[1]) : 0;
  const searchedKwh = Math.round(searchedArea * 245);
  const searchedLayer = searchedBuilding && new GeoJsonLayer({
    id: "searched-building",
    data: { type: "Feature", geometry: searchGeometry, properties: {} } as any,
    extruded: true,
    getElevation: 22,
    getFillColor: [10, 154, 168, 210],
    getLineColor: [255, 255, 255, 255],
    lineWidthMinPixels: 3,
    pickable: true,
    onClick: () => onBuildingSelect?.({ idx: -1, loc: searchedBuilding.loc, area: searchedArea, h: 12, kwh: searchedKwh, address: searchedBuilding.label, source: "search" }),
  });

  return (
    <div className="relative w-full overflow-hidden rounded-xl" style={{ height }}>
      <DeckGL
        viewState={viewState}
        onViewStateChange={({ viewState: next }: any) => setViewState(next)}
        controller={true}
        layers={searchedLayer ? [layer, searchedLayer] : [layer]}
      >
        <Map reuseMaps mapStyle={MAP_STYLE as any} />
      </DeckGL>

      {hover && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg bg-ink/90 px-3 py-2 text-xs text-white shadow-pop"
          style={{ left: hover.x + 12, top: hover.y + 12 }}
        >
          <div className="font-bold">옥상 {hover.area.toLocaleString()}㎡ · {hover.h}m</div>
          <div>연 발전 잠재량 <b>{hover.kwh.toLocaleString()}kWh</b></div>
        </div>
      )}

      <div className="absolute bottom-3 left-3 z-10 rounded-lg bg-white/90 p-2.5 text-xs shadow-card">
        <div className="mb-1 font-semibold text-slate-600">발전 잠재량</div>
        <div className="h-2 w-40 rounded" style={{ background: "linear-gradient(90deg,#fff5c8,#fec44f,#ec7014,#cc2920,#800c14)" }} />
        <div className="mt-0.5 flex justify-between text-[10px] text-slate-400"><span>낮음</span><span>높음</span></div>
      </div>

      {data && (
        <div className="absolute right-3 top-3 z-10 rounded-lg bg-white/90 px-2.5 py-1.5 text-[11px] shadow-card">
          {focused ? (
            <span className="font-semibold text-teal">📍 선택한 건물 (하이라이트)</span>
          ) : (
            <span className="text-slate-500">서울 안암·고려대 인근 · 실제 건물 {data.meta?.count?.toLocaleString()}동 (OSM)</span>
          )}
        </div>
      )}
      {searchedBuilding && (
        <button type="button" onClick={() => onBuildingSelect?.({ idx: -1, loc: searchedBuilding.loc, area: searchedArea, h: 12, kwh: searchedKwh, address: searchedBuilding.label, source: "search" })} className="absolute left-1/2 top-3 z-20 -translate-x-1/2 rounded-full bg-teal px-3 py-1.5 text-xs font-bold text-white shadow-pop">
          정확한 검색 건물 · 상세 보기
        </button>
      )}
    </div>
  );
}
