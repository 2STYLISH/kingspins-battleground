'use client';

import { useState } from 'react';
import { generateSwissRound } from '@/lib/actions/tournaments';
import { useRouter } from 'next/navigation';

export default function SwissGenerator({ tournamentId }: { tournamentId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleGenerate = async () => {
    setLoading(true);
    setError('');
    try {
      await generateSwissRound(tournamentId);
      router.refresh();
    } catch (e: any) {
      setError(e.message || 'Failed to generate next round.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-5 border-blue-500/40">
      <h2 className="text-lg text-bone mb-2">SWISS ENGINE</h2>
      <p className="text-sm text-mute mb-3">
        Generate the next round of Swiss pairings. The engine will automatically pair teams with similar records and avoid rematches. All matches in the current round must be completed before you can generate the next round.
      </p>
      
      {error && <p className="text-crimson-400 text-sm mb-3 font-mono">{error}</p>}
      
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-md text-sm font-display disabled:opacity-50"
      >
        {loading ? 'GENERATING...' : 'GENERATE NEXT ROUND'}
      </button>
    </div>
  );
}
