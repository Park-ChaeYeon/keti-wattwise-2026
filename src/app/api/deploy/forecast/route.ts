import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { NextResponse } from "next/server";
import { pythonExecutable } from "@/lib/pythonRuntime";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const execFileAsync = promisify(execFile);
const APPLIANCES = ["tv", "에어컨", "제습기", "세탁기"] as const;

export async function GET(request: Request) {
  const root = process.cwd();
  const appliances = await Promise.all(
    APPLIANCES.map(async (id) => {
      const summaryPath = path.join(root, "dashboard", "data", id, "preprocessing_summary.json");
      const summary = JSON.parse(await readFile(summaryPath, "utf8"));
      return {
        id,
        label: id === "tv" ? "TV" : id,
        seriesIds: summary.series_ids as string[],
        rows: summary.valid_target_rows as number,
        periodStart: summary.period_start as string,
        periodEnd: summary.period_end as string,
      };
    }),
  );
  const { searchParams } = new URL(request.url);
  const appliance = searchParams.get("appliance");
  const seriesId = searchParams.get("seriesId");
  if (!appliance || !seriesId) return NextResponse.json({ appliances });
  if (!APPLIANCES.includes(appliance as (typeof APPLIANCES)[number])) {
    return NextResponse.json({ error: "지원하지 않는 가전입니다." }, { status: 400 });
  }
  const selected = appliances.find((item) => item.id === appliance);
  if (!selected?.seriesIds.includes(seriesId)) {
    return NextResponse.json({ error: "선택한 가전에 존재하지 않는 실측 시계열입니다." }, { status: 400 });
  }

  try {
    const python = await pythonExecutable(root);
    const parquet = path.join(root, "dashboard", "data", appliance, "chronos_hourly.parquet");
    const code = [
      "import json, pandas as pd, sys",
      "d=pd.read_parquet(sys.argv[1])",
      "d=d[d.house_id.astype(str)==sys.argv[2]].sort_values('timestamp')",
      "points=[{'timestamp':r.timestamp.isoformat(),'kwh':round(float(r.target_kwh),6),'coverage':round(float(r.hourly_coverage),4)} for r in d.itertuples()]",
      "print(json.dumps({'points':points},ensure_ascii=False))",
    ].join("\n");
    const { stdout } = await execFileAsync(python, ["-c", code, parquet, seriesId], { timeout: 30_000, maxBuffer: 10 * 1024 * 1024 });
    return NextResponse.json({ appliance, seriesId, ...JSON.parse(stdout.trim()) });
  } catch (error) {
    return NextResponse.json({ error: "실증 데이터를 불러오지 못했습니다.", detail: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { appliance?: string; seriesId?: string };
    if (!APPLIANCES.includes(body.appliance as (typeof APPLIANCES)[number])) {
      return NextResponse.json({ error: "지원하지 않는 가전입니다." }, { status: 400 });
    }

    const root = process.cwd();
    const summaryPath = path.join(root, "dashboard", "data", body.appliance!, "preprocessing_summary.json");
    const summary = JSON.parse(await readFile(summaryPath, "utf8"));
    if (!body.seriesId || !(summary.series_ids as string[]).includes(body.seriesId)) {
      return NextResponse.json({ error: "선택한 가전에 존재하지 않는 실측 시계열입니다." }, { status: 400 });
    }

    const python = await pythonExecutable(root);
    const script = path.join(root, "dashboard", "web_inference.py");
    const { stdout } = await execFileAsync(
      python,
      [script, "--appliance", body.appliance!, "--series-id", body.seriesId, "--device", "cpu"],
      { cwd: path.join(root, "dashboard"), timeout: 10 * 60 * 1000, maxBuffer: 10 * 1024 * 1024 },
    );
    return NextResponse.json(JSON.parse(stdout.trim()));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    const dependencyMissing = /No module named|ModuleNotFoundError|chronos/i.test(detail);
    return NextResponse.json(
      {
        error: dependencyMissing
          ? "예측용 Python 환경이 준비되지 않았습니다. dashboard/requirements.txt를 설치해 주세요."
          : "로컬 모델 예측 중 오류가 발생했습니다.",
        detail,
      },
      { status: 500 },
    );
  }
}
