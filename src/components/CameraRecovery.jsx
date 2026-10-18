import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, CameraOff, Volume2, VolumeX } from "lucide-react";
import { useFaceRecovery } from "../hooks/useFaceRecovery";
import { playChime } from "../lib/chime";
import { CAMERA_ON_MESSAGES, pick } from "../sprout/messages";
import SproutArt from "../sprout/SproutArt";
import { useSprout } from "../sprout/SproutContext";

// Chime when the "Still with me?" popup appears, but sparingly: repeated
// alerts get tuned out (alarm fatigue) and can stress people who are sensitive
// to sound. At most MAX_CHIMES per stretch of looking away, spaced out, and
// the count resets once they've really looked back at the screen.
const MAX_CHIMES = 3;
const CHIME_GAP_MS = 20_000;
const SOUND_KEY = "clarity:focusSound";

function useFocusChime() {
  const [soundOn, setSoundOn] = useState(() => {
    try {
      return localStorage.getItem(SOUND_KEY) !== "off";
    } catch {
      return true;
    }
  });
  const countRef = useRef(0);
  const lastRef = useRef(-Infinity);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      // Private mode etc.: the choice just won't be remembered.
    }
  }

  function onDistracted() {
    const now = performance.now();
    if (!soundOn || countRef.current >= MAX_CHIMES || now - lastRef.current < CHIME_GAP_MS) return;
    countRef.current += 1;
    lastRef.current = now;
    playChime();
  }

  function onReturn() {
    countRef.current = 0;
  }

  return { soundOn, toggleSound, onDistracted, onReturn };
}

const MODES = [
  { id: "screen", label: "Screen focus" },
  { id: "notes", label: "Taking notes" },
];

// Sprout says hi when the camera starts watching. Looking away is handled by
// the full popup below, not a small bubble.
function useSproutCameraHello(status) {
  const { say } = useSprout();
  useEffect(() => {
    if (status === "Watching for focus changes") say(pick(CAMERA_ON_MESSAGES), "happy");
  }, [status, say]);
}

// The "still here?" check in. Rendered into the themed app root rather than
// inside the page, so the page's fade-in transform can't pull it off center
// and the theme colors still apply.
function RecoveryDialog({ fileName, onBack, onBreak, onThinking }) {
  const [root, setRoot] = useState(null);
  useEffect(() => setRoot(document.querySelector("[data-theme]") ?? document.body), []);

  useEffect(() => {
    function handleKey(event) {
      if (event.key === "Escape") onBack();
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onBack]);

  if (!root) return null;
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="recovery-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-sm rounded-2xl border border-theme-border bg-theme-surface p-6 text-theme-text shadow-2xl">
        <SproutArt className="mx-auto size-16 animate-sprout-bob" />
        <h3 id="recovery-title" className="mt-3 text-center text-xl font-semibold">
          Still with me?
        </h3>
        <p className="mt-1 text-center text-sm text-theme-muted">
          I noticed you looking away for a bit. Totally normal. Want to jump back in?
        </p>
        {fileName && (
          <div className="mt-4 rounded-xl bg-theme-bg px-4 py-3">
            <p className="text-xs font-medium text-theme-muted">You were reading</p>
            <p className="mt-0.5 truncate text-sm font-medium">{fileName}</p>
          </div>
        )}
        <div className="mt-5 flex flex-col gap-2">
          <button
            type="button"
            autoFocus
            onClick={onBack}
            className="cursor-pointer rounded-lg bg-theme-accent px-4 py-2.5 text-sm font-medium text-theme-on-accent"
          >
            I'm back, let's focus
          </button>
          <button
            type="button"
            onClick={onBreak}
            className="cursor-pointer rounded-lg border border-theme-border bg-transparent px-4 py-2.5 text-sm font-medium text-theme-text hover:bg-theme-border/30"
          >
            I need a brain break
          </button>
          <button
            type="button"
            onClick={onThinking}
            className="cursor-pointer bg-transparent px-4 py-1.5 text-sm text-theme-muted hover:text-theme-text"
          >
            I'm thinking, not distracted
          </button>
        </div>
      </div>
    </div>,
    root,
  );
}

