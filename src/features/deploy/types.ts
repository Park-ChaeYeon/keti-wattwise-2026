import type { ApplianceId } from "@/features/appliances/config";

export type ApplianceSummary = {
  id: ApplianceId;
  label: string;
  seriesIds: string[];
  seriesRows: Record<string, number>;
  rows: number;
  periodStart: string;
  periodEnd: string;
};

export type MeasuredPoint = {
  timestamp: string;
  kwh: number | null;
  coverage: number | null;
};

export type ForecastPoint = {
  timestamp: string;
  actual?: number;
  prediction_kwh?: number;
  "0.1"?: number;
  "0.5"?: number;
  "0.9"?: number;
};
