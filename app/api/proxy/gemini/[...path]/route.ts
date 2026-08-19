import { NextRequest } from 'next/server';

// Force this route to run on Vercel's Edge network in the US East region
// This ensures it bypasses the Gemini region restrictions.
export const runtime = 'edge';
export const preferredRegion = 'iad1'; // Washington, D.C., USA

export async function POST(req: NextRequest, { params }: { params: { path: string[] } }) {
  const path = params.path.join('/');
  const searchParams = req.nextUrl.searchParams.toString();
  
  // Construct the target Google API URL
  const targetUrl = `https://generativelanguage.googleapis.com/${path}${searchParams ? `?${searchParams}` : ''}`;
  
  // Forward the request body
  const body = await req.text();
  
  // Make the request to Google from the Vercel Edge server
  const response = await fetch(targetUrl, {
    method: req.method,
    headers: {
      'Content-Type': req.headers.get('Content-Type') || 'application/json',
    },
    body: body || undefined,
  });
  
  // Return the Google response back to the client
  return new Response(response.body, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
    },
  });
}
