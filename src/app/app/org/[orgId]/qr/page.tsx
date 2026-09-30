import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Printer, QrCode, Trash2 } from "lucide-react";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { deleteQrPointAction } from "@/app/actions/orgs";
import type { QrPoint } from "@/lib/types";
import { siteUrl } from "@/lib/utils";
import { loadOrg } from "../context";
import { QrForm } from "./qr-form";
import { PrintButton } from "./print-button";

export const metadata: Metadata = { title: "QR codes" };

export default async function QrPage({ params }: PageProps<"/app/org/[orgId]/qr">) {
  const { orgId } = await params;
  const { supabase, org, isAdmin } = await loadOrg(orgId);
  if (!isAdmin) notFound();

  const { data } = await supabase.from("qr_points").select("*").eq("org_id", orgId).order("created_at");
  const points = (data ?? []) as QrPoint[];
  const [{ data: counts }] = await Promise.all([
    supabase.from("tickets").select("qr_point_id").eq("org_id", orgId).not("qr_point_id", "is", null),
  ]);

  const svgs = await Promise.all(
    points.map((p) =>
      QRCode.toString(`${siteUrl()}/r/${p.id}`, {
        type: "svg",
        margin: 1,
        errorCorrectionLevel: "M",
        color: { dark: "#202020", light: "#ffffff" },
      }),
    ),
  );

  return (
    <>
      <PageHeader
        label={org.name}
        title="QR codes"
        description="Stick these on bins, gates and walls. Anyone can scan to report a problem at that exact spot. No app install needed."
        actions={points.length ? <PrintButton /> : undefined}
      />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
        <Card className="self-start print:hidden">
          <CardHeader label="New" title="Add a spot" />
          <div className="p-5">
            <QrForm orgId={orgId} lat={org.lat} lng={org.lng} />
          </div>
        </Card>

        {points.length ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {points.map((p, i) => (
              <Card key={p.id} className="flex flex-col items-center p-6 text-center break-inside-avoid">
                <div className="label-mono">Spotted garbage? Scan to report</div>
                <div className="mt-3 w-40" dangerouslySetInnerHTML={{ __html: svgs[i]! }} />
                <div className="mt-3 font-display text-lg font-bold tracking-[-0.02em]">{p.label}</div>
                <div className="text-xs text-slate">{org.name}</div>
                <div className="mt-3 flex items-center gap-3 print:hidden">
                  <span className="font-mono text-[11px] text-ash">
                    {counts?.filter((c) => c.qr_point_id === p.id).length ?? 0} reports
                  </span>
                  <form action={deleteQrPointAction}>
                    <input type="hidden" name="qr_id" value={p.id} />
                    <input type="hidden" name="org_id" value={orgId} />
                    <button className="cursor-pointer rounded-full p-1.5 text-ash hover:bg-coral/5 hover:text-coral" aria-label={`Delete ${p.label}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </form>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={<QrCode className="h-8 w-8" />}
            title="No QR codes yet"
            description="Create one for each bin cluster or zone. Reports from a code arrive already pinned to that spot."
          />
        )}
      </div>
      <p className="mt-6 hidden items-center gap-2 text-xs text-ash print:flex">
        <Printer className="h-3 w-3" /> Printed from SafaiSetu
      </p>
    </>
  );
}
