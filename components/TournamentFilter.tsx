'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export default function TournamentFilter({ tournaments, activeId, basePath = '/teams' }: {
  tournaments: { id: string, name: string }[];
  activeId: string;
  basePath?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  return (
    <select
      value={activeId}
      onChange={(e) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('t', e.target.value);
        router.push(`${basePath}?${params.toString()}`);
      }}
      className="bg-surface-900 border border-surface-600 rounded-lg px-3 py-1.5 text-xs text-silver-400 focus:outline-none uppercase tracking-widest"
    >
      {tournaments.map((t) => (
        <option key={t.id} value={t.id}>{t.name}</option>
      ))}
    </select>
  );
}
