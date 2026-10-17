import { FileUp, Puzzle, Sprout, TextSearch } from "lucide-react";

const FEATURES = [
  { icon: FileUp, title: "Upload anything", body: "A reading, slides, or notes. Pick your time and energy, and it's broken into small steps." },
  { icon: Puzzle, title: "Canvas extension", body: "Pull an assignment, syllabus, or lecture page straight out of Canvas with one click." },
  { icon: TextSearch, title: "Simplify on demand", body: "Slide from a quick overview to the full detail, or select any sentence for an explanation." },
  { icon: Sprout, title: "Sprout's got you", body: "A quiet study companion with tips, encouragement, and a nudge when it's time to refocus." },
];

export default function Homepage({ onGetStarted }) {
  return (
    <section className="homepage py-16 sm:py-24">
      <p className="homepage-kicker mb-3 inline-block rounded-full bg-theme-surface px-3 py-1 text-sm font-medium text-theme-accent">
        Built for how ADHD brains actually study
      </p>
      <h1 className="homepage-title text-4xl font-semibold sm:text-5xl">Clarity</h1>
      <p className="homepage-description mt-4 max-w-md text-lg leading-relaxed text-theme-muted">
        Big reading assignments, broken into small, doable pieces, with a friendly companion
        keeping you company along the way.
      </p>
      <button
        type="button"
        onClick={onGetStarted}
        className="homepage-cta mt-7 rounded-lg border border-theme-accent bg-theme-accent px-5 py-3 font-medium text-theme-on-accent"
      >
        Get started
      </button>

      <div className="homepage-features mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <article key={f.title} className="homepage-feature rounded-xl border border-theme-border p-4">
            <f.icon className="homepage-feature-icon" aria-hidden="true" />
            <h2 className="homepage-feature-title mt-2 font-semibold">{f.title}</h2>
            <p className="homepage-feature-body mt-1 text-sm text-theme-muted">{f.body}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
