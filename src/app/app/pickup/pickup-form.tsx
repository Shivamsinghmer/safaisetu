"use client";

import { useActionState, useState } from "react";
import { Building2, Home } from "lucide-react";
import { createTicketAction } from "@/app/actions/tickets";
import { LocationField } from "@/components/location-field";
import { PhotoCapture } from "@/components/photo-capture";
import { Card, Field, FormMessage, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { ORG_TYPE_META, PICKUP_TYPES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { ReportOrg } from "../report/report-form";

export function PickupForm({ userId, orgs }: { userId: string; orgs: ReportOrg[] }) {
  const [state, action] = useActionState(createTicketAction, null);
  const [type, setType] = useState<string>("");
  const [where, setWhere] = useState<string>(orgs[0]?.id ?? "home");
  const [photoPath, setPhotoPath] = useState("");
  const org = orgs.find((o) => o.id === where) ?? null;

  const [tomorrow] = useState(() => new Date(Date.now() + 86400000).toISOString().slice(0, 10));

  return (
    <form action={action} className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <input type="hidden" name="kind" value="pickup" />
      <input type="hidden" name="category" value={type} />
      <input type="hidden" name="severity" value="low" />
      <input type="hidden" name="photo_path" value={photoPath} />
      {org && <input type="hidden" name="org_id" value={org.id} />}

      <div className="flex flex-col gap-6">
        <section>
          <h2 className="mb-3 font-display text-[17px] font-bold tracking-[-0.02em]">What needs collecting?</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {PICKUP_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                aria-pressed={type === t.value}
                className={cn(
                  "cursor-pointer rounded-xl border p-4 text-left transition-colors",
                  type === t.value ? "border-primary bg-primary text-primary-foreground" : "border-bone bg-white hover:border-cloud hover:bg-mist",
                )}
              >
                <div className="font-display text-[15px] font-bold">{t.label}</div>
                <div className={cn("mt-0.5 text-[13px]", type === t.value ? "text-fog" : "text-slate")}>{t.hint}</div>
              </button>
            ))}
          </div>
        </section>

        <Field label="Items and approximate quantity" htmlFor="description">
          <Textarea
            id="description"
            name="description"
            required
            placeholder="e.g. 1 old sofa, 2 broken chairs. Around 60 kg."
            maxLength={1000}
          />
        </Field>

        <Field label="Preferred date" htmlFor="preferred_date">
          <Input id="preferred_date" name="preferred_date" type="date" min={tomorrow} defaultValue={tomorrow} required />
        </Field>
      </div>

      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-[17px] font-bold tracking-[-0.02em]">Pickup from</h2>
          <div className="flex flex-wrap gap-2">
            {orgs.map((o) => (
              <Chip key={o.id} active={where === o.id} onClick={() => setWhere(o.id)}>
                <Building2 className="h-3.5 w-3.5" />
                <span className="truncate">{o.name}</span>
              </Chip>
            ))}
            <Chip active={where === "home"} onClick={() => setWhere("home")}>
              <Home className="h-3.5 w-3.5" /> My own address
            </Chip>
          </div>
          <LocationField
            key={where}
            initial={org ? { lat: org.lat, lng: org.lng, address: org.address } : undefined}
            autoLocate={!org}
          />
          {org && (
            <Field label={ORG_TYPE_META[org.type].unit} htmlFor="unit_label">
              <Input
                id="unit_label"
                name="unit_label"
                defaultValue={org.unit_label ?? ""}
                placeholder={ORG_TYPE_META[org.type].unitPlaceholder}
              />
            </Field>
          )}
          <Card className="bg-mist px-4 py-3 text-sm text-slate">
            {org ? (
              <>
                Your <b className="text-ink">{ORG_TYPE_META[org.type].admin.toLowerCase()}</b> groups pickup requests and
                sends them to the municipality as one batch.
              </>
            ) : (
              <>Goes straight to the municipality for your ward.</>
            )}
          </Card>
        </section>

        <section>
          <div className="mb-2 text-sm font-semibold text-carbon">Photo (optional)</div>
          <PhotoCapture userId={userId} label="Add a photo of the items" onCaptured={(p) => setPhotoPath(p.path)} />
        </section>

        <FormMessage state={state} />
        <SubmitButton size="lg" pendingText="Requesting…" disabled={!type}>
          Request pickup
        </SubmitButton>
      </div>
    </form>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold",
        active ? "border-blue bg-blue/5 text-blue" : "border-bone bg-white text-carbon hover:bg-mist",
      )}
    >
      {children}
    </button>
  );
}
