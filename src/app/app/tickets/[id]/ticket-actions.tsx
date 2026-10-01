"use client";

import { useActionState, useState } from "react";
import {
  ArrowUpRight,
  CalendarCheck,
  Check,
  Play,
  RotateCcw,
  Star,
  UserCheck,
  XCircle,
  Loader2,
} from "lucide-react";
import { checkAfterPhotoAction, updateTicketAction } from "@/app/actions/tickets";
import { PhotoCapture, type CapturedPhoto } from "@/components/photo-capture";
import { AfterCheckDetails } from "@/components/after-check";
import type { AfterCheck } from "@/lib/types";
import {
  Card,
  CardHeader,
  FormMessage,
  Input,
  Select,
  Textarea,
} from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import type { TicketKind, TicketScope, TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useT } from "@/components/i18n-provider";

export interface Capabilities {
  reporter: boolean;
  orgStaff: boolean;
  muni: boolean;
  assignee: boolean;
}

export function TicketActions({
  ticketId,
  status,
  scope,
  kind,
  overdue,
  scheduledFor,
  assignedTo,
  caps,
  workers,
  userId,
}: {
  ticketId: string;
  status: TicketStatus;
  scope: TicketScope;
  kind: TicketKind;
  /** Past its deadline and still open (computed on the server) */
  overdue: boolean;
  scheduledFor: string | null;
  assignedTo: string | null;
  caps: Capabilities;
  workers: { id: string; full_name: string; open: number }[];
  userId: string;
}) {
  const { t } = useT();
  const [state, action] = useActionState(updateTicketAction, null);
  const [afterPhoto, setAfterPhoto] = useState("");
  const [signals, setSignals] = useState<Record<string, string>>({});
  const [check, setCheck] = useState<AfterCheck | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  /** Where the device is right now, if it will say (for "taken N m from the spot") */
  function here(): Promise<GeolocationCoordinates | null> {
    if (!("geolocation" in navigator)) return Promise.resolve(null);
    return new Promise((resolve) =>
      navigator.geolocation.getCurrentPosition(
        (p) => resolve(p.coords),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 60_000 },
      ),
    );
  }

  async function onAfterPhoto(p: CapturedPhoto) {
    setAfterPhoto(p.path);
    setCheck(null);
    setCheckError(null);
    setChecking(true);
    const pos = await here();
    const sig = {
      lat: pos?.latitude,
      lng: pos?.longitude,
      accuracy: pos?.accuracy,
      takenAt: p.takenAt,
      hash: p.hash || undefined,
    };
    setSignals(
      Object.fromEntries(
        Object.entries({ sig_lat: sig.lat, sig_lng: sig.lng, sig_acc: sig.accuracy, sig_taken: sig.takenAt, sig_hash: sig.hash })
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)]),
      ),
    );
    try {
      const res = await checkAfterPhotoAction(ticketId, p.path, sig);
      if (res.ok) setCheck(res.check);
      else setCheckError(res.error);
    } catch {
      setCheckError(t("The photo check couldn't run. You can still resolve; a person will review it."));
    } finally {
      setChecking(false);
    }
  }
  const [rating, setRating] = useState(0);

  const open = ["submitted", "reopened", "assigned", "in_progress"].includes(
    status,
  );
  const orgCan =
    caps.orgStaff &&
    scope === "internal" &&
    ["submitted", "reopened", "in_progress"].includes(status);
  const muniCan = caps.muni && scope === "municipal" && open;
  const workerCan =
    caps.assignee && ["assigned", "in_progress"].includes(status);
  const reporterCan = caps.reporter && status === "resolved";
  // The resident can take an internal ticket to the city once its deadline passes
  const reporterEscalate =
    caps.reporter &&
    scope === "internal" &&
    overdue &&
    ["submitted", "reopened", "in_progress"].includes(status);
  const canResolve = workerCan || orgCan || (muniCan && status !== "submitted");
  const canSchedule = kind === "pickup" && (orgCan || muniCan);

  if (!orgCan && !muniCan && !workerCan && !reporterCan && !reporterEscalate)
    return null;

  return (
    <Card>
      <CardHeader
        label={t("Your action")}
        title={t(
          reporterCan
            ? "Is it actually clean?"
            : reporterEscalate
              ? "The deadline has passed"
              : workerCan
                ? "Work this task"
                : muniCan
                  ? "Municipality actions"
                  : "Organization actions",
        )}
      />
      <form action={action} className="flex flex-col gap-4 p-5">
        <input type="hidden" name="ticket_id" value={ticketId} />
        <input type="hidden" name="after_photo_path" value={afterPhoto} />
        {Object.entries(signals).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        {rating > 0 && <input type="hidden" name="rating" value={rating} />}

        {reporterCan && (
          <div>
            <div className="mb-2 text-sm text-slate">
              {t("Rate how it was handled")}
            </div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className="cursor-pointer p-1"
                >
                  <Star
                    className={cn(
                      "h-6 w-6",
                      n <= rating ? "fill-amber text-amber" : "text-cloud",
                    )}
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {muniCan && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="assigned_to"
              className="text-sm font-semibold text-carbon"
            >
              {t(assignedTo ? "Reassign to" : "Assign a field worker")}
            </label>
            <Select
              id="assigned_to"
              name="assigned_to"
              defaultValue=""
              placeholder={t(
                assignedTo ? "Keep current worker" : "Choose worker…",
              )}
              options={workers.map((w) => ({
                value: w.id,
                label: w.full_name,
                hint: `${w.open} ${t(w.open === 1 ? "open task" : "open tasks")}`,
              }))}
            />
          </div>
        )}

        {reporterEscalate && (
          <p className="text-sm text-slate">
            {t(
              "This hasn't been fixed in time. You can send it to the municipality, who will assign a field worker.",
            )}
          </p>
        )}

        {canSchedule && (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="scheduled_for"
              className="text-sm font-semibold text-carbon"
            >
              {t("Collection date")}
            </label>
            <Input
              id="scheduled_for"
              name="scheduled_for"
              type="date"
              defaultValue={scheduledFor ?? ""}
              className="max-w-52"
            />
            <p className="text-xs text-ash">
              {t("The resident is emailed the date so the items are ready.")}
            </p>
          </div>
        )}

        {canResolve && (
          <div>
            <div className="mb-2 text-sm font-semibold text-carbon">
              {t("After photo (required to mark resolved)")}
            </div>
            <PhotoCapture
              userId={userId}
              label="Photo after cleanup"
              onCaptured={(p) => void onAfterPhoto(p)}
              analyzing={checking}
            />
            <p className="mt-2 text-xs text-ash">
              {t("Take it at the spot, from about where the reported photo was taken. AI compares the two, and your location is checked against the pin.")}
            </p>
            {checking && (
              <div className="mt-3 flex items-center gap-2 rounded-xl bg-mist px-3.5 py-3 text-sm text-slate" role="status">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("Checking the photo: same place, cleaned, genuine…")}
              </div>
            )}
            {checkError && !checking && <p className="mt-3 text-sm text-slate">{checkError}</p>}
            {check && !checking && (
              <div
                className={cn(
                  "mt-3 rounded-xl border p-3.5",
                  check.verdict === "pass"
                    ? "border-emerald/30 bg-emerald/[0.06]"
                    : check.verdict === "review"
                      ? "border-amber/35 bg-amber/[0.07]"
                      : "border-coral/35 bg-coral/[0.06]",
                )}
              >
                <AfterCheckDetails check={check} t={t} />
                {check.verdict === "fail" && (
                  <div className="mt-3 flex flex-col gap-1.5">
                    <label htmlFor="flag_reason" className="text-sm font-semibold text-ink">
                      {t("Retake the photo at the spot, or explain why this one is correct")}
                    </label>
                    <Textarea
                      id="flag_reason"
                      name="flag_reason"
                      minLength={10}
                      maxLength={400}
                      placeholder={t("e.g. The bin was moved to the next corner after cleaning")}
                      className="min-h-16"
                    />
                    <p className="text-xs text-ash">
                      {t("Flagged photos go to the officer and the reporter with your explanation.")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <Textarea
          name="note"
          placeholder={t(
            reporterCan
              ? "Anything to add? Required if you reopen."
              : "Note for the timeline (optional)",
          )}
          className="min-h-16"
        />

        <FormMessage state={state} />

        <div className="flex flex-wrap gap-2">
          {reporterCan && (
            <>
              <SubmitButton name="status" value="closed" variant="success">
                <Check className="h-4 w-4" /> {t("Yes, it's clean")}
              </SubmitButton>
              <SubmitButton name="status" value="reopened" variant="danger">
                <RotateCcw className="h-4 w-4" /> {t("Reopen")}
              </SubmitButton>
            </>
          )}

          {muniCan &&
            ["submitted", "reopened", "assigned"].includes(status) && (
              <SubmitButton name="status" value="assigned">
                <UserCheck className="h-4 w-4" />{" "}
                {t(status === "assigned" ? "Reassign" : "Assign")}
              </SubmitButton>
            )}

          {workerCan && status === "assigned" && (
            <SubmitButton
              name="status"
              value="in_progress"
              variant="outline-blue"
            >
              <Play className="h-4 w-4" /> {t("Start work")}
            </SubmitButton>
          )}
          {orgCan && status !== "in_progress" && (
            <SubmitButton
              name="status"
              value="in_progress"
              variant="outline-blue"
            >
              <Play className="h-4 w-4" /> {t("Start work")}
            </SubmitButton>
          )}

          {canResolve && (
            <SubmitButton
              name="status"
              value="resolved"
              variant={check?.verdict === "fail" ? "danger" : "success"}
              disabled={!afterPhoto || checking}
            >
              <Check className="h-4 w-4" />{" "}
              {t(
                !afterPhoto
                  ? "Add the after photo to resolve"
                  : checking
                    ? "Checking the photo…"
                    : check?.verdict === "fail"
                      ? "Submit for review anyway"
                      : "Mark resolved",
              )}
            </SubmitButton>
          )}

          {canSchedule && (
            <SubmitButton variant="secondary">
              <CalendarCheck className="h-4 w-4" /> {t("Save collection date")}
            </SubmitButton>
          )}

          {reporterEscalate && (
            <SubmitButton name="escalate" value="1">
              <ArrowUpRight className="h-4 w-4" />{" "}
              {t("Send to the municipality")}
            </SubmitButton>
          )}

          {orgCan && (
            <SubmitButton name="escalate" value="1" variant="secondary">
              <ArrowUpRight className="h-4 w-4" />{" "}
              {t("Escalate to municipality")}
            </SubmitButton>
          )}

          {(orgCan || muniCan) && (
            <SubmitButton name="status" value="rejected" variant="ghost">
              <XCircle className="h-4 w-4" /> {t("Reject")}
            </SubmitButton>
          )}
        </div>
      </form>
    </Card>
  );
}
