import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { errorDetail, isPythonDependencyError, projectPath, runPython, runPythonJson } from "@/server/python";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type HouseholdMeta = { id: string; type: string; area: string; city: string; start: string; end: string; rows: number };

export async function GET() {
  try {
    const base = await runPythonJson<{ houses: HouseholdMeta[] }>({
      cwd: "household_chronos2",
      script: "catalog.py",
    });
    const html = await readFile(projectPath("public", "dash", "benchmark.html"), "utf8");
    const match = html.match(/const DATA=(.*?);\s*\n/);
    const benchmark = match ? Object.entries(JSON.parse(match[1]) as Record<string, { split: string; type: string; area: string; start: string; y: number[] }>).map(([id, house]) => ({ id, type: house.type, area: house.area, city: "개발 벤치마크", start: house.start, end: new Date(new Date(house.start.replace(" ", "T") + ":00:00").getTime() + (house.y.length - 1) * 3600000).toISOString().slice(0, 16).replace("T", " "), rows: house.y.length, split: house.split })) : [];
    return NextResponse.json({ houses: [...base.houses.map((house) => ({ ...house, split: "예측 데이터" })), ...benchmark] });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "가정 목록을 불러오지 못했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { houseId?: string };
    if (!body.houseId || !(/^(H\d{3}|house_\d+)$/.test(body.houseId))) return NextResponse.json({ error: "올바른 가정을 선택해 주세요." }, { status: 400 });
    const script = body.houseId.startsWith("house_") ? "benchmark_inference.py" : "inference.py";
    const stdout = await runPython({
      cwd: "household_chronos2",
      script,
      args: ["--house-id", body.houseId, "--device", "cpu"],
      timeout: 10 * 60 * 1000,
    });
    let forecast: Record<string, string | number>[];
    if (script === "benchmark_inference.py") forecast = JSON.parse(stdout);
    else {
      const csv = await readFile(projectPath("household_chronos2", "predictions", "next_24h.csv"), "utf8");
      const [header, ...lines] = csv.trim().split("\n"); const columns = header.split(",");
      forecast = lines.map((line) => { const values = line.split(","); return Object.fromEntries(columns.map((column, index) => [column, column === "timestamp" || column === "target_name" || column === "house_id" ? values[index] : Number(values[index])])); });
    }
    return NextResponse.json({ houseId: body.houseId, model: "Chronos-2 household checkpoint", horizonHours: 24, forecast });
  } catch (error) {
    const detail = errorDetail(error);
    return NextResponse.json({ error: isPythonDependencyError(error) ? "가정 예측용 Python 환경이 준비되지 않았습니다." : "가정 전체 사용량 예측 중 오류가 발생했습니다.", detail }, { status: 500 });
  }
}
