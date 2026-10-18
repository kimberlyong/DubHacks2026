import { useCallback, useEffect, useState } from "react";
import { fetchAllSummaries } from "../api/client";
import { DEFAULT_LEVEL, LEVELS } from "../lib/levels";

// Fetches every summary level in one request, so moving the slider is instant.
// Mount with key={documentId} so state resets for each document.
export function useSummary({ documentId, text, fileName }) {
  const [level, setLevel] = useState(DEFAULT_LEVEL);
  const [summaries, setSummaries] = useState(null); // level id -> summary
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setError(null);
    fetchAllSummaries({ documentId, text, fileName }, controller.signal)
      .then(setSummaries)
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => controller.abort();
  }, [documentId, text, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  const status = summaries ? "ready" : error ? "error" : "loading";
  return { level, setLevel, summary: summaries?.[LEVELS[level].id] ?? "", status, error, retry };
}
