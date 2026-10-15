import { NextResponse } from "next/server";
import { APPLIANCE_LABELS, type ApplianceId } from "@/features/appliances/config";
import { currentUser } from "@/lib/auth";
import { bill, TIER_LIMIT, won } from "@/lib/domain";
import { errorDetail, runPythonJson } from "@/server/python";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OLLAMA_URL = process.env.OLLAMA_URL ?? "http://localhost:11434";
const MODEL = process.env.WATTWISE_CHAT_MODEL ?? "qwen2.5:1.5b";

const SYSTEM_PROMPT = `당신은 WattWise Pi 프로젝트를 설명하는 도우미입니다. 라즈베리파이 한 대로 가정 전력을 거래(Trade)·절감(Save)·이상탐지(Protect)하는 온디바이스 전력 비서를 만드는 프로젝트입니다.

핵심 사실:
- Trade(전력 거래): 실시간 요금과 태양광 발전량을 예측해 쌀 때 충전, 비쌀 때 판매 시점을 자동 판단합니다.
- Save(전기요금 절감): 이번 달 사용량을 예측해 누진 3구간(450kWh 초과 시 단가 급등, 307.3원/kWh) 진입 전 미리 경고합니다.
- Protect(이상 사용 감지): 오토인코더(비지도학습)로 평소 전력 패턴을 학습하고, 복원 오차가 급증하면 이상으로 판단합니다. 실험 결과 F1 0.90·재현율 0.93·오탐률 0.10·리드타임 1일.
- 데이터: 공개 데이터(AI Hub NILM 110가구) + 팀원이 직접 자취방에 라즈베리파이·CT센서를 설치해 수집한 실측 데이터. 정빈·진규는 1인가구(TV·에어컨·세탁기 3종 측정), 채연은 4인가구(TV·에어컨·제습기·세탁기 4종 측정 — 제습기는 채연 가정에만 있음).
- 예측 모델: Chronos-2 시계열 모델을 가전·사람별로 파인튜닝해 로컬에서 24시간 예측을 수행합니다. '자취방 실증'과 '전력 분석' 페이지에서 실제 확인 가능합니다.
- 태양광: 위치·경사·방위 기반 발전량 추정과 손익분기(BEP) 계산을 제공합니다.
- 프라이버시: 모든 예측·이상탐지가 온디바이스(집 안 라즈베리파이)에서 실행되어 데이터가 집 밖으로 나가지 않습니다.
- 팀: 고려대 팀, 멘토는 조인표 연구원(에너지AI연구센터), KETI 경진대회 출품작이며 마감은 2026년 10월 말입니다.

답변 규칙: 한국어로 3~5문장 이내로 간결하게 답하세요. 모르는 내용은 지어내지 말고 모른다고 하세요.`;

type ChatMsg = { role: "user" | "assistant" | "system"; content: string };

const APPLIANCE_ALIASES: Record<string, ApplianceId> = {
  tv: "tv",
  티비: "tv",
  텔레비전: "tv",
  에어컨: "에어컨",
  에어콘: "에어컨",
  냉방: "에어컨",
  제습기: "제습기",
  제습: "제습기",
  세탁기: "세탁기",
  세탁: "세탁기",
  빨래: "세탁기",
};

const HOUSEHOLD: Record<string, string> = { 정빈: "1인가구", 진규: "1인가구", 채연: "4인가구" };
const PEOPLE = Object.keys(HOUSEHOLD);

function detectAppliance(text: string): ApplianceId | null {
  const lower = text.toLowerCase();
  for (const [alias, id] of Object.entries(APPLIANCE_ALIASES)) {
    if (lower.includes(alias)) return id;
  }
  return null;
}

function detectPeople(text: string): string[] | null {
  const named = PEOPLE.filter((p) => text.includes(p));
  const found = new Set(named);
  const groups = [
    { mentioned: /4인|네\s*식구/.test(text), type: "4인가구" },
    { mentioned: /1인|혼자/.test(text), type: "1인가구" },
  ];
  // "정빈 1인가구"처럼 이름이 이미 그 가구 형태에 속하면 같은 형태의 다른 사람까지 넓히지 않는다.
  for (const { mentioned, type } of groups) {
    if (mentioned && !named.some((p) => HOUSEHOLD[p] === type)) {
      PEOPLE.filter((p) => HOUSEHOLD[p] === type).forEach((p) => found.add(p));
    }
  }
  return found.size > 0 ? Array.from(found) : null;
}

function loginPerson(): string | null {
  const name = currentUser()?.name ?? "";
  return PEOPLE.find((p) => name.includes(p)) ?? null;
}

