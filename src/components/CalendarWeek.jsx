import { useMemo } from "react";
import { useCalendar } from "../hooks/useCalendar";
import { findFreeBlocks, formatDue, formatRange, upcomingDeadlines } from "../lib/schedule";
import CalendarConnect from "./CalendarConnect";

function formatLength(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)}h ${rest}m` : `${minutes / 60}h`;
}

// The Plans page's calendar card: what's due and when there's time to study
// this week, plus the place to connect calendars.
export default function CalendarWeek() {
  const cal = useCalendar();
  const blocks = useMemo(() => (cal.events ? findFreeBlocks(cal.events, { minMinutes: 30 }).slice(0, 5) : []), [cal.events]);
  const deadlines = useMemo(() => (cal.events ? upcomingDeadlines(cal.events) : []), [cal.events]);

  return (
    <section className="rounded-xl border border-theme-border bg-theme-surface p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Your calendar</h2>
      <p className="mt-1 text-sm text-theme-muted">
        Connect your calendars and we'll find when you're free and what's due, so plans fit your day.
      </p>

      {cal.connected && cal.events && (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold">Coming up</h3>
            {deadlines.length === 0 ? (
              <p className="text-sm text-theme-muted">Nothing due in the next two weeks.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {deadlines.map((d) => (
                  <li key={d.title + d.due} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate">{d.title}</span>
                    <span className="shrink-0 text-theme-muted">{formatDue(d)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h3 className="mb-2 text-sm font-semibold">Free to study</h3>
            {blocks.length === 0 ? (
              <p className="text-sm text-theme-muted">No free blocks found this week.</p>
            ) : (
              <ul className="space-y-1 text-sm">
                {blocks.map((b) => (
                  <li key={b.start.toISOString()} className="flex justify-between gap-3">
                    <span>{formatRange(b.start, b.end)}</span>
                    <span className="shrink-0 text-theme-muted">{formatLength(b.minutes)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div className="mt-4">
        <CalendarConnect />
      </div>
    </section>
  );
}
