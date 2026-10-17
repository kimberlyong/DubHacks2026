import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSummary } from "../hooks/useSummary";
import StudyOptions from "./StudyOptions";
import SummaryDisplay from "./SummaryDisplay";
import SummarySlider from "./SummarySlider";
import AskQuestions from "./study/AskQuestions";
import Flashcards from "./study/Flashcards";
import KeyTerms from "./study/KeyTerms";
import Outline from "./study/Outline";
import PracticeQuiz from "./study/PracticeQuiz";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), textarea, select, [tabindex]:not([tabindex="-1"])';

// Rendered with key={documentId} by the parent so all panel state resets per document.
export default function StudyPanel({ open, fileName, documentId, text, onClose }) {
  const panelRef = useRef(null);
  const returnFocusRef = useRef(null);
  const { level, setLevel, summary, status, error, retry } = useSummary({ documentId, text });
  const [mode, setMode] = useState(null);

  // Focus management: move focus in on open, restore it on close.
  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement;
    panelRef.current?.querySelector("[data-close]")?.focus();
    return () => returnFocusRef.current?.focus?.();
  }, [open]);

  function handleKeyDown(event) {
    if (event.key === "Escape") {
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key !== "Tab") return;
    const items = [...panelRef.current.querySelectorAll(FOCUSABLE)];
    const first = items[0];
    const last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleSelect(id) {
    if (id === "eli5") {
      setLevel(0);
      setMode(null);
    } else {
      setMode((current) => (current === id ? null : id));
    }
  }

  return (
    <>
      <div
        aria-hidden="true"
        onClick={onClose}
        className={`fixed inset-0 z-20 bg-black/40 transition-opacity duration-300 motion-reduce:transition-none ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="study-panel-title"
        inert={!open}
        onKeyDown={handleKeyDown}
        className={`fixed inset-x-0 bottom-0 z-30 flex max-h-[90vh] flex-col border border-black bg-white text-black transition-transform duration-300 motion-reduce:transition-none dark:border-white dark:bg-black dark:text-white sm:inset-y-0 sm:left-auto sm:right-0 sm:max-h-none sm:w-[28rem] ${
          open ? "translate-y-0 sm:translate-x-0" : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        }`}
      >
        <header className="flex items-start justify-between gap-3 border-b border-black p-5 dark:border-white">
          <div className="min-w-0">
            <h2 id="study-panel-title" className="text-xl font-semibold">
              Study panel
            </h2>
            <p className="break-all text-sm text-neutral-600 dark:text-neutral-300">{fileName}</p>
          </div>
          <button
            type="button"
            data-close
            aria-label="Close study panel"
            onClick={onClose}
            className="cursor-pointer p-1 focus-visible:outline-2 focus-visible:outline-black dark:focus-visible:outline-white"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto p-5">
          <SummarySlider level={level} onChange={setLevel} />
          {text.length < 300 && (
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              This document is very short, so summaries may be close to the original.
            </p>
          )}
          <section aria-label="Summary" aria-busy={status === "loading"}>
            <SummaryDisplay status={status} summary={summary} error={error} onRetry={retry} />
          </section>

          <StudyOptions activeMode={mode} onSelect={handleSelect} />

          {mode && (
            <section aria-label="Study tool">
              {mode === "keyTerms" && <KeyTerms documentId={documentId} text={text} />}
              {mode === "flashcards" && <Flashcards />}
              {mode === "quiz" && <PracticeQuiz />}
              {mode === "outline" && <Outline />}
              {mode === "ask" && <AskQuestions documentId={documentId} />}
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
