import Link from '@/components/HiddenLink';
import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import BackButton from '@/components/BackButton';
import { averageStats } from '@/lib/stats';
import { formatDate } from '@/lib/format';
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
    <span className={`inline-block px-3 py-1 rounded-sm text-[10px] font-mono uppercase tracking-widest font-bold ${color}`}>
      Tier {tier}
    </span>
  );
}

const AWARD_LABELS: Record<string, { label: string; icon: string }> = {
  BEST_PG: { label: 'Best Point Guard', icon: '🎯' },
  BEST_SG: { label: 'Best Shooting Guard', icon: '🔥' },
  BEST_SF: { label: 'Best Small Forward', icon: '🦅' },
  BEST_PF: { label: 'Best Power Forward', icon: '💪' },
  BEST_CENTER: { label: 'Best Center', icon: '🧱' },
  FINALS_MVP: { label: 'Finals MVP', icon: '🏆' },
  OVERALL_MVP: { label: 'Overall MVP', icon: '🌟' },
  OVERALL_DPOY: { label: 'Overall DPOY', icon: '🛡️' },
};

function pct(made: number, attempted: number) {
  if (attempted === 0) return 0;
  return ((made / attempted) * 100).toFixed(1);
}

export default async function PlayerPage({ params }: { params: { slug: string } }) {
  const supabase = createClient();

  const { data: player } = await supabase
    .from('players')
    .select('id, gamertag, position, tier, bio, created_at, photo_path, team_id')
    .eq('slug', params.slug.toLowerCase())
    .maybeSingle();

  if (!player) notFound();

  // 1. Current Teams / Roster Status
  const { data: currentRosters } = await supabase
    .from('tournament_rosters')
    .select('team_id, tournament_id, team:teams(name, logo_url), tournament:tournaments(name, status, start_date)')
    .eq('player_id', player.id)
    .order('created_at', { ascending: false });

  const activeLeagues = (currentRosters ?? []).map(r => {
    const t = Array.isArray(r.tournament) ? r.tournament[0] : r.tournament;
    const team = Array.isArray(r.team) ? r.team[0] : r.team;
    return {
      tournament: t,
      teamName: team?.name ?? 'Unknown',
      teamLogo: team?.logo_url ?? null,
    };
  }).filter(x => x.tournament?.status === 'SEEDING' || x.tournament?.status === 'IN_PROGRESS');

  const pastLeagues = (currentRosters ?? []).map(r => {
    const t = Array.isArray(r.tournament) ? r.tournament[0] : r.tournament;
    const team = Array.isArray(r.team) ? r.team[0] : r.team;
    return {
      tournament: t,
      teamName: team?.name ?? 'Unknown',
      teamLogo: team?.logo_url ?? null,
    };
  }).filter(x => x.tournament?.status === 'COMPLETED');

  // 2. All verified stats for this player
  const { data: statsRaw } = await supabase
    .from('player_game_stats')
    .select(
      'id, pts, reb, ast, stl, blk, fgm, fga, tpm, tpa, ftm, fta, turnovers, did_not_play, is_verified, team_id, game:games!player_game_stats_game_id_fkey(id, home_team_id, away_team_id, home_score, away_score, played_at, home:teams!games_home_team_id_fkey(name, logo_url), away:teams!games_away_team_id_fkey(name, logo_url), schedule:schedules(scheduled_date, tournament_id, tournament:tournaments(id, name)))'
    )
    .eq('player_id', player.id)
    .eq('is_verified', true)
    .order('game(played_at)', { ascending: false });

  const stats = (statsRaw ?? []).filter(r => !r.did_not_play) as any[];

  let wins = 0;
  let losses = 0;
  let gamesPlayed = 0;
  let totalPts = 0;
  let totalReb = 0;
  let totalAst = 0;
  let totalStl = 0;
  let totalBlk = 0;
  let totalTov = 0;
  let totalFgm = 0;
  let totalFga = 0;
  let totalTpm = 0;
  let totalTpa = 0;
  let totalFtm = 0;
  let totalFta = 0;

  // Track career highs
  const highs = { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgm: 0, tpm: 0, ftm: 0 };
  const highGames = { pts: null as any, reb: null as any, ast: null as any, stl: null as any, blk: null as any, fgm: null as any, tpm: null as any, ftm: null as any };

  for (const row of stats) {
    gamesPlayed++;
    totalPts += row.pts || 0;
    totalReb += row.reb || 0;
    totalAst += row.ast || 0;
    totalStl += row.stl || 0;
    totalBlk += row.blk || 0;
    totalTov += row.turnovers || 0;
    totalFgm += row.fgm || 0;
    totalFga += row.fga || 0;
    totalTpm += row.tpm || 0;
    totalTpa += row.tpa || 0;
    totalFtm += row.ftm || 0;
    totalFta += row.fta || 0;

    const game = row.game;
    if (game && row.team_id) {
      const isHome = game.home_team_id === row.team_id;
      const myScore = isHome ? game.home_score : game.away_score;
      const oppScore = isHome ? game.away_score : game.home_score;
      if (myScore != null && oppScore != null) {
        if (myScore > oppScore) wins++;
        else losses++;
      }
    }

    if (row.pts > highs.pts) { highs.pts = row.pts; highGames.pts = row; }
    if (row.reb > highs.reb) { highs.reb = row.reb; highGames.reb = row; }
    if (row.ast > highs.ast) { highs.ast = row.ast; highGames.ast = row; }
    if (row.stl > highs.stl) { highs.stl = row.stl; highGames.stl = row; }
    if (row.blk > highs.blk) { highs.blk = row.blk; highGames.blk = row; }
    if (row.fgm > highs.fgm) { highs.fgm = row.fgm; highGames.fgm = row; }
    if (row.tpm > highs.tpm) { highs.tpm = row.tpm; highGames.tpm = row; }
    if (row.ftm > highs.ftm) { highs.ftm = row.ftm; highGames.ftm = row; }
  }

  const overallAvg = gamesPlayed > 0 ? averageStats(stats, wins, gamesPlayed) : null;
  const winPct = gamesPlayed > 0 ? ((wins / gamesPlayed) * 100).toFixed(1) : 0;

  const ppg = overallAvg?.ppg || 0;
  const rpg = overallAvg?.rpg || 0;
  const apg = overallAvg?.apg || 0;
  const spg = overallAvg?.spg || 0;
  const bpg = overallAvg?.bpg || 0;
  const fgPct = overallAvg?.fgPct || 0;
  const tpPct = overallAvg?.tpPct || 0;
  const ftPct = overallAvg?.ftPct || 0;
  const topg = gamesPlayed > 0 ? (totalTov / gamesPlayed).toFixed(1) : 0;

  // Calculate Roles (Main/Secondary based on frequency)
  const posCounts: Record<string, number> = {};
  for (const row of stats) {
    if (row.position) {
      posCounts[row.position] = (posCounts[row.position] || 0) + 1;
    }
  }
  const sortedPositions = Object.entries(posCounts).sort((a, b) => b[1] - a[1]);
  const mainRole = sortedPositions[0]?.[0];
  const secRole = sortedPositions[1]?.[0];
  let roleDisplay = '';
  if (mainRole && secRole) roleDisplay = `${mainRole}/${secRole}`;
  else if (mainRole) roleDisplay = mainRole;

  // 3. Achievements
  const tournamentIds = currentRosters?.map(r => r.tournament_id) || [];
  let champWins: any[] = [];
  let runnerUps: any[] = [];

  if (tournamentIds.length > 0) {
    const { data: championships } = await supabase
      .from('championships')
      .select('tournament_id, champion_team_id, runner_up_team_id, tournament:tournaments(name, championship_award_name)')
      .in('tournament_id', tournamentIds);

    if (championships) {
      for (const champ of championships) {
        const playerRoster = currentRosters?.find(r => r.tournament_id === champ.tournament_id);
        if (playerRoster) {
          if (champ.champion_team_id === playerRoster.team_id) {
            champWins.push(champ);
          } else if (champ.runner_up_team_id === playerRoster.team_id) {
            runnerUps.push(champ);
          }
        }
      }
    }
  }

  const { data: awards } = await supabase
    .from('awards')
    .select('award_type, tournament_id, season_id, tournament:tournaments(name), season:seasons(name)')
    .eq('winner_player_id', player.id)
    .eq('status', 'PUBLISHED');

  // 4. Recent matches (Last 10)
  const recentGames = stats.slice(0, 10);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <BackButton />

      {/* --- MASTHEAD --- */}
      <div className="bg-surface-950 border border-surface-700 p-6 md:p-10 relative overflow-hidden rounded shadow-[0_4px_30px_rgba(0,0,0,0.5)]">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-grid-subtle opacity-30 pointer-events-none" />

        <div className="relative z-10">
          <p className="text-[10px] text-gold font-mono uppercase tracking-[0.3em] mb-4">PLAYER</p>

          <div className="flex flex-col md:flex-row gap-8 items-start md:items-end">
            {/* Player Photo Box */}
            <div className="w-32 h-32 md:w-48 md:h-48 border border-surface-600 bg-surface-900 rounded shrink-0 relative overflow-hidden shadow-xl">
              {player.photo_path ? (
                <img src={player.photo_path} alt={player.gamertag} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center opacity-30">
                  <span className="text-4xl mb-2">👤</span>
                  <span className="text-[9px] font-mono">NO PHOTO</span>
                </div>
              )}
            </div>

            {/* Gamertag & Info */}
            <div className="flex-1">
              <h1 className="text-6xl md:text-8xl text-white font-display uppercase tracking-widest leading-none mb-3 drop-shadow-lg">
                {player.gamertag}
              </h1>

              <div className="flex flex-wrap items-center gap-2 mb-4">
                {getTierBadge(player.tier)}
                {(roleDisplay || player.position) && (
                  <span className="inline-block px-3 py-1 bg-surface-800 border border-surface-600 rounded-sm text-[10px] font-mono text-silver-300 uppercase tracking-widest font-bold">
                    {roleDisplay || player.position}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Masthead Stats Ribbon */}
          <div className="mt-8 pt-6 border-t border-surface-700/50 flex flex-wrap gap-4 md:gap-8 justify-between lg:justify-start">
            <div className="min-w-[100px]">
              <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">RECORD</p>
              <p className="text-2xl font-mono text-gold leading-none">{wins}-{losses}</p>
              <p className="text-[9px] font-mono text-silver-500 uppercase mt-1">{winPct}% WIN</p>
            </div>
            <div className="min-w-[100px] border-l border-surface-700/50 pl-4 md:pl-8">
              <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">GAMES</p>
              <p className="text-2xl font-mono text-white leading-none">{gamesPlayed}</p>
              <p className="text-[9px] font-mono text-silver-500 uppercase mt-1">TRACKED</p>
            </div>
            <div className="min-w-[100px] border-l border-surface-700/50 pl-4 md:pl-8">
              <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">PPG</p>
              <p className="text-2xl font-mono text-white leading-none">{ppg}</p>
              <p className="text-[9px] font-mono text-silver-500 uppercase mt-1">CAREER</p>
            </div>
            <div className="min-w-[100px] border-l border-surface-700/50 pl-4 md:pl-8">
              <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">APG</p>
              <p className="text-2xl font-mono text-white leading-none">{apg}</p>
              <p className="text-[9px] font-mono text-silver-500 uppercase mt-1">CAREER</p>
            </div>
            <div className="min-w-[100px] border-l border-surface-700/50 pl-4 md:pl-8">
              <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">RPG</p>
              <p className="text-2xl font-mono text-white leading-none">{rpg}</p>
              <p className="text-[9px] font-mono text-silver-500 uppercase mt-1">CAREER</p>
            </div>
            <div className="min-w-[100px] border-l border-surface-700/50 pl-4 md:pl-8">
              <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">3PM</p>
              <p className="text-2xl font-mono text-gold leading-none">{totalTpm}</p>
              <p className="text-[9px] font-mono text-silver-500 uppercase mt-1">MADE</p>
            </div>
          </div>
        </div>
      </div>

      {/* --- MAIN GRID --- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column (Stats & Highs) */}
        <div className="lg:col-span-2 space-y-6">

          {/* Career Totals */}
          <div className="border border-surface-700 bg-surface-900 rounded p-6">
            <p className="text-[10px] text-gold font-mono uppercase tracking-[0.2em] mb-4">CAREER STATS</p>
            <h2 className="text-2xl font-display text-white uppercase tracking-wider mb-6">FULL CAREER TOTALS</h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-surface-700 border border-surface-700 mb-6">
              <div className="bg-surface-950 p-4">
                <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">GP</p>
                <p className="text-xl font-mono text-gold">{gamesPlayed}</p>
                <p className="text-[9px] font-mono text-silver-500 mt-1">{wins}-{losses}</p>
              </div>
              <div className="bg-surface-950 p-4">
                <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">PPG</p>
                <p className="text-xl font-mono text-white">{ppg}</p>
                <p className="text-[9px] font-mono text-silver-500 mt-1">POINTS</p>
              </div>
              <div className="bg-surface-950 p-4">
                <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">RPG</p>
                <p className="text-xl font-mono text-white">{rpg}</p>
                <p className="text-[9px] font-mono text-silver-500 mt-1">BOARDS</p>
              </div>
              <div className="bg-surface-950 p-4">
                <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">APG</p>
                <p className="text-xl font-mono text-white">{apg}</p>
                <p className="text-[9px] font-mono text-silver-500 mt-1">CREATION</p>
              </div>

              <div className="bg-surface-950 p-4">
                <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">BPG</p>
                <p className="text-xl font-mono text-white">{bpg}</p>
                <p className="text-[9px] font-mono text-silver-500 mt-1">BLOCKS</p>
              </div>
              <div className="bg-surface-950 p-4">
                <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">TOV</p>
                <p className="text-xl font-mono text-white">{topg}</p>
                <p className="text-[9px] font-mono text-silver-500 mt-1">PER GAME</p>
              </div>
              <div className="bg-surface-950 p-4">
                <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">FG%</p>
                <p className="text-xl font-mono text-white">{fgPct}%</p>
                <p className="text-[9px] font-mono text-silver-500 mt-1">{totalFgm}/{totalFga}</p>
              </div>
              <div className="bg-surface-950 p-4">
                <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">3P%</p>
                <p className="text-xl font-mono text-white">{tpPct}%</p>
                <p className="text-[9px] font-mono text-silver-500 mt-1">{totalTpm}/{totalTpa}</p>
              </div>
            </div>

            <div className="border border-surface-700 bg-surface-950 rounded p-4 relative overflow-hidden">
              <p className="text-[9px] text-silver-500 font-mono uppercase tracking-widest mb-4">BOX SCORE ROLLUP</p>
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
                <div>
                  <p className="text-[9px] font-mono text-silver-600 uppercase mb-1">PTS</p>
                  <p className="text-xl font-mono text-gold">{totalPts}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-silver-600 uppercase mb-1">REB</p>
                  <p className="text-xl font-mono text-gold">{totalReb}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-silver-600 uppercase mb-1">AST</p>
                  <p className="text-xl font-mono text-white">{totalAst}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-silver-600 uppercase mb-1">STL</p>
                  <p className="text-xl font-mono text-white">{totalStl}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-silver-600 uppercase mb-1">BLK</p>
                  <p className="text-xl font-mono text-white">{totalBlk}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-silver-600 uppercase mb-1">TO</p>
                  <p className="text-xl font-mono text-white">{totalTov}</p>
                </div>
                <div>
                  <p className="text-[9px] font-mono text-silver-600 uppercase mb-1">FOUL</p>
                  <p className="text-xl font-mono text-white">-</p>
                </div>
                <div className="col-span-2">
                  <p className="text-[9px] font-mono text-silver-600 uppercase mb-1">FGM/FGA</p>
                  <p className="text-xl font-mono text-white">{totalFgm}/{totalFga}</p>
                </div>
                <div className="col-span-1">
                  <p className="text-[9px] font-mono text-silver-600 uppercase mb-1">3PM/3PA</p>
                  <p className="text-xl font-mono text-white">{totalTpm}/{totalTpa}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Peak Games */}
          <div className="border border-surface-700 bg-surface-900 rounded p-6">
            <p className="text-[10px] text-gold font-mono uppercase tracking-[0.2em] mb-4">CAREER HIGHS</p>
            <h2 className="text-2xl font-display text-white uppercase tracking-wider mb-6">PEAK GAMES</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <HighCard label="HIGH PTS" val={highs.pts} row={highGames.pts} playerTeamId={player.team_id} />
              <HighCard label="HIGH REB" val={highs.reb} row={highGames.reb} playerTeamId={player.team_id} />
              <HighCard label="HIGH AST" val={highs.ast} row={highGames.ast} playerTeamId={player.team_id} />
              <HighCard label="HIGH STL" val={highs.stl} row={highGames.stl} playerTeamId={player.team_id} />
              <HighCard label="HIGH BLK" val={highs.blk} row={highGames.blk} playerTeamId={player.team_id} />
              <HighCard label="HIGH FGM" val={highs.fgm} row={highGames.fgm} playerTeamId={player.team_id} />
              <HighCard label="HIGH 3PM" val={highs.tpm} row={highGames.tpm} playerTeamId={player.team_id} />
              <HighCard label="HIGH FTM" val={highs.ftm} row={highGames.ftm} playerTeamId={player.team_id} />
            </div>
          </div>

          {/* Recent Games */}
          <div className="border border-surface-700 bg-surface-900 rounded p-6">
            <p className="text-[10px] text-gold font-mono uppercase tracking-[0.2em] mb-4">MATCH HISTORY / {recentGames.length} RECENT</p>
            <h2 className="text-2xl font-display text-white uppercase tracking-wider mb-6">RECENT GAMES</h2>

            <div className="space-y-2">
              {recentGames.length === 0 && <p className="text-silver-600 text-sm font-mono">No games found.</p>}
              {recentGames.map((row, idx) => {
                const game = row.game;
                const isHome = game.home_team_id === row.team_id;
                const myScore = isHome ? game.home_score : game.away_score;
                const oppScore = isHome ? game.away_score : game.home_score;
                const oppName = isHome ? game.away?.name : game.home?.name;
                const didWin = myScore > oppScore;

                return (
                  <Link href={`/games/${game.id}`} key={game.id + idx} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 border border-surface-700 bg-surface-950 hover:bg-surface-800 transition-colors rounded group">
                    <div className="flex items-center gap-3">
                      <div className={`w-6 h-6 flex items-center justify-center rounded font-mono text-[10px] font-bold ${didWin ? 'bg-gold text-black' : 'bg-surface-700 text-silver-400'}`}>
                        {didWin ? 'W' : 'L'}
                      </div>
                      <div>
                        <p className="text-sm font-display tracking-widest text-white group-hover:text-gold transition-colors uppercase">{oppName || 'TBD'}</p>
                        <p className="text-[9px] font-mono text-silver-500 uppercase">{game.schedule?.tournament?.name} / {formatDate(game.schedule?.scheduled_date)}</p>
                      </div>
                    </div>
                    <div className="mt-2 sm:mt-0 flex items-center gap-4">
                      <p className="font-mono text-lg text-white">
                        <span className={didWin ? 'text-white' : 'text-silver-500'}>{myScore}</span>
                        <span className="text-silver-600 mx-1">-</span>
                        <span className={didWin ? 'text-silver-500' : 'text-white'}>{oppScore}</span>
                      </p>
                      <p className="text-[9px] font-mono text-silver-400 max-w-[120px] text-right">
                        {row.pts} PTS / {row.reb} REB / {row.ast} AST / {row.stl} STL
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column (Teams, Accolades) */}
        <div className="space-y-6">
          <div className="border border-surface-700 bg-surface-900 rounded p-6">
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] text-gold font-mono uppercase tracking-[0.2em]">ROSTER ACTIVITY</p>
              <span className="text-[10px] font-mono bg-surface-950 border border-surface-700 text-silver-400 px-2 py-0.5 rounded">{activeLeagues.length} ACTIVE</span>
            </div>
            <h2 className="text-2xl font-display text-white uppercase tracking-wider mb-6">CURRENT TEAMS</h2>

            <div className="space-y-3">
              {activeLeagues.length === 0 && (
                <div className="p-4 border border-surface-700 border-dashed bg-surface-800/50 rounded text-center">
                  <p className="text-sm text-silver-500 font-mono italic">No active rosters.</p>
                </div>
              )}
              {activeLeagues.map((x, idx) => (
                <div key={idx} className="flex items-center gap-3 p-3 bg-surface-800 border border-surface-700 rounded">
                  {x.teamLogo ? (
                    <img src={x.teamLogo} className="w-10 h-10 object-cover rounded bg-surface-900 border border-surface-600" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-surface-700 border border-surface-600 flex items-center justify-center"><span className="text-[8px] font-mono">TEAM</span></div>
                  )}
                  <div>
                    <p className="text-sm font-display text-white tracking-widest uppercase">{x.teamName}</p>
                    <p className="text-[9px] font-mono text-silver-500 uppercase mt-0.5 max-w-[150px] truncate" title={x.tournament?.name}>MEMBER / {x.tournament?.name}</p>
                  </div>
                </div>
              ))}
            </div>

            {pastLeagues.length > 0 && (
              <div className="mt-8">
                <h2 className="text-lg font-display text-silver-400 uppercase tracking-wider mb-4">PAST TEAMS</h2>
                <div className="space-y-3 opacity-60 hover:opacity-100 transition-opacity">
                  {pastLeagues.map((x, idx) => (
                    <div key={'past' + idx} className="flex items-center gap-3 p-3 bg-surface-800 border border-surface-700 rounded">
                      {x.teamLogo ? (
                        <img src={x.teamLogo} className="w-10 h-10 object-cover rounded bg-surface-900 border border-surface-600 grayscale" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-surface-700 border border-surface-600 flex items-center justify-center"><span className="text-[8px] font-mono">TEAM</span></div>
                      )}
                      <div>
                        <p className="text-sm font-display text-white tracking-widest uppercase">{x.teamName}</p>
                        <p className="text-[9px] font-mono text-silver-500 uppercase mt-0.5 max-w-[150px] truncate" title={x.tournament?.name}>COMPLETED / {x.tournament?.name}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Accolades & Milestones */}
          <div className="border border-surface-700 bg-surface-900 rounded p-6">
            <div className="flex justify-between items-center mb-4">
              <p className="text-[10px] text-gold font-mono uppercase tracking-[0.2em]">TROPHY CASE</p>
            </div>
            <h2 className="text-2xl font-display text-white uppercase tracking-wider mb-6">ACCOLADES & MILESTONES</h2>

            {champWins.length === 0 && runnerUps.length === 0 && (awards ?? []).length === 0 ? (
              <div className="p-4 border border-surface-700 border-dashed bg-surface-800/50 rounded text-center">
                <p className="text-sm text-silver-500 font-mono italic">No earned trophies or badges yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {champWins.map((c: any, i: number) => (
                  <div key={'cw' + i} className="flex items-center gap-3 p-3 bg-gradient-to-r from-gold/20 to-transparent border border-gold/30 rounded">
                    <span className="text-xl">🏆</span>
                    <div>
                      <p className="text-xs font-display text-white tracking-widest uppercase">{c.tournament?.championship_award_name || 'Champion'}</p>
                      <p className="text-[9px] font-mono text-gold uppercase mt-0.5">{c.tournament?.name}</p>
                    </div>
                  </div>
                ))}
                {runnerUps.map((c: any, i: number) => (
                  <div key={'ru' + i} className="flex items-center gap-3 p-3 bg-surface-800 border border-surface-700 rounded">
                    <span className="text-xl">🥈</span>
                    <div>
                      <p className="text-xs font-display text-silver-300 tracking-widest uppercase">Runner Up</p>
                      <p className="text-[9px] font-mono text-silver-500 uppercase mt-0.5">{c.tournament?.name}</p>
                    </div>
                  </div>
                ))}
                {(awards ?? []).map((a: any, i: number) => {
                  const meta = AWARD_LABELS[a.award_type];
                  if (!meta) return null;
                  return (
                    <div key={'aw' + i} className="flex items-center gap-3 p-3 bg-surface-800 border border-surface-700 rounded">
                      <span className="text-xl">{meta.icon}</span>
                      <div>
                        <p className="text-xs font-display text-white tracking-widest uppercase">{meta.label}</p>
                        <p className="text-[9px] font-mono text-silver-500 uppercase mt-0.5">
                          {a.tournament ? a.tournament.name : a.season ? a.season.name : 'Pro-Am'}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

      </div>
    </div>
  );
}

function HighCard({ label, val, row, playerTeamId }: { label: string, val: number, row: any, playerTeamId: string | null }) {
  if (!row) return (
    <div className="border border-surface-700 bg-surface-900 p-4 rounded">
      <p className="text-[9px] font-mono text-silver-600 uppercase mb-1">{label}</p>
      <p className="text-2xl font-mono text-white mb-2">-</p>
    </div>
  );

  const game = row.game;
  const isHome = game.home_team_id === row.team_id;
  const myScore = isHome ? game.home_score : game.away_score;
  const oppScore = isHome ? game.away_score : game.home_score;
  const oppName = isHome ? game.away?.name : game.home?.name;

  return (
    <div className="border border-surface-700 bg-surface-900 p-4 rounded group hover:border-surface-500 transition-colors">
      <p className="text-[9px] font-mono text-silver-500 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-3xl font-mono text-gold mb-3">{val}</p>
      <p className="text-[10px] font-mono text-white uppercase truncate mb-1" title={oppName}>{oppName || 'TBD'} <span className="text-silver-600">/</span> {myScore}-{oppScore}</p>
      <p className="text-[9px] font-mono text-silver-500 uppercase truncate mb-3" title={game.schedule?.tournament?.name}>
        {formatDate(game.schedule?.scheduled_date)} <span className="text-silver-600">/</span> {game.schedule?.tournament?.name}
      </p>
      <Link href={`/games/${game.id}`} className="text-[9px] font-mono text-[#4ade80] hover:text-green-300 uppercase tracking-widest transition-colors">
        VIEW MATCH
      </Link>
    </div>
  );
}
