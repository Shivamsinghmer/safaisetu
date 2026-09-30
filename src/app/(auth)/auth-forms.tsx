"use client";

import { useActionState } from "react";
import { signInAction, signUpAction } from "@/app/actions/auth";
import { Field, FormMessage, Input } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";

export function SignInForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signInAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>
      <Field label="Password" htmlFor="password">
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      <FormMessage state={state} />
      <SubmitButton size="lg" pendingText="Signing in…" className="mt-1 w-full">
        Sign in
      </SubmitButton>
    </form>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signUpAction, null);
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Full name" htmlFor="full_name">
        <Input id="full_name" name="full_name" autoComplete="name" required placeholder="Aarav Sharma" />
      </Field>
      <Field label="Email" htmlFor="email" hint="Use your college email to auto-join your campus.">
        <Input id="email" name="email" type="email" autoComplete="email" required placeholder="you@example.com" />
      </Field>
      <Field label="Phone (optional)" htmlFor="phone">
        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+91 98765 43210" />
      </Field>
      <Field label="Password" htmlFor="password" hint="At least 8 characters.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <FormMessage state={state} />
      <SubmitButton size="lg" pendingText="Creating account…" className="mt-1 w-full">
        Create account
      </SubmitButton>
    </form>
  );
}
