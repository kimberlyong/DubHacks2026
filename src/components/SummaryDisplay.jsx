import { RotateCcw } from "lucide-react";

export default function SummaryDisplay({ status, summary, error, onRetry }) {
  if (status === "loading") {
    return (
      <div role="status" aria-label="Generating summary" className="animate-pulse space-y-3 motion-reduce:animate-none">
        <div className="h-4 w-full bg-neutral-300 dark:bg-neutral-700" />
        <div className="h-4 w-11/12 bg-neutral-300 dark:bg-neutral-700" />
        <div className="h-4 w-full bg-neutral-300 dark:bg-neutral-700" />
        <div className="h-4 w-2/3 bg-neutral-300 dark:bg-neutral-700" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="border border-red-700 p-4 dark:border-red-400">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button
          type="button"
          className="mt-3 flex cursor-pointer items-center gap-2 border border-black px-3 py-1 dark:border-white"
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
