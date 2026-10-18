import { useCallback, useEffect, useState } from "react";
import { fetchGameQuestions } from "../api/client";

// Quick quiz: 5 multiple-choice questions from the same generator the game
// uses. Shares one request between the background prefetch and the tab,
// like useFlashcards.
const QUIZ_LENGTH = 5;
const cache = new Map(); // documentId -> questions
const pending = new Map(); // documentId -> in-flight request

// The generator orders questions easy to hard; take an even spread.
function pickSpread(questions) {
  if (questions.length <= QUIZ_LENGTH) return questions;
  const step = questions.length / QUIZ_LENGTH;
  return Array.from({ length: QUIZ_LENGTH }, (_, i) => questions[Math.floor(i * step)]);
}

function load(documentId, text) {
  if (!pending.has(documentId)) {
    const request = fetchGameQuestions({ documentId, text, type: "multiple", count: QUIZ_LENGTH })
      .then((questions) => {
        const quiz = pickSpread(questions);
        cache.set(documentId, quiz);
        return quiz;
      })
      .finally(() => pending.delete(documentId));
    pending.set(documentId, request);
  }
  return pending.get(documentId);
}

export function prefetchQuiz({ documentId, text }) {
  if (cache.has(documentId)) return;
  load(documentId, text).catch(() => {}); // the tab retries and shows any error
}

export function useQuiz({ documentId, text }) {
  const [questions, setQuestions] = useState(() => cache.get(documentId) ?? null);
  const [status, setStatus] = useState(() => (cache.has(documentId) ? "ready" : "loading"));
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (cache.has(documentId)) {
      setQuestions(cache.get(documentId));
      setStatus("ready");
      return;
    }
    let active = true;
    setQuestions(null);
    setStatus("loading");
    setError(null);
    load(documentId, text)
      .then((result) => {
        if (!active) return;
        setQuestions(result);
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

  // New questions: drop the cached set and ask again.
  const refresh = useCallback(() => {
    cache.delete(documentId);
    setAttempt((current) => current + 1);
  }, [documentId]);

  return { questions, status, error, refresh };
}
