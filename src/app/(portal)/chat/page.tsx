"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { answer, type Msg } from "@/lib/chatbot";

const TOPICS = [
  { title: "이번 달 요금 진단", prompt: "이번 달 전기요금과 누진 구간을 어떻게 관리하면 좋을지 알려줘", icon: "₩" },
  { title: "가전 사용량 비교", prompt: "우리 집에서 어떤 가전의 전력 사용량이 가장 큰지 분석해줘", icon: "⌁" },
  { title: "태양광 설치 상담", prompt: "우리 집 태양광 설치 전에 어떤 정보를 확인해야 해?", icon: "☀" },
  { title: "이상 사용 확인", prompt: "전력 이상탐지는 어떤 기준으로 판단하는지 설명해줘", icon: "!" },
];

export default function ChatPage() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "bot", text: "안녕하세요. WattWise 전력 AI 상담사 **와티**입니다.\n전기요금, 가전 사용량, 태양광과 이상 사용에 대해 무엇이든 물어보세요." }]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, loading]);

  async function send(text: string) {
    const q = text.trim();
    if (!q || loading) return;
    const next: Msg[] = [...msgs, { role: "user", text: q }];
    setMsgs(next); setInput(""); setLoading(true);
    const reply = await answer(next);
    setLoading(false); setMsgs((current) => [...current, { role: "bot", text: reply }]);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3"><div><div className="eyebrow">WattWise AI advisor</div><h1 className="text-2xl font-black tracking-tight">전력 AI 상담센터</h1><p className="mt-1 text-sm text-slate-500">실측 데이터와 WattWise 서비스 정보를 바탕으로 전력 사용에 답합니다.</p></div><div className="flex items-center gap-2 text-xs text-slate-400"><span className="h-2 w-2 rounded-full bg-ok" />상담 가능 · 로컬 AI 연결</div></div>

      <div className="grid min-h-[690px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-pop lg:grid-cols-[300px_1fr]">
        <aside className="relative overflow-hidden bg-[#11181c] p-6 text-white">
          <div className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-teal/25 blur-3xl" /><div className="absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-amber/20 blur-3xl" />
          <div className="relative flex h-full flex-col">
            <div className="relative mx-auto h-48 w-44"><Image src="/img/wattwise-ai-consultant.png" alt="WattWise 번개 모양 전력 AI 상담사 와티" fill priority unoptimized className="object-contain drop-shadow-2xl" /></div>
            <div className="text-center"><div className="text-xl font-black">와티</div><div className="mt-1 text-xs font-semibold text-[#54dbe6]">WattWise Energy Advisor</div><p className="mt-3 text-xs leading-5 text-white/45">복잡한 전력 데이터를 일상적인 언어로 설명하는 AI 상담사입니다.</p></div>
            <div className="mt-7 space-y-2">{["전기요금·누진제 상담", "가전별 사용량 분석", "태양광 수익성 안내", "이상 사용 패턴 설명"].map((item) => <div key={item} className="flex items-center gap-2 rounded-lg bg-white/[0.06] px-3 py-2.5 text-xs text-white/65"><span className="text-teal">✓</span>{item}</div>)}</div>
            <div className="mt-auto rounded-xl border border-white/10 bg-white/[0.05] p-3 text-[11px] leading-5 text-white/35">AI 답변은 참고용입니다. 실제 요금·설치·안전 판단은 현장 조건과 공식 안내를 함께 확인해 주세요.</div>
          </div>
        </aside>

        <main className="flex min-w-0 flex-col bg-slate-50/70">
          <div className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4"><div><div className="text-sm font-bold">와티와 상담 중</div><div className="mt-0.5 text-[11px] text-slate-400">Qwen 2.5 · WattWise 데이터 컨텍스트</div></div><button type="button" onClick={() => setMsgs([{ role: "bot", text: "새 상담을 시작할게요. 어떤 전력 문제가 궁금하신가요?" }])} className="btn-ghost !py-1.5 text-xs">새 상담</button></div>
          <div className="flex-1 space-y-5 overflow-y-auto p-4 md:p-6">
            {msgs.length === 1 && <div className="grid gap-2 sm:grid-cols-2">{TOPICS.map((topic) => <button key={topic.title} type="button" onClick={() => send(topic.prompt)} className="group rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal/40 hover:shadow-card"><div className="flex items-center justify-between"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-teal-soft text-sm font-black text-teal">{topic.icon}</span><span className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-teal">→</span></div><div className="mt-3 text-sm font-bold">{topic.title}</div><div className="mt-1 text-xs text-slate-400">상담 시작하기</div></button>)}</div>}
            {msgs.map((message, index) => <div key={index} className={`flex gap-2.5 ${message.role === "user" ? "justify-end" : "justify-start"}`}>{message.role === "bot" && <div className="relative mt-1 h-9 w-9 shrink-0 overflow-hidden rounded-xl bg-amber-soft"><Image src="/img/wattwise-ai-consultant.png" alt="" fill unoptimized className="object-contain p-0.5" /></div>}<div className={`max-w-[80%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm ${message.role === "user" ? "rounded-br-md bg-ink text-white" : "rounded-bl-md border border-slate-200 bg-white text-slate-700"}`} dangerouslySetInnerHTML={{ __html: message.text.replace(/\*\*(.+?)\*\*/g, "<b>$1</b>") }} /></div>)}
            {loading && <div className="flex items-center gap-2.5"><div className="relative h-9 w-9 overflow-hidden rounded-xl bg-amber-soft"><Image src="/img/wattwise-ai-consultant.png" alt="" fill unoptimized className="object-contain p-0.5" /></div><div className="rounded-2xl rounded-bl-md border border-slate-200 bg-white px-4 py-3"><div className="flex gap-1"><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal [animation-delay:-.3s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal [animation-delay:-.15s]" /><span className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal" /></div></div></div>}
            <div ref={endRef} />
          </div>
          <div className="border-t border-slate-200 bg-white p-4"><form onSubmit={(event) => { event.preventDefault(); send(input); }} className="flex items-end gap-2 rounded-2xl border border-slate-300 bg-white p-2 focus-within:border-teal focus-within:ring-2 focus-within:ring-teal/10"><textarea rows={1} value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(input); } }} disabled={loading} placeholder="전기요금, 가전 사용량, 태양광에 대해 물어보세요" className="max-h-28 min-h-[42px] flex-1 resize-none bg-transparent px-2 py-2 text-sm outline-none" /><button disabled={loading || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal font-bold text-white transition hover:brightness-95 disabled:opacity-30">↑</button></form><div className="mt-2 flex items-center justify-between text-[10px] text-slate-400"><span>Enter 전송 · Shift+Enter 줄바꿈</span><Link href="/analytics" className="font-semibold hover:text-teal">내 전력 대시보드 보기 →</Link></div></div>
        </main>
      </div>
    </div>
  );
}
