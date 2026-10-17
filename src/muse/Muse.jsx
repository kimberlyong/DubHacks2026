import { useEffect, useRef, useState } from "react";
import { useMuse } from "./MuseContext";

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
// via useMuse().say(text, mood) — see MuseContext.jsx. On its own, it offers
// a quiet study tip every so often when nothing else is going on.
export default function Muse() {
  const { message, say } = useMuse();
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
        aria-label="Muse, your study buddy — click for tips"
        onClick={() => setTipsOpen((open) => !open)}
        className={`group relative size-16 cursor-pointer rounded-full bg-transparent p-0 transition-transform duration-200 hover:scale-105 ${
          mood === "nudge" ? "animate-muse-shake" : "animate-muse-bob"
        }`}
      >
        <svg viewBox="0 0 100 100" className="size-full drop-shadow-md">
          {/* ears */}
          <path d="M22 38 L14 10 L42 28 Z" fill="var(--color-accent)" />
          <path d="M78 38 L86 10 L58 28 Z" fill="var(--color-accent)" />
          <path d="M26 34 L21 17 L39 29 Z" fill="var(--color-accent-dark)" />
          <path d="M74 34 L79 17 L61 29 Z" fill="var(--color-accent-dark)" />
          {/* head */}
          <circle cx="50" cy="55" r="34" fill="var(--color-accent)" />
          {/* cheeks */}
          <circle cx="27" cy="62" r="6" fill="var(--color-accent-dark)" opacity="0.5" />
          <circle cx="73" cy="62" r="6" fill="var(--color-accent-dark)" opacity="0.5" />
          {/* snout patch */}
          <ellipse cx="50" cy="66" rx="14" ry="10" fill="white" opacity="0.9" />
          {/* eyes (blink via CSS animation) */}
          <ellipse className="animate-muse-blink" cx="39" cy="50" rx="4.5" ry="6" fill="#1a1a1a" />
          <ellipse className="animate-muse-blink" cx="61" cy="50" rx="4.5" ry="6" fill="#1a1a1a" />
          {/* nose */}
          <circle cx="50" cy="64" r="3" fill="#1a1a1a" />
        </svg>
      </button>
    </div>
  );
}
