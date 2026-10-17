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
                ? "border-theme-accent bg-theme-accent text-theme-on-accent"
                : "border-theme-border hover:bg-theme-surface-2"
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
          className="w-full rounded-lg border border-theme-accent bg-theme-accent px-3 py-2 text-theme-on-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Building your plan…" : "Make my plan"}
        </button>
        {status === "loading" && (
          <div role="status" aria-label="Building your plan" className="animate-pulse space-y-2 motion-reduce:animate-none">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 rounded-2xl bg-theme-surface-2" />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="rounded-2xl bg-theme-urgent-t p-4">
        <p className="text-theme-urgent">{error}</p>
        <button
          type="button"
          className="mt-3 flex cursor-pointer items-center gap-2 rounded-full bg-theme-surface px-4 py-1.5 text-sm font-medium"
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
        <p className="text-sm text-theme-muted">
          {params.minutes} min · {ENERGY_OPTIONS.find((o) => o.id === params.energy)?.label ?? params.energy} energy ·{" "}
          {doneCount}/{steps.length} done
        </p>
        <button
          type="button"
          onClick={reset}
          className="cursor-pointer bg-transparent p-0 text-sm font-medium text-theme-accent underline"
        >
          Make a new plan
        </button>
      </div>

      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3.5 ${
                done.has(i)
                  ? "border-theme-border bg-theme-surface-2 opacity-60"
                  : "border-theme-border bg-theme-surface hover:border-theme-accent"
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
                    <span className="ml-2 text-xs font-normal text-theme-muted">~{step.minutes} min</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm text-theme-muted">{step.instruction}</p>
              </div>
            </label>
          </li>
        ))}
      </ol>
    </div>
  );
}
