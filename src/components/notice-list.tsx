import { Megaphone, Trash2 } from "lucide-react";
import { deleteNoticeAction } from "@/app/actions/orgs";
import type { Notice } from "@/lib/types";
import { timeAgo } from "@/lib/utils";

export function NoticeList({
  notices,
  sourceName,
  canDeleteFor,
}: {
  notices: Notice[];
  sourceName?: (n: Notice) => string;
  canDeleteFor?: string;
}) {
  if (!notices.length) return <p className="px-5 py-6 text-sm text-ash">No notices yet.</p>;
  return (
    <ul className="divide-y divide-bone">
      {notices.map((n) => (
        <li key={n.id} className="flex gap-3 px-5 py-4">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mist">
            <Megaphone className="h-4 w-4 text-violet" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="font-semibold text-ink">{n.title}</div>
              {canDeleteFor && n.author_id === canDeleteFor && (
                <form action={deleteNoticeAction}>
                  <input type="hidden" name="notice_id" value={n.id} />
                  <button className="-m-2 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-ash hover:bg-black/4 hover:text-coral" aria-label="Delete notice">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </form>
              )}
            </div>
            <p className="mt-0.5 text-sm whitespace-pre-line text-slate">{n.body}</p>
            <div className="mt-1.5 font-mono text-[11px] text-ash">
              {sourceName ? `${sourceName(n)} · ` : ""}
              {timeAgo(n.created_at)}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
