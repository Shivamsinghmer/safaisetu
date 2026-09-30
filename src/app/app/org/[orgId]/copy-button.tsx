"use client";

import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";

export function CopyButton({ value, icon, label }: { value: string; icon?: ReactNode; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-[13px] font-bold text-slate hover:bg-black/4 hover:text-ink"
      aria-label={label ?? "Copy"}
    >
      {copied ? <Check className="h-4 w-4 text-emerald" /> : icon}
      {label && <span>{copied ? "Copied" : label}</span>}
    </button>
  );
}
