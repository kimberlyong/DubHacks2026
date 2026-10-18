import { randomUUID } from "crypto";
import express from "express";
import { config } from "./config.js";
import { ApiError } from "./gemini.js";
import { chat, documentKey, loadSavedSummaries, registerDocument, saveSummaries } from "./backboard.js";
import { readIcsCalendar } from "./calendar.js";
import { buildFlowchart, findImages } from "./visualize.js";
import { ask, flashcards, gameQuestions, keyTerms, plan, summarize, summarizeAll, validateText } from "./study.js";

const app = express();
app.use(express.json({ limit: "3mb" }));

// Simple in-memory sliding-window rate limit per IP.
const hits = new Map();
app.use("/api", (req, res, next) => {
  const now = Date.now();
  const recent = (hits.get(req.ip) ?? []).filter((t) => now - t < config.rateLimit.windowMs);
  if (recent.length >= config.rateLimit.max) {
    res.status(429).json({ error: "Too many requests. Please wait a moment and try again." });
    return;
  }
  recent.push(now);
  hits.set(req.ip, recent);
  next();
});
setInterval(() => hits.clear(), config.rateLimit.windowMs * 10).unref();

// Abort upstream work when the browser cancels the request.
function abortOnClose(req, res) {
  const controller = new AbortController();
  res.on("close", () => {
    if (!res.writableFinished) controller.abort();
  });
  return controller.signal;
}

const route = (fn) => async (req, res) => {
  try {
    res.json(await fn(req, res));
  } catch (err) {
    if (err.name === "AbortError") return;
    const status = err instanceof ApiError ? err.status : 500;
    if (status === 500 && !(err instanceof ApiError)) console.error(err);
    res.status(status).json({ error: err instanceof ApiError ? err.message : "Something went wrong." });
  }
};

function requireId(id) {
  if (typeof id !== "string" || !id || id.length > 100) throw new ApiError(400, "Missing documentId.");
}

app.post("/api/summarize", route(async (req, res) => {
  const { documentId, text, level } = req.body ?? {};
  requireId(documentId);
  return { summary: await summarize({ documentId, text, level, signal: abortOnClose(req, res) }) };
}));

app.post("/api/summarize-all", route(async (req, res) => {
  const { documentId, text, fileName } = req.body ?? {};
  requireId(documentId);
  validateText(text);
  const docKey = documentKey(text);
  const saved = await loadSavedSummaries(docKey);
  if (saved) return { summaries: saved };
  const summaries = await summarizeAll({ documentId, text, signal: abortOnClose(req, res) });
  await saveSummaries(docKey, fileName, summaries);
  return { summaries };
}));

app.post("/api/visualize/images", route(async (req, res) => {
  const { term } = req.body ?? {};
  return { images: await findImages(term, abortOnClose(req, res)) };
}));

app.post("/api/visualize/flow", route(async (req, res) => {
  const { documentId, text } = req.body ?? {};
  requireId(documentId);
  return { flow: await buildFlowchart({ documentId, text, signal: abortOnClose(req, res) }) };
}));

app.post("/api/key-terms", route(async (req, res) => {
  const { documentId, text } = req.body ?? {};
  requireId(documentId);
  return { terms: await keyTerms({ documentId, text, signal: abortOnClose(req, res) }) };
}));

app.post("/api/flashcards", route(async (req, res) => {
  const { documentId, text } = req.body ?? {};
  requireId(documentId);
  return { cards: await flashcards({ documentId, text, signal: abortOnClose(req, res) }) };
}));

app.post("/api/plan", route(async (req, res) => {
  const { documentId, text, minutes, energy, deadline } = req.body ?? {};
  requireId(documentId);
  return { steps: await plan({ documentId, text, minutes, energy, deadline, signal: abortOnClose(req, res) }) };
}));

app.post("/api/ask", route(async (req, res) => {
  const { documentId, text, question, history } = req.body ?? {};
  requireId(documentId);
  return { answer: await ask({ documentId, text, question, history, signal: abortOnClose(req, res) }) };
}));

// Reads an Apple / Outlook / Canvas / any .ics calendar link for the given range.
app.post("/api/calendar/ics", route(async (req, res) => {
  const { url, from, to } = req.body ?? {};
  return await readIcsCalendar({ url, from, to, signal: abortOnClose(req, res) });
}));

app.post("/api/game-questions", route(async (req, res) => {
  const { documentId, text, type } = req.body ?? {};
  requireId(documentId);
  return { questions: await gameQuestions({ documentId, text, type, signal: abortOnClose(req, res) }) };
}));

// Starts a Backboard assistant + thread for the document (runs in the background).
app.post("/api/documents", route(async (req) => {
  const { documentId, fileName, text } = req.body ?? {};
  requireId(documentId);
  validateText(text);
  registerDocument(documentId, String(fileName ?? "document").slice(0, 200), text);
  return { ok: true };
}));

app.post("/api/chat", route(async (req) => {
  const { documentId, message } = req.body ?? {};
  requireId(documentId);
  if (typeof message !== "string" || !message.trim() || message.length > 4000) {
    throw new ApiError(400, "Enter a question (up to 4000 characters).");
  }
  return { reply: await chat(documentId, message.trim()) };
}));

// Handoff for the Canvas extension: it POSTs extracted page text here, then
// opens the web app with the returned id so the app can pick it up. The
// extension runs as a chrome-extension:// origin, so these two routes alone
// allow cross-origin requests; everything else still requires same-origin.
const EXTRACT_TTL_MS = 10 * 60_000;
const extracted = new Map(); // id -> { fileName, text, expiresAt }

app.use("/api/extract", (req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Content-Type");
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.post("/api/extract", route(async (req) => {
  const { fileName, text } = req.body ?? {};
  validateText(text);
  const id = randomUUID();
  for (const [key, value] of extracted) if (value.expiresAt < Date.now()) extracted.delete(key);
  extracted.set(id, { fileName: String(fileName ?? "Canvas page").slice(0, 200), text, expiresAt: Date.now() + EXTRACT_TTL_MS });
  return { id };
}));

app.get("/api/extract/:id", route(async (req) => {
  const entry = extracted.get(req.params.id);
  if (!entry || entry.expiresAt < Date.now()) {
    extracted.delete(req.params.id);
    throw new ApiError(404, "This extracted page has expired. Try extracting it again.");
  }
  extracted.delete(req.params.id); // one-time pickup
  return { fileName: entry.fileName, text: entry.text };
}));

app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
