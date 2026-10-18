import { useEffect, useRef } from "react";
import { CLICK_MESSAGES, IDLE_TIPS, pick } from "./messages";
import SproutArt from "./SproutArt";
import { useSprout } from "./SproutContext";

// The sparkle is saved for real wins (see "celebrate" in messages.js) so it stays special.
const MOOD_ICON = { idle: null, happy: null, celebrate: "✨", nudge: null, thinking: null };

function shuffled(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// The little floating study companion. Any part of the app can make it talk
// via useSprout().say(text, mood) — see SproutContext.jsx. On its own, it
// offers a quiet study tip every so often when nothing else is going on.
export default function Sprout() {
  const { message, say } = useSprout();
  const idleTimerRef = useRef(null);
  // Click messages are dealt from a shuffled deck so every click is different
  // and nothing repeats until all of them have been shown.
  const deckRef = useRef([]);
  const lastClickRef = useRef(null);

  function nextClickMessage() {
    if (deckRef.current.length === 0) {
      deckRef.current = shuffled(CLICK_MESSAGES);
      // Don't start a new round with the message we just showed.
      if (deckRef.current[0] === lastClickRef.current) deckRef.current.push(deckRef.current.shift());
    }
    lastClickRef.current = deckRef.current.shift();
    return lastClickRef.current;
  }

  useEffect(() => {
    function scheduleIdleTip() {
      idleTimerRef.current = setTimeout(() => {
        say(pick(IDLE_TIPS), "idle");
        scheduleIdleTip();
      }, 45_000);
    }
    scheduleIdleTip();
    return () => clearTimeout(idleTimerRef.current);
  }, [say]);

  const mood = message?.mood ?? "idle";

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-2">
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="max-w-72 rounded-2xl rounded-br-sm border border-theme-border bg-theme-surface px-4 py-3 text-sm text-theme-text shadow-lg"
        >
          <p>
            {MOOD_ICON[mood] && <span className="mr-1">{MOOD_ICON[mood]}</span>}
            {message.text}
          </p>
        </div>
      )}

      <button
        type="button"
        aria-label="Sprout, your study buddy. Click to say hi"
        onClick={() => say(nextClickMessage(), "happy")}
        className={`group relative size-20 cursor-pointer rounded-full bg-transparent p-0 transition-transform duration-200 hover:scale-105 ${
          mood === "nudge" ? "animate-sprout-shake" : "animate-sprout-bob"
        }`}
      >
        <SproutArt className="size-full drop-shadow-md" />
      </button>
    </div>
  );
}
