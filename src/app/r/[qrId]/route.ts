import { NextResponse, type NextRequest } from "next/server";

// Printed QR codes point here; the proxy sends signed-out visitors to /login first.
export async function GET(request: NextRequest, ctx: RouteContext<"/r/[qrId]">) {
  const { qrId } = await ctx.params;
  const url = request.nextUrl.clone();
  url.pathname = "/app/report";
  url.search = `?qr=${encodeURIComponent(qrId)}`;
  return NextResponse.redirect(url);
}
