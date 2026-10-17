import { Trash2 } from "lucide-react";
import { useState } from "react";
import { deletePlan, getSavedPlans, updatePlanProgress } from "../lib/savedPlans";
import { relativeTime } from "../lib/studyHistory";

const ENERGY_LABEL = { low: "Low", medium: "Medium", high: "High" };

export default function SavedPlans() {
  const [plans, setPlans] = useState(getSavedPlans);

  function toggle(plan, index) {
    const done = new Set(plan.done);
    done.has(index) ? done.delete(index) : done.add(index);
    setPlans(updatePlanProgress(plan.id, [...done]));
  }

  return (
    <section className="py-18">
      <h1 className="text-3xl font-semibold">Plans</h1>
      {plans.length === 0 ? (
        <p className="mt-3 text-theme-muted">
          Nothing here yet. Make a plan in the study panel and choose “Save plan” to keep it here.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {plans.map((plan) => {
            const done = new Set(plan.done);
            return (
              <li
                key={plan.id}
                className="rounded-xl border border-theme-border bg-theme-surface p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="break-all text-xl font-semibold">{plan.fileName}</h2>
                    <p className="text-sm text-theme-muted">
                      {plan.minutes} min · {ENERGY_LABEL[plan.energy] ?? plan.energy} energy ·{" "}
                      {plan.steps.filter((_, i) => done.has(i)).length}/{plan.steps.length} done · saved{" "}
                      {relativeTime(plan.savedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Delete plan for ${plan.fileName}`}
                    onClick={() => setPlans(deletePlan(plan.id))}
                    className="cursor-pointer bg-transparent p-1"
                  >
                    <Trash2 aria-hidden="true" className="size-5" />
                  </button>
                </div>
                <ol className="mt-4 space-y-2">
                  {plan.steps.map((step, i) => (
                    <li key={i}>
                      <label
                        className={`flex cursor-pointer items-start gap-3 rounded-lg border border-theme-border p-3 ${
                          done.has(i) ? "opacity-60" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={done.has(i)}
                          onChange={() => toggle(plan, i)}
                          className="mt-1 size-4 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className={`font-medium ${done.has(i) ? "line-through" : ""}`}>
                            {step.title}
                            {step.minutes ? (
                              <span className="ml-2 text-xs font-normal text-theme-muted">
                                ~{step.minutes} min
                              </span>
                            ) : null}
                          </p>
                          <p className="mt-0.5 text-sm text-theme-muted">{step.instruction}</p>
                        </div>
                      </label>
                    </li>
                  ))}
                </ol>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
