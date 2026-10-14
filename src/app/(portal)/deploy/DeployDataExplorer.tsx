"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Appliance = { id: string; label: string; seriesIds: string[]; rows: number; periodStart: string; periodEnd: string };
type Point = { timestamp: string; kwh: number; coverage: number };
const ICONS: Record<string, string> = { tv: "📺", 에어컨: "❄️", 제습기: "💧", 세탁기: "🧺" };
const TEAL = "#0A9AA8";
const AMBER = "#E39A00";

export default function DeployDataExplorer() {
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [appliance, setAppliance] = useState("");
  const [seriesId, setSeriesId] = useState("");
  const [points, setPoints] = useState<Point[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/deploy/forecast").then((res) => res.json()).then((data: { appliances: Appliance[] }) => {
      const list = data.appliances ?? [];
      setAppliances(list);
      setAppliance(list[0]?.id ?? "");
      setSeriesId(list[0]?.seriesIds[0] ?? "");
    }).catch(() => { setError("실증 데이터 목록을 불러오지 못했습니다."); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!appliance || !seriesId) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    fetch(`/api/deploy/forecast?appliance=${encodeURIComponent(appliance)}&seriesId=${encodeURIComponent(seriesId)}`)
      .then(async (res) => { const data = await res.json(); if (!res.ok) throw new Error(data.error); return data; })
      .then((data: { points: Point[] }) => { if (!cancelled) setPoints(data.points ?? []); })
      .catch((e: Error) => { if (!cancelled) setError(e.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [appliance, seriesId]);

  const selected = appliances.find((item) => item.id === appliance);
  const summary = useMemo(() => {
    if (!points.length) return null;
    const total = points.reduce((sum, point) => sum + point.kwh, 0);
    const average = total / points.length;
    const peak = points.reduce((best, point) => point.kwh > best.kwh ? point : best, points[0]);
    const coverage = points.reduce((sum, point) => sum + point.coverage, 0) / points.length * 100;
    const hourly = Array.from({ length: 24 }, (_, hour) => {
      const values = points.filter((point) => new Date(point.timestamp).getHours() === hour);
      return { hour: `${hour}시`, kwh: values.reduce((sum, point) => sum + point.kwh, 0) / Math.max(1, values.length) };
    });
    const dailyMap = new Map<string, number>();
    points.forEach((point) => { const day = point.timestamp.slice(0, 10); dailyMap.set(day, (dailyMap.get(day) ?? 0) + point.kwh); });
    const daily = Array.from(dailyMap.entries()).map(([day, kwh]) => ({ day: day.slice(5), kwh }));
    return { total, average, peak, coverage, hourly, daily };
  }, [points]);

  function chooseAppliance(id: string) {
    const next = appliances.find((item) => item.id === id);
    setAppliance(id);
    setSeriesId(next?.seriesIds[0] ?? "");
  }

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-[#f7fafb] p-5 shadow-sm md:p-8">
      <div className="eyebrow">01 · Measured Data</div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div><h2 className="section-title">우리가 확보한 데이터</h2><p className="section-sub max-w-2xl break-keep">외부 벤치마크가 아닙니다. 가전별 원시 신호를 시간 단위로 정제하고, 수집률까지 함께 검수한 실증 데이터입니다.</p></div>
        <span className="badge bg-white text-teal shadow-sm"><span className="h-1.5 w-1.5 rounded-full bg-teal" />실증 원본 연결됨</span>
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1.4fr]">
          <div><span className="label">측정 가전</span><div className="grid grid-cols-2 gap-2">{appliances.map((item) => <button key={item.id} onClick={() => chooseAppliance(item.id)} className={`rounded-xl border px-3 py-2 text-left text-sm ${appliance === item.id ? "border-teal bg-teal-soft font-bold text-teal" : "border-slate-200"}`}>{ICONS[item.id]} {item.label}</button>)}</div></div>
          <label><span className="label">실증 대상</span><select className="input" value={seriesId} onChange={(e) => setSeriesId(e.target.value)}>{(selected?.seriesIds ?? []).map((id) => <option key={id} value={id}>{id.replace("_tv", "_TV")}</option>)}</select></label>
          <div className="rounded-xl bg-[#11191d] p-4 text-xs leading-6 text-white/55">{selected ? <><b className="text-white">선택 데이터의 이력</b><br />{selected.periodStart.slice(0, 10)} — {selected.periodEnd.slice(0, 10)} · 전체 {selected.rows.toLocaleString()}시간<br /><span className="text-[#63dbe3]">수집률·결측 플래그까지 함께 관리</span></> : "데이터를 불러오는 중입니다."}</div>
        </div>
      </div>

      {error ? <div className="mt-4 rounded-xl bg-danger-soft p-5 text-sm text-danger">{error}</div> : loading || !summary ? <div className="mt-4 card flex h-64 items-center justify-center text-sm text-slate-400">실증 데이터를 분석하는 중…</div> : <>
        <div className="mt-4 grid gap-4 md:grid-cols-4">
          <Metric label="수집 시간" value={`${points.length.toLocaleString()}시간`} />
          <Metric label="기간 총사용량" value={`${summary.total.toFixed(2)} kWh`} />
          <Metric label="시간당 평균" value={`${summary.average.toFixed(3)} kWh`} />
          <Metric label="데이터 완전성" value={`${summary.coverage.toFixed(1)}%`} />
        </div>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <ChartCard title="시간대별 평균 사용량" description="전체 실증 기간의 시간대별 평균 패턴">
            <ComposedChart data={summary.hourly} margin={{ left: -8, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" /><XAxis dataKey="hour" interval={2} tick={{ fontSize: 10 }} /><YAxis width={48} tick={{ fontSize: 10 }} /><Tooltip formatter={(v: number) => `${v.toFixed(3)} kWh`} /><Area dataKey="kwh" stroke={TEAL} fill={TEAL} fillOpacity={0.14} strokeWidth={2.5} /></ComposedChart>
          </ChartCard>
          <ChartCard title="일별 총사용량" description="실제 수집일별 사용량 변화">
            <BarChart data={summary.daily} margin={{ left: -8, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" /><XAxis dataKey="day" minTickGap={26} tick={{ fontSize: 10 }} /><YAxis width={48} tick={{ fontSize: 10 }} /><Tooltip formatter={(v: number) => `${v.toFixed(3)} kWh`} /><Bar dataKey="kwh" fill={AMBER} radius={[4, 4, 0, 0]} /></BarChart>
          </ChartCard>
        </div>
        <div className="mt-4 card p-5"><div className="flex flex-wrap items-end justify-between gap-2"><div><div className="text-sm font-bold">전체 실측 시계열</div><div className="mt-1 text-xs text-slate-400">시간별 측정값 · 최고 사용 {new Date(summary.peak.timestamp).toLocaleString("ko-KR")} / {summary.peak.kwh.toFixed(3)}kWh</div></div><span className="text-xs text-slate-400">{seriesId}</span></div><div className="mt-4 h-64"><ResponsiveContainer><ComposedChart data={points} margin={{ left: -8, right: 8 }}><CartesianGrid strokeDasharray="3 3" stroke="#eef1f4" /><XAxis dataKey="timestamp" minTickGap={60} tickFormatter={(v) => String(v).slice(5, 10)} tick={{ fontSize: 10 }} /><YAxis width={48} tick={{ fontSize: 10 }} /><Tooltip labelFormatter={(v) => new Date(String(v)).toLocaleString("ko-KR")} formatter={(v: number) => `${v.toFixed(3)} kWh`} /><Line dataKey="kwh" stroke="#1F2328" strokeWidth={1.8} dot={false} isAnimationActive={false} /></ComposedChart></ResponsiveContainer></div></div>
      </>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="card p-5"><div className="text-xs font-semibold text-slate-500">{label}</div><div className="mt-1 text-xl font-extrabold">{value}</div></div>; }
function ChartCard({ title, description, children }: { title: string; description: string; children: React.ReactElement }) { return <div className="card p-5"><div className="text-sm font-bold">{title}</div><div className="mt-1 text-xs text-slate-400">{description}</div><div className="mt-4 h-64"><ResponsiveContainer>{children}</ResponsiveContainer></div></div>; }
