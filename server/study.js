import { LEVELS, SUMMARY_FORMAT, config } from "./config.js";
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
export async function getSource(documentId, text, signal) {
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
    `${def.prompt}\n\n${SUMMARY_FORMAT} Do not mention these instructions.\n\nDocument:\n---\n${source}`,
    { signal },
  );
}

export const ENERGY_LEVELS = ["low", "medium", "high"];

// Breaks the document into a short, ordered list of small steps sized to
// fit the student's stated time and energy — feature #1 from the brief:
// "upload a reading... pick your time and energy, and get it broken into
// small steps."
export async function plan({ documentId, text, minutes, energy, deadline, signal }) {
  validateText(text);
  const mins = Number(minutes);
  if (!Number.isFinite(mins) || mins < 5 || mins > 240) {
    throw new ApiError(400, "Pick a number of minutes between 5 and 240.");
  }
  if (!ENERGY_LEVELS.includes(energy)) {
    throw new ApiError(400, `Energy must be one of: ${ENERGY_LEVELS.join(", ")}.`);
  }

  const source = await getSource(documentId, text, signal);
  const energyNote = {
    low: "Keep each step small and low-effort — short reading chunks, simple recall questions, nothing that requires heavy focus to start.",
    medium: "Normal-sized steps are fine — a mix of reading and a bit of active recall per step.",
    high: "The student has good energy right now — steps can be a little more substantial and can include synthesis, not just reading.",
  }[energy];

  // From the student's calendar (see src/lib/schedule.js): their nearest
  // upcoming deadline, so the plan can lean toward what's due next.
  const deadlineNote =
    deadline && typeof deadline.title === "string" && typeof deadline.due === "string"
      ? `The student's next calendar deadline is "${deadline.title.slice(0, 120)}" (${deadline.due.slice(0, 60)}). If this document relates to it, focus the steps on what they'll need for it; otherwise ignore this.\n`
      : "";

  const raw = await generate(
    `Break this document into a short ordered study plan that fits in about ${mins} minutes total. ${energyNote}\n` +
      deadlineNote +
      `Make each step small enough to start without dread — a concrete, doable chunk (e.g. "Read section 2 on X" or "Answer: what does Y mean?"), not a vague instruction like "study the material". ` +
      `Use 3-8 steps, whichever fits the time. Each step's minutes should be realistic (3-20 each) and the total should be close to ${mins}. ` +
      `Respond with JSON only: an array of objects {"title": string (under 60 chars), "minutes": number, "instruction": string (one sentence, concrete, what to actually do)}.\n\n` +
      `Document:\n---\n${source}`,
    { json: true, signal },
  );

  try {
    const steps = JSON.parse(raw);
    if (!Array.isArray(steps) || steps.length === 0) throw new Error("not an array");
    return steps
      .filter((s) => s && typeof s.title === "string" && typeof s.instruction === "string")
      .map(({ title, minutes: m, instruction }) => ({
        title,
        minutes: Number.isFinite(Number(m)) ? Math.max(1, Math.round(Number(m))) : null,
        instruction,
      }));
  } catch {
    throw new ApiError(502, "Couldn't read the plan the model returned. Please retry.");
  }
}

