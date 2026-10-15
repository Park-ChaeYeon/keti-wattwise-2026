export type BenchmarkHouse = {
  id: string;
  label: string;
  start: string;
  split: string;
  type: string;
  area: string;
  channels: number;
  dailyAverage: number;
  values: number[];
};

export type HouseholdMeta = {
  id: string;
  type: string;
  area: string;
  city: string;
  start: string;
  end: string;
  rows: number;
  split?: string;
};

const WEEKDAYS = ["월", "화", "수", "목", "금", "토", "일"];

export function buildBenchmarkAnalysis(house: BenchmarkHouse | undefined, fromDay: number, toDay: number) {
  if (!house) return null;
  const start = Math.max(1, Math.min(31, Math.min(fromDay, toDay)));
  const end = Math.max(start, Math.min(31, Math.max(fromDay, toDay)));
  const values = house.values.slice((start - 1) * 24, end * 24);
  const hourly = Array.from({ length: 24 }, (_, hour) => {
    const points = values.filter((_, index) => index % 24 === hour);
    return { hour: `${hour}시`, kwh: points.length ? points.reduce((sum, value) => sum + value, 0) / points.length : 0 };
  });
  const weekday = WEEKDAYS.map((day, index) => {
    const points = values.filter((_, pointIndex) => (start - 1 + Math.floor(pointIndex / 24)) % 7 === index);
    return { day, kwh: points.reduce((sum, value) => sum + value, 0) / Math.max(1, points.length) * 24 };
  });
  const daily = Array.from({ length: end - start + 1 }, (_, index) => {
    const day = start + index;
    const points = house.values.slice((day - 1) * 24, day * 24);
    return { day: `${day}일`, kwh: points.reduce((sum, value) => sum + value, 0) };
  });
  const heat = WEEKDAYS.map((day, dayIndex) => Array.from({ length: 24 }, (_, hour) => {
    const points = values.filter((_, index) => Math.floor(index / 24) % 7 === dayIndex && index % 24 === hour);
    return { day, hour, v: points.length ? points.reduce((sum, value) => sum + value, 0) / points.length : 0 };
  }));
  return { start, end, values, hourly, weekday, daily, heat };
}
