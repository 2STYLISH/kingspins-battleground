'use client';

import { useState } from 'react';
import { updateSeedStats, randomizeBracket } from '@/lib/actions/tournaments';

export default function SeedEditor({
  tournamentId,
  teams,
  seeds
}: {
  tournamentId: string;
  teams: { id: string, name: string }[];
  seeds: { team_id: string, seed: number, manual_wins?: number, manual_losses?: number, point_differential?: number }[];
}) {
  const [busy, setBusy] = useState(false);
  const [localSeeds, setLocalSeeds] = useState(() => {
    const map = new Map<string, any>();
    for (const t of teams) {
      const s = seeds.find(x => x.team_id === t.id);
      map.set(t.id, {
        seed: s?.seed || '',
        manual_wins: s?.manual_wins ?? '',
        manual_losses: s?.manual_losses ?? '',
        point_differential: s?.point_differential ?? ''
      });
    }
    return map;
  });

  const handleUpdate = (teamId: string, field: string, value: string) => {
    const map = new Map(localSeeds);
    const data = map.get(teamId);
    if (data) {
      data[field] = value;
      map.set(teamId, data);
      setLocalSeeds(map);
    }
  };

  const handleSaveAll = async () => {
    setBusy(true);
    try {
      for (const [teamId, data] of Array.from(localSeeds.entries())) {
        await updateSeedStats({
          tournamentId,
          teamId,
          seed: data.seed === '' ? null : parseInt(data.seed),
          manual_wins: data.manual_wins === '' ? null : parseInt(data.manual_wins),
          manual_losses: data.manual_losses === '' ? null : parseInt(data.manual_losses),
          point_differential: data.point_differential === '' ? null : parseInt(data.point_differential),
        });
      }
      alert('Saved successfully!');
    } catch (e: any) {
      alert(e.message || 'Failed to save');
    } finally {
      setBusy(false);
    }
  };

  const handleSeedBracket = async () => {
    if (!confirm('This will lock in the current seeds and push them to the bracket. Are you sure?')) return;
    setBusy(true);
    try {
      await randomizeBracket(tournamentId, { randomizeSeeds: false });
      alert('Bracket seeded!');
    } catch (e: any) {
      alert(e.message || 'Failed to seed bracket');
    } finally {
      setBusy(false);
    }
  };

  // Sort by seed if available, otherwise by name
  const sortedTeams = [...teams].sort((a, b) => {
    const sA = localSeeds.get(a.id)?.seed;
    const sB = localSeeds.get(b.id)?.seed;
    if (sA && sB) return parseInt(sA) - parseInt(sB);
    if (sA) return -1;
    if (sB) return 1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="card p-5 border-gold/40 shadow-[0_0_15px_rgba(255,215,0,0.05)] mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg text-bone uppercase tracking-widest font-display">Standings & Seed Editor</h2>
          <p className="text-sm text-mute mt-1">
            Manually override team stats and assign seeds. Save your changes, then click "Generate Bracket From Seeds".
          </p>
        </div>
        <div className="flex gap-3">
          <button onClick={handleSaveAll} disabled={busy} className="btn-secondary py-2 px-6">
            {busy ? 'SAVING...' : 'SAVE STATS & SEEDS'}
          </button>
          <button onClick={handleSeedBracket} disabled={busy} className="btn-primary py-2 px-6">
            GENERATE BRACKET FROM SEEDS
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-mute">
          <thead className="bg-arena-900 border-b border-arena-800 text-xs font-mono uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Team</th>
              <th className="px-4 py-3 font-medium">Seed (1-10)</th>
              <th className="px-4 py-3 font-medium">Wins</th>
              <th className="px-4 py-3 font-medium">Losses</th>
              <th className="px-4 py-3 font-medium">Point Diff (PD)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-arena-800">
            {sortedTeams.map(t => {
              const data = localSeeds.get(t.id);
              return (
                <tr key={t.id} className="hover:bg-arena-800/50 transition-colors">
                  <td className="px-4 py-3 text-bone font-medium">{t.name}</td>
                  <td className="px-4 py-3">
                    <input type="number" value={data?.seed} onChange={e => handleUpdate(t.id, 'seed', e.target.value)} className="input-field w-20 text-center py-1" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={data?.manual_wins} onChange={e => handleUpdate(t.id, 'manual_wins', e.target.value)} className="input-field w-20 text-center py-1" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={data?.manual_losses} onChange={e => handleUpdate(t.id, 'manual_losses', e.target.value)} className="input-field w-20 text-center py-1" />
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" value={data?.point_differential} onChange={e => handleUpdate(t.id, 'point_differential', e.target.value)} className="input-field w-24 text-center py-1" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
