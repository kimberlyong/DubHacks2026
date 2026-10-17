import { BookMarked, ChevronRight } from "lucide-react";
import { relativeTime } from "../lib/studyHistory";

const SOURCE_LABEL = { extension: "From Canvas", upload: "Uploaded" };

// Recent documents, kept in this browser only (see lib/studyHistory.js).
// Resuming re-feeds the cached text straight into the workspace.
export default function StudyHistory({ entries, onResume }) {
  return (
    <section className="cozy-card p-5">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
        <BookMarked aria-hidden="true" className="size-5 text-theme-accent" />
        Pick up where you left off
      </h2>
      {entries.length === 0 ? (
        <p className="mt-3 text-sm text-theme-muted">
          Nothing here yet. Anything you open will show up here so you can jump back in.
        </p>
      ) : (
        <ul className="mt-3 space-y-1">
          {entries.map((entry) => (
            <li key={entry.fileName + entry.savedAt}>
              <button
                type="button"
                onClick={() => onResume(entry)}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 text-left hover:bg-theme-surface-2"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{entry.fileName}</span>
                  <span className="text-xs text-theme-muted">
                    {SOURCE_LABEL[entry.source] ?? "Opened"} · {relativeTime(entry.savedAt)}
                  </span>
                </span>
                <ChevronRight
                  aria-hidden="true"
                  className="size-4 shrink-0 text-theme-muted transition-transform group-hover:translate-x-0.5"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
