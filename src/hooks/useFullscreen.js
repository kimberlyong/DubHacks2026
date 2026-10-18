import { useCallback, useEffect, useRef, useState } from "react";

export default function useFullscreen() {
  const elementRef = useRef(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    function handleFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === elementRef.current);
      setError("");
    }

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const element = elementRef.current;
    if (!element) return;

    setError("");
    try {
      if (document.fullscreenElement === element) {
        await document.exitFullscreen();
      } else {
        if (typeof element.requestFullscreen !== "function") {
          throw new Error("Fullscreen is not supported by this browser.");
        }
        await element.requestFullscreen();
      }
    } catch (fullscreenError) {
      setError(fullscreenError instanceof Error ? fullscreenError.message : "Could not change fullscreen mode.");
    }
  }, []);

  return { elementRef, isFullscreen, toggleFullscreen, error };
}
