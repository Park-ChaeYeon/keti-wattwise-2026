"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { bill, tierOf, won } from "@/lib/domain";
import {
  CATALOG,
  INITIAL_SETTINGS,
  SCENARIOS,
  SCENARIO_COPY,
  calculateHouseholdUsage,
  type ApplianceSetting,
  type DemoResult,
  type ForecastPoint,
  type HouseholdMeta,
  type Occupancy,
  type Sensitivity,
} from "@/features/households/model";

const AMBER = "#E39A00";
const TEAL = "#0A9AA8";

export default function HouseholdsPage() {
  const [mode, setMode] = useState<"demo" | "direct">("demo");
  const [homeType, setHomeType] = useState("아파트");
  const [residents, setResidents] = useState(2);
  const [occupancy, setOccupancy] = useState<Occupancy>("normal");
  const [sensitivity, setSensitivity] = useState<Sensitivity>("normal");
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [demoState, setDemoState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [demoError, setDemoError] = useState("");
  const [demo, setDemo] = useState<DemoResult | null>(null);

  const result = useMemo(
    () => calculateHouseholdUsage(settings, residents, occupancy, sensitivity),
    [occupancy, residents, sensitivity, settings],
  );

  const riskTone = result.score >= 70 ? "text-danger" : result.score >= 35 ? "text-amber" : "text-teal";
  const status = result.score >= 70 ? "확인 필요" : result.score >= 35 ? "주의 관찰" : "정상 범위";
  const sensitivityLabel = sensitivity === "sensitive" ? "민감하게" : sensitivity === "relaxed" ? "낮게" : "보통";

  function update(id: string, patch: Partial<ApplianceSetting>) {
    setSettings((current) => ({ ...current, [id]: { ...current[id], ...patch } }));
  }

  const loadDemo = useCallback(async () => {
    setDemoState("loading");
    setDemoError("");
    try {
      const listResponse = await fetch("/api/household-forecast");
      const listData = await listResponse.json() as { houses?: HouseholdMeta[]; error?: string };
      if (!listResponse.ok || !listData.houses?.length) throw new Error(listData.error ?? "진단할 가구 데이터를 찾지 못했습니다.");
      const stored = sessionStorage.getItem("wattwise-demo");
      const saved = stored ? JSON.parse(stored) as { houseId?: string; scenario?: string } : null;
      const available = listData.houses.filter((house) => /^(H\d{3}|house_\d+)$/.test(house.id));
      const house = available.find((item) => item.id === saved?.houseId) ?? available[Math.floor(Math.random() * available.length)];
      const scenario = SCENARIOS.includes(saved?.scenario as typeof SCENARIOS[number]) ? saved!.scenario! : SCENARIOS[Math.floor(Math.random() * SCENARIOS.length)];
      sessionStorage.setItem("wattwise-demo", JSON.stringify({ houseId: house.id, scenario }));
      const [forecastResponse, anomalyResponse] = await Promise.all([
        fetch("/api/household-forecast", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ houseId: house.id }) }),
        fetch("/api/anomaly", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scenario }) }),
      ]);
      const forecastData = await forecastResponse.json() as { forecast?: ForecastPoint[]; error?: string };
      const anomalyData = await anomalyResponse.json() as DemoResult["anomaly"] & { error?: string };
      if (!forecastResponse.ok || !forecastData.forecast?.length) throw new Error(forecastData.error ?? "예측 결과를 만들지 못했습니다.");
      if (!anomalyResponse.ok || anomalyData.error) throw new Error(anomalyData.error ?? "이상탐지 결과를 만들지 못했습니다.");
      const forecast = forecastData.forecast.map((point, index) => {
        const rawExpected = point["0.5"] ?? point.prediction_kwh ?? 0;
        const date = point.timestamp ? new Date(point.timestamp) : null;
        const low = point["0.1"] ?? rawExpected * 0.8;
        const high = point["0.9"] ?? rawExpected * 1.2;
        return { hour: date && !Number.isNaN(date.getTime()) ? `${date.getHours()}시` : `${index}시`, low, expected: rawExpected, high, range: Math.max(0, high - low) };
      });
      const daily = forecast.reduce((sum, point) => sum + point.expected, 0);
      setDemo({ house, forecast, monthly: daily * 30, anomaly: anomalyData });
      setDemoState("done");
    } catch (error) {
      setDemoState("error");
      setDemoError(error instanceof Error ? error.message : "자동 진단에 실패했습니다.");
    }
  }, []);

  useEffect(() => { void loadDemo(); }, [loadDemo]);

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#11181c] px-7 py-9 text-white shadow-pop md:px-10 md:py-11">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-danger/15 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-teal/15 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_0.42fr]">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#ff9d8e]"><span className="h-2 w-2 rounded-full bg-danger" />Smart home safety</div>
            <h1 className="mt-5 break-keep text-3xl font-black leading-tight tracking-[-0.035em] md:text-5xl">평소와 다른 전력 사용을<br /><span className="text-[#ff9d8e]">먼저 발견합니다.</span></h1>
            <p className="mt-5 max-w-2xl break-keep text-sm leading-7 text-white/60">오늘의 전력 흐름을 평소 생활 패턴과 비교해 장시간 활동이 없거나 갑자기 사용량이 달라진 순간을 찾고, 확인이 필요한 신호를 알려드립니다.</p>
            <Link href="/analytics" className="mt-7 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs font-bold text-white/75 transition hover:bg-white/10 hover:text-white">전력 사용량 예측 보기 ↗</Link>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger/20 text-xl text-[#ff9d8e]">⌁</div>
            <div className="mt-5 text-sm font-black">생활 신호를 놓치지 않도록</div>
            <p className="mt-2 break-keep text-xs leading-6 text-white/45">변화가 감지되면 상태와 원인, 확인할 행동을 한눈에 안내합니다.</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 p-1.5">
        <div className="grid gap-2 sm:grid-cols-2">
          <button type="button" onClick={() => setMode("demo")} className={`rounded-xl p-4 text-left transition ${mode === "demo" ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:bg-white/60"}`}>
            <div className={`text-[10px] font-black tracking-[0.12em] ${mode === "demo" ? "text-danger" : "text-slate-400"}`}>RECOMMENDED</div><div className="mt-1 font-extrabold">이상 신호 자동 점검</div><div className="mt-1 text-xs text-slate-500">최근 전력 패턴에서 평소와 다른 신호를 즉시 확인</div>
          </button>
          <button type="button" onClick={() => setMode("direct")} className={`rounded-xl p-4 text-left transition ${mode === "direct" ? "bg-white text-ink shadow-sm" : "text-slate-500 hover:bg-white/60"}`}>
            <div className={`text-[10px] font-black tracking-[0.12em] ${mode === "direct" ? "text-amber" : "text-slate-400"}`}>CUSTOM</div><div className="mt-1 font-extrabold">내 가전 직접 점검</div><div className="mt-1 text-xs text-slate-500">평소와 오늘의 사용시간을 비교해 이상 여부 확인</div>
          </button>
        </div>
      </section>

      {mode === "demo" ? (
        <>
          <section className="card border-l-4 border-l-danger p-6 md:p-7">
            <div className="flex items-start gap-4"><div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-danger-soft text-lg text-danger">!</div><div><div className="flex items-center gap-2 text-xs font-bold text-danger"><span className="h-1.5 w-1.5 rounded-full bg-danger" />전력 이상 점검</div><h2 className="mt-1.5 text-xl font-black">확인이 필요한 이상 신호를 점검합니다</h2><p className="mt-2 max-w-2xl break-keep text-sm leading-6 text-slate-500">최근 전력 신호를 우리 집의 평소 기준선과 비교해 이상 징후를 찾고, 발견된 신호에 맞는 확인 방법을 안내합니다.</p></div></div>
          </section>

          {demoState === "error" && <div className="rounded-xl bg-danger-soft p-5 text-sm text-danger">{demoError}<button type="button" className="ml-3 underline" onClick={() => void loadDemo()}>다시 시도</button></div>}
          {demoState === "loading" && !demo && <div className="card flex min-h-[360px] flex-col items-center justify-center"><span className="h-8 w-8 animate-spin rounded-full border-4 border-danger/20 border-t-danger" /><div className="mt-4 font-bold">이상 신호를 점검하고 있습니다</div><p className="mt-1 text-xs text-slate-400">최근 전력 패턴을 평소 기준선과 비교합니다.</p></div>}
          {demo && <>
            <div className="grid gap-4 md:grid-cols-4">
              <Kpi label="현재 진단 상태" value={demo.anomaly.isAnomaly ? "확인 필요" : "정상 범위"} tone={demo.anomaly.isAnomaly ? "text-danger" : "text-teal"} sub={demo.anomaly.isAnomaly ? "평소와 다른 신호 감지" : "평소 사용 범위 유지"} />
              <Kpi label="기준선 편차" value={`${Math.min(999, Math.round(demo.anomaly.score / Math.max(0.001, demo.anomaly.threshold) * 100))}%`} tone={demo.anomaly.isAnomaly ? "text-danger" : "text-teal"} sub="100% 이상이면 확인 필요" />
              <Kpi label="탐지 결과" value={SCENARIO_COPY[demo.anomaly.scenario]?.title ?? "전력 패턴 점검"} sub="AI가 감지한 주요 신호" />
              <Kpi label="판단 기준" value={demo.anomaly.threshold.toFixed(2)} sub={`현재 모델 점수 ${demo.anomaly.score.toFixed(2)}`} />
            </div>
            <div className="grid gap-4 lg:grid-cols-[0.8fr_1.2fr]">
              <AnomalyCard anomaly={demo.anomaly} />
              <section className="card p-5"><div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-sm font-bold">참고 · 다음 24시간 사용량</div><div className="mt-1 text-xs text-slate-400">이상 신호 판단을 돕는 보조 예측 정보입니다</div></div><div className="flex items-center gap-3 text-[10px] text-slate-400"><span><i className="mr-1 inline-block h-0.5 w-4 bg-teal align-middle" />중앙 예측</span><span><i className="mr-1 inline-block h-2 w-4 bg-teal/15 align-middle" />10–90% 범위</span></div></div><div className="mt-4 h-72"><ResponsiveContainer><ComposedChart data={demo.forecast} margin={{ left: -8, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" vertical={false} /><XAxis dataKey="hour" interval={2} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} /><YAxis width={42} tick={{ fontSize: 10, fill: "#94a3b8" }} unit="k" axisLine={false} tickLine={false} /><Tooltip formatter={(v: number, name: string) => [`${v.toFixed(2)}kWh`, name === "expected" ? "중앙 예측" : name === "range" ? "예측 구간 폭" : "하한"]} /><Area dataKey="low" stackId="interval" stroke="none" fill="transparent" isAnimationActive={false} /><Area dataKey="range" stackId="interval" stroke="none" fill={TEAL} fillOpacity={0.13} isAnimationActive={false} /><Line dataKey="expected" stroke={TEAL} strokeWidth={2.5} dot={false} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div><div className="mt-2 flex justify-between border-t border-slate-100 pt-3 text-xs text-slate-400"><span>{demo.house.type} · {demo.house.area}</span><span>{demo.house.rows.toLocaleString()}시간 데이터</span></div></section>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              <Kpi label="참고 · 내일 예상 사용량" value={`${(demo.monthly / 30).toFixed(1)}kWh`} sub="향후 24시간 중앙 예측" />
              <Kpi label="참고 · 월 예상 사용량" value={`${Math.round(demo.monthly)}kWh`} sub="24시간 예측 × 30일" />
              <Kpi label="참고 · 예상 전기요금" value={won(bill(demo.monthly).total)} tone="text-amber" sub={`${tierOf(demo.monthly)}구간 요금`} />
            </div>
          </>}
        </>
      ) : (
        <>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4"><div className="text-sm font-bold">1. 우리 집 기본 조건</div><div className="mt-1 text-xs text-slate-400">가구 조건은 기본 부하와 시간대별 사용 패턴에 반영됩니다.</div></div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 lg:grid-cols-4">
          <label><span className="label">주거 형태</span><select className="input" value={homeType} onChange={(e) => setHomeType(e.target.value)}><option>아파트</option><option>빌라·다세대</option><option>단독주택</option><option>오피스텔·원룸</option></select></label>
          <label><span className="label">거주 인원</span><div className="relative"><input className="input pr-9" type="number" min="1" max="10" value={residents} onChange={(e) => setResidents(Math.max(1, +e.target.value))} /><span className="absolute right-3 top-2 text-sm text-slate-400">명</span></div></label>
          <label><span className="label">평소 재실 패턴</span><select className="input" value={occupancy} onChange={(e) => setOccupancy(e.target.value as typeof occupancy)}><option value="away">낮 시간 외출</option><option value="normal">출퇴근·일반</option><option value="home">재택·종일 재실</option></select></label>
          <label><span className="label">이상 감지 민감도</span><select className="input" value={sensitivity} onChange={(e) => setSensitivity(e.target.value as typeof sensitivity)}><option value="relaxed">낮게</option><option value="normal">보통</option><option value="sensitive">민감하게</option></select></label>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4"><div className="text-sm font-bold">2. 가전과 사용시간 선택</div><div className="mt-1 text-xs text-slate-400">평소 시간은 예측 기준, 오늘 시간은 이상탐지 관측값으로 사용합니다.</div></div>
        <div className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
          {CATALOG.map((item) => {
            const setting = settings[item.id];
            return <div key={item.id} className={`bg-white p-4 transition ${setting.enabled ? "" : "opacity-55"}`}>
              <div className="flex items-center justify-between"><label className="flex cursor-pointer items-center gap-2 font-semibold"><input type="checkbox" checked={setting.enabled} onChange={(e) => update(item.id, { enabled: e.target.checked })} className="h-4 w-4 accent-ink" /><span>{item.icon} {item.name}</span></label><span className="text-xs text-slate-400">{item.watt.toLocaleString()}W</span></div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label><span className="text-[10px] font-semibold text-slate-400">평소 하루</span><div className="relative mt-1"><input className="input !py-1.5 pr-7" type="number" min="0" max="24" step="0.5" disabled={!setting.enabled} value={setting.hours} onChange={(e) => update(item.id, { hours: Math.min(24, Math.max(0, +e.target.value)) })} /><span className="absolute right-2 top-1.5 text-xs text-slate-400">h</span></div></label>
                <label><span className="text-[10px] font-semibold text-teal">오늘 관측</span><div className="relative mt-1"><input className="input !py-1.5 pr-7 focus:border-teal focus:ring-teal/10" type="number" min="0" max="24" step="0.5" disabled={!setting.enabled} value={setting.todayHours} onChange={(e) => update(item.id, { todayHours: Math.min(24, Math.max(0, +e.target.value)) })} /><span className="absolute right-2 top-1.5 text-xs text-slate-400">h</span></div></label>
              </div>
            </div>;
          })}
        </div>
      </section>

      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="현재 진단 상태" value={status} tone={riskTone} sub={result.unusual.length ? "확인이 필요한 가전이 있습니다" : "평소 사용 범위입니다"} />
        <Kpi label="편차 점수" value={`${result.score}/100`} tone={riskTone} sub={`판단 기준 ${(result.threshold * 100).toFixed(0)}%`} />
        <Kpi label="확인 필요 가전" value={`${result.unusual.length}개`} tone={result.unusual.length ? "text-danger" : "text-teal"} sub={`전체 선택 가전 ${result.selected.length}개`} />
        <Kpi label="감지 민감도" value={sensitivityLabel} sub="설정한 이상 판단 수준" />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_0.65fr]">
        <section className="card p-5">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><div className="text-sm font-bold">평소 패턴과 오늘 사용 비교</div><div className="mt-1 text-xs text-slate-400">예상 범위를 벗어난 시간대와 사용 변화를 확인합니다</div></div><div className="flex gap-3 text-[11px]"><span className="text-teal">━ 오늘 관측</span><span className="text-amber">━ 평소 예상</span></div></div>
          <div className="mt-4 h-72"><ResponsiveContainer><ComposedChart data={result.hourly} margin={{ left: -8, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" /><XAxis dataKey="hour" interval={2} tick={{ fontSize: 10, fill: "#94a3b8" }} /><YAxis width={42} tick={{ fontSize: 10, fill: "#94a3b8" }} unit="k" /><Tooltip formatter={(v: number, name) => [`${v.toFixed(2)}kWh`, name]} /><Area dataKey="high" stroke="none" fill={AMBER} fillOpacity={0.1} /><Area dataKey="low" stroke="none" fill="white" /><Line dataKey="expected" name="평소 예상" stroke={AMBER} strokeWidth={2.5} dot={false} /><Line dataKey="observed" name="오늘 관측" stroke={TEAL} strokeWidth={2} dot={false} /></ComposedChart></ResponsiveContainer></div>
        </section>
        <section className="card p-5">
          <div className="text-sm font-bold">이상 신호 및 권장 조치</div>
          <div className={`mt-4 text-3xl font-black ${riskTone}`}>{status}</div>
          <div className="mt-1 text-xs text-slate-400">민감도 기준 편차 {(result.threshold * 100).toFixed(0)}% 초과 감지</div>
          <div className="mt-5 space-y-2">
            {result.unusual.length ? result.unusual.slice(0, 4).map((item) => <div key={item.id} className="rounded-lg bg-danger-soft p-3"><div className="flex items-center justify-between text-sm"><b>{item.icon} {item.name}</b><span className="font-bold text-danger">{item.deviation > 1 ? "+100%" : `${Math.round(item.deviation * 100)}%`} 편차</span></div><div className="mt-1 text-xs text-slate-500">평소 {settings[item.id].hours}h → 오늘 {settings[item.id].todayHours}h</div></div>) : <div className="rounded-lg bg-teal-soft p-4 text-sm leading-6 text-slate-600">선택한 모든 가전이 평소 사용 범위 안에 있습니다.</div>}
          </div>
          <p className="mt-4 text-[11px] leading-5 text-slate-400">전력 패턴의 편차를 감지하는 간이 모델이며, 고장이나 응급상황을 확정하지 않습니다.</p>
        </section>
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4"><div className="text-sm font-bold">가전별 이상 신호 상세</div><div className="mt-1 text-xs text-slate-400">평소 사용량과 오늘 관측값의 차이를 가전별로 확인합니다.</div></div>
        <div className="divide-y divide-slate-100 px-5">
          {result.applianceRows.map((item) => <div key={item.id} className="grid items-center gap-2 py-3 text-sm sm:grid-cols-[1fr_120px_120px]"><div className="font-medium">{item.icon} {item.name} <span className="ml-2 text-xs font-normal text-slate-400">{item.watt.toLocaleString()}W</span></div><div><span className="text-xs text-slate-400">월 예상 </span><b>{item.normal.toFixed(1)}kWh</b></div><div className={item.deviation > result.threshold ? "font-bold text-danger" : "text-slate-500"}>오늘 {item.today.toFixed(1)}kWh</div></div>)}
        </div>
      </section>
        </>
      )}
    </div>
  );
}

