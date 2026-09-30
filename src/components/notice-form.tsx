"use client";

import { useActionState, useRef, useEffect } from "react";
import { postNoticeAction } from "@/app/actions/orgs";
import { Field, FormMessage, Input, Textarea } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";

export function NoticeForm({ orgId, placeholder }: { orgId?: string; placeholder?: string }) {
  const [state, action] = useActionState(postNoticeAction, null);
  const formRef = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="flex flex-col gap-3">
      {orgId && <input type="hidden" name="org_id" value={orgId} />}
      <Field label="Title" htmlFor="title">
        <Input id="title" name="title" required placeholder="Collection timing change" />
      </Field>
      <Field label="Message" htmlFor="body">
        <Textarea id="body" name="body" required rows={4} placeholder={placeholder ?? "Dry waste will be collected on Wednesday and Saturday from next week."} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton pendingText="Publishing…" className="self-start">
        Publish notice
      </SubmitButton>
    </form>
  );
}
