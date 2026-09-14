"use client";

import { ArrowRight, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Logo, Spinner } from "@/components/ui";
import { useI18n } from "@/i18n/client";
import { sendJson } from "@/lib/http";

export default function LoginPage() {
  const { t } = useI18n();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await sendJson("/api/admin/login", "POST", { password }, t.common);
    setLoading(false);
    if (res.ok) router.replace("/admin");
    else setError(res.error);
  }

  return (
    <main className="relative grid min-h-screen place-items-center px-5">
      <div className="grid-bg absolute inset-0" />
      <div className="absolute top-1/3 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-forge/15 blur-[120px]" />
      <form onSubmit={submit} className="card relative w-full max-w-sm p-8">
        <div className="flex items-center justify-between gap-3">
          <Logo compact />
          <LanguageSwitcher />
        </div>
        <h1 className="mt-8 font-display text-2xl font-bold uppercase">{t.admin.login.title}</h1>
        <p className="mt-2 text-sm text-fog">{t.admin.login.sub}</p>
        <div className="relative mt-6">
          <Lock className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-fog" />
          <input type="password" autoFocus className="input !pl-11" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t.admin.login.password} />
        </div>
        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
        <button disabled={!password || loading} className="btn-forge mt-6 w-full">
          {loading ? <Spinner /> : <>{t.admin.login.submit} <ArrowRight className="h-4 w-4" /></>}
        </button>
      </form>
    </main>
  );
}
