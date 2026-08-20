import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import BackButton from '@/components/BackButton';
import Link from '@/components/HiddenLink';

export default async function GameBoxScorePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: game } = await supabase
    .from('games')
    .select(`
      id,
      schedule_id,
      home_score,
      away_score,
      home_team:teams!games_home_team_id_fkey(id, name, short_name, logo_url),
      away_team:teams!games_away_team_id_fkey(id, name, short_name, logo_url),
      schedules!inner(tournament_id, round_label, status, scheduled_date)
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (!game) notFound();

  // Fetch Quarter Scores
  const { data: quarterScores } = await supabase
    .from('quarter_scores')
    .select('quarter, home_score, away_score')
    .eq('game_id', game.id)
    .order('quarter', { ascending: true });

  // Fetch Player Stats
  const { data: stats } = await supabase
    .from('player_game_stats')
    .select(`
      *,
      player:players(id, gamertag, position, slug, tier)
    `)
    .eq('game_id', game.id)
    .order('pts', { ascending: false });

  const POS_ORDER: Record<string, number> = { PG: 1, SG: 2, SF: 3, PF: 4, C: 5 };
  
  function sortStats(statsArr: any[]) {
    return statsArr.sort((a, b) => {
      const posA = a.position ? POS_ORDER[a.position] || 99 : 99;
      const posB = b.position ? POS_ORDER[b.position] || 99 : 99;
      if (posA !== posB) return posA - posB;
      return b.pts - a.pts; // Fallback to points descending
    });
  }

  const homeStats = sortStats(stats?.filter(s => s.team_id === (game.home_team as any)?.id && !s.did_not_play) || []);
  const awayStats = sortStats(stats?.filter(s => s.team_id === (game.away_team as any)?.id && !s.did_not_play) || []);

  // Determine POTG
  let potg: any = null;
  let highestRating = -Infinity;
  const isHomeWinner = (game.home_score || 0) > (game.away_score || 0);
  const winningStats = isHomeWinner ? homeStats : awayStats;

  winningStats.forEach(s => {
    // Basic impact rating: PTS + REB + AST + STL + BLK - TO - (FGA - FGM)
    const rating = s.pts + s.reb + s.ast + s.stl + s.blk - s.turnovers - (s.fga - s.fgm);
    if (rating > highestRating) {
      highestRating = rating;
      potg = { ...s, impactRating: rating };
    }
  });

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
    return <span className={`ml-2 px-1.5 py-0.5 rounded text-[9px] uppercase font-mono font-bold tracking-widest ${colors[tier] || colors[6]}`}>T{tier}</span>;
  }

  function renderStatTable(teamName: string, teamStats: any[], isWinner: boolean) {
    return (
      <div className="relative group rounded-2xl overflow-hidden bg-[#080808]/80 backdrop-blur-md border border-surface-700/50 hover:border-surface-600 transition-colors shadow-2xl">
        {isWinner && (
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-600 via-red-500 to-transparent" />
        )}
        <div className="px-6 py-5 border-b border-surface-800/80 flex justify-between items-center bg-surface-900/30">
          <div className="flex items-center gap-4">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${isWinner ? 'bg-red-600/20 text-red-500 border-red-500/30' : 'bg-surface-800 text-silver-400 border-surface-600'} border`}>
              <span className="text-[10px] font-mono font-bold tracking-wider">{teamName.slice(0, 3).toUpperCase()}</span>
            </div>
            <h2 className="text-xl text-white font-display tracking-widest uppercase">{teamName}</h2>
          </div>
          {isWinner && (
            <span className="text-[10px] uppercase font-mono tracking-[0.2em] text-red-500 border border-red-500/30 bg-red-500/10 px-3 py-1 rounded-full">Winner</span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs stat-mono">
            <thead>
              <tr className="bg-surface-950/50 text-[9px] text-silver-500 uppercase tracking-widest border-b border-surface-800/80">
                <th className="text-left px-6 py-4 font-mono font-medium">Player</th>
                <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">PTS</th>
                <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">REB</th>
                <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">AST</th>
                <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">STL</th>
                <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">BLK</th>
                <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">TO</th>
                <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">FG</th>
                <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">3PT</th>
                <th className="px-4 py-4 text-right font-medium hover:text-white transition-colors cursor-default">FT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-800/30">
              {teamStats.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-6 py-10 text-silver-600 text-center font-mono uppercase tracking-widest text-[10px]">
                    No stats recorded for this team.
                  </td>
                </tr>
              )}
              {teamStats.map(s => {
                const p = s.player;
                const isPotg = potg?.id === s.id;
                return (
                  <tr key={s.id} className={`group/row transition-all hover:bg-surface-800/40 ${isPotg ? 'bg-gold/5' : ''}`}>
                    <td className="px-6 py-4 flex items-center gap-4">
                      {s.position && (
                        <span className="w-7 text-center text-[9px] bg-surface-900 text-silver-400 border border-surface-700 rounded px-1 py-1 uppercase tracking-widest font-bold group-hover/row:border-silver-500 transition-colors">
                          {s.position.slice(0, 2)}
                        </span>
                      )}
                      <div className="flex items-center">
                        <Link href={`/${p?.slug || p?.gamertag?.toLowerCase()}`} className={`font-body transition-colors ${isPotg ? 'text-gold' : 'text-silver-200 group-hover/row:text-white'}`}>
                          {p?.gamertag}
                        </Link>
                        {getTierBadge(p?.tier)}
                        {isPotg && (
                          <span className="ml-3 text-[12px]" title="Player of the Game">🏆</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right text-white font-bold text-sm">{s.pts}</td>
                    <td className="px-4 py-4 text-right text-silver-300 group-hover/row:text-silver-100 transition-colors">{s.reb}</td>
                    <td className="px-4 py-4 text-right text-silver-300 group-hover/row:text-silver-100 transition-colors">{s.ast}</td>
                    <td className="px-4 py-4 text-right text-silver-300 group-hover/row:text-silver-100 transition-colors">{s.stl}</td>
                    <td className="px-4 py-4 text-right text-silver-300 group-hover/row:text-silver-100 transition-colors">{s.blk}</td>
                    <td className="px-4 py-4 text-right text-silver-500 group-hover/row:text-silver-400 transition-colors">{s.turnovers}</td>
                    <td className="px-4 py-4 text-right text-silver-400 group-hover/row:text-silver-200 transition-colors">{s.fgm}/{s.fga}</td>
                    <td className="px-4 py-4 text-right text-silver-400 group-hover/row:text-silver-200 transition-colors">{s.tpm}/{s.tpa}</td>
                    <td className="px-4 py-4 text-right text-silver-400 group-hover/row:text-silver-200 transition-colors">{s.ftm}/{s.fta}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      <div className="pt-2">
        <BackButton />
      </div>
      
      {/* Top Scoreboard (Hero) */}
      <div className="relative rounded-3xl overflow-hidden bg-surface-950 border border-surface-800 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/20 via-surface-900/40 to-surface-950"></div>
        <div className="relative z-10 px-6 py-12 md:py-16">
          <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-24">

            {/* Home Team */}
            <div className="flex-1 text-center md:text-right flex flex-col items-center md:items-end w-full">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-surface-900/80 border border-surface-700/50 mb-6 flex items-center justify-center overflow-hidden shadow-2xl backdrop-blur-sm p-4">
                {(game.home_team as any)?.logo_url ? (
                  <img src={(game.home_team as any).logo_url} alt={(game.home_team as any).name} className="w-full h-full object-contain filter drop-shadow-md" />
                ) : (
                  <span className="text-3xl text-silver-400 font-display tracking-widest">{(game.home_team as any)?.name?.slice(0, 3).toUpperCase()}</span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-display tracking-widest text-white uppercase drop-shadow-sm">{(game.home_team as any)?.name}</h1>
              <div className="relative mt-4">
                <p className="text-7xl md:text-9xl font-display text-white tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">{game.home_score ?? '-'}</p>
                {isHomeWinner && <div className="absolute -left-10 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]" title="Winner"></div>}
              </div>
            </div>

            {/* Divider */}
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="h-16 w-px bg-gradient-to-b from-transparent via-surface-700 to-transparent hidden md:block"></div>
              <span className="text-sm font-mono text-silver-500 uppercase tracking-[0.5em] px-4 py-2 rounded-full border border-surface-800 bg-surface-900/50 backdrop-blur-md">Final</span>
              <div className="h-16 w-px bg-gradient-to-t from-transparent via-surface-700 to-transparent hidden md:block"></div>
            </div>

            {/* Away Team */}
            <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start w-full">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-2xl bg-surface-900/80 border border-surface-700/50 mb-6 flex items-center justify-center overflow-hidden shadow-2xl backdrop-blur-sm p-4">
                {(game.away_team as any)?.logo_url ? (
                  <img src={(game.away_team as any).logo_url} alt={(game.away_team as any).name} className="w-full h-full object-contain filter drop-shadow-md" />
                ) : (
                  <span className="text-3xl text-silver-400 font-display tracking-widest">{(game.away_team as any)?.name?.slice(0, 3).toUpperCase()}</span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-display tracking-widest text-white uppercase drop-shadow-sm">{(game.away_team as any)?.name}</h1>
              <div className="relative mt-4">
                <p className="text-7xl md:text-9xl font-display text-white tracking-tighter drop-shadow-[0_0_30px_rgba(255,255,255,0.15)]">{game.away_score ?? '-'}</p>
                {!isHomeWinner && (game.away_score || 0) > (game.home_score || 0) && <div className="absolute -right-10 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-red-600 shadow-[0_0_15px_rgba(220,38,38,0.8)]" title="Winner"></div>}
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* POTG Banner */}
      {potg && (
        <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-[#0a0a0a] shadow-[0_10px_40px_rgba(255,215,0,0.03)] group transition-all hover:border-gold/40 hover:shadow-[0_10px_40px_rgba(255,215,0,0.08)]">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-gold/5 via-transparent to-transparent pointer-events-none" />
          <div className="absolute -right-20 -top-20 text-[15rem] text-gold/5 rotate-12 pointer-events-none select-none font-display transition-transform group-hover:scale-110 duration-700">🏆</div>
          
          <div className="relative z-10 p-8 flex flex-col lg:flex-row items-center lg:items-center justify-between gap-10">
            <div className="flex items-center gap-8 w-full lg:w-auto">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gold/20 to-gold/5 border border-gold/30 flex items-center justify-center flex-shrink-0 shadow-inner">
                <span className="text-4xl drop-shadow-md">🏆</span>
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-mono text-gold uppercase tracking-[0.4em] mb-2 font-bold">Player of the Game</p>
                <Link href={`/${potg.player?.slug || potg.player?.gamertag?.toLowerCase()}`} className="text-4xl md:text-5xl font-display tracking-widest text-white uppercase hover:text-gold transition-colors drop-shadow-sm">
                  {potg.player?.gamertag}
                </Link>
                <div className="flex flex-wrap gap-2 mt-4">
                  {(() => {
                    const statsArr = [potg.pts, potg.reb, potg.ast, potg.stl, potg.blk];
                    const doubleDigits = statsArr.filter(s => s >= 10).length;
                    if (doubleDigits >= 3) {
                      return <span className="px-3 py-1 rounded border border-purple-500/50 bg-purple-500/10 text-[10px] font-mono text-purple-300 uppercase tracking-[0.1em]">Triple-Double</span>;
                    }
                    if (doubleDigits >= 2) {
                      return <span className="px-3 py-1 rounded border border-blue-500/50 bg-blue-500/10 text-[10px] font-mono text-blue-300 uppercase tracking-[0.1em]">Double-Double</span>;
                    }
                    return null;
                  })()}
                  <span className="px-3 py-1 rounded border border-surface-600 bg-surface-800 text-[10px] font-mono text-silver-300 uppercase tracking-[0.1em]">
                    {potg.fgm}/{potg.fga} FG
                  </span>
                  {potg.tpm >= 4 && (
                    <span className="px-3 py-1 rounded border border-surface-600 bg-surface-800 text-[10px] font-mono text-silver-300 uppercase tracking-[0.1em]">
                      {potg.tpm} 3PT
                    </span>
                  )}
                  {potg.stl >= 3 && (
                    <span className="px-3 py-1 rounded border border-surface-600 bg-surface-800 text-[10px] font-mono text-silver-300 uppercase tracking-[0.1em]">
                      {potg.stl} STL
                    </span>
                  )}
                  {potg.blk >= 3 && (
                    <span className="px-3 py-1 rounded border border-surface-600 bg-surface-800 text-[10px] font-mono text-silver-300 uppercase tracking-[0.1em]">
                      {potg.blk} BLK
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-center w-full lg:w-auto gap-8 lg:gap-12 p-6 lg:p-0 rounded-xl bg-surface-900/30 lg:bg-transparent border lg:border-none border-surface-800">
              <div className="text-center">
                <p className="text-[11px] font-mono text-gold/80 uppercase tracking-widest mb-2 font-medium">PTS</p>
                <p className="text-5xl font-display text-white tracking-tight">{potg.pts}</p>
              </div>
              <div className="w-px bg-gradient-to-b from-transparent via-surface-600 to-transparent" />
              <div className="text-center">
                <p className="text-[11px] font-mono text-gold/80 uppercase tracking-widest mb-2 font-medium">REB</p>
                <p className="text-5xl font-display text-white tracking-tight">{potg.reb}</p>
              </div>
              <div className="w-px bg-gradient-to-b from-transparent via-surface-600 to-transparent" />
              <div className="text-center">
                <p className="text-[11px] font-mono text-gold/80 uppercase tracking-widest mb-2 font-medium">AST</p>
                <p className="text-5xl font-display text-white tracking-tight">{potg.ast}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Box Scores Grid */}
      <div className="space-y-10 pt-4">
        {game.home_team && renderStatTable((game.home_team as any).name, homeStats, isHomeWinner)}
        {game.away_team && renderStatTable((game.away_team as any).name, awayStats, !isHomeWinner && (game.away_score || 0) > (game.home_score || 0))}
      </div>

    </div>
  );
}
