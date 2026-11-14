import Link from "next/link";
import { Wordmark } from "@/components/logo";
import { currentUserId } from "@/lib/supabase/server";
import { authConfigured } from "@/lib/supabase/config";

const linkClass =
  "rounded-full px-3.5 py-1.5 text-sm text-muted transition-colors hover:text-text focus-visible:outline-2 focus-visible:outline-flame";

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line bg-night/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" aria-label="Lanternly home" className="rounded-md focus-visible:outline-2 focus-visible:outline-flame">
          <Wordmark />
        </Link>
        <nav aria-label="Account" className="flex items-center gap-1">
          {children}
        </nav>
      </div>
    </header>
  );
}

export async function SiteHeader() {
  const userId = authConfigured ? await currentUserId() : null;
  return (
    <Shell>
      {userId ? (
        <>
          <Link href="/history" className={linkClass}>
            My reports
          </Link>
          <form action="/auth/signout" method="post">
            <button className={linkClass}>Sign out</button>
          </form>
        </>
      ) : authConfigured ? (
        <Link href="/login" className={`${linkClass} border border-line`}>
          Sign in
        </Link>
      ) : null}
    </Shell>
  );
}

SiteHeader.Fallback = function Fallback() {
  return <Shell />;
};
