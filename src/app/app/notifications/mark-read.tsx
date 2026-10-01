"use client";

import { useEffect } from "react";
import { markNotificationsReadAction } from "@/app/actions/account";

/** Opening the notifications page marks them as read (after it has rendered them as unread). */
export function MarkRead() {
  useEffect(() => {
    const id = setTimeout(() => void markNotificationsReadAction(), 1500);
    return () => clearTimeout(id);
  }, []);
  return null;
}
