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
  // Unusable model: missing, retired (Groq answers 400 "has been decommissioned"), or doesn't accept image input
  // → worth trying the next model
  const code = (e as { error?: { error?: { code?: string } } })?.error?.error?.code ?? "";
  if (
    status === 404 ||
    /model_not_found|model_decommissioned/.test(code) ||
    /model_not_found|does not exist|decommissioned|no longer supported|(does not|doesn't) support (image|vision)|vision.*not supported/i.test(msg)
  )
    return new AiError("model", msg);
  // The request itself was rejected (e.g. image too small / too large): retrying another model won't help
  if (status === 400 || status === 413 || status === 422) return new AiError("bad_input", msg);
  if (e instanceof SyntaxError) return new AiError("bad_output", "The model did not return valid JSON");
  return new AiError("network", msg);
}

/** One or more images (data URLs or https URLs) plus a prompt; returns the parsed JSON reply */
async function visionJson(images: string | string[], prompt: string, maxTokens = 600) {
  const urls = Array.isArray(images) ? images : [images];
  let last: AiError | null = null;
  for (const model of VISION_MODELS) {
    try {
      const res = await groq().chat.completions.create({
        model,
        temperature: 0.2,
        max_completion_tokens: maxTokens,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              ...urls.map((url) => ({ type: "image_url" as const, image_url: { url } })),
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

const cleanupSchema = z.object({
  same_place: z.boolean().catch(false),
  same_place_confidence: z.number().min(0).max(1).catch(0.5),
  cleaned: z.boolean().catch(false),
  cleaned_confidence: z.number().min(0).max(1).catch(0.5),
  reused_before: z.boolean().catch(false),
  ai_generated: z.boolean().catch(false),
  ai_generated_confidence: z.number().min(0).max(1).catch(0),
  screen_photo: z.boolean().catch(false),
  summary: z.string().max(300).catch(""),
});

export type CleanupCheck = z.infer<typeof cleanupSchema>;

/**
 * Compares the reported photo with the worker's after photo: same place? cleaned? and is the after photo a genuine
 * camera photo (not the reporter's photo again, not a picture of a screen, not AI-generated or edited)?
 * Without a before photo only the after photo itself is judged.
 */
export async function verifyCleanup(beforeUrl: string | null, afterUrl: string): Promise<CleanupCheck> {
  const intro = beforeUrl
    ? `Image 1 is the BEFORE photo a citizen took when reporting a waste problem in an Indian city.
Image 2 is the AFTER photo a sanitation worker submitted as proof the spot was cleaned.`
    : `The image is the AFTER photo a sanitation worker submitted as proof that a reported waste problem was cleaned.
There is no before photo: judge same_place from whether it plausibly shows a street/premises spot, and keep its
confidence low.`;
  const raw = await visionJson(
    beforeUrl ? [beforeUrl, afterUrl] : [afterUrl],
    `You audit cleanup proof for a municipality. ${intro}
Be strict but fair: workers often shoot from a slightly different angle, distance or light.
Respond with JSON only:
{
  "same_place": boolean,              // the same location: match permanent features (walls, gates, poles, trees, road
                                      // edges, kerbs, drains, shop fronts, signs, tiles), not the garbage itself
  "same_place_confidence": number,    // 0..1
  "cleaned": boolean,                 // the waste visible before is gone and the spot is reasonably clean now
  "cleaned_confidence": number,       // 0..1
  "reused_before": boolean,           // image 2 is the same photograph as image 1 (or a crop/filter/edit of it)
  "ai_generated": boolean,            // signs of a synthetic or edited image: warped or melted details, garbled text,
                                      // impossible lighting/shadows, smeared textures, pasted or cloned regions
  "ai_generated_confidence": number,  // 0..1
  "screen_photo": boolean,            // a photo of a screen or printout (moire, pixels, bezels, glare)
  "summary": string                   // one plain sentence for the officer, max 25 words
}`,
    500,
  );
  return cleanupSchema.parse(raw);
}
