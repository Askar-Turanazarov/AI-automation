"use client";

import clsx from "clsx";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Price } from "@/components/Price";
import { IconButton, Spinner } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import type { Locale } from "@/i18n/config";
import { sendJson } from "@/lib/http";
import { localizeService } from "@/lib/i18n-data";
import { TranslateBar } from "./TranslateBar";
import { mergeTranslations, suffix } from "./translations";

type Draft = {
  name: string;
  nameUz: string;
  nameEn: string;
  category: string;
  categoryUz: string;
  categoryEn: string;
  description: string;
  descriptionUz: string;
  descriptionEn: string;
  durationMin: number;
  price: number;
  active: boolean;
};
type Service = Draft & { id: string; bookings: number; masters: number };

const blank: Draft = { name: "", nameUz: "", nameEn: "", category: "", categoryUz: "", categoryEn: "", description: "", descriptionUz: "", descriptionEn: "", durationMin: 60, price: 0, active: true };

export function ServicesManager({ services }: { services: Service[] }) {
  const { t, locale } = useI18n();
  const ts = t.admin.services;
  const [editId, setEditId] = useState<string | "new" | null>(null);
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-white/[.06] text-left text-xs uppercase tracking-wider text-fog">
              <th className="px-5 py-3 font-semibold">{ts.service}</th>
              <th className="px-3 py-3 font-semibold">{ts.category}</th>
              <th className="px-3 py-3 text-right font-semibold">{ts.duration}</th>
              <th className="px-3 py-3 text-right font-semibold">{ts.price}</th>
              <th className="px-3 py-3 text-right font-semibold">{ts.mastersCol}</th>
              <th className="px-3 py-3 text-right font-semibold">{ts.bookingsCol}</th>
              <th className="w-28 px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[.05]">
            {services.map((raw) => {
              if (editId === raw.id) return <Row key={raw.id} initial={raw} id={raw.id} onDone={() => setEditId(null)} />;
              const s = localizeService(raw, locale);
              return (
                <tr key={s.id} className={clsx("transition hover:bg-white/[.02]", !s.active && "opacity-45")}>
                  <td className="px-5 py-4">
                    <div className="font-semibold">{s.name}</div>
                    <div className="line-clamp-1 max-w-sm text-xs text-fog">{s.description}</div>
                  </td>
                  <td className="px-3 py-4 text-fog">{s.category}</td>
                  <td className="px-3 py-4 text-right tabular-nums">{s.durationMin} {t.common.min}</td>
                  <td className="px-3 py-4 text-right tabular-nums"><Price amount={s.price} locale={locale} align="right" mainClassName="font-semibold" /></td>
                  <td className="px-3 py-4 text-right tabular-nums text-fog">{s.masters}</td>
                  <td className="px-3 py-4 text-right tabular-nums text-fog">{s.bookings}</td>
                  <td className="px-5 py-4 text-right">
                    <IconButton onClick={() => setEditId(s.id)} label={t.common.edit}><Pencil className="h-4 w-4" /></IconButton>
                  </td>
                </tr>
              );
            })}
            {editId === "new" && <Row initial={blank} onDone={() => setEditId(null)} />}
          </tbody>
        </table>
      </div>
      {editId !== "new" && (
        <button onClick={() => setEditId("new")} className="flex w-full items-center justify-center gap-2 border-t border-white/[.06] py-4 text-sm text-fog hover:bg-white/[.02] hover:text-bone">
          <Plus className="h-4 w-4" /> {ts.add}
        </button>
      )}
    </div>
  );
}

function Row({ initial, id, onDone }: { initial: Draft; id?: string; onDone: () => void }) {
  const { t } = useI18n();
  const ts = t.admin.services;
  const router = useRouter();
  const [d, setD] = useState<Draft>(() => {
    const { name, nameUz, nameEn, category, categoryUz, categoryEn, description, descriptionUz, descriptionEn, durationMin, price, active } = initial;
    return { name, nameUz, nameEn, category, categoryUz, categoryEn, description, descriptionUz, descriptionEn, durationMin, price, active };
  });
  const [lang, setLang] = useState<Locale>("ru");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const k = (base: "name" | "category" | "description") => `${base}${suffix(lang)}` as keyof Draft;
  const text = (base: "name" | "category" | "description") => String(d[k(base)] ?? "");
  const set = (base: "name" | "category" | "description", v: string) => setD({ ...d, [k(base)]: v });

  // Сохранение и удаление: при ошибке строка остаётся в режиме редактирования
  async function send(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown) {
    setBusy(true);
    setError("");
    const res = await sendJson(url, method, body, t.common);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    router.refresh();
    onDone();
  }
  const save = () => send(id ? `/api/admin/services/${id}` : "/api/admin/services", id ? "PATCH" : "POST", d);
  function remove() {
    if (id && confirm(ts.deleteConfirm)) send(`/api/admin/services/${id}`, "DELETE");
  }

  return (
    <tr className="bg-forge/[.04] align-top">
      <td className="px-5 py-3">
        <TranslateBar
          lang={lang}
          onLang={setLang}
          filled={{ uz: !!(d.nameUz && d.categoryUz), en: !!(d.nameEn && d.categoryEn) }}
          fields={{ name: d.name, category: d.category, description: d.description }}
          onResult={(r) => setD((x) => mergeTranslations(x, r, ["name", "category", "description"]))}
        />
        <input className="input mt-2 !py-2" lang={lang} placeholder={lang === "ru" ? ts.name : d.name} value={text("name")} onChange={(e) => set("name", e.target.value)} />
        <input className="input mt-2 !py-2 text-xs" lang={lang} placeholder={lang === "ru" ? ts.description : d.description} value={text("description")} onChange={(e) => set("description", e.target.value)} />
        <label className="mt-2 flex items-center gap-2 text-xs text-fog"><input type="checkbox" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} className="accent-[#ff5a1f]" /> {ts.active}</label>
        {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
      </td>
      <td className="px-3 py-3 pt-[62px]"><input className="input !py-2" lang={lang} placeholder={lang === "ru" ? ts.category : d.category} value={text("category")} onChange={(e) => set("category", e.target.value)} /></td>
      <td className="px-3 py-3 pt-[62px]"><input type="number" step={15} min={15} className="input !py-2 text-right" value={d.durationMin} onChange={(e) => setD({ ...d, durationMin: +e.target.value })} /></td>
      <td className="px-3 py-3 pt-[62px]"><input type="number" step={50000} min={0} className="input !py-2 text-right" value={d.price} onChange={(e) => setD({ ...d, price: +e.target.value })} /></td>
      <td colSpan={2} />
      <td className="px-5 py-3 pt-[62px]">
        <div className="flex justify-end gap-1">
          {id && <button onClick={remove} className="rounded-full p-2 text-red-300 hover:bg-red-400/10" aria-label={t.common.delete}><Trash2 className="h-4 w-4" /></button>}
          <button onClick={onDone} className="rounded-full p-2 text-fog hover:bg-white/5" aria-label={t.common.cancel}><X className="h-4 w-4" /></button>
          <button onClick={save} disabled={busy} className="rounded-full bg-forge p-2 text-black" aria-label={t.common.save}>{busy ? <Spinner /> : <Check className="h-4 w-4" />}</button>
        </div>
      </td>
    </tr>
  );
}
