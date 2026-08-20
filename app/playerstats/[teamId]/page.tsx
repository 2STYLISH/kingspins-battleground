import Link from '@/components/HiddenLink';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { averageStats } from '@/lib/stats';
import type { PlayerGameStats } from '@/lib/types';

export default async function TeamDetailPage({ params }: { params: { teamId: string } }) {
  const supabase = createClient();

  const { data: team } = await supabase
    .from('teams')
    .select('id, name')
    .eq('id', params.teamId)
    .maybeSingle();

  if (!team) notFound();

  const { data: players } = await supabase
    .from('players')
    .select('id, gamertag, position')
    .eq('team_id', params.teamId);

  // All verified, non-DNP stats for this team
  const { data: statsRaw } = await supabase
    .from('player_game_stats')
    .select(
      'player_id, pts, reb, ast, stl, blk, fgm, fga, tpm, tpa, ftm, fta, turnovers, did_not_play, is_verified, game:games!player_game_stats_game_id_fkey(id, home_team_id, away_team_id, home_score, away_score, played_at, home:teams!games_home_team_id_fkey(name), away:teams!games_away_team_id_fkey(name))'
    )
    .eq('team_id', params.teamId)
    .eq('is_verified', true)
    .order('player_id');

  const stats = (statsRaw ?? []) as any[];

  // Per-player averages
  const statsByPlayer = new Map<string, { rows: PlayerGameStats[]; wins: number; gamesPlayed: number }>();
  const gameLog = new Map<string, { game: any; playerLines: any[] }>();

  for (const row of stats) {
    // Player stats aggregation (exclude DNP)
    if (!row.did_not_play) {
      if (!statsByPlayer.has(row.player_id)) {
        statsByPlayer.set(row.player_id, { rows: [], wins: 0, gamesPlayed: 0 });
      }
      const entry = statsByPlayer.get(row.player_id)!;
      entry.rows.push(row as PlayerGameStats);
      entry.gamesPlayed++;

      const game = row.game;
      if (game) {
        const isHome = game.home_team_id === params.teamId;
        const myScore = isHome ? game.home_score : game.away_score;
        const oppScore = isHome ? game.away_score : game.home_score;
        if (myScore != null && oppScore != null && myScore > oppScore) entry.wins++;
      }
    }

    // Game log aggregation
    const gameId = row.game?.id;
    if (gameId) {
      if (!gameLog.has(gameId)) {
        gameLog.set(gameId, { game: row.game, playerLines: [] });
      }
      gameLog.get(gameId)!.playerLines.push(row);
    }
  }

  const playerMap = new Map((players ?? []).map((p) => [p.id, p]));
  const gameLogArr = [...gameLog.values()].sort(
    (a, b) => new Date(b.game.played_at ?? 0).getTime() - new Date(a.game.played_at ?? 0).getTime()
  );

  const playerRows = (players ?? [])
    .map((player) => {
      const entry = statsByPlayer.get(player.id);
      if (!entry || entry.rows.length === 0) return { player, avg: null };
      const avg = averageStats(entry.rows, entry.wins, entry.gamesPlayed);
      return { player, avg };
    })
    .sort((a, b) => {
      if (!a.avg && !b.avg) return 0;
      if (!a.avg) return 1;
      if (!b.avg) return -1;
      return b.avg.ppg - a.avg.ppg;
    });

  return (
    <div className="space-y-10">
      {/* Header */}
      <div>
        <Link href="/teams" className="text-xs font-mono text-silver-500 hover:text-white transition-colors uppercase tracking-widest">
          ← All Teams
        </Link>
        <h1 className="text-4xl text-white mt-3 mb-1">{team.name}</h1>
        <p className="text-silver-500 text-sm">Season 1 · Verified game stats</p>
      </div>

      {/* Season Averages Table */}
      <section>
        <h2 className="text-sm font-mono text-silver-400 uppercase tracking-widest mb-3">Season Averages</h2>
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
                  <th className="px-3 py-3 text-right">FT%</th>
                </tr>
              </thead>
              <tbody>
                {playerRows.map(({ player, avg }) => (
                  <tr key={player.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/50 transition-colors">
                    <td className="px-5 py-3">
                      <span className="text-silver-200 font-body">{player.gamertag}</span>
                      {player.position && (
                        <span className="ml-2 text-[10px] text-silver-600 uppercase">{player.position}</span>
                      )}
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

      {/* Game Log */}
      {gameLogArr.length > 0 && (
        <section>
          <h2 className="text-sm font-mono text-silver-400 uppercase tracking-widest mb-3">Game Log</h2>
          <div className="space-y-3">
            {gameLogArr.map(({ game, playerLines }) => {
              const isHome = game.home_team_id === params.teamId;
              const myScore = isHome ? game.home_score : game.away_score;
              const oppScore = isHome ? game.away_score : game.home_score;
              const oppName = isHome ? game.away?.name : game.home?.name;
              const won = myScore != null && oppScore != null && myScore > oppScore;

              return (
                <div key={game.id} className="card p-5">
                  <div className="flex items-center gap-4 mb-3">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${won ? 'bg-surface-700 text-silver-200' : 'bg-surface-800 text-silver-500'}`}>
                      {won ? 'W' : 'L'}
                    </span>
                    <p className="text-silver-300 text-sm">
                      {isHome ? 'vs' : '@'} {oppName ?? 'Unknown'}
                    </p>
                    <p className="text-silver-500 text-xs font-mono ml-auto">
                      {myScore} – {oppScore}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-[11px] stat-mono min-w-[600px]">
                      <thead>
                        <tr className="text-silver-700 uppercase border-b border-surface-800">
                          <th className="text-left py-1 pr-3 font-mono">Player</th>
                          <th className="px-1 text-right">PTS</th>
                          <th className="px-1 text-right">REB</th>
                          <th className="px-1 text-right">AST</th>
                          <th className="px-1 text-right">STL</th>
                          <th className="px-1 text-right">BLK</th>
                          <th className="px-1 text-right">TO</th>
                          <th className="px-1 text-right">FGM</th>
                          <th className="px-1 text-right">FGA</th>
                          <th className="px-1 text-right">3PM</th>
                        </tr>
                      </thead>
                      <tbody>
                        {playerLines.map((line) => {
                          const p = playerMap.get(line.player_id);
                          return (
                            <tr key={line.player_id} className={`border-b border-surface-900 last:border-0 ${line.did_not_play ? 'opacity-40' : ''}`}>
                              <td className="py-1 pr-3 text-silver-400 whitespace-nowrap">
                                {p?.gamertag ?? '—'}
                                {line.did_not_play && <span className="ml-2 text-[9px] text-silver-600">DNP</span>}
                              </td>
                              <td className="px-1 text-right text-silver-200">{line.pts}</td>
                              <td className="px-1 text-right text-silver-400">{line.reb}</td>
                              <td className="px-1 text-right text-silver-400">{line.ast}</td>
                              <td className="px-1 text-right text-silver-400">{line.stl}</td>
                              <td className="px-1 text-right text-silver-400">{line.blk}</td>
                              <td className="px-1 text-right text-silver-400">{line.turnovers}</td>
                              <td className="px-1 text-right text-silver-400">{line.fgm}</td>
                              <td className="px-1 text-right text-silver-400">{line.fga}</td>
                              <td className="px-1 text-right text-silver-400">{line.tpm}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
