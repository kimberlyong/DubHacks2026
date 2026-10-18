import { RotateCcw } from "lucide-react";

// Renders the light markup the server asks for (see SUMMARY_FORMAT in server/config.js):
// blank-line paragraphs, "## " headings, "- " bullets, **bold** and __underline__.
// Built as React elements, never injected as HTML, so model output can't run anything.
function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|__[^_]+__)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
      return (
        <strong key={i} className="font-semibold">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("__") && part.endsWith("__") && part.length > 4) {
      return (
        <span key={i} className="underline decoration-theme-accent decoration-2 underline-offset-4">
          {part.slice(2, -2)}
        </span>
      );
    }
    return part;
  });
}

function parseBlocks(summary) {
  const blocks = [];
  for (const chunk of summary.replace(/\r\n/g, "\n").split(/\n{2,}/)) {
    let paragraph = [];
    let bullets = [];
    const flush = () => {
      if (paragraph.length) blocks.push({ type: "p", text: paragraph.join(" ") });
      if (bullets.length) blocks.push({ type: "ul", items: bullets });
      paragraph = [];
      bullets = [];
    };
    for (const raw of chunk.split("\n")) {
      const line = raw.trim();
      if (!line) continue;
      const heading = line.match(/^#{1,4}\s+(.*)$/);
      const bullet = line.match(/^[-*•]\s+(.*)$/);
      if (heading) {
        flush();
        blocks.push({ type: "h", text: heading[1] });
      } else if (bullet) {
        if (paragraph.length) flush();
        bullets.push(bullet[1]);
      } else {
        if (bullets.length) flush();
        paragraph.push(line);
      }
    }
    flush();
  }
  return blocks;
}

export default function SummaryDisplay({ status, summary, error, onRetry }) {
  if (status === "loading") {
    return (
      <div role="status" aria-label="Generating summary" className="animate-pulse space-y-3 motion-reduce:animate-none">
        <div className="h-4 w-full bg-theme-border" />
        <div className="h-4 w-11/12 bg-theme-border" />
        <div className="h-4 w-full bg-theme-border" />
        <div className="h-4 w-2/3 bg-theme-border" />
      </div>
    );
  }

  if (status === "error") {
    return (
      <div role="alert" className="rounded-lg border border-theme-urgent bg-theme-urgent-t p-4">
        <p className="text-theme-urgent">{error}</p>
        <button
          type="button"
          className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-theme-border px-3 py-1"
          onClick={onRetry}
        >
          <RotateCcw aria-hidden="true" className="size-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4 leading-relaxed">
      {parseBlocks(summary ?? "").map((block, i) => {
        if (block.type === "h") {
          return (
            <h3 key={i} className="pt-2 text-lg font-semibold">
              {renderInline(block.text)}
            </h3>
          );
        }
        if (block.type === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1.5 pl-5 marker:text-theme-accent">
              {block.items.map((item, j) => (
                <li key={j}>{renderInline(item)}</li>
              ))}
            </ul>
          );
        }
        return <p key={i}>{renderInline(block.text)}</p>;
      })}
    </div>
  );
}
