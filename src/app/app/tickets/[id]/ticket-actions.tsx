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
} from "lucide-react";
import { updateTicketAction } from "@/app/actions/tickets";
import { PhotoCapture } from "@/components/photo-capture";
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
              onCaptured={(p) => setAfterPhoto(p.path)}
            />
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
              variant="success"
              disabled={!afterPhoto}
            >
              <Check className="h-4 w-4" />{" "}
              {t(
                afterPhoto ? "Mark resolved" : "Add the after photo to resolve",
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
