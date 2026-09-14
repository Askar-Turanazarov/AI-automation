import { runAssistant, AllModelsFailedError } from "@/lib/ai/router";
import { fail, handle, ok } from "@/lib/api";
import { BUSINESS } from "@/lib/business";

const SYSTEM = `You are a professional localization copywriter for "${BUSINESS.name}", a car tuning atelier in Tashkent, Uzbekistan.
Input is JSON: {"fields": {key: Russian text}, "names": {key: a person's name in Cyrillic}}.
Return ONLY a JSON object, no markdown, in this exact shape:
{"uz": {<every key of fields>: Uzbek text}, "en": {<every key of fields>: English text}, "latin": {<every key of names>: the name in Latin script}}
Rules:
- Translate naturally, the way a native copywriter would write it — not word for word. Keep the meaning, tone and length close to the original.
- Uzbek: modern Latin alphabet (o', g', sh, ch, ng). Use terms Uzbek drivers actually use (chip-tyuning, osma, chiqarish tizimi, tonirovka, PPF plyonka).
- Keep established tuning terms and brand names as they are (Stage 1, PPF, downpipe, coilovers, Akrapovič).
- Names: transliterate as written in Uzbek passports (e.g. "Шерзод Каримов" → "Sherzod Karimov", "Дмитрий Волков" → "Dmitriy Volkov").`;

const strings = (v: unknown) =>
  Object.fromEntries(
    Object.entries((v ?? {}) as Record<string, unknown>).filter(([, s]) => typeof s === "string" && s.trim()) as [string, string][],
  );

export const POST = handle(async (req: Request) => {
  const body = await req.json();
  const fields = strings(body.fields);
  const names = strings(body.names);
  if (!Object.keys(fields).length && !Object.keys(names).length) return ok({ uz: {}, en: {}, latin: {} });

  try {
    const r = await runAssistant({
      system: SYSTEM,
      messages: [{ role: "user", content: JSON.stringify({ fields, names }) }],
      tools: [],
      ctx: { channel: "admin", locale: "ru" },
      maxSteps: 1,
    });
    const json = JSON.parse(
      r.text
        .replace(/^\s*```(?:json)?/i, "")
        .replace(/```\s*$/, "")
        .trim(),
    );
    return ok({ uz: strings(json.uz), en: strings(json.en), latin: strings(json.latin) });
  } catch (e) {
    if (e instanceof AllModelsFailedError) return fail(e.message, 503, "ai_unavailable");
    if (e instanceof SyntaxError) return fail("AI returned invalid JSON, try again", 502, "bad_ai_response");
    throw e;
  }
});
