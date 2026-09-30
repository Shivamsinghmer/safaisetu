import type { Metadata } from "next";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { NoticeList } from "@/components/notice-list";
import { NoticeForm } from "@/components/notice-form";
import type { Notice } from "@/lib/types";
import { loadOrg } from "../context";

export const metadata: Metadata = { title: "Notices" };

export default async function OrgNoticesPage({ params }: PageProps<"/app/org/[orgId]/notices">) {
  const { orgId } = await params;
  const { supabase, org, isAdmin, viewer } = await loadOrg(orgId);
  const { data } = await supabase.from("notices").select("*").eq("org_id", orgId).order("created_at", { ascending: false });

  return (
    <>
      <PageHeader label={org.name} title="Notices" description="Collection schedules, segregation reminders and announcements." />
      <div className={isAdmin ? "grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]" : ""}>
        {isAdmin && (
          <Card className="self-start">
            <CardHeader label="New" title="Post a notice" />
            <div className="p-5">
              <NoticeForm orgId={orgId} />
            </div>
          </Card>
        )}
        <Card>
          <CardHeader label="All notices" title={`${data?.length ?? 0} published`} />
          <NoticeList notices={(data ?? []) as Notice[]} canDeleteFor={isAdmin ? viewer.userId : undefined} />
        </Card>
      </div>
    </>
  );
}
