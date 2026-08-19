import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { averageStats } from '@/lib/stats';
import type { PlayerGameStats } from '@/lib/types';
import BackButton from '@/components/BackButton';
import TournamentFilter from '@/components/TournamentFilter';

export const metadata = {
  title: 'Admin Stats — Kingpins Battleground',
};

export default async function AdminStatsPage({ searchParams }: { searchParams: { t?: string } }) {
  const supabase = createClient();

  const { data: tournaments } = await supabase.from('tournaments').select('id, name, status').order('created_at', { ascending: false });
  const activeTournament = searchParams.t || tournaments?.[0]?.id || '';

  const { data: teams } = await supabase
    .from('teams')
    .select('id, name, tournament_id')
    .eq('tournament_id', activeTournament)
    .order('name');

  const { data: players } = await supabase
    .from('players')
    .select('id, gamertag, position');

  const { data: rosters } = await supabase
    .from('tournament_rosters')
    .select('tournament_id, team_id, player_id')
    .eq('tournament_id', activeTournament);

  // Admins see ALL stats (RLS allows admin to see unverified too)
  const { data: allStats } = await supabase
    .from('player_game_stats')
    .select(
      'player_id, team_id, pts, reb, ast, stl, blk, fgm, fga, tpm, tpa, ftm, fta, turnovers, did_not_play, is_verified, game:games!player_game_stats_game_id_fkey(id, home_team_id, away_team_id, home_score, away_score, status, schedule:schedules(tournament_id))'
    );

  const tournamentStats = (allStats ?? []).filter((s: any) => s.game?.schedule?.tournament_id === activeTournament);

  const verifiedStats = tournamentStats.filter((s: any) => s.is_verified && !s.did_not_play);
  const pendingStats = tournamentStats.filter((s: any) => !s.is_verified && !s.did_not_play);

  const buildPlayerMap = (rows: any[]) => {
    const map = new Map<string, { rows: PlayerGameStats[]; wins: number; gamesPlayed: number }>();
    for (const row of rows) {
      if (!map.has(row.player_id)) {
        map.set(row.player_id, { rows: [], wins: 0, gamesPlayed: 0 });
      }
      const entry = map.get(row.player_id)!;
      entry.rows.push(row as PlayerGameStats);
      entry.gamesPlayed++;
      const game = row.game;
      if (game && row.team_id) {
        const isHome = game.home_team_id === row.team_id;
        const myScore = isHome ? game.home_score : game.away_score;
        const oppScore = isHome ? game.away_score : game.home_score;
        if (myScore != null && oppScore != null && myScore > oppScore) entry.wins++;
      }
    }
    return map;
  };

  const verifiedByPlayer = buildPlayerMap(verifiedStats);
  const pendingByPlayer = buildPlayerMap(pendingStats);

  const totalVerifiedGames = new Set(verifiedStats.map((s: any) => s.game?.id)).size;
  const totalPendingGames = new Set(pendingStats.map((s: any) => s.game?.id)).size;

  return (
    <div className="space-y-10">
      <BackButton />

      {/* Header */}
      <div className="pb-6 border-b border-surface-700">
        <p className="text-[10px] font-mono text-silver-600 uppercase tracking-[0.3em] mb-2">Admin View</p>
        <h1 className="text-4xl text-white mb-2">PLAYER STATS</h1>
        <div className="flex gap-6 text-sm text-silver-500 mb-6">
          <span>
            <span className="text-white font-mono">{totalVerifiedGames}</span> verified games
          </span>
          {totalPendingGames > 0 && (
            <span>
              <span className="text-silver-400 font-mono">{totalPendingGames}</span> pending review
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="text-[10px] font-mono text-silver-500 uppercase tracking-widest">Tournament:</label>
          <TournamentFilter tournaments={tournaments ?? []} activeId={activeTournament} basePath="/admin/stats" />
        </div>
      </div>

      {(!teams || teams.length === 0) && (
        <div className="card p-8 text-center">
          <p className="text-silver-600">No teams registered yet.</p>
        </div>
      )}

      {(teams ?? []).map((team) => {
        const teamRosterIds = new Set((rosters ?? []).filter(r => r.team_id === team.id).map(r => r.player_id));
        const roster = (players ?? []).filter((p) => teamRosterIds.has(p.id));
        const rows = roster
          .map((player) => {
            const verified = verifiedByPlayer.get(player.id);
            const pending = pendingByPlayer.get(player.id);
            const verifiedAvg = verified?.rows.length
              ? averageStats(verified.rows, verified.wins, verified.gamesPlayed)
              : null;
            const pendingAvg = pending?.rows.length
              ? averageStats(pending.rows, pending.wins, pending.gamesPlayed)
              : null;
            return { player, verifiedAvg, pendingAvg };
          })
          .sort((a, b) => {
            const aPPG = a.verifiedAvg?.ppg ?? a.pendingAvg?.ppg ?? -1;
            const bPPG = b.verifiedAvg?.ppg ?? b.pendingAvg?.ppg ?? -1;
            return bPPG - aPPG;
          });

        const hasAnyStats = rows.some((r) => r.verifiedAvg || r.pendingAvg);

        return (
          <section key={team.id}>
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-lg text-white font-display tracking-widest">{team.name}</h2>
              <Link href={`/teams/${team.id}`} className="text-[10px] font-mono text-silver-500 hover:text-white transition-colors uppercase tracking-widest">
                Public view →
              </Link>
            </div>

            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs stat-mono">
                  <thead>
                    <tr className="border-b border-surface-700 text-silver-600 uppercase tracking-wider">
                      <th className="text-left px-5 py-3 font-mono">Player</th>
                      <th className="px-3 py-3 text-right">GP</th>
                      <th className="px-3 py-3 text-right">PPG</th>
                      <th className="px-3 py-3 text-right">RPG</th>
                      <th className="px-3 py-3 text-right">APG</th>
                      <th className="px-3 py-3 text-right">SPG</th>
                      <th className="px-3 py-3 text-right">BPG</th>
                      <th className="px-3 py-3 text-right">FG%</th>
                      <th className="px-3 py-3 text-right">3P%</th>
                      <th className="px-3 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {!hasAnyStats && (
                      <tr>
                        <td colSpan={10} className="px-5 py-6 text-silver-700 text-center">
                          No game stats recorded yet.
                        </td>
                      </tr>
                    )}
                    {rows.map(({ player, verifiedAvg, pendingAvg }) => {
                      const avg = verifiedAvg ?? pendingAvg;
                      if (!avg) return null;
                      const isPending = !verifiedAvg && !!pendingAvg;
                      return (
                        <tr key={player.id} className={`border-b border-surface-800 last:border-0 hover:bg-surface-800/50 transition-colors ${isPending ? 'opacity-60' : ''}`}>
                          <td className="px-5 py-3">
                            <span className="text-silver-200 font-body">{player.gamertag}</span>
                            {player.position && (
                              <span className="ml-2 text-[10px] text-silver-600 uppercase">{player.position}</span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-right text-silver-400">{avg.gamesPlayed}</td>
                          <td className="px-3 py-3 text-right text-white font-semibold">{avg.ppg}</td>
                          <td className="px-3 py-3 text-right text-silver-300">{avg.rpg}</td>
                          <td className="px-3 py-3 text-right text-silver-300">{avg.apg}</td>
                          <td className="px-3 py-3 text-right text-silver-300">{avg.spg}</td>
                          <td className="px-3 py-3 text-right text-silver-300">{avg.bpg}</td>
                          <td className="px-3 py-3 text-right text-silver-400">{avg.fgPct}%</td>
                          <td className="px-3 py-3 text-right text-silver-400">{avg.tpPct}%</td>
                          <td className="px-3 py-3 text-right">
                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                              isPending
                                ? 'text-silver-600 bg-surface-700'
                                : 'text-silver-300 bg-surface-700'
                            }`}>
                              {isPending ? 'PENDING' : 'VERIFIED'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
