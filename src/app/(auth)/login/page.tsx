import Link from "@/components/nav-link";
import type { Metadata } from "next";
import { SignInForm } from "../auth-forms";
import { DemoRolesTiles } from "../demo-roles";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = (await searchParams) as {
    next?: string;
    error?: string;
  };
  return (
    <div className="animate-rise">
      <h1 className="font-display text-[28px] leading-tight font-bold tracking-[-0.03em] sm:text-[32px]">
        Welcome back
      </h1>
      <p className="mt-2 text-[15px] text-slate">
        New here?{" "}
        <Link
          href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-blue hover:underline"
        >
          Create an account
        </Link>
      </p>

      <div className="mt-8">
        <SignInForm next={next} />
      </div>

      {error === "session" && (
        <p className="mt-4 rounded-md border border-amber/30 bg-amber/10 px-3 py-2 text-xs text-ink">
          Your session had ended. Please sign in again.
        </p>
      )}
      {error === "demo" && (
        <p className="mt-4 rounded-md border border-coral/30 bg-coral/5 px-3 py-2 text-xs text-coral">
          Demo accounts aren&apos;t set up yet. Run{" "}
          <code className="font-mono">npm run seed</code>.
        </p>
      )}

      {/* Wide screens show the demo roles in the brand panel instead (see ../layout.tsx) */}
      {process.env.DEMO_LOGIN !== "off" && (
        <div className="2xl:hidden">
          <div className="mt-6 flex items-center gap-3 tight:mt-5" aria-hidden>
            <span className="h-px flex-1 bg-bone" />
            <span className="label-mono">or</span>
            <span className="h-px flex-1 bg-bone" />
          </div>
          <div className="mt-6 tight:mt-5">
            <DemoRolesTiles next={next} />
          </div>
        </div>
      )}
    </div>
  );
}
