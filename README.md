# DubHacks2026
DubHacks 2026 Project!

## Frontend

The frontend uses React, Vite, and Tailwind CSS. Install dependencies and start
the development server with:

```sh
npm install
npm run dev
```

# Inspiration
Clarity is built for how students with ADHD actually study. Dense readings are hard to start, and a long assignment can feel like a wall. Instructions like “study the material” don’t help. We wanted a tool that makes the first step small enough to begin without dread. It should also notice when you drift and bring you back kindly, without guilt.

What it does
Clarity lets you upload a PDF, a Word file, or your own notes. The Canvas Chrome extension can also pull in an assignment, syllabus, or lecture page with one click. You choose how much time and energy you have, and Clarity breaks the reading into 3 to 8 small, concrete steps. It checks your calendar to decide when each step should happen and how long it should take. A slider lets you move from a quick overview to a full-detail summary, and you can select any sentence to get an explanation. To help you practice active recall, Clarity generates key terms, flashcards, quizzes, a visual flowchart, and an “Ask the reading” chat. Sprout, our study companion, offers encouragement and keeps up with your calendar events. It also runs a camera focus check using on-device face tracking. If you look away, a gentle “Still with me?” popup appears, with a path to a mental-break page full of games and fidgets. The whole app works in both light and dark themes.

# How we built it
The frontend uses React 19, Vite, and Tailwind CSS. We used pdfjs-dist and mammoth to read PDFs and Word files directly in the browser, and MediaPipe Tasks Vision for face tracking that runs on the device. The backend is an Express API that calls Google Gemini for summaries, plans, flashcards, quizzes, and flowcharts. Long documents are split into chunks, condensed in parallel, and cached. This map-reduce step keeps large readings within model limits. With Backboard, each document gets its own assistant and thread for the chat. Summaries are also saved to a shared library, keyed by a hash of the text, so reopening a past file doesn’t regenerate them. For reliability, we added model fallbacks with cooldowns, retries, rate limiting, and request cancellation when the browser closes a connection. All five summary levels now come back in a single model call instead of five. For the calendar, node-ical reads Apple, Outlook, and Canvas .ics links, and we added checks that block private addresses. The Canvas extension uses a content script to find the page text and hand it to the server. The server stores it for a single pickup and deletes it after 10 minutes at most. The API also runs as a Vercel serverless function.

# What we learned
Designing for ADHD is mostly about lowering the cost of starting. Small steps, usability, and planning mattered more than adding features. We also learned that LLM output needs defensive handling. We ask for JSON, validate it, and return a clear retry message when parsing fails. Large inputs need chunking and caching to stay fast and within limits. Privacy shaped our design too. Face tracking runs on the device, and extracted Canvas text is deleted after one use. Finally, working in parallel on one repo meant a lot of merging, and we learned to integrate small and often.

# Challenges we faced
Gemini sometimes reported overload, which led us to build the fallback chain. Summaries were also slow until we batched all levels into one call. Malformed JSON from the model broke features until we added validation and retries. Merge conflicts caused problems as well. The light/dark switch was lost in one merge and had to be restored, and the camera recovery and mental-break page also collided. The Canvas extension initially worked only on *.instructure.com, so we added support for school domains like canvas.uw.edu. The focus detection popup needed tuning. It now appears after 4 seconds of looking away, and it returns 4 seconds after you click “I’m back” if you’re still distracted. Late in the project, the summary route was calling helper functions it never imported, which caused a generic 500 error. Fixing that exposed a missing dependency that crashed the server, so we reinstalled our packages.

# What’s next
We plan to add more study techniques that help people with different learning needs. Maybe an audio tool or a live Q & A with an AI agent

<img width="1024" height="768" alt="image" src="https://github.com/user-attachments/assets/25470afe-16cf-4ba3-a834-9e895bf16d7c" />

