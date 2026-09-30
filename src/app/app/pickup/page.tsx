import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/session";
import { PickupForm } from "./pickup-form";

export const metadata: Metadata = { title: "Request pickup" };

export default async function PickupPage() {
  const viewer = await requireViewer();
  const orgs = viewer.memberships
    .filter((m) => m.status === "active" && m.organization.status === "approved" && m.organization.type !== "public_place")
    .map((m) => ({
      id: m.org_id,
      name: m.organization.name,
      type: m.organization.type,
      lat: m.organization.lat,
      lng: m.organization.lng,
      address: m.organization.address,
      unit_label: m.unit_label,
    }));

  return (
    <>
      <PageHeader
        label="Special collection"
        title="Request a waste pickup"
        description="For bulky items, e-waste, debris or garden waste that the daily collection doesn't take."
      />
      <PickupForm userId={viewer.userId} orgs={orgs} />
    </>
  );
}
