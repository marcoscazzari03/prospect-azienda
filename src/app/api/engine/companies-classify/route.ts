import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { env } from "@/lib/env";
import { workerAuthorized } from "@/lib/server/worker-auth";
import { rateHit } from "@/lib/server/rate";
import { classifyRequestSchema, industryAnswerSchema, industryPrompt, INDUSTRY_SYSTEM, sanitizeIndustries } from "@/lib/domain/industry";

// Settore delle aziende trovate dal worker di Common Crawl sul VPS (punto 92, docs/16-common-crawl.md):
//   POST { companies: [{ name, card }] } (al massimo 20) -> { results: [{ industry, keywords }], usage }
// Stesso testo del workflow «Aziende | Settore»; la chiave di Anthropic resta su Vercel, mai sul VPS. Circa 0,01
// centesimi per azienda con Haiku (misura del Settore del 22/10, registro).
export const maxDuration = 60;
const MODEL = "claude-haiku-5-5";
// Tetto di spesa: 1.000 chiamate al giorno (20.000 aziende, circa 2 €); al ritmo proposto ne servono circa 250 (Code Reviewer).
const DAILY_CALLS = 1000;

export async function POST(request: Request) {
  if (!workerAuthorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const parsed = classifyRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "aziende non valide" }, { status: 400 });
  const key = env.anthropicApiKey();
  if (!key) return NextResponse.json({ error: "settore non disponibile" }, { status: 503 });
  if (!(await rateHit("vps", "companies_classify", 86_400, DAILY_CALLS))) {
    return NextResponse.json({ error: "limite giornaliero raggiunto" }, { status: 429 });
  }
  const companies = parsed.data.companies;
  try {
    const client = new Anthropic({ apiKey: key, timeout: 45_000, maxRetries: 1 });
    const response = await client.messages.parse({
      model: MODEL,
      max_tokens: 4000,
      system: INDUSTRY_SYSTEM,
      messages: [{ role: "user", content: industryPrompt(companies) }],
      output_config: { effort: "low", format: zodOutputFormat(industryAnswerSchema) },
    });
    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return NextResponse.json({ error: `risposta non valida (${response.stop_reason})` }, { status: 502 });
    }
    return NextResponse.json({
      results: sanitizeIndustries(response.parsed_output, companies.length),
      usage: { input_tokens: response.usage.input_tokens, output_tokens: response.usage.output_tokens },
    });
  } catch (e) {
    console.error("companies-classify", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "settore non riuscito" }, { status: 502 });
  }
}
