import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BackButton from '@/components/BackButton';
import { formatDate, formatTime } from '@/lib/format';

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED:        'text-silver-600 bg-surface-800',
  LIVE:             'text-white bg-surface-700',
  AWAITING_STATS:   'text-silver-400 bg-surface-800',
  STATS_UNDER_REVIEW: 'text-silver-300 bg-surface-700',
  VERIFIED:         'text-white bg-surface-700',
  COMPLETED:        'text-silver-400 bg-surface-800',
};

export default async function AdminGamesPage() {
  const supabase = createClient();

  const { data: schedules } = await supabase
    .from('schedules')
    .select(
      'id, scheduled_date, scheduled_time, game_type, round_label, status, home:teams!schedules_home_team_id_fkey(id,name), away:teams!schedules_away_team_id_fkey(id,name)'
    )
    .order('scheduled_date', { ascending: false })
    .limit(50);

  const { data: games } = await supabase.from('games').select('id, schedule_id, status');
  const gameBySchedule = new Map((games ?? []).map((g) => [g.schedule_id, g]));

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

      <div className="grid gap-3">
        {(schedules ?? []).length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-silver-600 text-sm">No games scheduled yet — create one in Schedule.</p>
          </div>
        )}
        {(schedules ?? []).map((s: any) => {
          const game = gameBySchedule.get(s.id);
          const gameStatus = game?.status ?? 'SCHEDULED';
          const statusStyle = STATUS_STYLES[gameStatus] ?? 'text-silver-600';
          return (
            <Link
              key={s.id}
              href={`/admin/games/${s.id}`}
              className="card-hover p-5 flex items-center justify-between"
            >
              <div>
                <p className="text-[10px] font-mono text-silver-600 uppercase tracking-widest">
                  {s.game_type}
                  {s.round_label ? ` · ${s.round_label}` : ''} · {formatDate(s.scheduled_date)} {formatTime(s.scheduled_time)}
                </p>
                <p className="text-white font-display text-lg mt-1">
                  {s.home?.name ?? 'TBD'} <span className="text-silver-600">vs</span> {s.away?.name ?? 'TBD'}
                </p>
              </div>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${statusStyle}`}>
                {gameStatus.replace(/_/g, ' ')}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
