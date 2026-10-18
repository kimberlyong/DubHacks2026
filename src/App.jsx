import { Check, Moon, PanelLeftClose, PanelLeftOpen, Settings, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ExtensionBanner from "./components/ExtensionBanner";
import Homepage from "./components/Homepage";
import MentalBreak from "./components/MentalBreak";
import PlansPreview from "./components/PlansPreview";
import PrivacyNote from "./components/PrivacyNote";
import DocumentViewer from "./components/DocumentViewer";
import SavedPlans from "./components/SavedPlans";
import StudyPanel from "./components/StudyPanel";
import CameraRecovery from "./components/CameraRecovery";
import UploadArea from "./components/UploadArea";
import { useDocument } from "./hooks/useDocument";
import { loadFile } from "./lib/fileStore";
import { getHistory, relativeTime } from "./lib/studyHistory";
import Sprout from "./sprout/Sprout";
import PageErrorBoundary from "./components/PageErrorBoundary";
import SproutArt from "./sprout/SproutArt";
import {
  EXTENSION_READY_MESSAGES,
  UPLOAD_READY_MESSAGES,
  pick,
} from "./sprout/messages";
import { useSprout } from "./sprout/SproutContext";

const textSizes = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
};

// Each theme comes in a light and a dark version (see data-mode in index.css).
// bg + accent are only for the little swatch in the settings menu.
const themes = [
  { id: "default", label: "Default", light: ["#ffffff", "#2383e2"], dark: ["#191919", "#2383e2"] },
  { id: "sand", label: "Warm", light: ["#faf6f0", "#c0753f"], dark: ["#1f1a16", "#d8925c"] },
  { id: "mauve", label: "Purple", light: ["#f7eef1", "#a9829c"], dark: ["#221a1f", "#c9a0bb"] },
  { id: "sky", label: "Blue", light: ["#edf6fc", "#4e84a8"], dark: ["#1e2328", "#78aee8"] },
  { id: "mist", label: "Black & white", light: ["#ffffff", "#000000"], dark: ["#000000", "#ffffff"] },
];
const modes = [
  { id: "light", label: "Light", Icon: Sun },
  { id: "dark", label: "Dark", Icon: Moon },
];

// The old standalone "Dark" theme is now Blue in dark mode.
function getSavedTheme() {
  const savedTheme = localStorage.getItem("recap-theme");
  if (themes.some(({ id }) => id === savedTheme)) return savedTheme;
  if (savedTheme === "dark" || savedTheme === "dusk") return "sky";
  return "default";
}

