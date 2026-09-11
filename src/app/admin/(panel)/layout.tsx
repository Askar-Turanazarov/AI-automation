import { AdminNav } from "@/components/admin/AdminNav";

export const metadata = { title: "Админка — Octane Forge" };

export default function PanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <AdminNav />
      <div className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-10">{children}</div>
    </div>
  );
}
