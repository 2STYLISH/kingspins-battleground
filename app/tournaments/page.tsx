import Link from '@/components/HiddenLink';
import { createClient } from '@/lib/supabase/server';

export default async function TournamentsPage() {
  const supabase = createClient();
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, format, start_date, end_date')
    .order('created_at', { ascending: false });

  const activeLeagues = (tournaments ?? []).filter(t => ['SEEDING', 'IN_PROGRESS'].includes(t.status));
  const archivedLeagues = (tournaments ?? []).filter(t => ['COMPLETED', 'CANCELLED'].includes(t.status));

  function getStatusBadge(status: string) {
    switch (status) {
      case 'DRAFT':
      case 'SEEDING':
        return <span className="text-[9px] bg-surface-700 text-silver-300 px-2 py-0.5 rounded font-mono uppercase tracking-widest font-bold">Draft / Seeding</span>;
      case 'IN_PROGRESS':
        return <span className="text-[9px] bg-red-600 text-white px-2 py-0.5 rounded font-mono uppercase tracking-widest font-bold">Live</span>;
      case 'COMPLETED':
        return <span className="text-[9px] bg-surface-800 text-silver-400 border border-surface-600 px-2 py-0.5 rounded font-mono uppercase tracking-widest">Completed</span>;
      case 'CANCELLED':
        return <span className="text-[9px] bg-surface-800 text-crimson-400 border border-surface-600 px-2 py-0.5 rounded font-mono uppercase tracking-widest">Cancelled</span>;
      default:
        return null;
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-12">
      <div>
        <p className="text-[10px] text-[#b8860b] font-mono uppercase tracking-[0.3em] mb-2">PRO-AM LEAGUES</p>
        <h1 className="text-5xl text-white font-display tracking-widest uppercase drop-shadow-[0_0_15px_rgba(229,0,0,0.3)]">TOURNAMENTS</h1>
      </div>

      {/* Active Leagues */}
      <section>
        <div className="flex items-center gap-3 mb-6 border-b border-surface-700 pb-2">
          <h2 className="text-2xl font-display text-white uppercase tracking-widest">ACTIVE LEAGUES</h2>
          <span className="text-[10px] font-mono bg-surface-800 text-silver-400 px-2 py-1 rounded">{activeLeagues.length}</span>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {activeLeagues.length === 0 && <p className="text-silver-500 font-mono text-sm uppercase">No active leagues right now.</p>}
          {activeLeagues.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.id}`} className="block border border-surface-700 bg-[#080808]/90 backdrop-blur-sm shadow-lg hover:border-red-600 transition-colors rounded overflow-hidden group">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-2xl font-display text-white uppercase tracking-widest group-hover:text-red-600 transition-colors">{t.name}</p>
                  {getStatusBadge(t.status)}
                </div>
                <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-surface-700">
                  <div>
                    <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">FORMAT</p>
                    <p className="text-xs font-mono text-silver-300 uppercase">{t.format.replace(/_/g, ' ')}</p>
                  </div>
                  {t.start_date && (
                    <div>
                      <p className="text-[9px] font-mono text-silver-600 uppercase tracking-widest mb-1">KICKOFF</p>
                      <p className="text-xs font-mono text-silver-300 uppercase">{new Date(t.start_date).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Archived Leagues */}
      <section>
        <div className="flex items-center gap-3 mb-6 border-b border-surface-700 pb-2 mt-12">
          <h2 className="text-xl font-display text-silver-400 uppercase tracking-widest">COMPLETED LEAGUES</h2>
          <span className="text-[10px] font-mono bg-surface-800 text-silver-500 px-2 py-1 rounded">{archivedLeagues.length}</span>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {archivedLeagues.length === 0 && <p className="text-silver-500 font-mono text-sm uppercase">No archived leagues.</p>}
          {archivedLeagues.map((t) => (
            <Link key={t.id} href={`/tournaments/${t.id}`} className="flex justify-between items-center p-3 border border-surface-700 bg-[#111] hover:border-surface-500 transition-colors rounded group">
              <div>
                <p className="text-sm font-display text-white group-hover:text-[#b8860b] transition-colors tracking-widest uppercase truncate max-w-[180px]">{t.name}</p>
                <p className="text-[9px] font-mono text-silver-500 uppercase mt-0.5">{t.format.replace(/_/g, ' ')}</p>
              </div>
              <div>
                {getStatusBadge(t.status)}
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
