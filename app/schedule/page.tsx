import { createClient } from '@/lib/supabase/server';
import ScheduleAccordion from '@/components/ScheduleAccordion';

export default async function SchedulePage({ searchParams }: { searchParams: { filter?: string } }) {
  const supabase = createClient();
  const filter = searchParams.filter ?? 'all';

  let query = supabase
    .from('schedules')
    .select('id, scheduled_date, scheduled_time, game_type, round_label, status, tournament_id, tournament:tournaments(name, status), home:teams!schedules_home_team_id_fkey(name), away:teams!schedules_away_team_id_fkey(name), games(id)')
    .order('scheduled_date', { ascending: true })
    .order('scheduled_time', { ascending: true });

  if (filter === 'playoffs') query = query.eq('game_type', 'PLAYOFF');
  if (filter === 'regular') query = query.eq('game_type', 'REGULAR');
  if (filter === 'tournament') query = query.eq('game_type', 'TOURNAMENT');

  const { data: games } = await query;

  // Group games by tournament ID
  const groupedByTournament = new Map<string, { tournamentName: string, status: string, games: any[] }>();
  
  // Track games without a tournament separately
  const unassignedGames: any[] = [];

  (games ?? []).forEach((g) => {
    // Handle Supabase returning arrays for foreign keys
    const tournamentObj = Array.isArray(g.tournament) ? g.tournament[0] : g.tournament;
    
    if (g.tournament_id && tournamentObj) {
      const group = groupedByTournament.get(g.tournament_id) ?? {
        tournamentName: tournamentObj.name,
        status: tournamentObj.status,
        games: [] as any[]
      };
      group.games.push({ ...g, tournament: tournamentObj }); // normalize the tournament object just in case
      groupedByTournament.set(g.tournament_id, group);
    } else {
      unassignedGames.push(g);
    }
  });

  // Sort tournaments: active first (SEEDING, IN_PROGRESS), then others
  const sortedTournaments = [...groupedByTournament.values()].sort((a, b) => {
    const aActive = ['SEEDING', 'IN_PROGRESS'].includes(a.status);
    const bActive = ['SEEDING', 'IN_PROGRESS'].includes(b.status);
    if (aActive && !bActive) return -1;
    if (!aActive && bActive) return 1;
    return 0;
  });

  const filters = [
    { key: 'all', label: 'All Games' },
    { key: 'regular', label: 'Regular Season' },
    { key: 'playoffs', label: 'Playoffs' },
    { key: 'tournament', label: 'Tournament' },
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-[10px] text-[#b8860b] font-mono uppercase tracking-[0.3em] mb-2">BATTLEGROUND SCHEDULE</p>
        <h1 className="text-5xl text-white font-display tracking-widest uppercase drop-shadow-[0_0_15px_rgba(229,0,0,0.3)]">UPCOMING GAMES</h1>
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        {filters.map((f) => (
          <a
            key={f.key}
            href={`/schedule?filter=${f.key}`}
            className={`px-4 py-2 rounded text-[10px] font-mono uppercase tracking-widest border transition-colors ${
              filter === f.key 
                ? 'border-[#b8860b] bg-[#b8860b]/10 text-[#b8860b]' 
                : 'border-surface-700 bg-[#111] text-silver-400 hover:text-red-600 hover:border-red-600'
            }`}
          >
            {f.label}
          </a>
        ))}
      </div>

      {(games ?? []).length === 0 && (
        <div className="border border-surface-700 bg-[#080808] rounded p-8 text-center">
          <p className="text-silver-500 font-mono text-sm uppercase">No games scheduled for this filter.</p>
        </div>
      )}

      <div className="space-y-6">
        {sortedTournaments.map((t, idx) => (
          <ScheduleAccordion 
            key={idx} 
            tournamentName={t.tournamentName} 
            games={t.games} 
            defaultExpanded={['SEEDING', 'IN_PROGRESS'].includes(t.status)} 
          />
        ))}

        {unassignedGames.length > 0 && (
          <ScheduleAccordion 
            tournamentName="Exhibition / Unassigned Games" 
            games={unassignedGames} 
            defaultExpanded={true} 
          />
        )}
      </div>
    </div>
  );
}
