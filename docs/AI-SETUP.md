# AI Studio and Translation Studio: setup

All AI features go through one server route, `src/app/api/ai/route.ts`, and one OpenRouter client, `src/lib/ai/openrouter.ts`. The browser never sees your API key.

## 1. Get a key and choose a model
1. Create an account at https://openrouter.ai and create an API key.
2. Open https://openrouter.ai/models and filter for free models. Pick one that supports chat and handles Hindi and Marathi well. **Free models can disappear or change limits at any time**; check before launch and again later.
3. Optionally pick a separate model for translation.

## 2. Configure locally
Copy `.env.example` to `.env.local` and set:
```
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_MODEL=<vendor/model-name:free>
```
Restart `npm run dev`. If the key or model is missing, the tools show "AI features are not configured on this site yet."

## 3. Configure on Vercel
Project, Settings, Environment Variables: add `OPENROUTER_API_KEY` and `OPENROUTER_MODEL` (and any optional values) for Production and Preview, then redeploy. Do not add them with a `NEXT_PUBLIC_` prefix.

## Safety rules built in
- Only models whose id ends in `:free` are used. A paid model is refused unless you set `OPENROUTER_ALLOW_PAID=true`. There is no automatic fallback to another model or provider.
- Input limits per tool (see `src/lib/ai/limits.ts`), a 130 KB request cap, output token limits, a 45 s provider timeout and a 60 s function limit.
- Per-IP rate limit (default 8 per minute, 60 per hour). This limiter is in memory and per server instance; for strict limits on Vercel add a shared store such as Upstash Redis.
- Same-origin check, no request content in logs, provider error text is never shown to users.
- User text is wrapped in delimiters and the model is told to treat it as data (reduces, but cannot eliminate, prompt injection).

## Privacy
Text entered in AI tools goes to your server, OpenRouter and the model provider. The Privacy Policy and each tool page say so. Review OpenRouter's and the provider's data policies before launch.

## Known limits
- Hindi and Marathi translation quality depends entirely on the model you choose and was not verified in this build (no API key was available during development).
- On Vercel Hobby, long PDF summaries make several model calls and can approach the 60 s limit; the PDF text is capped at 60,000 characters for this reason.
