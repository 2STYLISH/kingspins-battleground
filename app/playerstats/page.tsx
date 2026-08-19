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
    <span className={`inline-block ml-2 px-1.5 py-0.5 rounded text-[9px] font-mono uppercase tracking-widest font-bold ${color}`}>
      T{tier}
    </span>
  );
}

function TabHeader({ activeTab, activeTournamentId }: { activeTab: string; activeTournamentId: string }) {
  return (
    <div>
      <p className="text-[10px] text-gold font-mono uppercase tracking-[0.3em] mb-2">BATTLEGROUND LEADERBOARDS</p>
      <h1 className="text-5xl text-white font-display tracking-widest uppercase mb-2">PLAYER STATS</h1>
      <div className="flex gap-2 border-b border-surface-700 pb-px">
        <Link
          href={`/playerstats?tab=tournaments${activeTournamentId ? `&t=${activeTournamentId}` : ''}`}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'tournaments' ? 'border-gold text-gold' : 'border-transparent text-silver-500 hover:text-silver-300'
            }`}
        >
          Tournaments
        </Link>
        <Link
          href={`/playerstats?tab=all`}
          className={`px-4 py-2 text-xs font-mono uppercase tracking-widest border-b-2 transition-colors ${activeTab === 'all' ? 'border-gold text-gold' : 'border-transparent text-silver-500 hover:text-silver-300'
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
          <div className="bg-surface-950 border border-surface-700 rounded overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-xs font-mono">
                <thead>
                  <tr className="bg-surface-900 border-b border-surface-700 text-silver-500 uppercase tracking-widest text-[10px]">
                    <th className="text-left px-5 py-4 w-8">#</th>
                    <th className="text-left px-4 py-3 font-mono">Player</th>
                    <th className="text-left px-4 py-3 font-mono">Team</th>
                    <th className="px-3 py-3 text-right">GP</th>
                    <th className="px-3 py-3 text-right">PPG</th>
                    <th className="px-3 py-3 text-right">RPG</th>
                    <th className="px-3 py-3 text-right">APG</th>
                    <th className="px-3 py-3 text-right">SPG</th>
                    <th className="px-3 py-3 text-right">BPG</th>
                    <th className="px-3 py-3 text-right">FG%</th>
                    <th className="px-3 py-3 text-right">3P%</th>
                    <th className="px-3 py-3 text-right">FT%</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr><td colSpan={12} className="px-5 py-8 text-silver-600 text-center">No verified stats yet.</td></tr>
                  )}
                  {rows.map(({ player, avg, teamName }, idx) => (
                    <tr key={player.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800 transition-colors group">
                      <td className="px-5 py-4 text-silver-600 text-[10px]">{idx + 1}</td>
                      <td className="px-5 py-4">
                        <Link href={`/${player.slug || player.gamertag.toLowerCase()}`} className="text-white font-display tracking-widest uppercase group-hover:text-gold transition-colors">
                          {player.gamertag}
                        </Link>
                        {getTierBadge(player.tier)}
                      </td>
                      <td className="px-5 py-4 text-silver-500 font-mono text-[10px] uppercase tracking-widest">{teamName}</td>
                      <td className="px-3 py-3 text-right text-silver-400">{avg.gamesPlayed}</td>
                      <td className="px-3 py-3 text-right text-white font-semibold">{avg.ppg}</td>
                      <td className="px-3 py-3 text-right text-silver-300">{avg.rpg}</td>
                      <td className="px-3 py-3 text-right text-silver-300">{avg.apg}</td>
                      <td className="px-3 py-3 text-right text-silver-300">{avg.spg}</td>
                      <td className="px-3 py-3 text-right text-silver-300">{avg.bpg}</td>
                      <td className="px-3 py-3 text-right text-silver-400">{avg.fgPct}%</td>
                      <td className="px-3 py-3 text-right text-silver-400">{avg.tpPct}%</td>
                      <td className="px-3 py-3 text-right text-silver-400">{avg.ftPct}%</td>
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
              className="block p-6 border border-surface-700 bg-surface-950 hover:bg-surface-900 transition-colors rounded group">
              <div className="flex justify-between items-start mb-4">
                <p className="text-lg font-display text-white tracking-widest uppercase group-hover:text-gold transition-colors truncate">{t.name}</p>
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
              ? 'border-gold text-gold bg-gold/10'
              : 'border-surface-600 text-mute hover:text-bone hover:border-surface-400'
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
        <div className="border border-surface-700 bg-surface-950 p-8 text-center rounded">
          <p className="text-silver-600 font-mono uppercase tracking-widest text-sm">No player stats yet for this tournament.</p>
        </div>
      )}

      <div className="space-y-10">
        {[...teamMap.entries()].map(([teamId, { teamName, players: teamPlayers }]) => (
          <section key={teamId}>
            <h3 className="text-lg text-white font-display tracking-widest mb-3">{teamName}</h3>
            <div className="bg-surface-950 border border-surface-700 rounded overflow-hidden shadow-lg">
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="bg-surface-900 border-b border-surface-700 text-silver-500 uppercase tracking-widest text-[10px]">
                      <th className="text-left px-5 py-4">Player</th>
                      <th className="px-3 py-4 text-right">GP</th>
                      <th className="px-3 py-4 text-right">PPG</th>
                      <th className="px-3 py-4 text-right">RPG</th>
                      <th className="px-3 py-4 text-right">APG</th>
                      <th className="px-3 py-4 text-right">SPG</th>
                      <th className="px-3 py-4 text-right">BPG</th>
                      <th className="px-3 py-4 text-right">FG%</th>
                      <th className="px-3 py-4 text-right">3P%</th>
                      <th className="px-3 py-4 text-right">FT%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamPlayers.length === 0 && (
                      <tr><td colSpan={10} className="px-5 py-6 text-silver-600 text-center">No stats yet.</td></tr>
                    )}
                    {teamPlayers.map(({ player, avg }) => (
                      <tr key={player.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800 transition-colors group">
                        <td className="px-5 py-4">
                          <Link href={`/${player.slug || player.gamertag.toLowerCase()}`} className="text-white font-display tracking-widest uppercase group-hover:text-gold transition-colors">
                            {player.gamertag}
                          </Link>
                          {getTierBadge(player.tier)}
                          {player.position && <span className="ml-2 text-[10px] text-silver-600 uppercase font-mono tracking-widest">{player.position}</span>}
                        </td>
                        {avg ? (
                          <>
                            <td className="px-3 py-3 text-right text-silver-400">{avg.gamesPlayed}</td>
                            <td className="px-3 py-3 text-right text-white font-semibold">{avg.ppg}</td>
                            <td className="px-3 py-3 text-right text-silver-300">{avg.rpg}</td>
                            <td className="px-3 py-3 text-right text-silver-300">{avg.apg}</td>
                            <td className="px-3 py-3 text-right text-silver-300">{avg.spg}</td>
                            <td className="px-3 py-3 text-right text-silver-300">{avg.bpg}</td>
                            <td className="px-3 py-3 text-right text-silver-400">{avg.fgPct}%</td>
                            <td className="px-3 py-3 text-right text-silver-400">{avg.tpPct}%</td>
                            <td className="px-3 py-3 text-right text-silver-400">{avg.ftPct}%</td>
                          </>
                        ) : (
                          <td colSpan={9} className="px-3 py-3 text-right text-silver-700 italic">No games played</td>
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
