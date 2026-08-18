import { createClient } from '@/lib/supabase/server';
import OverrideForm from '@/components/admin/OverrideForm';

export default async function BracketOverridePage() {
  const supabase = createClient();
  const { data: matchups } = await supabase
    .from('bracket_matchups')
    .select('id, round, slot, status, team_a:teams!bracket_matchups_team_a_id_fkey(id,name), team_b:teams!bracket_matchups_team_b_id_fkey(id,name)')
    .order('round', { ascending: true });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl text-bone">BRACKET OVERRIDE</h1>
        <p className="text-mute text-sm mt-1">
          Manual corrections only. Every action here requires a reason and is written to the audit log.
        </p>
      </div>
      <OverrideForm matchups={(matchups ?? []) as any} />
    </div>
  );
}
