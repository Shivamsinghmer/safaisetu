import Link from "@/components/nav-link";
import type { Metadata } from "next";
import { Building2, GraduationCap, HardHat, Landmark, User } from "lucide-react";
import { demoSignInAction } from "@/app/actions/auth";
import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in" };

const DEMOS = [
  { role: "citizen", label: "Citizen", icon: User },
  { role: "secretary", label: "Society secretary", icon: Building2 },
  { role: "college", label: "Campus manager", icon: GraduationCap },
  { role: "municipality", label: "Municipal officer", icon: Landmark },
  { role: "worker", label: "Field worker", icon: HardHat },
] as const;

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { next, error } = (await searchParams) as { next?: string; error?: string };
  return (
    <div className="animate-rise">
      <h1 className="font-display text-heading-sm font-bold">Welcome back</h1>
      <p className="mt-2 text-[15px] text-slate">
        New here?{" "}
        <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-blue">
          Create an account
        </Link>
      </p>

      <div className="mt-8">
        <SignInForm next={next} />
      </div>

      <div className="mt-10">
        <div className="flex items-center gap-3">
          <span className="h-px flex-1 bg-bone" />
          <span className="label-mono">Try a demo account</span>
          <span className="h-px flex-1 bg-bone" />
        </div>
        {error === "demo" && (
          <p className="mt-3 text-center text-xs text-coral">
            Demo accounts aren&apos;t set up yet. Run <code className="font-mono">npm run seed</code>.
          </p>
        )}
        <form action={demoSignInAction} className="mt-4 flex flex-wrap justify-center gap-2">
          <input type="hidden" name="next" value={next ?? ""} />
          {DEMOS.map(({ role, label, icon: Icon }) => (
            <button
              key={role}
              name="role"
              value={role}
              className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border border-bone bg-white px-3 text-[13px] font-semibold text-carbon transition-colors hover:border-cloud hover:bg-mist"
            >
              <Icon className="h-3.5 w-3.5 text-slate" aria-hidden />
              {label}
            </button>
          ))}
        </form>
      </div>
    </div>
  );
}
