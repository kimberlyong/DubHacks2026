const API_URL = "http://localhost:8787";
const APP_URL = "http://localhost:5173";

const button = document.getElementById("extract");
const status = document.getElementById("status");

function setStatus(text, isError = false) {
  status.textContent = text;
  status.className = isError ? "error" : "";
}

async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// The content script only runs on pages matching the manifest's
// content_scripts and only loads on new page loads after the extension was
// installed. Schools host Canvas on their own domains (canvas.uw.edu), so
// inject it manually as a fallback; activeTab allows that on any site.
async function askContentScriptToExtract(tabId) {
  try {
    return await chrome.tabs.sendMessage(tabId, { action: "extract" });
  } catch {
    await chrome.scripting.executeScript({ target: { tabId }, files: ["content.js"] });
    return await chrome.tabs.sendMessage(tabId, { action: "extract" });
  }
}

button.addEventListener("click", async () => {
  button.disabled = true;
  setStatus("Reading the page…");

  try {
    const tab = await getActiveTab();
    if (!tab?.url || !/^https?:/.test(tab.url)) {
      throw new Error("Open a Canvas assignment, syllabus, or page first.");
    }

    const result = await askContentScriptToExtract(tab.id);
    if (!result || result.error) {
      throw new Error(result?.error || "Couldn't find readable content on this page.");
    }

    setStatus(`Found ${result.type.toLowerCase()}: "${result.title}". Sending to Clarity…`);

    const res = await fetch(`${API_URL}/api/extract`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileName: `${result.type}: ${result.title}`, text: result.text }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status}).`);

    await chrome.tabs.create({ url: `${APP_URL}/?extract=${encodeURIComponent(data.id)}` });
    setStatus("Sent! Opening Clarity…");
  } catch (err) {
    setStatus(err.message, true);
  } finally {
    button.disabled = false;
  }
});
