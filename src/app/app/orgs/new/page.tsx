import type { Metadata } from "next";
import { PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/session";
import { RegisterOrgForm } from "./register-form";

export const metadata: Metadata = { title: "Register organization" };

export default async function NewOrgPage() {
  const viewer = await requireViewer();
  return (
    <>
      <PageHeader
        label="Register"
        title="Register your organization"
        description="The municipality for your ward reviews every registration. You'll become the admin as soon as it's approved."
      />
      <RegisterOrgForm userId={viewer.userId} />
    </>
  );
}
