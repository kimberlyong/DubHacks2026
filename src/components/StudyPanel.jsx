import { useState } from "react";
import { useSummary } from "../hooks/useSummary";
import StudyOptions from "./StudyOptions";
import SummaryDisplay from "./SummaryDisplay";
import SummarySlider from "./SummarySlider";
import AskQuestions from "./study/AskQuestions";
import Flashcards from "./study/Flashcards";
import KeyTerms from "./study/KeyTerms";
import Outline from "./study/Outline";
import PracticeQuiz from "./study/PracticeQuiz";

// Rendered with key={documentId} by the parent so all panel state resets per document.
export default function StudyPanel({ fileName, documentId, text }) {
  const { level, setLevel, summary, status, error, retry } = useSummary({ documentId, text });
  const [mode, setMode] = useState(null);

  function handleSelect(id) {
    if (id === "eli5") {
      setLevel(0);
      setMode(null);
    } else {
      setMode((current) => (current === id ? null : id));
    }
  }

  return (
    <aside
      aria-labelledby="study-panel-title"
      className="flex flex-col border border-black bg-white text-black dark:border-white dark:bg-black dark:text-white"
    >
      <header className="border-b border-black p-5 dark:border-white">
        <h2 id="study-panel-title" className="text-xl font-semibold">
          Study panel
        </h2>
        <p className="break-all text-sm text-neutral-600 dark:text-neutral-300">{fileName}</p>
      </header>

      <div className="space-y-6 p-5">
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
  );
}
