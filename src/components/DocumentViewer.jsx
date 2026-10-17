import { FileUp, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ACCEPTED_EXTENSIONS } from "../lib/extractText";

const extensionOf = (name) => name.slice(name.lastIndexOf(".")).toLowerCase();

const DOC_STYLE = `body{font-family:system-ui,sans-serif;line-height:1.6;margin:1rem;color:#111}
img{max-width:100%}table{border-collapse:collapse}td,th{border:1px solid #999;padding:4px}`;

// Shows the uploaded file itself: PDFs in the browser's PDF viewer, DOCX rendered to
// HTML, and plain text/markdown as-is. Everything scrolls inside the frame.
function DocumentBody({ file, text }) {
  const ext = extensionOf(file.name);
  const [pdfUrl, setPdfUrl] = useState(null);
  const [docxHtml, setDocxHtml] = useState(null);

  useEffect(() => {
    if (ext !== ".pdf") return;
    const url = URL.createObjectURL(file);
    setPdfUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file, ext]);

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

  const frame = "h-[75vh] w-full border border-theme-border";

  if (ext === ".pdf" && pdfUrl) {
    return <iframe title={file.name} src={pdfUrl} className={`${frame} bg-theme-surface`} />;
  }
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
  if (ext === ".pdf" || ext === ".docx") {
    if (docxHtml !== false && ext === ".docx") return <p className="text-sm">Loading document…</p>;
    if (ext === ".pdf") return <p className="text-sm">Loading document…</p>;
  }
  return (
    <div
      tabIndex={0}
      role="region"
      aria-label="Document text"
      className="max-h-[75vh] overflow-y-auto whitespace-pre-wrap break-words border border-theme-border bg-theme-surface p-4 leading-relaxed"
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
    <article className="border border-theme-border bg-theme-surface p-5">
      <header className="mb-4 flex items-start justify-between gap-3">
        <h2 className="min-w-0 break-all text-xl font-semibold">{file.name}</h2>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex cursor-pointer items-center gap-1 border border-theme-border px-2 py-1 text-sm"
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
