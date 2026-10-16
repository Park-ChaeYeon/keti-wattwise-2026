import Link from "next/link";

export default function WhyPage() {
  return (
    <div className="space-y-20 pb-12 md:space-y-24">
      <section className="relative overflow-hidden rounded-[2rem] bg-[#11181c] px-7 py-14 text-white shadow-pop md:px-12 md:py-20">
        <div className="absolute -right-24 -top-32 h-96 w-96 rounded-full bg-teal/20 blur-3xl" />
        <div className="absolute -bottom-40 left-1/4 h-96 w-96 rounded-full bg-amber/15 blur-3xl" />
        <div className="relative grid items-end gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-[#54dbe6]">Why WattWise</p>
            <h1 className="mt-5 break-keep text-4xl font-black leading-[1.08] tracking-[-0.05em] md:text-6xl">
              전력은 단순한 요금이 아니라,<br /><span className="text-[#54dbe6]">더 나은 판단의 신호입니다.</span>
            </h1>
            <p className="mt-7 max-w-2xl break-keep text-base leading-8 text-white/60">사용량과 요금은 미리 알기 어렵고, 혼자 사는 가구의 생활 변화는 늦게 발견되며, 가정에서 생산한 에너지는 충분히 활용되지 못하고 있습니다. WattWise는 매일 쌓이는 전력 데이터를 비용·안전·거래를 위한 정보로 바꿉니다.</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <HeroStat value="24h" label="사용량 예측" color="text-[#54dbe6]" />
            <HeroStat value="42%" label="1인 세대 비중" color="text-[#ff9d8e]" />
            <HeroStat value="3" label="연결된 해법" color="text-[#ffc95c]" />
          </div>
        </div>
      </section>

      <section>
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-teal">Three reasons</p>
          <h2 className="mt-4 break-keep text-3xl font-black tracking-[-0.04em] md:text-5xl">왜 지금, 전력 데이터에 주목해야 할까요?</h2>
          <p className="mt-5 break-keep text-sm leading-7 text-slate-500">하나의 데이터가 서로 다른 세 가지 사회문제를 해결할 실마리가 될 수 있기 때문입니다.</p>
        </div>

        <div className="mt-12 space-y-5">
          <ReasonSection
            number="01"
            eyebrow="PREDICT"
            title={<>전기요금은 사용한 뒤가 아니라,<br /><span className="text-teal">사용하기 전에 알아야 합니다.</span></>}
            body="가정의 전력 사용량과 요금은 고지서가 도착한 뒤에야 체감되는 경우가 많습니다. 다음 사용량과 누진 구간을 미리 예측할 수 있다면 비용이 커지기 전에 사용 시간과 가전 운용을 조정할 수 있습니다."
            takeaway="지난달 요금 확인에서, 내일의 사용량 예측으로."
            href="/analytics"
            link="24시간 사용량 예측하기"
            visual={<ForecastVisual />}
            reverse={false}
          />

          <ReasonSection
            number="02"
            eyebrow="PROTECT"
            title={<>늘어나는 1인 가구,<br /><span className="text-danger">생활 변화의 발견은 더 빨라야 합니다.</span></>}
            body="2024년 1인 세대는 1,012만 세대로 전체의 42%를 차지합니다. 혼자 사는 가구에서 평소와 다른 생활 변화가 생겨도 주변에서 바로 알아채기 어렵습니다. TV·조명·전기포트처럼 일상 활동을 보여주는 전력 신호를 살피면 안부 확인이 필요한 변화를 더 일찍 발견할 수 있습니다."
            takeaway="평소를 학습하고, 평소와 다른 순간을 알립니다."
            href="/households"
            link="생활 이상 신호 확인하기"
            visual={<SafetyVisual />}
            reverse
          />

          <ReasonSection
            number="03"
            eyebrow="EXCHANGE"
            title={<>해외에서는 에너지를 나눕니다.<br /><span className="text-amber">한국에도 연결하는 플랫폼이 필요합니다.</span></>}
            body="해외 여러 전력 시장에서는 시간대별 가격과 분산형 에너지를 바탕으로 가정이 전력을 유연하게 소비하고, 태양광으로 생산한 잉여 전력을 판매하는 흐름이 확산되고 있습니다. 국내에도 스마트미터와 공동주택 태양광 같은 기반이 마련되는 만큼, 생산량을 계산하는 데서 나아가 실제 활용과 거래 판단까지 연결할 서비스가 필요합니다."
            takeaway="남는 태양광을 버려지는 전력에서 활용 가능한 자원으로."
            href="/solar"
            link="태양광 활용 가능성 보기"
            visual={<TradeVisual />}
            reverse={false}
          />
        </div>
      </section>

      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-card">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr]">
          <div className="bg-teal p-8 text-white md:p-12">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-white/55">Our answer</p>
            <h2 className="mt-4 break-keep text-3xl font-black leading-tight tracking-[-0.04em] md:text-4xl">하나의 전력 데이터,<br />세 가지 더 나은 결정.</h2>
            <p className="mt-5 break-keep text-sm leading-7 text-white/70">WattWise는 따로 존재하던 예측·안전·거래 기능을 하나의 가정 에너지 경험으로 연결합니다.</p>
          </div>
          <div className="grid gap-px bg-slate-200 sm:grid-cols-3">
            <Answer index="01" title="예측" body="다음 사용량과 요금을 미리 확인해 비용 변화에 대응합니다." />
            <Answer index="02" title="안전" body="생활 패턴의 이상 신호를 발견해 필요한 안부 확인을 돕습니다." />
            <Answer index="03" title="거래" body="태양광 잉여 전력을 계산해 활용과 거래 가능성으로 연결합니다." />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 px-7 py-6 md:px-10">
          <p className="max-w-2xl break-keep text-xs leading-6 text-slate-400">WattWise의 이상 탐지는 응급상황이나 고독사를 확정하는 기능이 아니라, 생활 패턴 변화를 조기에 발견해 안부 확인을 돕는 보조 기능입니다. 전력 거래 화면은 실제 거래소와 연결되지 않은 모의 환경입니다.</p>
          <Link href="/analytics" className="btn-primary !rounded-full px-5 py-2.5">WattWise 체험하기 →</Link>
        </div>
      </section>
    </div>
  );
}

