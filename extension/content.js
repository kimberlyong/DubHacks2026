// Runs on canvas pages (instructure.com). Pulls the readable content out of
// whatever kind of page the student is on — assignment, syllabus, lecture
// page, discussion, quiz — and hands it back to the popup on request.

// Ordered so the first matching selector on the page wins.
const CONTENT_SELECTORS = [
  { type: "Assignment", body: ".assignment-description", title: "h1.title, .title" },
  { type: "Syllabus", body: "#course_syllabus_body, #course_syllabus", title: "h1" },
  { type: "Page", body: "#wiki_page_show .show-content.user_content, .show-content.user_content", title: "h1.page-title, .title" },
  { type: "Discussion", body: ".discussion-topic .message.user_content, .discussion-entries", title: ".discussion-title, h1" },
  { type: "Quiz", body: "#quiz_show, .quiz-description", title: "h1.title, .title" },
  { type: "Module item", body: ".user_content, #content", title: "h1" },
];

function cleanText(text) {
  return text.replace(/ /g, " ").replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
}

function textOf(selector) {
  if (!selector) return "";
  for (const sel of selector.split(",")) {
    const el = document.querySelector(sel.trim());
    if (el && el.innerText?.trim()) return el.innerText.trim();
  }
  return "";
}

function dueDateOf() {
  // Assignment/quiz due dates render in a few different places across Canvas themes.
  const el = document.querySelector(".assignment-dates time, .due_date_display, [data-testid='due-date']");
  return el?.innerText?.trim() || "";
}

function courseNameOf() {
  const el = document.querySelector("#crumb_courses, .ic-app-crumbs a[href*='/courses/']");
  return el?.innerText?.trim() || "";
}

// Returns { type, title, text } or null if this doesn't look like a Canvas
// content page at all (e.g. the course home grid, inbox, grades table).
function extractCanvasContent() {
  for (const { type, body, title } of CONTENT_SELECTORS) {
    const bodyText = textOf(body);
    if (bodyText && bodyText.length > 20) {
      const pageTitle = textOf(title) || document.title;
      const course = courseNameOf();
      const due = dueDateOf();
      const header = [course && `Course: ${course}`, due && `Due: ${due}`].filter(Boolean).join("\n");
      const text = cleanText([pageTitle, header, bodyText].filter(Boolean).join("\n\n"));
      return { type, title: pageTitle, text };
    }
  }
  return null;
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.action !== "extract") return;
  try {
    sendResponse(extractCanvasContent());
  } catch (err) {
    sendResponse({ error: err.message });
  }
});