function getSavedMode() {
  const savedMode = localStorage.getItem("recap-mode");
  if (savedMode === "light" || savedMode === "dark") return savedMode;
  // Before this setting existed, Default and Dark were the dark themes.
  const savedTheme = localStorage.getItem("recap-theme");
  return !savedTheme || ["default", "dark", "dusk"].includes(savedTheme) ? "dark" : "light";
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
  const [mode, setMode] = useState(getSavedMode);
  const [textSize, setTextSize] = useState(getSavedTextSize);
  const studyDoc = useDocument();
  const [extractError, setExtractError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const [history, setHistory] = useState(getHistory);
  const { say } = useSprout();
  const justExtractedRef = useRef(false);
  // The sidebar is open by default on wide screens and remembers the last choice.
  const [navOpen, setNavOpen] = useState(() => {
    try {
      const saved = localStorage.getItem("recap-nav-open");
      if (saved !== null) return saved === "true";
    } catch {
      // storage unavailable; fall through to the default
    }
    return window.innerWidth >= 768;
  });
  const [page, setPage] = useState("study");
  const [studyMode, setStudyMode] = useState(null);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!settingsRef.current?.contains(event.target)) {
        setSettingsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSettingsOpen(false);
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

  function handleModeChange(nextMode) {
    setMode(nextMode);
    localStorage.setItem("recap-mode", nextMode);
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
      say(pick(EXTENSION_READY_MESSAGES), "happy");
    } else {
      say(pick(UPLOAD_READY_MESSAGES), "happy");
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

  async function handleResumeHistory(entry) {
    const original = await loadFile(entry.fileName);
    setPage("study");
    studyDoc.loadText(entry.text, entry.fileName, entry.source, original);
  }

  const ready = studyDoc.status === "ready";

  function toggleNav() {
    setNavOpen((open) => {
      try {
        localStorage.setItem("recap-nav-open", String(!open));
      } catch {
        // ignore; the toggle still works for this session
      }
      return !open;
    });
  }

  function navigate(target) {
    // On narrow screens the sidebar overlays the page, so tuck it away after a choice.
    if (window.innerWidth < 768) setNavOpen(false);
    if (target === "history") {
      setHistory(getHistory());
      setPage("history");
      return;
    }
    if (target === "plans" || target === "break") {
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
    { id: "break", label: "Mental break", needsDoc: false },
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
      data-mode={mode}
      className={`min-h-screen bg-theme-bg text-theme-text ${textSizes[textSize]}`}
    >
      <div
        className={`app-shell mx-auto flex min-h-screen w-full flex-col ${view === "app" ? "px-3" : `px-6 ${studyDoc.status === "ready" && name ? "max-w-7xl" : "max-w-4xl"}`}`}
      >
        <header className="site-header flex min-h-16 items-center justify-between border-b border-theme-border">
          <div className="flex items-center gap-4">
            {view === "app" && (
              <button
                type="button"
                aria-label={navOpen ? "Close navigation sidebar" : "Open navigation sidebar"}
                title={navOpen ? "Close sidebar" : "Open sidebar"}
                aria-expanded={navOpen}
                aria-controls="nav-menu"
                onClick={toggleNav}
                className="flex size-9 cursor-pointer items-center justify-center rounded-lg border border-theme-border bg-transparent text-inherit hover:bg-theme-border/30"
              >
                {navOpen ? (
                  <PanelLeftClose aria-hidden="true" className="size-5" />
                ) : (
                  <PanelLeftOpen aria-hidden="true" className="size-5" />
                )}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (name) navigate("home");
                else setView("home");
              }}
              className="flex cursor-pointer items-center gap-2 bg-transparent p-0 font-bold text-inherit"
            >
              <SproutArt className="size-7" />
              Clarity
            </button>
          </div>
          <div className="flex items-center gap-4">
            {view === "home" && (
              <>
                <a href="#features" className="site-nav-link max-[560px]:hidden">
                  Features
                </a>
                <button
                  type="button"
                  onClick={() => setView(name ? "app" : "signin")}
                  className="cursor-pointer whitespace-nowrap bg-transparent p-0 text-sm text-theme-text"
                >
                  Sign in
                </button>
                <button
                  type="button"
                  onClick={() => setView(name ? "app" : "signin")}
                  className="cursor-pointer whitespace-nowrap rounded-lg border border-theme-accent bg-theme-accent px-3 py-1.5 text-sm font-medium text-theme-on-accent max-[420px]:hidden"
                >
                  Get started
                </button>
              </>
            )}
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
            <button
              type="button"
              aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              title={mode === "dark" ? "Light mode" : "Dark mode"}
              className="flex cursor-pointer items-center bg-transparent p-1 text-inherit"
              onClick={() => handleModeChange(mode === "dark" ? "light" : "dark")}
            >
              {mode === "dark" ? (
                <Sun aria-hidden="true" className="size-6" />
              ) : (
                <Moon aria-hidden="true" className="size-6" />
              )}
            </button>
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
                    <legend className="sr-only">Mode</legend>
                    <p aria-hidden="true" className="mb-2 text-sm font-semibold">Mode</p>
                    <div className="flex rounded-lg border border-theme-border p-0.5">
                      {modes.map(({ id, label, Icon }) => (
                        <button
                          key={id}
                          type="button"
                          className={`flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-md px-2 py-1 text-sm ${
                            mode === id
                              ? "bg-theme-accent text-theme-on-accent"
                              : "bg-transparent text-theme-text hover:bg-theme-border/30"
                          }`}
                          aria-pressed={mode === id}
                          onClick={() => handleModeChange(id)}
                        >
                          <Icon aria-hidden="true" className="size-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="mt-4 border-t border-theme-border pt-4">
                    <legend className="mb-2 text-sm font-semibold">Theme</legend>
                    <div className="flex flex-col gap-1">
                      {themes.map(({ id, label, [mode]: [bg, accent] }) => (
                        <button
                          key={id}
                          type="button"
                          className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-2 py-1.5 text-left ${
                            theme === id
                              ? "border-theme-accent bg-theme-border/30"
                              : "border-transparent bg-transparent hover:bg-theme-border/30"
                          }`}
                          aria-pressed={theme === id}
                          onClick={() => handleThemeChange(id)}
                        >
                          <span
                            aria-hidden="true"
                            className="relative size-6 shrink-0 overflow-hidden rounded-full border border-theme-border"
                            style={{ background: bg }}
                          >
                            <span className="absolute bottom-0 right-0 size-3 rounded-tl-full" style={{ background: accent }} />
                          </span>
                          <span className="flex-1">{label}</span>
                          {theme === id && <Check aria-hidden="true" className="size-4 text-theme-accent" />}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                  <fieldset className="mt-4 border-t border-theme-border pt-4">
                    <legend className="sr-only">Text size</legend>
                    <p aria-hidden="true" className="mb-2 text-sm font-semibold">Text size</p>
                    <div className="flex rounded-lg border border-theme-border p-0.5">
                      {Object.keys(textSizes).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`flex-1 cursor-pointer rounded-md px-2 py-1 text-sm capitalize ${
                            textSize === option
                              ? "bg-theme-accent text-theme-on-accent"
                              : "bg-transparent text-theme-text hover:bg-theme-border/30"
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


        <div className="relative flex min-w-0 flex-1">
        {view === "app" && navOpen && (
          <nav
            id="nav-menu"
            aria-label="Pages"
            className="app-sidebar absolute inset-y-0 left-0 z-20 w-52 border-r border-theme-border bg-theme-bg py-6 pr-3 max-md:bg-theme-surface max-md:px-3 max-md:shadow-lg md:static md:shrink-0"
          >
            <div className="flex flex-col gap-1 md:sticky md:top-6">
              {navItems.map((item) => {
                const disabled = item.needsDoc && !ready;
                const active =
                  item.id === "history" || item.id === "plans" || item.id === "break"
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
                    className={`block w-full cursor-pointer rounded-lg px-3 py-2 text-left disabled:cursor-not-allowed disabled:opacity-40 ${
                      active
                        ? "bg-theme-accent text-theme-on-accent"
                        : "bg-transparent hover:bg-theme-border/30"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>
        )}
        <main
          className={`app-main min-w-0 flex-1 ${view === "app" && navOpen ? "md:pl-8" : ""} ${
            view === "app" && !(ready && page === "study") ? "mx-auto w-full max-w-6xl" : ""
          }`}
        >
          <PageErrorBoundary key={`${view}-${page}`} onHome={() => navigate("home")}>
          {view === "app" && page === "study" && (
            <CameraRecovery
              fileName={studyDoc.file?.name}
              onBrainBreak={() => setPage("break")}
            />
          )}
          {view === "home" && <Homepage onGetStarted={() => setView(name ? "app" : "signin")} />}

          {view === "signin" && (
            <section className="signin-section mx-auto max-w-xl py-18">
              <h1 className="signin-title mb-5 text-3xl font-semibold">Welcome</h1>
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

          {view === "app" && page === "break" && <MentalBreak />}

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
              {!ready && !studyMode && (
                <div className="dashboard-intro flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-3xl font-semibold">Welcome, {name}.</h1>
                  </div>
                </div>
              )}

              {studyDoc.error && (
                <p role="alert" className="mt-4 text-theme-urgent">
                  {studyDoc.error}
                </p>
              )}

              <ExtensionBanner />

              <div className={ready ? "dashboard-cards mt-8 grid gap-4 lg:grid-cols-[3fr_2fr]" : "home-cards"}>
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
                      onModeChange={setStudyMode}
                    />
                  </>
                ) : (
                  <>
                    <article className="dashboard-card home-card rounded-xl border border-theme-border bg-theme-surface shadow-sm">
                      <h2 className="font-semibold">Upload a file</h2>
                      <div className="home-card-body">
                        <UploadArea
                          file={studyDoc.file}
                          status={studyDoc.status}
                          error={studyDoc.error}
                          onSelect={handleSelectFile}
                          onRemove={handleRemoveFile}
                        />
                      </div>
                    </article>

                    <article className="dashboard-card home-card rounded-xl border border-theme-border bg-theme-surface shadow-sm">
                      <h2 className="font-semibold">Plans</h2>
                      <div className="home-card-body">
                        <PlansPreview onOpen={() => navigate("plans")} />
                      </div>
                    </article>

                    <article className="dashboard-card home-card relative rounded-xl border border-theme-border bg-theme-surface shadow-sm">
                      {/* Sprout peeks over the top edge of this box. */}
                      <div aria-hidden="true" className="pointer-events-none absolute bottom-full right-6 h-10 w-16 overflow-hidden">
                        <SproutArt className="w-16" />
                      </div>
                      <h2 className="font-semibold">Mental break</h2>
                      <div className="home-card-body">
                        <p>Step away for a minute and reset.</p>
                        <button
                          type="button"
                          onClick={() => navigate("break")}
                          className="cursor-pointer rounded-lg border border-theme-accent bg-theme-accent px-3 py-1.5 text-theme-on-accent"
                        >
                          Take a break
                        </button>
                      </div>
                    </article>
                  </>
                )}
              </div>
            </section>
          )}
          </PageErrorBoundary>
        </main>
        </div>

        <footer className="site-footer border-t border-theme-border py-4 text-sm text-theme-muted">
          Clarity
        </footer>
      </div>
      {view === "app" && <Sprout />}
    </div>
  );
}

export default App;
