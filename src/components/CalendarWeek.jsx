import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCalendar } from "../hooks/useCalendar";
import { findFreeBlocks, isDeadline } from "../lib/schedule";
import CalendarConnect from "./CalendarConnect";

// The grid shows 8am–11pm; the data covers two weeks (see useCalendar).
const FIRST_HOUR = 8;
const LAST_HOUR = 23;
const HOUR_PX = 44;
const DAYS = 7;
const PAGES = 2;
const MINUTE = 60_000;

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const hourFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric" });
const weekdayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short" });
const monthDayFormat = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" });

function formatLength(minutes) {
  if (minutes < 60) return `${minutes}m`;
  const rest = minutes % 60;
  return rest ? `${Math.floor(minutes / 60)}h ${rest}m` : `${minutes / 60}h`;
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function sameDay(a, b) {
  return a.toDateString() === b.toDateString();
}

// Pixel offset of a time within its day's column, clamped to the grid.
function offsetOf(date, day) {
  const minutes = (date - day) / MINUTE - FIRST_HOUR * 60;
  return Math.min(Math.max(minutes, 0), (LAST_HOUR - FIRST_HOUR) * 60) * (HOUR_PX / 60);
}

// Side-by-side lanes for overlapping events, like a calendar app does.
function layOut(items) {
  const sorted = [...items].sort((a, b) => a.start - b.start || b.end - a.end);
  const placed = [];
  let group = [];
  let groupEnd = 0;
  const flush = () => {
    const lanes = Math.max(...group.map((g) => g.lane)) + 1;
    group.forEach((g) => placed.push({ ...g, lanes }));
    group = [];
  };
  for (const item of sorted) {
    if (group.length && item.start >= groupEnd) flush();
    const taken = new Set(group.filter((g) => g.end > item.start).map((g) => g.lane));
    let lane = 0;
    while (taken.has(lane)) lane++;
    group.push({ ...item, lane });
    groupEnd = Math.max(groupEnd, item.end);
  }
  if (group.length) flush();
  return placed;
}

function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// The Plans page's calendar card: a week view of classes, due dates and free
// time, in the soft tinted style of Notion's calendar, plus the place to
// connect calendars.
export default function CalendarWeek() {
  const cal = useCalendar();
  const now = useNow();
  const [page, setPage] = useState(0);

  const firstDay = addDays(startOfDay(now), page * DAYS);
  const days = Array.from({ length: DAYS }, (_, i) => addDays(firstDay, i));

  const { timed, dueByDay, free } = useMemo(() => {
    const events = cal.events ?? [];
    const timed = [];
    const dueByDay = new Map();
    const seen = new Set();
    for (const e of events) {
      const start = new Date(e.start);
      const end = new Date(e.end);
      const deadline = isDeadline(e) && end - start <= 30 * MINUTE;
      if (e.allDay || deadline) {
        // Due dates and all-day events go in the row above the grid.
        const day = startOfDay(e.allDay ? start : end).toDateString();
        const key = `${e.title}|${day}`;
        if (seen.has(key)) continue; // same item in two calendars
        seen.add(key);
        const list = dueByDay.get(day) ?? [];
        list.push({ title: e.title, due: e.allDay ? null : end, deadline: isDeadline(e) });
        dueByDay.set(day, list);
      } else {
        timed.push({ title: e.title, start, end });
      }
    }
    const free = findFreeBlocks(events, { now, days: DAYS * PAGES, minMinutes: 30 });
    return { timed, dueByDay, free };
  }, [cal.events, now]);

  const gridHeight = (LAST_HOUR - FIRST_HOUR) * HOUR_PX;
  const hours = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);
  const hasDue = days.some((d) => dueByDay.get(d.toDateString())?.length);
  const lastDay = days[DAYS - 1];

  return (
    <section className="rounded-xl border border-theme-border bg-theme-surface p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Your calendar</h2>
      <p className="mt-1 text-sm text-theme-muted">
        Connect your calendars and we'll find when you're free and what's due, so plans fit your day.
      </p>

      {cal.connected && cal.events && (
        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-semibold">
              {monthDayFormat.format(firstDay)} – {monthDayFormat.format(lastDay)}
            </p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setPage(0)}
                disabled={page === 0}
                className="cursor-pointer rounded-md border border-theme-border bg-transparent px-2.5 py-1 text-sm disabled:cursor-default disabled:opacity-50"
              >
                Today
              </button>
              <button
                type="button"
                aria-label="Previous week"
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 0}
                className="cursor-pointer rounded-md bg-transparent p-1 disabled:cursor-default disabled:opacity-30"
              >
                <ChevronLeft aria-hidden="true" className="size-5" />
              </button>
              <button
                type="button"
                aria-label="Next week"
                onClick={() => setPage((p) => p + 1)}
                disabled={page === PAGES - 1}
                className="cursor-pointer rounded-md bg-transparent p-1 disabled:cursor-default disabled:opacity-30"
              >
                <ChevronRight aria-hidden="true" className="size-5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-theme-border">
            <div className="min-w-[680px]">
              {/* Day headers */}
              <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-b border-theme-border">
                <div />
                {days.map((day) => {
                  const today = sameDay(day, now);
                  return (
                    <div key={day.toISOString()} className="border-l border-theme-border px-2 py-2 text-sm">
                      <span className="text-theme-muted">{weekdayFormat.format(day)} </span>
                      <span
                        className={`inline-flex size-6 items-center justify-center rounded-full font-medium ${
                          today ? "bg-theme-urgent text-white" : ""
                        }`}
                      >
                        {day.getDate()}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Due dates and all-day events */}
              {hasDue && (
                <div className="grid grid-cols-[3rem_repeat(7,1fr)] border-b border-theme-border">
                  <div className="px-1 py-1.5 text-right text-[11px] text-theme-muted">Due</div>
                  {days.map((day) => (
                    <div key={day.toISOString()} className="min-w-0 space-y-1 border-l border-theme-border p-1">
                      {(dueByDay.get(day.toDateString()) ?? []).map((item, i) => (
                        <div
                          key={i}
                          title={item.due ? `${item.title} · due ${timeFormat.format(item.due)}` : item.title}
                          className={`truncate rounded px-1.5 py-0.5 text-xs font-medium ${
                            item.deadline ? "cal-due" : "cal-allday"
                          }`}
                        >
                          {item.title}
                          {item.due && (
                            <span className="ml-1 font-normal opacity-70">{timeFormat.format(item.due)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              )}

              {/* Time grid */}
              <div className="grid grid-cols-[3rem_repeat(7,1fr)]">
                <div className="relative" style={{ height: gridHeight }}>
                  {hours.slice(1).map((h) => (
                    <span
                      key={h}
                      className="absolute right-1.5 -translate-y-1/2 text-[11px] text-theme-muted"
                      style={{ top: (h - FIRST_HOUR) * HOUR_PX }}
                    >
                      {hourFormat.format(new Date(2000, 0, 1, h))}
                    </span>
                  ))}
                </div>
                {days.map((day) => {
                  const dayEnd = addDays(day, 1);
                  const inDay = (x) => x.end > day && x.start < dayEnd;
                  const events = layOut(timed.filter(inDay));
                  const freeHere = free.filter(inDay);
                  const today = sameDay(day, now);
                  return (
                    <div
                      key={day.toISOString()}
                      className="relative border-l border-theme-border"
                      style={{ height: gridHeight }}
                    >
                      {hours.slice(1).map((h) => (
                        <div
                          key={h}
                          className="absolute inset-x-0 border-t border-theme-border opacity-60"
                          style={{ top: (h - FIRST_HOUR) * HOUR_PX }}
                        />
                      ))}

                      {freeHere.map((b) => {
                        const top = offsetOf(b.start, day);
                        const height = offsetOf(b.end, day) - top;
                        if (height < 14) return null;
                        return (
                          <div
                            key={b.start.toISOString()}
                            title={`Free ${timeFormat.format(b.start)}–${timeFormat.format(b.end)}`}
                            className="cal-free absolute inset-x-1 truncate rounded-md px-1.5 py-0.5 text-[11px]"
                            style={{ top: top + 1, height: height - 2 }}
                          >
                            Free · {formatLength(b.minutes)}
                          </div>
                        );
                      })}

                      {events.map((e, i) => {
                        const top = offsetOf(e.start, day);
                        const height = Math.max(offsetOf(e.end, day) - top, 18);
                        const width = 100 / e.lanes;
                        return (
                          <div
                            key={i}
                            title={`${e.title} · ${timeFormat.format(e.start)}–${timeFormat.format(e.end)}`}
                            className={`cal-event absolute overflow-hidden rounded-md px-1.5 py-0.5 text-xs leading-tight ${
                              e.end < now ? "opacity-50" : ""
                            }`}
                            style={{
                              top: top + 1,
                              height: height - 2,
                              left: `calc(${e.lane * width}% + 2px)`,
                              width: `calc(${width}% - 4px)`,
                            }}
                          >
                            <p className="truncate font-medium">{e.title}</p>
                            {height > 34 && <p className="truncate opacity-75">{timeFormat.format(e.start)}</p>}
                          </div>
                        );
                      })}

                      {today && now.getHours() >= FIRST_HOUR && now.getHours() < LAST_HOUR && (
                        <div
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 z-10 h-0.5 bg-theme-urgent"
                          style={{ top: offsetOf(now, day) }}
                        >
                          <span className="absolute -left-1 -top-[3px] size-2 rounded-full bg-theme-urgent" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-4">
        <CalendarConnect />
      </div>
    </section>
  );
}
