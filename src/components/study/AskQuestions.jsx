import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { askQuestion } from "../../api/client";

const STARTERS = ["What are the main ideas?", "Explain this more simply", "What might be on a test?"];

// Kept per document so switching to another tool and back keeps the chat.
const chats = new Map(); // documentId -> [{ role, text }]

// Ask anything about the reading; answers come from the document itself.
export default function AskQuestions({ documentId, text }) {
  const [messages, setMessages] = useState(() => chats.get(documentId) ?? []);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const listRef = useRef(null);
  const abortRef = useRef(null);

  useEffect(() => {
    chats.set(documentId, messages);
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [documentId, messages]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function send(question) {
    const q = question.trim();
    if (!q || busy) return;
    const history = messages;
    setMessages([...history, { role: "user", text: q }]);
    setDraft("");
    setBusy(true);
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const answer = await askQuestion({ documentId, text, question: q, history }, controller.signal);
      setMessages((current) => [...current, { role: "assistant", text: answer }]);
    } catch (err) {
      if (err.name === "AbortError") return;
      setError(err.message);
      setMessages(history); // let them resend
      setDraft(q);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div ref={listRef} className="max-h-80 space-y-2 overflow-y-auto" aria-live="polite">
        {messages.length === 0 && (
          <p className="text-sm text-theme-muted">
            Ask anything about this reading. I'll answer from the document itself.
          </p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <p
              className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm ${
                m.role === "user"
                  ? "rounded-br-sm bg-theme-accent text-theme-on-accent"
                  : "rounded-bl-sm border border-theme-border bg-theme-bg"
              }`}
            >
              {m.text}
            </p>
          </div>
        ))}
        {busy && (
          <div className="flex justify-start" role="status" aria-label="Thinking">
            <span className="flex gap-1 rounded-2xl rounded-bl-sm border border-theme-border bg-theme-bg px-3.5 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-theme-muted"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </span>
          </div>
        )}
      </div>

      {messages.length === 0 && (
        <div className="flex flex-wrap gap-2">
          {STARTERS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => send(s)}
              className="cursor-pointer rounded-full border border-theme-border px-3 py-1 text-xs hover:bg-theme-border/20"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-sm text-theme-urgent">{error}</p>}

      <form
        onSubmit={(event) => {
          event.preventDefault();
          send(draft);
        }}
        className="flex gap-2"
      >
        <label htmlFor="ask-input" className="sr-only">
          Your question
        </label>
        <input
          id="ask-input"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about the reading…"
          maxLength={2000}
          className="min-w-0 flex-1 rounded-lg border border-theme-border bg-transparent px-3 py-2 text-sm"
        />
        <button
          type="submit"
          aria-label="Send question"
          disabled={busy || !draft.trim()}
          className="flex shrink-0 cursor-pointer items-center rounded-lg bg-theme-accent px-3 text-theme-on-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Send aria-hidden="true" className="size-4" />
        </button>
      </form>
    </div>
  );
}
