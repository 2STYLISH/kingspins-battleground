import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import BackButton from '@/components/BackButton';
import PublishAwardButton from '@/components/admin/PublishAwardButton';
import FinalizeAwardForm from '@/components/admin/FinalizeAwardForm';

const VALID_TYPES = [
  'BEST_PG', 'BEST_SG', 'BEST_SF', 'BEST_PF', 'BEST_CENTER',
  'FINALS_MVP', 'OVERALL_MVP', 'OVERALL_DPOY',
];

const AWARD_DESC: Record<string, string> = {
  BEST_PG: 'Best Point Guard',
  BEST_SG: 'Best Shooting Guard',
  BEST_SF: 'Best Small Forward',
  BEST_PF: 'Best Power Forward',
  BEST_CENTER: 'Best Center',
  FINALS_MVP: 'Finals Most Valuable Player',
  OVERALL_MVP: 'Overall Most Valuable Player',
  OVERALL_DPOY: 'Overall Defensive Player of the Year',
};

export default async function AdminAwardDetailPage({ params, searchParams }: { params: { award: string }, searchParams: { tournament_id?: string } }) {
  const awardType = params.award.toUpperCase();
  if (!VALID_TYPES.includes(awardType)) notFound();

  const supabase = createClient();
  const tournamentId = searchParams.tournament_id;
  if (!tournamentId) notFound(); // Or handle gracefully, but we expect it now

  let { data: award } = await supabase
    .from('awards')
    .select('*, winner:players!awards_winner_player_id_fkey(id, gamertag)')
    .eq('award_type', awardType)
    .eq('tournament_id', tournamentId)
    .maybeSingle();

  // If award doesn't exist for this tournament, we can create it dynamically or just let the finalize form handle it.
  // Actually, FinalizeAwardForm expects an awardId to update, or it inserts.
  // We should pass tournamentId to FinalizeAwardForm so it can insert if it doesn't exist.

  const { data: rosterPlayers } = await supabase
    .from('tournament_rosters')
    .select('player:players(id, gamertag)')
    .eq('tournament_id', tournamentId);
  const eligiblePlayers = rosterPlayers?.map((r: any) => ({ id: r.player.id, gamertag: r.player.gamertag })).sort((a,b) => a.gamertag.localeCompare(b.gamertag)) ?? [];

  return (
    <div className="space-y-8">
      <BackButton />

      {/* Header */}
      <div className="pb-6 border-b border-surface-700">
        <p className="text-[10px] font-mono text-silver-600 uppercase tracking-widest mb-1">Award</p>
        <h1 className="text-3xl text-white mb-1">{awardType.replace(/_/g, ' ')}</h1>
        <p className="text-silver-500 text-sm">{AWARD_DESC[awardType] ?? ''}</p>
        {award?.status && (
          <span className={`mt-3 inline-block text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
            award.status === 'PUBLISHED' ? 'text-white bg-surface-700'
            : award.status === 'FINALIZED' ? 'text-silver-200 bg-surface-700'
            : 'text-silver-500 bg-surface-800'
          }`}>
            {award.status.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Finalize form — admin picks winner from tournament players */}
      {award?.status !== 'PUBLISHED' ? (
        <FinalizeAwardForm
          awardType={awardType}
          awardId={award?.id ?? null}
          tournamentId={tournamentId}
          currentWinnerId={award?.winner_player_id ?? null}
          candidates={eligiblePlayers}
        />
      ) : (
        <div className="card p-6 border-gold/30 bg-gold/5 flex flex-col items-center justify-center text-center py-10">
          <p className="text-[10px] font-mono text-gold uppercase tracking-widest mb-2">OFFICIAL WINNER</p>
          <p className="text-3xl text-white font-display tracking-widest">
            {(award as any).winner?.gamertag ?? 'Unknown'}
          </p>
          <p className="text-silver-400 text-sm font-mono uppercase tracking-widest mt-6">
            ✓ Published to public awards page
          </p>
        </div>
      )}

      {/* Publish panel */}
      {award?.status === 'FINALIZED' && (
        <div className="card p-5 flex items-center justify-between">
          <div>
            <p className="text-silver-300 text-sm">
              Winner: <span className="text-white font-display">{(award as any).winner?.gamertag}</span>
            </p>
            <p className="text-[10px] font-mono text-silver-600 uppercase mt-1">
              Finalized — not yet visible to the public
            </p>
          </div>
          <PublishAwardButton
            awardId={award.id}
            awardType={awardType}
            winnerName={(award as any).winner?.gamertag ?? ''}
          />
        </div>
      )}
    </div>
  );
}
