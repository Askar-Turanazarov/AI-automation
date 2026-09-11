import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { getDict } from "@/i18n";
import { getRequestLocale } from "@/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: getDict(await getRequestLocale()).meta.adminTitle };
}

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav />
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</div>
    </div>
  );
}
