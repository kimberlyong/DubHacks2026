async function post(path, body, signal) {
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new Error("Couldn't reach the server. Check that it's running and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);
  return data;
}

export const fetchSummary = ({ documentId, text, level }, signal) =>
  post("/summarize", { documentId, text, level }, signal).then((d) => d.summary);

export const fetchAllSummaries = ({ documentId, text, fileName }, signal) =>
  post("/summarize-all", { documentId, text, fileName }, signal).then((d) => d.summaries);

export const fetchTermImages = ({ term }, signal) =>
  post("/visualize/images", { term }, signal).then((d) => d.images);

export const fetchFlowchart = ({ documentId, text }, signal) =>
  post("/visualize/flow", { documentId, text }, signal).then((d) => d.flow);

export const fetchKeyTerms = ({ documentId, text }, signal) =>
  post("/key-terms", { documentId, text }, signal).then((d) => d.terms);

export const fetchFlashcards = ({ documentId, text }, signal) =>
  post("/flashcards", { documentId, text }, signal).then((d) => d.cards);

export const fetchPlan = ({ documentId, text, minutes, energy, deadline }, signal) =>
  post("/plan", { documentId, text, minutes, energy, deadline }, signal).then((d) => d.steps);

// Apple / Outlook / Canvas / any .ics link, read by the server. Returns { name, events }.
export const fetchIcsCalendar = ({ url, from, to }, signal) =>
  post("/calendar/ics", { url, from, to }, signal);

export const fetchGameQuestions = ({ documentId, text, type, count }, signal) =>
  post("/game-questions", { documentId, text, type, count }, signal).then((d) => d.questions);

// Starts the Backboard assistant/thread for this document.
export const registerDocument = ({ documentId, fileName, text }, signal) =>
  post("/documents", { documentId, fileName, text }, signal);

export const sendChatMessage = ({ documentId, message }, signal) =>
  post("/chat", { documentId, message }, signal).then((d) => d.reply);

// Quick answer about the document, straight from Gemini. history: [{ role: "user" | "assistant", text }].
export const askQuestion = ({ documentId, text, question, history }, signal) =>
  post("/ask", { documentId, text, question, history }, signal).then((d) => d.answer);
