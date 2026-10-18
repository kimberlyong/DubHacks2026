// Summary levels. Edit the prompts here to tweak how each level reads.
export const LEVELS = [
  {
    id: "simple",
    prompt:
      "Explain this the way you would to a 3rd grader: short sentences, simple words, no jargon, use a familiar example if it helps. Keep it to a few short paragraphs.",
  },
  {
    id: "easy",
    prompt:
      "Summarize this for a middle-school student: clear, friendly language, define any hard word the first time it appears, and keep it to a few short paragraphs.",
  },
  {
    id: "regular",
    prompt:
      "Write a normal, clear summary of this for a general adult reader. Cover the main ideas in one to three concise paragraphs.",
  },
  {
    id: "detailed",
    prompt:
      "Write a detailed summary: start with a short overview paragraph, then list the key points (use '- ' bullets), including nuance, caveats, and the supporting details, examples, or evidence behind each one.",
  },
  {
    id: "advanced",
    prompt:
      "Write a thorough, advanced-level summary for a reader who knows the subject. Keep the original technical terminology, preserve precise claims, figures and relationships, and organize it with short headed sections.",
  },
];

// Appended to every summary prompt; SummaryDisplay.jsx renders exactly this markup.
export const SUMMARY_FORMAT =
  "Format for easy reading: separate paragraphs with a blank line (keep each to 2-4 sentences); " +
  "wrap key terms and important keywords in **double asterisks** to bold them; " +
  "wrap the single main idea of each paragraph or bullet in __double underscores__ to underline it (a short phrase, not a whole sentence); " +
  "use '- ' bullets for lists and '## ' for short section headings only when they help. " +
  "Use no other markdown (no italics, numbered lists, tables or code).";

export const config = {
  port: Number(process.env.PORT) || 8787,
  geminiModel: process.env.GEMINI_MODEL || "gemini-3.8-flash",
  // Tried in order when the main model is overloaded or unavailable.
  geminiFallbackModels: (process.env.GEMINI_FALLBACK_MODELS || "gemini-3.5-flash,gemini-3.5-flash-lite")
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean),
  geminiRetries: 1, // extra attempts per model before falling back
  geminiCooldownMs: 60_000, // skip a model this long after it reports overloaded
  // Backboard's docs don't list Gemini model ids; set this to a name returned by
  // GET /models/provider/google. Defaults to the same model as above.
  backboardModel: process.env.BACKBOARD_GEMINI_MODEL || process.env.GEMINI_MODEL || "gemini-3.8-flash",
  backboardBaseUrl: process.env.BACKBOARD_BASE_URL || "https://app.backboard.io/api",
  maxTextChars: 1_000_000,
  minTextChars: 20,
  singlePassChars: 30_000, // at or below this, summarize in one call
  chunkChars: 24_000,
  chunkConcurrency: 4,
  rateLimit: { windowMs: 60_000, max: 30 },
};
