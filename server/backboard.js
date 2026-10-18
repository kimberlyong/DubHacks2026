import { createHash } from "crypto";
import { config } from "./config.js";
import { ApiError } from "./gemini.js";

// Backboard layer: one assistant + one thread per uploaded document. The
// document text is uploaded to the thread so chat answers can use it.
// Docs: https://docs.backboard.io  (auth via X-API-Key header)

const sessions = new Map(); // documentId -> Promise<{ threadId }>

async function bb(path, init = {}) {
  const key = process.env.BACKBOARD_API_KEY;
  if (!key) throw new ApiError(500, "Server is missing BACKBOARD_API_KEY.");
  const res = await fetch(`${config.backboardBaseUrl}${path}`, {
    ...init,
    headers: { "X-API-Key": key, ...init.headers },
  });
  if (!res.ok) throw new ApiError(502, `Backboard request failed (${res.status}) on ${path}.`);
  return res.json();
}

async function createSession(fileName, text) {
  const assistant = await bb("/assistants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      name: `Study: ${fileName}`.slice(0, 255),
      system_prompt:
        "You are a study assistant. Answer questions about the uploaded document. If the answer isn't in the document, say so.",
    }),
  });
  const thread = await bb(`/assistants/${assistant.assistant_id}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });

  const form = new FormData();
  form.append("file", new Blob([text], { type: "text/plain" }), "document.txt");
  const doc = await bb(`/threads/${thread.thread_id}/documents`, { method: "POST", body: form });

  // Messages are only allowed once the document is indexed.
  for (let i = 0; i < 60; i++) {
    const { status, status_message } = await bb(`/documents/${doc.document_id}/status`);
    if (status === "indexed") return { threadId: thread.thread_id };
    if (status === "error") throw new ApiError(502, `Backboard couldn't index the document: ${status_message ?? "unknown error"}`);
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new ApiError(504, "Backboard took too long to index the document.");
}

// Saved summaries: stored as memories on one shared "library" assistant, keyed
// by a hash of the document text, so reopening a past file shows the same
// summaries instead of regenerating them. Best-effort: any Backboard failure
// just means the summaries get generated fresh.
const LIBRARY_NAME = "Recap summary library";
const KIND = "summaries";
let libraryId = null;
const savedCache = new Map(); // docKey -> summaries

export function documentKey(text) {
  return createHash("sha256").update(text.slice(0, config.historyTextChars)).digest("hex");
}

async function getLibraryId() {
  if (libraryId) return libraryId;
  const list = await bb("/assistants");
  const items = Array.isArray(list) ? list : (list.assistants ?? []);
  const found = items.find((a) => a.name === LIBRARY_NAME);
  if (found) return (libraryId = found.assistant_id);
  const created = await bb("/assistants", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: LIBRARY_NAME, system_prompt: "Storage for saved study summaries." }),
  });
  return (libraryId = created.assistant_id);
}

export async function loadSavedSummaries(docKey) {
  if (savedCache.has(docKey)) return savedCache.get(docKey);
  if (!process.env.BACKBOARD_API_KEY) return null;
  try {
    const id = await getLibraryId();
    for (let page = 1; ; page++) {
      const { memories = [], total_pages } = await bb(`/assistants/${id}/memories?page=${page}&page_size=100`);
      const hit = memories.find((m) => m.metadata?.kind === KIND && m.metadata?.docKey === docKey);
      if (hit) {
        const summaries = JSON.parse(hit.content);
        savedCache.set(docKey, summaries);
        return summaries;
      }
      if (!total_pages || page >= total_pages) return null;
    }
  } catch {
    return null;
  }
}

export async function saveSummaries(docKey, fileName, summaries) {
  savedCache.set(docKey, summaries);
  if (!process.env.BACKBOARD_API_KEY) return;
  try {
    const id = await getLibraryId();
    await bb(`/assistants/${id}/memories`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: JSON.stringify(summaries),
        metadata: { kind: KIND, docKey, fileName: String(fileName ?? "").slice(0, 200) },
      }),
    });
  } catch (err) {
    console.error("Couldn't save summaries to Backboard:", err.message);
  }
}

export function registerDocument(documentId, fileName, text) {
  const session = createSession(fileName, text);
  session.catch(() => {}); // surfaced when chat awaits it; avoid unhandled rejection
  sessions.set(documentId, session);
}

export async function chat(documentId, message) {
  const session = sessions.get(documentId);
  if (!session) throw new ApiError(404, "This document session expired. Please upload the file again.");
  const { threadId } = await session;

  const form = new URLSearchParams({
    content: message,
    llm_provider: "google",
    model_name: config.backboardModel,
    memory: "Auto",
    stream: "false",
  });
  const reply = await bb(`/threads/${threadId}/messages`, { method: "POST", body: form });
  return reply.content ?? "";
}