type Intent = "lookup" | "advice";

const CONCEPT = /거래|태양광|발전|이상\s*(탐지|감지)|안부|프로젝트|팀|멘토|모델|챗봇|라즈베리|센서/;
const BILL = /요금|누진|구간|비용|금액|돈/;
const ENERGY = /전력|전기|에너지|가전|kwh|사용량|소비량|전력량/i;
const USAGE = /사용|소비|소모|썼|써|쓰|얼마|많이|적게|비교|평균|패턴|합계|총/;
const ADVICE = /팁|절약|절전|아끼|아낄|줄이|줄일|방법|추천|관리/;
const MINE = /우리|내\s*집|저희|이번\s*달/;

// "전력 거래가 뭐야?"처럼 가전·사람 없이 '전력'만 들어간 개념 질문에는 실측 데이터를 붙이지 않는다.
function detectIntent(q: string, appliance: ApplianceId | null, people: string[] | null): Intent | null {
  const specific = appliance !== null || people !== null;
  if (!specific && CONCEPT.test(q)) return null;
  if (!specific && !BILL.test(q) && !ENERGY.test(q)) return null;
  if (ADVICE.test(q)) return "advice";
  if (appliance || BILL.test(q) || USAGE.test(q)) return "lookup";
  return null;
}

type UsageRow = {
  appliance: ApplianceId;
  person: string;
  periodStart: string;
  periodEnd: string;
  dailyAvgKwh: number;
  last24hTotalKwh: number;
};

async function fetchUsageRows(): Promise<UsageRow[]> {
  return runPythonJson<UsageRow[]>({ cwd: "dashboard", script: "usage_summary.py", timeout: 15_000 });
}

const MONTH_DAYS = 30;

const num = (v: number) => (v >= 10 ? v.toFixed(1) : v >= 0.1 ? v.toFixed(2) : v.toFixed(3));
const kwh = (v: number) => `${num(v)}kWh`;
const who = (person: string) => (HOUSEHOLD[person] ? `${person}(${HOUSEHOLD[person]})` : person);

type Grounding = { lead: string; facts: string[]; note: string; required: string[]; appliances: ApplianceId[] };

const noData = (sentence: string): Grounding => ({ lead: sentence, facts: [], note: "", required: [], appliances: [] });

function applianceGrounding(appliance: ApplianceId, people: string[] | null, rows: UsageRow[]): Grounding {
  const label = APPLIANCE_LABELS[appliance];
  const owners = rows.filter((r) => r.appliance === appliance);
  const hits = owners.filter((r) => !people || people.includes(r.person));
  if (hits.length === 0) {
    const scope = people ? `${people.join(", ")} 가정에는` : "어느 가정에도";
    const ownerNote =
      owners.length > 0 ? ` ${label} 실측 데이터는 ${owners.map((r) => who(r.person)).join(", ")} 가정에만 있습니다.` : "";
    return noData(`${scope} ${label} 실측 데이터가 없습니다.${ownerNote}`);
  }
  const periods = Array.from(new Set(hits.map((r) => `${r.periodStart}~${r.periodEnd}`)));
  const facts = hits.map(
    (r) =>
      `${who(r.person)}의 ${label} 사용량은 하루 평균 ${kwh(r.dailyAvgKwh)}, 측정 마지막 24시간 ${kwh(r.last24hTotalKwh)}입니다.` +
      (periods.length > 1 ? ` (측정 기간 ${r.periodStart}~${r.periodEnd})` : ""),
  );
  if (hits.length > 1) {
    const ranked = [...hits].sort((a, b) => b.dailyAvgKwh - a.dailyAvgKwh);
    facts.push(
      `하루 평균 기준으로 ${who(ranked[0].person)} 가정이 가장 많이, ${who(ranked[ranked.length - 1].person)} 가정이 가장 적게 씁니다.`,
    );
  }
  const periodNote = periods.length === 1 ? ` 측정 기간은 ${periods[0]}입니다.` : "";
  return {
    lead: `라즈베리파이·CT센서로 실제 측정한 ${label} 전력 사용량입니다.${periodNote}`,
    facts,
    note: "",
    required: hits.flatMap((r) => [r.person, num(r.dailyAvgKwh)]),
    appliances: [appliance],
  };
}

