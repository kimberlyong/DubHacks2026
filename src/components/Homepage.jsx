const FEATURES = [
  { icon: "📄", title: "Upload anything", body: "A reading, slides, or notes — pick your time and energy, and it's broken into small steps." },
  { icon: "🧩", title: "Canvas extension", body: "Pull an assignment, syllabus, or lecture page straight out of Canvas with one click." },
  { icon: "🔎", title: "Simplify on demand", body: "Slide from a quick overview to the full detail, or select any sentence for an explanation." },
  { icon: "🌱", title: "Sprout's got you", body: "A quiet study companion with tips, encouragement, and a nudge when it's time to refocus." },
];

export default function Homepage({ onGetStarted }) {
  return (
    <section className="py-16 sm:py-24">
      <p className="mb-3 inline-block rounded-full bg-theme-surface px-3 py-1 text-sm font-medium text-theme-accent">
        Built for how ADHD brains actually study
      </p>
      <h1 className="text-4xl font-semibold sm:text-5xl">Recap</h1>
      <p className="mt-4 max-w-md text-lg leading-relaxed text-theme-muted">
        Big reading assignments, broken into small, doable pieces — with a friendly companion
        keeping you company along the way.
      </p>
      <button
        type="button"
        onClick={onGetStarted}
        className="mt-7 rounded-lg border border-theme-accent bg-theme-accent px-5 py-3 font-medium text-theme-on-accent"
      >
        Get started
      </button>

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2">
        {FEATURES.map((f) => (
          <div key={f.title} className="rounded-xl border border-theme-border p-4">
            <div className="text-2xl" aria-hidden="true">{f.icon}</div>
            <h2 className="mt-2 font-semibold">{f.title}</h2>
            <p className="mt-1 text-sm text-theme-muted">{f.body}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
