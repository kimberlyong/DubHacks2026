import { ArrowDown, Search, Workflow } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { fetchFlowchart, fetchTermImages } from "../../api/client";
import { useKeyTerms } from "../../hooks/useKeyTerms";

function TermImages({ documentId, text }) {
  const { terms } = useKeyTerms({ documentId, text });
  const [input, setInput] = useState("");
  const [state, setState] = useState({ status: "idle", term: "", images: [], error: null });
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function search(raw) {
    const term = raw.trim();
    if (!term) return;
    setInput(term);
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "loading", term, images: [], error: null });
    try {
      const images = await fetchTermImages({ term }, controller.signal);
      setState({ status: "done", term, images, error: null });
    } catch (err) {
      if (err.name !== "AbortError") setState({ status: "error", term, images: [], error: err.message });
    }
  }

  return (
    <section aria-label="Term images" className="space-y-3">
      <h4 className="font-semibold">See a term</h4>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          search(input);
        }}
      >
        <input
          type="text"
          value={input}
          maxLength={100}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a term from your document"
          aria-label="Term to look up"
          className="w-full min-w-0 rounded-full border border-theme-border bg-theme-surface-2 px-4 py-2 text-theme-text"
        />
        <button
          type="submit"
          className="flex shrink-0 cursor-pointer items-center gap-1 rounded-full bg-theme-accent px-4 py-2 text-theme-on-accent"
        >
          <Search aria-hidden="true" className="size-4" />
          Find
        </button>
      </form>

      {terms?.length > 0 && (
        <div className="flex flex-wrap gap-2" aria-label="Key terms from the document">
          {terms.map(({ term }) => (
            <button
              key={term}
              type="button"
              onClick={() => search(term)}
              className="cursor-pointer rounded-full bg-theme-surface-2 px-3 py-1 text-sm hover:bg-theme-accent-soft"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {state.status === "loading" && <p className="text-sm">Searching for “{state.term}”…</p>}
        {state.status === "error" && (
          <p role="alert" className="text-sm text-theme-urgent">
            {state.error}
          </p>
        )}
        {state.status === "done" && state.images.length === 0 && (
          <p className="text-sm">No images found for “{state.term}”. Try a simpler or more general term.</p>
        )}
      </div>

      {state.images.length > 0 && (
        <ul className="grid grid-cols-2 gap-3">
          {state.images.map((img) => (
            <li key={img.url} className="rounded-2xl border border-theme-border p-2 text-xs">
              <a href={img.pageUrl} target="_blank" rel="noreferrer">
                <img src={img.url} alt={img.title} loading="lazy" className="h-32 w-full rounded-xl bg-white object-contain" />
              </a>
              <p className="mt-1 break-words">{img.title}</p>
              <p className="break-words text-theme-muted">
                {img.credit}
                {img.license ? ` · ${img.license}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-theme-muted">Images from Wikimedia Commons.</p>
    </section>
  );
}

function Flowchart({ documentId, text }) {
  const [state, setState] = useState({ status: "idle", flow: null, error: null });
  const controllerRef = useRef(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  async function build() {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: "loading", flow: null, error: null });
    try {
      const flow = await fetchFlowchart({ documentId, text }, controller.signal);
      setState({ status: "done", flow, error: null });
    } catch (err) {
      if (err.name !== "AbortError") setState({ status: "error", flow: null, error: err.message });
    }
  }

  const { status, flow, error } = state;

  return (
    <section aria-label="Flowchart" className="space-y-3">
      <h4 className="font-semibold">How it works</h4>
      <button
        type="button"
        onClick={build}
        disabled={status === "loading"}
        className="flex cursor-pointer items-center gap-2 rounded-full bg-theme-surface-2 px-4 py-1.5 hover:bg-theme-accent-soft disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Workflow aria-hidden="true" className="size-4" />
        {status === "loading" ? "Building…" : flow ? "Rebuild flowchart" : "Build a flowchart"}
      </button>
      <div aria-live="polite">
        {status === "error" && (
          <p role="alert" className="text-sm text-theme-urgent">
            {error}
          </p>
        )}
        {status === "done" && !flow.isProcess && (
          <p className="text-sm">This document doesn’t seem to describe a process or system, so there’s nothing to chart.</p>
        )}
      </div>
      {flow?.isProcess && (
        <div>
          {flow.title && <p className="mb-2 font-medium">{flow.title}</p>}
          <ol className="flex flex-col items-stretch">
            {flow.steps.map((step, i) => (
              <li key={i} className="flex flex-col items-center">
                <div className="w-full rounded-2xl border border-theme-border bg-theme-surface p-3">
                  <p className="font-semibold">
                    {i + 1}. {step.label}
                  </p>
                  {step.detail && <p className="text-sm text-theme-muted">{step.detail}</p>}
                </div>
                {i < flow.steps.length - 1 && <ArrowDown aria-hidden="true" className="my-1 size-5" />}
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}

export default function Visualizer({ documentId, text }) {
  return (
    <div className="space-y-6">
      <TermImages documentId={documentId} text={text} />
      <Flowchart documentId={documentId} text={text} />
    </div>
  );
}
