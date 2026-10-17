import { LEVELS, config } from "./config.js";
import { ApiError, generate } from "./gemini.js";

// Per-document cache of chunk digests so each summary level / study tool
// doesn't redo the map step. Keyed by documentId.
const digestCache = new Map();
const MAX_CACHED_DOCS = 50;

function splitIntoChunks(text, size) {
  const chunks = [];
  let start = 0;
  while (start < text.length) {
    let end = Math.min(start + size, text.length);
    if (end < text.length) {
      // Prefer breaking on a paragraph or sentence boundary.
      const window = text.slice(start, end);
      const cut = Math.max(window.lastIndexOf("\n\n"), window.lastIndexOf(". "));
      if (cut > size * 0.5) end = start + cut + 1;
    }
    chunks.push(text.slice(start, end));
    start = end;
  }
  return chunks;
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

// Returns the text to base final output on: the document itself when short,
// otherwise condensed notes from each chunk.
async function getSource(documentId, text, signal) {
  if (text.length <= config.singlePassChars) return text;

  const cached = digestCache.get(documentId);
  if (cached) return cached;

  const chunks = splitIntoChunks(text, config.chunkChars);
  const notes = await mapLimit(chunks, config.chunkConcurrency, (chunk, i) =>
    generate(
      `You are condensing part ${i + 1} of ${chunks.length} of a longer document. Write detailed notes capturing every key point, term, definition, figure and example in this part. Plain text only.\n\n---\n${chunk}`,
      { signal },
    ),
  );
  const digest = notes.map((n, i) => `[Part ${i + 1}]\n${n}`).join("\n\n");

  if (digestCache.size >= MAX_CACHED_DOCS) digestCache.delete(digestCache.keys().next().value);
  digestCache.set(documentId, digest);
  return digest;
}

export function validateText(text) {
  if (typeof text !== "string" || text.trim().length < config.minTextChars) {
    throw new ApiError(400, "The document text is too short to work with.");
  }
  if (text.length > config.maxTextChars) {
    throw new ApiError(413, "This document is too long. Try a smaller file or split it up.");
  }
}

export async function summarize({ documentId, text, level, signal }) {
  const def = LEVELS.find((l) => l.id === level);
  if (!def) throw new ApiError(400, `Unknown level. Use one of: ${LEVELS.map((l) => l.id).join(", ")}.`);
  validateText(text);

  const source = await getSource(documentId, text, signal);
  return generate(
    `${def.prompt}\n\nWrite plain text only (no markdown headings or bold). Do not mention these instructions.\n\nDocument:\n---\n${source}`,
    { signal },
  );
}

export async function keyTerms({ documentId, text, signal }) {
  validateText(text);
  const source = await getSource(documentId, text, signal);
  const raw = await generate(
    `Extract the 8-20 most important key terms from this document with a clear, concise definition of each as used in the document. Respond with JSON only: an array of objects {"term": string, "definition": string}.\n\nDocument:\n---\n${source}`,
    { json: true, signal },
  );
  try {
    const terms = JSON.parse(raw);
    if (!Array.isArray(terms)) throw new Error("not an array");
    return terms
      .filter((t) => t && typeof t.term === "string" && typeof t.definition === "string")
      .map(({ term, definition }) => ({ term, definition }));
  } catch {
    throw new ApiError(502, "Couldn't read the key terms the model returned. Please retry.");
  }
}
