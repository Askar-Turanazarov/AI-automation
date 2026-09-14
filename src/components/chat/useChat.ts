"use client";

import { useEffect, useRef, useState } from "react";

/** kind — служебный ответ (ИИ недоступен или ошибка): модели не отправляется */
export type ChatMsg = { role: "user" | "assistant"; content: string; meta?: string; kind?: "offline" | "error" };

// служебные ответы и оставшиеся без ответа вопросы перед ними модели не нужны
const forModel = (list: ChatMsg[]) => list.filter((m, i) => !m.kind && !list[i + 1]?.kind);

/**
 * Общий поток чата: сообщение пользователя → POST → ответ ассистента (или ошибка сети) + автопрокрутка списка.
 * Формат запроса (body) и разбор ответа (toReply, вызывается и для не-OK ответов) — у каждого чата свои.
 */
export function useChat<D>({
  url,
  body,
  toReply,
  networkError,
  onSettled,
  scrollKey,
}: {
  url: string;
  body: (messages: ChatMsg[]) => unknown;
  toReply: (res: Response, data: D) => Omit<ChatMsg, "role">;
  networkError: string;
  onSettled?: () => void;
  /** дополнительный повод прокрутить список вниз (например, открытие окна) */
  scrollKey?: unknown;
}) {
  const [msgs, setMsgs] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, loading, scrollKey]);

  async function request(history: ChatMsg[]) {
    setMsgs(history);
    setLoading(true);
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body(forModel(history))),
      });
      const data = await res.json();
      setMsgs([...history, { role: "assistant", ...toReply(res, data) }]);
    } catch {
      setMsgs([...history, { role: "assistant", content: networkError, kind: "error" }]);
    } finally {
      setLoading(false);
      onSettled?.();
    }
  }

  function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    setInput("");
    return request([...msgs, { role: "user", content }]);
  }

  /** повторить последний вопрос: убираем служебный ответ и отправляем историю заново */
  function retry() {
    if (loading || !msgs.at(-1)?.kind) return;
    return request(msgs.slice(0, -1));
  }

  return { msgs, setMsgs, input, setInput, loading, send, retry, listRef };
}
