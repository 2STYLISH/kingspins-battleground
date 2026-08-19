import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { averageStats } from '@/lib/stats';
import type { PlayerGameStats } from '@/lib/types';

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
    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-widest font-bold ${color}`}>
      Tier {tier}
    </span>
  );
}

const AWARD_LABELS: Record<string, { label: string; icon: string }> = {
  BEST_PG:             { label: 'Best Point Guard',          icon: '🎯' },
  BEST_SG:             { label: 'Best Shooting Guard',       icon: '🔥' },
  BEST_SF:             { label: 'Best Small Forward',        icon: '🦅' },
  BEST_PF:             { label: 'Best Power Forward',        icon: '💪' },
  BEST_CENTER:         { label: 'Best Center',               icon: '🧱' },
  FINALS_MVP:          { label: 'Finals MVP',                icon: '🏆' },
  OVERALL_MVP:         { label: 'Overall MVP',               icon: '🌟' },
  OVERALL_DPOY:        { label: 'Overall DPOY',              icon: '🛡️' },
};

export default async function PlayerPage({ params, searchParams }: { params: { slug: string }; searchParams: { tab?: string } }) {
  const supabase = createClient();
  const activeTab = searchParams.tab === 'achievements' ? 'achievements' : searchParams.tab === 'gamelog' ? 'gamelog' : 'stats';

  const { data: player } = await supabase
    .from('players')
    .select('id, gamertag, position, tier, bio, team_id, team:teams(id, name)')
    .eq('slug', params.slug.toLowerCase())
    .maybeSingle();

  if (!player) notFound();

  // All verified stats for this player
  const { data: statsRaw } = await supabase
    .from('player_game_stats')
    .select(
      'pts, reb, ast, stl, blk, fgm, fga, tpm, tpa, ftm, fta, turnovers, did_not_play, is_verified, team_id, game:games!player_game_stats_game_id_fkey(id, home_team_id, away_team_id, home_score, away_score, played_at, home:teams!games_home_team_id_fkey(name), away:teams!games_away_team_id_fkey(name), schedule:schedules(tournament_id, tournament:tournaments(id, name)))'
    )
    .eq('player_id', player.id)
    .eq('is_verified', true)
    .order('game(played_at)', { ascending: false });

  const stats = (statsRaw ?? []).filter(r => !r.did_not_play) as any[];

  // Overall averages
  let wins = 0;
  let gamesPlayed = 0;
  for (const row of stats) {
    gamesPlayed++;
    const game = row.game;
    if (game && row.team_id) {
      const isHome = game.home_team_id === row.team_id;
      const myScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      if (myScore != null && oppScore != null && myScore > oppScore) wins++;
    }
  }
  const overallAvg = gamesPlayed > 0 ? averageStats(stats, wins, gamesPlayed) : null;
  const team = player.team as any;

  // Group by tournament — compute per-tournament averages + game logs
  type TournamentEntry = {
    tournamentId: string;
    tournamentName: string;
    rows: any[];
    wins: number;
    avg: ReturnType<typeof averageStats> | null;
  };
  const tournamentMap = new Map<string, TournamentEntry>();

  for (const row of stats) {
    const tournamentId = row.game?.schedule?.tournament_id ?? 'other';
    const tournamentName = row.game?.schedule?.tournament?.name ?? 'Pro-Am League';
    if (!tournamentMap.has(tournamentId)) {
      tournamentMap.set(tournamentId, { tournamentId, tournamentName, rows: [], wins: 0, avg: null });
    }
    const entry = tournamentMap.get(tournamentId)!;
    entry.rows.push(row);
    const game = row.game;
    if (game && row.team_id) {
      const isHome = game.home_team_id === row.team_id;
      const myScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      if (myScore != null && oppScore != null && myScore > oppScore) entry.wins++;
    }
  }
  for (const entry of tournamentMap.values()) {
    entry.avg = averageStats(entry.rows, entry.wins, entry.rows.length);
  }
  const tournamentEntries = [...tournamentMap.values()];

  // Achievements — championships + awards
  const { data: championships } = await supabase
    .from('championships')
    .select('tournament_id, champion_team_id, runner_up_team_id, tournament:tournaments(name, championship_award_name)')
    .or(`champion_team_id.eq.${team?.id ?? 'null'},runner_up_team_id.eq.${team?.id ?? 'null'}`);

  const { data: awards } = await supabase
    .from('awards')
    .select('award_type, tournament_id, season_id, tournament:tournaments(name), season:seasons(name)')
    .eq('winner_player_id', player.id)
    .eq('status', 'PUBLISHED');

  const champWins = (championships ?? []).filter((c: any) => c.champion_team_id === team?.id);
  const runnerUps = (championships ?? []).filter((c: any) => c.runner_up_team_id === team?.id && c.champion_team_id !== team?.id);
  const hasAchievements = champWins.length > 0 || runnerUps.length > 0 || (awards ?? []).length > 0;

  function TabLink({ tab, label }: { tab: string; label: string }) {
    const isActive = activeTab === tab;
    return (
      <Link
        href={`/${params.slug}?tab=${tab}`}
        className={`px-4 py-2 text-xs font-mono uppercase tracking-widest border-b-2 transition-colors ${
          isActive ? 'border-gold text-gold' : 'border-transparent text-silver-500 hover:text-silver-300'
        }`}
      >
        {label}
      </Link>
    );
  }

  return (
    <div className="space-y-8">
      <BackButton />
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-4 mt-4 mb-2">
          <h1 className="text-4xl text-white font-display tracking-widest">{player.gamertag}</h1>
          {getTierBadge(player.tier)}
          {hasAchievements && (
            <span className="text-xl" title="Has achievements">🏆</span>
          )}
        </div>
        {player.position && <p className="text-silver-500 text-sm uppercase tracking-widest font-mono">{player.position}</p>}
        {team && (
          <p className="text-silver-400 text-sm mt-1 font-mono">{team.name}</p>
        )}
        {player.bio && <p className="text-silver-400 text-sm mt-4 max-w-2xl leading-relaxed">{player.bio}</p>}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-surface-700 pb-px">
        <TabLink tab="stats" label="Stats" />
        <TabLink tab="gamelog" label="Game Log" />
        <TabLink tab="achievements" label={`Achievements${hasAchievements ? ' ★' : ''}`} />
      </div>

      {/* ── STATS TAB ── */}
      {activeTab === 'stats' && (
        <div className="space-y-8">
          {/* Overall averages */}
          <section>
            <h2 className="text-sm font-mono text-silver-400 uppercase tracking-widest mb-3">Overall Averages</h2>
            <div className="card overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs stat-mono">
                  <thead>
                    <tr className="border-b border-surface-700 text-silver-600 uppercase tracking-wider bg-surface-900/50">
                      <th className="px-5 py-4 text-center">GP</th>
                      <th className="px-5 py-4 text-center">PPG</th>
                      <th className="px-5 py-4 text-center">RPG</th>
                      <th className="px-5 py-4 text-center">APG</th>
                      <th className="px-5 py-4 text-center">SPG</th>
                      <th className="px-5 py-4 text-center">BPG</th>
                      <th className="px-5 py-4 text-center">FG%</th>
                      <th className="px-5 py-4 text-center">3P%</th>
                      <th className="px-5 py-4 text-center">FT%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overallAvg ? (
                      <tr>
                        <td className="px-5 py-5 text-center text-silver-300">{overallAvg.gamesPlayed}</td>
                        <td className="px-5 py-5 text-center text-white font-bold text-lg">{overallAvg.ppg}</td>
                        <td className="px-5 py-5 text-center text-silver-200">{overallAvg.rpg}</td>
                        <td className="px-5 py-5 text-center text-silver-200">{overallAvg.apg}</td>
                        <td className="px-5 py-5 text-center text-silver-200">{overallAvg.spg}</td>
                        <td className="px-5 py-5 text-center text-silver-200">{overallAvg.bpg}</td>
                        <td className="px-5 py-5 text-center text-silver-400">{overallAvg.fgPct}%</td>
                        <td className="px-5 py-5 text-center text-silver-400">{overallAvg.tpPct}%</td>
                        <td className="px-5 py-5 text-center text-silver-400">{overallAvg.ftPct}%</td>
                      </tr>
                    ) : (
                      <tr><td colSpan={9} className="px-5 py-8 text-center text-silver-600">No verified game stats yet.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* Per-tournament averages */}
          {tournamentEntries.length > 0 && (
            <section>
              <h2 className="text-sm font-mono text-silver-400 uppercase tracking-widest mb-3">By Tournament</h2>
              <div className="space-y-4">
                {tournamentEntries.map(entry => (
                  <div key={entry.tournamentId} className="card overflow-hidden">
                    <div className="px-5 py-3 border-b border-surface-700 flex items-center justify-between">
                      <p className="text-xs font-mono text-gold uppercase tracking-widest">{entry.tournamentName}</p>
                      <Link
                        href={`/${params.slug}?tab=gamelog#${entry.tournamentId}`}
                        className="text-[10px] font-mono text-silver-500 hover:text-white uppercase tracking-widest"
                      >
                        Game Log →
                      </Link>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs stat-mono">
                        <thead>
                          <tr className="border-b border-surface-700 text-silver-600 uppercase tracking-wider bg-surface-900/30">
                            <th className="px-5 py-3 text-center">GP</th>
                            <th className="px-5 py-3 text-center">W</th>
                            <th className="px-5 py-3 text-center">PPG</th>
                            <th className="px-5 py-3 text-center">RPG</th>
                            <th className="px-5 py-3 text-center">APG</th>
                            <th className="px-5 py-3 text-center">SPG</th>
                            <th className="px-5 py-3 text-center">BPG</th>
                            <th className="px-5 py-3 text-center">FG%</th>
                            <th className="px-5 py-3 text-center">3P%</th>
                            <th className="px-5 py-3 text-center">FT%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.avg ? (
                            <tr>
                              <td className="px-5 py-4 text-center text-silver-300">{entry.avg.gamesPlayed}</td>
                              <td className="px-5 py-4 text-center text-green-400">{entry.wins}</td>
                              <td className="px-5 py-4 text-center text-white font-bold">{entry.avg.ppg}</td>
                              <td className="px-5 py-4 text-center text-silver-200">{entry.avg.rpg}</td>
                              <td className="px-5 py-4 text-center text-silver-200">{entry.avg.apg}</td>
                              <td className="px-5 py-4 text-center text-silver-200">{entry.avg.spg}</td>
                              <td className="px-5 py-4 text-center text-silver-200">{entry.avg.bpg}</td>
                              <td className="px-5 py-4 text-center text-silver-400">{entry.avg.fgPct}%</td>
                              <td className="px-5 py-4 text-center text-silver-400">{entry.avg.tpPct}%</td>
                              <td className="px-5 py-4 text-center text-silver-400">{entry.avg.ftPct}%</td>
                            </tr>
                          ) : (
                            <tr><td colSpan={10} className="py-4 text-center text-silver-600">No stats</td></tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* ── GAME LOG TAB ── */}
      {activeTab === 'gamelog' && (
        <div className="space-y-10">
          {tournamentEntries.length === 0 && (
            <p className="text-silver-600">No verified games yet.</p>
          )}
          {tournamentEntries.map(entry => (
            <section key={entry.tournamentId} id={entry.tournamentId}>
              <h2 className="text-sm font-display text-gold uppercase tracking-widest mb-3">{entry.tournamentName} — Game Log</h2>
              <div className="card overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs stat-mono">
                    <thead>
                      <tr className="border-b border-surface-700 text-silver-600 uppercase tracking-wider bg-surface-900/50">
                        <th className="text-left px-5 py-3 font-mono">Date</th>
                        <th className="text-left px-3 py-3 font-mono">Matchup</th>
                        <th className="px-3 py-3 text-right text-white">PTS</th>
                        <th className="px-3 py-3 text-right">REB</th>
                        <th className="px-3 py-3 text-right">AST</th>
                        <th className="px-3 py-3 text-right">STL</th>
                        <th className="px-3 py-3 text-right">BLK</th>
                        <th className="px-3 py-3 text-right">FGM-A</th>
                        <th className="px-3 py-3 text-right">3PM-A</th>
                        <th className="px-3 py-3 text-right">TO</th>
                      </tr>
                    </thead>
                    <tbody>
                      {entry.rows.map((row, i) => {
                        const game = row.game;
                        const isHome = game.home_team_id === row.team_id;
                        const myScore = isHome ? game.home_score : game.away_score;
                        const oppScore = isHome ? game.away_score : game.home_score;
                        const oppName = isHome ? game.away?.name : game.home?.name;
                        const won = myScore != null && oppScore != null && myScore > oppScore;
                        const dateStr = game.played_at
                          ? new Date(game.played_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                          : '—';
                        return (
                          <tr key={game.id + '-' + i} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/50 transition-colors">
                            <td className="px-5 py-3 text-silver-500 whitespace-nowrap">
                              <Link href={`/games/${game.id}`} className="hover:text-white hover:underline">{dateStr}</Link>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className={`inline-block w-4 text-center mr-2 font-bold ${won ? 'text-green-500' : 'text-crimson-500'}`}>
                                {won ? 'W' : 'L'}
                              </span>
                              <span className="text-silver-400">{isHome ? 'vs' : '@'} {oppName ?? 'Unknown'}</span>
                            </td>
                            <td className="px-3 py-3 text-right text-white font-semibold">{row.pts}</td>
                            <td className="px-3 py-3 text-right text-silver-300">{row.reb}</td>
                            <td className="px-3 py-3 text-right text-silver-300">{row.ast}</td>
                            <td className="px-3 py-3 text-right text-silver-300">{row.stl}</td>
                            <td className="px-3 py-3 text-right text-silver-300">{row.blk}</td>
                            <td className="px-3 py-3 text-right text-silver-500">{row.fgm}-{row.fga}</td>
                            <td className="px-3 py-3 text-right text-silver-500">{row.tpm}-{row.tpa}</td>
                            <td className="px-3 py-3 text-right text-silver-500">{row.turnovers}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}

      {/* ── ACHIEVEMENTS TAB ── */}
      {activeTab === 'achievements' && (
        <div className="space-y-6">
          {!hasAchievements && (
            <div className="card p-10 text-center">
              <p className="text-3xl mb-3">🎮</p>
              <p className="text-silver-500">No achievements yet. Keep grinding!</p>
            </div>
          )}

          {/* Championship wins */}
          {champWins.length > 0 && (
            <section>
              <h2 className="text-sm font-mono text-gold uppercase tracking-widest mb-3">🏆 Tournament Champion</h2>
              <div className="space-y-3">
                {champWins.map((c: any) => (
                  <div key={c.tournament_id} className="card p-4 border-gold/40 bg-gold/5 flex items-center gap-4">
                    <span className="text-2xl">🏆</span>
                    <div>
                      <p className="text-white font-display tracking-widest">{c.tournament?.name ?? 'Tournament'}</p>
                      <p className="text-[10px] font-mono text-gold uppercase tracking-widest mt-0.5">
                        {c.tournament?.championship_award_name ?? 'Champion'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Runner-up */}
          {runnerUps.length > 0 && (
            <section>
              <h2 className="text-sm font-mono text-silver-400 uppercase tracking-widest mb-3">🥈 Runner-Up</h2>
              <div className="space-y-3">
                {runnerUps.map((c: any) => (
                  <div key={c.tournament_id} className="card p-4 border-surface-600 flex items-center gap-4">
                    <span className="text-2xl">🥈</span>
                    <div>
                      <p className="text-white font-display tracking-widest">{c.tournament?.name ?? 'Tournament'}</p>
                      <p className="text-[10px] font-mono text-silver-400 uppercase tracking-widest mt-0.5">Runner-Up</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Awards */}
          {(awards ?? []).length > 0 && (
            <section>
              <h2 className="text-sm font-mono text-silver-400 uppercase tracking-widest mb-3">🌟 Awards</h2>
              <div className="grid gap-3 sm:grid-cols-2">
                {(awards ?? []).map((award: any, i) => {
                  const info = AWARD_LABELS[award.award_type] ?? { label: award.award_type, icon: '🏅' };
                  const context = award.tournament?.name ?? award.season?.name ?? '';
                  return (
                    <div key={i} className="card p-4 flex items-center gap-4 hover:border-gold/40 transition-colors">
                      <span className="text-2xl">{info.icon}</span>
                      <div>
                        <p className="text-white font-display tracking-widest text-sm">{info.label}</p>
                        {context && <p className="text-[10px] font-mono text-silver-500 uppercase tracking-widest mt-0.5">{context}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
