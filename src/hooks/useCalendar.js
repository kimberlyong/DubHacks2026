import { useCallback, useEffect, useSyncExternalStore } from "react";
import { fetchIcsCalendar } from "../api/client";
import {
  GoogleAuthError,
  fetchGoogleEvents,
  getStoredToken,
  googleConfigured,
  requestGoogleToken,
  revokeGoogle,
} from "../lib/googleCalendar";

// Every connected calendar, merged into one list of events for the next two
// weeks. Shared module-level state, so the Plan tool and the Plans page see
// the same thing without refetching. Which calendars are connected is saved
// locally; Google's token only lives for the tab (see googleCalendar.js).
const SOURCES_KEY = "recap-calendars";
const RANGE_DAYS = 14;
const STALE_MS = 5 * 60_000;

function loadSources() {
  try {
    const saved = JSON.parse(localStorage.getItem(SOURCES_KEY) ?? "{}");
    return { google: Boolean(saved.google), links: Array.isArray(saved.links) ? saved.links : [] };
  } catch {
    return { google: false, links: [] };
  }
}

function saveSources(sources) {
  try {
    localStorage.setItem(SOURCES_KEY, JSON.stringify(sources));
  } catch {
    // best-effort
  }
}

let state = {
  sources: loadSources(),
  events: null,
  status: "idle", // idle | loading | ready
  errors: {}, // source id ("google" or link id) -> message
  googleNeedsAuth: false,
  loadedAt: 0,
};
const listeners = new Set();

function setState(patch) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function range() {
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + RANGE_DAYS);
  return { from, to };
}

let loadId = 0;
async function load() {
  const id = ++loadId;
  const { sources } = state;
  if (!sources.google && sources.links.length === 0) {
    setState({ events: [], status: "ready", errors: {}, googleNeedsAuth: false, loadedAt: Date.now() });
    return;
  }
  setState({ status: "loading" });
  const { from, to } = range();
  const errors = {};
  let googleNeedsAuth = false;

  const jobs = sources.links.map((link) =>
    fetchIcsCalendar({ url: link.url, from: from.toISOString(), to: to.toISOString() })
      .then((r) => r.events)
      .catch((err) => {
        errors[link.id] = err.message;
        return [];
      }),
  );
  if (sources.google) {
    const token = getStoredToken();
    if (!token) {
      googleNeedsAuth = true;
    } else {
      jobs.push(
        fetchGoogleEvents(token, from, to).catch((err) => {
          if (err instanceof GoogleAuthError) googleNeedsAuth = true;
          else errors.google = err.message;
          return [];
        }),
      );
    }
  }

  const events = (await Promise.all(jobs)).flat().sort((a, b) => a.start.localeCompare(b.start));
  if (id !== loadId) return; // a newer load started meanwhile
  setState({ events, status: "ready", errors, googleNeedsAuth, loadedAt: Date.now() });
}

function updateSources(sources) {
  saveSources(sources);
  setState({ sources });
  return load();
}

export function useCalendar() {
  const snapshot = useSyncExternalStore(subscribe, () => state);

  useEffect(() => {
    if (state.status !== "loading" && Date.now() - state.loadedAt > STALE_MS) load();
  }, []);

  const connectGoogle = useCallback(async () => {
    await requestGoogleToken();
    await updateSources({ ...state.sources, google: true });
  }, []);

  const disconnectGoogle = useCallback(() => {
    revokeGoogle();
    return updateSources({ ...state.sources, google: false });
  }, []);

  // Checks the link works before saving it, and names it after the calendar.
  const addLink = useCallback(async (url) => {
    const { from, to } = range();
    const result = await fetchIcsCalendar({ url, from: from.toISOString(), to: to.toISOString() });
    const link = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      url: url.trim(),
      name: result.name || guessName(url),
    };
    // We already have this calendar's events, so merge them in rather than
    // refetching everything.
    const sources = { ...state.sources, links: [...state.sources.links, link] };
    if (state.status === "loading" || !state.events) {
      await updateSources(sources); // a load in flight wouldn't know about this link
      return;
    }
    saveSources(sources);
    setState({
      sources,
      status: "ready",
      events: [...(state.events ?? []), ...result.events].sort((a, b) => a.start.localeCompare(b.start)),
      loadedAt: Date.now(),
    });
  }, []);

  const removeLink = useCallback(
    (id) => updateSources({ ...state.sources, links: state.sources.links.filter((l) => l.id !== id) }),
    [],
  );

  const { sources } = snapshot;
  return {
    ...snapshot,
    connected: sources.google || sources.links.length > 0,
    googleConfigured,
    connectGoogle,
    disconnectGoogle,
    addLink,
    removeLink,
    refresh: load,
  };
}

function guessName(url) {
  const host = (() => {
    try {
      return new URL(url.replace(/^webcals?:/i, "https:")).hostname;
    } catch {
      return "";
    }
  })();
  if (host.includes("icloud")) return "Apple Calendar";
  if (host.includes("outlook") || host.includes("office365") || host.includes("live.com")) return "Outlook";
  if (host.includes("google")) return "Google Calendar";
  if (host.includes("instructure") || host.includes("canvas")) return "Canvas";
  return host || "Calendar";
}
