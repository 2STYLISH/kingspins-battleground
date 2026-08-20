export const dynamic = 'force-dynamic';
import { createClient } from '@/lib/supabase/server';
import Link from '@/components/HiddenLink';
import BracketTree from '@/components/BracketTree';
import MatchesFilter from '@/components/MatchesFilter';
import BackButton from '@/components/BackButton';
import { notFound } from 'next/navigation';
import { formatDate } from '@/lib/format';
import { averageStats } from '@/lib/stats';
import type { PlayerGameStats } from '@/lib/types';

export default async function TournamentDashboard({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*')
    .eq('id', params.id)
    .maybeSingle();

  if (!tournament) notFound();

  const [
    { data: matchups },
    { data: seeds },
    { data: upcoming },
    { data: completed },
    { data: rosters },
    { data: championship },
  ] = await Promise.all([
    supabase
      .from('bracket_matchups')
      .select('id, round, slot, status, match_format, winner_id, is_bye, bracket_side, feeds_into_matchup_id, loser_feeds_into_matchup_id, team_a:teams!bracket_matchups_team_a_id_fkey(id,name), team_b:teams!bracket_matchups_team_b_id_fkey(id,name), series(team_a_wins, team_b_wins), schedule:schedules(games(home_score, away_score))')
      .eq('tournament_id', tournament.id)
      .order('round', { ascending: true })
      .order('slot', { ascending: true }),
    supabase.from('tournament_seeds').select('seed, team:teams(name)').eq('tournament_id', tournament.id).order('seed'),
    supabase.from('schedules').select('id, scheduled_date, scheduled_time, round_label, home:teams!schedules_home_team_id_fkey(name), away:teams!schedules_away_team_id_fkey(name)').eq('tournament_id', tournament.id).eq('status', 'SCHEDULED'),
    supabase.from('schedules').select('id, scheduled_date, round_label, home:teams!schedules_home_team_id_fkey(name), away:teams!schedules_away_team_id_fkey(name), games(id)').eq('tournament_id', tournament.id).eq('status', 'COMPLETED'),
    supabase.from('tournament_rosters').select('team_id, player_id, team:teams(id, name)').eq('tournament_id', tournament.id),
    supabase.from('championships').select('champion_team_id, runner_up_team_id, champion:teams!championships_champion_team_id_fkey(name), runner_up:teams!championships_runner_up_team_id_fkey(name)').eq('tournament_id', tournament.id).maybeSingle(),
  ]);

  // ── Player Stats ─────────────────────────────────────────────────────────────
  const { data: players } = await supabase.from('players').select('id, gamertag, position, tier, slug');

  const { data: statsRaw } = await supabase
    .from('player_game_stats')
    .select('player_id, team_id, pts, reb, ast, stl, blk, fgm, fga, tpm, tpa, ftm, fta, turnovers, did_not_play, is_verified, game:games!player_game_stats_game_id_fkey(home_team_id, away_team_id, home_score, away_score, schedule:schedules(tournament_id))')
    .eq('is_verified', true)
    .eq('did_not_play', false);

  const tourneyStats = (statsRaw ?? []).filter((s: any) => s.game?.schedule?.tournament_id === tournament.id);

  const statsByPlayer = new Map<string, { rows: PlayerGameStats[]; wins: number; gamesPlayed: number }>();
  for (const row of tourneyStats as any[]) {
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

  // Build team → players map for stats
  const teamStatsMap = new Map<string, { teamName: string; players: { player: any; avg: any }[] }>();
  for (const roster of (rosters ?? []) as any[]) {
    const teamName = roster.team?.name ?? 'Unknown';
    const teamId = roster.team_id;
    if (!teamStatsMap.has(teamId)) teamStatsMap.set(teamId, { teamName, players: [] });
    const player = (players ?? []).find(p => p.id === roster.player_id);
    if (!player) continue;
    const entry = statsByPlayer.get(player.id);
    const avg = entry && entry.rows.length > 0 ? averageStats(entry.rows, entry.wins, entry.gamesPlayed) : null;
    teamStatsMap.get(teamId)!.players.push({ player, avg });
  }
  for (const team of teamStatsMap.values()) {
    team.players.sort((a, b) => (b.avg?.ppg ?? -1) - (a.avg?.ppg ?? -1));
  }

  const champ = championship as any;

  const completedByRound = new Map<string, any[]>();
  console.log("Tournament ID:", tournament.id);
  console.log("Completed matches count:", completed?.length);
  (completed ?? []).forEach((g: any) => {
    const r = g.round_label || 'OTHER';
    if (!completedByRound.has(r)) completedByRound.set(r, []);
    completedByRound.get(r)!.push(g);
  });

  const upcomingByRound = new Map<string, any[]>();
  (upcoming ?? []).forEach((g: any) => {
    const r = g.round_label || 'OTHER';
    if (!upcomingByRound.has(r)) upcomingByRound.set(r, []);
    upcomingByRound.get(r)!.push(g);
  });

  return (
    <div className="space-y-10">
      <BackButton />
      <div>
        <p className="text-xs font-mono text-red-600 uppercase">{tournament.status.replace(/_/g, ' ')}</p>
        <h1 className="text-4xl text-white font-display tracking-widest drop-shadow-[0_0_15px_rgba(229,0,0,0.3)]">{tournament.name}</h1>
        <p className="text-silver-400 font-mono text-sm mt-1 uppercase tracking-widest">
          {tournament.format.replace(/_/g, ' ')} · {tournament.match_format} · {tournament.start_date ? new Date(tournament.start_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'} – {tournament.end_date ? new Date(tournament.end_date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'TBD'}
        </p>
      </div>

      {/* Champion banner */}
      {champ && (
        <div className="border-2 border-[#b8860b] bg-[#b8860b]/40 p-5 rounded flex items-center gap-4 shadow-[0_0_30px_rgba(184,134,11,0.4)]">
          <span className="text-4xl">🏆</span>
          <div>
            <p className="text-[10px] font-mono text-[#b8860b] uppercase tracking-widest mb-0.5">Champion</p>
            <p className="text-2xl text-white font-display tracking-widest">{champ.champion?.name}</p>
            {champ.runner_up?.name && (
              <p className="text-xs text-silver-400 font-mono mt-0.5">RUNNER-UP: {champ.runner_up.name}</p>
            )}
          </div>
        </div>
      )}

      <section>
        <h2 className="text-xl text-bone mb-3">BRACKET</h2>
        <BracketTree matchups={(matchups ?? []) as any} defaultMatchFormat={tournament.match_format} />
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl font-display text-white tracking-widest mb-3">SEEDS</h2>
          <div className="border border-surface-700 bg-[#080808]/90 backdrop-blur-sm p-4 space-y-1 rounded shadow-lg">
            {(seeds ?? []).map((s: any) => (
              <p key={s.seed} className="text-sm font-mono text-white"><span className="text-silver-500 mr-2">#{s.seed}</span> {s.team?.name}</p>
            ))}
            {(seeds ?? []).length === 0 && <p className="text-silver-600 text-sm font-mono uppercase tracking-widest">Seeding not set yet.</p>}
          </div>
        </div>

        <div>
          <h2 className="text-xl font-display text-white tracking-widest mb-3">UPCOMING MATCHES</h2>
          <MatchesFilter 
            rounds={[...upcomingByRound.entries()].map(([roundName, games]) => ({ roundName, games }))}
            isUpcoming={true}
          />
        </div>
      </section>

      <section>
        <h2 className="text-xl font-display text-white tracking-widest mb-3">COMPLETED MATCHES</h2>
        <MatchesFilter 
          rounds={[...completedByRound.entries()].map(([roundName, games]) => ({ roundName, games }))}
        />
      </section>

      {/* Player Stats */}
      {teamStatsMap.size > 0 && (
        <section>
          <h2 className="text-xl font-display text-white tracking-widest mb-6">PLAYER STATS</h2>
          <div className="space-y-8">
            {[...teamStatsMap.entries()].map(([teamId, { teamName, players: teamPlayers }]) => (
              <div key={teamId}>
                <h3 className="text-lg font-display text-[#b8860b] tracking-widest mb-3">{teamName}</h3>
                <div className="bg-[#080808]/90 backdrop-blur-sm border border-surface-700 rounded overflow-hidden shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs font-mono">
                      <thead>
                        <tr className="bg-[#111] border-b border-surface-700 text-red-600 uppercase tracking-widest text-[10px]">
                          <th className="text-left px-5 py-4">Player</th>
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
                        {teamPlayers.map(({ player, avg }) => (
                          <tr key={player.id} className="border-b border-surface-800 last:border-0 hover:bg-surface-800/50 transition-colors">
                            <td className="px-5 py-3">
                              <Link href={`/${player.slug || player.gamertag.toLowerCase()}`} className="text-silver-200 hover:text-white hover:underline">
                                {player.gamertag}
                              </Link>
                              {player.position && <span className="ml-2 text-[10px] text-silver-600 uppercase">{player.position}</span>}
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
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