function householdGrounding(people: string[] | null, rows: UsageRow[]): Grounding {
  const persons = Array.from(new Set(rows.map((r) => r.person))).filter((p) => !people || people.includes(p));
  if (persons.length === 0) {
    return noData(`${people?.join(", ") ?? "요청한"} 가정의 실측 데이터가 없습니다.`);
  }
  const homes = persons.map((person) => {
    const items = rows
      .filter((r) => r.person === person)
      .map((r) => ({ id: r.appliance, label: APPLIANCE_LABELS[r.appliance], month: r.dailyAvgKwh * MONTH_DAYS }))
      .sort((a, b) => b.month - a.month);
    const month = items.reduce((sum, a) => sum + a.month, 0);
    return { person, items, month, charge: bill(month) };
  });
  const facts = homes.map(({ person, items, month, charge }) => {
    const [top, ...rest] = items;
    const share = Math.round((top.month / month) * 100);
    const tierNote =
      charge.tier < 3
        ? `누진 ${charge.tier}구간이고 ${charge.tier + 1}구간(${TIER_LIMIT[charge.tier - 1]}kWh)까지 ${kwh(TIER_LIMIT[charge.tier - 1] - month)} 남았습니다.`
        : "이미 누진 3구간입니다.";
    const restNote = rest.length > 0 ? ` 그다음은 ${rest.map((a) => `${a.label} ${kwh(a.month)}`).join(", ")}입니다.` : "";
    return (
      `${who(person)} 가정은 측정한 가전 ${items.length}개 기준 한 달 사용량이 약 ${kwh(month)}, 예상 전기요금이 약 ${won(charge.total)}입니다. ${tierNote}` +
      ` 가장 많이 쓰는 가전은 ${top.label}(한 달 약 ${kwh(top.month)}, 전체의 ${share}%)입니다.${restNote}`
    );
  });
  if (homes.length > 1) {
    const ranked = [...homes].sort((a, b) => b.month - a.month);
    facts.push(
      `한 달 사용량 기준으로 ${who(ranked[0].person)} 가정이 가장 많이, ${who(ranked[ranked.length - 1].person)} 가정이 가장 적게 씁니다.`,
    );
  }
  return {
    lead: "",
    facts,
    note: "측정한 가전만 합산한 값이라 냉장고·조명 등은 포함되지 않습니다. 한 달 사용량은 최근 30일 하루 평균 × 30일, 요금은 주택용 저압 누진제(200/400kWh 경계) 기준입니다.",
    required: homes.flatMap(({ person, month, charge }) => [person, num(month), won(charge.total)]),
    appliances: Array.from(new Set(homes.flatMap(({ items }) => items.map((a) => a.id)))),
  };
}

const factText = (g: Grounding) =>
  [g.lead, g.facts.length === 1 ? g.facts[0] : g.facts.map((f) => `- ${f}`).join("\n"), g.note]
    .filter(Boolean)
    .join("\n");

// 1.5B 모델이 스스로 지어내는 절약 팁은 틀리기 쉬워서(예: "온도를 낮게 유지"), 고를 수 있는 검증된 목록을 준다.
const SAVING_TIPS: Record<ApplianceId, string> = {
  에어컨: "설정 온도 26℃ 이상 유지, 타이머·취침 모드 활용, 필터 청소와 실외기 주변 통풍 확보, 선풍기 병행",
  tv: "안 볼 때 끄기, 멀티탭 스위치로 대기전력 차단, 화면 밝기 낮추기",
  세탁기: "빨래를 모아서 한 번에 돌리기, 찬물 세탁, 건조 기능 줄이기",
  제습기: "창문을 닫고 가동, 목표 습도를 너무 낮게 잡지 않기, 필터 청소",
};
const COMMON_TIPS = "대기전력 차단, 사용 시간대 분산, 누진 구간 경계에 가까워지면 사용량 점검";

// 1.5B 모델은 표의 숫자를 가정끼리 섞으므로, 가정별로 완성된 문장을 주고 그대로 옮기게 한다.
function lookupContext(g: Grounding): string {
  if (g.facts.length === 0) return `[실측 데이터 없음] 다음 내용을 그대로 답하고 수치를 지어내지 마세요: "${g.lead}"`;
  return `[실측 데이터]
${factText(g)}
위 ${g.facts.length}개 문장을 하나도 빠뜨리지 말고 가정 이름과 수치를 그대로 옮겨 전달하세요. 직접 계산하거나 비교하지 말고 위 문장에 있는 내용만 말하세요. 없는 데이터를 지어내거나, 센서 설치나 실시간 분석이 필요하다는 일반론은 하지 마세요.`;
}

