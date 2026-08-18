import { createClient } from '@/lib/supabase/server';
import PlayersManager from '@/components/admin/PlayersManager';
import AdminBackButton from '@/components/admin/AdminBackButton';

export default async function AdminPlayersPage() {
  const supabase = createClient();
  const { data: players } = await supabase.from('players').select('id, gamertag, position, tier').order('gamertag');

  return (
    <div className="space-y-4">
      <AdminBackButton />
      <div>
        <h1 className="text-4xl text-bone mb-1">GLOBAL PLAYER REGISTRY</h1>
        <p className="text-mute text-sm mb-8">
          Manage the master list of all players in the league. Once registered here, they can be selected for tournament rosters.
        </p>
      </div>
      <PlayersManager players={players ?? []} />
    </div>
  );
}
