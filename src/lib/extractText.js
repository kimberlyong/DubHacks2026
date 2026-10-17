export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = [".pdf", ".docx", ".txt", ".md"];

const extensionOf = (name) => name.slice(name.lastIndexOf(".")).toLowerCase();

async function extractPdf(file) {
  const pdfjs = await import("pdfjs-dist");
  const { default: workerSrc } = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const pages = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item) => item.str).join(" "));
  }
  return pages.join("\n\n");
}

async function extractDocx(file) {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return value;
}

// Resolves to the extracted text, or throws an Error with a user-facing message.
export async function extractText(file) {
  const ext = extensionOf(file.name);
  if (!ACCEPTED_EXTENSIONS.includes(ext)) {
    throw new Error("Unsupported file type. Please upload a PDF, DOCX, TXT, or MD file.");
  }
  if (file.size === 0) throw new Error("That file is empty.");
  if (file.size > MAX_FILE_BYTES) throw new Error("That file is larger than 10 MB.");

  let text;
  try {
    if (ext === ".pdf") text = await extractPdf(file);
    else if (ext === ".docx") text = await extractDocx(file);
    else text = await file.text();
  } catch {
    throw new Error("We couldn't read that file. It may be corrupted or password-protected.");
  }

  text = text.replace(/\r\n/g, "\n").replace(/[ \t]+\n/g, "\n").trim();
  if (!text) {
    throw new Error(
      ext === ".pdf"
        ? "No text found in this PDF. It may be a scanned document; try a PDF with selectable text or run OCR on it first."
        : "No text found in that file.",
    );
  }
  return text;
}
