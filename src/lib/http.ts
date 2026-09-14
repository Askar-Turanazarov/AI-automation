// JSON-запросы из клиентских компонентов: без исключений, ошибка уже переведена в текст для пользователя

type Messages = { error: string; networkError: string };
export type SendResult<T> = { ok: true; data: T } | { ok: false; error: string };

export async function sendJson<T = unknown>(
  url: string,
  method: "POST" | "PATCH" | "DELETE",
  body: unknown,
  messages: Messages,
): Promise<SendResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await res.json().catch(() => null);
    return res.ok ? { ok: true, data } : { ok: false, error: data?.error ?? messages.error };
  } catch {
    return { ok: false, error: messages.networkError };
  }
}
