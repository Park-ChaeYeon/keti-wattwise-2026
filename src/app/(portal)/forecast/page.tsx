import DashboardFrame from "@/components/DashboardFrame";

export default function ForecastPage() {
  return (
    <DashboardFrame src="/dash/forecast.html" title="예측 시각화" description="모델 4종(WattCast·GBM·NGBoost 등) + 분위수 밴드 확률 예측" />
  );
}
