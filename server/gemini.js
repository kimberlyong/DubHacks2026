import { config } from "./config.js";

export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Calls the Gemini REST API (generateContent). Key stays on the server.
export async function generate(prompt, { json = false, signal } = {}) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new ApiError(500, "Server is missing GEMINI_API_KEY.");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.geminiModel}:generateContent`,
    {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: json ? { responseMimeType: "application/json" } : {},
      }),
    },
  );

  if (!res.ok) {
    if (res.status === 429) throw new ApiError(429, "Gemini is busy right now. Please try again shortly.");
    if (res.status === 400 && (await res.text()).includes("token")) {
      throw new ApiError(413, "This document is too large for the model to process.");
    }
    throw new ApiError(502, `Gemini request failed (${res.status}).`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("").trim();
  if (!text) {
    throw new ApiError(502, "Gemini returned no content (the response may have been blocked).");
  }
  return text;
}
