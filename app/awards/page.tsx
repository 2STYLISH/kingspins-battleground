import { createClient } from '@/lib/supabase/server';
import TournamentSelect from '@/components/TournamentSelect';

const TROPHY: Record<string, string> = {
  BEST_PG: '🎯',
  BEST_SG: '🔥',
  BEST_SF: '🦅',
  BEST_PF: '💪',
  BEST_CENTER: '🧱',
  FINALS_MVP: '🏆',
  OVERALL_MVP: '🌟',
  OVERALL_DPOY: '🛡️',
};

export default async function PublicAwardsPage({ searchParams }: { searchParams: { tournament_id?: string } }) {
  const supabase = createClient();

  const { data: tournaments } = await supabase.from('tournaments').select('id, name').order('created_at', { ascending: false });
  const activeTournamentId = searchParams.tournament_id || tournaments?.[0]?.id;

  const { data: awards } = await supabase
    .from('awards')
    .select('id, award_type, admin_notes, publish_notes, published_at, winner:players!awards_winner_player_id_fkey(gamertag, team_id)')
    .eq('status', 'PUBLISHED')
    .eq('tournament_id', activeTournamentId)
    .order('published_at', { ascending: true });

  // Note: we removed team_id from players table globally. A player doesn't have a team.
  // The player belongs to a team via tournament_rosters for this tournament.
  // We can fetch the player's team for this tournament to display on the award card.
  const winnerIds = awards?.map((a: any) => a.winner_player_id).filter(Boolean) || [];
  let playerTeams = new Map<string, string>();

  if (activeTournamentId && winnerIds.length > 0) {
    const { data: rosters } = await supabase
      .from('tournament_rosters')
      .select('player_id, team:teams(name)')
      .eq('tournament_id', activeTournamentId)
      .in('player_id', winnerIds);

    (rosters ?? []).forEach((r: any) => {
      playerTeams.set(r.player_id, r.team?.name);
    });
  }

  const activeTournamentName = tournaments?.find(t => t.id === activeTournamentId)?.name ?? 'Awards';

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-4xl text-white mb-2 uppercase tracking-widest">{activeTournamentName}</h1>

        <TournamentSelect
          tournaments={tournaments ?? []}
          activeId={activeTournamentId}
          basePath="/awards"
        />
      </div>

      {!activeTournamentId ? (
        <p className="text-silver-500 text-sm">No tournaments found.</p>
      ) : (awards ?? []).length === 0 ? (
        <div className="card p-10 text-center">
          <p className="text-silver-600 text-sm">
            No awards published yet for this tournament. Admins are reviewing candidates.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {(awards ?? []).map((a: any) => {
            const teamName = playerTeams.get(a.winner_player_id);
            return (
              <div key={a.id} className="card-hover p-6">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl">{TROPHY[a.award_type] ?? '🏅'}</span>
                  <div>
                    <p className="text-[10px] font-mono text-silver-600 uppercase tracking-widest">Award</p>
                    <h2 className="text-sm text-white font-display tracking-widest">
                      {a.award_type.replace(/_/g, ' ')}
                    </h2>
                  </div>
                </div>

                <p className="text-2xl text-white font-display tracking-wide mb-1">
                  {a.winner?.gamertag ?? '—'}
                </p>
                {teamName && (
                  <p className="text-xs text-silver-500 font-mono">{teamName}</p>
                )}

                {a.publish_notes && a.admin_notes && (
                  <p className="mt-4 text-sm text-silver-500 italic border-t border-surface-700 pt-3">
                    "{a.admin_notes}"
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
