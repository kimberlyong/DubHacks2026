import { X } from "lucide-react";
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
    <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-theme-accent bg-theme-surface p-4">
      <div className="min-w-0">
        <p className="font-medium">
          <span className="mr-1">💡</span>
          There's a Canvas extension that grabs your readings automatically.
        </p>
        {open ? (
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-theme-muted">
            <li>
              Go to <code className="rounded bg-theme-border/20 px-1">chrome://extensions</code>
            </li>
            <li>Turn on Developer mode (top right)</li>
            <li>
              Click <strong>Load unpacked</strong> and select the project's <code className="rounded bg-theme-border/20 px-1">extension</code> folder
            </li>
            <li>Open any Canvas page, click the extension, then "Extract this page"</li>
          </ol>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-1 cursor-pointer bg-transparent p-0 text-sm font-medium text-theme-accent underline"
          >
            How do I get it?
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="shrink-0 cursor-pointer p-1 text-theme-muted hover:text-theme-text"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
