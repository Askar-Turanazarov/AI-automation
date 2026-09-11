"use client";

import clsx from "clsx";
import { ArrowUp, CircleAlert, CircleCheck, CircleDashed, KeyRound, RefreshCw, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Spinner } from "@/components/ui";

type Msg = { role: "user" | "assistant"; content: string; meta?: string };
type ChainItem = { priority: number; provider: string; model: string; key: string; hasKey: boolean; state: string; cooldownSec: number; failures: number; lastError: string | null };
type Log = { id: string; provider: string; model: string; ok: boolean; error: string; latencyMs: number; channel: string; createdAt: string };

const PROMPTS = ["Как загружены мастера на этой неделе?", "Сравни выручку за последние 7 дней с предыдущими 7", "Какие услуги приносят больше всего денег за месяц?", "Кого из мастеров стоит догрузить и как?"];

const STATE = {
  ready: { label: "готова", icon: CircleCheck, cls: "text-emerald-300" },
  cooldown: { label: "пауза", icon: CircleDashed, cls: "text-ember" },
  disabled: { label: "ошибка ключа", icon: CircleAlert, cls: "text-red-300" },
  no_key: { label: "нет ключа", icon: KeyRound, cls: "text-fog" },
} as Record<string, { label: string; icon: typeof CircleCheck; cls: string }>;

/** Минимальный рендер markdown: **жирный** и списки */
function Rich({ text }: { text: string }) {
  return (
    <div className="space-y-1.5">
      {text.split("\n").map((line, i) => {
        const bullet = /^\s*[-*•]\s+/.test(line);
        const parts = line.replace(/^\s*[-*•]\s+/, "").replace(/^#+\s*/, "").split(/(\*\*[^*]+\*\*)/g);
        const content = parts.map((p, j) => (p.startsWith("**") ? <strong key={j} className="text-bone">{p.slice(2, -2)}</strong> : p));
        if (!line.trim()) return <div key={i} className="h-1" />;
        return bullet ? <div key={i} className="flex gap-2"><span className="text-forge">•</span><span>{content}</span></div> : <p key={i}>{content}</p>;
      })}
    </div>
  );
}

export function AiConsole() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<{ chain: ChainItem[]; logs: Log[] } | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadStatus = useCallback(() => fetch("/api/admin/ai").then((r) => r.json()).then(setStatus), []);
  useEffect(() => {
    loadStatus();
  }, [loadStatus]);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const next: Msg[] = [...msgs, { role: "user", content: text.trim() }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.map(({ role, content }) => ({ role, content })) }) });
      const data = await res.json();
      setMsgs([...next, res.ok ? { role: "assistant", content: data.text, meta: `${data.provider} · ${data.model}${data.fallbacks ? ` · переключений: ${data.fallbacks}` : ""}` } : { role: "assistant", content: `⚠️ ${data.error}` }]);
    } finally {
      setLoading(false);
      loadStatus();
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_380px]">
      <div className="card flex h-[calc(100dvh-220px)] min-h-[520px] flex-col overflow-hidden">
        <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto p-6">
          {!msgs.length && (
            <div className="grid h-full place-items-center text-center">
              <div>
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-forge to-ember text-black"><Sparkles className="h-6 w-6" /></div>
                <p className="mt-4 text-fog">Спросите о бизнесе — аналитик сам достанет данные</p>
                <div className="mt-6 flex max-w-xl flex-wrap justify-center gap-2">
                  {PROMPTS.map((p) => (
                    <button key={p} onClick={() => send(p)} className="rounded-full border border-white/10 px-3.5 py-2 text-sm text-fog transition hover:border-forge/60 hover:text-bone">{p}</button>
                  ))}
                </div>
              </div>
            </div>
          )}
          {msgs.map((m, i) => (
            <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div className={clsx("max-w-[85%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed", m.role === "user" ? "rounded-br-md bg-forge text-black" : "rounded-bl-md border border-white/8 bg-white/[.03] text-bone/90")}>
                {m.role === "assistant" ? <Rich text={m.content} /> : m.content}
                {m.meta && <div className="mt-2 text-[11px] text-fog">{m.meta}</div>}
              </div>
            </div>
          ))}
          {loading && <div className="flex items-center gap-2 text-sm text-fog"><Spinner className="text-forge" /> Анализирую данные…</div>}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2 border-t border-white/[.06] p-3">
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Например: какая загрузка у Армана в следующие 2 недели?" className="input" />
          <button disabled={!input.trim() || loading} className="btn-forge h-12 w-12 shrink-0 !p-0" aria-label="Отправить"><ArrowUp className="h-5 w-5" /></button>
        </form>
      </div>

      <div className="space-y-6">
        <div className="card p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-display text-sm font-semibold">Цепочка моделей</div>
              <div className="text-xs text-fog">Автопереключение при сбоях · AI_CHAIN</div>
            </div>
            <button onClick={loadStatus} className="rounded-full p-2 text-fog hover:bg-white/5 hover:text-bone" aria-label="Обновить"><RefreshCw className="h-4 w-4" /></button>
          </div>
          <div className="space-y-2">
            {status?.chain.map((c) => {
              const s = STATE[c.state] ?? STATE.ready;
              return (
                <div key={c.key} className="flex items-center gap-3 rounded-xl border border-white/[.06] bg-white/[.02] px-3 py-2.5">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-white/[.06] text-xs font-semibold">{c.priority}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-semibold">{c.model}</div>
                    <div className="text-xs text-fog">{c.provider}{c.lastError && c.state !== "ready" ? ` · ${c.lastError.slice(0, 40)}` : ""}</div>
                  </div>
                  <span className={clsx("flex shrink-0 items-center gap-1 text-xs", s.cls)}>
                    <s.icon className="h-3.5 w-3.5" /> {s.label}{c.state === "cooldown" ? ` ${c.cooldownSec}с` : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card p-5">
          <div className="mb-4 font-display text-sm font-semibold">Журнал вызовов</div>
          <div className="max-h-80 space-y-1 overflow-y-auto text-xs">
            {!status?.logs.length && <div className="text-fog">Пока пусто</div>}
            {status?.logs.map((l) => (
              <div key={l.id} className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-white/[.03]" title={l.error}>
                {l.ok ? <CircleCheck className="mt-px h-3.5 w-3.5 shrink-0 text-emerald-300" /> : <CircleAlert className="mt-px h-3.5 w-3.5 shrink-0 text-red-300" />}
                <div className="min-w-0 flex-1">
                  <div className="truncate">{l.model} <span className="text-fog">· {l.channel}</span></div>
                  {!l.ok && <div className="truncate text-red-300/80">{l.error}</div>}
                </div>
                <span className="shrink-0 tabular-nums text-fog">{(l.latencyMs / 1000).toFixed(1)}с · {new Date(l.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
