import { BookOpen, Brain, ListChecks, MessageCircleQuestion, Network, Target } from "lucide-react";

export const STUDY_MODES = [
  { id: "plan", label: "Plan My Time", Icon: Target },
  { id: "flashcards", label: "Flashcards", Icon: BookOpen },
  { id: "quiz", label: "Quick quiz", Icon: ListChecks },
  { id: "ask", label: "Ask the reading", Icon: MessageCircleQuestion },
  { id: "visualizer", label: "Visualizer", Icon: Network },
];

export default function StudyOptions({ activeMode, loadingMode, onSelect }) {
  return (
    <section aria-labelledby="study-options-heading">
      <h3 id="study-options-heading" className="mb-3 flex items-center gap-2 font-semibold">
        <Brain aria-hidden="true" className="size-4" />
        Other ways to study
      </h3>
      <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
        {STUDY_MODES.map(({ id, label, Icon }) => {
          const loading = loadingMode === id;
          return (
            <button
              key={id}
              type="button"
              disabled={loading}
              aria-pressed={activeMode === id}
              onClick={() => onSelect(id)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border border-theme-border px-3 py-2 text-left hover:bg-theme-border/20 disabled:cursor-not-allowed disabled:opacity-50 ${
                activeMode === id ? "bg-theme-accent text-theme-on-accent hover:bg-theme-accent" : ""
              }`}
            >
              <Icon aria-hidden="true" className={`size-4 shrink-0 ${loading ? "animate-pulse" : ""}`} />
              {label}
            </button>
          );
        })}
      </div>
    </section>
  );
}
