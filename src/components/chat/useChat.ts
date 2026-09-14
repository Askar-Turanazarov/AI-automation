"use client";

import { useEffect, useRef, useState } from "react";

export type ChatMsg = { role: "user" | "assistant"; content: string; meta?: string };

/**
 * Общий поток чата: сообщение пользователя → POST → ответ ассистента (или ошибка сети) + автопрокрутка списка.
 * Формат запроса (body) и разбор ответа (toReply, вызывается и для не-OK ответов) — у каждого чата свои.
 */
export function useChat<D>({ url, body, toReply, networkError, onSettled, scrollKey }: {
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

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;
    const next: ChatMsg[] = [...msgs, { role: "user", content }];
    setMsgs(next);
    setInput("");
    setLoading(true);
    try {
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body(next)) });
      const data = await res.json();
      setMsgs([...next, { role: "assistant", ...toReply(res, data) }]);
    } catch {
      setMsgs([...next, { role: "assistant", content: networkError }]);
    } finally {
      setLoading(false);
      onSettled?.();
    }
  }

  return { msgs, setMsgs, input, setInput, loading, send, listRef };
}
