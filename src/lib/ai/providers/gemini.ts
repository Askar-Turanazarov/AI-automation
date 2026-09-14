import { GoogleGenAI, ThinkingLevel, type Content, type FunctionDeclaration, type Part } from "@google/genai";
import { EmptyResponseError, type ProviderAdapter } from "../types";

let client: GoogleGenAI | null = null;

// Gemini 3 Flash по умолчанию думает на high — для консультаций это медленно; у Flash-Lite по умолчанию уже minimal
const thinkingConfig = (model: string) =>
  /^gemini-(3|flash-latest)/.test(model) && !model.includes("lite") ? { thinkingLevel: ThinkingLevel.LOW } : undefined;

export const gemini: ProviderAdapter = {
  id: "gemini",
  available: () => !!process.env.GEMINI_API_KEY,
  async run({ model, system, messages, tools, execTool, timeoutMs, maxSteps }) {
    client ??= new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
    const contents: Content[] = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const functionDeclarations: FunctionDeclaration[] = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parametersJsonSchema: t.parameters,
    }));

    for (let step = 0; step < maxSteps; step++) {
      const res = await client.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: system,
          thinkingConfig: thinkingConfig(model),
          tools: functionDeclarations.length ? [{ functionDeclarations }] : undefined,
          abortSignal: AbortSignal.timeout(timeoutMs),
        },
      });
      const calls = res.functionCalls;
      if (!calls?.length) {
        const text = res.text?.trim();
        if (!text) throw new EmptyResponseError();
        return text;
      }
      // Сохраняем нативный content модели целиком — в нём thoughtSignature, обязательные для function calling
      const modelContent = res.candidates?.[0]?.content;
      if (modelContent) contents.push(modelContent);
      const parts: Part[] = [];
      for (const c of calls) {
        const result = await execTool(c.name ?? "", c.args ?? {});
        parts.push({ functionResponse: { id: c.id, name: c.name, response: { result } } });
      }
      contents.push({ role: "user", parts });
    }
    throw new Error("Gemini: too many tool steps");
  },
};
