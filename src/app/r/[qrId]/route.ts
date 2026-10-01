import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Printed QR codes point here. Signed-in people get the full report form, pinned to the
// spot; everyone else gets the guest form, so a visitor never has to create an account.
export async function GET(request: NextRequest, ctx: RouteContext<"/r/[qrId]">) {
  const { qrId } = await ctx.params;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const url = request.nextUrl.clone();
  if (data?.claims?.sub) {
    url.pathname = "/app/report";
    url.search = `?qr=${encodeURIComponent(qrId)}`;
  } else {
    url.pathname = `/qr/${encodeURIComponent(qrId)}`;
    url.search = "";
  }
  return NextResponse.redirect(url);
}
