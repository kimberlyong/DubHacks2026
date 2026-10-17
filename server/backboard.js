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
