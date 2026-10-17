import { RotateCcw } from "lucide-react";
import { useKeyTerms } from "../../hooks/useKeyTerms";

export default function KeyTerms({ documentId, text }) {
  const { terms, error, loading, retry } = useKeyTerms({ documentId, text });

  if (loading) {
    return (
      <div role="status" aria-label="Extracting key terms" className="animate-pulse space-y-4 motion-reduce:animate-none">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-1/3 bg-neutral-300 dark:bg-neutral-700" />
            <div className="h-4 w-full bg-neutral-300 dark:bg-neutral-700" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="border border-red-700 p-4 dark:border-red-400">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button type="button" className="mt-3 flex cursor-pointer items-center gap-2 border border-black px-3 py-1 dark:border-white" onClick={retry}>
          <RotateCcw aria-hidden="true" className="size-4" />
          Retry
        </button>
      </div>
    );
  }

  if (terms.length === 0) return <p>No key terms were found in this document.</p>;

  return (
    <dl className="space-y-4">
      {terms.map(({ term, definition }) => (
        <div key={term}>
          <dt className="font-semibold">{term}</dt>
          <dd className="text-neutral-700 dark:text-neutral-300">{definition}</dd>
        </div>
      ))}
    </dl>
  );
}
