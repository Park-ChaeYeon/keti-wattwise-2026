import Shot from "@/components/Shot";
import ForecastLab from "./ForecastLab";
import DeployDataExplorer from "./DeployDataExplorer";

const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const KIT = [
  { n: "Raspberry Pi 5", d: "온디바이스 예측·이상탐지 구동 (클라우드 없이 집 안에서)" },
  { n: "CT 센서 (SCT-013)", d: "분전반에 물려 집 전체 전류를 실측" },
  { n: "브레드보드 · ADC", d: "센서 신호를 라즈베리파이가 읽도록 회로 구성" },
  { n: "로컬 저장", d: "1분 단위 시계열을 집 안에 저장 (데이터는 밖으로 나가지 않음)" },
];

const FLOW = [
  { en: "MEASURE", title: "센서 설치·측정", body: "분전반과 콘센트에 센서를 직접 설치하고 전력 신호를 연속 수집했습니다." },
  { en: "REFINE", title: "결측·품질 정제", body: "시간 단위로 집계하고 수집률과 결측 여부를 함께 기록해 신뢰할 수 있는 입력을 만들었습니다." },
  { en: "LEARN", title: "가전별 모델 학습", body: "가전과 실증 대상별 시계열을 구성해 Chronos-2 체크포인트를 학습했습니다." },
  { en: "PROVE", title: "로컬 추론 검증", body: "저장된 모델을 실제로 불러와 다음 24시간 예측과 불확실성 범위를 확인합니다." },
];

const SHOTS = [
  { src: "panel-ct.jpg", cap: "분전반 메인 전선에 CT센서(SCT-013 클램프)를 물려 집 전체 전류를 실측" },
  { src: "room-setup.jpg", cap: "자취방 현장 설치 · 벽 콘센트에서 라즈베리파이로 전력 측정" },
  { src: "lab-team.jpg", cap: "회로 구성·검증 · 멀티미터로 CT센서 신호를 확인" },
];

