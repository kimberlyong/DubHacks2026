import { useEffect, useRef, useState } from "react";
import ExtensionBanner from "./components/ExtensionBanner";
import Homepage from "./components/Homepage";
import PrivacyNote from "./components/PrivacyNote";
import StudyPanel from "./components/StudyPanel";
import StudyHistory from "./components/StudyHistory";
import UploadArea from "./components/UploadArea";
import { useDocument } from "./hooks/useDocument";
import { getHistory } from "./lib/studyHistory";

const textSizes = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
};

const themes = [
  { id: "mist", label: "Mist (default)" },
  { id: "blush", label: "Blush" },
  { id: "mauve", label: "Mauve" },
  { id: "dusk", label: "Dusk (dark)" },
];

function getSavedTheme() {
  const savedTheme = localStorage.getItem("recap-theme");
  if (themes.some(({ id }) => id === savedTheme)) return savedTheme;
  if (savedTheme === "dark") return "dusk";
  return "mist";
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
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);
  const [history, setHistory] = useState(getHistory);

  useEffect(() => {
    function handlePointerDown(event) {
      if (!settingsRef.current?.contains(event.target)) {
        setSettingsOpen(false);
      }
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") {
        setSettingsOpen(false);
        setPanelOpen(false);
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

  function handleResumeHistory(entry) {
    studyDoc.loadText(entry.text, entry.fileName, entry.source);
    setPanelOpen(true);
  }

  function handleRemoveFile() {
    studyDoc.remove();
  }

  // Open the panel as soon as a document finishes extracting.
  useEffect(() => {
    if (studyDoc.status === "ready") setPanelOpen(true);
  }, [studyDoc.documentId, studyDoc.status]);

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
        className={`mx-auto flex min-h-screen w-full flex-col px-6 ${studyDoc.status === "ready" && name ? "max-w-7xl" : "max-w-4xl"}`}
      >
        <header className="flex min-h-16 items-center justify-between border-b border-theme-border">
          <button
            type="button"
            onClick={() => setView(name ? "app" : "home")}
            className="cursor-pointer bg-transparent p-0 font-bold text-inherit"
          >
            recap
          </button>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-theme-muted">
              <span className="max-[520px]:hidden">Color theme</span>
              <select
                aria-label="Select color theme"
                value={theme}
                onChange={(event) => handleThemeChange(event.target.value)}
                className="max-w-36 cursor-pointer border border-theme-border bg-theme-surface px-2 py-1 text-theme-text"
              >
                {themes.map(({ id, label }) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            {view === "app" && (
              <div className="flex items-center gap-4">
              <span className="text-sm text-theme-muted max-[420px]:hidden">
                {today}
              </span>
              <div className="relative" ref={settingsRef}>
                <button
                  type="button"
                  className="cursor-pointer bg-transparent py-1 text-inherit"
                  aria-expanded={settingsOpen}
                  aria-controls="settings-panel"
                  onClick={() => setSettingsOpen((open) => !open)}
                >
                  Settings
                </button>
                {settingsOpen && (
                  <div
                    id="settings-panel"
                    className="absolute right-0 top-full z-10 mt-2 w-64 rounded-xl border border-theme-border bg-theme-surface p-4 text-theme-text"
                  >
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
            )}
          </div>
        </header>

        <main className="flex-1">
          {view === "home" && <Homepage onGetStarted={() => setView("signin")} />}

          {view === "signin" && (
            <section className="mx-auto max-w-xl py-18">
              <h1 className="text-3xl font-semibold">Welcome</h1>
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
                    className="rounded-lg border border-theme-accent bg-theme-accent px-3 py-2 text-theme-on-accent"
                    type="submit"
                  >
                    Sign in
                  </button>
                </div>
              </form>
              <PrivacyNote />
            </section>
          )}

          {view === "app" && (
            <section className="py-18">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-semibold">Welcome, {name}.</h1>
                  <p className="mt-3 leading-relaxed text-theme-muted">
                    Upload a file to read it next to your study panel.
                  </p>
                </div>
                <button
                  className="whitespace-nowrap rounded-lg border border-theme-border bg-theme-surface px-3 py-2 text-theme-text"
                  type="button"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </div>

              {studyDoc.error && (
                <p role="alert" className="mt-4 text-theme-urgent">
                  {studyDoc.error}
                </p>
              )}

              <ExtensionBanner />
              <StudyHistory entries={history} onResume={handleResumeHistory} />

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <article className="border border-theme-border bg-theme-surface p-5">
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

                <article className="border border-theme-border bg-theme-surface p-5">
                  <h2 className="text-xl font-semibold">Create a recap</h2>
                  <p className="my-4 text-theme-muted">
                    Make a summary of your uploaded file.
                  </p>
                  <button
                    className="border border-theme-border bg-theme-surface px-3 py-2 text-theme-text disabled:cursor-not-allowed disabled:opacity-50"
                    type="button"
                    disabled={studyDoc.status !== "ready"}
                    onClick={() => setPanelOpen(true)}
                  >
                    Open study panel
                  </button>
                  <p
                    className="mt-3 text-sm text-theme-muted"
                    aria-live="polite"
                  >
                    {studyDoc.status === "ready"
                      ? "Your file is ready to study."
                      : "Your recap starts with an upload."}
                  </p>
                </article>
              </div>
              <p className="mt-5 text-sm text-theme-muted">
                Files stay in this browser demo.
              </p>
            </section>
          )}
        </main>

        <footer className="border-t border-theme-border py-4 text-sm text-theme-muted">
          Recap
        </footer>
      </div>
      {studyDoc.status === "ready" && (
        <StudyPanel
          key={studyDoc.documentId}
          open={panelOpen}
          fileName={studyDoc.file.name}
          documentId={studyDoc.documentId}
          text={studyDoc.text}
          onClose={() => setPanelOpen(false)}
        />
      )}
    </div>
  );
}

export default App;
