"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { chipClass } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import { sendJson } from "@/lib/http";

export function PublishToggle({ id, published, disabled }: { id: string; published: boolean; disabled?: boolean }) {
  const { t } = useI18n();
  const tr = t.admin.reviews;
  const router = useRouter();
  const [value, setValue] = useState(published);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setBusy(true);
    setError("");
    const res = await sendJson(`/api/admin/reviews/${id}`, "PATCH", { published: !value }, t.common);
    setBusy(false);
    if (!res.ok) return setError(res.error);
    setValue(!value);
    router.refresh();
  }

  return (
    <button
      onClick={toggle}
      disabled={busy || disabled}
      aria-pressed={value}
      title={error || (disabled ? tr.noTextHint : undefined)}
      className={chipClass(value, "shrink-0 px-3 py-1.5 text-xs disabled:opacity-40")}
    >
      {value ? tr.published : tr.publish}
    </button>
  );
}
