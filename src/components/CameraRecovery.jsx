import { useState } from "react";
import { X } from "lucide-react";
import { useFaceRecovery } from "../hooks/useFaceRecovery";

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
    <section className="my-3 rounded-xl border border-black p-4 dark:border-white">
      <div className="flex items-start justify-between gap-3">
      <h2 className="text-base font-semibold">Your Focus Buddy</h2>
        <button
          type="button"
          onClick={closeFocusBuddy}
          aria-label="Hide Focus Buddy"
          title="Hide Focus Buddy (reopen from sidebar)"
          className="rounded-lg p-1 text-theme-muted transition hover:bg-theme-border/30 hover:text-theme-text"
        >
          <X className="size-5" aria-hidden="true" />
        </button>
      </div>

      <p className="my-2 text-xs text-theme-muted">
        Your little study companion is here to keep you on track!
        Camera monitoring is optional and processed locally.
      </p>

      <div className="my-2 flex gap-2">
  <button
    type="button"
    onClick={() => changeFocusMode("screen")}
    aria-pressed={focusMode === "screen"}
    className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
      focusMode === "screen"
        ? "bg-black text-white dark:bg-white dark:text-black"
        : "border border-gray-300 dark:border-gray-600"
    }`}
  >
    Screen Focus
  </button>

  <button
    type="button"
    onClick={() => changeFocusMode("notes")}
    aria-pressed={focusMode === "notes"}
    className={`rounded-lg px-4 py-2 text-sm font-medium ${
      focusMode === "notes"
        ? "bg-black text-white dark:bg-white dark:text-black"
        : "border border-gray-300 dark:border-gray-600"
    }`}
  >
    Taking Notes
  </button>
</div>

{focusMode === "notes" && (
  <p className="mb-2 rounded-lg bg-green-50 px-3 py-2 text-xs text-green-900">
    Taking notes mode is on! Look down and write freely!
    Focus reminders are paused until you switch back.
  </p>
)}

{focusMode === "screen" && (
  <button
    type="button"
    onClick={() => {
      setEnabled(!enabled);
      setOnBreak(false);
      setShowRecovery(false);
    }}
    className="rounded-lg bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
  >
    {enabled ? "Turn off camera" : "Enable camera"}
  </button>
)}

<p className="mt-2 text-xs text-theme-muted" aria-live="polite">
      {focusMode === "notes"
    ? "Taking notes - camera monitoring paused"
    : enabled
      ? status
      : "Focus Buddy is sleeping"}
      </p>

      {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

      {snoozeMessage && (
        <p className="mt-3 rounded-lg bg-green-100 p-3 text-sm text-green-900">
          Got it! We'll snooze focus reminders for 5 minutes.
          Keep those ideas flowing!
        </p>
      )}

      {onBreak && (
        <div className="mt-4 rounded-xl border border-black p-4 dark:border-white">
          <h3 className="text-lg font-semibold">Brain break!</h3>
          <p className="my-3">
            Take a quick stretch, grab some water, or rest your eyes.
            Your study task will be waiting!
          </p>
          <button
            type="button"
            onClick={returnToStudy}
            className="rounded-lg bg-black px-4 py-2 text-white dark:bg-white dark:text-black"
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
