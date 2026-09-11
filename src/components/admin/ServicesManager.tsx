"use client";

import clsx from "clsx";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Spinner } from "@/components/ui";
import { formatPrice } from "@/lib/time";

type Service = { id: string; name: string; category: string; description: string; durationMin: number; price: number; active: boolean; bookings: number; masters: number };
type Draft = Omit<Service, "id" | "bookings" | "masters">;

const blank: Draft = { name: "", category: "", description: "", durationMin: 60, price: 0, active: true };

export function ServicesManager({ services }: { services: Service[] }) {
  const [editId, setEditId] = useState<string | "new" | null>(null);
  return (
    <div className="card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-white/[.06] text-left text-xs uppercase tracking-wider text-fog">
              <th className="px-5 py-3 font-semibold">Услуга</th>
              <th className="px-3 py-3 font-semibold">Категория</th>
              <th className="px-3 py-3 text-right font-semibold">Длительность</th>
              <th className="px-3 py-3 text-right font-semibold">Цена</th>
              <th className="px-3 py-3 text-right font-semibold">Мастеров</th>
              <th className="px-3 py-3 text-right font-semibold">Записей</th>
              <th className="w-24 px-5 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-white/[.05]">
            {services.map((s) =>
              editId === s.id ? (
                <Row key={s.id} initial={s} id={s.id} onDone={() => setEditId(null)} />
              ) : (
                <tr key={s.id} className={clsx("transition hover:bg-white/[.02]", !s.active && "opacity-45")}>
                  <td className="px-5 py-4">
                    <div className="font-semibold">{s.name}</div>
                    <div className="line-clamp-1 max-w-sm text-xs text-fog">{s.description}</div>
                  </td>
                  <td className="px-3 py-4 text-fog">{s.category}</td>
                  <td className="px-3 py-4 text-right tabular-nums">{s.durationMin} мин</td>
                  <td className="px-3 py-4 text-right font-semibold tabular-nums">{formatPrice(s.price)}</td>
                  <td className="px-3 py-4 text-right tabular-nums text-fog">{s.masters}</td>
                  <td className="px-3 py-4 text-right tabular-nums text-fog">{s.bookings}</td>
                  <td className="px-5 py-4 text-right">
                    <button onClick={() => setEditId(s.id)} className="rounded-full p-2 text-fog hover:bg-white/5 hover:text-bone" aria-label="Редактировать"><Pencil className="h-4 w-4" /></button>
                  </td>
                </tr>
              ),
            )}
            {editId === "new" && <Row initial={blank} onDone={() => setEditId(null)} />}
          </tbody>
        </table>
      </div>
      {editId !== "new" && (
        <button onClick={() => setEditId("new")} className="flex w-full items-center justify-center gap-2 border-t border-white/[.06] py-4 text-sm text-fog hover:bg-white/[.02] hover:text-bone">
          <Plus className="h-4 w-4" /> Добавить услугу
        </button>
      )}
    </div>
  );
}

function Row({ initial, id, onDone }: { initial: Draft; id?: string; onDone: () => void }) {
  const router = useRouter();
  const [d, setD] = useState<Draft>({ name: initial.name, category: initial.category, description: initial.description, durationMin: initial.durationMin, price: initial.price, active: initial.active });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setBusy(true);
    const res = await fetch(id ? `/api/admin/services/${id}` : "/api/admin/services", { method: id ? "PATCH" : "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(d) });
    setBusy(false);
    if (!res.ok) return setError((await res.json()).error ?? "Ошибка");
    router.refresh();
    onDone();
  }
  async function remove() {
    if (!id || !confirm("Удалить услугу? Если по ней есть записи — она будет скрыта.")) return;
    await fetch(`/api/admin/services/${id}`, { method: "DELETE" });
    router.refresh();
    onDone();
  }

  return (
    <tr className="bg-forge/[.04] align-top">
      <td className="px-5 py-3">
        <input className="input !py-2" placeholder="Название" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} />
        <input className="input mt-2 !py-2 text-xs" placeholder="Описание" value={d.description} onChange={(e) => setD({ ...d, description: e.target.value })} />
        <label className="mt-2 flex items-center gap-2 text-xs text-fog"><input type="checkbox" checked={d.active} onChange={(e) => setD({ ...d, active: e.target.checked })} className="accent-[#ff5a1f]" /> активна</label>
        {error && <div className="mt-1 text-xs text-red-400">{error}</div>}
      </td>
      <td className="px-3 py-3"><input className="input !py-2" placeholder="Категория" value={d.category} onChange={(e) => setD({ ...d, category: e.target.value })} /></td>
      <td className="px-3 py-3"><input type="number" step={15} min={15} className="input !py-2 text-right" value={d.durationMin} onChange={(e) => setD({ ...d, durationMin: +e.target.value })} /></td>
      <td className="px-3 py-3"><input type="number" step={1000} min={0} className="input !py-2 text-right" value={d.price} onChange={(e) => setD({ ...d, price: +e.target.value })} /></td>
      <td colSpan={2} />
      <td className="px-5 py-3">
        <div className="flex justify-end gap-1">
          {id && <button onClick={remove} className="rounded-full p-2 text-red-300 hover:bg-red-400/10" aria-label="Удалить"><Trash2 className="h-4 w-4" /></button>}
          <button onClick={onDone} className="rounded-full p-2 text-fog hover:bg-white/5" aria-label="Отмена"><X className="h-4 w-4" /></button>
          <button onClick={save} disabled={busy} className="rounded-full bg-forge p-2 text-black" aria-label="Сохранить">{busy ? <Spinner /> : <Check className="h-4 w-4" />}</button>
        </div>
      </td>
    </tr>
  );
}
