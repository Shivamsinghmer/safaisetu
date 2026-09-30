import Link from "@/components/nav-link";
import type { Metadata } from "next";
import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const { next } = (await searchParams) as { next?: string };
  return (
    <div className="animate-rise">
      <h1 className="font-display text-[28px] leading-tight font-bold tracking-[-0.03em] sm:text-[32px]">Create your account</h1>
      <p className="mt-2 text-[15px] text-slate">
        Already registered?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-blue hover:underline">
          Sign in
        </Link>
      </p>
      <div className="mt-8 tight:mt-6">
        <SignUpForm next={next} />
      </div>
      <p className="mt-6 text-xs text-ash tight:mt-4">
        Every account can report public issues right away. Join your society or campus with an invite link, a code, or
        your college email.
      </p>
    </div>
  );
}
