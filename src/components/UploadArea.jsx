import { FileUp, Loader2 } from "lucide-react";
import { useRef, useState } from "react";
import { ACCEPTED_EXTENSIONS } from "../lib/extractText";

export default function UploadArea({ file, status, error, onSelect }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files) {
    const next = files?.[0];
    if (next) onSelect(next);
    if (inputRef.current) inputRef.current.value = ""; // allow re-selecting the same file
  }

  return (
    <div>
      <div
        className={`flex flex-col items-center rounded-3xl border-2 border-dashed px-6 py-12 text-center ${
          dragging ? "border-theme-accent bg-theme-accent-soft" : "border-theme-border bg-theme-surface-2/60"
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
        <span className="flex size-16 items-center justify-center rounded-full bg-theme-accent-soft text-theme-accent">
          {status === "extracting" ? (
            <Loader2 aria-hidden="true" className="size-7 animate-spin motion-reduce:animate-none" />
          ) : (
            <FileUp aria-hidden="true" className="size-7" />
          )}
        </span>
        <p className="mt-4 font-display text-xl font-semibold">
          {status === "extracting" ? `Reading ${file?.name ?? "your file"}…` : "Drop a reading here"}
        </p>
        <p className="mt-1 text-sm text-theme-muted">A PDF, Word doc, or text file, up to 10 MB</p>
        <button
          type="button"
          disabled={status === "extracting"}
          className="mt-5 cursor-pointer rounded-full bg-theme-accent px-6 py-2.5 font-medium text-theme-on-accent shadow-sm hover:-translate-y-0.5 hover:shadow-md disabled:cursor-wait disabled:opacity-60"
          onClick={() => inputRef.current?.click()}
        >
          Choose a file
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
      </div>

      {status === "error" && (
        <p role="alert" className="mt-3 rounded-2xl bg-theme-urgent-t px-4 py-2.5 text-sm text-theme-urgent">
          {error}
        </p>
      )}
    </div>
  );
}
