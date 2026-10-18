// Turns calendar events (from any connected source, see useCalendar) into
// "when should I study, for how long, and what's due" — so the student
// doesn't have to say it themselves.

const MINUTE = 60_000;
const DEFAULT_DAY_START = 9; // don't suggest studying before 9am…
const DEFAULT_DAY_END = 22; // …or after 10pm
const MIN_SESSION = 15;
const MAX_SESSION = 60;

// Titles that read like something due rather than time that's taken.
const DEADLINE_RE =
  /\b(due|deadline|assignment|homework|hw ?\d*|p-?set|problem set|quiz|exam|midterm|final|project|essay|paper|lab report|submission|submit)\b/i;

export function isDeadline(event) {
  return Boolean(event.deadline) || DEADLINE_RE.test(event.title ?? "");
}

// Whether an event actually takes up time. Canvas-style due dates (all-day,
// or zero-length at 11:59pm) mark a deadline, not a busy slot.
function blocksTime(event) {
  if (!event.busy || event.allDay) return false;
  const length = new Date(event.end) - new Date(event.start);
  return !(isDeadline(event) && length <= 30 * MINUTE);
}

function roundUpTo5(date) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  d.setMinutes(Math.ceil(d.getMinutes() / 5) * 5);
  return d;
}

function atHour(day, hour) {
  const d = new Date(day);
  d.setHours(hour, 0, 0, 0);
  return d;
}

// Gaps between busy events inside each day's study window, from now on.
export function findFreeBlocks(
  events,
  { now = new Date(), days = 7, dayStart = DEFAULT_DAY_START, dayEnd = DEFAULT_DAY_END, minMinutes = MIN_SESSION } = {},
) {
  const busy = events
    .filter(blocksTime)
    .map((e) => [new Date(e.start).getTime(), new Date(e.end).getTime()])
    .sort((a, b) => a[0] - b[0]);

  const blocks = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(now);
    day.setDate(day.getDate() + i);
    const windowStart = Math.max(atHour(day, dayStart).getTime(), roundUpTo5(now).getTime());
    const windowEnd = atHour(day, dayEnd).getTime();
    if (windowStart >= windowEnd) continue;

    let cursor = windowStart;
    for (const [start, end] of busy) {
      if (end <= cursor || start >= windowEnd) continue;
      if (start > cursor) blocks.push([cursor, start]);
      cursor = Math.max(cursor, end);
      if (cursor >= windowEnd) break;
    }
    if (cursor < windowEnd) blocks.push([cursor, windowEnd]);
  }

  return blocks
    .map(([start, end]) => ({ start: new Date(start), end: new Date(end), minutes: Math.floor((end - start) / MINUTE) }))
    .filter((b) => b.minutes >= minMinutes);
}

// The next free block, trimmed to a sensible study session length.
export function nextSession(events, options) {
  const block = findFreeBlocks(events, options)[0];
  if (!block) return null;
  const minutes = Math.max(MIN_SESSION, Math.floor(Math.min(block.minutes, MAX_SESSION) / 5) * 5);
  return { start: block.start, end: new Date(block.start.getTime() + minutes * MINUTE), minutes };
}

export function upcomingDeadlines(events, { now = new Date(), days = 14, limit = 5 } = {}) {
  const horizon = now.getTime() + days * 24 * 60 * MINUTE;
  const seen = new Set();
  return events
    .filter(isDeadline)
    .map((e) => ({ title: e.title, due: new Date(e.allDay ? e.start : e.end), allDay: e.allDay }))
    .filter(({ due }) => due.getTime() >= now.getTime() - (24 * 60 - 1) * MINUTE && due.getTime() <= horizon)
    .sort((a, b) => a.due - b.due)
    .filter(({ title, due }) => {
      const key = `${title}|${due.toDateString()}`;
      if (seen.has(key)) return false; // same deadline in two calendars
      seen.add(key);
      return true;
    })
    .slice(0, limit);
}

// A gentle default for the energy question: sharper in the morning, softer late.
export function guessEnergy(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "high";
  if (hour < 18) return "medium";
  return "low";
}

const timeFormat = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" });
const dayFormat = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });

export function formatDay(date, now = new Date()) {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const that = new Date(date);
  that.setHours(0, 0, 0, 0);
  const diff = Math.round((that - today) / (24 * 60 * MINUTE));
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  return dayFormat.format(date);
}

export function formatRange(start, end) {
  return `${formatDay(start)} ${timeFormat.format(start)}–${timeFormat.format(end)}`;
}

export function formatDue({ due, allDay }) {
  return allDay ? formatDay(due) : `${formatDay(due)} ${timeFormat.format(due)}`;
}

// A one-event .ics file, for Apple Calendar / Outlook / anything without an API.
export function buildIcs({ title, description, start, end }) {
  const stamp = (d) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const escape = (s) => String(s).replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/([,;])/g, "\\$1");
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Clarity//Study plan//EN",
    "BEGIN:VEVENT",
    `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@clarity`,
    `DTSTAMP:${stamp(new Date())}`,
    `DTSTART:${stamp(start)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(title)}`,
    `DESCRIPTION:${escape(description)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}
