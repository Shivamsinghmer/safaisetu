import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import type { OrgType } from "@/lib/types";
import { ReportForm, type ReportOrg, type ReportQr } from "./report-form";

export const metadata: Metadata = { title: "Report an issue" };

export default async function ReportPage({ searchParams }: PageProps<"/app/report">) {
  const { qr: qrId, org: orgId } = (await searchParams) as { qr?: string; org?: string };
  const viewer = await requireViewer();

  const orgs: ReportOrg[] = viewer.memberships
    .filter((m) => m.status === "active" && m.organization.status === "approved")
    .map((m) => ({
      id: m.org_id,
      name: m.organization.name,
      type: m.organization.type,
      lat: m.organization.lat,
      lng: m.organization.lng,
      address: m.organization.address,
      unit_label: m.unit_label,
    }));

  let qr: ReportQr | null = null;
  if (qrId) {
    const supabase = await createClient();
    const { data } = await supabase
      .from("qr_points")
      .select("id, label, lat, lng, org:organizations(id, name, type, address)")
      .eq("id", qrId)
      .maybeSingle();
    if (data?.org) {
      const org = data.org as unknown as { id: string; name: string; type: OrgType; address: string };
      qr = { id: data.id, label: data.label, lat: data.lat, lng: data.lng, org };
    }
  }

  return (
    <>
      <PageHeader
        label={qr ? `QR report · ${qr.org.name}` : "New report"}
        title="Report a waste issue"
        description="Snap a photo. AI suggests the category and severity, and your report goes straight to whoever is responsible."
      />
      <ReportForm userId={viewer.userId} orgs={orgs} qr={qr} defaultOrgId={orgs.some((o) => o.id === orgId) ? orgId : undefined} />
    </>
  );
}
