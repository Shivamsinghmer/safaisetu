"use client";

import Link from "@/components/nav-link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
  ChevronDown,
  Building2,
  ClipboardList,
  Home,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Map,
  Megaphone,
  Menu,
  PlusCircle,
  QrCode,
  Recycle,
  Settings,
  Truck,
  Users,
  X,
  HardHat,
  UserPlus,
} from "lucide-react";
import { LogoMark, Wordmark } from "@/components/logo";
import { Avatar } from "@/components/ui";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/notification-bell";
import { useT } from "@/components/i18n-provider";

const ICONS = {
  home: Home,
  report: PlusCircle,
  pickup: Truck,
  tickets: ClipboardList,
  learn: BookOpen,
  dashboard: LayoutDashboard,
  map: Map,
  orgs: Building2,
  members: Users,
  notices: Megaphone,
  qr: QrCode,
  tasks: ListChecks,
  workers: HardHat,
  join: UserPlus,
  bell: Bell,
  recycle: Recycle,
  settings: Settings,
} as const;

export type IconName = keyof typeof ICONS;

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
  badge?: number;
  exact?: boolean;
}

export interface NavSection {
  title: string;
  subtitle?: string;
  items: NavItem[];
  /** Folded by default (unless it holds the current page), so the sidebar fits without scrolling */
  secondary?: boolean;
}

function isActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(item.href + "/");
}

