import { useCallback, useEffect, useRef, useState } from "react";
import { fetchPlan } from "../api/client";

const cache = new Map(); // documentId -> { steps, params }

// Unlike useSummary/useKeyTerms, this doesn't fetch on mount — it needs the
// student's chosen time and energy first. Call generate(minutes, energy) to
// kick it off.
export function usePlan({ documentId, text }) {
  const cached = cache.get(documentId);
  const [steps, setSteps] = useState(cached?.steps ?? null);
  const [params, setParams] = useState(cached?.params ?? null);
  const [status, setStatus] = useState(cached ? "ready" : "idle"); // idle | loading | ready | error
  const [error, setError] = useState(null);
  const abortRef = useRef(null);

  const generate = useCallback(
    (minutes, energy) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setStatus("loading");
      setError(null);
      fetchPlan({ documentId, text, minutes, energy }, controller.signal)
        .then((result) => {
          cache.set(documentId, { steps: result, params: { minutes, energy } });
          setSteps(result);
          setParams({ minutes, energy });
          setStatus("ready");
        })
        .catch((err) => {
          if (err.name === "AbortError") return;
          setError(err.message);
          setStatus("error");
        });
    },
    [documentId, text],
  );

  const reset = useCallback(() => {
    abortRef.current?.abort();
    cache.delete(documentId);
    setSteps(null);
    setParams(null);
    setStatus("idle");
    setError(null);
  }, [documentId]);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { steps, params, status, error, generate, reset };
}
