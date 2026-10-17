import { useSummary } from "../hooks/useSummary";
import StudyOptions from "./StudyOptions";
import SummaryDisplay from "./SummaryDisplay";
import SummarySlider from "./SummarySlider";
import AskQuestions from "./study/AskQuestions";
import Flashcards from "./study/Flashcards";
import KeyTerms from "./study/KeyTerms";
import Outline from "./study/Outline";
import Plan from "./study/Plan";
import PracticeQuiz from "./study/PracticeQuiz";
import Visualizer from "./study/Visualizer";

// Rendered with key={documentId} by the parent so all panel state resets per document.
// `mode` is owned by App so the top navigator can jump straight to a tool.
export default function StudyPanel({ fileName, documentId, text, mode, onModeChange }) {
  const { level, setLevel, summary, status, error, retry } = useSummary({ documentId, text });

  function handleSelect(id) {
    onModeChange(mode === id ? null : id);
  }

  return (
    <aside
      aria-labelledby="study-panel-title"
      className="flex flex-col overflow-hidden rounded-xl border border-theme-border bg-theme-surface text-theme-text shadow-sm"
    >
      <header className="border-b border-theme-border p-5">
        <h2 id="study-panel-title" className="text-xl font-semibold">
          Study panel
        </h2>
        <p className="break-all text-sm text-theme-muted">{fileName}</p>
      </header>

      <div className="space-y-6 p-5">
        <SummarySlider level={level} onChange={setLevel} />
        {text.length < 300 && (
          <p className="text-sm text-theme-muted">
            This document is very short, so summaries may be close to the original.
          </p>
        )}
        <section aria-label="Summary" aria-busy={status === "loading"}>
          <SummaryDisplay status={status} summary={summary} error={error} onRetry={retry} />
        </section>

        <StudyOptions activeMode={mode} onSelect={handleSelect} />

        {mode && (
          <section aria-label="Study tool">
            {mode === "plan" && <Plan documentId={documentId} text={text} />}
            {mode === "keyTerms" && <KeyTerms documentId={documentId} text={text} />}
            {mode === "flashcards" && <Flashcards />}
            {mode === "visualizer" && <Visualizer documentId={documentId} text={text} />}
            {mode === "quiz" && <PracticeQuiz />}
            {mode === "outline" && <Outline />}
            {mode === "ask" && <AskQuestions documentId={documentId} />}
          </section>
        )}
      </div>
    </aside>
  );
}
