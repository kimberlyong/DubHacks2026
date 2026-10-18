import { useState } from "react";
import { getSavedPlans } from "../lib/savedPlans";

const MAX_STEPS = 3;

// Read-only peek at the most recently saved plan, for the home page's Plans box.
export default function PlansPreview({ onOpen }) {
  const [plans] = useState(getSavedPlans);
  const plan = plans[0];

  if (!plan) {
    return (
      <>
        <p>No saved plans yet. Make one in the study panel and it will show up here.</p>
        <button
          type="button"
          onClick={onOpen}
          className="cursor-pointer rounded-lg border border-theme-accent bg-theme-accent px-3 py-1.5 text-theme-on-accent"
        >
          Open plans
        </button>
      </>
    );
  }

  const done = new Set(plan.done);
  const shown = plan.steps.slice(0, MAX_STEPS);

  return (
    <>
      <div className="w-full min-w-0 text-left">
        <p className="truncate font-medium">{plan.fileName}</p>
        <p className="text-xs text-theme-muted">
          {plan.steps.filter((_, i) => done.has(i)).length}/{plan.steps.length} done · {plan.minutes} min
        </p>
        <ul className="mt-2 space-y-1">
          {shown.map((step, i) => (
            <li key={i} className={`flex items-start gap-2 ${done.has(i) ? "opacity-60" : ""}`}>
              <span
                aria-hidden="true"
                className={`mt-1 size-3 shrink-0 rounded-sm border border-theme-border ${
                  done.has(i) ? "bg-theme-accent" : ""
                }`}
              />
              <span className="min-w-0 truncate">{step.title}</span>
            </li>
          ))}
        </ul>
        {plan.steps.length > MAX_STEPS && (
          <p className="mt-1 text-xs text-theme-muted">+{plan.steps.length - MAX_STEPS} more</p>
        )}
      </div>
      <button
        type="button"
        onClick={onOpen}
        className="cursor-pointer rounded-lg border border-theme-accent bg-theme-accent px-3 py-1.5 text-theme-on-accent"
      >
        Open plans
      </button>
    </>
  );
}
