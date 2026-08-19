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
    <div className="flex items-center gap-3">
      <p className="text-sm font-mono text-silver-500 uppercase tracking-widest shrink-0">Select Tournament:</p>
      <select
        value={activeId}
        onChange={handleChange}
        className="bg-surface-900 border border-surface-600 rounded px-3 py-1.5 text-silver-200 text-xs font-mono uppercase tracking-widest focus:outline-none focus:border-silver-400 focus:ring-1 focus:ring-silver-400"
      >
        {tournaments.map((t) => (
          <option key={t.id} value={t.id}>
            {t.name}
          </option>
        ))}
      </select>
    </div>
  );
}