export default function CameraRecovery({ fileName, onBrainBreak }) {
  const chime = useFocusChime();
  const {
    enabled,
    setEnabled,
    status,
    showRecovery,
    setShowRecovery,
    snoozeRecovery,
    error,
  } = useFaceRecovery({ onDistracted: chime.onDistracted, onReturn: chime.onReturn });

  const [snoozeMessage, setSnoozeMessage] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [focusMode, setFocusMode] = useState("screen");

  useSproutCameraHello(status);

  function changeFocusMode(mode) {
    setFocusMode(mode);
    setEnabled(false);
    setShowRecovery(false);
    setSnoozeMessage(false);
    setOnBreak(false);
  }

  function returnToStudy() {
    setOnBreak(false);
    setShowRecovery(false);
  }

  return (
    <section className="my-3 rounded-2xl border border-theme-border bg-theme-surface p-4">
      <h2 className="text-base font-semibold">Your Focus Buddy</h2>
      <p className="mt-0.5 text-xs text-theme-muted">
        Sprout keeps you on track. The camera is optional and stays on your device.
      </p>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Focus mode" className="flex rounded-lg border border-theme-border p-0.5">
          {MODES.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => changeFocusMode(id)}
              aria-pressed={focusMode === id}
              className={`cursor-pointer rounded-md px-3 py-1.5 text-sm font-medium transition ${
                focusMode === id ? "bg-theme-accent text-theme-on-accent" : "bg-transparent text-theme-muted hover:text-theme-text"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {focusMode === "screen" && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={chime.toggleSound}
              aria-pressed={chime.soundOn}
              title={chime.soundOn ? "Mute the focus chime" : "Turn on the focus chime"}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-theme-border bg-transparent px-3 py-1.5 text-sm font-medium text-theme-text"
            >
              {chime.soundOn ? (
                <Volume2 aria-hidden="true" className="size-4" />
              ) : (
                <VolumeX aria-hidden="true" className="size-4" />
              )}
              {chime.soundOn ? "Sound on" : "Sound off"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEnabled(!enabled);
                setOnBreak(false);
                setShowRecovery(false);
              }}
              className={`flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
                enabled
                  ? "border border-theme-border bg-transparent text-theme-text"
                  : "bg-theme-accent text-theme-on-accent"
              }`}
            >
              {enabled ? (
                <CameraOff aria-hidden="true" className="size-4" />
              ) : (
                <Camera aria-hidden="true" className="size-4" />
              )}
              {enabled ? "Turn off camera" : "Turn on camera"}
            </button>
          </div>
        )}
      </div>

      {focusMode === "notes" && (
        <p className="mt-3 rounded-lg bg-theme-action-t px-3 py-2 text-xs text-theme-text">
          Taking notes mode is on! Look down and write freely. Focus reminders are paused until you switch back.
        </p>
      )}

      {error && <p className="mt-2 text-sm text-theme-urgent">{error}</p>}

      {snoozeMessage && (
        <p className="mt-3 rounded-lg bg-theme-action-t px-3 py-2 text-sm text-theme-text">
          Got it! We'll snooze focus reminders for 5 minutes. Keep those ideas flowing!
        </p>
      )}

      {onBreak && (
        <div className="mt-4 rounded-xl border border-theme-border p-4">
          <h3 className="text-lg font-semibold">Brain break!</h3>
          <p className="my-3">
            Take a quick stretch, grab some water, or rest your eyes.
            Your study task will be waiting!
          </p>
          <button
            type="button"
            onClick={returnToStudy}
            className="cursor-pointer rounded-lg bg-theme-accent px-4 py-2 text-theme-on-accent"
          >
            Back to studying
          </button>
        </div>
      )}

      {showRecovery && !onBreak && (
        <RecoveryDialog
          fileName={fileName}
          onBack={returnToStudy}
          onBreak={() => {
            setEnabled(false);
            setShowRecovery(false);
            onBrainBreak?.();
          }}
          onThinking={() => {
            snoozeRecovery();
            setShowRecovery(false);
            setSnoozeMessage(true);
          }}
        />
      )}
    </section>
  );
}
