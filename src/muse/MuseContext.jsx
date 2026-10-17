import { createContext, useCallback, useContext, useRef, useState } from "react";

const MuseContext = createContext(null);

const DEFAULT_DURATION_MS = 4500;

// Shared across the app (and meant for other features to plug into — e.g.
// the camera/distraction-detection piece can call muse.say("...", "nudge")
// the same way the upload flow does, with no extra wiring).
export function MuseProvider({ children }) {
  const [message, setMessage] = useState(null); // { text, mood } | null
  const timeoutRef = useRef(null);

  const say = useCallback((text, mood = "idle", duration = DEFAULT_DURATION_MS) => {
    clearTimeout(timeoutRef.current);
    setMessage({ text, mood });
    if (duration) timeoutRef.current = setTimeout(() => setMessage(null), duration);
  }, []);

  const clear = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setMessage(null);
  }, []);

  return <MuseContext.Provider value={{ message, say, clear }}>{children}</MuseContext.Provider>;
}

export function useMuse() {
  const ctx = useContext(MuseContext);
  if (!ctx) throw new Error("useMuse must be used inside <MuseProvider>");
  return ctx;
}
