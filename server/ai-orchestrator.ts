import OpenAI from "openai";

export type AiProvider = "openai" | "gemini" | "claude";

export interface ProviderResult<T> {
  provider: AiProvider;
  ok: boolean;
  data?: T;
  error?: string;
}

const cvSchema = `Return only valid JSON with:
{
  "name": string,
  "headline": string,
  "summary": string,
  "linkedinUrl": string|null,
  "email": string|null,
  "phone": string|null,
  "skills": string[],
  "experience": [{"company": string, "title": string, "startDate": string, "endDate": string, "description": string}],
  "education": [{"institution": string, "degree": string, "field": string, "year": string}]
}`;

function parseJson<T>(content: string): T {
  const cleaned = content.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  return JSON.parse(cleaned);
}

async function callOpenAI(system: string, prompt: string): Promise<unknown> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.OPENAI_API_KEY ? undefined : process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
  const response = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [{ role: "system", content: system }, { role: "user", content: prompt }],
    response_format: { type: "json_object" },
  });
  return parseJson(response.choices[0]?.message?.content || "{}");
}

async function callGemini(system: string, prompt: string): Promise<unknown> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!response.ok) throw new Error(`Gemini returned ${response.status}`);
  const body = await response.json() as any;
  return parseJson(body.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
}

async function callClaude(system: string, prompt: string): Promise<unknown> {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not configured");
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-3-5-haiku-latest",
      max_tokens: 2500,
      system: `${system}\n${cvSchema}`,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  if (!response.ok) throw new Error(`Claude returned ${response.status}`);
  const body = await response.json() as any;
  return parseJson(body.content?.[0]?.text || "{}");
}

const callers: Record<AiProvider, (system: string, prompt: string) => Promise<unknown>> = {
  openai: callOpenAI,
  gemini: callGemini,
  claude: callClaude,
};

export function getAiProviderStatus() {
  return {
    openai: Boolean(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
    gemini: Boolean(process.env.GEMINI_API_KEY),
    claude: Boolean(process.env.ANTHROPIC_API_KEY),
  };
}

export async function orchestrate<T>(system: string, prompt: string): Promise<{ result: T; providers: ProviderResult<T>[] }> {
  const enabled = (Object.keys(callers) as AiProvider[]).filter((provider) => getAiProviderStatus()[provider === "claude" ? "claude" : provider]);
  if (!enabled.length) throw new Error("No AI provider is configured");

  const results = await Promise.all(enabled.map(async (provider): Promise<ProviderResult<T>> => {
    try {
      return { provider, ok: true, data: await callers[provider](system, prompt) as T };
    } catch (error: any) {
      console.error(`${provider} orchestration error:`, error.message);
      return { provider, ok: false, error: error.message || "Provider request failed" };
    }
  }));
  const successful = results.find((item) => item.ok && item.data);
  if (!successful?.data) throw new Error("All configured AI providers failed");
  return { result: successful.data, providers: results };
}

export async function parseCvWithOrchestrator(cvText: string) {
  return orchestrate(
    `You are an expert recruiter parsing a candidate CV. ${cvSchema}`,
    cvText.slice(0, 12000),
  );
}