import type { Metadata } from "next";
import Link from "@/components/nav-link";
import { Bell } from "lucide-react";
import { Card, EmptyState, PageHeader } from "@/components/ui";
import { requireViewer } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getT } from "@/lib/i18n-server";
import { cn, timeAgo } from "@/lib/utils";
import { MarkRead } from "./mark-read";

export const metadata: Metadata = { title: "Notifications" };

interface Row {
  id: number;
  title: string;
  body: string;
  url: string | null;
  created_at: string;
  read_at: string | null;
}

export default async function NotificationsPage() {
  const viewer = await requireViewer();
  const { t } = await getT();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, title, body, url, created_at, read_at")
    .eq("user_id", viewer.userId)
    .order("created_at", { ascending: false })
    .limit(100);
  const rows = (data ?? []) as Row[];
  const unread = rows.some((r) => !r.read_at);

  return (
    <>
      {unread && <MarkRead />}
      <PageHeader label={t("Notifications")} title={t("Notifications")} description={t("Everything that happened on your tickets and organizations.")} />
      {rows.length ? (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-bone">
            {rows.map((n) => {
              const inner = (
                <div className="flex gap-3 px-5 py-4">
                  <span className={cn("mt-2 h-2 w-2 shrink-0 rounded-full", n.read_at ? "bg-transparent" : "bg-coral")} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <div className={cn("text-ink", !n.read_at && "font-semibold")}>{n.title}</div>
                    {n.body && <p className="mt-0.5 line-clamp-2 text-sm text-slate">{n.body}</p>}
                    <div className="mt-1 font-mono text-[11px] text-ash">{timeAgo(n.created_at)}</div>
                  </div>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.url ? (
                    <Link href={n.url} className="block hover:bg-mist">
                      {inner}
                    </Link>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        </Card>
      ) : (
        <EmptyState
          icon={<Bell className="h-8 w-8" />}
          title={t("No notifications yet")}
          description={t("Updates on your tickets, tasks and organizations appear here.")}
        />
      )}
    </>
  );
}
