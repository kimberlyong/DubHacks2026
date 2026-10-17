import { useCallback, useEffect, useState } from "react";
import { fetchFlashcards } from "../api/client";

const cache = new Map(); // documentId -> cards

export function useFlashcards({ documentId, text }) {
  const [cards, setCards] = useState(() => cache.get(documentId) ?? null);
  const [status, setStatus] = useState(() => (cache.has(documentId) ? "ready" : "loading"));
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cache.has(documentId)) {
      setCards(cache.get(documentId));
      setStatus("ready");
      return;
    }

    const controller = new AbortController();
    setCards(null);
    setStatus("loading");
    setError(null);
    fetchFlashcards({ documentId, text }, controller.signal)
      .then((result) => {
        cache.set(documentId, result);
        setCards(result);
        setStatus("ready");
      })
      .catch((err) => {
        if (err.name === "AbortError") return;
        setError(err.message);
        setStatus("error");
      });
    return () => controller.abort();
  }, [documentId, text, attempt]);

  const retry = useCallback(() => {
    cache.delete(documentId);
    setError(null);
    setStatus("loading");
    setAttempt((current) => current + 1);
  }, [documentId]);

  return { cards, status, error, retry };
}
