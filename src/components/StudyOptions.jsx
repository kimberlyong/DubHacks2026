import { BookOpen, ClipboardList, HelpCircle, ListTree, MessageCircle, Network, Sparkles, Target } from "lucide-react";

// Each tool gets a soft pastel tone so the tabs read at a glance.
const TONES = {
  concept: "bg-theme-concept-t text-theme-concept",
  action: "bg-theme-action-t text-theme-action",
  review: "bg-theme-review-t text-theme-review",
  reflect: "bg-theme-reflect-t text-theme-reflect",
};

export const STUDY_MODES = [
  { id: "summary", label: "Summary", Icon: Sparkles, tone: "concept" },
  { id: "plan", label: "Plan my time", Icon: Target, tone: "action" },
  { id: "keyTerms", label: "Key terms", Icon: ClipboardList, tone: "review" },
  { id: "visualizer", label: "Visualize", Icon: Network, tone: "reflect" },
  { id: "ask", label: "Ask", Icon: MessageCircle, tone: "concept" },
  { id: "flashcards", label: "Flashcards", Icon: BookOpen, tone: "action", soon: true },
  { id: "quiz", label: "Quiz", Icon: HelpCircle, tone: "review", soon: true },
  { id: "outline", label: "Outline", Icon: ListTree, tone: "reflect", soon: true },
];

export default function StudyTabs({ activeMode, onSelect }) {
  return (
    <div role="tablist" aria-label="Study tools" className="flex flex-wrap gap-1.5">
      {STUDY_MODES.map(({ id, label, Icon, tone, soon }) => {
        const active = activeMode === id;
        return (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(id)}
            className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-medium ${
              active ? TONES[tone] : "text-theme-muted hover:bg-theme-surface-2 hover:text-theme-text"
            }`}
          >
            <Icon aria-hidden="true" className="size-4" />
            {label}
            {soon && (
              <span className="rounded-full bg-theme-surface-2 px-1.5 text-[0.65rem] uppercase tracking-wide text-theme-muted">
                soon
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
