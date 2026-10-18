// Google Calendar, straight from the browser: Google Identity Services hands
// us a short-lived access token (no server secret needed), and we call the
// Calendar API with it. Needs VITE_GOOGLE_CLIENT_ID in .env (see README).
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly", // see every calendar's events
  "https://www.googleapis.com/auth/calendar.events", // add study blocks
].join(" ");
const API = "https://www.googleapis.com/calendar/v3";
const TOKEN_KEY = "recap-google-token";
const MAX_CALENDARS = 15;

export const googleConfigured = Boolean(CLIENT_ID);

let gisPromise = null;
function loadGis() {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  gisPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      gisPromise = null;
      reject(new Error("Couldn't load Google sign-in. Check your connection."));
    };
    document.head.append(script);
  });
  return gisPromise;
}

// Tokens last about an hour; keep it for the tab's lifetime only.
export function getStoredToken() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(TOKEN_KEY) ?? "null");
    return saved && saved.expiresAt > Date.now() + 60_000 ? saved.token : null;
  } catch {
    return null;
  }
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

// Opens Google's consent popup. Must be called from a click.
export async function requestGoogleToken() {
  if (!googleConfigured) throw new Error("Google Calendar isn't set up for this app yet.");
  await loadGis();
  return new Promise((resolve, reject) => {
    const client = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: (response) => {
        if (response.error) {
          reject(new Error("Google didn't grant calendar access."));
          return;
        }
        try {
          sessionStorage.setItem(
            TOKEN_KEY,
            JSON.stringify({ token: response.access_token, expiresAt: Date.now() + response.expires_in * 1000 }),
          );
        } catch {
          // ignore — we still return the token for this session
        }
        resolve(response.access_token);
      },
      error_callback: (err) =>
        reject(new Error(err?.type === "popup_closed" ? "Google sign-in was closed." : "Google sign-in failed.")),
    });
    client.requestAccessToken();
  });
}

export function revokeGoogle() {
  const token = getStoredToken();
  clearToken();
  if (token && window.google?.accounts?.oauth2) window.google.accounts.oauth2.revoke(token, () => {});
}

export class GoogleAuthError extends Error {}

async function call(path, token, init = {}, signal) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    signal,
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...init.headers },
  });
  if (res.status === 401) {
    clearToken();
    throw new GoogleAuthError("Your Google sign-in expired. Reconnect to refresh your calendar.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message ?? `Google Calendar request failed (${res.status}).`);
  return data;
}

// "2026-10-20" → local midnight that day (all-day events have no time zone).
function localDate(ymd) {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export async function fetchGoogleEvents(token, from, to, signal) {
  const { items = [] } = await call("/users/me/calendarList?minAccessRole=freeBusyReader", token, {}, signal);
  // Skip calendars the user has hidden, and Google's built-in holiday/birthday ones.
  const calendars = items
    .filter((c) => c.selected !== false && !c.id.includes("#holiday") && !c.id.includes("#contacts"))
    .slice(0, MAX_CALENDARS);

  const query = new URLSearchParams({
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "250",
  });
  const perCalendar = await Promise.all(
    calendars.map((c) =>
      call(`/calendars/${encodeURIComponent(c.id)}/events?${query}`, token, {}, signal)
        .then((data) => data.items ?? [])
        .catch((err) => {
          if (err instanceof GoogleAuthError) throw err;
          return []; // one unreadable calendar shouldn't hide the rest
        }),
    ),
  );

  return perCalendar.flat().flatMap((e) => {
    if (e.status === "cancelled") return [];
    if (e.attendees?.some((a) => a.self && a.responseStatus === "declined")) return [];
    const allDay = Boolean(e.start?.date);
    const start = allDay ? localDate(e.start.date) : new Date(e.start?.dateTime);
    const end = allDay ? localDate(e.end.date) : new Date(e.end?.dateTime ?? e.start?.dateTime);
    if (Number.isNaN(start.getTime())) return [];
    return [{
      title: e.summary ?? "Busy",
      start: start.toISOString(),
      end: end.toISOString(),
      allDay,
      busy: e.transparency !== "transparent",
    }];
  });
}

export function addGoogleEvent(token, { title, description, start, end }) {
  return call("/calendars/primary/events", token, {
    method: "POST",
    body: JSON.stringify({
      summary: title,
      description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }),
  });
}
