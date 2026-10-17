import { RotateCcw } from "lucide-react";

export default function SummaryDisplay({ status, summary, error, onRetry }) {
  if (status === "loading") {
    return (
      <div role="status" aria-label="Generating summary" className="animate-pulse space-y-3 motion-reduce:animate-none">
        <div className="h-4 w-full bg-theme-border" />
        <div className="h-4 w-11/12 bg-theme-border" />
        <div className="h-4 w-full bg-theme-border" />
        <div className="h-4 w-2/3 bg-theme-border" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="border border-theme-urgent bg-theme-urgent-t p-4">
        <p className="text-theme-urgent">{error}</p>
        <button
          type="button"
          className="mt-3 flex cursor-pointer items-center gap-2 border border-theme-border px-3 py-1"
          onClick={onRetry}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Retry
        </button>
      </div>
    );
  }

  return <div className="whitespace-pre-wrap leading-relaxed">{summary}</div>;
}
