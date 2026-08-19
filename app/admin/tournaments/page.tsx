import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import TournamentStatusToggle from '@/components/admin/TournamentStatusToggle';
import BackButton from '@/components/BackButton';
import TournamentAdminActions from '@/components/admin/TournamentAdminActions';

export default async function AdminTournamentsPage() {
  const supabase = createClient();
  
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, format, start_date, end_date, championship_award_name')
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      <BackButton />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl text-bone">TOURNAMENTS</h1>
          <p className="text-mute text-sm mt-1">Manage tournament statuses and settings.</p>
        </div>
        <Link href="/admin/tournaments/create" className="btn-primary">
          CREATE TOURNAMENT
        </Link>
      </div>

      <div className="space-y-4">
        {(tournaments ?? []).length === 0 && <p className="card p-6 text-mute text-sm">No tournaments yet.</p>}
        {(tournaments ?? []).map((t) => (
          <div key={t.id} className="card p-5 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <p className="text-xl text-bone mb-1">{t.name}</p>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-mute uppercase">{t.format.replace('_', ' ')}</span>
                  <Link href={`/admin/bracket?t=${t.id}`} className="text-[10px] text-silver-500 hover:text-white uppercase tracking-widest border border-surface-600 rounded px-2 py-0.5">
                    Manage Bracket
                  </Link>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <TournamentStatusToggle tournamentId={t.id} currentStatus={t.status} />
              </div>
            </div>

            {/* Championship Award Name + Delete */}
            <TournamentAdminActions
              tournamentId={t.id}
              tournamentName={t.name}
              currentChampionshipName={t.championship_award_name ?? ''}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
