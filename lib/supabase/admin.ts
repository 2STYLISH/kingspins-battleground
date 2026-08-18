import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// SERVICE ROLE CLIENT — bypasses Row Level Security.
// Only ever import this inside server-only code (API routes / server actions)
// that has already verified the caller is an authenticated admin.
// NEVER import this in a Client Component and NEVER expose
// SUPABASE_SERVICE_ROLE_KEY to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
