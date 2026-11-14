import { Suspense } from "react";
import { LoginForm } from "@/components/login-form";
import { LanternMark } from "@/components/logo";
import { authConfigured } from "@/lib/supabase/config";

async function Form({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next, error } = await searchParams;
  return <LoginForm next={next?.startsWith("/") ? next : "/history"} linkError={error === "link"} />;
}

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="lantern-glow grid min-h-[calc(100dvh-4rem)] place-items-center px-4 py-16">
      <div className="w-full max-w-sm text-center">
        <LanternMark className="mx-auto size-10 text-text/80" />
        <h1 className="mt-5 font-serif text-3xl text-text">Sign in to Lanternly</h1>
        <p className="mt-2 text-sm text-muted">Save every report and get 10 research runs a day. No password: we email you a link.</p>
        {authConfigured ? (
          <Suspense>
            <Form searchParams={searchParams as Promise<{ next?: string; error?: string }>} />
          </Suspense>
        ) : (
          <p className="mt-8 rounded-xl border border-line p-4 text-sm text-muted">Sign-in isn&apos;t configured on this deployment.</p>
        )}
      </div>
    </main>
  );
}
