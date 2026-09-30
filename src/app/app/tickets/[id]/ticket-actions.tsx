"use client";

import { useActionState, useState } from "react";
import { ArrowUpRight, Check, Play, RotateCcw, Star, UserCheck, XCircle } from "lucide-react";
import { updateTicketAction } from "@/app/actions/tickets";
import { PhotoCapture } from "@/components/photo-capture";
import { Card, CardHeader, FormMessage, Select, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import type { TicketScope, TicketStatus } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  assignedTo,
  caps,
  workers,
  userId,
}: {
  ticketId: string;
  status: TicketStatus;
  scope: TicketScope;
  assignedTo: string | null;
  caps: Capabilities;
  workers: { id: string; full_name: string; open: number }[];
  userId: string;
}) {
  const [state, action] = useActionState(updateTicketAction, null);
  const [afterPhoto, setAfterPhoto] = useState("");
  const [rating, setRating] = useState(0);

  const open = ["submitted", "reopened", "assigned", "in_progress"].includes(status);
  const orgCan = caps.orgStaff && scope === "internal" && ["submitted", "reopened", "in_progress"].includes(status);
  const muniCan = caps.muni && scope === "municipal" && open;
  const workerCan = caps.assignee && ["assigned", "in_progress"].includes(status);
  const reporterCan = caps.reporter && status === "resolved";

  if (!orgCan && !muniCan && !workerCan && !reporterCan) return null;

  const needsProof = workerCan || orgCan || muniCan;

  return (
    <Card>
      <CardHeader
        label="Your action"
        title={
          reporterCan
            ? "Is it actually clean?"
            : workerCan
              ? "Work this task"
              : muniCan
                ? "Municipality actions"
                : "Organization actions"
        }
      />
      <form action={action} className="flex flex-col gap-4 p-5">
        <input type="hidden" name="ticket_id" value={ticketId} />
        <input type="hidden" name="after_photo_path" value={afterPhoto} />
        {rating > 0 && <input type="hidden" name="rating" value={rating} />}

        {reporterCan && (
          <div>
            <div className="mb-2 text-sm text-slate">Rate how it was handled</div>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                  className="cursor-pointer p-1"
                >
                  <Star className={cn("h-6 w-6", n <= rating ? "fill-amber text-amber" : "text-cloud")} />
                </button>
              ))}
            </div>
          </div>
        )}

        {muniCan && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="assigned_to" className="text-sm font-semibold text-carbon">
              {assignedTo ? "Reassign to" : "Assign a field worker"}
            </label>
            <Select id="assigned_to" name="assigned_to" defaultValue="">
              <option value="">{assignedTo ? "Keep current worker" : "Choose worker…"}</option>
              {workers.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.full_name} · {w.open} open
                </option>
              ))}
            </Select>
          </div>
        )}

        {needsProof && status !== "submitted" && (
          <div>
            <div className="mb-2 text-sm font-semibold text-carbon">After photo (proof of cleanup)</div>
            <PhotoCapture userId={userId} label="Photo after cleanup" onCaptured={(p) => setAfterPhoto(p.path)} />
          </div>
        )}

        <Textarea
          name="note"
          placeholder={reporterCan ? "Anything to add? Required if you reopen." : "Note for the timeline (optional)"}
          className="min-h-16"
        />

        <FormMessage state={state} />

        <div className="flex flex-wrap gap-2">
          {reporterCan && (
            <>
              <SubmitButton name="status" value="closed" variant="success">
                <Check className="h-4 w-4" /> Yes, it&apos;s clean
              </SubmitButton>
              <SubmitButton name="status" value="reopened" variant="danger">
                <RotateCcw className="h-4 w-4" /> Reopen
              </SubmitButton>
            </>
          )}

          {muniCan && ["submitted", "reopened", "assigned"].includes(status) && (
            <SubmitButton name="status" value="assigned">
              <UserCheck className="h-4 w-4" /> {status === "assigned" ? "Reassign" : "Assign"}
            </SubmitButton>
          )}

          {workerCan && status === "assigned" && (
            <SubmitButton name="status" value="in_progress" variant="outline-blue">
              <Play className="h-4 w-4" /> Start work
            </SubmitButton>
          )}
          {orgCan && status !== "in_progress" && (
            <SubmitButton name="status" value="in_progress" variant="outline-blue">
              <Play className="h-4 w-4" /> Start work
            </SubmitButton>
          )}

          {(workerCan || orgCan || (muniCan && status !== "submitted")) && (
            <>
              <input type="hidden" name="require_photo" value={workerCan ? "1" : "0"} />
              <SubmitButton name="status" value="resolved" variant="success">
                <Check className="h-4 w-4" /> Mark resolved
              </SubmitButton>
            </>
          )}

          {orgCan && (
            <SubmitButton name="escalate" value="1" variant="secondary">
              <ArrowUpRight className="h-4 w-4" /> Escalate to municipality
            </SubmitButton>
          )}

          {(orgCan || muniCan) && (
            <SubmitButton name="status" value="rejected" variant="ghost">
              <XCircle className="h-4 w-4" /> Reject
            </SubmitButton>
          )}
        </div>
      </form>
    </Card>
  );
}
