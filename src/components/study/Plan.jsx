import { RotateCcw } from "lucide-react";
import { useEffect, useState } from "react";
import { usePlan } from "../../hooks/usePlan";
import { useSprout } from "../../sprout/SproutContext";

const MINUTE_OPTIONS = [15, 30, 45, 60];
const ENERGY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

function progressKey(documentId) {
  return `recap-plan-progress-${documentId}`;
}

function loadProgress(documentId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(progressKey(documentId)) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveProgress(documentId, done) {
  try {
    localStorage.setItem(progressKey(documentId), JSON.stringify([...done]));
  } catch {
    // ignore
  }
}

function ChipGroup({ options, value, onChange, getLabel = (o) => o }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const id = option.id ?? option;
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(id)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              selected
                ? "border-accent-dark bg-accent text-white"
                : "border-black/20 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            }`}
          >
            {getLabel(option)}
          </button>
        );
      })}
    </div>
  );
}

export default function Plan({ documentId, text }) {
  const { steps, params, status, error, generate, reset } = usePlan({ documentId, text });
  const [minutes, setMinutes] = useState(30);
  const [energy, setEnergy] = useState("medium");
  const [done, setDone] = useState(() => loadProgress(documentId));
  const { say } = useSprout();

  useEffect(() => setDone(loadProgress(documentId)), [documentId]);

  function toggle(index) {
    setDone((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      saveProgress(documentId, next);
      if (steps && next.size === steps.length && prev.size !== steps.length) {
        say("You finished your plan! That's the whole thing done. 🎉", "happy");
      }
      return next;
    });
  }

  if (status === "idle" || status === "loading") {
    return (
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-medium">How much time do you have?</p>
          <ChipGroup options={MINUTE_OPTIONS} value={minutes} onChange={setMinutes} getLabel={(m) => `${m} min`} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">How's your energy right now?</p>
          <ChipGroup options={ENERGY_OPTIONS} value={energy} onChange={setEnergy} getLabel={(o) => o.label} />
        </div>
        <button
          type="button"
          disabled={status === "loading"}
          onClick={() => generate(minutes, energy)}
          className="w-full rounded-lg border border-accent-dark bg-accent px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Building your plan…" : "Make my plan"}
        </button>
        {status === "loading" && (
          <div role="status" aria-label="Building your plan" className="animate-pulse space-y-2 motion-reduce:animate-none">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 bg-neutral-200 dark:bg-neutral-800" />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="border border-red-700 p-4 dark:border-red-400">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button
          type="button"
          className="mt-3 flex cursor-pointer items-center gap-2 border border-black px-3 py-1 dark:border-white"
          onClick={() => generate(minutes, energy)}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Retry
        </button>
      </div>
    );
  }

  const doneCount = steps.filter((_, i) => done.has(i)).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          {params.minutes} min · {ENERGY_OPTIONS.find((o) => o.id === params.energy)?.label ?? params.energy} energy ·{" "}
          {doneCount}/{steps.length} done
        </p>
        <button
          type="button"
          onClick={reset}
          className="cursor-pointer bg-transparent p-0 text-sm font-medium text-accent-dark underline dark:text-accent"
        >
          Make a new plan
        </button>
      </div>

      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                done.has(i)
                  ? "border-black/10 bg-black/[0.02] opacity-60 dark:border-white/10 dark:bg-white/[0.03]"
                  : "border-black/20 dark:border-white/20"
              }`}
            >
              <input
                type="checkbox"
                checked={done.has(i)}
                onChange={() => toggle(i)}
                className="mt-1 size-4 shrink-0 accent-[var(--color-accent)]"
              />
              <div className="min-w-0">
                <p className={`font-medium ${done.has(i) ? "line-through" : ""}`}>
                  {step.title}
                  {step.minutes ? (
                    <span className="ml-2 text-xs font-normal text-neutral-500">~{step.minutes} min</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-300">{step.instruction}</p>
              </div>
            </label>
          </li>
        ))}
      </ol>
    </div>
  );
}
