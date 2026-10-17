import { Check, LogOut, Palette, Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import DocumentViewer from "./components/DocumentViewer";
import ExtensionBanner from "./components/ExtensionBanner";
import Homepage from "./components/Homepage";
import PrivacyNote from "./components/PrivacyNote";
import StudyHistory from "./components/StudyHistory";
import StudyPanel from "./components/StudyPanel";
import UploadArea from "./components/UploadArea";
import { useDocument } from "./hooks/useDocument";
import { useFaceRecovery } from "./hooks/useFaceRecovery";
import { getHistory } from "./lib/studyHistory";
import Sprout, { SproutArt } from "./sprout/Sprout";
import { useSprout } from "./sprout/SproutContext";

const textSizes = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
};

const themes = [
  { id: "sand", label: "Oat & peach", swatch: ["#f7f1e8", "#df8a65"] },
  { id: "blush", label: "Rose", swatch: ["#f8ece9", "#d9788a"] },
  { id: "mauve", label: "Lavender", swatch: ["#f3eef6", "#9c7bc4"] },
  { id: "sky", label: "Sky", swatch: ["#eef4f7", "#5b98bf"] },
  { id: "dusk", label: "Cozy night", swatch: ["#211a17", "#f0a07c"] },
  { id: "mist", label: "High contrast", swatch: ["#ffffff", "#000000"] },
];

function getSavedTheme() {
  const savedTheme = localStorage.getItem("recap-theme");
  if (themes.some(({ id }) => id === savedTheme)) return savedTheme;
  if (savedTheme === "dark") return "dusk";
  return "sand";
}

function getSavedTextSize() {
  const savedSize = localStorage.getItem("recap-size");
  return Object.hasOwn(textSizes, savedSize) ? savedSize : "medium";
}

