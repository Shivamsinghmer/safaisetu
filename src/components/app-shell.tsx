"use client";

import Link from "@/components/nav-link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import {
  Bell,
  BookOpen,
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
import { LogoMark } from "@/components/logo";
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

  return (
    <nav className="flex flex-col gap-6">
      {sections.map((section) => (
        <div key={section.title}>
          <div className="mb-2 px-3">
            <div className="label-mono">{section.title}</div>
            {section.subtitle && <div className="mt-0.5 truncate text-xs text-slate">{section.subtitle}</div>}
          </div>
          <ul className="flex flex-col gap-0.5">
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
                      "flex h-9 items-center gap-2.5 rounded-full px-3 text-sm font-medium transition-colors duration-150",
                      on ? "bg-primary text-primary-foreground" : "text-carbon hover:bg-black/4",
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
      ))}
    </nav>
  );
}

function UserBlock({ name, roleLabel }: { name: string; roleLabel: string }) {
  const { t } = useT();
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-bone bg-card p-2.5">
      <Avatar name={name} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-ink">{name}</div>
        <div className="text-xs leading-snug text-ash">{roleLabel}</div>
      </div>
      <ThemeToggle />
      <form action={signOutAction}>
        <button
          className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate hover:bg-black/4 hover:text-ink"
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
        <div className="flex h-16 items-center justify-between pr-3 pl-5">
          <Link href="/app" className="flex items-center gap-2">
            <LogoMark />
            <span className="font-display text-[17px] font-extrabold tracking-[-0.03em] text-onyx">SafaiSetu</span>
          </Link>
          <NotificationBell key={unread} userId={userId} initial={unread} />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pt-2 pb-4">
          <NavList sections={sections} />
        </div>
        <div className="p-3">
          <UserBlock name={name} roleLabel={roleLabel} />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-[calc(3.5rem+env(safe-area-inset-top,0px))] items-center justify-between border-b border-bone bg-card/90 px-4 pt-[env(safe-area-inset-top,0px)] backdrop-blur print:hidden lg:hidden">
        <Link href="/app" className="flex items-center gap-2">
          <LogoMark className="h-6 w-6" />
          <span className="font-display text-base font-extrabold tracking-[-0.03em] text-onyx">SafaiSetu</span>
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
              <UserBlock name={name} roleLabel={roleLabel} />
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
