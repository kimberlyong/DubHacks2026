import { useSummary } from "../hooks/useSummary";
import StudyTabs from "./StudyOptions";
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
// `mode` is owned by App; null means the default Summary tab.
export default function StudyPanel({ documentId, text, mode, onModeChange }) {
  const { level, setLevel, summary, status, error, retry } = useSummary({ documentId, text });
  const tab = mode ?? "summary";

  return (
    <aside
      aria-label="Study tools"
      className="cozy-card flex flex-col overflow-hidden lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)]"
    >
      <div className="border-b border-theme-border px-4 pb-3 pt-4">
        <StudyTabs activeMode={tab} onSelect={(id) => onModeChange(id === "summary" ? null : id)} />
      </div>

      <div role="tabpanel" className="flex-1 overflow-y-auto p-5 sm:p-6">
        {tab === "summary" && (
          <div className="space-y-6">
            <SummarySlider level={level} onChange={setLevel} />
            {text.length < 300 && (
              <p className="rounded-2xl bg-theme-surface-2 px-4 py-3 text-sm text-theme-muted">
                This one's short, so the summaries may be close to the original.
              </p>
            )}
            <section aria-label="Summary" aria-busy={status === "loading"}>
              <SummaryDisplay status={status} summary={summary} error={error} onRetry={retry} />
            </section>
          </div>
        )}
        {tab === "plan" && <Plan documentId={documentId} text={text} />}
        {tab === "keyTerms" && <KeyTerms documentId={documentId} text={text} />}
        {tab === "visualizer" && <Visualizer documentId={documentId} text={text} />}
        {tab === "ask" && <AskQuestions documentId={documentId} />}
        {tab === "flashcards" && <Flashcards />}
        {tab === "quiz" && <PracticeQuiz />}
        {tab === "outline" && <Outline />}
      </div>
    </aside>
  );
}
