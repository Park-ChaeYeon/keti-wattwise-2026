import { CITIES, TARGETS, simulate, type SolarPVInput } from "@/lib/solarpv";

export type HomeType = "apartment" | "villa" | "house";
export type UsagePattern = "low" | "normal" | "high";
export type RoofCondition = "good" | "partial" | "limited";
export type Orientation = "south" | "southeast" | "east" | "flat";

export type SolarPlanInput = {
  cityIdx: number;
  homeType: HomeType;
  areaPyeong: number;
  residents: number;
  usagePattern: UsagePattern;
  roofCondition: RoofCondition;
  orientation: Orientation;
  knownMonthlyKwh: string;
  sellPerKwh: number;
  subsidyOn: boolean;
  searchedLocation?: { loc: [number, number] } | null;
  selectedBuilding?: { kwh: number } | null;
};

const USAGE_MULTIPLIER: Record<UsagePattern, number> = { low: 0.82, normal: 1, high: 1.25 };
const ROOF_FACTOR: Record<RoofCondition, number> = { good: 0.9, partial: 0.65, limited: 0.4 };
const SELF_USE_RATE: Record<UsagePattern, number> = { low: 0.38, normal: 0.52, high: 0.65 };
const MONTHLY_SEASON = [1.12, 1.03, 0.96, 0.9, 0.9, 1.05, 1.14, 1.14, 1.02, 0.92, 0.88, 0.94];

export const ORIENTATIONS = {
  south: { tilt: 30, azimuth: 0, label: "남향 경사지붕" },
  southeast: { tilt: 25, azimuth: -30, label: "남동·남서향" },
  east: { tilt: 25, azimuth: -90, label: "동·서향" },
  flat: { tilt: 10, azimuth: 0, label: "평지붕" },
} satisfies Record<Orientation, { tilt: number; azimuth: number; label: string }>;

export function calculateSolarPlan(form: SolarPlanInput) {
  const target = TARGETS["가정"];
  const city = CITIES[form.cityIdx] ?? CITIES[0];
  const estimatedMonthlyKwh = Math.round(
    (95 + form.areaPyeong * 3.4 + form.residents * 42) * USAGE_MULTIPLIER[form.usagePattern],
  );
  const monthlyConsumption = Math.max(50, Number(form.knownMonthlyKwh) || estimatedMonthlyKwh);
  const annualConsumption = monthlyConsumption * 12;
  const roofFactor = ROOF_FACTOR[form.roofCondition];
  const installableArea = form.homeType === "house"
    ? form.areaPyeong * 3.3058 * 0.42 * roofFactor
    : form.homeType === "villa" ? 8.4 * roofFactor : 4.2 * roofFactor;
  const maxPanels = Math.max(1, Math.floor(installableArea / 2.1));
  const orientationSetting = ORIENTATIONS[form.orientation];
  const baseInput: SolarPVInput = {
    lat: form.searchedLocation?.loc[1] ?? city.lat,
    kt: city.kt,
    systemKw: 1,
    tilt: orientationSetting.tilt,
    azimuth: orientationSetting.azimuth,
    pr: 0.8,
    consumptionYr: annualConsumption,
    costPerKw: target.costPerKw,
    subsidy: target.subsidy,
    savePerKwh: 150,
    sellPerKwh: form.sellPerKwh,
    selfRate: SELF_USE_RATE[form.usagePattern],
  };
  const annualPerKw = simulate(baseInput).annualGen;
  const targetPanels = Math.max(1, Math.ceil((annualConsumption * 0.85) / (annualPerKw * 0.45)));
  const panelCount = Math.min(maxPanels, targetPanels);
  const systemKw = +(panelCount * 0.45).toFixed(2);
  const panelEquipmentCost = panelCount * (form.homeType === "apartment" ? 520_000 : 430_000);
  const inverterCost = form.homeType === "apartment" ? 180_000 : Math.max(550_000, systemKw * 230_000);
  const structureCost = Math.round(systemKw * (form.homeType === "house" ? 260_000 : 190_000));
  const installationCost = form.homeType === "apartment" ? 220_000 : Math.round(420_000 + systemKw * 120_000);
  const grossInstallCost = panelEquipmentCost + inverterCost + structureCost + installationCost;
  const subsidyRate = form.homeType === "apartment" ? 0.45 : form.homeType === "villa" ? 0.42 : 0.5;
  const estimatedSubsidy = form.subsidyOn
    ? Math.min(Math.round(grossInstallCost * subsidyRate), form.homeType === "apartment" ? 720_000 : 3_000_000)
    : 0;
  const selfPay = grossInstallCost - estimatedSubsidy;
  const simulationInput: SolarPVInput = {
    ...baseInput,
    systemKw,
    costPerKw: grossInstallCost / systemKw,
    subsidy: estimatedSubsidy,
  };
  const result = simulate(simulationInput);
  const monthlyEnergy = result.monthly.map((month, index) => ({
    ...month,
    consumption: Math.round(monthlyConsumption * MONTHLY_SEASON[index]),
  }));
  const buildingSaving = form.selectedBuilding
    ? Math.min(form.selectedBuilding.kwh, annualConsumption) * simulationInput.savePerKwh
    : 0;

  return {
    target,
    city,
    estimatedMonthlyKwh,
    monthlyConsumption,
    annualConsumption,
    installableArea,
    maxPanels,
    orientationSetting,
    panelCount,
    systemKw,
    panelEquipmentCost,
    inverterCost,
    structureCost,
    installationCost,
    grossInstallCost,
    estimatedSubsidy,
    selfPay,
    simulationInput,
    result,
    monthlyEnergy,
    selfSaving: result.selfUsed * simulationInput.savePerKwh,
    saleRevenue: result.surplus * form.sellPerKwh,
    gridUse: Math.max(0, annualConsumption - result.selfUsed),
    net25: Math.round(result.annualRevenue * 23.8 - selfPay),
    buildingSaving,
    buildingSavingRate: form.selectedBuilding
      ? Math.min(100, form.selectedBuilding.kwh / annualConsumption * 100)
      : 0,
  };
}