function Kpi({ label, value, sub, tone = "text-ink" }: { label: string; value: string; sub?: string; tone?: string }) {
  return <div className="card p-5"><div className="text-xs font-semibold text-slate-500">{label}</div><div className={`mt-1 text-2xl font-extrabold ${tone}`}>{value}</div>{sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}</div>;
}

function AnomalyCard({ anomaly }: { anomaly: DemoResult["anomaly"] }) {
  const copy = SCENARIO_COPY[anomaly.scenario] ?? SCENARIO_COPY.normal;
  const ratio = anomaly.score / Math.max(0.001, anomaly.threshold);
  const gauge = Math.min(100, Math.round(ratio * 50));
  return (
    <section className={`card overflow-hidden border ${anomaly.isAnomaly ? "border-danger/30" : "border-teal/20"}`}>
      <div className={`p-5 ${anomaly.isAnomaly ? "bg-danger-soft" : "bg-teal-soft"}`}>
        <div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Anomaly detection</span><span className={`badge bg-white ${anomaly.isAnomaly ? "text-danger" : "text-teal"}`}>{anomaly.isAnomaly ? "확인 필요" : "정상"}</span></div>
        <div className={`mt-4 text-2xl font-black ${anomaly.isAnomaly ? "text-danger" : "text-teal"}`}>{copy.title}</div>
        <p className="mt-2 break-keep text-sm leading-6 text-slate-600">{copy.detail}</p>
      </div>
      <div className="p-5">
        <div className="flex items-center justify-between text-xs"><span className="font-bold text-slate-600">기준선 편차</span><span className="text-slate-400">모델 점수 {anomaly.score.toFixed(2)} / 기준 {anomaly.threshold.toFixed(2)}</span></div>
        <div className="relative mt-2 h-2 rounded-full bg-slate-100"><div className={`h-full rounded-full ${anomaly.isAnomaly ? "bg-danger" : "bg-teal"}`} style={{ width: `${gauge}%` }} /><div className="absolute -top-1 left-1/2 h-4 w-px bg-slate-400" title="이상 판단 기준" /></div>
        <div className="mt-1 flex justify-between text-[9px] text-slate-400"><span>평소 범위</span><span>판단 기준</span><span>높은 편차</span></div>
        <div className="mt-5 rounded-xl bg-slate-50 p-4"><div className="text-xs font-bold text-ink">권장 조치</div><p className="mt-1 break-keep text-xs leading-5 text-slate-500">{copy.action}</p></div>
        <p className="mt-4 text-[10px] leading-4 text-slate-400">이 결과는 전력 패턴 편차에 대한 AI 보조 진단이며, 기기 고장이나 응급상황을 확정하지 않습니다.</p>
      </div>
    </section>
  );
}
