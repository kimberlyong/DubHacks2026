import { Check, Clock, FileText, FileUp, Puzzle, Sprout, TextSearch, Zap } from "lucide-react";
import SproutArt from "../sprout/SproutArt";

const FEATURES = [
  { icon: FileUp, title: "Upload anything", body: "A reading, slides, or notes. Pick your time and energy, and it's broken into small steps." },
  { icon: Puzzle, title: "Canvas extension", body: "Pull an assignment, syllabus, or lecture page straight out of Canvas with one click." },
  { icon: TextSearch, title: "Simplify on demand", body: "Slide from a quick overview to the full detail, or select any sentence for an explanation." },
  { icon: Sprout, title: "Sprout's got you", body: "A quiet study companion with tips, encouragement, and a nudge when it's time to refocus." },
];

// Sample steps for the preview card. The tag colors match the ones the real
// study plan uses (see the --concept / --action / --review tokens).
const PREVIEW_STEPS = [
  { title: "Skim the headings and bold terms", minutes: 5, tag: "Concept", tone: "concept", done: true },
  { title: "Read 4.1: How cells get energy", minutes: 10, tag: "Read", tone: "action", current: true },
  { title: "Write down 3 key terms", minutes: 5, tag: "Review", tone: "review" },
  { title: "Quick flashcard check", minutes: 5, tag: "Review", tone: "review" },
];

// A static picture of the study plan, so visitors can see what they get
// before signing in. It's decorative, so screen readers skip it.
function ProductPreview() {
  return (
    <div className="preview" aria-hidden="true">
      <div className="preview-window">
        <div className="preview-bar">
          <span />
          <span />
          <span />
        </div>
        <div className="preview-body">
          <div className="flex items-center gap-2 text-sm">
            <FileText className="size-4 shrink-0 text-theme-muted" />
            <span className="truncate font-medium">Chapter 4 - Cell Energy.pdf</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="preview-chip">
              <Clock className="size-3.5" /> 25 min
            </span>
            <span className="preview-chip">
              <Zap className="size-3.5" /> Low energy
            </span>
          </div>

          <div className="mt-5 flex items-center justify-between text-xs text-theme-muted">
            <span>Your plan</span>
            <span>1 of 4 done</span>
          </div>
          <div className="preview-progress mt-2">
            <span style={{ width: "25%" }} />
          </div>

          <ol className="mt-4 space-y-2">
            {PREVIEW_STEPS.map((step) => (
              <li
                key={step.title}
                className={`preview-step ${step.current ? "preview-step-current" : ""} ${step.done ? "preview-step-done" : ""}`}
              >
                <span className="preview-check">{step.done && <Check className="size-3" />}</span>
                <span className="min-w-0 flex-1 truncate text-sm">{step.title}</span>
                <span className={`preview-tag preview-tag-${step.tone}`}>{step.tag}</span>
                <span className="w-12 shrink-0 text-right text-xs text-theme-muted">{step.minutes} min</span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="preview-sprout">
        <p className="preview-bubble">Nice start. Just 10 minutes for this one.</p>
        <SproutArt className="size-16 drop-shadow-md" />
      </div>
    </div>
  );
}

export default function Homepage({ onGetStarted }) {
  return (
    <>
      <section className="homepage">
        <div className="homepage-copy">
          <p className="homepage-kicker">Built for how ADHD brains actually study</p>
          <h1 className="homepage-title">Big readings, broken into small steps.</h1>
          <p className="homepage-description">
            Upload any reading and get a plan that fits the time and energy you have, with Sprout
            keeping you company along the way.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button type="button" onClick={onGetStarted} className="homepage-cta">
              Get started
            </button>
            <a href="#features" className="homepage-secondary">
              See how it works
            </a>
          </div>
        </div>
        <ProductPreview />
      </section>

      <section id="features" aria-labelledby="features-heading" className="homepage-features-section">
        <h2 id="features-heading" className="homepage-section-title">
          Everything you need to get through the reading
        </h2>
        <div className="homepage-features">
          {FEATURES.map((f) => (
            <article key={f.title} className="homepage-feature">
              <f.icon className="homepage-feature-icon" aria-hidden="true" />
              <h3 className="homepage-feature-title">{f.title}</h3>
              <p className="homepage-feature-body">{f.body}</p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
