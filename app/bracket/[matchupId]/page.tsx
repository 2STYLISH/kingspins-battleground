import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from '@/components/HiddenLink';
import BackButton from '@/components/BackButton';

export default async function MatchupDetailPage({ params }: { params: { matchupId: string } }) {
  const supabase = createClient();

  const { data: matchup } = await supabase
    .from('bracket_matchups')
    .select(
      'id, round, slot, status, winner_id, tournament_id, team_a:teams!bracket_matchups_team_a_id_fkey(id,name), team_b:teams!bracket_matchups_team_b_id_fkey(id,name), tournament:tournaments(name)'
    )
    .eq('id', params.matchupId)
    .maybeSingle();

  if (!matchup) notFound();

  const { data: series } = await supabase
    .from('series')
    .select('id, match_format, team_a_id, team_b_id, team_a_wins, team_b_wins, status, winner_id')
    .eq('bracket_matchup_id', params.matchupId)
    .maybeSingle();

  const { data: schedules } = series
    ? await supabase
        .from('schedules')
        .select(`
          id, 
          round_label, 
          status, 
          scheduled_date,
          scheduled_time,
          games (
            id,
            home_score,
            away_score,
            status
          )
        `)
        .eq('series_id', series.id)
        .order('created_at', { ascending: true })
    : { data: [] };

  const teamA = matchup.team_a as any;
  const teamB = matchup.team_b as any;

  let scoreA = series?.team_a_wins;
  let scoreB = series?.team_b_wins;
  if (series && teamA) {
    if (series.team_b_id === teamA.id) {
      scoreA = series.team_b_wins;
      scoreB = series.team_a_wins;
    }
  }

  return (
    <div className="space-y-6">
      <BackButton />
      <div>
        <p className="text-xs font-mono text-mute uppercase">{(matchup.tournament as any)?.name}</p>
        <h1 className="text-4xl text-bone mt-1">
          {teamA?.name ?? 'TBD'} <span className="text-mute">vs</span> {teamB?.name ?? 'TBD'}
        </h1>
        <p className="text-xs font-mono text-gold uppercase mt-1">{matchup.status.replace(/_/g, ' ')}</p>
      </div>

      {!teamA || !teamB ? (
        <p className="card p-6 text-mute text-sm">
          This matchup is waiting on the winners of earlier rounds to be decided.
        </p>
      ) : !series ? (
        <p className="card p-6 text-mute text-sm">No series scheduled for this matchup yet.</p>
      ) : (
        <>
          <div className="card p-5">
            <p className="text-sm text-mute uppercase font-mono">{series.match_format}</p>
            <p className="text-2xl text-bone font-display mt-1">
              {teamA.name} <span className="text-gold">{scoreA}</span>
              <span className="text-mute mx-2">—</span>
              <span className="text-gold">{scoreB}</span> {teamB.name}
            </p>
            {series.status === 'COMPLETED' && (
              <p className="text-xs text-crimson-400 uppercase font-mono mt-2">
                Series winner: {series.winner_id === teamA.id ? teamA.name : teamB.name}
              </p>
            )}
          </div>

          <div>
            <h2 className="text-lg text-bone font-display tracking-wide mb-3">GAMES</h2>
            {(schedules ?? []).length === 0 ? (
              <p className="card p-4 text-mute text-sm">No games played yet in this series.</p>
            ) : (
              <div className="grid gap-2">
                {(schedules ?? []).map((s, i) => {
                  const game = Array.isArray(s.games) ? s.games[0] : s.games;
                  const isCompleted = game && (game.status === 'VERIFIED' || game.status === 'COMPLETED');
                  const label = s.round_label || `GAME ${i + 1}`;
                  
                  const inner = (
                    <>
                      <p className={`text-mute text-xs font-mono uppercase transition-colors ${isCompleted ? 'group-hover:text-gold' : ''}`}>
                        {label}
                      </p>
                      {isCompleted ? (
                        <p className="text-bone stat-mono transition-colors group-hover:text-white">
                          {game.home_score} — {game.away_score}
                        </p>
                      ) : (
                        <p className="text-xs font-mono text-gold uppercase">{s.status.replace(/_/g, ' ')}</p>
                      )}
                    </>
                  );

                  const className = `card p-4 flex items-center justify-between transition-colors ${
                    isCompleted ? 'hover:border-surface-600 cursor-pointer group' : ''
                  }`;

                  return isCompleted ? (
                    <Link href={`/games/${game.id}`} key={s.id} className={className}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={s.id} className={className}>
                      {inner}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
