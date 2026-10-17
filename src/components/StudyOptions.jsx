import { BookOpen, Brain, ClipboardList, HelpCircle, ListTree, MessageCircle, Baby } from "lucide-react";

export const STUDY_MODES = [
  { id: "flashcards", label: "Flashcards", Icon: BookOpen },
  { id: "quiz", label: "Practice Quiz", Icon: HelpCircle },
  { id: "keyTerms", label: "Key Terms & Definitions", Icon: ClipboardList },
  { id: "outline", label: "Outline / Study Guide", Icon: ListTree },
  { id: "ask", label: "Ask Questions", Icon: MessageCircle },
  { id: "eli5", label: "Explain Like I'm 5", Icon: Baby },
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
              className={`flex cursor-pointer items-center gap-2 border border-black px-3 py-2 text-left hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:hover:bg-neutral-900 dark:focus-visible:outline-white ${
                activeMode === id ? "bg-black text-white hover:bg-black dark:bg-white dark:text-black dark:hover:bg-white" : ""
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
