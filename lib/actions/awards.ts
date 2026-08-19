'use server';

import { createClient, requireAdmin } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * RULE 5/6: statistics never determine a winner automatically.
 * This action is the ONLY way a winner gets attached to an award, and it
 * always requires an authenticated admin plus an explicit player selection.
 */
export async function finalizeAward(input: {
  awardType: string;
  awardId: string | null;
  tournamentId: string;
  winnerPlayerId: string;
  notes: string;
  publishNotes: boolean;
}) {
  const { isAdmin, user } = await requireAdmin();
  if (!isAdmin || !user) throw new Error('Admin authentication required.');

  const supabase = createClient();

  // Find or create the award row for this tournament/type, then finalize it.
  let awardId = input.awardId;
  if (!awardId) {
    const { data: created, error } = await supabase
      .from('awards')
      .insert({ tournament_id: input.tournamentId, award_type: input.awardType, status: 'UNDER_REVIEW' })
      .select('id')
      .single();
    if (error) throw error;
    awardId = created.id;
  }

  const { error } = await supabase
    .from('awards')
    .update({
      status: 'FINALIZED',
      winner_player_id: input.winnerPlayerId,
      admin_notes: input.notes,
      publish_notes: input.publishNotes,
      finalized_by: user.id,
      finalized_at: new Date().toISOString(),
    })
    .eq('id', awardId);

  if (error) throw error;

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    action: 'AWARD_FINALIZED',
    target_type: 'award',
    target_id: awardId,
    metadata: { award_type: input.awardType, winner_player_id: input.winnerPlayerId },
  });

  revalidatePath('/admin/awards');
  revalidatePath(`/admin/awards/${input.awardType}`);
  revalidatePath('/awards');
  revalidatePath('/');
}

/**
 * RULE 7/8: publishing is a separate, explicit admin action.
 * The DB trigger enforce_award_status_flow() also blocks PUBLISHED unless
 * the row is already FINALIZED, as a second line of defense.
 */
export async function publishAward(awardId: string, awardType: string) {
  const { isAdmin, user } = await requireAdmin();
  if (!isAdmin || !user) throw new Error('Admin authentication required.');

  const supabase = createClient();
  const { error } = await supabase.from('awards').update({ status: 'PUBLISHED' }).eq('id', awardId);
  if (error) throw error;

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    action: 'AWARD_PUBLISHED',
    target_type: 'award',
    target_id: awardId,
  });

  revalidatePath('/admin/awards');
  revalidatePath(`/admin/awards/${awardType}`);
  revalidatePath('/awards');
  revalidatePath('/');
}
