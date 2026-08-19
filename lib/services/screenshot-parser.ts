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
  'per-player stats (PTS, REB, AST, STL, BLK, FGM, FGA, 3PM, 3PA, FTM, FTA, TO), and ' +
  'quarter-by-quarter scoring if visible. Respond ONLY with JSON matching this shape: ' +
  '{"teams":[{"name":"","score":0}],"players":[{"gamertag":"","team":"","pts":0,"reb":0,' +
  '"ast":0,"stl":0,"blk":0,"fgm":0,"fga":0,"tpm":0,"tpa":0,"ftm":0,"fta":0,"turnovers":0}],' +
  '"quarterScores":[{"quarter":1,"home":0,"away":0}],"confidence":0.0}. No prose, no markdown fences.';

export interface ParseResult {
  extraction: ScreenshotExtractionResult;
  error?: string; // Human-readable error for the admin UI, if something went wrong
}

export async function parseGameScreenshot(imageBase64: string): Promise<ParseResult> {
  const apiKey = process.env.AI_PROVIDER_API_KEY;
  const model = process.env.AI_PROVIDER_MODEL || 'gemini-3.6-flash';

  if (!apiKey) {
    console.error('[screenshot-parser] AI_PROVIDER_API_KEY is not set in .env');
    return { extraction: emptyResult(), error: 'AI_PROVIDER_API_KEY is not set in .env' };
  }

  console.log(`[screenshot-parser] Calling Gemini API model=${model} key=${apiKey.slice(0, 10)}...`);

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
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
      }
    );
  } catch (networkErr: any) {
    const msg = `Network error calling Gemini API: ${networkErr?.message ?? networkErr}`;
    console.error('[screenshot-parser]', msg);
    return { extraction: emptyResult(), error: msg };
  }

  if (!response.ok) {
    let body = '';
    try { body = await response.text(); } catch {}
    const msg = `Gemini API returned HTTP ${response.status}: ${body.slice(0, 300)}`;
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
    const msg = `Gemini response had no text output. Full response: ${JSON.stringify(data).slice(0, 400)}`;
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

function emptyResult(): ScreenshotExtractionResult {
  return { teams: [], players: [], quarterScores: [], confidence: 0 };
}
