"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  LineChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  ReferenceLine,
} from "recharts";
import {
  bill,
  tierOf,
  daysToNextTier,
  applianceBreakdown,
  won,
} from "@/lib/domain";
import {
  buildBenchmarkAnalysis,
  type BenchmarkHouse,
  type HouseholdMeta,
} from "@/features/analytics/benchmark";

const AMBER = "#E39A00";
const TEAL = "#0A9AA8";
const INK = "#1F2328";

export default function AnalyticsPage() {
  const [monthKwh, setMonthKwh] = useState(366);
  const [households, setHouseholds] = useState<HouseholdMeta[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState("");
  const [householdForecast, setHouseholdForecast] = useState<{ loading: boolean; error?: string }>({ loading: true });
  const [benchmark, setBenchmark] = useState<BenchmarkHouse[]>([]);
  const [benchmarkId, setBenchmarkId] = useState("");
  const [fromDay, setFromDay] = useState(1);
  const [toDay, setToDay] = useState(31);

  useEffect(() => {
    fetch("/api/household-forecast")
      .then((res) => res.json())
      .then((data: { houses?: HouseholdMeta[]; error?: string }) => {
        if (data.error) throw new Error(data.error);
        const list = data.houses ?? [];
        setHouseholds(list);
      })
      .catch((error: Error) => setHouseholdForecast({ loading: false, error: error.message }));
  }, []);

  useEffect(() => {
    if (!selectedHousehold) return;
    let cancelled = false;
    setHouseholdForecast({ loading: true });
    fetch("/api/household-forecast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ houseId: selectedHousehold }),
    })
      .then((res) => res.json())
      .then((data: { forecast?: { "0.5": number; prediction_kwh: number }[]; error?: string }) => {
        if (cancelled) return;
        if (data.error || !data.forecast?.length) throw new Error(data.error ?? "예측 결과가 없습니다.");
        const daily = data.forecast.reduce((sum, point) => sum + (point["0.5"] ?? point.prediction_kwh ?? 0), 0);
        setMonthKwh(Math.max(1, Math.round(daily * 30)));
        setHouseholdForecast({ loading: false });
      })
      .catch((error: Error) => { if (!cancelled) setHouseholdForecast({ loading: false, error: error.message }); });
    return () => { cancelled = true; };
  }, [selectedHousehold]);

  useEffect(() => {
    fetch("/api/benchmark")
      .then((res) => res.json())
      .then((data: { houses?: BenchmarkHouse[] }) => {
        const houses = data.houses ?? [];
        setBenchmark(houses);
        const selected = houses[Math.floor(Math.random() * houses.length)];
        setBenchmarkId(selected?.id ?? "");
        setSelectedHousehold(selected?.id ?? "");
      })
      .catch(() => setBenchmark([]));
  }, []);

  const b = bill(monthKwh);
  const tier = tierOf(monthKwh);
  const dailyAvg = monthKwh / 30;
  const nxt = daysToNextTier(monthKwh, dailyAvg);
  const appl = useMemo(() => applianceBreakdown(monthKwh), [monthKwh]);
  const selectedHouseholdMeta = households.find((house) => house.id === selectedHousehold);
  const selectedBenchmark = benchmark.find((house) => house.id === benchmarkId);
  const eda = useMemo(
    () => buildBenchmarkAnalysis(selectedBenchmark, fromDay, toDay),
    [selectedBenchmark, fromDay, toDay],
  );

  return (
    <div className="space-y-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#11181c] px-7 py-9 text-white shadow-pop md:px-10 md:py-11">
        <div className="absolute -right-16 -top-24 h-72 w-72 rounded-full bg-teal/20 blur-3xl" />
        <div className="absolute -bottom-28 left-1/3 h-64 w-64 rounded-full bg-amber/15 blur-3xl" />
        <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_0.42fr]">
          <div>
            <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.18em] text-[#54dbe6]"><span className="h-2 w-2 rounded-full bg-teal" />24-hour energy forecast</div>
            <h1 className="mt-5 break-keep text-3xl font-black leading-tight tracking-[-0.035em] md:text-5xl">내일의 전력 사용량을<br /><span className="text-[#54dbe6]">오늘 미리 확인합니다.</span></h1>
            <p className="mt-5 max-w-2xl break-keep text-sm leading-7 text-white/60">최근 전력 사용 흐름으로 다음 24시간을 예측하고, 예상 요금과 누진 구간 변화를 한눈에 보여드립니다.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-5 backdrop-blur">
            <div className="text-xs font-bold text-white/40">분석 기준</div>
            <div className="mt-2 text-3xl font-black text-[#54dbe6]">NEXT 24H</div>
            <p className="mt-3 break-keep text-xs leading-6 text-white/45">사용량 예측에서 월 예상 요금과 누진 구간까지 이어서 계산합니다.</p>
          </div>
        </div>
      </section>

      {/* 분석 대상 정보 */}
      <section className="card flex flex-wrap items-center justify-between gap-4 p-5">
        <div><div className="text-xs font-bold uppercase tracking-[0.14em] text-teal">Analysis data</div><div className="mt-1 text-lg font-black">최진규님</div><div className="mt-1 text-xs text-slate-500">{selectedHouseholdMeta ? `${selectedHouseholdMeta.type} · ${selectedHouseholdMeta.area}` : "분석 데이터를 불러오는 중"}</div></div>
        <div className={`badge ${householdForecast.error ? "bg-danger-soft text-danger" : "bg-teal-soft text-teal"}`}>{householdForecast.loading ? "사용량 분석 중…" : householdForecast.error ?? "최근 실측 기반 분석 완료"}</div>
      </section>

      {/* KPI */}
      <div className="grid gap-4 md:grid-cols-4">
        <Kpi label="이번 달 예상 사용량" value={`${monthKwh}kWh`} tone="text-ink" />
        <Kpi label="예상 청구요금" value={won(b.total)} tone="text-amber" />
        <Kpi label="현재 누진 구간" value={`${tier}구간`} tone={tier === 3 ? "text-danger" : "text-ink"} />
        <Kpi
          label="다음 구간까지"
          value={nxt ? `${Math.round(nxt.remain)}kWh` : "최고 구간"}
          tone="text-teal"
          sub={nxt ? `현재 추세로 약 ${nxt.days.toFixed(0)}일 후 ${nxt.nextTier}구간` : "3구간 유지 중"}
        />
      </div>

      {/* 누진 경고 바 */}
      <section className="card p-5">
        <div className="text-sm font-bold">누진제 진입 모니터</div>
        <TierBar monthKwh={monthKwh} />
        {nxt ? (
          <p className="mt-3 text-sm text-slate-600">
            ⏳ 다음 구간까지 <b>{Math.round(nxt.remain)}kWh</b> 남음 · 현재 추세(일 {dailyAvg.toFixed(1)}kWh)로 <b>약 {nxt.days.toFixed(0)}일 후 {nxt.nextTier}구간</b> 진입 예상
          </p>
        ) : (
          <p className="mt-3 text-sm text-danger">이미 최고 구간(3구간)입니다. 절전 조언을 확인하세요.</p>
        )}
        <div className="mt-2 text-xs text-slate-400">
          기본요금 {won(b.base)} + 전력량요금 {won(b.energy)} → 전기요금계 {won(b.supply)} · 청구금액(부가세·기금 포함) <b>{won(b.total)}</b>
        </div>
      </section>

      {/* 가전별 분해 */}
      <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="card p-5">
          <div className="text-sm font-bold">가전별 사용량 분해</div>
          <div className="mt-1 text-xs text-slate-400">이번 달 {monthKwh}kWh 기준 · 파레토 정렬</div>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={appl} layout="vertical" margin={{ left: 30, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#94a3b8" }} unit="k" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: "#475569" }} width={110} />
                <Tooltip formatter={(v: number) => `${v.toFixed(0)}kWh`} />
                <Bar dataKey="kwh" radius={[0, 6, 6, 0]}>
                  {appl.map((a, i) => (
                    <Cell key={a.name} fill={i === 0 ? AMBER : i === 1 ? TEAL : "#cbd5e1"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="card p-5">
          <div className="text-sm font-bold">가전별 예상 요금 기여</div>
          <div className="mt-3 divide-y divide-slate-100">
            {appl.map((a) => (
              <div key={a.name} className="flex items-center justify-between py-2 text-sm">
                <span className="text-slate-600">{a.name}</span>
                <span className="text-right">
                  <b>{won(a.cost)}</b>
                  <span className="ml-2 text-xs text-slate-400">{a.kwh.toFixed(0)}kWh</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EDA */}
      <section className="space-y-4">
        <div>
          <h2 className="section-title">📊 탐색적 데이터 분석 (EDA)</h2>
          <p className="mt-1 text-sm text-slate-500">연결된 실측 데이터를 기간별·시간대별로 분석합니다.</p>
        </div>
        <div className="card grid gap-4 p-5 md:grid-cols-2">
          <label><span className="label">시작일 · {fromDay}일차</span><input className="w-full accent-ink" type="range" min={1} max={31} value={fromDay} onChange={(e) => setFromDay(+e.target.value)} /></label>
          <label><span className="label">종료일 · {toDay}일차</span><input className="w-full accent-ink" type="range" min={1} max={31} value={toDay} onChange={(e) => setToDay(+e.target.value)} /></label>
          {selectedBenchmark && <div className="text-xs text-slate-400 md:col-span-2">실측 데이터 · {selectedBenchmark.area} · 측정 채널 {selectedBenchmark.channels}개 · 측정 시작 {selectedBenchmark.start} · 현재 {Math.min(fromDay, toDay)}~{Math.max(fromDay, toDay)}일차 선택</div>}
        </div>
        {!eda ? <div className="card p-8 text-center text-sm text-slate-400">실측 벤치마크 데이터를 불러오는 중입니다…</div> : <>
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="card p-5">
            <div className="text-sm font-bold">시간대별 평균 사용량</div>
            <div className="mt-3 h-56">
              <ResponsiveContainer>
                <ComposedChart data={eda.hourly} margin={{ left: -12, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10, fill: "#94a3b8" }} interval={2} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={40} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)}kWh`} />
                  <Area dataKey="kwh" stroke={TEAL} fill={TEAL} fillOpacity={0.15} strokeWidth={2} isAnimationActive={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 text-xs text-slate-400">선택 기간의 시간대별 평균(kWh)입니다.</div>
          </div>
          <div className="card p-5">
            <div className="text-sm font-bold">요일별 평균 사용량</div>
            <div className="mt-3 h-56">
              <ResponsiveContainer>
                <BarChart data={eda.weekday} margin={{ left: -12, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={40} domain={[0, 16]} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(1)}kWh`} />
                  <Bar dataKey="kwh" radius={[6, 6, 0, 0]}>
                    {eda.weekday.map((d, i) => (
                      <Cell key={d.day} fill={i >= 5 ? AMBER : "#cbd5e1"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 text-xs text-slate-400">요일별 하루 평균 사용량입니다.</div>
          </div>
          <div className="card p-5">
            <div className="text-sm font-bold">월별 사용량 추세</div>
            <div className="mt-3 h-56">
              <ResponsiveContainer>
                <LineChart data={eda.daily} margin={{ left: -12, right: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" />
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#94a3b8" }} />
                  <YAxis tick={{ fontSize: 10, fill: "#94a3b8" }} width={40} />
                  <Tooltip formatter={(v: number) => `${v}kWh`} />
                  <ReferenceLine y={400} stroke="#D8432B" strokeDasharray="4 4" label={{ value: "400kWh 참고선", fontSize: 10, fill: "#D8432B" }} />
                  <Line dataKey="kwh" stroke={INK} strokeWidth={2.5} dot={{ r: 2 }} isAnimationActive={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 text-xs text-slate-400">선택 범위의 일별 총 사용량입니다.</div>
          </div>
          <div className="card p-5">
            <div className="text-sm font-bold">사용 히트맵 · 요일 × 시간</div>
            <Heatmap data={eda.heat} />
            <div className="mt-1 text-xs text-slate-400">색이 진할수록 선택 기간의 평균 사용량이 큽니다.</div>
          </div>
        </div>
        <div className="text-xs text-slate-400">총 {eda.values.length.toLocaleString()}시간 · 선택 기간 합계 {eda.values.reduce((a, v) => a + v, 0).toFixed(1)}kWh</div>
        </>}
      </section>

    </div>
  );
}

function Kpi({ label, value, tone, sub }: { label: string; value: string; tone: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className="text-xs font-semibold text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-extrabold ${tone}`}>{value}</div>
      {sub && <div className="mt-1 text-xs text-slate-400">{sub}</div>}
    </div>
  );
}
function TierBar({ monthKwh }: { monthKwh: number }) {
  const max = 500;
  const pct = (n: number) => `${Math.min(100, (n / max) * 100)}%`;
  return (
    <div className="mt-4">
      <div className="relative h-6 w-full overflow-hidden rounded-full bg-slate-100">
        <div className="absolute inset-y-0 left-0 bg-ok/30" style={{ width: pct(200) }} />
        <div className="absolute inset-y-0 bg-amber/30" style={{ left: pct(200), width: pct(200) }} />
        <div className="absolute inset-y-0 bg-danger/30" style={{ left: pct(400), right: 0 }} />
        <div className="absolute inset-y-0 w-0.5 bg-ink" style={{ left: pct(monthKwh) }} />
      </div>
      <div className="mt-1 flex justify-between text-xs text-slate-400">
        <span>0</span>
        <span>200 (1→2구간)</span>
        <span>400 (2→3구간)</span>
        <span>{max}kWh</span>
      </div>
    </div>
  );
}

function Heatmap({ data }: { data: { day: string; hour: number; v: number }[][] }) {
  const max = Math.max(...data.flat().map((cell) => cell.v), 0.001);
  return (
    <div className="mt-4 space-y-1">
      {data.map((row) => (
        <div key={row[0].day} className="flex items-center gap-1">
          <span className="w-4 text-xs text-slate-400">{row[0].day}</span>
          <div className="flex flex-1 gap-[2px]">
            {row.map((c) => (
              <div
                key={c.hour}
                className="h-4 flex-1 rounded-[2px]"
                title={`${c.day} ${c.hour}시 · ${(c.v * 100).toFixed(0)}%`}
                style={{ background: `rgba(10,154,168,${0.06 + (c.v / max) * 0.9})` }}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="flex justify-between pl-5 text-[10px] text-slate-400">
        <span>0시</span><span>6시</span><span>12시</span><span>18시</span><span>23시</span>
      </div>
    </div>
  );
}
