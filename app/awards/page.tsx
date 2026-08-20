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
        <p className="text-silver-500 font-mono uppercase tracking-widest text-sm">No tournaments found.</p>
      ) : (awards ?? []).length === 0 ? (
        <div className="border border-surface-700/50 bg-surface-900/40 backdrop-blur-md rounded-2xl p-16 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,215,0,0.05),transparent_50%)]"></div>
          <p className="text-silver-400 text-sm font-mono uppercase tracking-widest relative z-10">
            No awards published yet for this tournament. Admins are reviewing candidates.
          </p>
        </div>
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {(awards ?? []).map((a: any) => {
            const teamName = playerTeams.get(a.winner_player_id);
            const playerSlug = a.winner?.slug || a.winner?.gamertag?.toLowerCase();
            return (
              <div key={a.id} className="relative border border-surface-700/50 bg-gradient-to-b from-surface-900/80 to-black/90 backdrop-blur-xl p-8 rounded-3xl shadow-2xl hover:border-gold/40 hover:shadow-[0_0_30px_rgba(255,215,0,0.15)] transition-all duration-500 group overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-gold/5 rounded-full blur-3xl group-hover:bg-gold/10 transition-colors"></div>
                
                <div className="flex flex-col items-center text-center gap-2 mb-8 relative z-10">
                  <span className="text-6xl drop-shadow-[0_0_15px_rgba(255,215,0,0.3)] mb-2 transform group-hover:scale-110 transition-transform duration-500">{TROPHY[a.award_type] ?? '🏆'}</span>
                  <div className="w-12 h-1 bg-gradient-to-r from-transparent via-gold/50 to-transparent mb-2"></div>
                  <h2 className="text-lg text-white font-display tracking-[0.2em] uppercase group-hover:text-gold transition-colors drop-shadow-sm">
                    {a.award_type.replace(/_/g, ' ')}
                  </h2>
                  <p className="text-[10px] font-mono text-silver-500 uppercase tracking-[0.4em]">Battleground Award</p>
                </div>

                <div className="relative z-10 bg-black/40 rounded-2xl p-6 border border-surface-800/50 group-hover:border-surface-600/50 transition-colors">
                  {a.winner ? (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="relative">
                        {a.winner.photo_path ? (
                          <img src={a.winner.photo_path} alt={a.winner.gamertag} className="w-20 h-20 object-cover rounded-full border-2 border-gold/30 bg-surface-900 shadow-[0_0_15px_rgba(0,0,0,0.5)]" />
                        ) : (
                          <div className="w-20 h-20 rounded-full border-2 border-gold/30 bg-surface-900 shadow-[0_0_15px_rgba(0,0,0,0.5)] flex items-center justify-center overflow-hidden p-3">
                            <img src="/logo2.png" alt={a.winner.gamertag} className="w-full h-full object-contain opacity-70" />
                          </div>
                        )}
                        <div className="absolute -bottom-2 -right-2 bg-red-600 w-6 h-6 rounded-full border-2 border-black flex items-center justify-center text-[10px] shadow-lg">✓</div>
                      </div>
                      <div>
                        <Link href={`/${playerSlug}`} className="block text-2xl text-gold font-display tracking-widest mb-1 uppercase drop-shadow-md hover:text-white transition-colors">
                          {a.winner.gamertag}
                        </Link>
                        {teamName ? (
                          <p className="text-xs text-silver-400 font-mono tracking-widest uppercase">{teamName}</p>
                        ) : (
                          <p className="text-xs text-silver-600 font-mono tracking-widest uppercase italic">Free Agent</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center text-center py-4">
                      <p className="text-3xl text-surface-600 font-display tracking-wide mb-1 uppercase">—</p>
                      <p className="text-[10px] text-silver-600 font-mono uppercase tracking-widest">TBD</p>
                    </div>
                  )}
                </div>

                {a.publish_notes && a.admin_notes && (
                  <div className="mt-6 text-xs text-silver-400 italic border-t border-surface-800/80 pt-4 text-center px-4 relative z-10 leading-relaxed font-serif">
                    "{a.admin_notes}"
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
