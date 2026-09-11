"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";

export const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "◔ Ожидает", cls: "text-ember border-ember/30 bg-ember/10" },
  confirmed: { label: "● Подтверждена", cls: "text-sky-300 border-sky-400/30 bg-sky-400/10" },
  done: { label: "✓ Выполнена", cls: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10" },
  cancelled: { label: "✕ Отменена", cls: "text-red-300 border-red-400/30 bg-red-400/10" },
};

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);

  async function change(next: string) {
    if (next === "cancelled" && !confirm("Отменить запись? Клиент и владелец получат уведомление.")) return;
    setBusy(true);
    const res = await fetch(`/api/admin/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
    if (res.ok) {
      setValue(next);
      router.refresh();
    }
    setBusy(false);
  }

  return (
    <select
      value={value}
      disabled={busy}
      onChange={(e) => change(e.target.value)}
      className={clsx("w-full cursor-pointer appearance-none rounded-full border px-3 py-1.5 text-xs font-semibold outline-none", STATUS[value]?.cls)}
    >
      {Object.entries(STATUS).map(([k, v]) => (
        <option key={k} value={k} className="bg-coal text-bone">{v.label}</option>
      ))}
    </select>
  );
}
