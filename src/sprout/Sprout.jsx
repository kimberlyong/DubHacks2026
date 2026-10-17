import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSprout } from "./SproutContext";

const IDLE_TIPS = [
  "Stuck on something? Try reading it out loud. It slows your brain down just enough.",
  "Break it into one small step. You don't have to see the whole thing yet.",
  "Took a break? That's not falling behind, that's how focus works.",
  "If your eyes are moving but nothing's landing, try a simpler summary level.",
  "Not sure where to start? Pick literally anything. Momentum comes after.",
];

function randomTip() {
  return IDLE_TIPS[Math.floor(Math.random() * IDLE_TIPS.length)];
}

const INK = "#3d2b22";

function Eyes({ mood }) {
  if (mood === "happy") {
    return (
      <g fill="none" stroke={INK} strokeWidth="3.2" strokeLinecap="round">
        <path d="M40 66 Q46 59 52 66" />
        <path d="M68 66 Q74 59 80 66" />
      </g>
    );
  }
  // nudge looks off to the side, thinking looks up; idle looks at you.
  const dx = mood === "nudge" ? 3 : 0;
  const dy = mood === "thinking" ? -3 : 0;
  return (
    <g className="animate-sprout-blink">
      <ellipse cx={46 + dx} cy={65 + dy} rx="5.6" ry="7" fill={INK} />
      <ellipse cx={74 + dx} cy={65 + dy} rx="5.6" ry="7" fill={INK} />
      <circle cx={48 + dx} cy={62 + dy} r="2.1" fill="#fff" />
      <circle cx={76 + dx} cy={62 + dy} r="2.1" fill="#fff" />
      <circle cx={44.5 + dx} cy={68 + dy} r="1" fill="#fff" opacity="0.8" />
      <circle cx={72.5 + dx} cy={68 + dy} r="1" fill="#fff" opacity="0.8" />
    </g>
  );
}

function Mouth({ mood }) {
  if (mood === "happy") {
    return <path d="M53 76 Q60 85 67 76 Z" fill="#c9604c" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" />;
  }
  if (mood === "nudge") {
    return <path d="M56 79 Q60 77 64 79" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />;
  }
  return <path d="M55 77 Q60 82 65 77" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />;
}

// The illustration on its own, so it can be the floating companion, the
// big friendly face on the homepage, or a tiny logo mark.
export function SproutArt({ mood = "idle", className = "" }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <ellipse cx="60" cy="112" rx="30" ry="4.5" fill="#3d2b22" opacity="0.12" />
      {/* feet */}
      <ellipse cx="46" cy="106" rx="9" ry="5.5" fill="#f2bf9a" />
      <ellipse cx="74" cy="106" rx="9" ry="5.5" fill="#f2bf9a" />
      {/* arms */}
      <ellipse cx="22" cy="80" rx="7" ry="10" fill="#ffd9bf" transform="rotate(25 22 80)" />
      <ellipse cx="98" cy="80" rx="7" ry="10" fill="#ffd9bf" transform="rotate(-25 98 80)" />
      {/* body */}
      <path
        d="M60 32 C86 32 101 50 101 74 C101 96 84 106 60 106 C36 106 19 96 19 74 C19 50 34 32 60 32 Z"
        fill="#ffe2cc"
        stroke="#f0b892"
        strokeWidth="2"
      />
      <ellipse cx="60" cy="88" rx="23" ry="14" fill="#fff2e6" />
      {/* sprout */}
      <g className="animate-sprout-sway">
        <path d="M60 34 Q59 24 61 15" fill="none" stroke="#6fa45b" strokeWidth="3.2" strokeLinecap="round" />
        <path d="M60 22 C49 22 41 15 40 7 C50 6 58 12 60 22 Z" fill="#9fcf82" stroke="#6fa45b" strokeWidth="1.6" />
        <path d="M61 18 C70 13 79 14 84 20 C77 27 67 26 61 18 Z" fill="#b6dc9a" stroke="#6fa45b" strokeWidth="1.6" />
      </g>
      {/* cheeks */}
      <ellipse cx="35" cy="76" rx="7" ry="4.5" fill="#ffab9d" opacity="0.75" />
      <ellipse cx="85" cy="76" rx="7" ry="4.5" fill="#ffab9d" opacity="0.75" />
      <Eyes mood={mood} />
      <Mouth mood={mood} />
    </svg>
  );
}

// The floating study companion. Any part of the app can make it talk via
// useSprout().say(text, mood); see SproutContext.jsx. On its own, it offers
// a quiet tip every so often when nothing else is going on.
export default function Sprout() {
  const { message, say, clear } = useSprout();
  const [tipsOpen, setTipsOpen] = useState(false);
  const idleTimerRef = useRef(null);

  useEffect(() => {
    function scheduleIdleTip() {
      idleTimerRef.current = setTimeout(() => {
        say(randomTip(), "idle", 7000);
        scheduleIdleTip();
      }, 60_000);
    }
    scheduleIdleTip();
    return () => clearTimeout(idleTimerRef.current);
  }, [say]);

  const mood = message?.mood ?? (tipsOpen ? "happy" : "idle");
  const showBubble = message || tipsOpen;

  return (
    <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-1">
      {showBubble && (
        <div role="status" aria-live="polite" className="cozy-pop animate-bubble-in relative mr-6 max-w-72 px-4 py-3 text-sm">
          <button
            type="button"
            aria-label="Close"
            onClick={() => {
              setTipsOpen(false);
              clear();
            }}
            className="absolute right-2 top-2 cursor-pointer rounded-full p-1 text-theme-muted hover:bg-theme-surface-2"
          >
            <X aria-hidden="true" className="size-3.5" />
          </button>
          {tipsOpen && !message ? (
            <div className="pr-4">
              <p className="mb-1.5 font-display text-base font-semibold">Little things that help</p>
              <ul className="space-y-1.5 text-theme-muted">
                {IDLE_TIPS.slice(0, 3).map((tip) => (
                  <li key={tip} className="flex gap-2">
                    <span aria-hidden="true">🌱</span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="pr-4">{message.text}</p>
          )}
          {/* little tail pointing at Sprout */}
          <span
            aria-hidden="true"
            className="absolute -bottom-2 right-6 size-4 rotate-45 border-b border-r border-theme-border bg-theme-surface"
          />
        </div>
      )}

      <button
        type="button"
        aria-label="Sprout, your study buddy. Click for tips."
        onClick={() => {
          clear();
          setTipsOpen((open) => !open);
        }}
        className={`size-20 cursor-pointer rounded-full bg-transparent p-0 transition-transform duration-200 hover:scale-110 ${
          mood === "nudge" ? "animate-sprout-shake" : "animate-sprout-bob"
        }`}
      >
        <SproutArt mood={mood} className="size-full drop-shadow-md" />
      </button>
    </div>
  );
}
