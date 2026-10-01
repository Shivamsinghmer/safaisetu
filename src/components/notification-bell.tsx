"use client";

import { useEffect, useId, useState } from "react";
import { Bell } from "lucide-react";
import Link from "@/components/nav-link";
import { useT } from "@/components/i18n-provider";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

/**
 * Bell with the unread count. Starts from the server's count and goes up live when a
 * notification row for this user is inserted (Supabase Realtime).
 */
export function NotificationBell({ userId, initial, className }: { userId: string; initial: number; className?: string }) {
  const { t } = useT();
  const [extra, setExtra] = useState(0);
  // The shell renders two bells (sidebar and mobile header); each needs its own channel
  const instance = useId();
  const count = initial + extra;

  useEffect(() => {
    const supabase = createClient();
    const sub = supabase
      .channel(`notifications-${userId}-${instance}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${userId}` },
        () => setExtra((n) => n + 1),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(sub);
    };
  }, [userId, instance]);

  return (
    <Link
      href="/app/notifications"
      onClick={() => setExtra(-initial)}
      aria-label={count ? `${t("Notifications")} (${count})` : t("Notifications")}
      className={cn("relative flex h-9 w-9 items-center justify-center rounded-full text-carbon hover:bg-black/4", className)}
    >
      <Bell className="h-[18px] w-[18px]" />
      {count > 0 && (
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-coral px-1 font-mono text-[10px] leading-none font-semibold text-snow tabular-nums">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
