import { LEVELS } from "../lib/levels";

const thumb =
  "[&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-4 [&::-webkit-slider-thumb]:border-theme-surface [&::-webkit-slider-thumb]:bg-theme-accent [&::-webkit-slider-thumb]:shadow-md " +
  "[&::-moz-range-thumb]:size-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-4 [&::-moz-range-thumb]:border-theme-surface [&::-moz-range-thumb]:bg-theme-accent";

export default function SummarySlider({ level, onChange }) {
  const current = LEVELS[level];
  return (
    <div className="rounded-3xl bg-theme-surface-2 px-5 pb-4 pt-4">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor="summary-level" className="font-display text-lg font-semibold">
          How deep should we go?
        </label>
        <span className="rounded-full bg-theme-accent-soft px-2.5 py-0.5 text-sm font-medium text-theme-accent">
          {current.name}
        </span>
      </div>
      <input
        id="summary-level"
        type="range"
        min={0}
        max={LEVELS.length - 1}
        step={1}
        value={level}
        aria-valuetext={current.name}
        aria-describedby="summary-level-description"
        onChange={(e) => onChange(Number(e.target.value))}
        className={`mt-4 h-6 w-full cursor-pointer appearance-none bg-transparent [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-theme-border [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-theme-border ${thumb}`}
      />
      <div aria-hidden="true" className="mt-1 flex justify-between text-xs text-theme-muted">
        <span>Simplest</span>
        <span>Most detail</span>
      </div>
      <p id="summary-level-description" className="mt-3 text-sm text-theme-muted" aria-live="polite">
        {current.description}
      </p>
    </div>
  );
}
