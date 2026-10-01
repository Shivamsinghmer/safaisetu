import Link from "@/components/nav-link";
import { ApprovalChip } from "@/components/proof";
import { getT } from "@/lib/i18n-server";
import { categoryText } from "@/lib/i18n";
import { signedUrls } from "@/lib/storage";
import type { TicketListRow } from "@/lib/tickets";
import { timeAgo } from "@/lib/utils";

export type CleanupRow = TicketListRow & { resolved_at: string | null };

/**
 * Recent cleanups as before → after pairs with the reporter's verdict, so a reviewer can see the work itself,
 * not just a status. Rows must come from an RLS-scoped query (photos are signed with the service role).
 */
export async function CleanupGallery({ tickets }: { tickets: CleanupRow[] }) {
  const { t, locale } = await getT();
  const urls = await signedUrls(tickets.flatMap((r) => [r.photo_path, r.after_photo_path]));
  const url = (p: string | null) => (p ? (urls.get(p) ?? null) : null);

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {tickets.map((r) => (
        <li key={r.id}>
          <Link
            href={`/app/tickets/${r.id}`}
            className="group block overflow-hidden rounded-xl border border-bone bg-card transition-[border-color,box-shadow] hover:border-cloud hover:shadow-[0_8px_24px_-16px_rgb(0_0_0/0.35)]"
          >
            <div className="grid grid-cols-2 gap-px bg-bone">
              <Shot src={url(r.photo_path)} label={t("Before")} empty={t("No photo")} />
              <Shot src={url(r.after_photo_path)} label={t("After")} good />
            </div>
            <div className="flex items-start justify-between gap-2 px-3.5 py-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-bold text-ink">{categoryText(locale, r.category)}</div>
                <div className="mt-0.5 truncate text-xs text-slate">
                  <span className="font-mono text-ash">{r.code}</span>
                  {r.ward?.name ? ` · ${r.ward.name}` : ""} · {timeAgo(r.resolved_at ?? r.updated_at)}
                </div>
              </div>
              <ApprovalChip status={r.status} rating={r.rating} t={t} className="shrink-0" />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Shot({ src, label, good, empty }: { src: string | null; label: string; good?: boolean; empty?: string }) {
  return (
    <div className="relative bg-mist">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} loading="lazy" className="aspect-[4/3] w-full object-cover" />
      ) : (
        <div className="flex aspect-[4/3] w-full items-center justify-center text-[11px] text-ash">{empty}</div>
      )}
      <span
        className={
          "absolute top-1.5 left-1.5 rounded-full px-2 py-px text-[10px] font-bold " +
          (good ? "bg-mint text-night" : "bg-white/95 text-ink")
        }
      >
        {label}
      </span>
    </div>
  );
}
