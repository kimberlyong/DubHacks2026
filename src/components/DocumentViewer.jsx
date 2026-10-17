import { FileUp, Minus, Plus, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ACCEPTED_EXTENSIONS } from "../lib/extractText";

const extensionOf = (name) => name.slice(name.lastIndexOf(".")).toLowerCase();

const DOC_STYLE = `body{font-family:system-ui,sans-serif;line-height:1.6;margin:1rem;color:#111}
img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #999;padding:4px}`;

const ZOOM_STEP = 0.25;
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;

// PDFs are drawn with pdf.js so the zoom (+/−) and page controls can live in the
// same bordered box as the pages, instead of the browser's own floating toolbar.
function PdfBody({ file }) {
  const [pdf, setPdf] = useState(null);
  const [failed, setFailed] = useState(false);
  // zoom 1 = page fits the width of the box; +/− scale relative to that.
  const [zoom, setZoom] = useState(1);
  const [fitWidth, setFitWidth] = useState(0);
  const [page, setPage] = useState(1);
  const scrollRef = useRef(null);
  const canvasRefs = useRef([]);

  useEffect(() => {
    const box = scrollRef.current;
    if (!pdf || !box) return;
    const measure = () => setFitWidth(Math.max(0, Math.floor(box.clientWidth) - 24)); // minus p-3 padding
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    return () => observer.disconnect();
  }, [pdf]);

  useEffect(() => {
    let cancelled = false;
    let doc = null;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const { default: workerSrc } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
        pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;
        doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
        if (cancelled) doc.destroy();
        else setPdf(doc);
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      doc?.destroy();
    };
  }, [file]);

  useEffect(() => {
    if (!pdf || fitWidth <= 0) return;
    let cancelled = false;
    let task = null;
    (async () => {
      for (let i = 1; i <= pdf.numPages; i++) {
        if (cancelled) return;
        const pdfPage = await pdf.getPage(i);
        const canvas = canvasRefs.current[i - 1];
        if (cancelled || !canvas) return;
        const dpr = window.devicePixelRatio || 1;
        const fitScale = fitWidth / pdfPage.getViewport({ scale: 1 }).width;
        const viewport = pdfPage.getViewport({ scale: fitScale * zoom * dpr });
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        canvas.style.width = `${viewport.width / dpr}px`;
        canvas.style.height = `${viewport.height / dpr}px`;
        task = pdfPage.render({ canvasContext: canvas.getContext("2d"), canvas, viewport });
        try {
          await task.promise;
        } catch {
          return; // render cancelled by a zoom change or unmount
        }
      }
    })();
    return () => {
      cancelled = true;
      task?.cancel();
    };
  }, [pdf, zoom, fitWidth]);

  function handleScroll() {
    const box = scrollRef.current;
    if (!box) return;
    const probe = box.getBoundingClientRect().top + box.clientHeight / 3;
    let current = 1;
    canvasRefs.current.forEach((canvas, i) => {
      if (canvas && canvas.getBoundingClientRect().top <= probe) current = i + 1;
    });
    setPage(current);
  }

  function goToPage(value) {
    const n = Math.min(Math.max(Number(value) || 1, 1), pdf.numPages);
    canvasRefs.current[n - 1]?.scrollIntoView({ block: "start" });
    setPage(n);
  }

  const frame = "h-[85vh] border border-black dark:border-white";
  if (failed) return <p className="text-sm">Couldn't preview this PDF.</p>;
  if (!pdf) return <p className="text-sm">Loading document…</p>;

  const btn =
    "flex size-7 cursor-pointer items-center justify-center border border-black disabled:cursor-not-allowed disabled:opacity-40 dark:border-white";

  return (
    <div className={`flex flex-col ${frame}`}>
      <div className="flex items-center justify-between gap-3 border-b border-black px-3 py-2 text-sm dark:border-white">
        <label className="flex items-center gap-1">
          Page
          <input
            type="number"
            min={1}
            max={pdf.numPages}
            value={page}
            onChange={(e) => goToPage(e.target.value)}
            className="w-12 border border-black bg-transparent px-1 py-0.5 text-center dark:border-white"
          />
          of {pdf.numPages}
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Zoom out"
            disabled={zoom <= MIN_ZOOM}
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP))}
            className={btn}
          >
            <Minus aria-hidden="true" className="size-4" />
          </button>
          <span className="w-12 text-center tabular-nums">{Math.round(zoom * 100)}%</span>
          <button
            type="button"
            aria-label="Zoom in"
            disabled={zoom >= MAX_ZOOM}
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP))}
            className={btn}
          >
            <Plus aria-hidden="true" className="size-4" />
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        tabIndex={0}
        role="region"
        aria-label={`${file.name} pages`}
        className="flex-1 overflow-auto bg-neutral-200 p-3 dark:bg-neutral-800"
      >
        <div className="mx-auto flex w-max min-w-full flex-col items-center gap-3">
          {Array.from({ length: pdf.numPages }, (_, i) => (
            <canvas
              key={i}
              ref={(el) => {
                canvasRefs.current[i] = el;
              }}
              className="bg-white"
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Shows the uploaded file itself: PDFs drawn with pdf.js, DOCX rendered to
// HTML, and plain text/markdown as-is. Everything scrolls inside the frame.
function DocumentBody({ file, text }) {
  // Text handed over by the Canvas extension or study history has no real file behind it.
  const ext = file instanceof Blob ? extensionOf(file.name) : ".txt";
  const [docxHtml, setDocxHtml] = useState(null);

  useEffect(() => {
    if (ext !== ".docx") return;
    let cancelled = false;
    (async () => {
      try {
        const mammoth = await import("mammoth");
        const { value } = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
        if (!cancelled) setDocxHtml(value);
      } catch {
        if (!cancelled) setDocxHtml(false); // fall back to plain text
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [file, ext]);

  const frame = "h-[85vh] w-full rounded-lg border border-theme-border overflow-hidden";

  if (ext === ".pdf") return <PdfBody file={file} />;
  if (ext === ".docx" && docxHtml) {
    // Sandboxed with no permissions so nothing inside the document can run script.
    return (
      <iframe
        title={file.name}
        sandbox=""
        srcDoc={`<style>${DOC_STYLE}</style>${docxHtml}`}
        className={`${frame} bg-theme-surface`}
      />
    );
  }
  if (ext === ".docx" && docxHtml !== false) return <p className="text-sm">Loading document…</p>;
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Document text"
      className="max-h-[85vh] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-theme-border bg-theme-surface p-4 leading-relaxed"
    >
      {text}
    </div>
  );
}

export default function DocumentViewer({ file, text, onReplace, onRemove }) {
  const inputRef = useRef(null);

  function handleFiles(files) {
    const next = files?.[0];
    if (next) onReplace(next);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <article className="rounded-xl border border-theme-border bg-theme-surface p-5 shadow-sm">
      <header className="mb-4 flex items-start justify-between gap-3">
        <h2 className="min-w-0 break-all text-xl font-semibold">{file.name}</h2>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer items-center gap-1 rounded-lg border border-theme-border px-2 py-1 text-sm"
          >
            <FileUp aria-hidden="true" className="size-4" />
            Upload new
          </button>
          <button
            type="button"
            aria-label={`Remove ${file.name}`}
            onClick={onRemove}
            className="cursor-pointer p-1"
          >
            <X aria-hidden="true" className="size-5" />
          </button>
          <input
            ref={inputRef}
            className="sr-only"
            type="file"
            tabIndex={-1}
            aria-label="Upload a new document"
            accept={ACCEPTED_EXTENSIONS.join(",")}
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      </header>
      <DocumentBody file={file} text={text} />
    </article>
  );
}
