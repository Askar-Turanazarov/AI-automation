"use client";

import clsx from "clsx";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, CalendarCheck, Phone, RotateCcw, RotateCw, Send, Sparkles, WifiOff, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { type ChatMsg, useChat } from "@/components/chat/useChat";
import { IconButton } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import { BUSINESS } from "@/lib/business";

const KEY = "of-chat";

export function ChatWidget() {
  const { t, locale } = useI18n();
  const [open, setOpen] = useState(false);
  const { msgs, setMsgs, input, setInput, loading, send, retry, listRef } = useChat({
    url: "/api/chat",
    body: (messages) => ({ messages: messages.map(({ role, content }) => ({ role, content })), locale }),
    toReply: (res, data: { text?: string; error?: string }) =>
      res.ok
        ? { content: data.text ?? t.common.error }
        : { content: data.error ?? t.common.error, kind: res.status === 503 ? "offline" : "error" },
    networkError: t.common.networkError,
    scrollKey: open,
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) setMsgs(JSON.parse(saved));
    } catch {}
    // detail — готовый текст вопроса (например, из квиза подбора тюнинга)
    const onOpen = (e: Event) => {
      setOpen(true);
      const text = (e as CustomEvent<unknown>).detail;
      if (typeof text === "string") setInput(text);
    };
    window.addEventListener("open-chat", onOpen);
    return () => window.removeEventListener("open-chat", onOpen);
  }, [setMsgs, setInput]);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(msgs.filter((m) => !m.kind).slice(-30)));
    } catch {}
  }, [msgs]);

  // приветствие не хранится в истории — оно всегда на текущем языке
  const shown: ChatMsg[] = [{ role: "assistant", content: t.chat.greeting }, ...msgs];
  const offline = msgs.at(-1)?.kind === "offline";

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            onClick={() => setOpen(true)}
            className="btn-forge fixed right-5 bottom-5 z-50 flex items-center gap-2 rounded-full py-3 pr-5 pl-4 font-semibold text-black shadow-2xl"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-black/40" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-black" />
            </span>
            {t.chat.button}
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
            className="fixed right-0 bottom-0 z-50 flex h-[100dvh] w-full flex-col overflow-hidden border border-white/10 bg-coal/95 shadow-[0_30px_120px_-20px_rgba(255,90,31,.35)] backdrop-blur-xl sm:right-5 sm:bottom-5 sm:h-[620px] sm:max-h-[calc(100dvh-40px)] sm:w-[400px] sm:rounded-3xl lg:h-[760px] lg:w-[480px] xl:h-[820px] xl:w-[540px]"
          >
            <div className="flex items-center gap-3 border-b border-white/8 px-5 py-4">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-forge to-ember text-black">
                <Sparkles className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-display text-sm font-semibold">{t.chat.title}</div>
                <div className="flex items-center gap-1.5 text-xs text-fog">
                  <span className={clsx("h-1.5 w-1.5 rounded-full", offline ? "bg-ember" : "bg-emerald-400")} />
                  {offline ? t.chat.statusOffline : t.chat.status}
                </div>
              </div>
              <IconButton onClick={() => setMsgs([])} title={t.chat.newChat} label={t.chat.newChat}>
                <RotateCcw className="h-4 w-4" />
              </IconButton>
              <IconButton onClick={() => setOpen(false)} label={t.common.close}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>

            <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
              {shown.map((m, i) => {
                const last = i === shown.length - 1 && !loading;
                if (m.kind === "offline") return <OfflineCard key={i} onRetry={last ? retry : undefined} />;
                return (
                  <div key={i} className={clsx("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={clsx(
                        "max-w-[85%] rounded-2xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap",
                        m.role === "user" ? "rounded-br-md bg-forge text-black" : "rounded-bl-md border border-white/8 bg-white/[.04]",
                        m.kind === "error" && "border-forge/30 text-fog",
                      )}
                    >
                      {m.content}
                      {m.kind === "error" && last && (
                        <button
                          onClick={retry}
                          className="mt-2 flex items-center gap-1.5 text-sm font-semibold text-forge transition hover:text-ember"
                        >
                          <RotateCw className="h-3.5 w-3.5" /> {t.chat.retry}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
              {loading && (
                <div className="flex gap-1 px-2 py-3">
                  {[0, 1, 2].map((i) => (
                    <motion.span
                      key={i}
                      className="h-2 w-2 rounded-full bg-forge"
                      animate={{ opacity: [0.2, 1, 0.2] }}
                      transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                    />
                  ))}
                </div>
              )}
              {!msgs.length && !loading && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {t.chat.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="rounded-full border border-white/10 px-3 py-1.5 text-sm text-fog transition hover:border-forge/60 hover:text-bone"
                    >
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
                placeholder={t.chat.placeholder}
                className="input max-h-32 min-h-[48px] resize-none"
              />
              <button disabled={!input.trim() || loading} aria-label={t.common.send} className="btn-forge h-12 w-12 shrink-0 !p-0">
                <ArrowUp className="h-5 w-5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Заглушка, когда ни одна модель не ответила: запись и контакты работают без ИИ */
function OfflineCard({ onRetry }: { onRetry?: () => void }) {
  const { t, locale } = useI18n();
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl border border-ember/25 bg-gradient-to-br from-ember/[.08] to-transparent p-4"
    >
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ember/15 text-ember">
          <WifiOff className="h-4 w-4" />
        </div>
        <div>
          <div className="font-display text-sm font-semibold">{t.chat.offlineTitle}</div>
          <p className="mt-1 text-sm leading-relaxed text-fog">{t.chat.offlineText}</p>
        </div>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <Link href={`/${locale}/book`} className="btn-forge col-span-2 py-2.5 text-sm">
          <CalendarCheck className="h-4 w-4" /> {t.hero.ctaBook}
        </Link>
        <a href={`tel:${BUSINESS.phone.replace(/\s/g, "")}`} className="btn-ghost px-3 py-2.5 text-sm">
          <Phone className="h-4 w-4" /> {t.chat.call}
        </a>
        <a
          href={`https://t.me/${BUSINESS.telegramBot}`}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-ghost px-3 py-2.5 text-sm"
        >
          <Send className="h-4 w-4" /> Telegram
        </a>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-3 flex w-full items-center justify-center gap-1.5 text-sm text-fog transition hover:text-bone"
        >
          <RotateCw className="h-3.5 w-3.5" /> {t.chat.retry}
        </button>
      )}
    </motion.div>
  );
}
