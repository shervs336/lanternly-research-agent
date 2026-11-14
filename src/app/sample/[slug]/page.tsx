import { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { SAMPLES } from "@/samples";
import { Replay } from "@/components/replay";
import { PageLoading } from "@/components/page-loading";

async function SampleReplay({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const sample = SAMPLES.find((s) => s.slug === slug);
  if (!sample) notFound();
  return <Replay question={sample.question} message={sample.message} recordedAt={sample.recordedAt} />;
}

export default function Page({ params }: PageProps<"/sample/[slug]">) {
  return (
    <main className="mx-auto max-w-6xl px-4 pt-8 pb-24 sm:px-6 sm:pt-12">
      <Suspense fallback={<PageLoading label="Loading the sample…" />}>
        <SampleReplay params={params} />
      </Suspense>
      <p className="no-print mt-10 text-center text-sm text-muted">
        <Link href="/" className="text-flame underline-offset-4 hover:underline">
          Ask Lanternly your own question
        </Link>
      </p>
    </main>
  );
}
