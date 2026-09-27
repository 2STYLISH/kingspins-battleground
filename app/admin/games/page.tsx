import { createClient } from '@/lib/supabase/server';
import BackButton from '@/components/BackButton';
import GamesManager from '@/components/admin/GamesManager';

export const maxDuration = 60;

export default async function AdminGamesPage() {
  const supabase = createClient();

  const { data: schedules } = await supabase
    .from('schedules')
    .select(
      'id, scheduled_date, scheduled_time, game_type, round_label, status, is_archived, home:teams!schedules_home_team_id_fkey(id,name), away:teams!schedules_away_team_id_fkey(id,name)'
    )
    .order('scheduled_date', { ascending: false })
    .limit(200);

  const { data: games } = await supabase
    .from('games')
    .select('id, schedule_id, status');
  const gameBySchedule = new Map((games ?? []).map((g) => [g.schedule_id, g]));

  const combined = (schedules ?? []).map((s: any) => {
    const game = gameBySchedule.get(s.id);
    return { ...s, gameStatus: game?.status ?? 'SCHEDULED' };
  });

  const sortOrder: Record<string, number> = {
    SCHEDULED: 1,
    LIVE: 2,
    AWAITING_STATS: 3,
    STATS_UNDER_REVIEW: 4,
    VERIFIED: 9,
    COMPLETED: 10,
  };

  combined.sort((a, b) => {
    const orderA = sortOrder[a.gameStatus] ?? 5;
    const orderB = sortOrder[b.gameStatus] ?? 5;
    if (orderA !== orderB) return orderA - orderB;
    // Tie-breaker: date descending
    const dateA = new Date(a.scheduled_date + 'T' + a.scheduled_time).getTime();
    const dateB = new Date(b.scheduled_date + 'T' + b.scheduled_time).getTime();
    return dateB - dateA;
  });

  return (
    <div className="space-y-4">
      <BackButton />
      <div className="mb-8 pb-6 border-b border-surface-700">
        <h1 className="text-4xl text-white mb-1">GAMES & SCREENSHOTS</h1>
        <p className="text-silver-500 text-sm">
          Upload the final box-score screenshot, run AI extraction, then review and mark players
          as DNP before verifying. Stats and award rankings update automatically on verify.
        </p>
      </div>

      <GamesManager schedules={combined} />
    </div>
  );
}
