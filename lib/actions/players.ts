'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) return { isAdmin: false, user: null };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  return { isAdmin: profile?.role === 'ADMIN', user };
}

export async function updatePlayerPhoto(playerId: string, photoUrl: string | null) {
  const { isAdmin } = await requireAdmin();
  if (!isAdmin) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase
    .from('players')
    .update({ photo_path: photoUrl })
    .eq('id', playerId);

  if (error) throw error;
  
  revalidatePath('/admin/players');
  // Revalidate the player slug page (we don't know the exact slug here so revalidate layout or specific pages later if needed)
}
