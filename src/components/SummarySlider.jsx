import { LEVELS } from "../lib/levels";

const thumb =
  "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white [&::-webkit-slider-thumb]:bg-black dark:[&::-webkit-slider-thumb]:border-black dark:[&::-webkit-slider-thumb]:bg-white " +
  "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white [&::-moz-range-thumb]:bg-black dark:[&::-moz-range-thumb]:border-black dark:[&::-moz-range-thumb]:bg-white";

export default function SummarySlider({ level, onChange }) {
  const current = LEVELS[level];
  return (
    <div>
      <label htmlFor="summary-level" className="font-semibold">
        Summary level
      </label>
      <div className="mt-3">
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
          className={`h-4 w-full cursor-pointer appearance-none bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:focus-visible:outline-white [&::-webkit-slider-runnable-track]:h-1 [&::-webkit-slider-runnable-track]:bg-black dark:[&::-webkit-slider-runnable-track]:bg-white [&::-moz-range-track]:h-1 [&::-moz-range-track]:bg-black dark:[&::-moz-range-track]:bg-white ${thumb}`}
        />
        {/* px-2 matches half the thumb width so ticks line up with thumb centers */}
        <div aria-hidden="true" className="flex justify-between px-2">
          {LEVELS.map((l) => (
            <div key={l.id} className="relative flex w-0 flex-col items-center">
              <span className="h-2 w-px bg-black dark:bg-white" />
              <span className={`mt-1 whitespace-nowrap text-xs ${l.name === current.name ? "font-semibold" : "text-neutral-600 dark:text-neutral-300"}`}>
                {l.name}
              </span>
            </div>
          ))}
        </div>
      </div>
      <p id="summary-level-description" className="mt-8 text-sm" aria-live="polite">
        <span className="font-semibold">{current.name}:</span> {current.description}
      </p>
    </div>
  );
}
