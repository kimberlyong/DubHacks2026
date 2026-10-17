import { useCallback, useEffect, useState } from "react";
import { fetchSummary } from "../api/client";
import { DEFAULT_LEVEL, LEVELS } from "../lib/levels";

const DEBOUNCE_MS = 400;

// Mount with key={documentId} so the cache resets for each document.
export function useSummary({ documentId, text }) {
  const [level, setLevel] = useState(DEFAULT_LEVEL); // follows the slider immediately
  const [settled, setSettled] = useState(DEFAULT_LEVEL); // level after debounce
  const [cache, setCache] = useState({}); // level index -> summary
  const [failure, setFailure] = useState(null); // { level, message }
  const [attempt, setAttempt] = useState(0);

  const isCached = level in cache;

  useEffect(() => {
    if (level in cache) {
      setSettled(level);
      return;
    }
    const timer = setTimeout(() => setSettled(level), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [level, cache]);

  useEffect(() => {
    if (settled in cache) return;
    const controller = new AbortController();
    setFailure(null);
    fetchSummary({ documentId, text, level: LEVELS[settled].id }, controller.signal)
      .then((summary) => setCache((c) => ({ ...c, [settled]: summary })))
      .catch((err) => {
        if (err.name !== "AbortError") setFailure({ level: settled, message: err.message });
      });
    return () => controller.abort();
    // cache is intentionally omitted: it only changes when this request resolves
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settled, attempt, documentId, text]);

  const retry = useCallback(() => setAttempt((a) => a + 1), []);

  const error = !isCached && settled === level && failure?.level === level ? failure.message : null;
  const status = isCached ? "ready" : error ? "error" : "loading";

  return { level, setLevel, summary: cache[level] ?? "", status, error, retry };
}