// A visitor has one of three views. Signed-in users (name already saved, or
// the Canvas extension just handed off a page) skip straight to the app;
// the homepage and sign-in step are only for a first-time visit.
function getInitialView() {
  const hasExtractParam = new URL(window.location.href).searchParams.has("extract");
  const hasName = Boolean(localStorage.getItem("recap-name"));
  return hasExtractParam || hasName ? "app" : "home";
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function App() {
  const [view, setView] = useState(getInitialView);
  const [name, setName] = useState(() => localStorage.getItem("recap-name") ?? "");
  const [nameInput, setNameInput] = useState("");
  const [theme, setTheme] = useState(getSavedTheme);
  const [textSize, setTextSize] = useState(getSavedTextSize);
  const studyDoc = useDocument();
  const [extractError, setExtractError] = useState(null);
  const [menu, setMenu] = useState(null); // "theme" | "settings" | null
  const menuRef = useRef(null);
  const [history, setHistory] = useState(getHistory);
  const { say } = useSprout();
  const justExtractedRef = useRef(false);
  const [studyMode, setStudyMode] = useState(null);

  // Camera-based focus check-ins. Runs entirely in the browser (no frame is
  // ever uploaded); Sprout is the only thing that reacts: a quiet nudge
  // while attention has drifted, and a warmer welcome once they're back.
  const { enabled: cameraEnabled, setEnabled: setCameraEnabled, status: cameraStatus, error: cameraError } =
    useFaceRecovery({
      onDistracted: () => say("Hey, I'm here whenever you're ready to come back. 👀", "nudge"),
      onReturn: () => say("Welcome back! Let's pick up where you left off. 🌱", "happy"),
    });

  useEffect(() => {
    function handlePointerDown(event) {
      if (!menuRef.current?.contains(event.target)) setMenu(null);
    }
    function handleKeyDown(event) {
      if (event.key === "Escape") setMenu(null);
    }
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  function handleSignIn(event) {
    event.preventDefault();
    const trimmedName = nameInput.trim();
    if (!trimmedName) return;
    setName(trimmedName);
    localStorage.setItem("recap-name", trimmedName);
    setView("app");
  }

  function handleSignOut() {
    setMenu(null);
    setName("");
    setNameInput("");
    studyDoc.remove();
    localStorage.removeItem("recap-name");
    setCameraEnabled(false);
    setView("home");
  }

  function handleThemeChange(nextTheme) {
    setTheme(nextTheme);
    localStorage.setItem("recap-theme", nextTheme);
  }

  function handleTextSizeChange(nextSize) {
    setTextSize(nextSize);
    localStorage.setItem("recap-size", nextSize);
  }

  async function handleSelectFile(file) {
    setStudyMode(null);
    await studyDoc.upload(file);
    setHistory(getHistory());
  }

  function handleCloseDocument() {
    studyDoc.remove();
    setStudyMode(null);
    setHistory(getHistory());
  }

  function handleResumeHistory(entry) {
    setStudyMode(null);
    studyDoc.loadText(entry.text, entry.fileName, entry.source);
  }

  // Let Sprout react when a document is ready, worded differently when it
  // came in via the Canvas extension (see justExtractedRef, set below).
  useEffect(() => {
    if (studyDoc.status !== "ready") return;
    setHistory(getHistory());
    if (justExtractedRef.current) {
      justExtractedRef.current = false;
      say("Nice, I grabbed that for you! Ready when you are. ✨", "happy");
    } else {
      say("Got it! Let's break this down together. 🌱", "happy");
    }
  }, [studyDoc.documentId, studyDoc.status, say]);

  // Pick up content handed off by the Canvas extension: it opens this app
  // with ?extract=<id>, and the text is waiting at /api/extract/:id.
  useEffect(() => {
    const url = new URL(window.location.href);
    const id = url.searchParams.get("extract");
    if (!id) return;
    url.searchParams.delete("extract");
    window.history.replaceState({}, "", url);

    (async () => {
      try {
        const res = await fetch(`/api/extract/${encodeURIComponent(id)}`);
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "That page couldn't be loaded. Try extracting it again.");
        if (!localStorage.getItem("recap-name")) {
          setName("there");
          localStorage.setItem("recap-name", "there");
        }
        setView("app");
        justExtractedRef.current = true;
        studyDoc.loadText(data.text, data.fileName, "extension");
      } catch (err) {
        setView("app");
        setExtractError(err.message);
      }
    })();
    // Runs once on mount; studyDoc.loadText is stable (useCallback).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ready = studyDoc.status === "ready";
  // Upload errors show inside the upload card; this is for the extension handoff.
  const error = extractError;
  const iconButton =
    "flex size-10 cursor-pointer items-center justify-center rounded-full text-theme-muted hover:bg-theme-surface hover:text-theme-text hover:shadow-sm";

  return (
    <div data-theme={theme} className={`app-canvas min-h-screen ${textSizes[textSize]}`}>
      <div className={`mx-auto flex min-h-screen w-full flex-col px-4 sm:px-6 ${ready && view === "app" ? "max-w-7xl" : "max-w-6xl"}`}>
        <header className="flex items-center justify-between py-4">
          <button
            type="button"
            onClick={() => setView(name ? "app" : "home")}
            className="flex cursor-pointer items-center gap-2 bg-transparent p-0 text-inherit"
            aria-label="Recap home"
          >
            <SproutArt className="size-10" />
            <span className="font-display text-2xl font-semibold tracking-tight">Recap</span>
          </button>

          <div ref={menuRef} className="flex items-center gap-1">
            <div className="relative">
              <button
                type="button"
                aria-label="Color theme"
                title="Color theme"
                aria-expanded={menu === "theme"}
                onClick={() => setMenu((m) => (m === "theme" ? null : "theme"))}
                className={iconButton}
              >
                <Palette aria-hidden="true" className="size-5" />
              </button>
              {menu === "theme" && (
                <div className="cozy-pop animate-bubble-in absolute right-0 top-full z-30 mt-2 w-60 p-2">
                  <p className="px-2 pb-1 pt-1 text-xs font-medium uppercase tracking-wide text-theme-muted">Theme</p>
                  {themes.map(({ id, label, swatch }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleThemeChange(id)}
                      aria-pressed={theme === id}
                      className="flex w-full cursor-pointer items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-theme-surface-2"
                    >
                      <span
                        aria-hidden="true"
                        className="size-6 shrink-0 rounded-full ring-1 ring-black/10"
                        style={{ background: `linear-gradient(135deg, ${swatch[0]} 50%, ${swatch[1]} 50%)` }}
                      />
                      <span className="flex-1">{label}</span>
                      {theme === id && <Check aria-hidden="true" className="size-4 text-theme-accent" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {view === "app" ? (
              <div className="relative">
                <button
                  type="button"
                  aria-label="Settings"
                  title="Settings"
                  aria-expanded={menu === "settings"}
                  onClick={() => setMenu((m) => (m === "settings" ? null : "settings"))}
                  className={iconButton}
                >
                  <Settings aria-hidden="true" className="size-5" />
                </button>
                {menu === "settings" && (
                  <div className="cozy-pop animate-bubble-in absolute right-0 top-full z-30 mt-2 w-72 p-4">
                    <p className="font-display text-lg font-semibold">Hi, {name}</p>

                    <p className="mt-4 text-sm font-medium">Text size</p>
                    <div className="mt-2 flex gap-1 rounded-full bg-theme-surface-2 p-1">
                      {Object.keys(textSizes).map((option) => (
                        <button
                          key={option}
                          type="button"
                          aria-pressed={textSize === option}
                          onClick={() => handleTextSizeChange(option)}
                          className={`flex-1 cursor-pointer rounded-full px-2 py-1 text-sm capitalize ${
                            textSize === option ? "bg-theme-surface font-medium shadow-sm" : "text-theme-muted"
                          }`}
                        >
                          {option}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium">Focus check-ins</p>
                        <p className="text-xs text-theme-muted">
                          {cameraEnabled ? cameraStatus : "Sprout uses your camera to notice when you drift. Stays on your device."}
                        </p>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={cameraEnabled}
                        aria-label="Focus check-ins"
                        onClick={() => setCameraEnabled((on) => !on)}
                        className={`relative mt-0.5 h-6 w-11 shrink-0 cursor-pointer rounded-full ${
                          cameraEnabled ? "bg-theme-accent" : "bg-theme-border"
                        }`}
                      >
                        <span
                          className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
                            cameraEnabled ? "left-5.5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </div>
                    {cameraError && <p className="mt-1 text-xs text-theme-urgent">{cameraError}</p>}

                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-theme-surface-2 py-2 text-sm hover:bg-theme-accent-soft"
                    >
                      <LogOut aria-hidden="true" className="size-4" />
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              view === "home" && (
                <button
                  type="button"
                  onClick={() => setView("signin")}
                  className="ml-1 cursor-pointer rounded-full px-4 py-2 font-medium hover:bg-theme-surface hover:shadow-sm"
                >
                  Sign in
                </button>
              )
            )}
          </div>
        </header>

        <main className="flex-1 pb-28">
          {view === "home" && <Homepage onGetStarted={() => setView("signin")} />}

          {view === "signin" && (
            <section className="mx-auto max-w-md py-10 sm:py-16">
              <div className="cozy-card p-8 text-center">
                <SproutArt mood="happy" className="mx-auto size-28 animate-sprout-bob" />
                <h1 className="mt-4 font-display text-3xl font-semibold">Hi there!</h1>
                <p className="mt-2 text-theme-muted">I'm Sprout. What should I call you?</p>
                <form onSubmit={handleSignIn} className="mt-6 text-left">
                  <label className="sr-only" htmlFor="name-input">
                    Your name
                  </label>
                  <input
                    id="name-input"
                    name="name"
                    type="text"
                    placeholder="Your first name"
                    autoComplete="given-name"
                    maxLength={60}
                    required
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    className="w-full rounded-full border border-theme-border bg-theme-surface-2 px-5 py-3 text-theme-text placeholder:text-theme-muted focus:bg-theme-surface"
                  />
                  <button
                    className="mt-3 w-full cursor-pointer rounded-full bg-theme-accent px-5 py-3 font-medium text-theme-on-accent shadow-sm hover:-translate-y-0.5 hover:shadow-md"
                    type="submit"
                  >
                    Let's go
                  </button>
                </form>
              </div>
              <PrivacyNote />
            </section>
          )}

          {view === "app" && (
            <>
              {error && (
                <p role="alert" className="mb-5 rounded-2xl bg-theme-urgent-t px-5 py-3 text-theme-urgent">
                  {error}
                </p>
              )}

              {ready ? (
                <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] lg:items-start">
                  <DocumentViewer
                    file={studyDoc.file}
                    text={studyDoc.text}
                    onReplace={handleSelectFile}
                    onRemove={handleCloseDocument}
                  />
                  <StudyPanel
                    key={studyDoc.documentId}
                    documentId={studyDoc.documentId}
                    text={studyDoc.text}
                    mode={studyMode}
                    onModeChange={setStudyMode}
                  />
                </div>
              ) : (
                <>
                  <section className="pb-8 pt-4 sm:pt-8">
                    <h1 className="font-display text-4xl font-semibold tracking-tight sm:text-5xl">
                      {greeting()}, {name}.
                    </h1>
                    <p className="mt-2 text-lg text-theme-muted">What are we reading today?</p>
                  </section>
                  <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:items-start">
                    <div className="cozy-card p-4 sm:p-5">
                      <UploadArea
                        file={studyDoc.file}
                        status={studyDoc.status}
                        error={studyDoc.status === "error" ? studyDoc.error : null}
                        onSelect={handleSelectFile}
                      />
                    </div>
                    <div className="space-y-6">
                      <StudyHistory entries={history} onResume={handleResumeHistory} />
                      <ExtensionBanner />
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>
      {view === "app" && <Sprout />}
    </div>
  );
}

export default App;
