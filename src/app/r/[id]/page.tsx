import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";

// Reports are user content shared by link: keep them out of search engines.
export const metadata: Metadata = { robots: { index: false, follow: false } };
import Link from "next/link";
import { getReport } from "@/lib/reports";
import { RunView } from "@/components/run-view";
import { PageLoading } from "@/components/page-loading";

async function SavedReport({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const report = await getReport(id);
  if (!report) notFound();
  return (
    <>
      <div className="no-print mb-8">
        <p className="text-[11px] font-semibold tracking-[0.18em] text-flame uppercase">Saved report</p>
        <h1 className="mt-2 max-w-3xl font-serif text-2xl leading-snug text-text sm:text-3xl">{report.question}</h1>
      </div>
      <RunView question={report.question} message={report.message} phase="done" shareId={report.id} createdAt={report.created_at} />
    </>
  );
}

export default function Page({ params }: PageProps<"/r/[id]">) {
  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6 sm:pt-12">
      <Suspense fallback={<PageLoading label="Opening the report…" />}>
        <SavedReport params={params} />
      </Suspense>
      <p className="no-print mt-10 text-center text-sm text-muted">
        <Link href="/" className="text-flame underline-offset-4 hover:underline">
          Ask Lanternly your own question
        </Link>
      </p>
    </main>
  );
}
