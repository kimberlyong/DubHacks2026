import { RotateCcw } from "lucide-react";
import { useKeyTerms } from "../../hooks/useKeyTerms";

export default function KeyTerms({ documentId, text }) {
  const { terms, error, loading, retry } = useKeyTerms({ documentId, text });

  if (loading) {
    return (
      <div role="status" aria-label="Extracting key terms" className="animate-pulse space-y-4 motion-reduce:animate-none">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-4 w-1/3 bg-theme-border" />
            <div className="h-4 w-full bg-theme-border" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div role="alert" className="border border-theme-urgent bg-theme-urgent-t p-4">
        <p className="text-theme-urgent">{error}</p>
        <button type="button" className="mt-3 flex cursor-pointer items-center gap-2 border border-theme-border px-3 py-1" onClick={retry}>
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
          <dd className="text-theme-muted">{definition}</dd>
        </div>
      ))}
    </dl>
  );
}
