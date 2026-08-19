import type { ScreenshotExtractionResult } from '../types';

/**
 * SCREENSHOT PARSER SERVICE
 * --------------------------
 * The only place in the app that talks to an external AI/vision provider.
 * Swap providers by editing ONLY this file — nothing else in the app should
 * need to change. If the provider is unavailable or misconfigured, the rest
 * of the app keeps working (admins fall back to manual stat entry).
 *
 * Cost control: this function is called exactly once per upload (on the
 * ANALYZE action). Re-analysis only happens when an admin explicitly hits
 * "RE-ANALYZE" — never automatically, and never on every page view.
 */
const PROMPT =
  'This is an NBA 2K Pro-Am box score screenshot. Extract team names, final scores, ' +
  'per-player stats (PTS, REB, AST, STL, BLK, FGM, FGA, 3PM, 3PA, FTM, FTA, fouls, TO), and ' +
  'quarter-by-quarter scoring if visible. Respond ONLY with JSON matching this shape: ' +
  '{"teams":[{"name":"","score":0}],"players":[{"gamertag":"","team":"","pts":0,"reb":0,' +
  '"ast":0,"stl":0,"blk":0,"fgm":0,"fga":0,"tpm":0,"tpa":0,"ftm":0,"fta":0,"fouls":0,"turnovers":0}],' +
  '"quarterScores":[{"quarter":1,"home":0,"away":0}],"confidence":0.0}. No prose, no markdown fences.';

export interface ParseResult {
  extraction: ScreenshotExtractionResult;
  error?: string; // Human-readable error for the admin UI, if something went wrong
}

// Server actions have their own execution limits, but we don't want a stalled
// upstream request to hang the "UPLOAD & ANALYZE" button forever.
const REQUEST_TIMEOUT_MS = 30_000;

export async function parseGameScreenshot(imageBase64: string): Promise<ParseResult> {
  // Trim defensively — a stray trailing \r or newline from how the .env file
  // was saved (CRLF line endings, copy-paste artifacts) silently breaks the
  // query string and is invisible when you eyeball the .env file.
  const apiKey = process.env.AI_PROVIDER_API_KEY?.trim();
  const model = (process.env.AI_PROVIDER_MODEL || 'gemini-3.6-flash').trim();
  const baseUrl = (process.env.AI_PROVIDER_BASE_URL || 'https://generativelanguage.googleapis.com').trim().replace(/\/+$/, '');

  if (!apiKey) {
    console.error('[screenshot-parser] AI_PROVIDER_API_KEY is not set in .env');
    return { extraction: emptyResult(), error: 'AI_PROVIDER_API_KEY is not set in .env' };
  }

  console.log(`[screenshot-parser] Calling Gemini API model=${model} baseUrl=${baseUrl} key=${apiKey.slice(0, 10)}...`);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(
      `${baseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inline_data: { mime_type: 'image/jpeg', data: imageBase64 } },
                { text: PROMPT },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            temperature: 0,
          },
        }),
        signal: controller.signal,
      }
    );
  } catch (networkErr: any) {
    const timedOut = networkErr?.name === 'AbortError';
    const msg = timedOut
      ? `Gemini API request timed out after ${REQUEST_TIMEOUT_MS / 1000}s. The host this app is running on may be blocking or unable to reach ${baseUrl}.`
      : `Network error calling Gemini API: ${networkErr?.message ?? networkErr}`;
    console.error('[screenshot-parser]', msg);
    return { extraction: emptyResult(), error: msg };
  } finally {
    clearTimeout(timeout);
  }

  if (!response.ok) {
    let body = '';
    try { body = await response.text(); } catch { }

    // A real Gemini error is JSON, e.g. {"error":{"code":404,"message":"..."}}.
    // If what came back is HTML instead, it did NOT come from Google — it's
    // almost always this app's own dev-server / hosting-platform 404 or error
    // page, meaning the outbound request to Google never actually left (network
    // egress blocked, wrong host resolving locally, a proxy/firewall on the
    // deployment intercepting the domain). Flag that distinctly instead of
    // printing raw HTML and calling it a "Gemini" error.
    const looksLikeHtml = /^\s*<(!doctype|html)/i.test(body);
    const msg = looksLikeHtml
      ? `Request to ${baseUrl} returned HTTP ${response.status} with an HTML page instead of a JSON error from Gemini. ` +
      `This means the request never reached Google's servers — check that this host/deployment allows outbound network ` +
      `requests to generativelanguage.googleapis.com (firewall, sandbox network allow-list, or proxy settings), rather than treating this as a Gemini/API-key problem.`
      : diagnoseStatus(response.status, body);
    console.error('[screenshot-parser]', msg);
    return { extraction: emptyResult(), error: msg };
  }

  let data: any;
  try {
    data = await response.json();
  } catch (parseErr: any) {
    const msg = `Could not parse Gemini API response as JSON: ${parseErr?.message}`;
    console.error('[screenshot-parser]', msg);
    return { extraction: emptyResult(), error: msg };
  }

  const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    const blockReason = data?.promptFeedback?.blockReason;
    const msg = blockReason
      ? `Gemini blocked this request (reason: ${blockReason}). Try a different screenshot or crop out unrelated UI.`
      : `Gemini response had no text output. Full response: ${JSON.stringify(data).slice(0, 400)}`;
    console.error('[screenshot-parser]', msg);
    return { extraction: emptyResult(), error: msg };
  }

  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(cleaned) as ScreenshotExtractionResult;
    console.log(`[screenshot-parser] Success — confidence=${parsed.confidence} players=${parsed.players?.length}`);
    return { extraction: parsed };
  } catch (jsonErr: any) {
    const msg = `AI returned invalid JSON: ${jsonErr?.message}. Raw: ${text.slice(0, 200)}`;
    console.error('[screenshot-parser]', msg);
    return { extraction: emptyResult(), error: msg };
  }
}

function diagnoseStatus(status: number, body: string): string {
  const snippet = body.slice(0, 300);
  switch (status) {
    case 400:
      return `Gemini API returned HTTP 400 (bad request — often an invalid/malformed API key). Raw: ${snippet}`;
    case 401:
    case 403:
      return `Gemini API returned HTTP ${status} (auth rejected — regenerate the key at aistudio.google.com/apikey and confirm it's an unrestricted "auth" key, not a Standard key past its cutoff). Raw: ${snippet}`;
    case 404:
      return `Gemini API returned HTTP 404 (model not found — check AI_PROVIDER_MODEL is a valid current model id). Raw: ${snippet}`;
    case 429:
      return `Gemini API returned HTTP 429 (rate limit / quota exceeded for this key's tier). Raw: ${snippet}`;
    default:
      return `Gemini API returned HTTP ${status}: ${snippet}`;
  }
}

function emptyResult(): ScreenshotExtractionResult {
  return { teams: [], players: [], quarterScores: [], confidence: 0 };
}