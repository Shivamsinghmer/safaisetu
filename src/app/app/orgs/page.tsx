import type { Metadata } from "next";
import { Building2, GraduationCap, Mail, Store } from "lucide-react";
import { ButtonLink, Card, CardHeader, PageHeader } from "@/components/ui";
import { JoinForm } from "./join-form";

export const metadata: Metadata = { title: "Join or register" };

export default function OrgsPage() {
  return (
    <>
      <PageHeader
        label="Organizations"
        title="Join your community"
        description="Societies, campuses and public places get their own workspace. Complaints go to the right admin first, and the municipality sees everything in its region."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader label="Member" title="Join with an invite code" />
          <div className="p-5">
            <JoinForm />
            <div className="mt-6 flex gap-3 rounded-xl bg-mist p-4 text-sm text-slate">
              <Mail className="mt-0.5 h-4 w-4 shrink-0 text-blue" />
              <p>
                Got an email invite? Open the link in it to join straight away. Students and staff who sign up with
                their college email are added to their campus automatically.
              </p>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader label="Admin" title="Register your organization" />
          <div className="flex flex-col gap-3 p-5">
            {[
              { icon: Building2, t: "Residential society", d: "For secretaries and committee members" },
              { icon: GraduationCap, t: "College or campus", d: "For facilities and estate managers" },
              { icon: Store, t: "Public place", d: "Markets, malls, stations, parks, hospitals" },
            ].map(({ icon: Icon, t, d }) => (
              <div key={t} className="flex items-center gap-3 rounded-xl border border-bone p-3.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-mist">
                  <Icon className="h-4 w-4 text-ink" />
                </span>
                <div>
                  <div className="font-semibold text-ink">{t}</div>
                  <div className="text-[13px] text-slate">{d}</div>
                </div>
              </div>
            ))}
            <p className="text-sm text-slate">
              The municipality for your ward verifies each registration. After approval you can invite members,
              handle internal complaints and forward pickups.
            </p>
            <ButtonLink href="/app/orgs/new" className="self-start">
              Register an organization
            </ButtonLink>
          </div>
        </Card>
      </div>
    </>
  );
}
