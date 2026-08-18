import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function GameBoxScorePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const { data: game } = await supabase
    .from('games')
    .select(`
      id,
      schedule_id,
      home_score,
      away_score,
      home_team:teams!games_home_team_id_fkey(id, name, short_name),
      away_team:teams!games_away_team_id_fkey(id, name, short_name),
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

  const homeStats = stats?.filter(s => s.team_id === (game.home_team as any)?.id && !s.did_not_play) || [];
  const awayStats = stats?.filter(s => s.team_id === (game.away_team as any)?.id && !s.did_not_play) || [];

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

  function renderStatTable(teamName: string, teamStats: any[]) {
    return (
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-surface-700 flex items-center gap-3">
          <div className="w-6 h-6 rounded-full bg-surface-800 border border-surface-600 flex items-center justify-center">
            <span className="text-[10px] font-mono text-silver-400">{teamName.slice(0, 3).toUpperCase()}</span>
          </div>
          <h2 className="text-lg text-white font-display tracking-widest uppercase">{teamName}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs stat-mono">
            <thead>
              <tr className="border-b border-surface-700/50 text-[10px] text-silver-600 uppercase tracking-widest bg-surface-900/50">
                <th className="text-left px-5 py-3 font-mono font-normal">Player</th>
                <th className="px-3 py-3 text-right font-normal">PTS</th>
                <th className="px-3 py-3 text-right font-normal">REB</th>
                <th className="px-3 py-3 text-right font-normal">AST</th>
                <th className="px-3 py-3 text-right font-normal">STL</th>
                <th className="px-3 py-3 text-right font-normal">BLK</th>
                <th className="px-3 py-3 text-right font-normal">FOUL</th>
                <th className="px-3 py-3 text-right font-normal">TO</th>
                <th className="px-3 py-3 text-right font-normal">FG</th>
                <th className="px-3 py-3 text-right font-normal">3PT</th>
                <th className="px-3 py-3 text-right font-normal">FT</th>
              </tr>
            </thead>
            <tbody>
              {teamStats.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-5 py-8 text-silver-600 text-center font-mono">
                    No stats recorded.
                  </td>
                </tr>
              )}
              {teamStats.map(s => {
                const p = s.player;
                return (
                  <tr key={s.id} className="border-b border-surface-800/50 last:border-0 hover:bg-surface-800/30 transition-colors">
                    <td className="px-5 py-3 flex items-center gap-3">
                      {p?.position && (
                        <span className="w-6 text-center text-[9px] bg-blue-900/40 text-blue-400 border border-blue-800/60 rounded px-1 py-0.5 uppercase tracking-widest">
                          {p.position.slice(0, 2)}
                        </span>
                      )}
                      <div className="flex items-center">
                        <Link href={`/${p?.slug || p?.gamertag?.toLowerCase()}`} className="text-silver-200 font-body hover:text-white transition-colors">
                          {p?.gamertag}
                        </Link>
                        {getTierBadge(p?.tier)}
                        {potg?.id === s.id && (
                          <span className="ml-2 text-[10px] text-gold" title="Player of the Game">🏆</span>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right text-white font-semibold">{s.pts}</td>
                    <td className="px-3 py-3 text-right text-silver-300">{s.reb}</td>
                    <td className="px-3 py-3 text-right text-silver-300">{s.ast}</td>
                    <td className="px-3 py-3 text-right text-silver-300">{s.stl}</td>
                    <td className="px-3 py-3 text-right text-silver-300">{s.blk}</td>
                    <td className="px-3 py-3 text-right text-silver-500">{s.fouls}</td>
                    <td className="px-3 py-3 text-right text-silver-500">{s.turnovers}</td>
                    <td className="px-3 py-3 text-right text-silver-400">{s.fgm}/{s.fga}</td>
                    <td className="px-3 py-3 text-right text-silver-400">{s.tpm}/{s.tpa}</td>
                    <td className="px-3 py-3 text-right text-silver-400">{s.ftm}/{s.fta}</td>
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
    <div className="max-w-5xl mx-auto space-y-6">

      {/* Top Scoreboard */}
      <div className="card p-6 md:p-10 bg-gradient-to-b from-surface-900 to-surface-950">
        <div className="flex flex-col md:flex-row items-center justify-between gap-10">

          {/* Home Team */}
          <div className="flex-1 text-center md:text-left flex flex-col items-center md:items-start">
            <div className="w-16 h-16 rounded-xl bg-surface-800 border border-surface-600 mb-4 flex items-center justify-center">
              <span className="text-xl text-silver-400 font-display">{(game.home_team as any)?.name?.slice(0, 3).toUpperCase()}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display tracking-widest text-white uppercase">{(game.home_team as any)?.name}</h1>
            <p className="text-6xl md:text-7xl font-display text-silver-300 mt-2">{game.home_score ?? '-'}</p>
          </div>

          {/* Quarter Scores */}
          <div className="flex-shrink-0 bg-surface-950 border border-surface-800 rounded-xl overflow-hidden shadow-2xl">
            <table className="text-xs text-center font-mono">
              <thead>
                <tr className="border-b border-surface-800 text-silver-600 uppercase tracking-widest">
                  <th className="px-4 py-3 text-left font-normal border-r border-surface-800">Team</th>
                  <th className="px-4 py-3 font-normal">1ST</th>
                  <th className="px-4 py-3 font-normal">2ND</th>
                  <th className="px-4 py-3 font-normal">3RD</th>
                  <th className="px-4 py-3 font-normal">4TH</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-surface-800">
                  <td className="px-4 py-3 text-left text-silver-400 font-semibold border-r border-surface-800 uppercase">
                    {(game.home_team as any)?.name?.slice(0, 3)}
                  </td>
                  <td className="px-4 py-3 text-white">{quarterScores?.find(q => q.quarter === 1)?.home_score ?? '-'}</td>
                  <td className="px-4 py-3 text-white">{quarterScores?.find(q => q.quarter === 2)?.home_score ?? '-'}</td>
                  <td className="px-4 py-3 text-white">{quarterScores?.find(q => q.quarter === 3)?.home_score ?? '-'}</td>
                  <td className="px-4 py-3 text-white">{quarterScores?.find(q => q.quarter === 4)?.home_score ?? '-'}</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-left text-silver-400 font-semibold border-r border-surface-800 uppercase">
                    {(game.away_team as any)?.name?.slice(0, 3)}
                  </td>
                  <td className="px-4 py-3 text-white">{quarterScores?.find(q => q.quarter === 1)?.away_score ?? '-'}</td>
                  <td className="px-4 py-3 text-white">{quarterScores?.find(q => q.quarter === 2)?.away_score ?? '-'}</td>
                  <td className="px-4 py-3 text-white">{quarterScores?.find(q => q.quarter === 3)?.away_score ?? '-'}</td>
                  <td className="px-4 py-3 text-white">{quarterScores?.find(q => q.quarter === 4)?.away_score ?? '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Away Team */}
          <div className="flex-1 text-center md:text-right flex flex-col items-center md:items-end">
            <div className="w-16 h-16 rounded-xl bg-surface-800 border border-surface-600 mb-4 flex items-center justify-center">
              <span className="text-xl text-silver-400 font-display">{(game.away_team as any)?.name?.slice(0, 3).toUpperCase()}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-display tracking-widest text-white uppercase">{(game.away_team as any)?.name}</h1>
            <p className="text-6xl md:text-7xl font-display text-white mt-2 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">{game.away_score ?? '-'}</p>
          </div>

        </div>
      </div>

      {/* POTG Banner */}
      {potg && (
        <div className="relative overflow-hidden rounded-xl border border-gold/40 bg-gradient-to-r from-surface-900 to-surface-800 p-6 shadow-[0_0_25px_rgba(255,215,0,0.05)]">
          <div className="absolute -right-10 -top-10 text-9xl text-gold opacity-5 rotate-12 pointer-events-none">★</div>
          <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-gold/10 border border-gold/30 flex items-center justify-center flex-shrink-0">
                <span className="text-3xl text-gold">🏆</span>
              </div>
              <div>
                <p className="text-[10px] font-display text-gold uppercase tracking-[0.3em] mb-1">Player of the Game</p>
                <Link href={`/${potg.player?.slug || potg.player?.gamertag?.toLowerCase()}`} className="text-3xl font-display tracking-widest text-white uppercase hover:text-gold transition-colors">
                  {potg.player?.gamertag}
                </Link>
                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="px-2 py-0.5 rounded border border-gold/30 bg-gold/10 text-[9px] font-mono text-gold uppercase tracking-widest">
                    Pro-Am Impact Rating: {potg.impactRating.toFixed(1)}
                  </span>
                  {potg.tpm >= 4 && (
                    <span className="px-2 py-0.5 rounded border border-surface-600 bg-surface-800 text-[9px] font-mono text-silver-300 uppercase tracking-widest">
                      {potg.tpm} Made Threes
                    </span>
                  )}
                  {potg.stl >= 3 && (
                    <span className="px-2 py-0.5 rounded border border-surface-600 bg-surface-800 text-[9px] font-mono text-silver-300 uppercase tracking-widest">
                      {potg.stl} STL
                    </span>
                  )}
                  {potg.blk >= 3 && (
                    <span className="px-2 py-0.5 rounded border border-surface-600 bg-surface-800 text-[9px] font-mono text-silver-300 uppercase tracking-widest">
                      {potg.blk} BLK
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex gap-6 pt-4 md:pt-0">
              <div className="text-center">
                <p className="text-[10px] font-mono text-gold uppercase tracking-widest mb-1">PTS</p>
                <p className="text-4xl font-display text-white">{potg.pts}</p>
              </div>
              <div className="w-px bg-surface-700/50" />
              <div className="text-center">
                <p className="text-[10px] font-mono text-gold uppercase tracking-widest mb-1">REB</p>
                <p className="text-4xl font-display text-white">{potg.reb}</p>
              </div>
              <div className="w-px bg-surface-700/50" />
              <div className="text-center">
                <p className="text-[10px] font-mono text-gold uppercase tracking-widest mb-1">AST</p>
                <p className="text-4xl font-display text-white">{potg.ast}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Box Scores */}
      {game.home_team && renderStatTable((game.home_team as any).name, homeStats)}
      {game.away_team && renderStatTable((game.away_team as any).name, awayStats)}

    </div>
  );
}