function NavList({ sections, onNavigate }: { sections: NavSection[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  // Pick the single most specific active item
  const all = sections.flatMap((s) => s.items);
  const active = all
    .filter((i) => isActive(pathname, i))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href;
  // Sections the user opened or closed by hand; the rest follow `secondary` and the current page
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const foldable = sections.length > 1;

  return (
    <nav className="flex flex-col gap-4 short:gap-2.5">
      {sections.map((section, si) => {
        const holdsActive = section.items.some((i) => i.href === active);
        const open = !foldable || (toggled[section.title] ?? (!section.secondary || holdsActive));
        const folded = section.items.reduce((n, i) => n + (i.badge ?? 0), 0);
        const listId = `nav-section-${si}`;
        return (
          <div key={section.title}>
            {foldable ? (
              <button
                type="button"
                onClick={() => setToggled((t) => ({ ...t, [section.title]: !open }))}
                aria-expanded={open}
                aria-controls={listId}
                className="group flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-1 text-left"
              >
                <span className="min-w-0 flex-1">
                  <span className="label-mono block transition-colors group-hover:text-ink">{section.title}</span>
                  {section.subtitle && <span className="mt-0.5 block truncate text-xs text-slate">{section.subtitle}</span>}
                </span>
                {!open && folded > 0 && (
                  <span className="rounded-full bg-coral px-1.5 font-mono text-[10px] leading-4 font-medium text-snow tabular-nums">
                    {folded}
                  </span>
                )}
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 text-ash transition-transform duration-200 ease-settle",
                    !open && "-rotate-90",
                  )}
                  aria-hidden
                />
              </button>
            ) : (
              <div className="px-3 py-1">
                <div className="label-mono">{section.title}</div>
                {section.subtitle && <div className="mt-0.5 truncate text-xs text-slate">{section.subtitle}</div>}
              </div>
            )}
            {/* Height animates through grid rows, so nothing has to be measured */}
            <div
              id={listId}
              inert={!open}
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-300 ease-settle motion-reduce:transition-none",
                open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <ul className="flex min-h-0 flex-col gap-0.5 overflow-hidden pt-1">
                {section.items.map((item) => {
                  const Icon = ICONS[item.icon];
                  const on = item.href === active;
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        onClick={onNavigate}
                        aria-current={on ? "page" : undefined}
                        className={cn(
                          "flex h-9 items-center gap-2.5 rounded-full px-3 text-sm font-medium transition-colors duration-150 short:h-8",
                          on ? "bg-primary text-primary-foreground" : "text-carbon hover:bg-muted hover:text-ink",
                        )}
                      >
                        <Icon className={cn("h-4 w-4 shrink-0", on ? "text-primary-foreground" : "text-slate")} aria-hidden />
                        <span className="truncate">{item.label}</span>
                        {item.badge ? (
                          <span
                            className={cn(
                              "ml-auto rounded-full px-1.5 font-mono text-[10px] leading-4 font-medium tabular-nums",
                              on ? "bg-primary-foreground/20 text-primary-foreground" : "bg-coral text-snow",
                            )}
                          >
                            {item.badge}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

/** The signed-in person: the row opens their settings; sign out sits beside it */
function UserBlock({ name, roleLabel, onNavigate }: { name: string; roleLabel: string; onNavigate?: () => void }) {
  const { t } = useT();
  const pathname = usePathname();
  const onSettings = pathname.startsWith("/app/settings");
  return (
    <div className="flex items-center gap-1 border-t border-bone pt-3">
      <Link
        href="/app/settings"
        onClick={onNavigate}
        aria-current={onSettings ? "page" : undefined}
        title={t("Settings")}
        className={cn(
          "group flex min-w-0 flex-1 items-center gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-muted",
          onSettings && "bg-muted",
        )}
      >
        <Avatar name={name} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold text-ink">{name}</span>
          <span className="block text-xs leading-snug text-ash">{roleLabel}</span>
        </span>
        <Settings
          className="h-4 w-4 shrink-0 text-ash transition-transform duration-300 ease-settle group-hover:rotate-45 group-hover:text-ink"
          aria-hidden
        />
      </Link>
      <form action={signOutAction}>
        <button
          className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-slate transition-colors hover:bg-muted hover:text-coral"
          aria-label={t("Sign out")}
          title={t("Sign out")}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}

export function AppShell({
  sections,
  mobileTabs,
  name,
  roleLabel,
  userId,
  unread,
  children,
}: {
  sections: NavSection[];
  mobileTabs: NavItem[];
  name: string;
  roleLabel: string;
  userId: string;
  unread: number;
  children: ReactNode;
}) {
  const { t, locale } = useT();
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div lang={locale} className="min-h-dvh bg-mist">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[248px] print:!hidden flex-col border-r border-bone bg-card lg:flex">
        <div className="flex h-16 shrink-0 items-center justify-between pr-2.5 pl-4 short:h-14">
          <Link href="/app" lang="en" className="group flex items-center gap-2.5" aria-label="SafaiSetu home">
            <LogoMark className="h-7 w-7 transition-transform duration-300 ease-settle group-hover:-rotate-6" />
            <Wordmark className="text-[17px]" />
          </Link>
          <div className="flex items-center">
            <ThemeToggle />
            <NotificationBell key={unread} userId={userId} initial={unread} />
          </div>
        </div>
        {/* Sections fold so this fits a laptop screen; scrolling stays only as a last resort for very short windows */}
        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pt-1 pb-3">
          <NavList sections={sections} />
        </div>
        <div className="shrink-0 px-3 pb-3">
          <UserBlock name={name} roleLabel={roleLabel} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] items-center justify-between border-b border-bone bg-card/90 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur print:hidden lg:hidden">
        <Link href="/app" lang="en" className="flex items-center gap-2" aria-label="SafaiSetu home">
          <LogoMark className="h-7 w-7" />
          <Wordmark className="text-[16px]" />
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell key={unread} userId={userId} initial={unread} />
          <ThemeToggle />
          <button
            onClick={() => setOpen(true)}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full hover:bg-black/4"
            aria-label={t("Open menu")}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 right-0 flex w-[82%] max-w-sm animate-rise flex-col bg-card">
            <div className="flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] items-center justify-between border-b border-bone px-4 pt-[env(safe-area-inset-top,0px)]">
              <span className="label-mono">{t("Menu")}</span>
              <button
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full hover:bg-black/4"
                aria-label={t("Close menu")}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              <NavList sections={sections} onNavigate={() => setOpen(false)} />
            </div>
            <div className="p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
              <UserBlock name={name} roleLabel={roleLabel} onNavigate={() => setOpen(false)} />
            </div>
          </div>
        </div>
      )}

      <main className="lg:pl-[248px] print:!pl-0">
        <div className="mx-auto w-full max-w-[1200px] px-4 pt-6 pb-[calc(var(--tabbar-h)+2rem)] sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
          {children}
        </div>
      </main>

      {/* Mobile bottom tabs */}
      {mobileTabs.length > 0 && (
        <nav className="fixed inset-x-0 bottom-0 z-30 print:hidden border-t border-bone bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <ul className="mx-auto flex max-w-md items-stretch justify-around">
            {mobileTabs.map((item) => {
              const Icon = ICONS[item.icon];
              const on = isActive(pathname, item);
              const primary = item.icon === "report";
              return (
                <li key={item.href} className="flex-1">
                  <Link
                    href={item.href}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold",
                      on ? "text-ink" : "text-ash",
                    )}
                  >
                    {primary ? (
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground">
                        <Icon className="h-5 w-5" aria-hidden />
                      </span>
                    ) : (
                      <Icon className="h-5 w-5" aria-hidden />
                    )}
                    {!primary && item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      )}
    </div>
  );
}
