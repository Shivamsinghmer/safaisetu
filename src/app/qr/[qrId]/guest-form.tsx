"use client";

import { useActionState, useState } from "react";
import imageCompression from "browser-image-compression";
import { Camera, Loader2 } from "lucide-react";
import { createGuestReportAction } from "@/app/actions/tickets";
import { Card, Field, FormMessage, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { ISSUE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";
import { categoryText } from "@/lib/i18n";

/** Photo + category + optional contact. The photo travels to the server as a compressed JPEG. */
export function GuestReportForm({ qrId }: { qrId: string }) {
  const { t, locale } = useT();
  const [state, action] = useActionState(createGuestReportAction, null);
  const [photo, setPhoto] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [category, setCategory] = useState("");

  async function onFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setPhotoError(null);
    try {
      // Re-encoding also strips hidden GPS data from the photo
      const compressed = await imageCompression(file, {
        maxSizeMB: 0.4,
        maxWidthOrHeight: 1280,
        fileType: "image/jpeg",
        initialQuality: 0.8,
        useWebWorker: true,
      });
      setPhoto(await imageCompression.getDataUrlFromFile(compressed));
      setPreview(URL.createObjectURL(compressed));
    } catch {
      setPhotoError("Couldn't read that photo. Try another one.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form action={action} className="flex flex-col gap-5">
      <input type="hidden" name="qr_point_id" value={qrId} />
      <input type="hidden" name="photo" value={photo} />
      <input type="hidden" name="category" value={category} />

      <Card className="overflow-hidden">
        <label className="relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 bg-muted text-center">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="Your photo" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <>
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground">
                {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
              </span>
              <span className="font-semibold text-ink">{t("Take a photo of the problem")}</span>
              <span className="text-xs text-ash">{t("It is compressed on your phone first")}</span>
            </>
          )}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
        </label>
        {preview && <p className="px-4 py-2 text-xs text-ash">{t("Tap the photo to retake it.")}</p>}
      </Card>
      {photoError && <p className="text-sm text-coral">{photoError}</p>}

      <div>
        <div className="mb-2 text-sm font-semibold text-ink">{t("What's wrong?")}</div>
        <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Category">
          {ISSUE_CATEGORIES.map((c) => (
            <button
              key={c.value}
              type="button"
              role="radio"
              aria-checked={category === c.value}
              onClick={() => setCategory(c.value)}
              className={cn(
                "min-h-11 cursor-pointer rounded-xl border px-3 py-2 text-left text-[13px] font-semibold transition-colors",
                category === c.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-foreground hover:bg-muted",
              )}
            >
              {categoryText(locale, c.value)}
            </button>
          ))}
        </div>
      </div>

      <Field label={t("Details (optional)")} htmlFor="description">
        <Textarea id="description" name="description" maxLength={500} placeholder="e.g. Bin overflowing since morning" />
      </Field>
      <Field label={t("Phone or email (optional)")} htmlFor="contact" hint={t("Only the team handling it can see this, in case they need to ask you something.")}>
        <Input id="contact" name="contact" maxLength={80} autoComplete="tel" />
      </Field>

      <FormMessage state={state} />
      <SubmitButton size="lg" pendingText={t("Sending…")} disabled={!photo || !category || busy} className="w-full">
        {t(!photo ? "Add a photo to continue" : !category ? "Pick what's wrong" : "Send report")}
      </SubmitButton>
    </form>
  );
}
