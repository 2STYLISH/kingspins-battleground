'use server';

import { createClient } from '@/lib/supabase/server';

export async function checkAdminStatus() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { username: null, isAdmin: false };
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, username')
    .eq('id', user.id)
    .single();
    
  return { 
    username: profile?.username ?? null, 
    isAdmin: profile?.role === 'ADMIN' 
  };
}

export async function loginWithUsername(username: string, password: string) {
  try {
    const supabase = createClient();
    
    // We need the admin client to bypass RLS and access the auth API
    const { createClient: createSupabaseClient } = await import('@supabase/supabase-js');
    const adminClient = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 1. Find the user id for the given username
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('id')
      .eq('username', username)
      .single();

    if (profileError || !profile) {
      return { error: 'Invalid username or password.' };
    }

    // 2. Look up their actual email from the auth.users table via Admin API
    const { data: authData, error: authError } = await adminClient.auth.admin.getUserById(profile.id);
    
    if (authError || !authData?.user?.email) {
      return { error: 'Invalid username or password.' };
    }

    // 3. Sign in using the normal SSR client with the mapped email to set the session cookies
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authData.user.email,
      password,
    });

    if (signInError) {
      return { error: signInError.message };
    }

    return { success: true };
  } catch (err: any) {
    console.error('Login action failed:', err);
    return { error: 'An unexpected error occurred.' };
  }
}
