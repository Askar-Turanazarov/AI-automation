"use client";

import clsx from "clsx";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useI18n } from "@/i18n/client";

const STATUS_CLS: Record<string, string> = {
  pending: "text-ember border-ember/30 bg-ember/10",
  confirmed: "text-sky-300 border-sky-400/30 bg-sky-400/10",
  done: "text-emerald-300 border-emerald-400/30 bg-emerald-400/10",
  cancelled: "text-red-300 border-red-400/30 bg-red-400/10",
};

export function StatusSelect({ id, status }: { id: string; status: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function change(next: string) {
    if (next === "cancelled" && !confirm(t.admin.bookings.cancelConfirm)) return;
    const prev = value;
    setValue(next);
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/bookings/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
      if (res.ok) {
        router.refresh();
      } else {
        setValue(prev);
        setError((await res.json().catch(() => ({}))).error ?? t.common.error);
      }
    } catch {
      setValue(prev);
      setError(t.common.networkError);
    } finally {
      setBusy(false);
    }
  }

  return (
    <select
      value={value}
      disabled={busy}
      title={error || undefined}
      aria-invalid={!!error || undefined}
      onChange={(e) => change(e.target.value)}
      className={clsx("w-full cursor-pointer appearance-none rounded-full border px-3 py-1.5 text-xs font-semibold outline-none", STATUS_CLS[value])}
    >
      {Object.entries(t.admin.status).map(([k, label]) => (
        <option key={k} value={k} className="bg-coal text-bone">{label}</option>
      ))}
    </select>
  );
}
