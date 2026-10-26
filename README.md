# Screenshot To Spark

Implement exactly the screenshot and nothing else

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://screenshot-to-spark-102.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/550d056e-f308-48b8-b4b2-e22f9981afa2).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## CHASE learning missions

Progress through the town in order: repair the Power Station with Physics, complete the Maths challenge and construct the Research Lab, complete Chemistry and construct the Chemical Laboratory, then complete the C++ challenge and construct the Coding Studio. Correct answers, challenge bonuses, construction choices, and unlocked buildings are saved in browser local storage.

Physics, Maths, Chemistry, and C++ use a shared adaptive question selector with stable concept IDs and separate per-concept performance. Correct answers build evidence gradually and move difficulty up within that concept; incorrect answers show an explanation and prioritize an unseen easier question from the same concept, then a declared prerequisite after repeated difficulty. Explicit retries do not add mastery evidence or duplicate rewards. Questions already displayed during a challenge are excluded from its next-question selection, and exhausted paths enter review rather than switching silently to an unrelated topic.

Run `npm test -- --run` to check the game rules and subject progression. Stem Buddy sends each student message and recent conversation to Gemini through the same-origin `POST /api/stem-buddy` server endpoint, using the `gemini-2.5-flash` model through the Gemini `generateContent` endpoint. The endpoint validates and bounds chat requests, keeps the API key on the server, and sends stateless requests to Gemini. Each provider attempt has a 25-second deadline covering both response headers and body; one retry with backoff and jitter is allowed for transient timeouts, network failures, rate limits, and server errors. If Gemini is not configured or unavailable, the chat shows an error and does not substitute a predefined answer.

The Vite dev server also hosts the API endpoint; no separate backend command is needed. In PowerShell, set the server environment variable in the same terminal before starting the app:

```powershell
$env:GEMINI_API_KEY = "your-Gemini-API-key"
npm run dev
```

Create or view a key in [Google AI Studio](https://aistudio.google.com/apikey). For deployment, configure `GEMINI_API_KEY` as a server-side secret in the hosting environment. Never commit a real key, expose it with a `VITE_` variable, or send it to the browser. `.env.example` is a blank reference template; copy it only if you know how to keep the populated local copy private. See Google's [Gemini API key guidance](https://ai.google.dev/gemini-api/docs/api-key), [model list](https://ai.google.dev/gemini-api/docs/models), and [Interactions API guide](https://ai.google.dev/gemini-api/docs/interactions-overview).