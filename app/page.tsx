import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { formatDate, formatTime } from '@/lib/format';

export default async function HomePage() {
  const supabase = createClient();

  const [{ data: upcoming }, { data: awards }, { data: recentGames }] = await Promise.all([
    supabase
      .from('schedules')
      .select('id, scheduled_date, scheduled_time, round_label, game_type, home_team_id, away_team_id, status, home:teams!schedules_home_team_id_fkey(name), away:teams!schedules_away_team_id_fkey(name)')
      .eq('status', 'SCHEDULED')
      .order('scheduled_date', { ascending: true })
      .limit(3),
    supabase.from('awards').select('id, award_type, winner_player_id').eq('status', 'PUBLISHED').limit(3),
    supabase
      .from('games')
      .select('id, home_score, away_score, schedule:schedules(scheduled_date, game_type, round_label, tournament:tournaments(name)), home:teams!games_home_team_id_fkey(name), away:teams!games_away_team_id_fkey(name)')
      .in('status', ['VERIFIED', 'COMPLETED'])
      .order('verified_at', { ascending: false })
      .limit(10),
  ]);

  return (
    <div className="space-y-16">
      {/* Recent Results Ticker */}
      {recentGames && recentGames.length > 0 && (
        <div className="w-full overflow-hidden bg-surface-900 border-b border-surface-700 py-3 relative flex items-center">
          <div className="animate-marquee flex whitespace-nowrap gap-8">
            {recentGames.map((g: any, i: number) => {
              const homeName = g.home?.name || 'TBA';
              const awayName = g.away?.name || 'TBA';
              const homeScore = g.home_score ?? 0;
              const awayScore = g.away_score ?? 0;
              const isHomeWin = homeScore > awayScore;
              const isAwayWin = awayScore > homeScore;
              const tName = g.schedule?.tournament?.name || g.schedule?.game_type?.replace(/_/g, ' ') || 'PRO-AM';

              return (
                <Link href={`/games/${g.id}`} key={g.id + '-' + i} className="flex flex-col min-w-[280px] px-4 border-r border-surface-700 last:border-0 hover:bg-surface-800/50 transition-colors cursor-pointer">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 rounded-full bg-surface-700 border border-surface-600"></div>
                      <span className="text-[9px] font-mono text-gold uppercase tracking-widest">{tName}</span>
                    </div>
                    <span className="text-[10px] font-mono text-silver-600">{formatDate(g.schedule?.scheduled_date)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <span className={`text-xs font-display tracking-widest ${isHomeWin ? 'text-white' : 'text-silver-400'}`}>{homeName}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono ${isHomeWin ? 'text-white' : 'text-silver-500'}`}>{homeScore}</span>
                      {isHomeWin && <span className="text-[9px] bg-gold text-arena-950 font-bold px-1 rounded uppercase">W</span>}
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={`text-xs font-display tracking-widest ${isAwayWin ? 'text-white' : 'text-silver-400'}`}>{awayName}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-mono ${isAwayWin ? 'text-white' : 'text-silver-500'}`}>{awayScore}</span>
                      {isAwayWin && <span className="text-[9px] bg-gold text-arena-950 font-bold px-1 rounded uppercase">W</span>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-surface-700 bg-surface-900">
        {/* Subtle grid texture */}
        <div className="absolute inset-0 bg-grid-subtle opacity-100 pointer-events-none" />
        {/* Glow top-left */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />

        <div className="relative px-8 md:px-16 py-20">
          <p className="text-silver-500 font-mono text-xs tracking-[0.4em] uppercase mb-5">
            NBA2K26 · Pro-Am League
          </p>
          <h1 className="text-5xl md:text-7xl leading-[0.92] text-white">
            EVERY GAME
            <br />
            <span className="text-silver-400">CROWNS A KING.</span>
          </h1>
          <p className="mt-6 max-w-lg text-silver-500 leading-relaxed">
            KINGPINS BATTLEGROUND
            HOME OF THE GOATED PLAYERS
            PRO AM LEAGUES
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              href="/schedule"
              className="btn-primary"
            >
              VIEW SCHEDULE
            </Link>
            <Link
              href="/tournaments"
              className="btn-secondary"
            >
              VIEW TOURNAMENTS
            </Link>
          </div>
        </div>
      </section>

      {/* Upcoming Games */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl text-white tracking-wide">Upcoming Games</h2>
          <Link href="/schedule" className="text-xs text-silver-500 hover:text-white transition-colors font-mono uppercase tracking-widest">
            View all →
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(upcoming ?? []).length === 0 && (
            <p className="text-silver-600 text-sm col-span-3">No games scheduled yet.</p>
          )}
          {(upcoming ?? []).map((g: any) => (
            <div key={g.id} className="card-hover p-5 group">
              <p className="text-[10px] font-mono text-silver-600 uppercase tracking-widest mb-2">
                {g.game_type}{g.round_label ? ` · ${g.round_label}` : ''}
              </p>
              <p className="text-white font-display text-lg tracking-widest mb-2">
                {g.home?.name ?? 'TBD'} <span className="text-silver-600 text-sm">vs</span> {g.away?.name ?? 'TBD'}
              </p>
              <p className="text-silver-300 font-body">
                {formatDate(g.scheduled_date)}
              </p>
              <p className="text-silver-500 text-sm mt-1">{formatTime(g.scheduled_time)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Published Awards */}
      <section>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl text-white tracking-wide">Published Awards</h2>
          <Link href="/awards" className="text-xs text-silver-500 hover:text-white transition-colors font-mono uppercase tracking-widest">
            View all →
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {(awards ?? []).length === 0 && (
            <p className="text-silver-600 text-sm col-span-3">No awards published yet — admins are still reviewing.</p>
          )}
          {(awards ?? []).map((a) => (
            <div key={a.id} className="card-hover p-5">
              <p className="text-xs font-mono text-silver-600 uppercase tracking-widest mb-2">Award</p>
              <p className="text-white font-display tracking-wide">
                {a.award_type.replace(/_/g, ' ')}
              </p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
