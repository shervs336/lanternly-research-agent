import { Suspense } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRightIcon } from "lucide-react";
import { currentUserId } from "@/lib/supabase/server";
import { listReports } from "@/lib/reports";
import { PageLoading } from "@/components/page-loading";

async function Reports() {
  const userId = await currentUserId();
  if (!userId) redirect("/login?next=/history");
  const reports = await listReports(userId);

  if (!reports.length) {
    return (
      <div className="rounded-2xl border border-dashed border-line p-10 text-center">
        <p className="font-serif text-xl text-text">No reports yet.</p>
        <p className="mt-2 text-sm text-muted">Reports you run while signed in are saved here.</p>
        <Link href="/" className="btn-ghost mt-6">
          Ask a question
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line">
      {reports.map((r) => (
        <li key={r.id}>
          <Link href={`/r/${r.id}`} className="group flex items-center gap-4 bg-night-2/40 px-5 py-4 transition-colors hover:bg-night-2">
            <span className="min-w-0 flex-1">
              <span className="block truncate font-serif text-lg text-text">{r.question}</span>
              <span className="font-mono text-xs text-muted">
                {new Date(r.created_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
              </span>
            </span>
            <ArrowRightIcon className="size-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-flame" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function HistoryPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 pt-12 pb-24 sm:px-6">
      <p className="text-[11px] font-semibold tracking-[0.18em] text-flame uppercase">Library</p>
      <h1 className="mt-2 mb-8 font-serif text-3xl text-text">My reports</h1>
      <Suspense fallback={<PageLoading label="Loading your reports…" />}>
        <Reports />
      </Suspense>
    </main>
  );
}
