"use client";

import { useMemo, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { Camera, Check, Loader2, Recycle, Search, Sparkles, X } from "lucide-react";
import { classifyItemAction } from "@/app/actions/ai";
import { Card, Input, Pill } from "@/components/ui";
import { WASTE_STREAMS, type WasteStream } from "@/lib/constants";
import { GUIDE_ITEMS } from "@/lib/waste-guide";
import type { ItemClassification } from "@/lib/groq";
import { cn } from "@/lib/utils";

export function BinClassifier() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ItemClassification | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File) {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const small = await imageCompression(file, { maxSizeMB: 0.3, maxWidthOrHeight: 1024, fileType: "image/jpeg" });
      const dataUrl = await imageCompression.getDataUrlFromFile(small);
      setPreview(dataUrl);
      const res = await classifyItemAction(dataUrl);
      if (res.ok) setResult(res.data);
      else setError(res.error);
    } catch {
      setError("Couldn't read that image. Try another photo.");
    } finally {
      setBusy(false);
    }
  }

  const stream = result ? WASTE_STREAMS[result.stream] : null;

  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="relative border-b border-bone bg-mist md:border-r md:border-b-0">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handle(f);
              e.target.value = "";
            }}
          />
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Item to classify" className="aspect-square w-full object-cover md:h-full" />
          ) : (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-3 text-slate md:h-full"
            >
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Camera className="h-6 w-6" />
              </span>
              <span className="font-display font-bold text-ink">Snap an item</span>
              <span className="text-xs text-ash">A battery, a wrapper, a medicine strip…</span>
            </button>
          )}
          {busy && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold">
                <Loader2 className="h-4 w-4 animate-spin" /> Identifying…
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col p-6">
          <div className="label-mono mb-2 flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-violet" /> AI bin finder
          </div>
          {!result && !error && (
            <>
              <h3 className="font-display text-xl font-bold tracking-[-0.03em]">Not sure which bin?</h3>
              <p className="mt-2 text-sm text-slate">
                Take a photo of any item and get the right bin, whether it&apos;s recyclable, and how to dispose of it
                safely.
              </p>
            </>
          )}
          {error && <p className="text-sm text-coral">{error}</p>}
          {result && stream && (
            <div className="animate-rise">
              <div className="text-sm text-slate">{result.item}</div>
              <div className="mt-1 flex items-center gap-2.5">
                <span className={cn("h-5 w-5 rounded-full", stream.swatch)} />
                <h3 className="font-display text-2xl font-bold tracking-[-0.035em]">{stream.bin}</h3>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <Pill className="bg-mist text-carbon">{stream.label}</Pill>
                {result.recyclable && (
                  <Pill className="bg-mint text-night">
                    <Recycle className="h-3 w-3" /> Recyclable
                  </Pill>
                )}
              </div>
              {result.how_to_dispose.length > 0 && (
                <ul className="mt-4 space-y-1.5 text-sm text-ink">
                  {result.how_to_dispose.map((s) => (
                    <li key={s} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald" /> {s}
                    </li>
                  ))}
                </ul>
              )}
              {result.dont && (
                <p className="mt-3 flex gap-2 text-sm text-slate">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-coral" /> {result.dont}
                </p>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="mt-auto inline-flex h-10 w-fit cursor-pointer items-center gap-2 self-start rounded-full bg-primary px-5 pt-0 font-display text-sm font-bold text-primary-foreground hover:bg-primary/90 disabled:opacity-50 max-md:mt-6"
          >
            <Camera className="h-4 w-4" /> {result || error ? "Try another item" : "Open camera"}
          </button>
        </div>
      </div>
    </Card>
  );
}

export function ItemSearch() {
  const [q, setQ] = useState("");
  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return GUIDE_ITEMS.slice(0, 8);
    return GUIDE_ITEMS.filter(
      (i) => i.name.toLowerCase().includes(s) || i.aliases?.some((a) => a.includes(s)),
    ).slice(0, 12);
  }, [q]);

  return (
    <div>
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-ash" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search an item: battery, milk packet, diaper…"
          className="h-12 rounded-full pl-10"
          aria-label="Search waste items"
        />
      </div>
      <ul className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {results.map((i) => {
          const s = WASTE_STREAMS[i.stream as WasteStream];
          return (
            <li key={i.name} className="flex items-start gap-3 rounded-xl border border-bone bg-card p-3.5">
              <span className={cn("mt-1 h-3 w-3 shrink-0 rounded-full", s.swatch)} />
              <div className="min-w-0">
                <div className="font-semibold text-ink">{i.name}</div>
                <div className="text-[13px] text-slate">
                  <b className="font-semibold text-carbon">{s.bin}</b> · {i.tip}
                </div>
              </div>
            </li>
          );
        })}
        {!results.length && <li className="text-sm text-ash">No match. Try the AI bin finder above.</li>}
      </ul>
    </div>
  );
}
