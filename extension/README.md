# Clarity for Canvas (extension)

Pulls the assignment, syllabus, lecture page, discussion, or quiz off a Canvas
page and sends it straight into Clarity — no copy-paste, no file upload.

## Load it in Chrome

1. Go to `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and select this `extension/` folder
4. Pin it to the toolbar if you want quick access

## Try it

1. Run the app (`npm run dev` from the repo root — starts both the API on
   `:8787` and the web app on `:5173`)
2. Open any Canvas assignment, syllabus, page, discussion, or quiz
3. Click the extension icon, then **Extract this page**
4. Clarity opens in a new tab with the page already loaded and ready to study

## How it works

1. `content.js` runs on Canvas pages, on `*.instructure.com` or a school's own
   domain like `canvas.uw.edu` (the popup injects it there). It looks through a
   priority list of Canvas page types (assignment → syllabus → lecture page →
   discussion → quiz → generic content) and returns the first one with real
   text in it, along with the title, course name, and due date when present.
2. `popup.js` asks the content script for that text, `POST`s it to
   `http://localhost:8787/api/extract`, and gets back a short-lived id.
3. It opens `http://localhost:5173/?extract=<id>` in a new tab.
4. The app reads the `extract` param, fetches the text from the server once
   (the server deletes it immediately after), and loads it into the study
   panel exactly like an uploaded file.

## Notes

- Points at `localhost` for the hackathon demo — update `API_URL`/`APP_URL`
  at the top of `popup.js` if you deploy the app somewhere else.
- The extraction endpoints (`/api/extract`) are the only ones with CORS
  enabled, since they're the only ones a `chrome-extension://` origin needs
  to reach.
- Extracted text expires after 10 minutes if nothing ever picks it up, and is
  deleted the first time it's read.
- No icons are set, so Chrome shows a generic toolbar icon — fine for a demo,
  swap in real ones later if there's time.
