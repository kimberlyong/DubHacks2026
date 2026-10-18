import { FileText, Loader2, X } from "lucide-react";
import { useRef, useState } from "react";
import { ACCEPTED_EXTENSIONS } from "../lib/extractText";

export default function UploadArea({ file, status, error, onSelect, onRemove }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files) {
    const next = files?.[0];
    if (next) onSelect(next);
    if (inputRef.current) inputRef.current.value = ""; // allow re-selecting the same file
  }

  return (
    <div className="w-full">
      <div
        className={`flex flex-col items-center gap-2 rounded-lg text-center text-sm ${
          dragging ? "bg-theme-border/20" : ""
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
      >
        <p>Drag a file here, or</p>
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-theme-accent bg-theme-accent px-3 py-2 text-theme-on-accent"
          onClick={() => inputRef.current?.click()}
        >
          {file ? "Replace file" : "Choose a file"}
        </button>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          tabIndex={-1}
          aria-label="Upload a document"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-sm text-theme-muted">PDF, DOCX, TXT, or MD · up to 10 MB</p>
      </div>

      <div aria-live="polite" className="mt-3 text-sm">
        {status === "extracting" && (
          <p className="flex items-center gap-2">
            <Loader2 aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" />
            Reading {file?.name}…
          </p>
        )}
        {status === "error" && (
          <p role="alert" className="rounded-lg bg-theme-urgent-t px-3 py-2 text-theme-urgent">
            {error}
          </p>
        )}
        {status === "ready" && file && (
          <p className="flex items-center gap-2">
            <FileText aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 break-all">{file.name}</span>
            <button
              type="button"
              className="ml-auto shrink-0 cursor-pointer p-1"
              aria-label={`Remove ${file.name}`}
              onClick={onRemove}
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
