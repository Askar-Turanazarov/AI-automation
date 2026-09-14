"use client";

import clsx from "clsx";
import { useState } from "react";
import { Spinner } from "@/components/ui";
import { tpl } from "@/i18n";
import { useI18n } from "@/i18n/client";
import { locales, type Locale } from "@/i18n/config";
import { sendJson } from "@/lib/http";

export type TranslateResult = { uz: Record<string, string>; en: Record<string, string>; latin: Record<string, string> };

/** Вкладки RU/UZ/EN для полей перевода + кнопка «заполнить переводы ИИ» */
export function TranslateBar({
  lang,
  onLang,
  filled,
  fields,
  names,
  onResult,
}: {
  lang: Locale;
  onLang: (l: Locale) => void;
  filled: Partial<Record<Locale, boolean>>;
  fields: Record<string, string>;
  names?: Record<string, string>;
  onResult: (r: TranslateResult) => void;
}) {
  const { t } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function translate() {
    setBusy(true);
    setError("");
    const res = await sendJson<TranslateResult>("/api/admin/translate", "POST", { fields, names }, t.common);
    setBusy(false);
    if (res.ok) onResult(res.data);
    else setError(tpl(t.admin.translate.failed, { error: res.error }));
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-full border border-white/10 p-0.5">
          {locales.map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => onLang(l)}
              className={clsx(
                "relative rounded-full px-3 py-1 text-xs font-bold uppercase transition",
                lang === l ? "bg-white/12 text-bone" : "text-fog hover:text-bone",
              )}
            >
              {l}
              {l !== "ru" && !filled[l] && <span className="absolute top-0.5 right-1 h-1.5 w-1.5 rounded-full bg-ember" />}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={translate}
          disabled={busy || !Object.values(fields).some((v) => v.trim())}
          className="btn-ghost !px-3 !py-1.5 text-xs"
        >
          {busy ? (
            <>
              <Spinner className="!h-3 !w-3" /> {t.admin.translate.busy}
            </>
          ) : (
            t.admin.translate.button
          )}
        </button>
      </div>
      <p className={clsx("text-[11px]", error ? "text-red-400" : "text-fog")}>{error || t.admin.translate.hint}</p>
    </div>
  );
}
