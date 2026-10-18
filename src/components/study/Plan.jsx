import { CalendarCheck, CalendarClock, RotateCcw } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCalendar } from "../../hooks/useCalendar";
import { usePlan } from "../../hooks/usePlan";
import { addGoogleEvent, getStoredToken } from "../../lib/googleCalendar";
import { savePlan } from "../../lib/savedPlans";
import { buildIcs, formatDue, formatRange, guessEnergy, nextSession, upcomingDeadlines } from "../../lib/schedule";
import CalendarConnect from "../CalendarConnect";
import { PLAN_DONE_MESSAGES, PLAN_SAVED_MESSAGES, pick } from "../../sprout/messages";
import { useSprout } from "../../sprout/SproutContext";

const MINUTE_OPTIONS = [15, 30, 45, 60];
const ENERGY_OPTIONS = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
];

function progressKey(documentId) {
  return `recap-plan-progress-${documentId}`;
}

function loadProgress(documentId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(progressKey(documentId)) ?? "[]"));
  } catch {
    return new Set();
  }
}

function saveProgress(documentId, done) {
  try {
    localStorage.setItem(progressKey(documentId), JSON.stringify([...done]));
  } catch {
    // ignore
  }
}

function ChipGroup({ options, value, onChange, getLabel = (o) => o }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const id = option.id ?? option;
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(id)}
            className={`rounded-full border px-3 py-1.5 text-sm ${
              selected
                ? "border-accent-dark bg-accent text-white"
                : "border-black/20 hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            }`}
          >
            {getLabel(option)}
          </button>
        );
      })}
    </div>
  );
}

