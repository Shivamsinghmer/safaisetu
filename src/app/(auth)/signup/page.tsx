import Link from "next/link";
import type { Metadata } from "next";
import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create account" };

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const { next } = (await searchParams) as { next?: string };
  return (
    <div className="animate-rise">
      <h1 className="font-display text-heading-sm font-bold">Create your account</h1>
      <p className="mt-2 text-[15px] text-slate">
        Already registered?{" "}
        <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-blue">
          Sign in
        </Link>
      </p>
      <div className="mt-8">
        <SignUpForm next={next} />
      </div>
      <p className="mt-6 text-xs text-ash">
        Every account can report public issues right away. Join your society or campus with an invite link, a code, or
        your college email.
      </p>
    </div>
  );
}
