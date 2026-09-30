"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/** Re-renders the current server page when matching ticket rows change. */
export function LiveRefresh({ channel, filter }: { channel: string; filter?: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const sub = supabase
      .channel(channel)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => router.refresh(), 400);
      })
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      void supabase.removeChannel(sub);
    };
  }, [channel, filter, router]);
  return null;
}
