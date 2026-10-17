import { relativeTime } from "../lib/studyHistory";

const SOURCE_LABEL = { extension: "via extension", upload: "uploaded" };

// "Pick up where you left off" + a few recent chips, built from local
// history (see lib/studyHistory.js). Resuming re-feeds the cached text
// straight into the study panel — no re-upload, no network round trip.
export default function StudyHistory({ entries, onResume }) {
  if (entries.length === 0) return null;
  const [latest, ...rest] = entries;

  return (
    <div className="mt-6 border border-dashed border-black/30 p-4 dark:border-white/30">
      <p className="text-sm text-neutral-600 dark:text-neutral-300">Picking up where you left off?</p>
      <button
        type="button"
        onClick={() => onResume(latest)}
        className="mt-2 flex w-full items-center justify-between gap-3 rounded-lg border border-black/10 bg-accent/5 px-3 py-2 text-left hover:bg-accent/10 dark:border-white/10"
      >
        <span className="min-w-0 truncate font-medium">{latest.fileName}</span>
        <span className="shrink-0 text-xs text-neutral-500">{relativeTime(latest.savedAt)}</span>
      </button>

      {rest.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {rest.map((entry) => (
            <button
              key={entry.fileName + entry.savedAt}
              type="button"
              onClick={() => onResume(entry)}
              title={`${entry.fileName} (${SOURCE_LABEL[entry.source] ?? entry.source})`}
              className="max-w-40 truncate rounded-full border border-black/20 px-3 py-1 text-xs hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              {entry.fileName}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
