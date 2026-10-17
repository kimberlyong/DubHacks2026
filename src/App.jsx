import { useEffect, useRef, useState } from "react";
import StudyPanel from "./components/StudyPanel";
import UploadArea from "./components/UploadArea";
import { useDocument } from "./hooks/useDocument";

const textSizes = {
  small: "text-sm",
  medium: "text-base",
  large: "text-lg",
};

function getSavedTextSize() {
  const savedSize = localStorage.getItem("recap-size");
  return Object.hasOwn(textSizes, savedSize) ? savedSize : "medium";
}

function App() {
  const [name, setName] = useState(() => localStorage.getItem("recap-name") ?? "");
  const [nameInput, setNameInput] = useState("");
  const [theme, setTheme] = useState(
    () => (localStorage.getItem("recap-theme") === "dark" ? "dark" : "light"),
  );
  const [textSize, setTextSize] = useState(getSavedTextSize);
  const studyDoc = useDocument();
  const [panelOpen, setPanelOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef(null);

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
  }

  function handleSignOut() {
    setName("");
    setNameInput("");
    handleRemoveFile();
    localStorage.removeItem("recap-name");
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
    setPanelOpen(false);
    await studyDoc.upload(file);
  }

  function handleRemoveFile() {
    setPanelOpen(false);
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
      className={`min-h-screen bg-white text-black dark:bg-black dark:text-white ${textSizes[textSize]}`}
    >
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col px-6">
        <header className="flex min-h-16 items-center justify-between border-b border-black dark:border-white">
          <a className="font-bold text-inherit no-underline" href="#">
            recap
          </a>
          <div className="flex items-center gap-4">
            <span className="text-sm text-neutral-600 dark:text-neutral-300 max-[420px]:hidden">
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
                  className="absolute right-0 top-full z-10 mt-2 w-64 border border-black bg-white p-4 text-black dark:border-white dark:bg-black dark:text-white"
                >
                  <fieldset>
                    <legend className="mb-2">Appearance</legend>
                    <div className="flex gap-2">
                      {["light", "dark"].map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`flex-1 border border-black px-2 py-1 capitalize dark:border-white ${
                            theme === option
                              ? "bg-black text-white dark:bg-white dark:text-black"
                              : "bg-white text-black dark:bg-black dark:text-white"
                          }`}
                          aria-pressed={theme === option}
                          onClick={() => handleThemeChange(option)}
                        >
                          {option}
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
                          className={`flex-1 border border-black px-2 py-1 capitalize dark:border-white ${
                            textSize === option
                              ? "bg-black text-white dark:bg-white dark:text-black"
                              : "bg-white text-black dark:bg-black dark:text-white"
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

        <main className="flex-1">
          {!name ? (
            <section className="mx-auto max-w-xl py-18">
              <h1 className="text-3xl font-semibold">Welcome</h1>
              <p className="my-3 mb-7 leading-relaxed text-neutral-600 dark:text-neutral-300">
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
                    className="w-full min-w-0 border border-black bg-white px-2 py-2 text-black placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black dark:border-white dark:bg-black dark:text-white dark:focus-visible:outline-white"
                  />
                  <button
                    className="border border-black bg-black px-3 py-2 text-white dark:border-white dark:bg-white dark:text-black"
                    type="submit"
                  >
                    Sign in
                  </button>
                </div>
              </form>
            </section>
          ) : (
            <section className="py-18">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-semibold">Welcome, {name}.</h1>
                  <p className="mt-3 leading-relaxed text-neutral-600 dark:text-neutral-300">
                    Upload a file, then create a recap.
                  </p>
                </div>
                <button
                  className="whitespace-nowrap border border-black bg-white px-3 py-2 text-black dark:border-white dark:bg-black dark:text-white"
                  type="button"
                  onClick={handleSignOut}
                >
                  Sign out
                </button>
              </div>

              <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <article className="border border-black p-5 dark:border-white">
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

                <article className="border border-black p-5 dark:border-white">
                  <h2 className="text-xl font-semibold">Create a recap</h2>
                  <p className="my-4 text-neutral-600 dark:text-neutral-300">
                    Make a summary of your uploaded file.
                  </p>
                  <button
                    className="border border-black bg-white px-3 py-2 text-black disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:bg-black dark:text-white"
                    type="button"
                    disabled={studyDoc.status !== "ready"}
                    onClick={() => setPanelOpen(true)}
                  >
                    Open study panel
                  </button>
                  <p
                    className="mt-3 text-sm text-neutral-600 dark:text-neutral-300"
                    aria-live="polite"
                  >
                    {studyDoc.status === "ready"
                      ? "Your file is ready to study."
                      : "Your recap starts with an upload."}
                  </p>
                </article>
              </div>
              <p className="mt-5 text-sm text-neutral-600 dark:text-neutral-300">
                Files stay in this browser demo.
              </p>
            </section>
          )}
        </main>

        <footer className="border-t border-black py-4 text-sm text-neutral-600 dark:border-white dark:text-neutral-300">
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
