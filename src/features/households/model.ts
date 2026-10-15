export type Timing = "always" | "morning" | "day" | "evening" | "night";
export type Occupancy = "away" | "normal" | "home";
export type Sensitivity = "relaxed" | "normal" | "sensitive";
export type Appliance = { id: string; name: string; icon: string; watt: number; defaultHours: number; timing: Timing };
export type ApplianceSetting = { enabled: boolean; hours: number; todayHours: number };
export type HouseholdMeta = { id: string; type: string; area: string; city: string; start: string; end: string; rows: number; split?: string };
export type ForecastPoint = { timestamp?: string; "0.1"?: number; "0.5"?: number; "0.9"?: number; prediction_kwh?: number };
export type AnomalyResult = { scenario: string; score: number; threshold: number; isAnomaly: boolean };
export type DemoResult = { house: HouseholdMeta; forecast: { hour: string; low: number; expected: number; high: number; range: number }[]; monthly: number; anomaly: AnomalyResult };

export const CATALOG: Appliance[] = [
  { id: "fridge", name: "냉장고", icon: "🧊", watt: 45, defaultHours: 24, timing: "always" },
  { id: "aircon", name: "에어컨", icon: "❄️", watt: 1800, defaultHours: 4, timing: "day" },
  { id: "tv", name: "TV", icon: "📺", watt: 120, defaultHours: 3, timing: "evening" },
  { id: "washer", name: "세탁기", icon: "🧺", watt: 500, defaultHours: 0.5, timing: "day" },
  { id: "dryer", name: "의류건조기", icon: "🌀", watt: 1500, defaultHours: 0.7, timing: "evening" },
  { id: "induction", name: "인덕션", icon: "🍳", watt: 2000, defaultHours: 0.6, timing: "evening" },
  { id: "rice", name: "전기밥솥", icon: "🍚", watt: 700, defaultHours: 0.7, timing: "morning" },
  { id: "computer", name: "컴퓨터·모니터", icon: "💻", watt: 260, defaultHours: 5, timing: "day" },
  { id: "purifier", name: "공기청정기", icon: "🌫️", watt: 35, defaultHours: 12, timing: "always" },
  { id: "lighting", name: "조명", icon: "💡", watt: 90, defaultHours: 5, timing: "night" },
  { id: "floor", name: "전기장판", icon: "🛏️", watt: 120, defaultHours: 7, timing: "night" },
  { id: "dishwasher", name: "식기세척기", icon: "🍽️", watt: 1200, defaultHours: 0.5, timing: "evening" },
];

export const INITIAL_SETTINGS = Object.fromEntries(CATALOG.map((item) => [item.id, {
  enabled: ["fridge", "aircon", "tv", "washer", "induction", "lighting"].includes(item.id),
  hours: item.defaultHours,
  todayHours: item.defaultHours,
}])) as Record<string, ApplianceSetting>;

export const SCENARIOS = ["normal", "always_on", "cooking_loss", "inactive", "night_loss", "away"] as const;
export const SCENARIO_COPY: Record<string, { title: string; detail: string; action: string }> = {
  normal: { title: "평소 범위", detail: "오늘 사용 패턴이 학습된 정상 범위 안에 있습니다.", action: "현재 사용 패턴을 유지해도 좋습니다." },
  always_on: { title: "상시 부하 급증", detail: "꺼져 있어야 할 시간에도 높은 부하가 계속 감지됐습니다.", action: "냉난방기·전열기·대기전력을 확인하세요." },
  cooking_loss: { title: "조리 패턴 누락", detail: "평소 식사 시간대의 조리 전력 패턴이 나타나지 않았습니다.", action: "외출 여부나 생활 패턴 변화를 확인하세요." },
  inactive: { title: "장시간 활동 저하", detail: "평소보다 활동성 부하가 오랫동안 낮게 유지됐습니다.", action: "재실 중이라면 주요 가전과 안부를 확인하세요." },
  night_loss: { title: "야간 사용 변화", detail: "야간 사용이 평소와 다르지만 현재 임계값 이내입니다.", action: "며칠간 같은 변화가 반복되는지 관찰하세요." },
  away: { title: "외출 패턴", detail: "전체 부하가 낮고 안정적인 외출 패턴으로 판단됩니다.", action: "불필요한 상시 부하만 없는지 확인하세요." },
};

const PEAK: Record<Timing, number> = { always: 12, morning: 8, day: 14, evening: 20, night: 23 };

function hourWeight(hour: number, timing: Timing) {
  if (timing === "always") return 1;
  const distance = Math.min(Math.abs(hour - PEAK[timing]), 24 - Math.abs(hour - PEAK[timing]));
  return 0.08 + Math.exp(-(distance ** 2) / (timing === "day" ? 18 : 5));
}

export function calculateHouseholdUsage(
  settings: Record<string, ApplianceSetting>,
  residents: number,
  occupancy: Occupancy,
  sensitivity: Sensitivity,
) {
  const selected = CATALOG.filter((item) => settings[item.id].enabled);
  const occupancyFactor = { away: 0.86, normal: 1, home: 1.18 }[occupancy];
  const residentBase = 1.7 + residents * 0.75;
  const applianceDaily = selected.reduce((sum, item) => sum + item.watt * settings[item.id].hours / 1000, 0);
  const daily = (residentBase + applianceDaily) * occupancyFactor;
  const hourly = Array.from({ length: 24 }, (_, hour) => {
    let expected = residentBase / 24;
    let observed = residentBase / 24;
    selected.forEach((item) => {
      const weights = Array.from({ length: 24 }, (_, candidate) => hourWeight(candidate, item.timing));
      const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
      expected += item.watt * settings[item.id].hours / 1000 * weights[hour] / weightTotal;
      observed += item.watt * settings[item.id].todayHours / 1000 * weights[hour] / weightTotal;
    });
    expected *= occupancyFactor;
    observed *= occupancyFactor * (1 + Math.sin(hour * 1.7) * 0.035);
    return { hour: `${hour}시`, expected: +expected.toFixed(2), observed: +observed.toFixed(2), low: +(expected * 0.78).toFixed(2), high: +(expected * 1.22).toFixed(2) };
  });
  const applianceRows = selected.map((item) => {
    const normal = item.watt * settings[item.id].hours / 1000 * 30;
    const today = item.watt * settings[item.id].todayHours / 1000;
    const expectedToday = item.watt * settings[item.id].hours / 1000;
    const deviation = Math.abs(today - expectedToday) / Math.max(0.08, expectedToday);
    return { ...item, normal, today, deviation };
  }).sort((left, right) => right.normal - left.normal);
  const threshold = { relaxed: 0.7, normal: 0.45, sensitive: 0.28 }[sensitivity];
  const unusual = applianceRows.filter((item) => item.deviation > threshold);
  const score = Math.min(100, Math.round((unusual[0]?.deviation ?? 0) * 72));
  return { selected, daily, monthly: daily * 30, hourly, applianceRows, unusual, threshold, score };
}
