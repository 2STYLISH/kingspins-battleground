import Link from '@/components/HiddenLink';
import { createClient } from '@/lib/supabase/server';
import MatchCenter from '@/components/MatchCenter';
import { formatDate, formatTime } from '@/lib/format';

export default async function HomePage() {
  const supabase = createClient();

  const [{ data: upcoming }, { data: awards }, { data: recentGames }] = await Promise.all([
    supabase
      .from('schedules')
      .select('id, scheduled_date, scheduled_time, round_label, game_type, home_team_id, away_team_id, status, home:teams!schedules_home_team_id_fkey(name, logo_url), away:teams!schedules_away_team_id_fkey(name, logo_url)')
      .eq('status', 'SCHEDULED')
      .order('scheduled_date', { ascending: true })
      .limit(3),
    supabase.from('awards').select('id, award_type, winner_player_id').eq('status', 'PUBLISHED').limit(3),
    supabase
      .from('games')
      .select('id, home_score, away_score, schedule:schedules(scheduled_date, scheduled_time, game_type, round_label, tournament:tournaments(name, logo_url)), home:teams!games_home_team_id_fkey(name, logo_url), away:teams!games_away_team_id_fkey(name, logo_url)')
      .in('status', ['VERIFIED', 'COMPLETED'])
      .order('verified_at', { ascending: false })
      .limit(50),
  ]);

  // Sort games by scheduled date and time instead of upload time
  const sortedGames = (recentGames || []).sort((a: any, b: any) => {
    const dateTimeA = a.schedule?.scheduled_date ? new Date(`${a.schedule.scheduled_date}T${a.schedule.scheduled_time || '00:00:00'}`).getTime() : 0;
    const dateTimeB = b.schedule?.scheduled_date ? new Date(`${b.schedule.scheduled_date}T${b.schedule.scheduled_time || '00:00:00'}`).getTime() : 0;
    return dateTimeB - dateTimeA;
  }).slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Match Center */}
      {sortedGames && sortedGames.length > 0 && (
        <section>
          <MatchCenter games={sortedGames} />
        </section>
      )}

      {/* Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-surface-700 bg-surface-900">
        {/* Subtle grid texture */}
        <div className="absolute inset-0 bg-grid-subtle opacity-100 pointer-events-none" />
        {/* Glow top-left */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-white/[0.03] blur-3xl pointer-events-none" />

        <div className="relative px-8 md:px-16 py-12">
          <p className="text-silver-500 font-mono text-[10px] tracking-[0.4em] uppercase mb-4">
            NBA2K26 · Pro-Am League
          </p>
          <h1 className="text-5xl md:text-7xl leading-[0.92] text-white">
            EVERY GAME
            <br />
            <span className="text-silver-400">CROWNS A KING.</span>
          </h1>
          <p className="mt-4 max-w-lg text-silver-500 text-sm leading-relaxed">
            Step into Kingpins Battleground where the best Pro-Am teams compete, rivalries are built, and every tournaments leaves a legacy.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
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

    </div>
  );
}
