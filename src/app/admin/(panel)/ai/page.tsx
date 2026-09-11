import { PageTitle } from "@/components/admin/AdminNav";
import { AiConsole } from "@/components/admin/AiConsole";

export default function AiPage() {
  return (
    <div>
      <PageTitle title="ИИ-аналитик" sub="Задайте вопрос о загрузке, выручке и записях — ответ строится на живых данных" />
      <AiConsole />
    </div>
  );
}