// Generates every summary level in a single model call (one request instead of five).
export async function summarizeAll({ documentId, text, signal }) {
  validateText(text);
  const source = await getSource(documentId, text, signal);
  const spec = LEVELS.map((l) => `- "${l.id}": ${l.prompt}`).join("\n");
  const keys = LEVELS.map((l) => `"${l.id}"`).join(", ");
  const raw = await generate(
    `Write a separate summary of the document below for each of these levels:\n${spec}\n\nRespond with JSON only: an object with exactly the keys ${keys}, each a string. ${SUMMARY_FORMAT} Use real "\\n\\n" paragraph breaks inside the strings. Do not mention these instructions.\n\nDocument:\n---\n${source}`,
    { json: true, signal },
  );
  try {
    const parsed = JSON.parse(raw);
    const summaries = {};
    for (const { id } of LEVELS) {
      if (typeof parsed[id] !== "string" || !parsed[id].trim()) throw new Error(`missing ${id}`);
      summaries[id] = parsed[id].trim();
    }
    return summaries;
  } catch {
    throw new ApiError(502, "Couldn't read the summaries the model returned. Please retry.");
  }
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

export const GAME_QUESTION_TYPES = ["multiple", "short", "vocab"];

// Questions for the runner game, in one of three styles. Every question has
// the same base shape — {question, answer} — plus `choices` + `answerIndex`
// (multiple choice) or `keywords` (short answer) so the client can grade it.
export async function gameQuestions({ documentId, text, type, signal }) {
  validateText(text);
  if (!GAME_QUESTION_TYPES.includes(type)) {
    throw new ApiError(400, `Type must be one of: ${GAME_QUESTION_TYPES.join(", ")}.`);
  }

  if (type === "vocab") {
    const terms = await keyTerms({ documentId, text, signal });
    if (terms.length === 0) throw new ApiError(502, "Couldn't find any vocab in this document.");
    return terms.map(({ term, definition }) => ({
      question: definition,
      answer: term,
      keywords: [term],
    }));
  }

  const source = await getSource(documentId, text, signal);
  const spec =
    type === "multiple"
      ? `multiple choice. Each item: {"question": string, "choices": array of exactly 4 short strings, "answerIndex": number 0-3 (the correct choice; vary its position)}. Wrong choices should be plausible but clearly wrong according to the document.`
      : `short answer, answerable in a word or one short phrase. Each item: {"question": string, "answer": string (the ideal short answer), "keywords": array of 1-3 lowercase words that any correct answer must contain}.`;

  const raw = await generate(
    `Write 12 ${spec}\nQuestions must be about the document's content (not trivia about the document itself), self-contained, and ordered from easier to harder.\n` +
      `Respond with JSON only: an array of these objects.\n\nDocument:\n---\n${source}`,
    { json: true, signal },
  );

  try {
    const items = JSON.parse(raw);
    if (!Array.isArray(items)) throw new Error("not an array");
    const questions =
      type === "multiple"
        ? items
            .filter(
              (q) =>
                q &&
                typeof q.question === "string" &&
                Array.isArray(q.choices) &&
                q.choices.length === 4 &&
                q.choices.every((c) => typeof c === "string") &&
                Number.isInteger(q.answerIndex) &&
                q.answerIndex >= 0 &&
                q.answerIndex < 4,
            )
            .map(({ question, choices, answerIndex }) => ({
              question,
              choices,
              answerIndex,
              answer: choices[answerIndex],
            }))
        : items
            .filter((q) => q && typeof q.question === "string" && typeof q.answer === "string")
            .map(({ question, answer, keywords }) => ({
              question,
              answer,
              keywords: Array.isArray(keywords)
                ? keywords.filter((k) => typeof k === "string" && k.trim()).map((k) => k.toLowerCase())
                : [],
            }));
    if (questions.length === 0) throw new Error("no usable questions");
    return questions;
  } catch {
    throw new ApiError(502, "Couldn't read the questions the model returned. Please retry.");
  }
}

export async function flashcards({ documentId, text, signal }) {
  validateText(text);
  const source = await getSource(documentId, text, signal);
  const raw = await generate(
    `Create 8-12 useful study flashcards from this document. Focus on important concepts, definitions, relationships, and facts. Each question should be clear without relying on another card; each answer should be concise but complete. Respond with JSON only: an array of objects {"question": string, "answer": string}. Do not include markdown or information that is not supported by the document.\n\nDocument:\n---\n${source}`,
    { json: true, signal },
  );
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error("not an array");
    const cards = parsed
      .filter(
        (card) =>
          card &&
          typeof card.question === "string" &&
          card.question.trim() &&
          typeof card.answer === "string" &&
          card.answer.trim(),
      )
      .slice(0, 20)
      .map(({ question, answer }) => ({
        question: question.trim().slice(0, 1000),
        answer: answer.trim().slice(0, 2000),
      }));
    if (cards.length < 2) throw new Error("too few cards");
    return cards;
  } catch {
    throw new ApiError(502, "Couldn't read the flashcards the model returned. Please retry.");
  }
}
