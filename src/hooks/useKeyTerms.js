import { useCallback, useEffect, useState } from "react";
import { fetchKeyTerms } from "../api/client";

const cache = new Map(); // documentId -> terms

export function useKeyTerms({ documentId, text }) {
  const [terms, setTerms] = useState(() => cache.get(documentId) ?? null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cache.has(documentId)) {
      setTerms(cache.get(documentId));
      return;
    }
    const controller = new AbortController();
    setError(null);
    fetchKeyTerms({ documentId, text }, controller.signal)
      .then((result) => {
        cache.set(documentId, result);
        setTerms(result);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setError(err.message);
      });
    return () => controller.abort();
  }, [documentId, text, attempt]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);
  return { terms, error, loading: !terms && !error, retry };
}
