import { RotateCcw } from "lucide-react";

export default function SummaryDisplay({ status, summary, error, onRetry }) {
  if (status === "loading") {
    return (
      <div role="status" aria-label="Writing your summary" className="space-y-3">
        <p className="text-sm text-theme-muted">Reading it over for you…</p>
        <div className="animate-pulse space-y-3 motion-reduce:animate-none">
          <div className="h-3.5 w-full rounded-full bg-theme-surface-2" />
          <div className="h-3.5 w-11/12 rounded-full bg-theme-surface-2" />
          <div className="h-3.5 w-full rounded-full bg-theme-surface-2" />
          <div className="h-3.5 w-2/3 rounded-full bg-theme-surface-2" />
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="rounded-2xl bg-theme-urgent-t p-4">
        <p className="text-theme-urgent">{error}</p>
        <button
          type="button"
          className="mt-3 flex cursor-pointer items-center gap-2 rounded-full bg-theme-surface px-4 py-1.5 text-sm font-medium"
          onClick={onRetry}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Try again
        </button>
      </div>
    );
  }

  return <div className="whitespace-pre-wrap text-[1.05em] leading-relaxed">{summary}</div>;
}
