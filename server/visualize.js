import { ApiError, generate } from "./gemini.js";
import { getSource, validateText } from "./study.js";

const stripTags = (html) => String(html ?? "").replace(/<[^>]*>/g, "").trim();

// Searches Wikimedia Commons (free, no API key) for pictures and diagrams of a term.
export async function findImages(term, signal) {
  if (typeof term !== "string" || !term.trim() || term.length > 100) {
    throw new ApiError(400, "Enter a term (up to 100 characters).");
  }
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    generator: "search",
    gsrsearch: `${term.trim()} filetype:bitmap|drawing`,
    gsrnamespace: "6",
    gsrlimit: "8",
    prop: "imageinfo",
    iiprop: "url|extmetadata",
    iiurlwidth: "600",
  });
  let res;
  try {
    res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      signal,
      headers: { "User-Agent": "RecapStudyApp/1.0 (study tool)" },
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(502, "Couldn't reach the image search. Please try again.");
  }
  if (!res.ok) throw new ApiError(502, `Image search failed (${res.status}).`);

  const data = await res.json();
  return Object.values(data.query?.pages ?? {})
    .sort((a, b) => (a.index ?? 0) - (b.index ?? 0))
    .map((page) => {
      const info = page.imageinfo?.[0];
      if (!info?.thumburl) return null;
      return {
        title: page.title.replace(/^File:/, "").replace(/\.[^.]+$/, ""),
        url: info.thumburl,
        pageUrl: info.descriptionurl,
        credit: stripTags(info.extmetadata?.Artist?.value) || "Wikimedia Commons",
        license: stripTags(info.extmetadata?.LicenseShortName?.value),
      };
    })
    .filter(Boolean);
}

// Turns a process or system described in the document into ordered steps.
export async function buildFlowchart({ documentId, text, signal }) {
  validateText(text);
  const source = await getSource(documentId, text, signal);
  const raw = await generate(
    `Decide whether this document describes a process, procedure, cycle, or system that works in stages. If it does, lay it out as 4-10 ordered steps for a flowchart. Respond with JSON only: {"isProcess": boolean, "title": string, "steps": [{"label": string (max 6 words), "detail": string (one short sentence)}]}. If it does not describe a process or system, return isProcess false, an empty title and an empty steps array.\n\nDocument:\n---\n${source}`,
    { json: true, signal },
  );
  try {
    const parsed = JSON.parse(raw);
    const steps = (Array.isArray(parsed.steps) ? parsed.steps : [])
      .filter((st) => st && typeof st.label === "string" && st.label.trim())
      .map((st) => ({ label: st.label.trim(), detail: typeof st.detail === "string" ? st.detail.trim() : "" }));
    return { isProcess: Boolean(parsed.isProcess) && steps.length >= 2, title: String(parsed.title ?? ""), steps };
  } catch {
    throw new ApiError(502, "Couldn't read the flowchart the model returned. Please retry.");
  }
}
