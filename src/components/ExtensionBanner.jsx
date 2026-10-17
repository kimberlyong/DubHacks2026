import { Puzzle, X } from "lucide-react";
import { useState } from "react";

const DISMISS_KEY = "recap-ext-banner-dismissed";

export default function ExtensionBanner() {
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(DISMISS_KEY) === "1");
  const [open, setOpen] = useState(false);

  if (dismissed) return null;

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <section className="relative rounded-3xl bg-theme-concept-t p-5 text-theme-text">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="absolute right-3 top-3 cursor-pointer rounded-full p-1.5 text-theme-muted hover:bg-theme-surface/60"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
      <h2 className="flex items-center gap-2 pr-8 font-display text-lg font-semibold">
        <Puzzle aria-hidden="true" className="size-5 text-theme-concept" />
        Using Canvas?
      </h2>
      <p className="mt-1 text-sm text-theme-muted">
        Our extension grabs an assignment, syllabus, or lecture page in one click and drops it right here.
      </p>
      {open ? (
        <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-theme-muted">
          <li>
            Go to <code className="rounded-md bg-theme-surface/70 px-1">chrome://extensions</code>
          </li>
          <li>Turn on Developer mode (top right)</li>
          <li>
            Click <strong>Load unpacked</strong> and pick the project's{" "}
            <code className="rounded-md bg-theme-surface/70 px-1">extension</code> folder
          </li>
          <li>On any Canvas page, click the extension, then "Extract this page"</li>
        </ol>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 cursor-pointer rounded-full bg-theme-surface px-4 py-1.5 text-sm font-medium hover:shadow-sm"
        >
          Show me how
        </button>
      )}
    </section>
  );
}
