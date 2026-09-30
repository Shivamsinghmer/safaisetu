"use client";

import { useActionState } from "react";
import { joinByCodeAction } from "@/app/actions/orgs";
import { Field, FormMessage, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";

export function JoinForm() {
  const [state, action] = useActionState(joinByCodeAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <Field label="Invite code" htmlFor="code" hint="6 characters, shared by your secretary or campus office.">
        <Input
          id="code"
          name="code"
          required
          maxLength={6}
          autoComplete="off"
          placeholder="GV4K2P"
          className="h-12 font-mono text-lg tracking-[0.3em] uppercase"
        />
      </Field>
      <Field label="Flat / hostel / zone (optional)" htmlFor="unit_label">
        <Input id="unit_label" name="unit_label" placeholder="B-204" />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="Joining…">Join</SubmitButton>
    </form>
  );
}
