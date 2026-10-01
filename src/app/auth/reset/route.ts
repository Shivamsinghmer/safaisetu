import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// A session token can outlive its account (e.g. after `npm run demo:reset` deletes the demo
// users). The proxy still sees a valid token while the app finds no profile, which would
// bounce between /login and /app forever. Clear the stale session here and start over.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "?error=session";
  return NextResponse.redirect(url);
}
