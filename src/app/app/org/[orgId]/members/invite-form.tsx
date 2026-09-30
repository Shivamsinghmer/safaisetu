"use client";

import { useActionState } from "react";
import { inviteMembersAction } from "@/app/actions/orgs";
import { FormMessage, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";

export function InviteForm({ orgId, unitPlaceholder }: { orgId: string; unitPlaceholder: string }) {
  const [state, action] = useActionState(inviteMembersAction, null);
  return (
    <form action={action} className="flex flex-col gap-3">
      <input type="hidden" name="org_id" value={orgId} />
      <Textarea
        name="emails"
        required
        rows={5}
        className="font-mono text-[13px]"
        placeholder={`riya@example.com, ${unitPlaceholder}\nkabir@example.com, A-101\nmeera@example.com`}
      />
      <p className="text-xs text-ash">One per line: email, then an optional flat or unit. Paste straight from a spreadsheet.</p>
      <FormMessage state={state} />
      <SubmitButton pendingText="Sending…" className="self-start">
        Send invitations
      </SubmitButton>
    </form>
  );
}
