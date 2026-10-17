import { Settings } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ExtensionBanner from "./components/ExtensionBanner";
import Homepage from "./components/Homepage";
import PrivacyNote from "./components/PrivacyNote";
import DocumentViewer from "./components/DocumentViewer";
import GamePage from "./components/game/GamePage";
import SavedPlans from "./components/SavedPlans";
import StudyPanel from "./components/StudyPanel";
import CameraRecovery from "./components/CameraRecovery";
import UploadArea from "./components/UploadArea";
import { useDocument } from "./hooks/useDocument";
import { getHistory, relativeTime } from "./lib/studyHistory";
import Sprout from "./sprout/Sprout";
import { useSprout } from "./sprout/SproutContext";

const textSizes = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
};

const themes = [
  { id: "sand", label: "Warm" },
  { id: "mauve", label: "Purple" },
  { id: "sky", label: "Blue" },
  { id: "dusk", label: "Dark" },
  { id: "mist", label: "Black & white" },
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
// the Canvas extension just handed off a page) skip straight to the app —
// the homepage and sign-in step are only for a first-time visit.
function getInitialView() {
  const hasExtractParam = new URL(window.location.href).searchParams.has("extract");
  const hasName = Boolean(localStorage.getItem("recap-name"));
  return hasExtractParam || hasName ? "app" : "home";
}

function App() {
  const [view, setView] = useState(getInitialView);
  const [name, setName] = useState(() => localStorage.getItem("recap-name") ?? "");
  const [nameInput, setNameInput] = useState("");
  const [theme, setTheme] = useState(getSavedTheme);
  const [textSize, setTextSize] = useState(getSavedTextSize);
  const studyDoc = useDocument();
  const [extractError, setExtractError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const [history, setHistory] = useState(getHistory);
  const { say } = useSprout();
  const justExtractedRef = useRef(false);
  const [navOpen, setNavOpen] = useState(false);
  const navRef = useRef(null);
  const [page, setPage] = useState("study");
  const [studyMode, setStudyMode] = useState(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!settingsRef.current?.contains(event.target)) {
        setSettingsOpen(false);
      }
      if (!navRef.current?.contains(event.target)) {
        setNavOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        setNavOpen(false);
      }
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
    if (!trimmedName) {
      return;
    }

    setName(trimmedName);
    localStorage.setItem("recap-name", trimmedName);
    setView("app");
  }

  function handleSignOut() {
    setName("");
    setNameInput("");
    handleRemoveFile();
    localStorage.removeItem("recap-name");
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
    await studyDoc.upload(file);
    setHistory(getHistory());
  }

  function handleRemoveFile() {
    studyDoc.remove();
  }

  // Open the panel as soon as a document finishes extracting, and let
  // Sprout say something about it — worded differently when it came in via
  // the Canvas extension (see justExtractedRef, set below).
  useEffect(() => {
    if (studyDoc.status !== "ready") return;
    setHistory(getHistory());
    if (justExtractedRef.current) {
      justExtractedRef.current = false;
      say("Nice, I grabbed that for you! Ready when you are. ✨", "happy");
    } else {
      say("Got it — let's break this down. 🌱", "happy");
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
        if (!res.ok) throw new Error(data.error ?? "That extracted page could not be loaded.");
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

  function handleResumeHistory(entry) {
    setPage("study");
    studyDoc.loadText(entry.text, entry.fileName, entry.source);
  }

  const ready = studyDoc.status === "ready";

  function navigate(target) {
    setNavOpen(false);
    if (target === "history") {
      setHistory(getHistory());
      setPage("history");
      return;
    }
    if (target === "plans" || target === "game") {
      setPage(target);
      return;
    }
    setPage("study");
    // "home" = the Welcome page: upload + past files, no document or tool open
    if (target === "home") {
      handleRemoveFile();
      setHistory(getHistory());
      setStudyMode(null);
      return;
    }
    setStudyMode(target);
  }

  const navItems = [
    { id: "home", label: "Home", needsDoc: false },
    { id: "flashcards", label: "Flashcards", needsDoc: true },
    { id: "ask", label: "Chatbot", needsDoc: true },
    { id: "game", label: "Game", needsDoc: true },
    { id: "plans", label: "Plans", needsDoc: false },
    { id: "history", label: "Past documents", needsDoc: false },
  ];

  const today = new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date());

  return (
    <div
      data-theme={theme}
      className={`min-h-screen bg-theme-bg text-theme-text ${textSizes[textSize]}`}
    >
      <div
        className={`app-shell mx-auto flex min-h-screen w-full flex-col px-6 ${studyDoc.status === "ready" && (view === "app" || name) ? "max-w-7xl" : "max-w-4xl"}`}
      >
        <header className="site-header flex min-h-16 items-center justify-between border-b border-theme-border">
          <div className="flex items-center gap-4">
            {view === "app" && (
              <div className="relative" ref={navRef}>
                <button
                  type="button"
                  aria-label="Navigation menu"
                  aria-expanded={navOpen}
                  aria-controls="nav-menu"
                  onClick={() => setNavOpen((open) => !open)}
                  className="flex h-9 w-9 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-black bg-transparent dark:border-white"
                >
                  <span className="h-0.5 w-5 bg-current" />
                  <span className="h-0.5 w-5 bg-current" />
                  <span className="h-0.5 w-5 bg-current" />
                </button>
                {navOpen && (
                  <nav
                    id="nav-menu"
                    aria-label="Pages"
                    className="absolute left-0 top-full z-10 mt-2 w-56 rounded-xl border border-theme-border bg-theme-surface p-2 text-theme-text"
                  >
                    {navItems.map((item) => {
                      const disabled = item.needsDoc && !ready;
                      const active =
                        item.id === "history" || item.id === "plans" || item.id === "game"
                          ? page === item.id
                          : page === "study" && (item.id === "home" ? !studyMode : studyMode === item.id);
                      return (
                        <button
                          key={item.id}
                          type="button"
                          disabled={disabled}
                          title={disabled ? "Upload a document first" : undefined}
                          aria-current={active ? "page" : undefined}
                          onClick={() => navigate(item.id)}
                          className={`block w-full rounded-lg px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-40 ${
                            active
                              ? "bg-theme-accent text-theme-on-accent"
                              : "bg-transparent hover:bg-theme-border/30"
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </nav>
                )}
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                if (name) navigate("home");
                else setView("home");
              }}
              className="cursor-pointer bg-transparent p-0 font-bold text-inherit"
            >
              recap
            </button>
          </div>
          <div className="flex items-center gap-4">
            {view === "app" && (
              <span className="text-sm text-theme-muted max-[420px]:hidden">{today}</span>
            )}
            {view === "app" && (
              <button
                className="cursor-pointer whitespace-nowrap rounded-lg border border-theme-border bg-theme-surface px-3 py-1 text-sm text-theme-text"
                type="button"
                onClick={handleSignOut}
              >
                Sign out
              </button>
            )}
            <div className="relative" ref={settingsRef}>
              <button
                type="button"
                aria-label="Settings"
                title="Settings"
                className="flex cursor-pointer items-center bg-transparent p-1 text-inherit"
                aria-expanded={settingsOpen}
                aria-controls="settings-panel"
                onClick={() => setSettingsOpen((open) => !open)}
              >
                <Settings aria-hidden="true" className="size-6" />
              </button>
              {settingsOpen && (
                <div
                  id="settings-panel"
                  className="absolute right-0 top-full z-10 mt-2 w-64 rounded-xl border border-theme-border bg-theme-surface p-4 text-theme-text shadow-lg"
                >

                  <fieldset>
                    <legend className="mb-2">Color theme</legend>
                    <div className="grid grid-cols-2 gap-2">
                      {themes.map(({ id, label }) => (
                        <button
                          key={id}
                          type="button"
                          className={`rounded-lg border border-theme-border px-2 py-1 ${
                            id === "mist" ? "col-span-2" : ""
                          } ${
                            theme === id
                              ? "bg-theme-accent text-theme-on-accent"
                              : "bg-theme-surface text-theme-text"
                          }`}
                          aria-pressed={theme === id}
                          onClick={() => handleThemeChange(id)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="mt-4">
                    <legend className="mb-2">Text size</legend>
                    <div className="flex gap-2">
                      {Object.keys(textSizes).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`flex-1 rounded-lg border border-theme-border px-2 py-1 capitalize ${
                            textSize === option
                              ? "bg-theme-accent text-theme-on-accent"
                              : "bg-theme-surface text-theme-text"
                          }`}
                          aria-pressed={textSize === option}
                          onClick={() => handleTextSizeChange(option)}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                </div>
              )}
            </div>

          </div>
        </header>

        <main className="app-main flex-1">
          {view === "app" && (
            <CameraRecovery fileName={studyDoc.file?.name} />
          )}

          {view === "home" && <Homepage onGetStarted={() => setView(name ? "app" : "signin")} />}

          {view === "signin" && (
            <section className="signin-section mx-auto max-w-xl py-18">
              <h1 className="signin-title text-3xl font-semibold">Welcome</h1>
              <p className="my-3 mb-5 leading-relaxed text-theme-muted">
                Sign in to upload your notes and create a recap.
              </p>
              <form onSubmit={handleSignIn}>
                <label className="mb-2 block" htmlFor="name-input">
                  Name
                </label>
                <div className="flex gap-2 max-[420px]:flex-col">
                  <input
                    id="name-input"
                    name="name"
                    type="text"
                    placeholder="blank"
                    autoComplete="given-name"
                    maxLength={60}
                    required
                    value={nameInput}
                    onChange={(event) => setNameInput(event.target.value)}
                    className="w-full min-w-0 rounded-lg border border-theme-border bg-theme-surface px-2 py-2 text-theme-text placeholder:text-theme-muted"
                  />
                  <button
                    className="cursor-pointer rounded-lg border border-theme-accent bg-theme-accent px-3 py-2 text-theme-on-accent"
                    type="submit"
                  >
                    Sign in
                  </button>
                </div>
              </form>
              <PrivacyNote />
            </section>
          )}

          {view === "app" && page === "plans" && <SavedPlans />}

          {view === "app" && page === "game" &&
            (ready ? (
              <GamePage documentId={studyDoc.documentId} text={studyDoc.text} fileName={studyDoc.file.name} />
            ) : (
              <section className="py-18">
                <h1 className="text-3xl font-semibold">Sprout Run</h1>
                <p className="mt-3 text-theme-muted">Upload a document first, then come back to play.</p>
              </section>
            ))}

          {view === "app" && page === "history" && (
            <section className="py-18">
              <h1 className="text-3xl font-semibold">Past documents</h1>
              {history.length === 0 ? (
                <p className="mt-3 text-theme-muted">
                  Nothing here yet. Upload a document and it will show up here.
                </p>
              ) : (
                <ul className="mt-6 space-y-2">
                  {history.map((entry) => (
                    <li key={entry.fileName + entry.savedAt}>
                      <button
                        type="button"
                        onClick={() => handleResumeHistory(entry)}
                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-black px-4 py-3 text-left hover:bg-black/5 dark:border-white dark:hover:bg-white/10"
                      >
                        <span className="min-w-0 truncate font-medium">{entry.fileName}</span>
                        <span className="shrink-0 text-xs text-neutral-500">
                          {relativeTime(entry.savedAt)}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {view === "app" && page === "study" && (
            <section className="dashboard-section py-18">
              <div className="dashboard-intro flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-semibold">Welcome, {name}.</h1>
                  <p className="mt-3 leading-relaxed text-theme-muted">
                    Upload a file, then create a recap.
                  </p>
                </div>
              </div>

              {studyDoc.error && (
                <p role="alert" className="mt-4 text-theme-urgent">
                  {studyDoc.error}
                </p>
              )}

              <ExtensionBanner />

              <div className={`dashboard-cards mt-8 grid grid-cols-1 gap-4 ${ready ? "lg:grid-cols-[3fr_2fr]" : "lg:grid-cols-2"}`}>
                {ready ? (
                  <>
                    <DocumentViewer
                      file={studyDoc.file}
                      text={studyDoc.text}
                      onReplace={handleSelectFile}
                      onRemove={handleRemoveFile}
                    />
                    <StudyPanel
                      key={studyDoc.documentId}
                      fileName={studyDoc.file.name}
                      documentId={studyDoc.documentId}
                      text={studyDoc.text}
                      mode={studyMode}
                      onModeChange={(id) => (id === "game" ? setPage("game") : setStudyMode(id))}
                    />
                  </>
                ) : (
                  <>
                    <article className="dashboard-card rounded-xl border border-theme-border bg-theme-surface p-5 shadow-sm">
                      <h2 className="text-xl font-semibold">Upload a file</h2>
                      <div className="mt-4">
                        <UploadArea
                          file={studyDoc.file}
                          status={studyDoc.status}
                          error={studyDoc.error}
                          onSelect={handleSelectFile}
                          onRemove={handleRemoveFile}
                        />
                      </div>
                    </article>


                    <article className="dashboard-card rounded-xl border border-theme-border bg-theme-surface p-5 shadow-sm">
                      <h2 className="text-xl font-semibold">Past files</h2>
                      {history.length === 0 ? (
                        <p className="mt-4 text-theme-muted">
                          Nothing here yet. Files you upload will show up here.
                        </p>
                      ) : (
                        <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto">
                          {history.map((entry) => (
                            <li key={entry.fileName + entry.savedAt}>
                              <button
                                type="button"
                                onClick={() => handleResumeHistory(entry)}
                                className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg border border-theme-border px-4 py-3 text-left hover:bg-theme-border/20"
                              >
                                <span className="min-w-0 truncate font-medium">{entry.fileName}</span>
                                <span className="shrink-0 text-xs text-theme-muted">
                                  {relativeTime(entry.savedAt)}
                                </span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}

                    </article>
                  </>
                )}
              </div>
              <p className="mt-5 text-sm text-theme-muted">
                Files stay in this browser demo.
              </p>
            </section>
          )}
        </main>

        <footer className="site-footer border-t border-theme-border py-4 text-sm text-theme-muted">
          Recap
        </footer>
      </div>
      {view === "app" && <Sprout />}
    </div>
  );
}

export default App;
