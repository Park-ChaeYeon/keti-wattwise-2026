import { NextRequest, NextResponse } from "next/server";

const LOCAL_PLACES = [
  { keys: ["고려대", "고려대학교"], label: "고려대학교 서울캠퍼스", lat: 37.5894, lon: 127.0324 },
  { keys: ["안암역", "안암"], label: "안암역", lat: 37.5863, lon: 127.0290 },
  { keys: ["고대병원", "고려대학교병원"], label: "고려대학교 안암병원", lat: 37.5871, lon: 127.0265 },
  { keys: ["개운사"], label: "개운사", lat: 37.5891, lon: 127.0285 },
];

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.trim();
  if (!query) return NextResponse.json({ error: "검색어를 입력해 주세요." }, { status: 400 });

  const local = LOCAL_PLACES.find((place) => place.keys.some((key) => query.replaceAll(" ", "").includes(key)));
  if (local) return NextResponse.json({ ...local, geometry: { type: "Point", coordinates: [local.lon, local.lat] }, addressType: "place" });

  try {
    const url = new URL("https://nominatim.openstreetmap.org/search");
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("limit", "1");
    url.searchParams.set("countrycodes", "kr");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("polygon_geojson", "1");
    const response = await fetch(url, { headers: { "User-Agent": "WattWise/1.0 location search" }, next: { revalidate: 86400 } });
    if (!response.ok) throw new Error("geocoding failed");
    const [result] = await response.json();
    if (!result) return NextResponse.json({ error: "검색 결과를 찾지 못했습니다." }, { status: 404 });
    return NextResponse.json({
      label: result.display_name,
      lat: Number(result.lat),
      lon: Number(result.lon),
      geometry: result.geojson ?? { type: "Point", coordinates: [Number(result.lon), Number(result.lat)] },
      addressType: result.type ?? result.addresstype ?? "address",
      osmId: result.osm_id,
    });
  } catch {
    return NextResponse.json({ error: "위치 검색에 잠시 문제가 생겼습니다." }, { status: 502 });
  }
}