function HeroStat({ value, label, color }: { value: string; label: string; color: string }) {
  return <div className="rounded-2xl border border-white/10 bg-white/[0.06] p-4 backdrop-blur"><div className={`text-2xl font-black md:text-3xl ${color}`}>{value}</div><div className="mt-2 break-keep text-[10px] leading-4 text-white/40">{label}</div></div>;
}

function ReasonSection({ number, eyebrow, title, body, takeaway, href, link, visual, reverse }: { number: string; eyebrow: string; title: React.ReactNode; body: string; takeaway: string; href: string; link: string; visual: React.ReactNode; reverse: boolean }) {
  return (
    <article className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-card">
      <div className="grid lg:grid-cols-2">
        <div className={`flex min-h-[390px] items-center justify-center bg-slate-50 p-7 md:p-10 ${reverse ? "lg:order-2" : ""}`}>{visual}</div>
        <div className={`flex flex-col justify-center p-8 md:p-12 ${reverse ? "lg:order-1" : ""}`}>
          <div className="flex items-center justify-between"><p className="text-xs font-black tracking-[0.18em] text-teal">{eyebrow}</p><span className="text-xs font-bold text-slate-300">{number}</span></div>
          <h3 className="mt-7 break-keep text-3xl font-black leading-tight tracking-[-0.035em]">{title}</h3>
          <p className="mt-5 break-keep text-sm leading-7 text-slate-500">{body}</p>
          <p className="mt-6 border-l-2 border-teal pl-4 text-sm font-bold leading-6 text-ink">{takeaway}</p>
          <Link href={href} className="mt-7 text-sm font-black text-teal transition hover:translate-x-1">{link} →</Link>
        </div>
      </div>
    </article>
  );
}

