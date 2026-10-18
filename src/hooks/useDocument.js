import { useCallback, useEffect, useRef, useState } from "react";
import { registerDocument } from "../api/client";
import { extractText } from "../lib/extractText";
import { saveFile } from "../lib/fileStore";
import { addToHistory } from "../lib/studyHistory";

const EMPTY = { file: null, documentId: null, text: "", status: "idle", error: null };

// Owns the uploaded document. Each upload gets a fresh documentId, which keys
// the summary cache and the Backboard thread, so replacing a file resets everything.
export function useDocument() {
  const [doc, setDoc] = useState(EMPTY);
  const requestRef = useRef(0);
  const abortRef = useRef(null);

  const remove = useCallback(() => {
    requestRef.current++;
    abortRef.current?.abort();
    setDoc(EMPTY);
  }, []);

  const upload = useCallback(async (file) => {
    const request = ++requestRef.current;
    abortRef.current?.abort();
    setDoc({ ...EMPTY, file, status: "extracting" });

    try {
      const text = await extractText(file);
      if (request !== requestRef.current) return; // superseded by a newer upload
      const documentId = crypto.randomUUID();
      setDoc({ file, documentId, text, status: "ready", error: null });
      addToHistory({ fileName: file.name, text, source: "upload" });
      saveFile(file);

      // Fire-and-forget: sets up the Backboard thread for "Ask Questions".
      const controller = new AbortController();
      abortRef.current = controller;
      registerDocument({ documentId, fileName: file.name, text }, controller.signal).catch(() => {});
    } catch (err) {
      if (request !== requestRef.current) return;
      setDoc({ ...EMPTY, status: "error", error: err.message });
    }
  }, []);

  // Same as upload(), but for text that already arrived as text (e.g. from
  // the Canvas extension) instead of a File the user picked. `original` is the
  // saved file when reopening a past document, so the real file is previewed.
  const loadText = useCallback((text, fileName, source = "extension", original = null) => {
    const request = ++requestRef.current;
    abortRef.current?.abort();

    const documentId = crypto.randomUUID();
    const file = original ?? { name: fileName || "Canvas page" };
    setDoc({ file, documentId, text, status: "ready", error: null });
    addToHistory({ fileName: file.name, text, source });

    const controller = new AbortController();
    abortRef.current = controller;
    registerDocument({ documentId, fileName: file.name, text }, controller.signal).catch(() => {});
    return request === requestRef.current;
  }, []);

  useEffect(() => () => abortRef.current?.abort(), []);

  return { ...doc, upload, loadText, remove };
}
