'use server';

import { createClient } from '@/lib/supabase/server';

export async function checkAdminStatus() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) return { userEmail: null, isAdmin: false };
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  return { 
    userEmail: user.email ?? null, 
    isAdmin: profile?.role === 'ADMIN' 
  };
}
