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
    <div className="mt-4 flex items-start justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 p-4">
      <div className="min-w-0">
        <p className="font-medium">
          <span className="mr-1">💡</span>
          There's a Canvas extension that grabs your readings automatically.
        </p>
        {open ? (
          <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-neutral-700 dark:text-neutral-300">
            <li>
              Go to <code className="rounded bg-black/5 px-1 dark:bg-white/10">chrome://extensions</code>
            </li>
            <li>Turn on Developer mode (top right)</li>
            <li>
              Click <strong>Load unpacked</strong> and select the project's <code className="rounded bg-black/5 px-1 dark:bg-white/10">extension</code> folder
            </li>
            <li>Open any Canvas page, click the extension, then "Extract this page"</li>
          </ol>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="mt-1 cursor-pointer bg-transparent p-0 text-sm font-medium text-accent-dark underline dark:text-accent"
          >
            How do I get it?
          </button>
        )}
      </div>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={dismiss}
        className="shrink-0 cursor-pointer p-1 text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
      >
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
