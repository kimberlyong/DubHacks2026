import { ListChecks, PenLine, SpellCheck } from "lucide-react";
import { useRef, useState } from "react";
import { fetchGameQuestions } from "../../api/client";
import SproutRunner from "./SproutRunner";

const QUIZ_TYPES = [
  { id: "multiple", label: "Multiple choice", Icon: ListChecks },
  { id: "short", label: "Short answer", Icon: PenLine },
  { id: "vocab", label: "Vocab", Icon: SpellCheck },
];

const cache = new Map(); // `${documentId}:${type}` -> questions

export default function GamePage({ documentId, text }) {
  const [type, setType] = useState("multiple");
  const [status, setStatus] = useState("setup"); // setup | loading | playing
  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState(null);
  const abortRef = useRef(null);

  async function start() {
    const key = `${documentId}:${type}`;
    setError(null);
    if (cache.has(key)) {
      setQuestions(cache.get(key));
      setStatus("playing");
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("loading");
    try {
      const result = await fetchGameQuestions({ documentId, text, type }, controller.signal);
      cache.set(key, result);
      setQuestions(result);
      setStatus("playing");
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message);
      setStatus("setup");
    }
  }

  if (status === "playing") {
    return (
      <section className="py-10">
        <SproutRunner
          key={`${documentId}:${type}`}
          questions={questions}
          type={type}
          onExit={() => setStatus("setup")}
        />
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl py-18">
      <h1 className="text-3xl font-semibold">Sprout Run</h1>

      <fieldset className="mt-6" disabled={status === "loading"}>
        <legend className="mb-2 font-medium">Choose your questions</legend>
        <div className="grid gap-3 sm:grid-cols-3">
          {QUIZ_TYPES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              aria-pressed={type === id}
              onClick={() => setType(id)}
              className={`card-button cursor-pointer rounded-xl border p-4 text-left ${
                type === id
                  ? "border-theme-accent bg-theme-accent text-theme-on-accent"
                  : "border-theme-border bg-theme-surface text-theme-text hover:bg-theme-border/30"
              }`}
            >
              <Icon aria-hidden="true" className="size-6" />
              <span className="mt-2 block font-semibold">{label}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="mt-4 text-theme-urgent">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={status === "loading"}
        onClick={start}
        className="mt-6 cursor-pointer rounded-lg border border-theme-accent bg-theme-accent px-5 py-2 text-theme-on-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === "loading" ? "Writing your questions…" : "Start game"}
      </button>
    </section>
  );
}
