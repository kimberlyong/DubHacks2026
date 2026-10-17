import { config } from "./config.js";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Upstream statuses worth retrying or falling back on (overloaded, rate-limited, flaky).
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

// Model -> timestamp until which we skip it after it reported overloaded.
const coolingUntil = new Map();

class UpstreamError extends Error {
  constructor(status, body) {
    super(`Gemini responded ${status}`);
    this.status = status;
    this.body = body;
  }
}

function sleep(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(signal.reason ?? new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

// Main model first, then fallbacks; models still cooling down go to the back.
function modelOrder() {
  const models = [...new Set([config.geminiModel, ...config.geminiFallbackModels])];
  const now = Date.now();
  const ready = models.filter((m) => !(coolingUntil.get(m) > now));
  const cooling = models.filter((m) => coolingUntil.get(m) > now);
  return [...ready, ...cooling];
}

async function callModel(model, key, prompt, json, signal) {
  let res;
  try {
    res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: json ? { responseMimeType: "application/json" } : {},
      }),
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new UpstreamError(503, String(err)); // network failure: treat like overloaded
  }

  if (!res.ok) throw new UpstreamError(res.status, await res.text());

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) {
    throw new ApiError(502, "Gemini returned no content (the response may have been blocked).");
  }
  return text;
}

// Calls the Gemini REST API (generateContent). Key stays on the server.
// Retries briefly on overload, then falls back through config.geminiFallbackModels.
export async function generate(prompt, { json = false, signal } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ApiError(500, "Server is missing GEMINI_API_KEY.");

  for (const model of modelOrder()) {
    for (let attempt = 0; attempt <= config.geminiRetries; attempt++) {
      try {
        const text = await callModel(model, key, prompt, json, signal);
        coolingUntil.delete(model);
        if (model !== config.geminiModel) console.warn(`[gemini] served by fallback model ${model}`);
        return text;
      } catch (err) {
        if (!(err instanceof UpstreamError)) throw err;
        if (err.status === 400 && err.body.includes("token")) {
          throw new ApiError(413, "This document is too large for the model to process.");
        }
        if (err.status === 404) break; // model id not available: try the next one
        if (!RETRYABLE.has(err.status)) throw new ApiError(502, `Gemini request failed (${err.status}).`);

        if (attempt < config.geminiRetries) {
          await sleep(500 * 2 ** attempt + Math.random() * 250, signal);
        } else {
          coolingUntil.set(model, Date.now() + config.geminiCooldownMs);
          console.warn(`[gemini] ${model} unavailable (${err.status}), trying next model`);
        }
      }
    }
  }

  throw new ApiError(429, "Gemini is busy right now. Please try again shortly.");
}
