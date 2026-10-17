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

export const fetchAllSummaries = ({ documentId, text }, signal) =>
  post("/summarize-all", { documentId, text }, signal).then((d) => d.summaries);

export const fetchTermImages = ({ term }, signal) =>
  post("/visualize/images", { term }, signal).then((d) => d.images);

export const fetchFlowchart = ({ documentId, text }, signal) =>
  post("/visualize/flow", { documentId, text }, signal).then((d) => d.flow);

export const fetchKeyTerms = ({ documentId, text }, signal) =>
  post("/key-terms", { documentId, text }, signal).then((d) => d.terms);

export const fetchFlashcards = ({ documentId, text }, signal) =>
  post("/flashcards", { documentId, text }, signal).then((d) => d.cards);

export const fetchPlan = ({ documentId, text, minutes, energy }, signal) =>
  post("/plan", { documentId, text, minutes, energy }, signal).then((d) => d.steps);

// Starts the Backboard assistant/thread for this document.
export const registerDocument = ({ documentId, fileName, text }, signal) =>
  post("/documents", { documentId, fileName, text }, signal);

export const sendChatMessage = ({ documentId, message }, signal) =>
  post("/chat", { documentId, message }, signal).then((d) => d.reply);
