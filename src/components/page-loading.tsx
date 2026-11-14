export function PageLoading({ label }: { label: string }) {
  return (
    <div className="grid min-h-[40vh] place-items-center">
      <p className="flex items-center gap-3 text-sm text-muted">
        <span className="size-4 animate-spin rounded-full border-2 border-flame/25 border-t-flame" />
        {label}
      </p>
    </div>
  );
}
