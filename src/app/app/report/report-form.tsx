"use client";

import { useActionState, useState } from "react";
import { AlertTriangle, Building2, Globe2, QrCode, Sparkles } from "lucide-react";
import { createTicketAction } from "@/app/actions/tickets";
import { analyzePhotoAction } from "@/app/actions/ai";
import { PhotoCapture } from "@/components/photo-capture";
import { LocationField } from "@/components/location-field";
import { Card, Field, FormMessage, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { ISSUE_CATEGORIES, ORG_TYPE_META, SEVERITY_META } from "@/lib/constants";
import type { AiAnalysis, OrgType, Severity } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface ReportOrg {
  id: string;
  name: string;
  type: OrgType;
  lat: number;
  lng: number;
  address: string;
  unit_label: string | null;
}

export interface ReportQr {
  id: string;
  label: string;
  lat: number;
  lng: number;
  org: { id: string; name: string; type: OrgType; address: string };
}

const ALWAYS_MUNICIPAL = ["missed_collection", "illegal_dumping"];

export function ReportForm({
  userId,
  orgs,
  qr,
  defaultOrgId,
}: {
  userId: string;
  orgs: ReportOrg[];
  qr?: ReportQr | null;
  defaultOrgId?: string;
}) {
  const [state, action] = useActionState(createTicketAction, null);
  const [photoPath, setPhotoPath] = useState<string>("");
  const [analyzing, setAnalyzing] = useState(false);
  const [ai, setAi] = useState<AiAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [description, setDescription] = useState("");
  const [where, setWhere] = useState<string>(qr ? qr.org.id : (defaultOrgId ?? "public"));

  const org = qr ? null : orgs.find((o) => o.id === where) ?? null;
  const routedToMunicipality = where === "public" || ALWAYS_MUNICIPAL.includes(category);

  async function onPhoto(photo: { path: string; dataUrl: string }) {
    setPhotoPath(photo.path);
    setAi(null);
    setAiError(null);
    setAnalyzing(true);
    const res = await analyzePhotoAction(photo.dataUrl);
    setAnalyzing(false);
    if (!res.ok) {
      setAiError(res.error);
      return;
    }
    setAi({ ...res.data });
    if (res.data.is_waste) {
      setCategory(res.data.category);
      setSeverity(res.data.severity);
      setDescription((d) => d || res.data.description);
    }
  }

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <input type="hidden" name="kind" value="issue" />
      <input type="hidden" name="photo_path" value={photoPath} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="severity" value={severity} />
      {ai && <input type="hidden" name="ai" value={JSON.stringify(ai)} />}
      {qr && <input type="hidden" name="qr_point_id" value={qr.id} />}
      {qr && <input type="hidden" name="org_id" value={qr.org.id} />}
      {!qr && where !== "public" && <input type="hidden" name="org_id" value={where} />}

      {/* Left: photo + AI */}
      <div className="flex flex-col gap-4">
        <StepLabel n={1} title="Photo of the problem" />
        <PhotoCapture userId={userId} onCaptured={onPhoto} analyzing={analyzing} />
        {ai && ai.is_waste && (
          <Card className="flex gap-3 border-violet/25 bg-violet/[0.04] p-4">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet" />
            <div className="text-sm">
              <div className="font-semibold text-ink">
                AI tagged this as {ISSUE_CATEGORIES.find((c) => c.value === ai.category)?.label ?? ai.category} ·{" "}
                {SEVERITY_META[ai.severity].label.toLowerCase()} severity
              </div>
              <div className="mt-0.5 text-slate">Check the details on the right and change anything that&apos;s off.</div>
            </div>
          </Card>
        )}
        {ai && !ai.is_waste && (
          <Card className="flex gap-3 border-amber/40 bg-amber/[0.06] p-4">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
            <div className="text-sm text-carbon">
              This photo doesn&apos;t look like a waste problem. Retake it so the team can find and verify the spot. You
              can still submit if you&apos;re sure.
            </div>
          </Card>
        )}
        {aiError && <p className="text-xs text-ash">{aiError}</p>}
      </div>

      {/* Right: where + what */}
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <StepLabel n={2} title="Where is it?" />
          {qr ? (
            <Card className="flex items-center gap-3 p-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-mist">
                <QrCode className="h-5 w-5 text-ink" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold text-ink">{qr.label}</div>
                <div className="truncate text-sm text-slate">{qr.org.name}</div>
              </div>
            </Card>
          ) : (
            <div className="flex flex-wrap gap-2">
              <WhereChip active={where === "public"} onClick={() => setWhere("public")} icon={<Globe2 className="h-3.5 w-3.5" />}>
                Public area / road
              </WhereChip>
              {orgs.map((o) => (
                <WhereChip
                  key={o.id}
                  active={where === o.id}
                  onClick={() => setWhere(o.id)}
                  icon={<Building2 className="h-3.5 w-3.5" />}
                >
                  {o.name}
                </WhereChip>
              ))}
            </div>
          )}
          <LocationField
            key={qr ? qr.id : where}
            initial={
              qr
                ? { lat: qr.lat, lng: qr.lng, address: `${qr.label}, ${qr.org.address}` }
                : org
                  ? { lat: org.lat, lng: org.lng, address: org.address }
                  : undefined
            }
            locked={Boolean(qr)}
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
        </section>

        <section className="flex flex-col gap-3">
          <StepLabel n={3} title="What's wrong?" />
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Category">
            {ISSUE_CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                role="radio"
                aria-checked={category === c.value}
                title={c.hint}
                onClick={() => setCategory(c.value)}
                className={cn(
                  "h-8 cursor-pointer rounded-full border px-3.5 text-[13px] font-bold transition-colors",
                  category === c.value
                    ? "border-ink bg-ink text-white"
                    : "border-bone bg-white text-carbon hover:border-cloud hover:bg-mist",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-carbon">Severity</span>
            <div className="flex rounded-full border border-bone bg-mist p-0.5">
              {(["low", "medium", "high"] as Severity[]).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSeverity(s)}
                  aria-pressed={severity === s}
                  className={cn(
                    "inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12px] font-bold",
                    severity === s ? "bg-white text-ink shadow-subtle" : "text-slate",
                  )}
                >
                  <span className={cn("h-1.5 w-1.5 rounded-full", SEVERITY_META[s].dot)} />
                  {SEVERITY_META[s].label}
                </button>
              ))}
            </div>
          </div>

          <Field label="Details (optional)" htmlFor="description">
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Bin near the main gate hasn't been emptied for 3 days"
              maxLength={1000}
            />
          </Field>
        </section>

        <div className="rounded-xl border border-bone bg-mist px-4 py-3 text-sm text-slate">
          <span className="label-mono mr-2">Routing</span>
          {routedToMunicipality ? (
            <>Goes to the <b className="text-ink">municipality</b> for your ward.</>
          ) : (
            <>
              Goes to the <b className="text-ink">{qr ? qr.org.name : org?.name}</b> admin first. They can escalate it to the
              municipality.
            </>
          )}
        </div>

        <FormMessage state={state} />
        <SubmitButton size="lg" pendingText="Submitting…" disabled={!photoPath || !category} className="w-full sm:w-auto">
          Submit report
        </SubmitButton>
      </div>
    </form>
  );
}

function StepLabel({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink font-mono text-[11px] font-medium text-white">
        {n}
      </span>
      <h2 className="font-display text-[17px] font-bold tracking-[-0.02em]">{title}</h2>
    </div>
  );
}

function WhereChip({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-8 max-w-full cursor-pointer items-center gap-1.5 rounded-full border px-3.5 text-[13px] font-bold transition-colors",
        active ? "border-blue bg-blue/5 text-blue" : "border-bone bg-white text-carbon hover:bg-mist",
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}
