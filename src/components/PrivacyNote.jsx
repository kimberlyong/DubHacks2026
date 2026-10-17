import { useState } from "react";

// Honest, specific privacy copy — describes what the code actually does,
// not generic reassurance. Shown on sign-in so it's the first thing a
// student sees before they hand over a reading.
export default function PrivacyNote() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-5 rounded-xl border border-black/10 bg-black/[0.02] p-4 text-sm dark:border-white/10 dark:bg-white/[0.03]">
      <p className="font-medium">🔒 Your files aren't collected or sold.</p>
      <p className="mt-1 text-neutral-600 dark:text-neutral-300">
        Reading and summarizing happens for your session only.{" "}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="cursor-pointer bg-transparent p-0 font-medium text-accent-dark underline dark:text-accent"
        >
          {open ? "Hide details" : "See exactly what happens to your data"}
        </button>
      </p>
      {open && (
        <ul className="mt-3 list-disc space-y-1.5 pl-4 text-neutral-600 dark:text-neutral-300">
          <li>Your file is read inside your browser — it's never uploaded as a file.</li>
          <li>The extracted text is sent to Gemini only to generate your summary, key terms, or answers.</li>
          <li>History and settings (theme, text size, recent files) live only in your browser's local storage — we never see them.</li>
          <li>Content pulled in from the Canvas extension sits on the server for up to 10 minutes and is deleted the moment it's loaded.</li>
          <li>Nothing is logged, stored in a database, or shared with anyone else.</li>
        </ul>
      )}
    </div>
  );
}
