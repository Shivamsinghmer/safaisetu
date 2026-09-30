import type { Metadata } from "next";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { NoticeList } from "@/components/notice-list";
import { NoticeForm } from "@/components/notice-form";
import type { Notice } from "@/lib/types";
import { loadMuni } from "../data";

export const metadata: Metadata = { title: "Announcements" };

export default async function MuniNoticesPage() {
  const { supabase, viewer, muni } = await loadMuni();
  const { data } = await supabase
    .from("notices")
    .select("*")
    .eq("municipality_id", muni.id)
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        label="Municipality"
        title="Announcements"
        description="Reaches every member of every organization in your wards: schedule changes, drives and advisories."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
        <Card className="self-start">
          <CardHeader label="New" title="Announce to the city" />
          <div className="p-5">
            <NoticeForm placeholder="Special e-waste collection drive this Sunday, 10am–4pm at all ward offices." />
          </div>
        </Card>
        <Card>
          <CardHeader label="Published" title={`${data?.length ?? 0} announcements`} />
          <NoticeList notices={(data ?? []) as Notice[]} canDeleteFor={viewer.userId} />
        </Card>
      </div>
    </>
  );
}
