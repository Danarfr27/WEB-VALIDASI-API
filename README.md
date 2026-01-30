# API Key Validator — Landing (Vercel)

Simple static landing page + serverless validation function intended for deployment to Vercel.

Files added:

- `index.html` — landing page UI
- `styles.css` — theme (merah / hitam / putih)
- `script.js` — frontend logic
- `api/validate.js` — Vercel serverless function (Node.js)
- `vercel.json` — minimal Vercel config

Deploy:

1. Install Vercel CLI: `npm i -g vercel`
2. Login: `vercel login`
3. From project root run: `vercel --prod`

Notes:

- The serverless function attempts to validate an API key by requesting `https://api.openai.com/v1/models`. Adjust `api/validate.js` if you want a different provider (e.g., Google Gemini) or to incorporate your existing Python validation logic.
- For local testing you can use `vercel dev` to run functions and static files locally.
- The serverless function now validates API keys against Google Gemini (Generative Language API) by requesting `https://generativelanguage.googleapis.com/v1/models?key=YOUR_KEY`. Ensure the API is enabled and billing is configured for the Google Cloud project associated with the key.
- `api/validate.js` keeps an `openai` fallback but defaults to `gemini`.
- For local testing you can use `vercel dev` to run functions and static files locally, or test the endpoint directly:

  ```bash
  curl -X POST 'http://localhost:3000/api/validate' \
  	-H 'Content-Type: application/json' \
  	-d '{"apiKey":"YOUR_GEMINI_API_KEY","provider":"gemini"}'
  ```

- If you prefer to reuse existing Python validation (`validasi.py`), I can add a wrapper to call it from the serverless function or convert its logic to Node.js.
