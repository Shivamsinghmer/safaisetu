import "server-only";
import Groq from "groq-sdk";
import { z } from "zod";

const VISION_MODEL = process.env.GROQ_VISION_MODEL || "meta-llama/llama-4-scout-17b-16e-instruct";

let client: Groq | null = null;
function groq() {
  if (!process.env.GROQ_API_KEY) throw new Error("GROQ_API_KEY is not set");
  client ??= new Groq({ apiKey: process.env.GROQ_API_KEY });
  return client;
}

async function visionJson(imageDataUrl: string, prompt: string) {
  const res = await groq().chat.completions.create({
    model: VISION_MODEL,
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
