import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Link2 } from "lucide-react";
import { Avatar, Card, CardHeader, PageHeader, Pill } from "@/components/ui";
import { decideMemberAction, revokeInviteAction } from "@/app/actions/orgs";
import { ORG_TYPE_META } from "@/lib/constants";
import type { Invitation, Membership, Profile } from "@/lib/types";
import { siteUrl, timeAgo } from "@/lib/utils";
import { loadOrg } from "../context";
import { CopyButton } from "../copy-button";
import { InviteForm } from "./invite-form";

export const metadata: Metadata = { title: "Members" };

type Row = Membership & { profile: Pick<Profile, "full_name" | "email" | "phone"> | null };

export default async function MembersPage({ params }: PageProps<"/app/org/[orgId]/members">) {
  const { orgId } = await params;
  const { supabase, org, isAdmin, viewer } = await loadOrg(orgId);
  if (!isAdmin) notFound();
  const meta = ORG_TYPE_META[org.type];

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("memberships")
      .select("*, profile:profiles(full_name, email, phone)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false }),
    supabase.from("invitations").select("*").eq("org_id", orgId).eq("status", "pending").order("created_at", { ascending: false }),
  ]);
  const rows = (members ?? []) as Row[];
  const pending = rows.filter((r) => r.status === "pending");
  const active = rows.filter((r) => r.status === "active");

  return (
    <>
      <PageHeader label={org.name} title={meta.members} description={`${active.length} active · ${pending.length} awaiting approval · ${invites?.length ?? 0} invited`} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-6">
          {pending.length > 0 && (
            <Card className="border-amber/40">
              <CardHeader label="Join requests" title="Approve new members" />
              <ul className="divide-y divide-bone">
                {pending.map((m) => (
                  <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5">
                    <Avatar name={m.profile?.full_name} />
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-ink">{m.profile?.full_name}</div>
                      <div className="text-xs text-slate">
                        {m.profile?.email} {m.unit_label && `· ${m.unit_label}`} · {timeAgo(m.created_at)}
                      </div>
                    </div>
                    <form action={decideMemberAction} className="flex gap-2">
                      <input type="hidden" name="membership_id" value={m.id} />
                      <input type="hidden" name="org_id" value={orgId} />
                      <button name="decision" value="approve" className="h-8 cursor-pointer rounded-full bg-primary px-3.5 text-[13px] font-bold text-primary-foreground hover:bg-primary/90">
                        Approve
                      </button>
                      <button name="decision" value="remove" className="h-8 cursor-pointer rounded-full border border-bone px-3.5 text-[13px] font-bold text-carbon hover:bg-mist">
                        Decline
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <CardHeader label="Directory" title={`Active ${meta.members.toLowerCase()}`} />
            <ul className="divide-y divide-bone">
              {active.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                  <Avatar name={m.profile?.full_name} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-semibold text-ink">
                      {m.profile?.full_name}
                      {m.role === "admin" && <Pill className="bg-violet/10 text-violet">Admin</Pill>}
                      {m.role === "staff" && <Pill className="bg-blue/10 text-blue">Staff</Pill>}
                    </div>
                    <div className="truncate text-xs text-slate">
                      {[m.unit_label, m.profile?.email, m.profile?.phone].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  {m.user_id !== viewer.userId && m.role !== "admin" && (
                    <form action={decideMemberAction} className="flex gap-1">
                      <input type="hidden" name="membership_id" value={m.id} />
                      <input type="hidden" name="org_id" value={orgId} />
                      <button
                        name="decision"
                        value={m.role === "staff" ? "make_member" : "make_staff"}
                        className="h-8 cursor-pointer rounded-full px-3 text-[12px] font-bold text-slate hover:bg-black/4 hover:text-ink"
                        title="Staff can handle complaints (housekeeping, cleaning staff)"
                      >
                        {m.role === "staff" ? "Remove staff" : "Make staff"}
                      </button>
                      <button name="decision" value="remove" className="h-8 cursor-pointer rounded-full px-3 text-[12px] font-bold text-coral hover:bg-coral/5">
                        Remove
                      </button>
                    </form>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <aside className="flex flex-col gap-6">
          <Card>
            <CardHeader label="Invite" title="Invite by email" />
            <div className="p-5">
              <InviteForm orgId={orgId} unitPlaceholder={meta.unitPlaceholder} />
            </div>
          </Card>
          <Card>
            <CardHeader label="Pending" title="Sent invitations" />
            {(invites as Invitation[] | null)?.length ? (
              <ul className="divide-y divide-bone">
                {(invites as Invitation[]).map((i) => (
                  <li key={i.id} className="flex items-center gap-2 px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-ink">{i.email}</div>
                      <div className="text-xs text-ash">
                        {i.unit_label && `${i.unit_label} · `}sent {timeAgo(i.created_at)}
                      </div>
                    </div>
                    <CopyButton value={`${siteUrl()}/invite/${i.token}`} icon={<Link2 className="h-4 w-4" />} label="Link" />
                    <form action={revokeInviteAction}>
                      <input type="hidden" name="invite_id" value={i.id} />
                      <input type="hidden" name="org_id" value={orgId} />
                      <button className="h-8 cursor-pointer rounded-full px-2.5 text-[12px] font-bold text-ash hover:text-coral">Revoke</button>
                    </form>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-5 py-5 text-sm text-ash">No pending invitations.</p>
            )}
          </Card>
        </aside>
      </div>
    </>
  );
}
