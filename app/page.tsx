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
      .eq('is_archived', false)
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
    <div className="space-y-4">
      {/* Match Center */}
      {sortedGames && sortedGames.length > 0 && (
        <section>
          <MatchCenter games={sortedGames} />
        </section>
      )}

      {/* Hero */}
      <section
        className="relative overflow-hidden rounded-2xl border border-surface-700/50 shadow-[0_0_50px_rgba(229,0,0,0.05)] bg-[size:100%_100%] bg-center bg-no-repeat min-h-[300px] md:min-h-[380px] flex items-end p-8 md:p-12"
        style={{ backgroundImage: "url('/bg-container.png')" }}
      >
        {/* Glow top-left */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-accent/[0.05] blur-3xl pointer-events-none" />

        <div className="relative w-full flex flex-wrap justify-center sm:justify-start gap-5 z-10 mt-auto">
          <Link
            href="/schedule"
            className="px-8 py-3.5 bg-red-600 text-white font-display uppercase tracking-[0.2em] rounded-full transition-all duration-300 hover:bg-red-500 hover:shadow-[0_0_20px_rgba(220,38,38,0.4)] hover:-translate-y-1"
          >
            VIEW SCHEDULE
          </Link>
          <Link
            href="/tournaments"
            className="px-8 py-3.5 bg-surface-900/60 backdrop-blur-md border border-surface-600/50 text-white font-display uppercase tracking-[0.2em] rounded-full transition-all duration-300 hover:bg-surface-800 hover:border-surface-400 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:-translate-y-1"
          >
            VIEW TOURNAMENTS
          </Link>
        </div>
      </section>

    </div>
  );
}
