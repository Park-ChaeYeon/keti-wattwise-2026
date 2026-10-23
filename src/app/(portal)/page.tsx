import Image from "next/image";
import Link from "next/link";

const BP = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
const photo = (name: string) => `${BP}/img/photos/${name}.jpg`;

export default function Home() {
  return (
    <div className="bleed -mt-8 -mb-8 bg-white">
      <section className="relative min-h-[640px] overflow-hidden bg-[#FAF6EC] lg:min-h-[700px]">
        <Image src={photo("family-kitchen")} alt="" fill unoptimized className="hidden scale-110 object-cover blur-2xl lg:block" />
        <div className="absolute inset-0 hidden bg-gradient-to-r from-[#FAF6EC]/70 via-[#FAF6EC]/45 to-[#FAF6EC]/15 lg:block" />
        <div className="absolute inset-0 lg:left-[30%] lg:[mask-image:linear-gradient(to_right,transparent,black_20%)]">
          <Image src={photo("family-kitchen")} alt="주방에 모여 사진을 함께 보는 가족" fill priority unoptimized className="object-cover object-[60%_30%] lg:object-[35%_40%]" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#FAF6EC] via-[#FAF6EC]/90 via-45% to-transparent lg:hidden" />
        </div>
        <p className="absolute bottom-3 right-4 z-10 rounded-full bg-black/45 px-2.5 py-1 text-[10px] leading-4 text-white/90 backdrop-blur">사진 <a href="https://commons.wikimedia.org/wiki/File:A_family_gathered_in_the_kitchen_at_home_looking_at_photographs_(16308914556).jpg" target="_blank" rel="noreferrer" className="underline">Personal Creations</a>, <a href="https://creativecommons.org/licenses/by/2.0" target="_blank" rel="noreferrer" className="underline">CC BY 2.0</a></p>
        <div className="relative mx-auto flex min-h-[640px] max-w-6xl items-end px-4 pb-14 pt-10 lg:min-h-[700px] lg:items-center lg:py-12">
          <div className="max-w-xl">
            <h1 className="break-keep text-4xl font-black leading-[1.35] tracking-[-0.03em] text-ink md:text-5xl md:leading-[1.35] lg:text-[3.4rem]">
              전기요금부터<br />에너지 효율까지<br />스마트하게
            </h1>
            <p className="mt-6 break-keep text-base font-semibold leading-8 text-ink md:text-lg">
              전력 사용량부터 예상 전기요금까지,<br />에너지 사용 현황을 한눈에 확인하세요.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/households" className="btn !rounded-full bg-[#3D2B1F] px-7 py-3.5 text-base text-white hover:bg-[#2C1F16]">우리 집 진단 시작</Link>
              <Link href="/analytics" className="btn !rounded-full border border-[#3D2B1F]/25 bg-white/60 px-7 py-3.5 text-base text-[#3D2B1F] hover:bg-white">요금 예측 보기</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:py-20">
        <div className="rounded-[2rem] bg-[#FAF6EC] px-6 py-10 md:px-12 md:py-12">
        <h2 className="text-center text-4xl font-black tracking-[-0.03em] text-ink md:text-[2.75rem]">WattWise</h2>
        <div className="mt-10 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-6">
          <Tile href="/analytics" image={photo("kitchen-laptop")} title="사용량·요금 예측" body="내일 24시간, 이번 달 요금" />
          <Tile href="/households" image={photo("feature-kettle")} title="가족 안부 확인" body="평소와 다른 생활 신호" />
          <Tile href="/solar" image={photo("solar-roof")} title="태양광 설치 계산" body="발전량과 손익분기" />
          <Tile href="/trade" image={photo("power-lines")} title="남는 전기 거래" body="잉여 전력 판매 체험" />
        </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl space-y-16 px-4 pb-6 md:space-y-24">
          <Feature
            image={photo("feature-app")}
            alt="휴대폰과 노트북에 띄운 가전별 전력 사용량 대시보드"
            title={<>이번 달 전기요금,<br />미리 예측하고 아껴 보세요</>}
            points={["내일 24시간 전력 사용량을 시간대별로 예측", "누진 구간까지 남은 사용량을 확인", "에어컨·TV·세탁기 등 주요 가전의 전력 소비를 분석"]}
            actions={[{ href: "/analytics", label: "요금 예측 보기" }]}
          />

          <Feature
            reverse
            image={photo("feature-kettle")}
            alt="거실 탁자 위 전기포트와 TV를 보며 차를 마시는 사람"
            title={<>멀리 있어도,<br />부모님의 일상을 살펴보세요</>}
            points={["집 안 기기의 전력 사용 패턴을 학습", "TV·전기포트 등의 활동 변화가 감지되면 알림", "전력 데이터는 집 안에서 처리해 개인정보를 보호"]}
            actions={[{ href: "/households", label: "안부 신호 보기" }]}
          />

          <Feature
            image={photo("feature-solar-house")}
            alt="지붕에 태양광 패널을 얹은 단독주택"
            title={<>우리 집 태양광,<br />얼마나 이득일까요?</>}
            points={["주소와 지붕 조건을 바탕으로 연간 발전량을 예측", "예상 설치비와 투자 회수 기간을 확인", "남는 전력의 판매 과정을 직접 체험"]}
            actions={[{ href: "/solar", label: "태양광 계산하기" }, { href: "/trade", label: "거래 체험", ghost: true }]}
          />
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-6xl px-4 pb-20">
        <div className="flex flex-col items-center justify-center gap-4 py-6 sm:flex-row sm:gap-10">
          <div className="relative h-48 w-44 md:h-60 md:w-52">
            <Image src={`${BP}/img/wattwise-ai-consultant.png`} alt="전력 AI 상담사 와티" fill unoptimized className="object-contain drop-shadow-xl" />
          </div>
          <div>
            <Link href="/chat" className="group inline-flex items-center gap-3 rounded-full bg-amber px-9 py-4 text-xl font-black text-white shadow-lg shadow-amber/30 transition hover:-translate-y-0.5 hover:brightness-105 hover:shadow-xl md:px-12 md:py-5 md:text-2xl">
              와티에게 물어보기
              <span className="transition group-hover:translate-x-1" aria-hidden>→</span>
            </Link>
          </div>
        </div>
        </div>
      </section>
    </div>
  );
}

function Tile({ href, image, title, body }: { href: string; image: string; title: string; body: string }) {
  return (
    <Link href={href} className="group">
      <div className="relative aspect-[4/3] overflow-hidden rounded-3xl"><Image src={image} alt="" fill unoptimized className="object-cover transition duration-500 group-hover:scale-105" /></div>
      <div className="mt-3 text-base font-black text-ink md:text-lg">{title}</div>
      <div className="mt-0.5 text-xs text-slate-500 md:text-sm">{body}</div>
    </Link>
  );
}

function Feature({ image, alt, credit, title, points, actions, reverse }: { image: string; alt: string; credit?: React.ReactNode; title: React.ReactNode; points: string[]; actions: { href: string; label: string; ghost?: boolean }[]; reverse?: boolean }) {
  return (
    <article className="grid items-center gap-8 lg:grid-cols-2 lg:gap-14">
      <div className={`relative aspect-[4/3] overflow-hidden rounded-[2rem] ${reverse ? "lg:order-2" : ""}`}>
        <Image src={image} alt={alt} fill unoptimized className="object-cover" />
        {credit && <p className="absolute bottom-3 left-4 rounded-full bg-black/45 px-2.5 py-1 text-[10px] leading-4 text-white/90 backdrop-blur">{credit}</p>}
      </div>
      <div className={reverse ? "lg:order-1" : ""}>
        <h2 className="break-keep text-3xl font-black leading-[1.2] tracking-[-0.03em] text-ink md:text-4xl">{title}</h2>
        <ul className="mt-6 space-y-3">
          {points.map((p) => (
            <li key={p} className="flex items-start gap-3 text-base leading-7 text-ink">
              <svg viewBox="0 0 24 24" className="mt-1 h-5 w-5 shrink-0 text-teal" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 12.5l5 5L20 6.5" /></svg>
              <span className="break-keep">{p}</span>
            </li>
          ))}
        </ul>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          {actions.map((a) => (
            <Link key={a.href} href={a.href} className={`${a.ghost ? "btn-ghost" : "btn-primary"} flex-1 !rounded-2xl py-4 text-lg`}>{a.label}</Link>
          ))}
        </div>
      </div>
    </article>
  );
}
