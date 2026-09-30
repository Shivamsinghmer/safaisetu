import type { Metadata } from "next";
import { Building2 } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink, Card } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { acceptInviteAction } from "@/app/actions/orgs";
import { createAdminClient } from "@/lib/supabase/admin";
import { getViewer } from "@/lib/session";
import { ORG_TYPE_META } from "@/lib/constants";
import type { OrgType } from "@/lib/types";

export const metadata: Metadata = { title: "Invitation" };

const ERRORS: Record<string, string> = {
  invalid: "This invitation has expired or was already used.",
  email: "This invitation was sent to a different email address. Sign in with that email to accept it.",
  failed: "Something went wrong. Try again.",
};

export default async function InvitePage({ params, searchParams }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const { error } = (await searchParams) as { error?: string };
  const viewer = await getViewer();

  const { data: invite } = await createAdminClient()
    .from("invitations")
    .select("email, unit_label, status, expires_at, org:organizations(name, type, address)")
    .eq("token", token)
    .maybeSingle();
  const org = invite?.org as unknown as { name: string; type: OrgType; address: string } | undefined;
  const valid = invite && invite.status === "pending" && new Date(invite.expires_at) > new Date();
  const next = `/invite/${token}`;

  return (
    <div className="flex min-h-dvh flex-col items-center bg-mist px-4 py-10">
      <Logo />
      <Card className="mt-10 w-full max-w-md p-8 text-center">
        {valid && org ? (
          <>
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-violet/10">
              <Building2 className="h-6 w-6 text-violet" />
            </span>
            <div className="label-mono mt-5">{ORG_TYPE_META[org.type].label}</div>
            <h1 className="mt-1 font-display text-2xl font-bold tracking-[-0.035em]">{org.name}</h1>
            <p className="mt-1 text-sm text-slate">{org.address}</p>
            <p className="mt-5 text-[15px] text-carbon">
              You&apos;ve been invited to join as a member
              {invite.unit_label ? ` (${invite.unit_label})` : ""}.
            </p>
            {error && <p className="mt-4 text-sm text-coral">{ERRORS[error] ?? ERRORS.failed}</p>}
            {viewer ? (
              <form action={acceptInviteAction} className="mt-6">
                <input type="hidden" name="token" value={token} />
                <SubmitButton size="lg" className="w-full" pendingText="Joining…">
                  Accept invitation
                </SubmitButton>
                <p className="mt-3 text-xs text-ash">Signed in as {viewer.email}</p>
              </form>
            ) : (
              <div className="mt-6 flex flex-col gap-2">
                <ButtonLink href={`/signup?next=${encodeURIComponent(next)}`} size="lg">
                  Create account to join
                </ButtonLink>
                <ButtonLink href={`/login?next=${encodeURIComponent(next)}`} variant="secondary" size="lg">
                  I already have an account
                </ButtonLink>
                <p className="mt-2 text-xs text-ash">Use {invite.email} so we can match your invitation.</p>
              </div>
            )}
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-bold tracking-[-0.035em]">Invitation not valid</h1>
            <p className="mt-2 text-sm text-slate">{ERRORS.invalid} Ask your admin for a new link or an invite code.</p>
            <ButtonLink href="/app/orgs" className="mt-6">
              Join with a code
            </ButtonLink>
          </>
        )}
      </Card>
    </div>
  );
}
