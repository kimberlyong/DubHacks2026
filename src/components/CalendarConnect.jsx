import { CalendarDays, Link2, RefreshCw, X } from "lucide-react";
import { useState } from "react";
import { useCalendar } from "../hooks/useCalendar";

// Where students hook up their calendars: Google via sign-in, and Apple,
// Outlook, Canvas or anything else via its subscription (.ics) link.
export default function CalendarConnect() {
  const cal = useCalendar();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(null); // "google" | "link" | null
  const [error, setError] = useState(null);

  async function run(kind, action) {
    setBusy(kind);
    setError(null);
    try {
      await action();
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function handleAddLink(event) {
    event.preventDefault();
    if (!url.trim()) return;
    if (await run("link", () => cal.addLink(url))) setUrl("");
  }

  const { google, links } = cal.sources;

  return (
    <div className="space-y-3">
      <ul className="space-y-2">
        <li className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-theme-border px-3 py-2">
          <span className="flex items-center gap-2 font-medium">
            <CalendarDays aria-hidden="true" className="size-4 text-theme-accent" />
            Google Calendar
          </span>
          {google ? (
            <span className="flex items-center gap-3 text-sm">
              {cal.googleNeedsAuth ? (
                <button
                  type="button"
                  disabled={busy === "google"}
                  onClick={() => run("google", cal.connectGoogle)}
                  className="cursor-pointer rounded-lg border border-theme-accent bg-theme-accent px-3 py-1 text-theme-on-accent disabled:opacity-60"
                >
                  Reconnect
                </button>
              ) : (
                <span className="text-theme-action">Connected</span>
              )}
              <button
                type="button"
                onClick={cal.disconnectGoogle}
                className="cursor-pointer bg-transparent p-0 text-theme-muted underline"
              >
                Disconnect
              </button>
            </span>
          ) : (
            <button
              type="button"
              disabled={!cal.googleConfigured || busy === "google"}
              title={cal.googleConfigured ? undefined : "Google sign-in isn't set up yet — use Google's iCal link below instead."}
              onClick={() => run("google", cal.connectGoogle)}
              className="cursor-pointer rounded-lg border border-theme-accent bg-theme-accent px-3 py-1 text-sm text-theme-on-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              {busy === "google" ? "Connecting…" : "Connect"}
            </button>
          )}
          {cal.errors.google && <p className="w-full text-sm text-theme-urgent">{cal.errors.google}</p>}
        </li>

        {links.map((link) => (
          <li
            key={link.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-theme-border px-3 py-2"
          >
            <span className="flex min-w-0 items-center gap-2 font-medium">
              <Link2 aria-hidden="true" className="size-4 shrink-0 text-theme-accent" />
              <span className="truncate">{link.name}</span>
            </span>
            <button
              type="button"
              aria-label={`Remove ${link.name}`}
              onClick={() => cal.removeLink(link.id)}
              className="flex cursor-pointer items-center bg-transparent p-1 text-theme-muted hover:text-theme-text"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
            {cal.errors[link.id] && <p className="w-full text-sm text-theme-urgent">{cal.errors[link.id]}</p>}
          </li>
        ))}
      </ul>

      <form onSubmit={handleAddLink} className="flex gap-2 max-[420px]:flex-col">
        <label htmlFor="calendar-link" className="sr-only">
          Calendar link
        </label>
        <input
          id="calendar-link"
          type="url"
          inputMode="url"
          placeholder="Apple, Outlook or Canvas link (webcal://…)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="w-full min-w-0 rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-sm text-theme-text placeholder:text-theme-muted"
        />
        <button
          type="submit"
          disabled={!url.trim() || busy === "link"}
          className="cursor-pointer whitespace-nowrap rounded-lg border border-theme-border bg-transparent px-3 py-2 text-sm text-theme-text disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy === "link" ? "Checking…" : "Add calendar"}
        </button>
      </form>

      {error && (
        <p role="alert" className="text-sm text-theme-urgent">
          {error}
        </p>
      )}

      <details className="text-sm text-theme-muted">
        <summary className="cursor-pointer">Where do I find my calendar link?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            <strong className="text-theme-text">Apple / iCloud:</strong> open the calendar's sharing settings, turn on
            “Public Calendar”, and copy the link.
          </li>
          <li>
            <strong className="text-theme-text">Outlook:</strong> Settings → Calendar → Shared calendars → Publish a
            calendar, then copy the ICS link.
          </li>
          <li>
            <strong className="text-theme-text">Canvas:</strong> Calendar → “Calendar Feed” (bottom right) — this
            brings in every due date.
          </li>
          <li>
            <strong className="text-theme-text">Google (without signing in):</strong> calendar Settings → “Secret
            address in iCal format”.
          </li>
        </ul>
      </details>

      {cal.connected && (
        <button
          type="button"
          onClick={cal.refresh}
          disabled={cal.status === "loading"}
          className="flex cursor-pointer items-center gap-1.5 bg-transparent p-0 text-sm text-theme-muted hover:text-theme-text disabled:opacity-60"
        >
          <RefreshCw aria-hidden="true" className={`size-3.5 ${cal.status === "loading" ? "animate-spin" : ""}`} />
          {cal.status === "loading" ? "Updating…" : "Refresh"}
        </button>
      )}
    </div>
  );
}
