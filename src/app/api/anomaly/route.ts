import { NextResponse } from "next/server";
import { errorDetail, runPythonJson } from "@/server/python";

const SCENARIOS = ["normal", "always_on", "cooking_loss", "inactive", "night_loss", "away"] as const;

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { scenario?: string };
    if (!body.scenario || !SCENARIOS.includes(body.scenario as (typeof SCENARIOS)[number])) {
      return NextResponse.json({ error: "지원하지 않는 시나리오입니다." }, { status: 400 });
    }
    const result = await runPythonJson({
      cwd: "household_chronos2",
      script: "anomaly_inference.py",
      args: ["--scenario", body.scenario],
      timeout: 60_000,
    });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: errorDetail(error) || "모델 추론에 실패했습니다." }, { status: 500 });
  }
}
