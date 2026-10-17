import { useEffect, useRef } from "react";
import { useSprout } from "./SproutContext";

const IDLE_TIPS = [
  "Stuck on something? Try reading it out loud — it slows your brain down just enough.",
  "Break it into one small step. You don't have to see the whole thing yet.",
  "Took a break? That's not falling behind, that's how focus works.",
  "If your eyes are moving but nothing's landing, try the Simplify slider.",
  "Not sure where to start? Pick literally anything. Momentum comes after.",
];

// Short things Sprout says when you click it.
const CLICK_MESSAGES = [
  "Hi! I'm rooting for you 🌱",
  "You're doing great.",
  "One small step at a time.",
  "Sip of water? 💧",
  "Proud of you for showing up.",
  "Deep breath. You've got this.",
  "Tiny progress is still progress.",
  "Stretch break? I'll wait.",
  "Hehe, that tickles!",
  "Let's grow together 🌿",
  "Focus mode: activated.",
  "You're smarter than you think.",
  "Done is better than perfect.",
  "I believe in you!",
  "Keep going — you're almost there.",
];

const MOOD_ICON = { idle: null, happy: "✨", nudge: "👀", thinking: "💭" };

function randomTip() {
  return IDLE_TIPS[Math.floor(Math.random() * IDLE_TIPS.length)];
}

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
      {message && (
        <div
          role="status"
          aria-live="polite"
          className="max-w-64 rounded-2xl rounded-br-sm border border-theme-border bg-theme-surface px-4 py-3 text-sm text-theme-text shadow-lg"
        >
          <p>
            {MOOD_ICON[mood] && <span className="mr-1">{MOOD_ICON[mood]}</span>}
            {message.text}
          </p>
        </div>
      )}

      <button
        type="button"
        aria-label="Sprout, your study buddy — click to say hi"
        onClick={() => say(nextClickMessage(), "happy", 4000)}
        className={`group relative size-20 cursor-pointer rounded-full bg-transparent p-0 transition-transform duration-200 hover:scale-105 ${
          mood === "nudge" ? "animate-sprout-shake" : "animate-sprout-bob"
        }`}
      >
        {/* Colors come from --sprout-* vars when a theme sets them (see index.css), else the accent. */}
        <svg viewBox="0 0 100 110" className="size-full drop-shadow-md">
          {/* body */}
          <ellipse cx="50" cy="92" rx="22" ry="14" fill="var(--sprout-body, var(--accent))" stroke="var(--sprout-outline, none)" strokeWidth="2.5" />
          {/* one floppy ear (left), one small round ear (right) — asymmetric on purpose */}
          <g className="sprout-ears">
            <path d="M28 40 Q6 44 10 66 Q14 78 30 68 Z" fill="var(--sprout-ear, var(--accent))" />
            <circle cx="76" cy="34" r="10" fill="var(--sprout-ear, var(--accent))" />
          </g>
          {/* round panda ears on top of the head, only shown by themes that ask for them */}
          {/* (light rim + inner ear so they still show against a dark background) */}
          <g className="sprout-panda-ears">
            <circle cx="26" cy="27" r="12" fill="var(--sprout-ear, var(--accent))" stroke="var(--sprout-ear-rim, none)" strokeWidth="2.5" />
            <circle cx="74" cy="27" r="12" fill="var(--sprout-ear, var(--accent))" stroke="var(--sprout-ear-rim, none)" strokeWidth="2.5" />
            <circle cx="26" cy="27" r="5.5" fill="var(--sprout-ear-inner, transparent)" />
            <circle cx="74" cy="27" r="5.5" fill="var(--sprout-ear-inner, transparent)" />
          </g>
          {/* head */}
          <circle cx="50" cy="52" r="32" fill="var(--sprout-body, var(--accent))" stroke="var(--sprout-outline, none)" strokeWidth="2.5" />
          {/* sprout leaves on top of head */}
          <path d="M46 22 Q38 6 50 2 Q52 16 46 22 Z" fill="var(--sprout-leaf, var(--action))" />
          <path d="M54 22 Q64 8 52 2 Q48 16 54 22 Z" fill="var(--sprout-leaf-2, var(--accent))" />
          {/* cheeks */}
          <circle cx="29" cy="58" r="5.5" fill="var(--sprout-cheek, var(--text))" opacity="var(--sprout-cheek-opacity, 0.5)" />
          <circle cx="71" cy="58" r="5.5" fill="var(--sprout-cheek, var(--text))" opacity="var(--sprout-cheek-opacity, 0.5)" />
          {/* snout patch */}
          <ellipse cx="50" cy="62" rx="13" ry="9" fill="white" opacity="0.92" />
          {/* eyes (blink via CSS animation), each with a little sparkle */}
          <g className="animate-sprout-blink">
            <ellipse cx="40" cy="48" rx="4" ry="5.5" fill="#1a1a1a" />
            <circle cx="41.5" cy="46" r="1.5" fill="white" />
          </g>
          <g className="animate-sprout-blink">
            <ellipse cx="60" cy="48" rx="4" ry="5.5" fill="#1a1a1a" />
            <circle cx="61.5" cy="46" r="1.5" fill="white" />
          </g>
          {/* nose */}
          <circle cx="50" cy="60" r="2.6" fill="#1a1a1a" />
          {/* paws */}
          <ellipse cx="36" cy="102" rx="7" ry="5" fill="var(--sprout-ear, var(--accent))" stroke="var(--sprout-ear-rim, none)" strokeWidth="2" />
          <ellipse cx="64" cy="102" rx="7" ry="5" fill="var(--sprout-ear, var(--accent))" stroke="var(--sprout-ear-rim, none)" strokeWidth="2" />
        </svg>
      </button>
    </div>
  );
}
