// Small local history of studied documents, so the app can offer "pick up
// where you left off" and a "recently extracted" list — all client-side,
// no backend. Caps text length so a big PDF doesn't blow past localStorage's
// ~5MB-per-origin limit; a resumed entry may be slightly truncated, which is
// an acceptable tradeoff for a quick "jump back in" shortcut.
const KEY = "recap-history";
const MAX_ENTRIES = 5;
const MAX_TEXT_CHARS = 50_000;

export function getHistory() {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
}

export function addToHistory({ fileName, text, source }) {
  try {
    const entry = {
      fileName,
      source, // "upload" | "extension"
      text: text.length > MAX_TEXT_CHARS ? text.slice(0, MAX_TEXT_CHARS) : text,
      savedAt: Date.now(),
    };
    const next = [entry, ...getHistory().filter((e) => e.fileName !== fileName)].slice(0, MAX_ENTRIES);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Storage full or unavailable — history is a nice-to-have, fail silently.
  }
}

export function relativeTime(ms) {
  const diff = Date.now() - ms;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}
