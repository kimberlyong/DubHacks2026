import { ArrowLeft, ArrowRight, RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { useFlashcards } from "../../hooks/useFlashcards";

export default function Flashcards({ documentId, text }) {
  const { cards, status, error, retry } = useFlashcards({ documentId, text });
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [known, setKnown] = useState(() => new Set());

  useEffect(() => {
    setIndex(0);
    setShowAnswer(false);
    setKnown(new Set());
  }, [documentId, cards]);

  if (status === "loading") {
    return (
      <div role="status" aria-label="Making flashcards" className="space-y-3">
        <div className="h-4 w-28 animate-pulse rounded bg-theme-border motion-reduce:animate-none" />
        <div className="h-48 animate-pulse rounded-2xl bg-theme-border motion-reduce:animate-none" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="rounded-xl border border-theme-urgent bg-theme-urgent-t p-4">
        <p className="text-theme-urgent">{error}</p>
        <button
          type="button"
          className="mt-3 flex cursor-pointer items-center gap-2 rounded-full border border-theme-border px-4 py-2"
          onClick={retry}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Retry
        </button>
      </div>
    );
  }

  if (!cards?.length) return <p>No flashcards were found in this document.</p>;

  const currentIndex = index < cards.length ? index : 0;
  const card = cards[currentIndex];
  const isKnown = known.has(currentIndex);

  function moveTo(nextIndex) {
    setIndex(nextIndex);
    setShowAnswer(false);
  }

  function toggleKnown() {
    setKnown((previous) => {
      const next = new Set(previous);
      if (next.has(currentIndex)) next.delete(currentIndex);
      else next.add(currentIndex);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 text-sm text-theme-muted">
        <p>
          Card {currentIndex + 1} of {cards.length}
        </p>
        <p>{known.size} known</p>
      </div>

      <div
        className="h-1.5 overflow-hidden rounded-full bg-theme-border"
        role="progressbar"
        aria-label="Flashcard progress"
        aria-valuemin={0}
        aria-valuemax={cards.length}
        aria-valuenow={known.size}
      >
        <div
          className="h-full rounded-full bg-theme-accent transition-[width]"
          style={{ width: `${(known.size / cards.length) * 100}%` }}
        />
      </div>

      <button
        type="button"
        className="flashcard-face flex min-h-52 w-full flex-col items-center justify-center gap-4 rounded-2xl border border-theme-border bg-theme-surface p-7 text-center shadow-sm transition-colors hover:bg-theme-bg"
        aria-label={`${showAnswer ? "Answer" : "Question"}: ${showAnswer ? card.answer : card.question}. Activate to ${showAnswer ? "show question" : "show answer"}.`}
        aria-pressed={showAnswer}
        onClick={() => setShowAnswer((shown) => !shown)}
      >
        <span className="text-xs font-medium uppercase tracking-[0.16em] text-theme-muted">
          {showAnswer ? "Answer" : "Question"}
        </span>
        <span className="text-lg font-medium leading-relaxed">
          {showAnswer ? card.answer : card.question}
        </span>
        <span className="text-sm text-theme-muted">
          {showAnswer ? "Select to see question" : "Select to reveal answer"}
        </span>
      </button>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          disabled={currentIndex === 0}
          onClick={() => moveTo(currentIndex - 1)}
          className="inline-flex items-center gap-2 rounded-full border border-theme-border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ArrowLeft aria-hidden="true" className="size-4" />
          Previous
        </button>
        <button
          type="button"
          aria-pressed={isKnown}
          onClick={toggleKnown}
          className={`rounded-full border border-theme-accent px-4 py-2 ${
            isKnown ? "bg-theme-accent text-theme-on-accent" : "bg-theme-surface text-theme-text"
          }`}
        >
          {isKnown ? "Known" : "Mark as known"}
        </button>
        <button
          type="button"
          disabled={currentIndex === cards.length - 1}
          onClick={() => moveTo(currentIndex + 1)}
          className="inline-flex items-center gap-2 rounded-full border border-theme-border px-4 py-2 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ArrowRight aria-hidden="true" className="size-4" />
        </button>
      </div>
      <button
        type="button"
        onClick={retry}
        className="cursor-pointer bg-transparent p-0 text-sm text-theme-muted underline"
      >
        Make a new set
      </button>
    </div>
  );
}
