import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { formatDate } from '@/lib/format';

export default async function SchedulePage({ searchParams }: { searchParams: { filter?: string } }) {
  const supabase = createClient();
  const filter = searchParams.filter ?? 'all';

  let query = supabase
    .from('schedules')
    .select('id, scheduled_date, scheduled_time, game_type, round_label, status, home:teams!schedules_home_team_id_fkey(name), away:teams!schedules_away_team_id_fkey(name), games(id)')
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });

  if (filter === 'playoffs') query = query.eq('game_type', 'PLAYOFF');
  if (filter === 'regular') query = query.eq('game_type', 'REGULAR');
  if (filter === 'tournament') query = query.eq('game_type', 'TOURNAMENT');

  const { data: games } = await query;

  const grouped = new Map<string, typeof games>();
  (games ?? []).forEach((g) => {
    const list = grouped.get(g.scheduled_date) ?? [];
    list.push(g);
    grouped.set(g.scheduled_date, list as any);
  });

  const filters = [
    { key: 'all', label: 'All' },
    { key: 'regular', label: 'Regular Season' },
    { key: 'playoffs', label: 'Playoffs' },
    { key: 'tournament', label: 'Tournament' },
  ];

  return (
    <div>
      <h1 className="text-4xl text-bone mb-1">UPCOMING GAMES</h1>
      <div className="flex gap-2 my-6">
        {filters.map((f) => (
          <a
            key={f.key}
            href={`/schedule?filter=${f.key}`}
            className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase border ${
              filter === f.key ? 'border-gold text-gold' : 'border-arena-700 text-mute hover:text-bone'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {[...grouped.entries()].length === 0 && <p className="card p-6 text-mute text-sm">No games scheduled.</p>}

      <div className="space-y-6">
        {[...grouped.entries()].map(([date, list]) => (
          <div key={date}>
            <p className="text-xs font-mono text-gold uppercase tracking-widest mb-2">{formatDate(date)}</p>
            <div className="grid gap-3 md:grid-cols-2">
              {(list ?? []).map((g: any) => {
                const displayTime = g.scheduled_time 
                  ? new Date(`1970-01-01T${g.scheduled_time}`).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) 
                  : '';
                const gameId = g.games?.[0]?.id;
                const isComplete = g.status === 'COMPLETED' && gameId;

                const CardContent = (
                  <>
                    <p className="text-xs text-mute font-mono uppercase">{displayTime} · {g.status}</p>
                    <p className="text-bone mt-2">{g.home?.name ?? 'TBD'}</p>
                    <p className="text-mute text-xs my-1">VS</p>
                    <p className="text-bone">{g.away?.name ?? 'TBD'}</p>
                    {g.round_label && <p className="text-xs text-crimson-400 mt-2 uppercase font-mono">{g.round_label}</p>}
                  </>
                );

                return isComplete ? (
                  <Link key={g.id} href={`/games/${gameId}`} className="card p-4 block hover:border-gold/60 transition-colors">
                    {CardContent}
                  </Link>
                ) : (
                  <div key={g.id} className="card p-4">
                    {CardContent}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
