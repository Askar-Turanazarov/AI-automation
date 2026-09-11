"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, RotateCcw, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

type Msg = { role: "user" | "assistant"; content: string };

const KEY = "of-chat";
const GREETING: Msg = {
  role: "assistant",
  content: "Привет! Я ИИ-консультант Octane Forge 🔥 Подскажу по тюнингу, ценам и сразу запишу к мастеру. Что хотите сделать с машиной?",
};
const SUGGESTIONS = ["Сколько стоит Stage 1?", "Койловеры или пневма?", "Запиши на тонировку в эту субботу"];

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([GREETING]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setMsgs(JSON.parse(saved));
    } catch {}
    const onOpen = () => setOpen(true);
    window.addEventListener("open-chat", onOpen);
    return () => window.removeEventListener("open-chat", onOpen);
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(msgs.slice(-30)));
    } catch {}
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading, open]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const next = [...msgs, { role: "user" as const, content: t }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next.filter((m) => m !== GREETING) }),
      });
      const data = await res.json();
      setMsgs([...next, { role: "assistant", content: data.text ?? data.error ?? "Что-то пошло не так" }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: "Нет связи с сервером. Попробуйте ещё раз." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="fixed right-5 bottom-5 z-50 flex items-center gap-2 rounded-full py-3 pr-5 pl-4 font-semibold text-black shadow-2xl btn-forge"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black/40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-black" />
            </span>
            ИИ-консультант
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.96 }}
            transition={{ type: "spring", damping: 26, stiffness: 300 }}
            className="fixed right-0 bottom-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden border border-white/10 bg-coal/95 shadow-[0_30px_120px_-20px_rgba(255,90,31,.35)] backdrop-blur-xl sm:right-5 sm:bottom-5 sm:h-[620px] sm:max-h-[calc(100dvh-40px)] sm:w-[400px] sm:rounded-3xl"
          >
            <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-forge to-ember text-black">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-display text-sm font-semibold">Octane AI</div>
                <div className="flex items-center gap-1.5 text-xs text-fog">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> онлайн · консультация и запись
                </div>
              </div>
              <button onClick={() => setMsgs([GREETING])} title="Новый диалог" className="rounded-full p-2 text-fog hover:bg-white/5 hover:text-bone">
                <RotateCcw className="h-4 w-4" />
              </button>
              <button onClick={() => setOpen(false)} className="rounded-full p-2 text-fog hover:bg-white/5 hover:text-bone">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
              {msgs.map((m, i) => (
                <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={clsx(
                      "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap",
                      m.role === "user" ? "rounded-br-md bg-forge text-black" : "rounded-bl-md border border-white/8 bg-white/[.04]",
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-1 px-2 py-3">
                  {[0, 1, 2].map((i) => (
                    <motion.span key={i} className="h-2 w-2 rounded-full bg-forge" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }} />
                  ))}
                </div>
              )}
              {msgs.length === 1 && !loading && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-fog transition hover:border-forge/60 hover:text-bone">
                      {s}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2 border-t border-white/8 p-3"
            >
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    send(input);
                  }
                }}
                rows={1}
                placeholder="Спросите что угодно о тюнинге…"
                className="input max-h-32 min-h-[48px] resize-none"
              />
              <button disabled={!input.trim() || loading} className="btn-forge h-12 w-12 shrink-0 !p-0">
                <ArrowUp className="h-5 w-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
