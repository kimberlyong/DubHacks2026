import { createContext, useCallback, useContext, useRef, useState } from "react";

const SproutContext = createContext(null);

// Longer messages stay up longer so there's time to read them.
const MIN_DURATION_MS = 4500;
const MS_PER_CHAR = 65;

// Shared across the app (and meant for other features to plug into — e.g.
// the camera/distraction-detection piece can call sprout.say("...", "nudge")
// the same way the upload flow does, with no extra wiring).
export function SproutProvider({ children }) {
  const [message, setMessage] = useState(null); // { text, mood } | null
  const timeoutRef = useRef(null);

  const say = useCallback((text, mood = "idle", duration = Math.max(MIN_DURATION_MS, text.length * MS_PER_CHAR)) => {
    clearTimeout(timeoutRef.current);
    setMessage({ text, mood });
    if (duration) timeoutRef.current = setTimeout(() => setMessage(null), duration);
  }, []);

  const clear = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setMessage(null);
  }, []);

  return <SproutContext.Provider value={{ message, say, clear }}>{children}</SproutContext.Provider>;
}

export function useSprout() {
  const ctx = useContext(SproutContext);
  if (!ctx) throw new Error("useSprout must be used inside <SproutProvider>");
  return ctx;
}
