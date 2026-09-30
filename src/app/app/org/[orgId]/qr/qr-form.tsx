"use client";

import { useActionState } from "react";
import { createQrPointAction } from "@/app/actions/orgs";
import { LocationField } from "@/components/location-field";
import { Field, FormMessage, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";

export function QrForm({ orgId, lat, lng }: { orgId: string; lat: number; lng: number }) {
  const [state, action] = useActionState(createQrPointAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="org_id" value={orgId} />
      <Field label="Spot name" htmlFor="label" hint="Shown to visitors when they scan.">
        <Input id="label" name="label" required placeholder="Food court bins, Gate 2" />
      </Field>
      <LocationField initial={{ lat, lng }} addressName="_addr" />
      <FormMessage state={state} />
      <SubmitButton pendingText="Creating…" className="self-start">
        Create QR code
      </SubmitButton>
    </form>
  );
}
