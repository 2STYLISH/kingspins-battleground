import { createClient } from '@/lib/supabase/server';
import TournamentSelect from '@/components/TournamentSelect';
import Link from '@/components/HiddenLink';

const TROPHY: Record<string, string> = {
  BEST_PG: '🏆',
  BEST_SG: '🏆',
  BEST_SF: '🏆',
  BEST_PF: '🏆',
  BEST_CENTER: '🏆',
  FINALS_MVP: '🏆',
  OVERALL_MVP: '🏆',
  OVERALL_DPOY: '🏆',
};

export default async function PublicAwardsPage({ searchParams }: { searchParams: { tournament_id?: string } }) {
  const supabase = createClient();

  const { data: tournaments } = await supabase.from('tournaments').select('id, name').order('created_at', { ascending: false });
  const activeTournamentId = searchParams.tournament_id || tournaments?.[0]?.id;

  const { data: awards } = await supabase
    .from('awards')
    .select('id, award_type, admin_notes, publish_notes, published_at, winner_player_id, winner:players!awards_winner_player_id_fkey(gamertag, slug, photo_path)')
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
        <p className="text-[10px] text-[#b8860b] font-mono uppercase tracking-[0.3em] mb-2">BATTLEGROUND AWARDS</p>
        <h1 className="text-5xl text-white font-display tracking-widest uppercase mb-4 drop-shadow-[0_0_15px_rgba(229,0,0,0.3)]">
          {activeTournamentName}
        </h1>

        <TournamentSelect
          tournaments={tournaments ?? []}
          activeId={activeTournamentId}
          basePath="/awards"
        />
      </div>

      {!activeTournamentId ? (
        <p className="text-silver-500 text-sm">No tournaments found.</p>
      ) : (awards ?? []).length === 0 ? (
        <div className="border border-surface-700 bg-[#080808] rounded p-10 text-center shadow-lg">
          <p className="text-silver-600 text-sm font-mono uppercase tracking-widest">
            No awards published yet for this tournament. Admins are reviewing candidates.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {(awards ?? []).map((a: any) => {
            const teamName = playerTeams.get(a.winner_player_id);
            const playerSlug = a.winner?.slug || a.winner?.gamertag?.toLowerCase();
            return (
              <div key={a.id} className="border border-surface-700 bg-[#080808]/90 backdrop-blur-sm p-6 rounded shadow-lg hover:border-red-600 transition-colors group">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{TROPHY[a.award_type] ?? '🏆'}</span>
                  <div>
                    <p className="text-[10px] font-mono text-[#b8860b] uppercase tracking-widest">Award</p>
                    <h2 className="text-sm text-white font-display tracking-widest uppercase group-hover:text-red-600 transition-colors">
                      {a.award_type.replace(/_/g, ' ')}
                    </h2>
                  </div>
                </div>

                {a.winner ? (
                  <div className="flex items-center gap-4 mb-2">
                    {a.winner.photo_path ? (
                      <img src={a.winner.photo_path} alt={a.winner.gamertag} className="w-12 h-12 object-cover rounded border border-surface-600 bg-surface-900 shadow" />
                    ) : (
                      <img src="/logo2.png" alt={a.winner.gamertag} className="w-12 h-12 object-cover rounded border border-surface-600 bg-surface-900 shadow opacity-80" />
                    )}
                    <div>
                      <Link href={`/${playerSlug}`} className="block text-2xl text-[#b8860b] font-display tracking-wide mb-1 uppercase drop-shadow-md hover:text-red-500 transition-colors">
                        {a.winner.gamertag}
                      </Link>
                    </div>
                  </div>
                ) : (
                  <p className="text-2xl text-[#b8860b] font-display tracking-wide mb-1 uppercase drop-shadow-md">
                    —
                  </p>
                )}
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
