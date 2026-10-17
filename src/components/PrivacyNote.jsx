import { ShieldCheck } from "lucide-react";
import { useState } from "react";

// Honest, specific privacy copy: describes what the code actually does,
// not generic reassurance. Shown on sign-in, before a student hands over a reading.
export default function PrivacyNote() {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-6 rounded-3xl bg-theme-action-t p-5 text-sm">
      <p className="flex items-center gap-2 font-medium">
        <ShieldCheck aria-hidden="true" className="size-5 text-theme-action" />
        Your readings stay yours. Nothing is collected or sold.
      </p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="mt-2 cursor-pointer bg-transparent p-0 text-theme-action underline underline-offset-2"
      >
        {open ? "Hide the details" : "See exactly what happens to your data"}
      </button>
      {open && (
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-theme-muted">
          <li>Your file is read inside your browser. It's never uploaded as a file.</li>
          <li>The text is sent to Gemini only to make your summary, plan, key terms, or answers.</li>
          <li>Your history and settings live only in this browser. We never see them.</li>
          <li>Pages from the Canvas extension wait on the server for at most 10 minutes, then they're deleted.</li>
          <li>Nothing is logged, stored in a database, or shared.</li>
          <li>Camera check-ins are optional, off by default, and run entirely on your device.</li>
        </ul>
      )}
    </div>
  );
}
