import type { Metadata } from "next";
import { Building2, CheckCircle2, FileText, GraduationCap, Store } from "lucide-react";
import { Card, CardHeader, EmptyState, PageHeader, Pill } from "@/components/ui";
import { SubmitButton } from "@/components/ui/submit-button";
import { FilterTabs } from "@/components/ticket-list";
import { reviewOrgAction } from "@/app/actions/orgs";
import { OPEN_STATUSES, ORG_TYPE_META } from "@/lib/constants";
import { signedUrls, DOC_BUCKET } from "@/lib/storage";
import type { Organization, OrgType } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { loadMuni } from "../data";
import { createAdminClient } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Organizations" };

const TYPE_ICON = { society: Building2, college: GraduationCap, public_place: Store };

export default async function MuniOrgsPage({ searchParams }: PageProps<"/app/muni/orgs">) {
  const { type = "all" } = (await searchParams) as { type?: string };
  const { supabase, wards } = await loadMuni();

  const [{ data: orgRows }, { data: members }, { data: open }] = await Promise.all([
    supabase.from("organizations").select("*").order("created_at", { ascending: false }),
    supabase.from("memberships").select("org_id").eq("status", "active"),
    supabase.from("tickets").select("org_id").not("org_id", "is", null).in("status", OPEN_STATUSES),
  ]);
  const orgs = (orgRows ?? []) as Organization[];
  const pending = orgs.filter((o) => o.status === "pending");
  const approved = orgs.filter((o) => o.status === "approved" && (type === "all" || o.type === type));
  const wardName = (id: string | null) => wards.find((w) => w.id === id)?.name ?? "–";

  // Registrant names + proof documents for pending registrations
  const registrantIds = pending.map((o) => o.created_by).filter(Boolean) as string[];
  const { data: registrants } = registrantIds.length
    ? await createAdminClient().from("profiles").select("id, full_name, email, phone").in("id", registrantIds)
    : { data: [] };
  const docs = await signedUrls(pending.map((o) => o.proof_path), DOC_BUCKET, 900);

  return (
    <>
      <PageHeader
        label="Municipality"
        title="Organizations"
        description="Verify new registrations and see every society, campus and public place in your wards."
      />

      {pending.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 font-display text-lg font-bold tracking-[-0.02em]">
            Awaiting verification <span className="font-mono text-sm text-ash">({pending.length})</span>
          </h2>
          <div className="grid gap-4 md:grid-cols-2">
            {pending.map((o) => {
              const Icon = TYPE_ICON[o.type];
              const r = registrants?.find((p) => p.id === o.created_by);
              const doc = o.proof_path ? docs.get(o.proof_path) : null;
              return (
                <Card key={o.id} className="flex flex-col">
                  <div className="flex gap-3 p-5">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-mist">
                      <Icon className="h-5 w-5 text-ink" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="label-mono">{ORG_TYPE_META[o.type].label}</div>
                      <div className="font-display text-base font-bold">{o.name}</div>
                      <div className="text-sm text-slate">{o.address}</div>
                      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 text-[13px]">
                        <dt className="text-ash">Ward</dt>
                        <dd className="text-ink">{wardName(o.ward_id)}</dd>
                        <dt className="text-ash">Reg. no.</dt>
                        <dd className="font-mono text-ink">{o.reg_number ?? "–"}</dd>
                        <dt className="text-ash">Registered by</dt>
                        <dd className="text-ink">
                          {r?.full_name ?? "–"}
                          {r?.phone && <div className="text-slate">{r.phone}</div>}
                        </dd>
                        {o.email_domain && (
                          <>
                            <dt className="text-ash">Email domain</dt>
                            <dd className="font-mono text-ink">@{o.email_domain}</dd>
                          </>
                        )}
                        <dt className="text-ash">Submitted</dt>
                        <dd className="text-ink">{timeAgo(o.created_at)}</dd>
                      </dl>
                      {doc && (
                        <a href={doc} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-blue">
                          <FileText className="h-4 w-4" /> View proof document
                        </a>
                      )}
                    </div>
                  </div>
                  <form action={reviewOrgAction} className="mt-auto flex flex-wrap items-center gap-2 border-t border-bone p-4">
                    <input type="hidden" name="org_id" value={o.id} />
                    <input
                      name="reason"
                      placeholder="Reason (if rejecting)"
                      className="h-9 min-w-0 flex-1 rounded-md border border-cloud px-3 text-sm focus:border-blue focus:outline-none"
                    />
                    <SubmitButton name="decision" value="reject" variant="ghost" size="sm">
                      Reject
                    </SubmitButton>
                    <SubmitButton name="decision" value="approve" size="sm">
                      <CheckCircle2 className="h-4 w-4" /> Approve
                    </SubmitButton>
                  </form>
                </Card>
              );
            })}
          </div>
        </section>
      )}

      <FilterTabs
        active={type}
        tabs={[
          { key: "all", label: "All", href: "?type=all", count: orgs.filter((o) => o.status === "approved").length },
          ...(["society", "college", "public_place"] as OrgType[]).map((t) => ({
            key: t,
            label: ORG_TYPE_META[t].plural,
            href: `?type=${t}`,
            count: orgs.filter((o) => o.status === "approved" && o.type === t).length,
          })),
        ]}
      />
      {approved.length ? (
        <Card className="overflow-hidden">
          <CardHeader label="Directory" title={`${approved.length} verified`} />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-bone text-left">
                  {["Name", "Type", "Ward", "Members", "Open tickets"].map((h) => (
                    <th key={h} className="label-mono px-5 py-2.5 font-medium whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-bone">
                {approved.map((o) => {
                  const openCount = open?.filter((t) => t.org_id === o.id).length ?? 0;
                  return (
                    <tr key={o.id} className="hover:bg-mist">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-ink">{o.name}</div>
                        <div className="max-w-xs truncate text-xs text-slate">{o.address}</div>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap">
                        <Pill className="bg-mist text-carbon">{ORG_TYPE_META[o.type].label}</Pill>
                      </td>
                      <td className="px-5 py-3 whitespace-nowrap text-carbon">{wardName(o.ward_id)}</td>
                      <td className="px-5 py-3 font-mono tabular-nums">{members?.filter((m) => m.org_id === o.id).length ?? 0}</td>
                      <td className={openCount > 5 ? "px-5 py-3 font-mono font-semibold text-coral tabular-nums" : "px-5 py-3 font-mono tabular-nums"}>
                        {openCount}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <EmptyState icon={<Building2 className="h-8 w-8" />} title="No organizations yet" description="Verified organizations in your wards appear here." />
      )}
    </>
  );
}
