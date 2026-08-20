import { createClient } from '@/lib/supabase/server';
import BracketTree from '@/components/BracketTree';
import StandingsTable from '@/components/StandingsTable';

export default async function PublicBracketPage() {
  const supabase = createClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, status, format, match_format')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const { data: matchups } = tournament
    ? await supabase
        .from('bracket_matchups')
        .select('id, round, slot, status, winner_id, is_bye, bracket_side, match_format, feeds_into_matchup_id, loser_feeds_into_matchup_id, team_a:teams!bracket_matchups_team_a_id_fkey(id,name), team_b:teams!bracket_matchups_team_b_id_fkey(id,name), series(team_a_wins, team_b_wins), schedule:schedules(games(home_score, away_score, status))')
        .eq('tournament_id', tournament.id)
        .order('round', { ascending: true })
        .order('slot', { ascending: true })
    : { data: [] };

  const { data: teams } = await supabase.from('teams').select('id, name').order('name');

  const { data: seeds } = tournament
    ? await supabase.from('tournament_seeds').select('*').eq('tournament_id', tournament.id)
    : { data: [] };

  return (
    <div>
      <h1 className="text-4xl text-bone mb-1">{tournament?.name ?? 'BRACKET'}</h1>
      <p className="text-mute text-sm mb-8">
        Winners are only advanced after an admin verifies the series result.
      </p>
      {!tournament ? (
        <p className="card p-6 text-mute text-sm">No active tournament bracket yet.</p>
      ) : tournament.format === 'ROUND_ROBIN' || tournament.format === 'LEADERBOARD' ? (
        <StandingsTable matchups={(matchups ?? []) as any} teams={teams ?? []} seeds={seeds ?? []} />
      ) : tournament.format === 'SWISS' ? (
        <>
          <StandingsTable matchups={(matchups ?? []) as any} teams={teams ?? []} seeds={seeds ?? []} />
          <div className="mt-8">
            <BracketTree matchups={(matchups ?? []) as any} defaultMatchFormat={tournament.match_format} />
          </div>
        </>
      ) : (
        <BracketTree matchups={(matchups ?? []) as any} defaultMatchFormat={tournament.match_format} />
      )}
    </div>
  );
}