function adviceContext(g: Grounding): string {
  const tips = [...g.appliances.map((a) => `${APPLIANCE_LABELS[a]}: ${SAVING_TIPS[a]}`), `공통: ${COMMON_TIPS}`];
  return `[실측 데이터]
${factText(g)}
[참고할 절약 방법]
${tips.join("\n")}
위 실측 데이터를 바탕으로 질문에 맞는 관리·절약 방법을 2~3문장으로 제안하세요. 가장 많이 쓰는 가전부터 줄이도록, 참고 목록에 있는 방법만 골라 권하세요. 수치는 답변 앞에 따로 표시되므로 숫자는 쓰지 말고, 센서 설치나 실시간 분석이 필요하다는 일반론은 하지 마세요.`;
}

const unitNumbers = (text: string) =>
  (text.match(/\d[\d,]*(?:\.\d+)?\s*(?:kwh|원|%)/gi) ?? []).map((n) => n.replace(/\s+/g, "").toLowerCase());

// 모델이 "TV(80%)"처럼 실측에 없는 수치를 보태면 그 답변은 버린다.
function hasForeignNumbers(reply: string, g: Grounding): boolean {
  const allowed = new Set(unitNumbers(factText(g)));
  return unitNumbers(reply).some((n) => !allowed.has(n));
}

// 조언에 섞인 숫자(kWh·원·%)는 모델이 지어낸 값이므로 그 문장을 통째로 뺀다.
function withoutNumberClaims(text: string): string {
  return text
    .split("\n")
    .map((line) =>
      line
        .split(/(?<=[.!?])\s+/)
        .filter((s) => !/\d\s*(kwh|원|%)/i.test(s))
        .join(" "),
    )
    .filter((line) => line.trim())
    .join("\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: ChatMsg[] };
    const history = (body.messages ?? []).filter((m) => m.role === "user" || m.role === "assistant");
    if (history.length === 0) {
      return NextResponse.json({ error: "메시지가 비어 있습니다." }, { status: 400 });
    }

    const lastUser = history.map((m) => m.role).lastIndexOf("user");
    const question = lastUser >= 0 ? history[lastUser].content : "";
    const appliance = detectAppliance(question);
    const named = detectPeople(question);
    const intent = detectIntent(question, appliance, named);

    let grounding: Grounding | null = null;
    if (intent) {
      const me = loginPerson();
      const mine = me !== null && (intent === "advice" || BILL.test(question) || MINE.test(question));
      const people = named ?? (mine ? [me] : null);
      try {
        const rows = await fetchUsageRows();
        grounding = appliance ? applianceGrounding(appliance, people, rows) : householdGrounding(people, rows);
      } catch (e) {
        console.error("usage summary lookup failed", e);
        grounding = noData("지금은 실측 데이터를 불러오지 못했습니다.");
      }
    }
    const advising = intent === "advice" && grounding !== null && grounding.facts.length > 0;

    // 근거를 system 메시지가 아니라 질문 바로 뒤에 붙여야 1.5B 모델이 가정을 빠뜨리지 않는다.
    const turns = history.map((m, i) => {
      if (i !== lastUser || !grounding) return m;
      const context = advising ? adviceContext(grounding) : lookupContext(grounding);
      return { ...m, content: `${m.content}\n\n${context}` };
    });
    const messages: ChatMsg[] = [{ role: "system", content: SYSTEM_PROMPT }, ...turns];

    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages,
        stream: false,
        options: grounding ? { temperature: advising ? 0.3 : 0.1 } : undefined,
      }),
    });

    if (!res.ok) {
      const detail = await res.text();
      throw new Error(`Ollama ${res.status}: ${detail}`);
    }

    const data = (await res.json()) as { message?: { content?: string } };
    const reply = data.message?.content?.trim();
    if (!reply) throw new Error("Ollama가 빈 응답을 반환했습니다.");

    if (grounding && advising) {
      return NextResponse.json({ reply: `${factText(grounding)}\n\n${withoutNumberClaims(reply)}`.trim() });
    }
    if (grounding && (!grounding.required.every((s) => reply.includes(s)) || hasForeignNumbers(reply, grounding))) {
      console.warn("chat reply dropped measured facts; answering with the facts directly");
      return NextResponse.json({ reply: factText(grounding) });
    }
    return NextResponse.json({ reply });
  } catch (error) {
    const detail = errorDetail(error);
    const connectionRefused = /ECONNREFUSED|fetch failed/i.test(detail);
    return NextResponse.json(
      {
        error: connectionRefused
          ? `로컬 Ollama 서버에 연결할 수 없습니다. 'ollama serve'가 실행 중인지, '${MODEL}' 모델이 받아져 있는지 확인해 주세요.`
          : "로컬 모델 응답 중 오류가 발생했습니다.",
        detail,
      },
      { status: 500 },
    );
  }
}
