export const APPLIANCE_IDS = ["tv", "에어컨", "제습기", "세탁기"] as const;

export type ApplianceId = (typeof APPLIANCE_IDS)[number];

export const APPLIANCE_LABELS: Record<ApplianceId, string> = {
  tv: "TV",
  에어컨: "에어컨",
  제습기: "제습기",
  세탁기: "세탁기",
};

export function isApplianceId(value: unknown): value is ApplianceId {
  return typeof value === "string" && APPLIANCE_IDS.includes(value as ApplianceId);
}
