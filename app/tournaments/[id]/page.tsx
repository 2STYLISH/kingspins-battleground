import { createClient } from '@/lib/supabase/server';
import Link from '@/components/HiddenLink';
import BracketTree from '@/components/BracketTree';
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
      .select('id, round, slot, status, winner_id, is_bye, bracket_side, feeds_into_matchup_id, loser_feeds_into_matchup_id, team_a:teams!bracket_matchups_team_a_id_fkey(id,name), team_b:teams!bracket_matchups_team_b_id_fkey(id,name), schedule:schedules(games(id))')
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

  return (
    <div className="space-y-10">
      <BackButton />
      <div>
        <p className="text-xs font-mono text-crimson-400 uppercase">{tournament.status}</p>
        <h1 className="text-4xl text-bone">{tournament.name}</h1>
        <p className="text-mute text-sm mt-1">
          {tournament.format.replace(/_/g, ' ')} · {tournament.match_format} · {tournament.start_date ?? 'TBD'} – {tournament.end_date ?? 'TBD'}
        </p>
      </div>

      {/* Champion banner */}
      {champ && (
        <div className="card p-5 border-gold/50 bg-gold/5 flex items-center gap-4">
          <span className="text-3xl">🏆</span>
          <div>
            <p className="text-[10px] font-mono text-gold uppercase tracking-widest mb-0.5">Champion</p>
            <p className="text-xl text-white font-display tracking-widest">{champ.champion?.name}</p>
            {champ.runner_up?.name && (
              <p className="text-xs text-mute mt-0.5">Runner-up: {champ.runner_up.name}</p>
            )}
          </div>
        </div>
      )}

      <section>
        <h2 className="text-xl text-bone mb-3">BRACKET</h2>
        <BracketTree matchups={(matchups ?? []) as any} />
      </section>

      <section className="grid md:grid-cols-2 gap-6">
        <div>
          <h2 className="text-xl text-bone mb-3">SEEDS</h2>
          <div className="card p-4 space-y-1">
            {(seeds ?? []).map((s: any) => (
              <p key={s.seed} className="text-sm text-bone">#{s.seed} {s.team?.name}</p>
            ))}
            {(seeds ?? []).length === 0 && <p className="text-mute text-sm">Seeding not set yet.</p>}
          </div>
        </div>

        <div>
          <h2 className="text-xl text-bone mb-3">UPCOMING MATCHES</h2>
          <div className="card p-4 space-y-2">
            {(upcoming ?? []).map((g: any) => (
              <p key={g.id} className="text-sm text-bone">{g.home?.name} vs {g.away?.name} — {formatDate(g.scheduled_date)}</p>
            ))}
            {(upcoming ?? []).length === 0 && <p className="text-mute text-sm">Nothing scheduled.</p>}
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl text-bone mb-3">COMPLETED MATCHES</h2>
        <div className="card p-4 space-y-2">
          {(completed ?? []).map((g: any) => {
            const gameId = g.games?.[0]?.id;
            return gameId ? (
              <Link key={g.id} href={`/games/${gameId}`} className="block text-sm text-silver-300 hover:text-white hover:underline">
                {g.home?.name} vs {g.away?.name} — {g.round_label}
              </Link>
            ) : (
              <p key={g.id} className="text-sm text-bone">{g.home?.name} vs {g.away?.name} — {g.round_label}</p>
            );
          })}
          {(completed ?? []).length === 0 && <p className="text-mute text-sm">No results yet.</p>}
        </div>
      </section>

      {/* Player Stats */}
      {teamStatsMap.size > 0 && (
        <section>
          <h2 className="text-xl text-bone mb-6">PLAYER STATS</h2>
          <div className="space-y-8">
            {[...teamStatsMap.entries()].map(([teamId, { teamName, players: teamPlayers }]) => (
              <div key={teamId}>
                <h3 className="text-sm font-mono text-gold uppercase tracking-widest mb-3">{teamName}</h3>
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
