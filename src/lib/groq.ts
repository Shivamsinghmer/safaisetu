import "server-only";
import Groq from "groq-sdk";
import { z } from "zod";

// Groq vision models, tried in order. A configured model that doesn't exist or
// can't read images falls through to the known vision model instead of failing.
// (Groq retired the Llama 4 vision models; Qwen 3.8 is the image-capable model now.)
const FALLBACK_VISION_MODELS = ["qwen/qwen3.8-27b"];
const VISION_MODELS = [
  ...new Set([process.env.GROQ_VISION_MODEL?.trim(), ...FALLBACK_VISION_MODELS].filter(Boolean) as string[]),
];

let client: Groq | null = null;
function groq() {
  const key = process.env.GROQ_API_KEY?.trim();
  if (!key) throw new AiError("config", "GROQ_API_KEY is not set");
  client ??= new Groq({ apiKey: key });
  return client;
}

export type AiErrorKind = "config" | "auth" | "rate_limit" | "model" | "bad_input" | "bad_output" | "network";

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "AiError";
  }
}

/** Map a Groq SDK / network failure to a small set of actionable causes. */
function classify(e: unknown): AiError {
  if (e instanceof AiError) return e;
  const status = (e as { status?: number })?.status;
  const msg = e instanceof Error ? e.message : String(e);
  if (status === 401 || status === 403) return new AiError("auth", "Groq rejected the API key (GROQ_API_KEY is invalid or revoked)");
  if (status === 429) return new AiError("rate_limit", "Groq rate limit reached");
  // Unusable model: missing, or doesn't accept image input → worth trying the next model
  if (status === 404 || /model_not_found|does not exist|(does not|doesn't) support (image|vision)|vision.*not supported/i.test(msg))
    return new AiError("model", msg);
  // The request itself was rejected (e.g. image too small / too large): retrying another model won't help
  if (status === 400 || status === 413 || status === 422) return new AiError("bad_input", msg);
  if (e instanceof SyntaxError) return new AiError("bad_output", "The model did not return valid JSON");
  return new AiError("network", msg);
}

async function visionJson(imageDataUrl: string, prompt: string) {
  let last: AiError | null = null;
  for (const model of VISION_MODELS) {
    try {
      const res = await groq().chat.completions.create({
        model,
        temperature: 0.2,
        max_completion_tokens: 600,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      });
      return JSON.parse(res.choices[0]?.message?.content ?? "{}") as unknown;
    } catch (e) {
      last = classify(e);
      // Only an unusable model is worth retrying with the next one
      if (last.kind !== "model") throw last;
      console.warn(`[groq] model "${model}" unusable, trying next: ${last.message}`);
    }
  }
  throw last ?? new AiError("model", "No vision model available");
}

const complaintSchema = z.object({
  is_waste: z.boolean(),
  category: z
    .enum(["overflowing_bin", "road_garbage", "illegal_dumping", "missed_collection", "unsegregated", "burning", "other"])
    .catch("other"),
  severity: z.enum(["low", "medium", "high"]).catch("medium"),
  waste_types: z.array(z.string()).catch([]),
  description: z.string().max(300).catch(""),
  confidence: z.number().min(0).max(1).catch(0.5),
});

export type ComplaintAnalysis = z.infer<typeof complaintSchema>;

export async function analyzeComplaintImage(imageDataUrl: string): Promise<ComplaintAnalysis> {
  const raw = await visionJson(
    imageDataUrl,
    `You triage waste-management complaints for an Indian municipality.
Look at the photo and respond with JSON only:
{
  "is_waste": boolean,            // false if the photo does not show a waste/garbage problem
  "category": "overflowing_bin" | "road_garbage" | "illegal_dumping" | "missed_collection" | "unsegregated" | "burning" | "other",
  "severity": "low" | "medium" | "high",   // high = health hazard, blocking road, large heap, burning, near water/drain
  "waste_types": string[],         // subset of ["wet","dry","hazardous","e_waste","construction"]
  "description": string,           // one factual sentence, max 25 words, for a sanitation officer
  "confidence": number             // 0..1
}`,
  );
  return complaintSchema.parse(raw);
}

const itemSchema = z.object({
  item: z.string().catch("Unknown item"),
  stream: z.enum(["wet", "dry", "hazardous", "e_waste"]).catch("dry"),
  recyclable: z.boolean().catch(false),
  how_to_dispose: z.array(z.string()).max(4).catch([]),
  dont: z.string().catch(""),
  confidence: z.number().min(0).max(1).catch(0.5),
});

export type ItemClassification = z.infer<typeof itemSchema>;

export async function classifyWasteItem(imageDataUrl: string): Promise<ItemClassification> {
  const raw = await visionJson(
    imageDataUrl,
    `You teach household waste segregation in India (SWM Rules 2016: green bin = wet, blue bin = dry,
red bin = domestic hazardous/sanitary, e-waste goes to authorised e-waste collection).
Identify the main item in the photo and respond with JSON only:
{
  "item": string,                 // short name, e.g. "Plastic water bottle"
  "stream": "wet" | "dry" | "hazardous" | "e_waste",
  "recyclable": boolean,
  "how_to_dispose": string[],     // 2-4 short practical steps
  "dont": string,                 // one common mistake to avoid
  "confidence": number            // 0..1
}`,
  );
  return itemSchema.parse(raw);
}
