import { Check, RotateCcw, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuiz } from "../../hooks/useQuiz";
import { useSprout } from "../../sprout/SproutContext";

function scoreMessage(score, total) {
  if (score === total) return "Perfect score! You really know this.";
  if (score >= total - 1) return "So close to perfect. Nice work!";
  if (score >= total / 2) return "Solid! Reread the ones you missed and try again.";
  return "That's okay, now you know what to review. Try the flashcards next.";
}

// Five quick multiple-choice questions with instant feedback and a score.
export default function Quiz({ documentId, text }) {
  const { questions, status, error, refresh } = useQuiz({ documentId, text });
  const { say } = useSprout();
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState(null);
  const [score, setScore] = useState(0);

  useEffect(() => {
    setIndex(0);
    setPicked(null);
    setScore(0);
  }, [questions]);

  if (status === "loading") {
    return (
      <div role="status" aria-label="Making your quiz" className="space-y-3">
        <div className="h-5 w-3/4 animate-pulse rounded bg-theme-border motion-reduce:animate-none" />
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-11 animate-pulse rounded-lg bg-theme-border motion-reduce:animate-none" />
        ))}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="rounded-xl border border-theme-urgent bg-theme-urgent-t p-4">
        <p className="text-theme-urgent">{error}</p>
        <button
          type="button"
          onClick={refresh}
          className="mt-3 flex cursor-pointer items-center gap-2 rounded-full border border-theme-border px-4 py-2"
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Retry
        </button>
      </div>
    );
  }

  const total = questions.length;
  const done = index >= total;

  if (done) {
    return (
      <div className="rounded-xl border border-theme-border p-5 text-center">
        <p className="text-sm text-theme-muted">Your score</p>
        <p className="mt-1 text-4xl font-semibold">
          {score}/{total}
        </p>
        <p className="mt-2 text-sm">{scoreMessage(score, total)}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={() => {
              setIndex(0);
              setPicked(null);
              setScore(0);
            }}
            className="cursor-pointer rounded-lg border border-theme-border px-4 py-2 text-sm"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={refresh}
            className="cursor-pointer rounded-lg bg-theme-accent px-4 py-2 text-sm text-theme-on-accent"
          >
            New questions
          </button>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const answered = picked !== null;

  function choose(i) {
    if (answered) return;
    setPicked(i);
    if (i === q.answerIndex) {
      setScore((s) => s + 1);
    }
  }

  function next() {
    const finalScore = score;
    setPicked(null);
    setIndex((i) => i + 1);
    if (index + 1 === total && finalScore === total) say("Perfect quiz! Look at you go.", "celebrate");
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between text-sm text-theme-muted">
        <span>
          Question {index + 1} of {total}
        </span>
        <span>Score {score}</span>
      </div>
      <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-theme-border">
        <div className="h-full bg-theme-accent transition-all" style={{ width: `${(index / total) * 100}%` }} />
      </div>

      <p className="mb-3 font-medium">{q.question}</p>
      <div className="space-y-2">
        {q.choices.map((choice, i) => {
          const isAnswer = i === q.answerIndex;
          const state = !answered ? "" : isAnswer ? "right" : i === picked ? "wrong" : "dim";
          return (
            <button
              key={i}
              type="button"
              onClick={() => choose(i)}
              disabled={answered}
              className={`flex w-full items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition ${
                state === "right"
                  ? "border-theme-action bg-theme-action-t"
                  : state === "wrong"
                    ? "border-theme-urgent bg-theme-urgent-t"
                    : "border-theme-border hover:bg-theme-border/20"
              } ${state === "dim" ? "opacity-60" : ""} ${answered ? "cursor-default" : "cursor-pointer"}`}
            >
              <span>{choice}</span>
              {state === "right" && <Check aria-label="Correct" className="size-4 shrink-0 text-theme-action" />}
              {state === "wrong" && <X aria-label="Your answer" className="size-4 shrink-0 text-theme-urgent" />}
            </button>
          );
        })}
      </div>

      {answered && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className={`text-sm font-medium ${picked === q.answerIndex ? "text-theme-action" : "text-theme-urgent"}`}>
            {picked === q.answerIndex ? "Nice, that's right!" : `Not quite. It's "${q.answer}".`}
          </p>
          <button
            type="button"
            autoFocus
            onClick={next}
            className="shrink-0 cursor-pointer rounded-lg bg-theme-accent px-4 py-2 text-sm text-theme-on-accent"
          >
            {index + 1 === total ? "See score" : "Next"}
          </button>
        </div>
      )}
    </div>
  );
}
