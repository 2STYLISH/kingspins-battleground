import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BackButton from '@/components/BackButton';

const AWARD_TYPES = [
  'BEST_PG', 'BEST_SG', 'BEST_SF', 'BEST_PF', 'BEST_CENTER',
  'FINALS_MVP', 'OVERALL_MVP', 'OVERALL_DPOY',
];

const STATUS_LABEL: Record<string, { label: string; style: string }> = {
  DRAFT:        { label: 'Draft',        style: 'text-silver-600 bg-surface-800' },
  UNDER_REVIEW: { label: 'Under Review', style: 'text-silver-400 bg-surface-800' },
  FINALIZED:    { label: 'Finalized',    style: 'text-silver-200 bg-surface-700' },
  PUBLISHED:    { label: 'Published',    style: 'text-white bg-surface-700' },
};

export default async function AdminAwardsPage({ searchParams }: { searchParams: { tournament_id?: string } }) {
  const supabase = createClient();

  const { data: tournaments } = await supabase.from('tournaments').select('id, name').order('created_at', { ascending: false });
  const activeTournamentId = searchParams.tournament_id || tournaments?.[0]?.id;

  const { data: awards } = await supabase
    .from('awards')
    .select('id, award_type, status, winner:players!awards_winner_player_id_fkey(gamertag)')
    .eq('tournament_id', activeTournamentId);

  // Count candidates per award for display
  const { data: candidateCounts } = await supabase
    .from('award_candidates')
    .select('award_id'); // We'd ideally join to ensure it's for this tournament, but candidates belong to awards, and we're filtering awards

  const countByAward = new Map<string, number>();
  const awardIdMap = new Map<string, string>();
  (awards ?? []).forEach((a: any) => awardIdMap.set(a.award_type, a.id));
  (candidateCounts ?? []).forEach((c: any) => {
    countByAward.set(c.award_id, (countByAward.get(c.award_id) ?? 0) + 1);
  });

  const byType = new Map((awards ?? []).map((a: any) => [a.award_type, a]));

  return (
    <div className="space-y-6">
      <BackButton />
      <div className="pb-6 border-b border-surface-700">
        <h1 className="text-4xl text-white mb-2">AWARDS</h1>
        <p className="text-sm text-silver-500 mb-6">
          Candidate rankings auto-update every time you verify a game. The final winner is
          always selected manually — nothing publishes automatically.
        </p>

        <div className="flex items-center gap-3">
          <p className="text-sm font-mono text-silver-500 uppercase tracking-widest">Select Tournament:</p>
          <div className="flex gap-2 flex-wrap">
            {tournaments?.map(t => (
              <Link 
                key={t.id} 
                href={`/admin/awards?tournament_id=${t.id}`}
                className={`px-3 py-1 text-xs font-mono uppercase tracking-widest border ${
                  activeTournamentId === t.id ? 'border-gold text-gold bg-gold/5' : 'border-surface-600 text-silver-400 hover:border-silver-500'
                }`}
              >
                {t.name}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {!activeTournamentId ? (
        <p className="text-silver-500 text-sm">Please create a tournament first.</p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {AWARD_TYPES.map((type) => {
            const record = byType.get(type) as any;
            const status = record?.status ?? 'DRAFT';
            const { label, style } = STATUS_LABEL[status] ?? STATUS_LABEL.DRAFT;
            const awardId = awardIdMap.get(type);
            const candidateCount = awardId ? (countByAward.get(awardId) ?? 0) : 0;

            return (
              <div key={type} className="card p-5 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-sm text-white font-display tracking-widest">
                      {type.replace(/_/g, ' ')}
                    </p>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${style}`}>
                      {label}
                    </span>
                  </div>
                  <p className="text-xs text-silver-600 font-mono">
                    {candidateCount > 0
                      ? `${candidateCount} ranked candidate${candidateCount !== 1 ? 's' : ''}`
                      : 'No candidates yet'}
                    {record?.winner?.gamertag && ` · Winner: ${record.winner.gamertag}`}
                  </p>
                </div>
                <Link
                  href={`/admin/awards/${type}?tournament_id=${activeTournamentId}`}
                  className="btn-secondary text-xs px-3 py-1.5 whitespace-nowrap"
                >
                  MANAGE →
                </Link>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
