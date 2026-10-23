import { readFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { APPLIANCE_IDS, APPLIANCE_LABELS, isApplianceId } from "@/features/appliances/config";
import type { ApplianceSummary } from "@/features/deploy/types";
import { errorDetail, isPythonDependencyError, projectPath, runPythonJson } from "@/server/python";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const appliances = await Promise.all(
    APPLIANCE_IDS.map(async (id): Promise<ApplianceSummary> => {
      const summaryPath = projectPath("dashboard", "data", id, "preprocessing_summary.json");
      const summary = JSON.parse(await readFile(summaryPath, "utf8"));
      return {
        id,
        label: APPLIANCE_LABELS[id],
        seriesIds: summary.series_ids as string[],
        seriesRows: (summary.series_rows ?? {}) as Record<string, number>,
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
  if (!isApplianceId(appliance)) {
    return NextResponse.json({ error: "지원하지 않는 가전입니다." }, { status: 400 });
  }
  const selected = appliances.find((item) => item.id === appliance);
  if (!selected?.seriesIds.includes(seriesId)) {
    return NextResponse.json({ error: "선택한 가전에 존재하지 않는 실측 시계열입니다." }, { status: 400 });
  }

  try {
    const result = await runPythonJson<{ points: unknown[] }>({
      cwd: "dashboard",
      script: "series_export.py",
      args: ["--appliance", appliance, "--series-id", seriesId],
    });
    return NextResponse.json({ appliance, seriesId, ...result });
  } catch (error) {
    return NextResponse.json({ error: "실증 데이터를 불러오지 못했습니다.", detail: errorDetail(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { appliance?: string; seriesId?: string };
    if (!isApplianceId(body.appliance)) {
      return NextResponse.json({ error: "지원하지 않는 가전입니다." }, { status: 400 });
    }

    const summaryPath = projectPath("dashboard", "data", body.appliance, "preprocessing_summary.json");
    const summary = JSON.parse(await readFile(summaryPath, "utf8"));
    if (!body.seriesId || !(summary.series_ids as string[]).includes(body.seriesId)) {
      return NextResponse.json({ error: "선택한 가전에 존재하지 않는 실측 시계열입니다." }, { status: 400 });
    }

    const result = await runPythonJson({
      cwd: "dashboard",
      script: "web_inference.py",
      args: ["--appliance", body.appliance, "--series-id", body.seriesId, "--device", "cpu"],
      timeout: 10 * 60 * 1000,
    });
    return NextResponse.json(result);
  } catch (error) {
    const detail = errorDetail(error);
    return NextResponse.json(
      {
        error: isPythonDependencyError(error)
          ? "예측용 Python 환경이 준비되지 않았습니다. dashboard/requirements.txt를 설치해 주세요."
          : "로컬 모델 예측 중 오류가 발생했습니다.",
        detail,
      },
      { status: 500 },
    );
  }
}
