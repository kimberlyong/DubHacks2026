// Keeps the original uploaded files (PDF, DOCX, ...) in IndexedDB so a past
// document can be previewed as the real file, not just its extracted text.
// localStorage can't hold binary files, and everything here is best-effort.
import { getHistory } from "./studyHistory";

const DB_NAME = "recap-files";
const STORE = "files";

function open() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run(mode, fn) {
  const db = await open();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const req = fn(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(req?.result);
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally {
    db.close();
  }
}

export async function saveFile(file) {
  try {
    await run("readwrite", (s) => s.put(file, file.name));
    // Drop files whose history entry has aged out.
    const keep = new Set(getHistory().map((e) => e.fileName));
    const names = await run("readonly", (s) => s.getAllKeys());
    for (const name of names ?? []) {
      if (!keep.has(name)) await run("readwrite", (s) => s.delete(name));
    }
  } catch {
    // Storage unavailable or full — the preview falls back to extracted text.
  }
}

export async function loadFile(fileName) {
  try {
    return (await run("readonly", (s) => s.get(fileName))) ?? null;
  } catch {
    return null;
  }
}
