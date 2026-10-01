import Link from "@/components/nav-link";
import {
  ArrowRight,
  Building2,
  GraduationCap,
  Landmark,
  Store,
} from "lucide-react";
import { CityScene } from "@/components/landing/city-scene";
import { getT } from "@/lib/i18n-server";

const METRICS = [
  { value: "20s", label: "to report a problem" },
  { value: "24h", label: "SLA on high-severity issues" },
  { value: "2", label: "photos per ticket: before and after" },
  { value: "4", label: "kinds of places, one platform" },
];

/** Landing hero: copy + CTAs on the left, interactive 3D city block on the right, metric strip below. */
export async function Hero({ ctaHref }: { ctaHref: string }) {
  const { t } = await getT();
  const lines = [t("Clean cities start"), "second"];
  return (
    <div className="relative mx-auto w-full max-w-[1240px] px-4 sm:px-6">
      <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-10">
        {/* Copy */}
        <div className="text-center lg:text-left">
          <span className="inline-flex animate-fade-up items-center gap-2 rounded-full border border-border bg-card px-3.5 py-1.5 text-[13px] font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald" aria-hidden />
            {t("Waste management for Indian cities")}
          </span>

          <h1 className="mt-5 font-sans text-[36px] leading-[1.02] font-semibold tracking-[-0.045em] text-foreground sm:mt-6 sm:text-[48px] lg:text-[60px] xl:text-[68px] short:mt-4 short:!text-[52px]">
            {lines.map((line, i) => (
              <span
                key={line}
                className="text-mask -mb-[6px] block overflow-hidden pb-[6px]"
              >
                <span
                  className="block animate-mask-up"
                  style={{ animationDelay: `${0.1 + i * 0.15}s` }}
                >
                  {i === 1 ? (
                    <>
                      {t("with") && `${t("with")} `}
                      <span className="text-brand">{t("one photo.")}</span>
                    </>
                  ) : (
                    line
                  )}
                </span>
              </span>
            ))}
          </h1>

          <p className="mx-auto mt-4 max-w-[520px] animate-fade-up px-2 text-[15px] leading-relaxed text-muted-foreground [animation-delay:0.35s] sm:mt-5 sm:px-0 sm:text-[17px] lg:mx-0 short:mt-3">
            {t(
              "SafaiSetu connects residents, societies, campuses and public places with the municipality. Report overflowing bins, dumping or missed pickups, and follow every complaint until it's actually clean.",
            )}
          </p>

          <div className="mt-6 flex animate-fade-up flex-wrap items-center justify-center gap-3 px-2 [animation-delay:0.45s] sm:mt-7 sm:gap-4 sm:px-0 lg:justify-start short:mt-5">
            <Link
              href={ctaHref}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-5 text-[14px] font-semibold text-primary-foreground transition-transform duration-200 hover:-translate-y-px hover:bg-primary/90 sm:h-12 sm:px-7 sm:text-[15px]"
            >
              {t("Get started free")} <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center gap-2 rounded-full border border-border bg-card px-5 text-[14px] font-semibold text-foreground transition-colors hover:bg-muted sm:h-12 sm:px-7 sm:text-[15px]"
            >
              {t("Try a demo account")} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-5 flex animate-fade-up flex-wrap justify-center gap-1.5 px-2 [animation-delay:0.55s] sm:mt-7 sm:gap-2 sm:px-0 lg:justify-start short:mt-5">
            {[
              { i: Building2, l: "Societies" },
              { i: GraduationCap, l: "Colleges" },
              { i: Store, l: "Public places" },
              { i: Landmark, l: "Municipalities" },
            ].map(({ i: Icon, l }) => (
              <span
                key={l}
                className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground sm:gap-1.5 sm:px-3.5 sm:py-1.5 sm:text-sm"
              >
                <Icon className="h-4 w-4" /> {t(l)}
              </span>
            ))}
          </div>
        </div>

        {/* Interactive 3D city block */}
        <div className="animate-fade-up [animation-delay:0.3s]">
          <CityScene className="aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border bg-linear-to-b from-muted/70 to-background short:aspect-[16/11]" />
        </div>
      </div>

      <dl className="mx-auto mt-8 grid w-full max-w-[920px] animate-fade-up grid-cols-2 overflow-hidden rounded-2xl border border-border bg-card shadow-sm [animation-delay:0.65s] sm:mt-10 sm:grid-cols-4 sm:rounded-3xl short:mt-6">
        {METRICS.map((m, i) => (
          <div
            key={m.label}
            className={
              "flex flex-col items-center gap-0.5 px-3 py-3.5 sm:gap-1 sm:px-4 sm:py-5 " +
              (i % 2 === 1 ? "border-l border-border " : "") +
              (i >= 2 ? "border-t border-border sm:border-t-0 " : "") +
              (i === 2 ? "sm:border-l" : "")
            }
          >
            <dt className="order-2 text-[13px] text-muted-foreground">
              {t(m.label)}
            </dt>
            <dd className="order-1 font-sans text-[24px] leading-none font-semibold tracking-[-0.04em] text-foreground sm:text-[32px]">
              {m.value}
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
