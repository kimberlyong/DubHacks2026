import express from "express";
import { config } from "./config.js";
import { ApiError } from "./gemini.js";
import { chat, registerDocument } from "./backboard.js";
import { keyTerms, summarize, summarizeAll, validateText } from "./study.js";

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
  const { documentId, text } = req.body ?? {};
  requireId(documentId);
  return { summaries: await summarizeAll({ documentId, text, signal: abortOnClose(req, res) }) };
}));

app.post("/api/key-terms", route(async (req, res) => {
  const { documentId, text } = req.body ?? {};
  requireId(documentId);
  return { terms: await keyTerms({ documentId, text, signal: abortOnClose(req, res) }) };
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

app.listen(config.port, () => console.log(`API listening on http://localhost:${config.port}`));
