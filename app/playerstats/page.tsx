import Link from '@/components/HiddenLink';
import { createClient } from '@/lib/supabase/server';
import { averageStats } from '@/lib/stats';
import type { PlayerGameStats } from '@/lib/types';

export const metadata = {
  title: 'Player Stats — Kingpins Battleground',
  description: 'Player statistics for every tournament and overall in the Kingpins Battleground Pro-Am league.',
};

function getTierBadge(tier: number | null) {
  if (!tier) return null;
  const colors: Record<number, string> = {
    1: 'bg-red-600 text-white',
    2: 'bg-purple-600 text-white',
    3: 'bg-yellow-500 text-black',
    4: 'bg-gray-300 text-black',
    5: 'bg-orange-700 text-white',
    6: 'bg-black text-white border border-surface-700',
  };
  const color = colors[tier] || colors[6];
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest font-bold items-center justify-center ${color}`}>
      T{tier}
    </span>
  );
}

function TabHeader({ activeTab, activeTournamentId }: { activeTab: string; activeTournamentId: string }) {
  return (
    <div className="mb-6">
      <p className="text-[10px] text-gold font-mono uppercase tracking-[0.4em] mb-2 font-bold drop-shadow-sm">Battleground Leaderboards</p>
      <h1 className="text-5xl md:text-6xl text-white font-display tracking-widest uppercase mb-8 drop-shadow-[0_0_20px_rgba(255,215,0,0.15)]">Player Stats</h1>
      <div className="inline-flex flex-wrap gap-2 md:gap-0 bg-surface-900/60 backdrop-blur-md p-1.5 rounded-xl border border-surface-700/50 shadow-inner">
        <Link
          href={`/playerstats?tab=tournaments${activeTournamentId ? `&t=${activeTournamentId}` : ''}`}
          className={`px-6 py-2.5 text-xs font-mono uppercase tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'tournaments' ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-500/50' : 'text-silver-400 hover:text-white hover:bg-surface-800'
            }`}
        >
          Tournaments
        </Link>
        <Link
          href={`/playerstats?tab=all`}
          className={`px-6 py-2.5 text-xs font-mono uppercase tracking-widest rounded-lg transition-all duration-300 ${activeTab === 'all' ? 'bg-gradient-to-r from-red-600 to-red-500 text-white shadow-[0_0_15px_rgba(220,38,38,0.5)] border border-red-500/50' : 'text-silver-400 hover:text-white hover:bg-surface-800'
            }`}
        >
          Overall Stats
        </Link>
      </div>
    </div>
  );
}

export default async function StatsPage({ searchParams }: { searchParams: { tab?: string; t?: string } }) {
  const supabase = createClient();
  const activeTab = searchParams.tab === 'all' ? 'all' : 'tournaments';

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, format')
    .order('created_at', { ascending: false });

  const activeTournamentId = searchParams.t || '';
  const activeTournament = tournaments?.find(t => t.id === activeTournamentId) ?? null;

  const { data: players } = await supabase
    .from('players')
    .select('id, gamertag, position, tier, slug');

  // ── ALL PLAYERS TAB ──────────────────────────────────────────────────────────
  if (activeTab === 'all') {
    const { data: allStats } = await supabase
      .from('player_game_stats')
      .select('player_id, team_id, pts, reb, ast, stl, blk, fgm, fga, tpm, tpa, ftm, fta, turnovers, did_not_play, is_verified, game:games!player_game_stats_game_id_fkey(home_team_id, away_team_id, home_score, away_score)')
      .eq('is_verified', true)
      .eq('did_not_play', false);

    const { data: allTeams } = await supabase.from('teams').select('id, name');

    const statsByPlayer = new Map<string, { rows: PlayerGameStats[]; wins: number; gamesPlayed: number; teamId?: string }>();
    for (const row of (allStats ?? []) as any[]) {
      if (!statsByPlayer.has(row.player_id)) {
        statsByPlayer.set(row.player_id, { rows: [], wins: 0, gamesPlayed: 0, teamId: row.team_id });
      }
      const entry = statsByPlayer.get(row.player_id)!;
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

    const rows = (players ?? [])
      .map(player => {
        const entry = statsByPlayer.get(player.id);
        if (!entry || entry.rows.length === 0) return null;
        const avg = averageStats(entry.rows, entry.wins, entry.gamesPlayed);
        const teamName = allTeams?.find(t => t.id === entry.teamId)?.name ?? '—';
        return { player, avg, teamName };
      })
      .filter(Boolean)
      .sort((a, b) => b!.avg.ppg - a!.avg.ppg) as { player: any; avg: any; teamName: string }[];

    return (
      <div className="space-y-8">
        <TabHeader activeTab="all" activeTournamentId={activeTournamentId} />
        <section>
          <div className="relative rounded-2xl overflow-hidden bg-surface-950/80 backdrop-blur-md border border-surface-700/50 hover:border-surface-600/80 transition-colors shadow-2xl">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono stat-mono">
                <thead>
                  <tr className="bg-surface-900/40 text-[9px] text-silver-500 uppercase tracking-widest border-b border-surface-800/80">
                    <th className="text-left px-6 py-4 w-10 font-medium">#</th>
                    <th className="text-left px-4 py-4 font-medium hover:text-white transition-colors cursor-default">Player</th>
                    <th className="text-left px-4 py-4 font-medium hover:text-white transition-colors cursor-default">Team</th>
                    <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">GP</th>
                    <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">PPG</th>
                    <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">RPG</th>
                    <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">APG</th>
                    <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">SPG</th>
                    <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">BPG</th>
                    <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">FG%</th>
                    <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">3P%</th>
                    <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">FT%</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-800/30">
                  {rows.length === 0 && (
                    <tr><td colSpan={12} className="px-6 py-10 text-silver-600 text-center uppercase tracking-widest text-[10px]">No verified stats yet.</td></tr>
                  )}
                  {rows.map(({ player, avg, teamName }, idx) => (
                    <tr key={player.id} className="group/row transition-all hover:bg-surface-800/40">
                      <td className="px-6 py-4 text-gold text-[10px] font-bold opacity-70">{idx + 1}</td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <Link href={`/${player.slug || player.gamertag.toLowerCase()}`} className="text-silver-200 font-body group-hover/row:text-white transition-colors">
                            {player.gamertag}
                          </Link>
                          {getTierBadge(player.tier)}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-silver-500 font-mono text-[9px] uppercase tracking-widest group-hover/row:text-silver-300 transition-colors">{teamName}</td>
                      <td className="px-4 py-4 text-right text-silver-400 group-hover/row:text-silver-200 transition-colors">{avg.gamesPlayed}</td>
                      <td className="px-4 py-4 text-right text-white font-bold text-sm">{avg.ppg}</td>
                      <td className="px-4 py-4 text-right text-silver-300 group-hover/row:text-silver-100 transition-colors">{avg.rpg}</td>
                      <td className="px-4 py-4 text-right text-silver-300 group-hover/row:text-silver-100 transition-colors">{avg.apg}</td>
                      <td className="px-4 py-4 text-right text-silver-300 group-hover/row:text-silver-100 transition-colors">{avg.spg}</td>
                      <td className="px-4 py-4 text-right text-silver-300 group-hover/row:text-silver-100 transition-colors">{avg.bpg}</td>
                      <td className="px-4 py-4 text-right text-silver-400 group-hover/row:text-silver-200 transition-colors">{avg.fgPct}%</td>
                      <td className="px-4 py-4 text-right text-silver-400 group-hover/row:text-silver-200 transition-colors">{avg.tpPct}%</td>
                      <td className="px-4 py-4 text-right text-silver-400 group-hover/row:text-silver-200 transition-colors">{avg.ftPct}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ── TOURNAMENTS TAB ──────────────────────────────────────────────────────────
  // No tournament selected — show tournament picker
  if (!activeTournamentId) {
    return (
      <div className="space-y-8">
        <TabHeader activeTab="tournaments" activeTournamentId="" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-8">
          {(tournaments ?? []).length === 0 && <p className="text-silver-500 font-mono text-sm uppercase">No tournaments yet.</p>}
          {(tournaments ?? []).map(t => (
            <Link key={t.id} href={`/playerstats?tab=tournaments&t=${t.id}`}
              className="block p-6 border border-surface-700 bg-[#080808]/90 backdrop-blur-sm hover:border-red-600 transition-colors rounded group shadow-lg">
              <div className="flex justify-between items-start mb-4">
                <p className="text-lg font-display text-white tracking-widest uppercase group-hover:text-red-600 transition-colors truncate">{t.name}</p>
              </div>
              <div className="flex items-center justify-between mt-4">
                <p className="text-[9px] font-mono text-silver-500 uppercase tracking-widest">{t.format.replace(/_/g, ' ')}</p>
                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded uppercase tracking-widest ${t.status === 'IN_PROGRESS' ? 'bg-gold text-black' :
                  t.status === 'COMPLETED' ? 'bg-surface-800 text-silver-400 border border-surface-700' :
                    'bg-surface-800 text-silver-500 border border-surface-700'
                  }`}>{t.status.replace(/_/g, ' ')}</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    );
  }

  // Tournament selected — show its stats
  const { data: rosters } = await supabase
    .from('tournament_rosters')
    .select('team_id, player_id, team:teams(id, name)')
    .eq('tournament_id', activeTournamentId);

  const { data: tourneyStatsRaw } = await supabase
    .from('player_game_stats')
    .select('player_id, team_id, pts, reb, ast, stl, blk, fgm, fga, tpm, tpa, ftm, fta, turnovers, did_not_play, is_verified, game:games!player_game_stats_game_id_fkey(home_team_id, away_team_id, home_score, away_score, schedule:schedules(tournament_id))')
    .eq('is_verified', true)
    .eq('did_not_play', false);

  const filteredStats = (tourneyStatsRaw ?? []).filter((s: any) => s.game?.schedule?.tournament_id === activeTournamentId);

  const statsByPlayer = new Map<string, { rows: PlayerGameStats[]; wins: number; gamesPlayed: number }>();
  for (const row of filteredStats as any[]) {
    if (!statsByPlayer.has(row.player_id)) {
      statsByPlayer.set(row.player_id, { rows: [], wins: 0, gamesPlayed: 0 });
    }
    const entry = statsByPlayer.get(row.player_id)!;
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

  // Build team → players map
  const teamMap = new Map<string, { teamName: string; players: { player: any; avg: any }[] }>();
  for (const roster of (rosters ?? []) as any[]) {
    const teamName = roster.team?.name ?? 'Unknown';
    const teamId = roster.team_id;
    if (!teamMap.has(teamId)) teamMap.set(teamId, { teamName, players: [] });
    const player = (players ?? []).find(p => p.id === roster.player_id);
    if (!player) continue;
    const entry = statsByPlayer.get(player.id);
    const avg = entry && entry.rows.length > 0 ? averageStats(entry.rows, entry.wins, entry.gamesPlayed) : null;
    teamMap.get(teamId)!.players.push({ player, avg });
  }
  for (const team of teamMap.values()) {
    team.players.sort((a, b) => (b.avg?.ppg ?? -1) - (a.avg?.ppg ?? -1));
  }

  return (
    <div className="space-y-8">
      <TabHeader activeTab="tournaments" activeTournamentId={activeTournamentId} />

      {/* Tournament pills */}
      <div className="flex flex-wrap gap-2">
        {(tournaments ?? []).map(t => (
          <Link key={t.id} href={`/playerstats?tab=tournaments&t=${t.id}`}
            className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase border transition-colors ${t.id === activeTournamentId
              ? 'border-[#b8860b] text-[#b8860b] bg-[#b8860b]/10'
              : 'border-surface-600 text-silver-500 hover:text-red-600 hover:border-red-600'
              }`}>{t.name}</Link>
        ))}
      </div>

      {activeTournament && (
        <div className="flex items-center gap-3">
          <h2 className="text-2xl text-bone font-display tracking-widest">{activeTournament.name}</h2>
          <span className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase tracking-widest ${activeTournament.status === 'IN_PROGRESS' ? 'bg-gold/20 text-gold border border-gold/40' :
            activeTournament.status === 'COMPLETED' ? 'bg-green-900/40 text-green-400 border border-green-800/60' :
              'bg-surface-700 text-silver-400'
            }`}>{activeTournament.status.replace(/_/g, ' ')}</span>
        </div>
      )}

      {teamMap.size === 0 && (
        <div className="border border-surface-700 bg-[#080808]/90 backdrop-blur-sm shadow-lg p-8 text-center rounded">
          <p className="text-silver-600 font-mono uppercase tracking-widest text-sm">No player stats yet for this tournament.</p>
        </div>
      )}

      <div className="space-y-10">
        {[...teamMap.entries()].map(([teamId, { teamName, players: teamPlayers }]) => (
          <section key={teamId}>
            <h3 className="text-lg text-[#b8860b] font-display tracking-widest mb-3">{teamName}</h3>
            <div className="relative rounded-2xl overflow-hidden bg-surface-950/80 backdrop-blur-md border border-surface-700/50 hover:border-surface-600/80 transition-colors shadow-2xl">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono stat-mono">
                  <thead>
                    <tr className="bg-surface-900/40 text-[9px] text-silver-500 uppercase tracking-widest border-b border-surface-800/80">
                      <th className="text-left px-6 py-4 font-medium">Player</th>
                      <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">GP</th>
                      <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">PPG</th>
                      <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">RPG</th>
                      <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">APG</th>
                      <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">SPG</th>
                      <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">BPG</th>
                      <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">FG%</th>
                      <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">3P%</th>
                      <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">FT%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-800/30">
                    {teamPlayers.length === 0 && (
                      <tr><td colSpan={10} className="px-6 py-10 text-silver-600 text-center uppercase tracking-widest text-[10px]">No stats yet.</td></tr>
                    )}
                    {teamPlayers.map(({ player, avg }) => (
                      <tr key={player.id} className="group/row transition-all hover:bg-surface-800/40">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {player.position && <span className="w-7 text-center text-[9px] bg-surface-900 text-silver-400 border border-surface-700 rounded px-1 py-1 uppercase tracking-widest font-bold group-hover/row:border-silver-500 transition-colors">{player.position.slice(0, 2)}</span>}
                            <Link href={`/${player.slug || player.gamertag.toLowerCase()}`} className="text-silver-200 font-body group-hover/row:text-white transition-colors">
                              {player.gamertag}
                            </Link>
                            {getTierBadge(player.tier)}
                          </div>
                        </td>
                        {avg ? (
                          <>
                            <td className="px-4 py-4 text-right text-silver-400 group-hover/row:text-silver-200 transition-colors">{avg.gamesPlayed}</td>
                            <td className="px-4 py-4 text-right text-white font-bold text-sm">{avg.ppg}</td>
                            <td className="px-4 py-4 text-right text-silver-300 group-hover/row:text-silver-100 transition-colors">{avg.rpg}</td>
                            <td className="px-4 py-4 text-right text-silver-300 group-hover/row:text-silver-100 transition-colors">{avg.apg}</td>
                            <td className="px-4 py-4 text-right text-silver-300 group-hover/row:text-silver-100 transition-colors">{avg.spg}</td>
                            <td className="px-4 py-4 text-right text-silver-300 group-hover/row:text-silver-100 transition-colors">{avg.bpg}</td>
                            <td className="px-4 py-4 text-right text-silver-400 group-hover/row:text-silver-200 transition-colors">{avg.fgPct}%</td>
                            <td className="px-4 py-4 text-right text-silver-400 group-hover/row:text-silver-200 transition-colors">{avg.tpPct}%</td>
                            <td className="px-4 py-4 text-right text-silver-400 group-hover/row:text-silver-200 transition-colors">{avg.ftPct}%</td>
                          </>
                        ) : (
                          <td colSpan={9} className="px-4 py-4 text-right text-silver-700 italic group-hover/row:text-silver-500 transition-colors">No games played</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
