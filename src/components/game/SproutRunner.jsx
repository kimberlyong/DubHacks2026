import { Heart, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { streakMessage } from "../../sprout/messages";
import { useSprout } from "../../sprout/SproutContext";
import { gradeTyped } from "./grading";
import { HEIGHT, MAX_LIVES, QUESTION_EVERY, WIDTH, createRunner } from "./runner";

const BEST_KEY = "recap-game-best";

function getBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function readColors(el) {
  const style = getComputedStyle(el);
  const get = (name, fallback) => style.getPropertyValue(name).trim() || fallback;
  return {
    text: get("--text", "#222"),
    muted: get("--muted", "#777"),
    border: get("--border", "#ddd"),
    accent: get("--accent", "#c0753f"),
    action: get("--action", "#5c7a4a"),
  };
}

function QuestionCard({ question, type, number, onDone }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null); // null | { correct, picked? }
  const continueRef = useRef(null);
  const typed = type !== "multiple";

  useEffect(() => {
    if (result) continueRef.current?.focus();
  }, [result]);

  function submitTyped(event) {
    event.preventDefault();
    if (!input.trim()) return;
    setResult({ correct: gradeTyped(question, input) });
  }

  const optionClass = (i) => {
    const base = "w-full rounded-lg border px-3 py-2 text-left disabled:cursor-default";
    if (!result) return `${base} cursor-pointer border-theme-border bg-theme-surface hover:bg-theme-border/30`;
    if (i === question.answerIndex) return `${base} border-theme-accent bg-theme-accent text-theme-on-accent`;
    if (i === result.picked) return `${base} border-theme-urgent bg-theme-urgent-t text-theme-urgent`;
    return `${base} border-theme-border bg-theme-surface opacity-60`;
  };

  return (
    <div className="rounded-xl border border-theme-border bg-theme-surface p-5 shadow-sm">
      <p className="text-sm text-theme-muted">
        Checkpoint {number} — answer to keep running
      </p>
      <h2 className="mt-1 text-lg font-semibold">
        {type === "vocab" ? "Which term matches this definition?" : question.question}
      </h2>
      {type === "vocab" && <p className="mt-2 leading-relaxed">{question.question}</p>}

      {type === "multiple" ? (
        <ul className="mt-4 space-y-2">
          {question.choices.map((choice, i) => (
            <li key={i}>
              <button
                type="button"
                disabled={Boolean(result)}
                onClick={() => setResult({ correct: i === question.answerIndex, picked: i })}
                className={optionClass(i)}
              >
                {choice}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <form onSubmit={submitTyped} className="mt-4 flex gap-2 max-[420px]:flex-col">
          <input
            autoFocus
            type="text"
            value={input}
            disabled={Boolean(result)}
            onChange={(e) => setInput(e.target.value)}
            aria-label="Your answer"
            placeholder={type === "vocab" ? "Type the term" : "Type your answer"}
            autoComplete="off"
            className="w-full min-w-0 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-theme-text placeholder:text-theme-muted"
          />
          {!result && (
            <button
              type="submit"
              className="cursor-pointer rounded-lg border border-theme-accent bg-theme-accent px-3 py-2 text-theme-on-accent"
            >
              Submit
            </button>
          )}
        </form>
      )}

      {result && (
        <div className="mt-4" role="status">
          <p className={`font-medium ${result.correct ? "text-theme-action" : "text-theme-urgent"}`}>
            {result.correct ? "Correct! Keep going. 🌱" : "Not quite — you lose a heart."}
          </p>
          {!result.correct && typed && (
            <p className="mt-1 text-sm">
              Answer: <strong>{question.answer}</strong>
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              ref={continueRef}
              type="button"
              onClick={() => onDone(result.correct)}
              className="cursor-pointer rounded-lg border border-theme-accent bg-theme-accent px-4 py-2 text-theme-on-accent"
            >
              Keep running
            </button>
            {!result.correct && type === "short" && (
              <button
                type="button"
                onClick={() => onDone(true)}
                className="cursor-pointer rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-theme-text"
              >
                I was right
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SproutRunner({ questions, type, onExit }) {
  const canvasRef = useRef(null);
  const runnerRef = useRef(null);
  const uiRef = useRef("ready");
  const orderRef = useRef(null);
  const askedRef = useRef(0);
  const streakRef = useRef(0);
  const { say } = useSprout();
  const [ui, setUi] = useState("ready"); // ready | running | question | over
  const [distance, setDistance] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [best, setBest] = useState(getBest);
  const [finalScore, setFinalScore] = useState(0);
  const [current, setCurrent] = useState(null);

  function changeUi(next) {
    uiRef.current = next;
    setUi(next);
  }

  // Shuffle once so the same document doesn't always open with the same question,
  // then walk through, looping around if the student outlasts the list.
  function nextQuestion() {
    if (!orderRef.current || askedRef.current % questions.length === 0) {
      orderRef.current = [...questions].sort(() => Math.random() - 0.5);
    }
    return orderRef.current[askedRef.current++ % questions.length];
  }

  useEffect(() => {
    const runner = createRunner(canvasRef.current, {
      getColors: () => readColors(canvasRef.current),
      onDistance: setDistance,
      onQuestion: () => {
        setCurrent(nextQuestion());
        changeUi("question");
      },
      onLifeLost: setLives,
      onGameOver: (score) => {
        setFinalScore(score);
        setBest((prev) => {
          const next = Math.max(prev, score);
          try {
            localStorage.setItem(BEST_KEY, String(next));
          } catch {
            // ignore
          }
          return next;
        });
        changeUi("over");
      },
    });
    runnerRef.current = runner;
    return () => runner.destroy();
    // The runner is created once per mount; nextQuestion reads refs only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function jump() {
    if (uiRef.current === "ready") changeUi("running");
    runnerRef.current?.jump();
  }

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.target instanceof HTMLElement && /^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName)) return;
      if (event.code === "Space" || event.code === "ArrowUp") {
        if (event.target instanceof HTMLButtonElement) event.target.blur();
        event.preventDefault();
        jump();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  function handleAnswered(correct) {
    if (correct) {
      streakRef.current += 1;
      if (streakRef.current % 3 === 0) say(streakMessage(streakRef.current), "happy");
    } else {
      streakRef.current = 0;
    }
    setCurrent(null);
    changeUi("running");
    runnerRef.current.resolveQuestion(correct);
  }

  function playAgain() {
    streakRef.current = 0;
    askedRef.current = 0;
    orderRef.current = null;
    setLives(MAX_LIVES);
    setCurrent(null);
    changeUi("ready");
    runnerRef.current.reset();
  }

  const nextCheckpoint = (Math.floor(distance / QUESTION_EVERY) + 1) * QUESTION_EVERY;

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1" aria-label={`${lives} of ${MAX_LIVES} hearts left`}>
          {Array.from({ length: MAX_LIVES }, (_, i) => (
            <Heart
              key={i}
              aria-hidden="true"
              className={`size-6 ${i < lives ? "fill-theme-urgent text-theme-urgent" : "text-theme-border"}`}
            />
          ))}
        </div>
        <p className="text-sm tabular-nums text-theme-muted">
          {distance} m · next question at {nextCheckpoint} m · best {best} m
        </p>
        <button
          type="button"
          onClick={onExit}
          className="cursor-pointer rounded-lg border border-theme-border bg-theme-surface px-3 py-1 text-sm text-theme-text"
        >
          Change quiz type
        </button>
      </div>

      <div
        className="relative overflow-hidden rounded-xl border border-theme-border bg-theme-surface"
        onPointerDown={(event) => {
          if (event.target === canvasRef.current) jump();
        }}
      >
        <canvas
          ref={canvasRef}
          role="img"
          aria-label="Sprout running along the ground"
          className={`block w-full touch-none ${ui === "question" ? "opacity-50" : ""}`}
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        />
        {ui === "ready" && (
          <p className="pointer-events-none absolute inset-x-0 top-6 text-center font-medium">
            Press Space (or tap) to start — jump over the rocks and thorns!
          </p>
        )}
      </div>

      <div className="mt-4">
        {ui === "running" && (
          <p className="text-center text-sm text-theme-muted">
            Space / ↑ / tap to jump. Every {QUESTION_EVERY} m, Sprout stops for a question.
          </p>
        )}
        {ui === "question" && current && (
          <QuestionCard
            key={askedRef.current}
            question={current}
            type={type}
            number={askedRef.current}
            onDone={handleAnswered}
          />
        )}
        {ui === "over" && (
          <div className="rounded-xl border border-theme-border bg-theme-surface p-5 text-center shadow-sm">
            <h2 className="text-xl font-semibold">Game over</h2>
            <p className="mt-2 text-theme-muted">
              You ran {finalScore} m and answered {askedRef.current} question{askedRef.current === 1 ? "" : "s"}.
              {finalScore >= best && finalScore > 0 ? " New best! 🎉" : ""}
            </p>
            <button
              type="button"
              onClick={playAgain}
              className="mt-4 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-theme-accent bg-theme-accent px-4 py-2 text-theme-on-accent"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
              Play again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
