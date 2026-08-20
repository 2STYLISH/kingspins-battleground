'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function TournamentSelect({
  tournaments,
  activeId,
  basePath,
}: {
  tournaments: { id: string; name: string }[];
  activeId: string;
  basePath: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newId = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    params.set('tournament_id', newId);
    router.push(`${basePath}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-surface-900/40 backdrop-blur-sm p-4 rounded-xl border border-surface-700/50 shadow-lg w-full sm:w-auto">
      <p className="text-sm font-mono text-gold uppercase tracking-widest shrink-0 font-bold drop-shadow-sm">Select Tournament:</p>
      <div className="relative w-full sm:w-64">
        <select
          value={activeId}
          onChange={handleChange}
          className="w-full appearance-none bg-surface-950/80 border border-surface-600 rounded-lg px-4 py-2.5 pr-10 text-white text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-all shadow-inner hover:border-surface-500 cursor-pointer"
        >
          {tournaments.map((t) => (
            <option key={t.id} value={t.id} className="bg-surface-900 text-white">
              {t.name}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-silver-400">
          ▼
        </div>
      </div>
    </div>
  );
}