function ForecastVisual() {
  return <div className="w-full max-w-md rounded-2xl bg-[#11181c] p-6 text-white shadow-xl"><div className="flex items-center justify-between"><div><div className="text-xs text-white/35">내일 예상 사용량</div><div className="mt-1 text-3xl font-black">12.4 kWh</div></div><span className="rounded-full bg-teal/20 px-3 py-1 text-xs font-bold text-[#54dbe6]">24H</span></div><svg viewBox="0 0 360 130" className="mt-7 w-full" aria-hidden><defs><linearGradient id="whyForecast" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#26c6d1" stopOpacity=".4" /><stop offset="1" stopColor="#26c6d1" stopOpacity="0" /></linearGradient></defs><path d="M0 105 C35 95 48 66 78 78 S125 115 154 67 S205 28 238 55 S281 99 315 53 S340 36 360 30 L360 130 L0 130Z" fill="url(#whyForecast)" /><path d="M0 105 C35 95 48 66 78 78 S125 115 154 67 S205 28 238 55 S281 99 315 53 S340 36 360 30" fill="none" stroke="#54dbe6" strokeWidth="3" /></svg><div className="mt-4 flex justify-between border-t border-white/10 pt-4 text-xs"><span className="text-white/40">누진 구간 진입까지</span><b className="text-[#ffc95c]">86 kWh</b></div></div>;
}

function SafetyVisual() {
  return <div className="w-full max-w-md"><div className="rounded-2xl border border-danger/20 bg-white p-6 shadow-lg"><div className="flex items-center justify-between"><div><div className="text-xs font-bold text-slate-400">오늘의 생활 신호</div><div className="mt-1 text-xl font-black text-danger">확인이 필요합니다</div></div><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-danger-soft font-black text-danger">!</span></div><div className="mt-7 space-y-3"><SignalRow time="평소" width="82%" color="bg-teal" /><SignalRow time="오늘" width="28%" color="bg-danger" /></div><div className="mt-6 rounded-xl bg-danger-soft p-4"><div className="text-xs font-black text-danger">생활 활동 변화 감지</div><p className="mt-1 text-xs leading-5 text-slate-500">평소 활동 시간과 다른 전력 흐름이 이어지고 있습니다.</p></div></div><p className="mt-4 text-center text-[10px] leading-5 text-slate-400">전력 신호는 안부 확인을 돕는 보조 정보로 사용됩니다.</p></div>;
}

function SignalRow({ time, width, color }: { time: string; width: string; color: string }) {
  return <div className="grid grid-cols-[36px_1fr] items-center gap-3"><span className="text-xs font-bold text-slate-400">{time}</span><div className="h-3 rounded-full bg-slate-100"><div className={`h-full rounded-full ${color}`} style={{ width }} /></div></div>;
}

function TradeVisual() {
  return <div className="relative h-[300px] w-full max-w-md"><div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-[#11181c] text-center text-white shadow-xl"><span className="text-2xl">⌂</span><b className="mt-1 text-xs">우리 집 태양광</b></div><TradeNode className="left-0 top-4" icon="☀" title="생산" value="4.2 kWh" tone="text-amber" /><TradeNode className="right-0 top-4" icon="⌁" title="잉여" value="1.6 kWh" tone="text-teal" /><TradeNode className="bottom-0 left-1/2 -translate-x-1/2" icon="↔" title="활용·거래" value="연결 가능" tone="text-amber" /><svg viewBox="0 0 400 300" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden><path d="M105 68 Q150 85 175 120 M295 68 Q250 85 225 120 M200 205 L200 245" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeDasharray="5 6" /></svg></div>;
}

function TradeNode({ className, icon, title, value, tone }: { className: string; icon: string; title: string; value: string; tone: string }) {
  return <div className={`absolute z-10 w-28 rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-md ${className}`}><div className="text-xl">{icon}</div><div className="mt-1 text-[10px] text-slate-400">{title}</div><div className={`mt-1 text-xs font-black ${tone}`}>{value}</div></div>;
}

function Answer({ index, title, body }: { index: string; title: string; body: string }) {
  return <div className="bg-white p-7 md:p-8"><span className="text-xs font-black text-slate-300">{index}</span><h3 className="mt-8 text-2xl font-black">{title}</h3><p className="mt-3 break-keep text-sm leading-7 text-slate-500">{body}</p></div>;
}
