"use client";

import { useActionState, useRef, useState } from "react";
import { FileCheck2, Loader2, Upload } from "lucide-react";
import { registerOrgAction } from "@/app/actions/orgs";
import { LocationField } from "@/components/location-field";
import { Field, FormMessage, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { ORG_TYPE_META } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";
import type { OrgType } from "@/lib/types";
import { cn } from "@/lib/utils";

export function RegisterOrgForm({ userId }: { userId: string }) {
  const [state, action] = useActionState(registerOrgAction, null);
  const [type, setType] = useState<OrgType>("society");
  const [proof, setProof] = useState<{ path: string; name: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const meta = ORG_TYPE_META[type];

  async function upload(file: File) {
    if (file.size > 10 * 1024 * 1024) return;
    setUploading(true);
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "pdf";
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await createClient().storage.from("org-documents").upload(path, file, { contentType: file.type });
    setUploading(false);
    if (!error) setProof({ path, name: file.name });
  }

  return (
    <form action={action} className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <input type="hidden" name="type" value={type} />
      {proof && <input type="hidden" name="proof_path" value={proof.path} />}

      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-2 text-sm font-semibold text-carbon">Type</div>
          <div className="flex flex-wrap gap-2">
            {(Object.keys(ORG_TYPE_META) as OrgType[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                aria-pressed={type === t}
                className={cn(
                  "h-9 cursor-pointer rounded-full border px-4 text-[13px] font-bold transition-colors",
                  type === t ? "border-primary bg-primary text-primary-foreground" : "border-bone bg-white text-carbon hover:bg-mist",
                )}
              >
                {ORG_TYPE_META[t].label}
              </button>
            ))}
          </div>
        </div>

        <Field label="Name" htmlFor="name">
          <Input
            id="name"
            name="name"
            required
            placeholder={type === "society" ? "Green Valley Residency" : type === "college" ? "Institute of Technology, Bhopal" : "New Market Traders' Association"}
          />
        </Field>

        <Field label={type === "society" ? "Society registration no." : "Registration / reference no."} htmlFor="reg_number" hint="Helps the municipality verify you faster.">
          <Input id="reg_number" name="reg_number" placeholder="MP/BPL/2019/1234" />
        </Field>

        <Field label={type === "public_place" ? "Number of zones / bins" : type === "college" ? "Number of hostels & buildings" : "Number of flats"} htmlFor="unit_count">
          <Input id="unit_count" name="unit_count" type="number" min={0} inputMode="numeric" />
        </Field>

        {type === "college" && (
          <Field label="College email domain" htmlFor="email_domain" hint="Students & staff with this email domain join automatically.">
            <Input id="email_domain" name="email_domain" placeholder="xyz.edu.in" />
          </Field>
        )}

        <div>
          <div className="mb-2 text-sm font-semibold text-carbon">Proof document (optional)</div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf,image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void upload(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-dashed border-cloud bg-mist p-4 text-left hover:border-fog"
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin text-slate" />
            ) : proof ? (
              <FileCheck2 className="h-5 w-5 text-emerald" />
            ) : (
              <Upload className="h-5 w-5 text-slate" />
            )}
            <span className="text-sm text-carbon">
              {proof ? proof.name : "Registration certificate or authorisation letter (PDF or image, max 10 MB)"}
            </span>
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-5">
        <div>
          <div className="mb-2 text-sm font-semibold text-carbon">Location</div>
          <LocationField />
          <p className="mt-2 text-xs text-ash">We use this to route your {meta.label.toLowerCase()} to the right ward.</p>
        </div>
        <FormMessage state={state} />
        <SubmitButton size="lg" pendingText="Submitting…" className="self-start">
          Submit for verification
        </SubmitButton>
      </div>
    </form>
  );
}