export default function Plan({ documentId, text, fileName }) {
  const { steps, params, status, error, generate, reset } = usePlan({ documentId, text });
  const [saved, setSaved] = useState(false);
  const [minutes, setMinutes] = useState(30);
  const [energy, setEnergy] = useState("medium");
  const [done, setDone] = useState(() => loadProgress(documentId));
  const { say } = useSprout();
  const cal = useCalendar();
  const [showCalendars, setShowCalendars] = useState(false);
  const [slot, setSlot] = useState(null); // the calendar block this plan was made for
  const [addState, setAddState] = useState("idle"); // idle | adding | added | error
  const touchedRef = useRef(false);

  // From the calendar: when they're next free (and for how long), and what's due soonest.
  const session = useMemo(() => (cal.events ? nextSession(cal.events) : null), [cal.events]);
  const deadline = useMemo(() => (cal.events ? upcomingDeadlines(cal.events, { limit: 1 })[0] : null), [cal.events]);

  // Fill in time and energy from the calendar unless they've picked their own.
  useEffect(() => {
    if (!session || touchedRef.current) return;
    setMinutes(session.minutes);
    setEnergy(guessEnergy(session.start));
  }, [session]);

  useEffect(() => setDone(loadProgress(documentId)), [documentId]);

  const minuteOptions =
    session && !MINUTE_OPTIONS.includes(session.minutes)
      ? [...MINUTE_OPTIONS, session.minutes].sort((a, b) => a - b)
      : MINUTE_OPTIONS;
  const usingSession = Boolean(session) && session.minutes === minutes;

  function pickMinutes(value) {
    touchedRef.current = true;
    setMinutes(value);
  }

  function pickEnergy(value) {
    touchedRef.current = true;
    setEnergy(value);
  }

  function handleGenerate() {
    // Only tie the plan to the free block if they kept its length.
    setSlot(usingSession ? session : null);
    setAddState("idle");
    generate(minutes, energy, deadline ? { title: deadline.title, due: formatDue(deadline) } : undefined);
  }

  async function handleAddToCalendar() {
    const event = {
      title: `Study: ${fileName}`,
      description: steps
        .map((step, i) => `${i + 1}. ${step.title}${step.minutes ? ` (~${step.minutes} min)` : ""}`)
        .join("\n"),
      start: slot.start,
      end: slot.end,
    };
    const token = cal.sources.google ? getStoredToken() : null;
    if (!token) {
      // Apple Calendar, Outlook, etc. open a downloaded .ics directly.
      const url = URL.createObjectURL(new Blob([buildIcs(event)], { type: "text/calendar" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "study-session.ics";
      link.click();
      URL.revokeObjectURL(url);
      setAddState("downloaded");
      return;
    }
    setAddState("adding");
    try {
      await addGoogleEvent(token, event);
      setAddState("added");
      cal.refresh();
    } catch {
      setAddState("error");
    }
  }

  function toggle(index) {
    setDone((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      saveProgress(documentId, next);
      if (steps && next.size === steps.length && prev.size !== steps.length) {
        say(pick(PLAN_DONE_MESSAGES), "celebrate");
      }
      return next;
    });
  }

  if (status === "idle" || status === "loading") {
    return (
      <div className="space-y-4">
        {cal.connected ? (
          <div className="rounded-lg border border-theme-border p-3 text-sm">
            {cal.status === "loading" && !cal.events ? (
              <p className="text-theme-muted">Checking your calendar…</p>
            ) : (
              <>
                <p className="flex items-start gap-2">
                  <CalendarClock aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-theme-accent" />
                  {session ? (
                    <span>
                      You're free <strong>{formatRange(session.start, session.end)}</strong>, so we'll plan{" "}
                      {session.minutes} min.
                    </span>
                  ) : (
                    <span>No free time found in the next week.</span>
                  )}
                </p>
                {deadline && (
                  <p className="mt-1 pl-6 text-theme-muted">
                    Next due: <span className="text-theme-text">{deadline.title}</span> · {formatDue(deadline)}
                  </p>
                )}
                {cal.googleNeedsAuth && (
                  <p className="mt-1 pl-6 text-theme-muted">Reconnect Google Calendar to include it.</p>
                )}
              </>
            )}
            <button
              type="button"
              onClick={() => setShowCalendars((open) => !open)}
              className="mt-2 cursor-pointer bg-transparent p-0 pl-6 text-theme-muted underline"
            >
              {showCalendars ? "Hide calendars" : "Manage calendars"}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowCalendars((open) => !open)}
            className="flex cursor-pointer items-center gap-2 bg-transparent p-0 text-sm text-theme-muted underline"
          >
            <CalendarClock aria-hidden="true" className="size-4" />
            Connect your calendar so we pick the time for you
          </button>
        )}
        {showCalendars && <CalendarConnect />}

        <div>
          <p className="mb-2 text-sm font-medium">How much time do you have?</p>
          <ChipGroup options={minuteOptions} value={minutes} onChange={pickMinutes} getLabel={(m) => `${m} min`} />
        </div>
        <div>
          <p className="mb-2 text-sm font-medium">How's your energy right now?</p>
          <ChipGroup options={ENERGY_OPTIONS} value={energy} onChange={pickEnergy} getLabel={(o) => o.label} />
        </div>
        <button
          type="button"
          disabled={status === "loading"}
          onClick={handleGenerate}
          className="w-full rounded-lg border border-accent-dark bg-accent px-3 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === "loading" ? "Building your plan…" : usingSession ? `Plan my ${minutes} min` : "Make my plan"}
        </button>
        {status === "loading" && (
          <div role="status" aria-label="Building your plan" className="animate-pulse space-y-2 motion-reduce:animate-none">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-10 bg-neutral-200 dark:bg-neutral-800" />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="border border-red-700 p-4 dark:border-red-400">
        <p className="text-red-700 dark:text-red-400">{error}</p>
        <button
          type="button"
          className="mt-3 flex cursor-pointer items-center gap-2 border border-black px-3 py-1 dark:border-white"
          onClick={handleGenerate}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Retry
        </button>
      </div>
    );
  }

  const doneCount = steps.filter((_, i) => done.has(i)).length;

  function handleSave() {
    savePlan({
      fileName,
      minutes: params.minutes,
      energy: params.energy,
      steps,
      done: [...done],
    });
    setSaved(true);
    say(pick(PLAN_SAVED_MESSAGES), "happy");
  }

  function handleReset() {
    setSaved(false);
    setSlot(null);
    reset();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-600 dark:text-neutral-300">
          {params.minutes} min · {ENERGY_OPTIONS.find((o) => o.id === params.energy)?.label ?? params.energy} energy ·{" "}
          {doneCount}/{steps.length} done
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={saved}
            onClick={handleSave}
            className="cursor-pointer rounded-lg border border-accent-dark bg-accent px-3 py-1 text-sm text-white disabled:cursor-default disabled:opacity-60"
          >
            {saved ? "Saved ✓" : "Save plan"}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="cursor-pointer bg-transparent p-0 text-sm font-medium text-accent-dark underline dark:text-accent"
          >
            Make a new plan
          </button>
        </div>
      </div>

      {slot && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-theme-border p-3 text-sm">
          <span className="flex items-center gap-2">
            <CalendarClock aria-hidden="true" className="size-4 text-theme-accent" />
            {formatRange(slot.start, slot.end)}
          </span>
          {addState === "added" || addState === "downloaded" ? (
            <span className="flex items-center gap-1.5 text-theme-action">
              <CalendarCheck aria-hidden="true" className="size-4" />
              {addState === "added" ? "Added to Google Calendar" : "Calendar file downloaded"}
            </span>
          ) : (
            <button
              type="button"
              disabled={addState === "adding"}
              onClick={handleAddToCalendar}
              className="cursor-pointer rounded-lg border border-theme-border bg-transparent px-3 py-1 text-theme-text disabled:opacity-60"
            >
              {addState === "adding" ? "Adding…" : addState === "error" ? "Couldn't add, retry" : "Add to my calendar"}
            </button>
          )}
        </div>
      )}

      <ol className="space-y-2">
        {steps.map((step, i) => (
          <li key={i}>
            <label
              className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 ${
                done.has(i)
                  ? "border-black/10 bg-black/[0.02] opacity-60 dark:border-white/10 dark:bg-white/[0.03]"
                  : "border-black/20 dark:border-white/20"
              }`}
            >
              <input
                type="checkbox"
                checked={done.has(i)}
                onChange={() => toggle(i)}
                className="mt-1 size-4 shrink-0 accent-[var(--color-accent)]"
              />
              <div className="min-w-0">
                <p className={`font-medium ${done.has(i) ? "line-through" : ""}`}>
                  {step.title}
                  {step.minutes ? (
                    <span className="ml-2 text-xs font-normal text-neutral-500">~{step.minutes} min</span>
                  ) : null}
                </p>
                <p className="mt-0.5 text-sm text-neutral-600 dark:text-neutral-300">{step.instruction}</p>
              </div>
            </label>
          </li>
        ))}
      </ol>
    </div>
  );
}
