import { useEffect, useRef, useState } from "react";
import { useSprout } from "./SproutContext";

const IDLE_TIPS = [
  "Stuck on something? Try reading it out loud — it slows your brain down just enough.",
  "Break it into one small step. You don't have to see the whole thing yet.",
  "Took a break? That's not falling behind, that's how focus works.",
  "If your eyes are moving but nothing's landing, try the Simplify slider.",
  "Not sure where to start? Pick literally anything. Momentum comes after.",
];

const MOOD_ICON = { idle: null, happy: "✨", nudge: "👀", thinking: "💭" };

function randomTip() {
  return IDLE_TIPS[Math.floor(Math.random() * IDLE_TIPS.length)];
}

// The little floating study companion. Any part of the app can make it talk
// via useSprout().say(text, mood) — see SproutContext.jsx. On its own, it
// offers a quiet study tip every so often when nothing else is going on.
export default function Sprout() {
  const { message, say } = useSprout();
  const [tipsOpen, setTipsOpen] = useState(false);
  const idleTimerRef = useRef(null);

  useEffect(() => {
    function scheduleIdleTip() {
      idleTimerRef.current = setTimeout(() => {
        say(randomTip(), "idle", 6000);
        scheduleIdleTip();
      }, 45_000);
    }
    scheduleIdleTip();
    return () => clearTimeout(idleTimerRef.current);
  }, [say]);

  const mood = message?.mood ?? "idle";

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {(message || tipsOpen) && (
        <div
          role="status"
          aria-live="polite"
          className="max-w-64 rounded-2xl rounded-br-sm border border-neutral-200 bg-white px-4 py-3 text-sm text-neutral-800 shadow-lg dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          {tipsOpen ? (
            <>
              <p className="mb-2 font-medium">A few things that help:</p>
              <ul className="list-disc space-y-1 pl-4">
                {IDLE_TIPS.slice(0, 3).map((tip) => (
                  <li key={tip}>{tip}</li>
                ))}
              </ul>
            </>
          ) : (
            <p>
              {MOOD_ICON[mood] && <span className="mr-1">{MOOD_ICON[mood]}</span>}
              {message.text}
            </p>
          )}
        </div>
      )}

      <button
        type="button"
        aria-label="Sprout, your study buddy — click for tips"
        onClick={() => setTipsOpen((open) => !open)}
        className={`group relative size-16 cursor-pointer rounded-full bg-transparent p-0 transition-transform duration-200 hover:scale-105 ${
          mood === "nudge" ? "animate-sprout-shake" : "animate-sprout-bob"
        }`}
      >
        <svg viewBox="0 0 100 110" className="size-full drop-shadow-md">
          {/* body */}
          <ellipse cx="50" cy="92" rx="22" ry="14" fill="var(--color-accent-dark)" />
          {/* one floppy ear (left), one small round ear (right) — asymmetric on purpose */}
          <path d="M28 40 Q6 44 10 66 Q14 78 30 68 Z" fill="var(--color-accent)" />
          <circle cx="76" cy="34" r="10" fill="var(--color-accent)" />
          {/* head */}
          <circle cx="50" cy="52" r="32" fill="var(--color-accent)" />
          {/* sprout leaves on top of head */}
          <path d="M46 22 Q38 6 50 2 Q52 16 46 22 Z" fill="#7cc576" />
          <path d="M54 22 Q64 8 52 2 Q48 16 54 22 Z" fill="#9ad794" />
          {/* cheeks */}
          <circle cx="29" cy="58" r="5.5" fill="var(--color-accent-dark)" opacity="0.5" />
          <circle cx="71" cy="58" r="5.5" fill="var(--color-accent-dark)" opacity="0.5" />
          {/* snout patch */}
          <ellipse cx="50" cy="62" rx="13" ry="9" fill="white" opacity="0.92" />
          {/* eyes (blink via CSS animation) */}
          <ellipse className="animate-sprout-blink" cx="40" cy="48" rx="4" ry="5.5" fill="#1a1a1a" />
          <ellipse className="animate-sprout-blink" cx="60" cy="48" rx="4" ry="5.5" fill="#1a1a1a" />
          {/* nose */}
          <circle cx="50" cy="60" r="2.6" fill="#1a1a1a" />
          {/* paws */}
          <ellipse cx="36" cy="102" rx="7" ry="5" fill="var(--color-accent-dark)" />
          <ellipse cx="64" cy="102" rx="7" ry="5" fill="var(--color-accent-dark)" />
        </svg>
      </button>
    </div>
  );
}
