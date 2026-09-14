"use client";

import { Camera, ImagePlus, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { IconButton, Spinner } from "@/components/ui";
import { useI18n } from "@/i18n/client";

type Update = { id: string; text: string; photoFileId: string | null; createdAt: string };

/** Этапы работ по записи (текст + фото); клиент из Telegram получает каждый этап сообщением */
export function WorkUpdates({ bookingId, title, count, tgClient }: { bookingId: string; title: string; count: number; tgClient: boolean }) {
  const { t, locale } = useI18n();
  const tw = t.admin.updates;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Update[] | null>(null);
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);
  const url = `/api/admin/bookings/${bookingId}/updates`;

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    fetch(url)
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems)
      .catch(() => setItems([]));
    return () => window.removeEventListener("keydown", onKey);
  }, [open, url]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData();
    form.set("text", text);
    if (file) form.set("photo", file);
    try {
      const res = await fetch(url, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) return setError(data.error ?? t.common.error);
      setItems((list) => [...(list ?? []), data]);
      setText("");
      setFile(null);
      if (fileInput.current) fileInput.current.value = "";
      router.refresh();
    } catch {
      setError(t.common.networkError);
    } finally {
      setBusy(false);
    }
  }

  const when = (iso: string) =>
    new Date(iso).toLocaleString(locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title={tw.title}
        aria-label={tw.title}
        className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-white/10 text-fog transition hover:border-forge/50 hover:text-bone"
      >
        <Camera className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 grid h-4 min-w-4 place-items-center rounded-full bg-forge px-1 text-[10px] font-bold text-black">
            {count}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={tw.title}
            onClick={(e) => e.stopPropagation()}
            className="card flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden"
          >
            <div className="flex items-start justify-between gap-3 border-b border-white/[.06] p-5">
              <div className="min-w-0">
                <h2 className="font-display text-lg font-semibold">{tw.title}</h2>
                <p className="truncate text-sm text-fog">{title}</p>
              </div>
              <IconButton onClick={() => setOpen(false)} label={t.common.close}>
                <X className="h-5 w-5" />
              </IconButton>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto p-5">
              {!items ? (
                <Spinner className="mx-auto h-5 w-5 text-forge" />
              ) : !items.length ? (
                <p className="text-sm text-fog">{tw.empty}</p>
              ) : (
                items.map((u) => (
                  <div key={u.id} className="rounded-2xl border border-white/[.07] bg-white/[.02] p-3">
                    <div className="text-xs text-fog">{when(u.createdAt)}</div>
                    <p className="mt-1 text-sm">{u.text}</p>
                    {u.photoFileId && (
                      // фото из Telegram через наш прокси: размеры заранее неизвестны, next/image не подходит
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`/api/photos/${u.id}`}
                        alt={u.text}
                        loading="lazy"
                        className="mt-2 max-h-56 w-full rounded-xl object-cover"
                      />
                    )}
                  </div>
                ))
              )}
              {!tgClient && <p className="text-xs text-fog/80">{tw.webClient}</p>}
            </div>

            <form onSubmit={submit} className="space-y-3 border-t border-white/[.06] p-5">
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder={tw.placeholder}
                aria-label={tw.placeholder}
                className="input resize-none"
              />
              <div className="flex items-center justify-between gap-3">
                <label className="btn-ghost min-w-0 cursor-pointer !px-4 !py-2 text-sm">
                  <ImagePlus className="h-4 w-4 shrink-0" />
                  <span className="truncate">{file ? file.name : tw.photo}</span>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  />
                </label>
                <button disabled={busy || text.trim().length < 2} className="btn-forge shrink-0 !py-2 text-sm">
                  {busy && <Spinner />} {tw.add}
                </button>
              </div>
              {error && (
                <p role="alert" className="text-sm text-red-300">
                  {error}
                </p>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
