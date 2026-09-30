"use client";

import { useActionState, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  Building2,
  Camera,
  Check,
  Flame,
  Globe2,
  HelpCircle,
  Landmark,
  MapPin,
  PackageX,
  QrCode,
  Recycle,
  Signpost,
  Sparkles,
  Trash2,
  Truck,
} from "lucide-react";
import { createTicketAction } from "@/app/actions/tickets";
import { analyzePhotoAction } from "@/app/actions/ai";
import { PhotoCapture } from "@/components/photo-capture";
import { LocationField } from "@/components/location-field";
import { FormMessage, Input, Textarea } from "@/components/ui";
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

const CATEGORY_ICONS: Record<string, typeof Trash2> = {
  overflowing_bin: Trash2,
  road_garbage: Signpost,
  illegal_dumping: PackageX,
  missed_collection: Truck,
  unsegregated: Recycle,
  burning: Flame,
  other: HelpCircle,
};

const SEVERITY_HINTS: Record<Severity, string> = {
  low: "Minor, can wait",
  medium: "Needs attention soon",
  high: "Health hazard or blocking",
};

const SLA_HOURS: Record<Severity, number> = { low: 72, medium: 48, high: 24 };

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
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [ai, setAi] = useState<AiAnalysis | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [description, setDescription] = useState("");
  const [where, setWhere] = useState<string>(qr ? qr.org.id : (defaultOrgId ?? "public"));
  const [address, setAddress] = useState<string>(qr ? `${qr.label}, ${qr.org.address}` : "");

  const org = qr ? null : (orgs.find((o) => o.id === where) ?? null);
  const placeName = qr ? qr.org.name : org?.name;
  const routedToMunicipality = where === "public" || ALWAYS_MUNICIPAL.includes(category);
  const categoryMeta = ISSUE_CATEGORIES.find((c) => c.value === category);

  const steps = {
    photo: Boolean(photoPath),
    location: Boolean(address.trim()) || Boolean(qr) || Boolean(org),
    category: Boolean(category),
  };
  const ready = steps.photo && steps.category;

  async function onPhoto(photo: { path: string; dataUrl: string; previewUrl: string }) {
    setPhotoPath(photo.path);
    setPreviewUrl(photo.previewUrl);
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

  function chooseWhere(id: string) {
    setWhere(id);
    const o = orgs.find((x) => x.id === id);
    setAddress(o ? o.address : "");
  }

  return (
    <form action={action} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
      <input type="hidden" name="kind" value="issue" />
      <input type="hidden" name="photo_path" value={photoPath} />
      <input type="hidden" name="category" value={category} />
      <input type="hidden" name="severity" value={severity} />
      {ai && <input type="hidden" name="ai" value={JSON.stringify(ai)} />}
      {qr && <input type="hidden" name="qr_point_id" value={qr.id} />}
      {qr && <input type="hidden" name="org_id" value={qr.org.id} />}
      {!qr && where !== "public" && <input type="hidden" name="org_id" value={where} />}

      {/* ---------------- Steps ---------------- */}
      <div className="flex min-w-0 flex-col gap-5">
        {/* 1 · Photo */}
        <StepCard n={1} title="Photo of the problem" hint="A clear photo lets AI fill in the rest." done={steps.photo}>
          <div className="grid gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
            <PhotoCapture
              userId={userId}
              onCaptured={onPhoto}
              analyzing={analyzing}
              aspect="aspect-[4/3] md:aspect-[5/4]"
            />
            <div className="flex flex-col gap-3">
              {ai && ai.is_waste ? (
                <div className="animate-rise rounded-2xl border border-primary/15 bg-secondary p-4 dark:border-border">
                  <div className="flex items-center gap-2 font-mono text-[11px] font-semibold tracking-[0.06em] text-secondary-foreground uppercase">
                    <Sparkles className="h-3.5 w-3.5" /> AI triage · {Math.round(ai.confidence * 100)}%
                  </div>
                  <div className="mt-2 text-[15px] font-semibold text-foreground">
                    {categoryMeta?.label ?? ai.category} · {SEVERITY_META[ai.severity].label.toLowerCase()} severity
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{ai.description}</p>
                  <p className="mt-3 text-xs text-muted-foreground">Filled in below. Change anything that&apos;s off.</p>
                </div>
              ) : ai && !ai.is_waste ? (
                <div className="flex gap-3 rounded-2xl border border-amber/40 bg-amber/10 p-4">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber" />
                  <p className="text-sm text-foreground">
                    This doesn&apos;t look like a waste problem. Retake it so the team can find and verify the spot.
                    You can still submit if you&apos;re sure.
                  </p>
                </div>
              ) : (
                <div className="rounded-2xl bg-muted p-4">
                  <div className="font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                    Tips for a useful photo
                  </div>
                  <ul className="mt-3 space-y-2.5 text-sm text-foreground">
                    {[
                      "Show the whole pile or bin, not a close-up",
                      "Include a landmark: gate, shop sign, pole",
                      "Take it in daylight if you can",
                    ].map((t) => (
                      <li key={t} className="flex gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald" strokeWidth={2.5} />
                        {t}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {aiError && <p className="text-xs text-muted-foreground">{aiError}</p>}
              <p className="text-xs text-muted-foreground">
                Photos are compressed on your phone and location metadata is removed before upload.
              </p>
            </div>
          </div>
        </StepCard>

        {/* 2 · Location */}
        <StepCard n={2} title="Where is it?" hint="Drag the pin to the exact spot." done={steps.location}>
          {qr ? (
            <div className="mb-4 flex items-center gap-3 rounded-2xl bg-muted p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-card">
                <QrCode className="h-5 w-5 text-foreground" />
              </span>
              <div className="min-w-0">
                <div className="truncate font-semibold text-foreground">{qr.label}</div>
                <div className="truncate text-sm text-muted-foreground">Scanned QR · {qr.org.name}</div>
              </div>
            </div>
          ) : (
            <div className="mb-4 inline-flex max-w-full flex-wrap gap-1 rounded-2xl bg-muted p-1" role="radiogroup" aria-label="Where">
              <Segment active={where === "public"} onClick={() => chooseWhere("public")} icon={<Globe2 className="h-4 w-4" />}>
                Public area / road
              </Segment>
              {orgs.map((o) => (
                <Segment key={o.id} active={where === o.id} onClick={() => chooseWhere(o.id)} icon={<Building2 className="h-4 w-4" />}>
                  {o.name}
                </Segment>
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
            onAddressChange={setAddress}
          />
          {org && (
            <div className="mt-4 max-w-xs">
              <label htmlFor="unit_label" className="mb-1.5 block text-sm font-semibold text-foreground">
                {ORG_TYPE_META[org.type].unit}
              </label>
              <Input
                id="unit_label"
                name="unit_label"
                defaultValue={org.unit_label ?? ""}
                placeholder={ORG_TYPE_META[org.type].unitPlaceholder}
              />
            </div>
          )}
        </StepCard>

        {/* 3 · What */}
        <StepCard n={3} title="What's wrong?" hint="Pick the closest match." done={steps.category}>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Category">
            {ISSUE_CATEGORIES.map((c) => {
              const Icon = CATEGORY_ICONS[c.value] ?? HelpCircle;
              const on = category === c.value;
              return (
                <button
                  key={c.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  title={c.hint}
                  onClick={() => setCategory(c.value)}
                  className={cn(
                    "group flex cursor-pointer flex-col items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-150",
                    on
                      ? "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/20"
                      : "border-border bg-card text-foreground hover:-translate-y-px hover:border-cloud hover:bg-muted",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl",
                      on ? "bg-primary-foreground/15" : "bg-secondary text-secondary-foreground",
                    )}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>
                  <span className="text-[13px] leading-tight font-semibold">{c.label}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <div className="mb-2 text-sm font-semibold text-foreground">How serious is it?</div>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Severity">
              {(["low", "medium", "high"] as Severity[]).map((s) => {
                const on = severity === s;
                return (
                  <button
                    key={s}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    onClick={() => setSeverity(s)}
                    className={cn(
                      "flex cursor-pointer flex-col items-start gap-1 rounded-2xl border p-3 text-left transition-colors",
                      on ? "border-foreground bg-card shadow-sm" : "border-border bg-muted/60 hover:bg-muted",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
                      <span className={cn("h-2.5 w-2.5 rounded-full", SEVERITY_META[s].dot)} />
                      {SEVERITY_META[s].label}
                    </span>
                    <span className="text-xs text-muted-foreground">{SEVERITY_HINTS[s]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-6">
            <label htmlFor="description" className="mb-1.5 block text-sm font-semibold text-foreground">
              Details <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Textarea
              id="description"
              name="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Bin near the main gate hasn't been emptied for 3 days"
              maxLength={1000}
              className="min-h-24"
            />
            <div className="mt-1 text-right font-mono text-[11px] text-muted-foreground">{description.length}/1000</div>
          </div>
        </StepCard>
      </div>

      {/* ---------------- Live ticket preview ---------------- */}
      <aside className="flex flex-col gap-4 lg:sticky lg:top-6">
        <div className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
          <div className="relative aspect-[16/9] bg-muted">
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={previewUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <Camera className="h-6 w-6" />
                <span className="text-xs">Your photo appears here</span>
              </div>
            )}
            <span className="absolute top-3 left-3 rounded-full bg-card/95 px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
              Ticket preview
            </span>
          </div>

          <div className="p-5">
            <div className="text-lg leading-tight font-semibold tracking-[-0.02em] text-foreground">
              {categoryMeta?.label ?? <span className="text-muted-foreground">Choose a category</span>}
            </div>
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <span className={cn("h-2 w-2 rounded-full", SEVERITY_META[severity].dot)} />
              {SEVERITY_META[severity].label} severity · resolve within {SLA_HOURS[severity]}h
            </div>
            <div className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
              <span className="line-clamp-2">{address || "Use your location or drag the pin on the map"}</span>
            </div>

            <div className="mt-4 rounded-2xl bg-muted p-3.5">
              <div className="font-mono text-[10px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
                Goes to
              </div>
              <div className="mt-1.5 flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-card text-foreground">
                  {routedToMunicipality ? <Landmark className="h-4 w-4" /> : <Building2 className="h-4 w-4" />}
                </span>
                <div className="min-w-0 text-sm">
                  <div className="truncate font-semibold text-foreground">
                    {routedToMunicipality ? "Municipality · your ward" : `${placeName} admin`}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {routedToMunicipality
                      ? where !== "public" && ALWAYS_MUNICIPAL.includes(category)
                        ? "This category is always handled by the city"
                        : "Assigned to a field worker"
                      : "They can escalate it to the municipality"}
                  </div>
                </div>
              </div>
            </div>

            <ul className="mt-4 space-y-2 text-sm">
              <Req done={steps.photo}>Add a photo</Req>
              <Req done={steps.location}>Set the location</Req>
              <Req done={steps.category}>Pick a category</Req>
            </ul>

            <div className="mt-4">
              <FormMessage state={state} />
            </div>
            <div className="hidden lg:block">
              <SubmitButton size="lg" pendingText="Submitting…" disabled={!ready} className="mt-4 w-full">
                Submit report <ArrowUpRight className="h-4 w-4" />
              </SubmitButton>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                You&apos;ll get live updates on the ticket page.
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile: sticky submit bar above the tab bar */}
      <div className="sticky bottom-20 z-20 -mx-4 border-t border-border bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
        <SubmitButton size="lg" pendingText="Submitting…" disabled={!ready} className="w-full">
          {ready ? "Submit report" : !steps.photo ? "Add a photo to continue" : "Pick a category to continue"}
        </SubmitButton>
      </div>
    </form>
  );
}

function StepCard({
  n,
  title,
  hint,
  done,
  children,
}: {
  n: number;
  title: string;
  hint: string;
  done: boolean;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-border bg-card p-5 shadow-xs sm:p-6">
      <header className="mb-5 flex items-start gap-3">
        <span
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-full font-mono text-[13px] font-semibold transition-colors",
            done ? "bg-emerald text-snow" : "bg-primary text-primary-foreground",
          )}
        >
          {done ? <Check className="h-4 w-4" strokeWidth={3} /> : n}
        </span>
        <div>
          <h2 className="text-[18px] leading-tight font-semibold tracking-[-0.02em] text-foreground">{title}</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{hint}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Segment({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-10 max-w-full cursor-pointer items-center gap-2 rounded-xl px-4 text-[13px] font-semibold transition-all",
        active ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {icon}
      <span className="truncate">{children}</span>
    </button>
  );
}

function Req({ done, children }: { done: boolean; children: ReactNode }) {
  return (
    <li className={cn("flex items-center gap-2.5", done ? "text-foreground" : "text-muted-foreground")}>
      <span
        className={cn(
          "flex h-5 w-5 items-center justify-center rounded-full border",
          done ? "border-emerald bg-emerald text-snow" : "border-cloud",
        )}
      >
        {done && <Check className="h-3 w-3" strokeWidth={3} />}
      </span>
      {children}
    </li>
  );
}
