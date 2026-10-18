import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, X } from "lucide-react";
import { useFaceRecovery } from "../hooks/useFaceRecovery";
import { FOCUS_STATUS_MESSAGES, WELCOME_BACK_MESSAGES, pick } from "../sprout/messages";
import { useSprout } from "../sprout/SproutContext";

const MODES = [
  { id: "screen", label: "Screen focus" },
  { id: "notes", label: "Taking notes" },
];

// A status has to hold this long before Sprout mentions it, so a blink or a
// quick glance doesn't set it off.
const SETTLE_MS = 1500;
const NUDGE_GAP_MS = 20_000;

// Sprout says what the camera notices ("Eyes over here!") instead of the box
// showing a status line.
function useSproutFocusVoice(enabled, status) {
  const { say } = useSprout();
  const awayRef = useRef(false);
  const lastNudgeRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      awayRef.current = false;
      return;
    }
    const timer = setTimeout(() => {
      if (status === "Facing screen") {
        if (awayRef.current) say(pick(WELCOME_BACK_MESSAGES), "happy");
        awayRef.current = false;
        return;
      }
      const lines = FOCUS_STATUS_MESSAGES[status];
      if (!lines) return;
      if (status === "Watching for focus changes") {
        say(pick(lines), "happy");
        return;
      }
      if (Date.now() - lastNudgeRef.current < NUDGE_GAP_MS) return;
      lastNudgeRef.current = Date.now();
      awayRef.current = true;
      say(pick(lines), "nudge");
    }, SETTLE_MS);
    return () => clearTimeout(timer);
  }, [enabled, status, say]);
}

export default function CameraRecovery({ fileName, onBrainBreak, onClose }) {
  const {
    enabled,
    setEnabled,
    status,
    showRecovery,
    setShowRecovery,
    snoozeRecovery,
    error,
  } = useFaceRecovery();

  const [snoozeMessage, setSnoozeMessage] = useState(false);
  const [onBreak, setOnBreak] = useState(false);
  const [focusMode, setFocusMode] = useState("screen");

  useSproutFocusVoice(enabled && focusMode === "screen", status);

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

  function closeFocusBuddy() {
    setEnabled(false);
    setShowRecovery(false);
    onClose?.();
  }

  return (
    <section className="my-3 rounded-2xl border border-theme-border bg-theme-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold">Your Focus Buddy</h2>
          <p className="mt-0.5 text-xs text-theme-muted">
            Sprout keeps you on track. The camera is optional and stays on your device.
          </p>
        </div>
        <button
          type="button"
          onClick={closeFocusBuddy}
          aria-label="Hide Focus Buddy"
          title="Hide Focus Buddy (reopen from sidebar)"
          className="shrink-0 cursor-pointer rounded-lg bg-transparent p-1 text-theme-muted transition hover:bg-theme-border/30 hover:text-theme-text"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

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
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="recovery-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        >
          <div className="w-full max-w-md rounded-2xl bg-white p-6 text-black shadow-2xl">
            <h3 id="recovery-title" className="text-center text-2xl font-bold">
              Are you still here??
            </h3>
            <p className="my-4 text-center text-gray-600">
              Your study buddy noticed you looking away!
              Need a little motivation?!
            </p>
            {fileName && (
              <div className="mb-5 rounded-xl bg-gray-100 p-4">
                <p className="text-xs font-semibold uppercase text-gray-500">
                  Your current study material
                </p>
                <p className="mt-1 font-medium">{fileName}</p>
              </div>
            )}
            <div className="flex flex-col gap-2">
              <button type="button" onClick={returnToStudy} className="rounded-lg bg-black px-4 py-3 text-white">
                I'm back! Let's focus :)
              </button>
              <button
                type="button"
                onClick={() => {
                  setEnabled(false);
                  setShowRecovery(false);
                  onBrainBreak?.();
                }}
                className="rounded-lg border border-black px-4 py-3"
              >
                I need a brain break
              </button>
              <button
                type="button"
                onClick={() => {
                  snoozeRecovery();
                  setShowRecovery(false);
                  setSnoozeMessage(true);
                }}
                className="px-4 py-2 text-sm text-gray-500"
              >
                I'm thinking, not distracted!
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
