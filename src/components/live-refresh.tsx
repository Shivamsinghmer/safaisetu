"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

/**
 * Re-renders the current server page when matching ticket rows change.
 * While the tab is hidden, refreshes are queued and run on return: browsers
 * reject view transitions in hidden documents.
 */
export function LiveRefresh({ channel, filter }: { channel: string; filter?: string }) {
  const router = useRouter();
  useEffect(() => {
    const supabase = createClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending = false;

    const refresh = () => {
      if (document.visibilityState === "hidden") {
        pending = true;
        return;
      }
      pending = false;
      router.refresh();
    };
    const onVisible = () => {
      if (pending && document.visibilityState === "visible") refresh();
    };

    const sub = supabase
      .channel(channel)
      .on("postgres_changes", { event: "*", schema: "public", table: "tickets", filter }, () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(refresh, 400);
      })
      .subscribe();
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(sub);
    };
  }, [channel, filter, router]);
  return null;
}
