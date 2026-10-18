import { lookup } from "dns/promises";
import net from "net";
import ical from "node-ical";
import { ApiError } from "./gemini.js";

// Reads any calendar that publishes an iCalendar (.ics) subscription link:
// Apple/iCloud public calendars, Outlook "publish calendar" links, Canvas's
// calendar feed, Google's "secret address in iCal format", etc. The browser
// can't fetch these itself (no CORS), so the server does it.

const MAX_BYTES = 5_000_000;
const MAX_REDIRECTS = 3;
const MAX_RANGE_DAYS = 31;

function normalizeUrl(raw) {
  if (typeof raw !== "string" || !raw.trim() || raw.length > 2000) {
    throw new ApiError(400, "Paste a calendar link (it usually starts with webcal:// or https://).");
  }
  let url;
  try {
    url = new URL(raw.trim().replace(/^webcals?:\/\//i, "https://"));
  } catch {
    throw new ApiError(400, "That doesn't look like a calendar link.");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new ApiError(400, "Calendar links need to start with webcal://, https:// or http://.");
  }
  return url;
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127)
    );
  }
  const v6 = address.toLowerCase();
  if (v6.startsWith("::ffff:")) return isPrivateAddress(v6.slice(7));
  return v6 === "::1" || v6 === "::" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

// Only fetch public hosts, so a pasted link can't make the server poke at
// its own network.
async function assertPublicHost(hostname) {
  let addresses;
  try {
    addresses = await lookup(hostname, { all: true });
  } catch {
    throw new ApiError(400, "Couldn't find that calendar's server. Check the link.");
  }
  if (addresses.some(({ address }) => isPrivateAddress(address))) {
    throw new ApiError(400, "That calendar link points to a private address.");
  }
}

async function download(url, signal) {
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url.hostname);
    const res = await fetch(url, { redirect: "manual", signal, headers: { Accept: "text/calendar, */*" } });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = normalizeUrl(new URL(res.headers.get("location"), url).href);
      continue;
    }
    if (!res.ok) {
      throw new ApiError(400, `The calendar server said no (${res.status}). Make sure the calendar is shared publicly.`);
    }
    if (Number(res.headers.get("content-length")) > MAX_BYTES) {
      throw new ApiError(400, "That calendar is too large to read.");
    }
    const text = await res.text();
    if (text.length > MAX_BYTES) throw new ApiError(400, "That calendar is too large to read.");
    if (!text.includes("BEGIN:VCALENDAR")) {
      throw new ApiError(400, "That link didn't return a calendar. Use the subscription (.ics / webcal) link.");
    }
    return text;
  }
  throw new ApiError(400, "That calendar link redirects too many times.");
}

export async function readIcsCalendar({ url: rawUrl, from, to, signal }) {
  const url = normalizeUrl(rawUrl);
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    throw new ApiError(400, "Invalid date range.");
  }
  if (end - start > MAX_RANGE_DAYS * 86_400_000) throw new ApiError(400, "Date range is too long.");

  const text = await download(url, signal);
  let parsed;
  try {
    parsed = ical.sync.parseICS(text);
  } catch {
    throw new ApiError(400, "Couldn't read that calendar file.");
  }

  const calendarName =
    Object.values(parsed).find((c) => c?.type === "VCALENDAR")?.["WR-CALNAME"] ?? null;
  const events = [];
  for (const item of Object.values(parsed)) {
    if (item?.type !== "VEVENT" || item.status === "CANCELLED") continue;
    let instances;
    try {
      instances = ical.expandRecurringEvent(item, { from: start, to: end, expandOngoing: true });
    } catch {
      continue; // one malformed event shouldn't sink the whole calendar
    }
    for (const instance of instances) {
      const title = String(instance.summary?.val ?? instance.summary ?? "Busy");
      const eventStart = new Date(instance.start);
      const eventEnd = new Date(instance.end ?? instance.start);
      events.push({
        title,
        start: eventStart.toISOString(),
        end: eventEnd.toISOString(),
        allDay: Boolean(instance.isFullDay),
        // "Free" (transparent) events don't block time.
        busy: item.transparency !== "TRANSPARENT",
        // Canvas's feed marks assignments in the uid ("event-assignment-123")
        // and link, whatever the title says ("Week 3 Self Reflection").
        deadline: /assignment/i.test(`${item.uid ?? ""} ${item.url?.val ?? item.url ?? ""}`),
      });
    }
  }
  events.sort((a, b) => a.start.localeCompare(b.start));
  return { name: typeof calendarName === "string" ? calendarName : null, events: events.slice(0, 2000) };
}
