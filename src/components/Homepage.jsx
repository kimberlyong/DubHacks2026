import { ArrowRight, Eye, FileText, Puzzle, Target } from "lucide-react";
import { SproutArt } from "../sprout/Sprout";

const FEATURES = [
  {
    Icon: FileText,
    tone: "bg-theme-concept-t text-theme-concept",
    title: "Bring any reading",
    body: "Upload a PDF, slides, or notes, and slide between a quick gist and the full detail.",
  },
  {
    Icon: Target,
    tone: "bg-theme-action-t text-theme-action",
    title: "Plan around your energy",
    body: "Tell us how much time and energy you've got. We'll break it into small, doable steps.",
  },
  {
    Icon: Puzzle,
    tone: "bg-theme-review-t text-theme-review",
    title: "Straight from Canvas",
    body: "One click pulls an assignment, syllabus, or lecture page in. No copying and pasting.",
  },
  {
    Icon: Eye,
    tone: "bg-theme-reflect-t text-theme-reflect",
    title: "Gentle focus check-ins",
    body: "If your attention drifts, Sprout notices and helps you find your place again.",
  },
];

export default function Homepage({ onGetStarted }) {
  return (
    <div className="py-10 sm:py-16">
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-theme-surface px-3.5 py-1.5 text-sm font-medium text-theme-accent shadow-sm">
            <span aria-hidden="true">🌱</span> Made for how ADHD brains actually study
          </p>
          <h1 className="mt-5 font-display text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl">
            Big readings,
            <br />
            made small and <span className="text-theme-accent">cozy</span>.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-theme-muted">
            Recap breaks overwhelming assignments into bite-sized pieces, and Sprout keeps you company the whole
            way through.
          </p>
          <button
            type="button"
            onClick={onGetStarted}
            className="mt-8 inline-flex cursor-pointer items-center gap-2 rounded-full bg-theme-accent px-7 py-3.5 text-lg font-medium text-theme-on-accent shadow-md hover:-translate-y-0.5 hover:shadow-lg"
          >
            Start studying
            <ArrowRight aria-hidden="true" className="size-5" />
          </button>
        </div>

        <div className="relative mx-auto w-full max-w-sm">
          <div aria-hidden="true" className="absolute inset-6 rounded-full bg-theme-accent-soft blur-2xl" />
          <div className="relative flex aspect-square items-center justify-center rounded-full bg-theme-surface/70 shadow-inner">
            <SproutArt mood="happy" className="w-3/5 animate-sprout-bob" />
          </div>
          <div className="cozy-pop absolute -left-4 top-10 rotate-[-4deg] px-4 py-2.5 text-sm">
            <span className="text-theme-muted">Today's plan</span>
            <p className="font-medium">15 min · low energy</p>
          </div>
          <div className="cozy-pop absolute -right-2 bottom-12 rotate-[3deg] px-4 py-2.5 text-sm font-medium">
            Welcome back! 🌱
          </div>
        </div>
      </section>

      <section className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {FEATURES.map(({ Icon, tone, title, body }) => (
          <div key={title} className="cozy-card p-5">
            <span className={`flex size-11 items-center justify-center rounded-2xl ${tone}`}>
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm leading-relaxed text-theme-muted">{body}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
