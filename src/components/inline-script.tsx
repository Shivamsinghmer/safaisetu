"use client";

// Runs during HTML parsing on full page loads. Rendered as text/plain on the
// client so React doesn't warn about <script> tags (Next.js "Preventing Flash" guide).
export function InlineScript({ html }: { html: string }) {
  return (
    <script
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
