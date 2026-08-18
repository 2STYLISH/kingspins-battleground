'use client';

import { createBrowserClient } from '@supabase/ssr';

// Client-side Supabase instance. Uses the public anon key only —
// row level security enforces what each user can actually read/write.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
