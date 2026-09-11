import { PageTitle } from "@/components/admin/AdminNav";
import { AiConsole } from "@/components/admin/AiConsole";
import { getDict } from "@/i18n";
import { getRequestLocale } from "@/i18n/server";

export default async function AiPage() {
  const t = getDict(await getRequestLocale());
  return (
    <div>
      <PageTitle title={t.admin.ai.title} sub={t.admin.ai.sub} />
      <AiConsole />
    </div>
  );
}
