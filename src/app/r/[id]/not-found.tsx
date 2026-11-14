import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto grid min-h-[60vh] max-w-xl place-items-center px-4 text-center">
      <div>
        <p className="font-serif text-3xl text-text">This report isn&apos;t here.</p>
        <p className="mt-3 text-muted">The link may be mistyped, or the report was never saved.</p>
        <Link href="/" className="btn-ghost mt-6">
          Start new research
        </Link>
      </div>
    </main>
  );
}
