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
          className="w-full min-w-0 border border-black bg-white px-2 py-1 text-black dark:border-white dark:bg-black dark:text-white"
        />
        <button
          type="submit"
          className="flex cursor-pointer items-center gap-1 border border-black bg-black px-3 py-1 text-white dark:border-white dark:bg-white dark:text-black"
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
              className="cursor-pointer border border-black px-2 py-0.5 text-sm hover:bg-neutral-100 dark:border-white dark:hover:bg-neutral-900"
            >
              {term}
            </button>
          ))}
        </div>
      )}

      <div aria-live="polite">
        {state.status === "loading" && <p className="text-sm">Searching for “{state.term}”…</p>}
        {state.status === "error" && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
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
            <li key={img.url} className="border border-black p-2 text-xs dark:border-white">
              <a href={img.pageUrl} target="_blank" rel="noreferrer">
                <img src={img.url} alt={img.title} loading="lazy" className="h-32 w-full bg-white object-contain" />
              </a>
              <p className="mt-1 break-words">{img.title}</p>
              <p className="break-words text-neutral-600 dark:text-neutral-300">
                {img.credit}
                {img.license ? ` · ${img.license}` : ""}
              </p>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-neutral-600 dark:text-neutral-300">Images from Wikimedia Commons.</p>
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
        className="flex cursor-pointer items-center gap-2 border border-black px-3 py-1 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-white dark:hover:bg-neutral-900"
      >
        <Workflow aria-hidden="true" className="size-4" />
        {status === "loading" ? "Building…" : flow ? "Rebuild flowchart" : "Build a flowchart"}
      </button>
      <div aria-live="polite">
        {status === "error" && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
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
                <div className="w-full border border-black p-3 dark:border-white">
                  <p className="font-semibold">
                    {i + 1}. {step.label}
                  </p>
                  {step.detail && <p className="text-sm text-neutral-700 dark:text-neutral-300">{step.detail}</p>}
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
