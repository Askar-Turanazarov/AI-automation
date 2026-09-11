import { getRequestLocale } from "@/i18n/server";
import { askAnalyst } from "@/lib/ai/assistant";
import { AllModelsFailedError, getAiStatus } from "@/lib/ai/router";
import { fail, handle, ok } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handle(async () => {
  const logs = await prisma.aiLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 });
  return ok({ chain: getAiStatus(), logs });
});

export const POST = handle(async (req: Request) => {
  const { messages } = await req.json();
  if (!Array.isArray(messages) || !messages.length) return fail("messages required");
  try {
    const r = await askAnalyst(messages, await getRequestLocale());
    return ok({ text: r.text, provider: r.provider, model: r.model, fallbacks: r.fallbacks });
  } catch (e) {
    if (e instanceof AllModelsFailedError) return fail(e.message, 503, "ai_unavailable");
    throw e;
  }
});
