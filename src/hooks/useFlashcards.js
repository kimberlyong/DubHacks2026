import { useCallback, useEffect, useState } from "react";
import { fetchFlashcards } from "../api/client";

const cache = new Map(); // documentId -> cards
const pending = new Map(); // documentId -> in-flight request

// One request per document, shared by the background prefetch and the
// Flashcards tab, so opening the tab mid-prefetch just waits for it.
function load(documentId, text) {
  if (!pending.has(documentId)) {
    const request = fetchFlashcards({ documentId, text })
      .then((cards) => {
        cache.set(documentId, cards);
        return cards;
      })
      .finally(() => pending.delete(documentId));
    pending.set(documentId, request);
  }
  return pending.get(documentId);
}

// Starts making the cards in the background (e.g. once the summary is up),
// so they're usually ready by the time the Flashcards tab is opened.
export function prefetchFlashcards({ documentId, text }) {
  if (cache.has(documentId)) return;
  load(documentId, text).catch(() => {}); // the tab retries and shows any error
}

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

    let active = true;
    setCards(null);
    setStatus("loading");
    setError(null);
    load(documentId, text)
      .then((result) => {
        if (!active) return;
        setCards(result);
        setStatus("ready");
      })
      .catch((err) => {
        if (!active) return;
        setError(err.message);
        setStatus("error");
      });
    return () => {
      active = false;
    };
  }, [documentId, text, attempt]);

  const retry = useCallback(() => {
    cache.delete(documentId);
    setError(null);
    setStatus("loading");
    setAttempt((current) => current + 1);
  }, [documentId]);

  return { cards, status, error, retry };
}
