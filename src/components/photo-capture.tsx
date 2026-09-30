"use client";

import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import { Camera, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface CapturedPhoto {
  path: string;
  previewUrl: string;
  dataUrl: string;
}

/**
 * Camera-first photo input. Compresses in the browser (re-encoding also strips
 * EXIF/GPS metadata), uploads to the user's private storage folder and hands
 * back the storage path plus a small data URL for AI analysis.
 */
export function PhotoCapture({
  userId,
  bucket = "complaint-photos",
  label = "Take or upload a photo",
  onCaptured,
  analyzing,
  className,
  aspect = "aspect-[4/3]",
}: {
  userId: string;
  bucket?: string;
  label?: string;
  onCaptured: (photo: CapturedPhoto) => void;
  analyzing?: boolean;
  className?: string;
  /** Tailwind aspect class for the dropzone and preview */
  aspect?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(file: File) {
    setError(null);
    setBusy(true);
    try {
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 1280,
        fileType: "image/jpeg",
        initialQuality: 0.8,
        useWebWorker: true,
      });
      const dataUrl = await imageCompression.getDataUrlFromFile(compressed);
      const previewUrl = URL.createObjectURL(compressed);
      setPreview(previewUrl);

      const path = `${userId}/${crypto.randomUUID()}.jpg`;
      const { error: upErr } = await createClient()
        .storage.from(bucket)
        .upload(path, compressed, { contentType: "image/jpeg", upsert: false });
      if (upErr) throw upErr;
      onCaptured({ path, previewUrl, dataUrl });
    } catch (e) {
      console.error(e);
      setError("Upload failed. Check your connection and try again.");
      setPreview(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={className}>
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
        <div className="relative overflow-hidden rounded-2xl border border-bone bg-mist">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Selected photo" className={cn(aspect, "w-full object-cover")} />
          {(busy || analyzing) && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3.5 py-1.5 text-[13px] font-semibold text-ink">
                {busy ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 text-violet" />
                )}
                {busy ? "Uploading…" : "AI is reading the photo…"}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={busy}
            className="absolute right-3 bottom-3 inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full bg-white/95 px-3 text-[13px] font-bold text-ink shadow-subtle hover:bg-white"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Retake
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className={cn(
            aspect,
            "flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-cloud bg-mist",
            "text-slate transition-colors hover:border-fog hover:bg-plaster/60",
          )}
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
            {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
          </span>
          <span className="font-display text-[15px] font-bold text-ink">{label}</span>
          <span className="text-xs text-ash">JPG or PNG · compressed on your phone before upload</span>
        </button>
      )}
      {error && <p className="mt-2 text-sm text-coral">{error}</p>}
    </div>
  );
}
