import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import AdminBackButton from '@/components/admin/AdminBackButton';
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

  const { data: candidates } = award
    ? await supabase
        .from('award_candidates')
        .select('rank, computed_rating, stat_snapshot, player:players(id, gamertag)')
        .eq('award_id', award.id)
        .order('rank', { ascending: true })
    : { data: [] };

  // Also fetch ALL players so admin can pick anyone even if not in candidates
  const { data: allPlayers } = await supabase
    .from('players')
    .select('id, gamertag')
    .order('gamertag');

  return (
    <div className="space-y-8">
      <AdminBackButton />

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

      {/* Candidate Rankings */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-mono text-silver-400 uppercase tracking-widest">
            Ranked Candidates
          </h2>
          <p className="text-[10px] text-silver-600 font-mono">Auto-updated on game verify</p>
        </div>

        {(candidates ?? []).length === 0 ? (
          <div className="card p-6 text-center">
            <p className="text-silver-600 text-sm">
              No candidates ranked yet. Candidates appear automatically once verified game stats exist.
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-xs stat-mono">
              <thead>
                <tr className="border-b border-surface-700 text-silver-600 uppercase tracking-wider">
                  <th className="text-left px-5 py-3 w-10">#</th>
                  <th className="text-left px-3 py-3">Player</th>
                  <th className="px-3 py-3 text-right">GP</th>
                  <th className="px-3 py-3 text-right">PPG</th>
                  <th className="px-3 py-3 text-right">RPG</th>
                  <th className="px-3 py-3 text-right">APG</th>
                  <th className="px-3 py-3 text-right">SPG</th>
                  <th className="px-3 py-3 text-right">BPG</th>
                  <th className="px-3 py-3 text-right">FG%</th>
                  <th className="px-3 py-3 text-right">WIN%</th>
                  <th className="px-3 py-3 text-right">Rating</th>
                </tr>
              </thead>
              <tbody>
                {(candidates ?? []).map((c: any, i: number) => {
                  const isWinner = award?.winner_player_id === c.player.id;
                  return (
                    <tr
                      key={c.player.id}
                      className={`border-b border-surface-800 last:border-0 transition-colors ${
                        isWinner ? 'bg-surface-800' : 'hover:bg-surface-800/50'
                      }`}
                    >
                      <td className="px-5 py-3 text-silver-600">{i + 1}</td>
                      <td className="px-3 py-3">
                        <span className="text-silver-200 font-body">{c.player.gamertag}</span>
                        {isWinner && (
                          <span className="ml-2 text-[9px] font-mono text-silver-300 bg-surface-700 px-1.5 py-0.5 rounded">
                            SELECTED
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3 text-right text-silver-500">{c.stat_snapshot.gamesPlayed ?? '—'}</td>
                      <td className="px-3 py-3 text-right text-white font-semibold">{c.stat_snapshot.ppg}</td>
                      <td className="px-3 py-3 text-right text-silver-300">{c.stat_snapshot.rpg}</td>
                      <td className="px-3 py-3 text-right text-silver-300">{c.stat_snapshot.apg}</td>
                      <td className="px-3 py-3 text-right text-silver-300">{c.stat_snapshot.spg}</td>
                      <td className="px-3 py-3 text-right text-silver-300">{c.stat_snapshot.bpg}</td>
                      <td className="px-3 py-3 text-right text-silver-400">{c.stat_snapshot.fgPct}%</td>
                      <td className="px-3 py-3 text-right text-silver-400">{c.stat_snapshot.winPct}%</td>
                      <td className="px-3 py-3 text-right">
                        <span className="text-white font-semibold">{c.computed_rating}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Finalize form — admin picks winner from ALL players, not just ranked */}
      <FinalizeAwardForm
        awardType={awardType}
        awardId={award?.id ?? null}
        tournamentId={tournamentId}
        currentWinnerId={award?.winner_player_id ?? null}
        currentNotes={award?.admin_notes ?? ''}
        candidates={(allPlayers ?? []).map((p: any) => ({ id: p.id, gamertag: p.gamertag }))}
      />

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

      {award?.status === 'PUBLISHED' && (
        <div className="card p-4 border-surface-600">
          <p className="text-silver-400 text-sm font-mono uppercase tracking-widest">
            ✓ Published — visible on /awards
          </p>
        </div>
      )}
    </div>
  );
}