export default function DeployPage() {
  return (
    <div className="space-y-16">
      {/* 히어로 */}
      <section className="overflow-hidden rounded-[2rem] bg-[#11191d] text-white shadow-[0_28px_80px_rgba(15,23,42,0.18)]">
        <div className="grid gap-8 p-7 md:grid-cols-[1.25fr_0.75fr] md:p-12">
          <div className="self-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-bold text-[#63dbe3]"><span className="h-1.5 w-1.5 rounded-full bg-[#63dbe3]" />FIELD VALIDATION · 실증</div>
            <h1 className="mt-6 max-w-2xl break-keep text-4xl font-black leading-[1.12] tracking-[-0.045em] md:text-5xl">
              측정부터 예측까지,<br /><span className="text-[#ffc34d]">직접 끝까지 만들었습니다.</span>
            </h1>
            <p className="mt-6 max-w-2xl break-keep text-sm leading-7 text-white/60 md:text-base">
              센서를 설치하는 데서 멈추지 않았습니다. 전력 신호를 모으고, 결측과 품질을 확인하고, 가전별 시계열로 정제한 뒤 실제 모델 추론까지 연결했습니다. 아래 화면의 숫자와 그래프는 이 과정을 거친 실증 데이터를 그대로 보여줍니다.
            </p>
            <div className="mt-8 grid max-w-2xl grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10">
              <HeroStat value="4종" label="가전별 시계열" /><HeroStat value="1시간" label="정제 데이터 단위" /><HeroStat value="24시간" label="모델 예측 구간" />
            </div>
          </div>
          <div className="self-center rounded-2xl bg-white/[0.04] p-2 ring-1 ring-white/10">
            <Shot src={`${BP}/deploy/kit.jpg`} caption="측정 키트 · 라즈베리파이 5, CT센서, 브레드보드, 저항·ADC 부품" h="h-64 md:h-full" />
          </div>
        </div>
      </section>

      <section>
        <div className="eyebrow">From signal to proof</div>
        <div className="flex flex-wrap items-end justify-between gap-4"><h2 className="section-title">측정부터 추론까지 이어지는<br className="hidden md:block" /> 검증 가능한 파이프라인</h2><p className="max-w-md break-keep text-sm leading-7 text-slate-500">각 단계의 결과가 다음 단계의 입력으로 이어집니다. 실측값과 모델 결과를 한 페이지에 둔 이유입니다.</p></div>
        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">{FLOW.map((step, index) => <div key={step.en} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><span className="text-[10px] font-black tracking-[0.18em] text-teal">{step.en}</span><span className="text-xs font-black text-slate-300">0{index + 1}</span></div><div className="mt-6 text-base font-black">{step.title}</div><p className="mt-2 break-keep text-xs leading-6 text-slate-500">{step.body}</p><div className="absolute bottom-0 left-0 h-1 w-0 bg-teal transition-all group-hover:w-full" /></div>)}</div>
      </section>

      {/* 우리 실증 데이터 */}
      <DeployDataExplorer />

      {/* 우리 실증 데이터 기반 실제 모델 예측 */}
      <ForecastLab />

      {/* 구성 키트 */}
      <section>
        <div className="eyebrow">Hardware</div>
        <h2 className="section-title">무엇으로 측정하나</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {KIT.map((k) => (
            <div key={k.n} className="card flex items-start gap-4 p-5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-soft text-lg">🔌</div>
              <div>
                <div className="font-bold">{k.n}</div>
                <div className="mt-0.5 text-sm text-slate-500">{k.d}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 실험 현장 사진 */}
      <section>
        <div className="eyebrow">On Site</div>
        <h2 className="section-title">설치·측정 현장</h2>
        <p className="section-sub">공개 데이터가 아니라, 팀원이 직접 손으로 재고 있는 실제 실험 현장입니다.</p>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {SHOTS.map((s) => (
            <Shot key={s.src} src={`${BP}/deploy/${s.src}`} caption={s.cap} h="h-52" />
          ))}
        </div>
      </section>

      {/* 실측 데이터 */}
      <section>
        <div className="eyebrow">Live Data</div>
        <h2 className="section-title">실제로 이렇게 데이터가 쌓입니다</h2>
        <p className="section-sub">라즈베리파이가 센서에서 읽은 전력값을 초 단위로 찍어 저장하는 실측 로그입니다.</p>
        <figure className="mt-5 overflow-hidden rounded-xl border border-slate-200">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`${BP}/deploy/data-log.jpg`} alt="라즈베리파이 실측 데이터 스트림 화면" className="w-full object-cover" />
          <figcaption className="bg-white px-4 py-2 text-xs text-slate-500">
            실제 수집 화면 · [2026-09-02 18:17:05] [Sensor 01] Power=0.2946 kWh …
          </figcaption>
        </figure>
      </section>

      {/* 왜 실측인가 */}
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#0b8e9a] to-[#086b75] p-8 text-white md:p-11">
        <div className="text-xs font-black uppercase tracking-[0.2em] text-white/55">What we proved</div>
        <div className="mt-5 grid gap-8 lg:grid-cols-[1fr_0.8fr]"><p className="max-w-3xl break-keep text-2xl font-black leading-snug md:text-3xl">실측 데이터가 모델 입력이 되고,<br />모델 출력이 다시 사용자의 판단으로 이어집니다.</p><p className="break-keep text-sm leading-7 text-white/70">WattWise의 실증은 그래프 한 장을 만드는 일이 아닙니다. 수집 품질을 확인하고, 반복 가능한 전처리와 로컬 추론 환경을 구성해 실제 서비스 흐름 전체가 작동하는지 증명하는 과정입니다.</p></div>
      </section>
    </div>
  );
}

function HeroStat({ value, label }: { value: string; label: string }) {
  return <div className="bg-[#11191d] px-4 py-4"><div className="text-xl font-black text-white md:text-2xl">{value}</div><div className="mt-1 text-[10px] text-white/35 md:text-xs">{label}</div></div>;
}
