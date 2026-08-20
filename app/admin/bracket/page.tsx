import { createClient } from '@/lib/supabase/server';
import AdminInteractiveBracket from '@/components/admin/AdminInteractiveBracket';
import StandingsTable from '@/components/StandingsTable';
import BracketSeeder from '@/components/admin/BracketSeeder';
import SeedEditor from '@/components/admin/SeedEditor';
import SwissGenerator from '@/components/admin/SwissGenerator';
import Link from '@/components/HiddenLink';
import BackButton from '@/components/BackButton';

export default async function AdminBracketPage({
  searchParams,
}: {
  searchParams: { t?: string };
}) {
  const supabase = createClient();

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, format, match_format')
    .neq('status', 'COMPLETED')
    .order('created_at', { ascending: false });

  const active = searchParams.t
    ? tournaments?.find((t) => t.id === searchParams.t) ?? tournaments?.[0]
    : tournaments?.[0];

  const { data: teams } = active 
    ? await supabase.from('teams').select('id, name').eq('tournament_id', active.id).order('name')
    : { data: [] };

  const { data: matchups } = active
    ? await supabase
        .from('bracket_matchups')
        .select('id, round, slot, status, winner_id, is_bye, bracket_side, match_format, feeds_into_matchup_id, loser_feeds_into_matchup_id, team_a:teams!bracket_matchups_team_a_id_fkey(id,name), team_b:teams!bracket_matchups_team_b_id_fkey(id,name)')
        .eq('tournament_id', active.id)
        .order('round', { ascending: true })
        .order('slot', { ascending: true })
    : { data: [] };

  // Get roster & seeded
  const { data: rosters } = active
    ? await supabase.from('tournament_rosters').select('team_id').eq('tournament_id', active.id)
    : { data: [] };
  const { data: seeds } = active
    ? await supabase.from('tournament_seeds').select('*').eq('tournament_id', active.id)
    : { data: [] };

  const rosterIds = (rosters ?? []).map((r) => r.team_id);
  const seededIds = (seeds ?? []).map((s) => s.team_id);

  return (
    <div className="space-y-8">
      <BackButton />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-bone">BRACKET MANAGEMENT</h1>
          <p className="text-mute text-sm mt-1">
            Verified series results advance teams automatically. The system never invents a winner —
            use Admin Override below for manual corrections.
          </p>
        </div>
        <Link href="/admin/tournaments/create" className="px-4 py-2 bg-gold text-arena-950 rounded-md text-sm font-display">
          CREATE TOURNAMENT
        </Link>
      </div>

      {tournaments && tournaments.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {tournaments.map((t) => (
            <Link
              key={t.id}
              href={`/admin/bracket?t=${t.id}`}
              className={`px-3 py-1 rounded-md text-xs font-mono uppercase border ${
                active?.id === t.id
                  ? 'border-gold text-gold'
                  : 'border-arena-700 text-mute hover:text-bone'
              }`}
            >
              {t.name}
            </Link>
          ))}
        </div>
      )}

      {!active ? (
        <p className="card p-6 text-mute text-sm">No tournaments yet.</p>
      ) : (
        <>
          <div className="card p-4 flex items-center justify-between">
            <p className="text-bone">{active.name}</p>
            <p className="text-xs font-mono text-gold uppercase">{active.status}</p>
          </div>
          {active.format === 'PLAYOFFS' && (
            <SeedEditor 
              tournamentId={active.id} 
              teams={teams ?? []}
              seeds={seeds ?? []}
            />
          )}

          {(active.format === 'ROUND_ROBIN' || active.format === 'LEADERBOARD') ? (
            <StandingsTable matchups={(matchups ?? []) as any} teams={teams ?? []} seeds={seeds ?? []} />
          ) : active.format === 'SWISS' ? (
            <>
              <StandingsTable matchups={(matchups ?? []) as any} teams={teams ?? []} seeds={seeds ?? []} />
              <div className="mt-8">
                <AdminInteractiveBracket matchups={(matchups ?? []) as any} teams={(teams ?? []) as any} defaultMatchFormat={active.match_format} />
              </div>
            </>
          ) : (
            <AdminInteractiveBracket matchups={(matchups ?? []) as any} teams={(teams ?? []) as any} defaultMatchFormat={active.match_format} />
          )}

          {active.format === 'SWISS' && active.status === 'IN_PROGRESS' && (
            <SwissGenerator tournamentId={active.id} />
          )}
        </>
      )}
    </div>
  );
}
