import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

export default async function TournamentsPage() {
  const supabase = createClient();
  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id, name, status, format, start_date, end_date')
    .order('created_at', { ascending: false });

  function getStatusBadge(status: string) {
    switch (status) {
      case 'DRAFT':
      case 'SEEDING':
        return <span className="text-[10px] bg-surface-700 text-silver-300 px-2 py-0.5 rounded font-mono uppercase tracking-widest">Draft</span>;
      case 'IN_PROGRESS':
        return <span className="text-[10px] bg-gold/20 text-gold border border-gold/40 px-2 py-0.5 rounded font-mono uppercase tracking-widest">Ongoing</span>;
      case 'COMPLETED':
        return <span className="text-[10px] bg-green-900/40 text-green-400 border border-green-800/60 px-2 py-0.5 rounded font-mono uppercase tracking-widest">Completed</span>;
      case 'CANCELLED':
        return <span className="text-[10px] bg-crimson-900/40 text-crimson-400 border border-crimson-800/60 px-2 py-0.5 rounded font-mono uppercase tracking-widest">Cancelled</span>;
      default:
        return null;
    }
  }

  return (
    <div>
      <h1 className="text-4xl text-bone mb-6">TOURNAMENTS</h1>
      <div className="grid gap-3 md:grid-cols-2">
        {(tournaments ?? []).length === 0 && <p className="text-mute text-sm">No tournaments yet.</p>}
        {(tournaments ?? []).map((t) => (
          <Link key={t.id} href={`/tournaments/${t.id}`} className="card p-5 hover:border-gold/60 transition-colors flex justify-between items-start">
            <div>
              <p className="text-lg text-bone">{t.name}</p>
              <p className="text-xs font-mono text-mute uppercase mt-1">{t.format.replace('_', ' ')}</p>
            </div>
            {getStatusBadge(t.status)}
          </Link>
        ))}
      </div>
    </div>
  );
}
