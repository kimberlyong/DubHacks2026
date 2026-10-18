// Sprout's drawing on its own, so the floating companion and the homepage
// can share it. Sprout is a little bear cub with a sprout growing on its head.
// Colors come from --sprout-* vars when a theme sets them (see index.css),
// else the theme accent.
export default function SproutArt({ className }) {
  return (
    <svg viewBox="0 0 100 110" className={className} aria-hidden="true">
      {/* body + belly */}
      <ellipse cx="50" cy="92" rx="22" ry="14" fill="var(--sprout-body, var(--accent))" />
      <ellipse cx="50" cy="94" rx="12" ry="8" fill="white" opacity="0.35" />
      {/* round ears with lighter insides */}
      <circle cx="25" cy="28" r="11" fill="var(--sprout-ear, var(--accent))" />
      <circle cx="75" cy="28" r="11" fill="var(--sprout-ear, var(--accent))" />
      <circle cx="25" cy="28" r="5.5" fill="white" opacity="0.4" />
      <circle cx="75" cy="28" r="5.5" fill="white" opacity="0.4" />
      {/* head */}
      <circle cx="50" cy="52" r="32" fill="var(--sprout-body, var(--accent))" />
      {/* sprout leaves on top of head */}
      <path d="M46 22 Q38 6 50 2 Q52 16 46 22 Z" fill="var(--sprout-leaf, var(--action))" />
      <path d="M54 22 Q64 8 52 2 Q48 16 54 22 Z" fill="var(--sprout-leaf-2, var(--accent))" />
      {/* cheeks */}
      <circle cx="29" cy="58" r="5.5" fill="var(--sprout-cheek, var(--text))" opacity="0.5" />
      <circle cx="71" cy="58" r="5.5" fill="var(--sprout-cheek, var(--text))" opacity="0.5" />
      {/* muzzle */}
      <ellipse cx="50" cy="63" rx="13" ry="10" fill="white" opacity="0.92" />
      {/* eyes (blink via CSS animation), each with a little sparkle */}
      <g className="animate-sprout-blink">
        <ellipse cx="40" cy="48" rx="4" ry="5.5" fill="#1a1a1a" />
        <circle cx="41.5" cy="46" r="1.5" fill="white" />
      </g>
      <g className="animate-sprout-blink">
        <ellipse cx="60" cy="48" rx="4" ry="5.5" fill="#1a1a1a" />
        <circle cx="61.5" cy="46" r="1.5" fill="white" />
      </g>
      {/* bear nose + little smile */}
      <path d="M45 58.5 Q50 56 55 58.5 Q53 63 50 63.5 Q47 63 45 58.5 Z" fill="#1a1a1a" />
      <path d="M50 63.5 Q48.5 67.5 45.5 66 M50 63.5 Q51.5 67.5 54.5 66" fill="none" stroke="#1a1a1a" strokeWidth="1.5" strokeLinecap="round" />
      {/* paws */}
      <ellipse cx="36" cy="102" rx="7" ry="5" fill="var(--sprout-ear, var(--accent))" />
      <ellipse cx="64" cy="102" rx="7" ry="5" fill="var(--sprout-ear, var(--accent))" />
    </svg>
  );
}
