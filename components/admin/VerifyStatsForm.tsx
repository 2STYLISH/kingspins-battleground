'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveVerifiedGameStats } from '@/lib/actions/games';
import type { ScreenshotExtractionResult } from '@/lib/types';

interface RosterPlayer {
  id: string;
  gamertag: string;
}

interface StatRow {
  playerId: string;
  gamertag: string;
  didNotPlay: boolean;
  pts: number | '';
  reb: number | '';
  ast: number | '';
  stl: number | '';
  blk: number | '';
  fgm: number | '';
  fga: number | '';
  tpm: number | '';
  tpa: number | '';
  ftm: number | '';
  fta: number | '';
  turnovers: number | '';
}

const FIELDS: (keyof Omit<StatRow, 'playerId' | 'gamertag' | 'didNotPlay'>)[] = [
  'pts', 'reb', 'ast', 'stl', 'blk', 'fgm', 'fga', 'tpm', 'tpa', 'ftm', 'fta', 'turnovers',
];

const FIELD_LABELS: Record<string, string> = {
  pts: 'PTS', reb: 'REB', ast: 'AST', stl: 'STL', blk: 'BLK',
  fgm: 'FGM', fga: 'FGA', tpm: '3PM', tpa: '3PA', ftm: 'FTM', fta: 'FTA', turnovers: 'TO',
};

function emptyRow(p: RosterPlayer): StatRow {
  return {
    playerId: p.id, gamertag: p.gamertag, didNotPlay: true,
    pts: 0, reb: 0, ast: 0, stl: 0, blk: 0,
    fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, turnovers: 0,
  };
}

function buildInitialRows(
  roster: RosterPlayer[],
  extractionPlayers: ScreenshotExtractionResult['players'] | undefined,
  existing: any[]
): StatRow[] {
  return roster.map((p) => {
    const existingRow = existing.find((s) => s.player_id === p.id);
    if (existingRow) {
      return {
        playerId: p.id, gamertag: p.gamertag,
        didNotPlay: existingRow.did_not_play ?? false,
        pts: existingRow.pts, reb: existingRow.reb, ast: existingRow.ast,
        stl: existingRow.stl, blk: existingRow.blk, fgm: existingRow.fgm,
        fga: existingRow.fga, tpm: existingRow.tpm, tpa: existingRow.tpa,
        ftm: existingRow.ftm, fta: existingRow.fta,
        turnovers: existingRow.turnovers,
      };
    }
    // Fuzzy-match AI extraction to roster by lowercased gamertag and fallback to subset matching
    const match = extractionPlayers?.find((ep) => {
      const epGt = (ep.gamertag || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const pGt = (p.gamertag || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      if (epGt === pGt) return true;
      // If OCR picked up extra characters, or missed a character, check if one contains the other
      if (epGt.length > 2 && pGt.length > 2) {
        if (epGt.includes(pGt) || pGt.includes(epGt)) return true;
      }
      return false;
    });
    if (match) {
      return {
        playerId: p.id, gamertag: p.gamertag, didNotPlay: false,
        pts: match.pts, reb: match.reb, ast: match.ast, stl: match.stl, blk: match.blk,
        fgm: match.fgm, fga: match.fga, tpm: match.tpm, tpa: match.tpa,
        ftm: match.ftm, fta: match.fta, turnovers: match.turnovers,
      };
    }
    return emptyRow(p);
  });
}

export default function VerifyStatsForm({
  gameId, homeTeamId, awayTeamId, homeTeamName, awayTeamName,
  homePlayers, awayPlayers, extraction, existingStats,
}: {
  gameId: string;
  homeTeamId: string;
  awayTeamId: string;
  homeTeamName: string;
  awayTeamName: string;
  homePlayers: RosterPlayer[];
  awayPlayers: RosterPlayer[];
  extraction: ScreenshotExtractionResult | null;
  existingStats: any[];
}) {
  const router = useRouter();
  const [homeRows, setHomeRows] = useState<StatRow[]>(() =>
    buildInitialRows(homePlayers, extraction?.players, existingStats)
  );
  const [awayRows, setAwayRows] = useState<StatRow[]>(() =>
    buildInitialRows(awayPlayers, extraction?.players, existingStats)
  );

  // Re-initialize rows whenever extraction data changes (e.g. after upload + router.refresh())
  // useState initializer only runs once on mount, so we need this effect to pick up new AI data.
  useEffect(() => {
    setHomeRows(buildInitialRows(homePlayers, extraction?.players, existingStats));
    setAwayRows(buildInitialRows(awayPlayers, extraction?.players, existingStats));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [extraction]);

  const extractedHomeScore = useMemo(() => {
    if (!extraction?.teams) return 0;
    const match = extraction.teams.find(t => (t.name || '').toLowerCase().includes((homeTeamName || '').toLowerCase().slice(0, 3)));
    if (match) return match.score;
    // fallback if no clear match
    return extraction.teams[0]?.score ?? 0;
  }, [extraction, homeTeamName]);

  const extractedAwayScore = useMemo(() => {
    if (!extraction?.teams) return 0;
    const match = extraction.teams.find(t => (t.name || '').toLowerCase().includes((awayTeamName || '').toLowerCase().slice(0, 3)));
    if (match) return match.score;
    // fallback if no clear match
    return extraction.teams[1]?.score ?? 0;
  }, [extraction, awayTeamName]);

  const [homeScore, setHomeScore] = useState(extractedHomeScore);
  const [awayScore, setAwayScore] = useState(extractedAwayScore);

  // Also sync scores when extraction changes
  useEffect(() => {
    if (extraction) {
      setHomeScore(extractedHomeScore);
      setAwayScore(extractedAwayScore);
    }
  }, [extraction, extractedHomeScore, extractedAwayScore]);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');

  const homeActive = homeRows.filter((r) => !r.didNotPlay).length;
  const awayActive = awayRows.filter((r) => !r.didNotPlay).length;

  function updateCell(side: 'home' | 'away', playerId: string, field: keyof StatRow, value: any) {
    const setter = side === 'home' ? setHomeRows : setAwayRows;
    setter((rows) => rows.map((r) => (r.playerId === playerId ? { ...r, [field]: value } : r)));
  }

  function toggleDNP(side: 'home' | 'away', playerId: string) {
    const setter = side === 'home' ? setHomeRows : setAwayRows;
    setter((rows) =>
      rows.map((r) => {
        if (r.playerId !== playerId) return r;
        const nowDNP = !r.didNotPlay;
        return {
          ...r,
          didNotPlay: nowDNP,
          // Zero out stats when toggling to DNP
          ...(nowDNP ? { pts: 0, reb: 0, ast: 0, stl: 0, blk: 0, fgm: 0, fga: 0, tpm: 0, tpa: 0, ftm: 0, fta: 0, turnovers: 0 } : {}),
        };
      })
    );
  }

  async function save() {
    setSaving(true);
    setError('');
    try {
      await saveVerifiedGameStats({
        gameId,
        homeScore,
        awayScore,
        players: [
          ...homeRows.map((r) => ({ playerId: r.playerId, teamId: homeTeamId, didNotPlay: r.didNotPlay, ...pickAndParse(r) })),
          ...awayRows.map((r) => ({ playerId: r.playerId, teamId: awayTeamId, didNotPlay: r.didNotPlay, ...pickAndParse(r) })),
        ],
      });
      setConfirming(false);
      router.refresh();
    } catch (e: any) {
      setError(e.message ?? 'Save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card p-6 space-y-6">
      <div>
        <h2 className="font-display text-lg text-white tracking-widest mb-1">REVIEW & VERIFY STATS</h2>
        <p className="text-xs text-silver-500 leading-relaxed">
          Pre-filled from the AI extraction where a gamertag matched. Toggle{' '}
          <span className="text-silver-300 font-mono">DNP</span> for players who did not play —
          they will be excluded from stats and awards. Check every row before saving.
        </p>
      </div>

      {/* Score row */}
      <div className="flex flex-wrap gap-6 items-center p-4 bg-surface-900 rounded-xl border border-surface-700">
        <label className="flex items-center gap-3 text-sm text-silver-400">
          <span className="font-mono text-white">{homeTeamName}</span>
          <input
            type="number"
            value={homeScore}
            onChange={(e) => setHomeScore(Number(e.target.value))}
            className="w-20 bg-surface-800 border border-surface-600 rounded-lg px-2 py-1 text-white stat-mono text-center focus:outline-none focus:ring-1 focus:ring-silver-400"
          />
        </label>
        <span className="text-silver-600 font-display text-sm">VS</span>
        <label className="flex items-center gap-3 text-sm text-silver-400">
          <span className="font-mono text-white">{awayTeamName}</span>
          <input
            type="number"
            value={awayScore}
            onChange={(e) => setAwayScore(Number(e.target.value))}
            className="w-20 bg-surface-800 border border-surface-600 rounded-lg px-2 py-1 text-white stat-mono text-center focus:outline-none focus:ring-1 focus:ring-silver-400"
          />
        </label>
      </div>

      {/* Team tables */}
      <StatTable
        teamName={homeTeamName}
        rows={homeRows}
        activePlayers={homeActive}
        onToggleDNP={(id) => toggleDNP('home', id)}
        onChange={(id, f, v) => updateCell('home', id, f, v)}
      />
      <StatTable
        teamName={awayTeamName}
        rows={awayRows}
        activePlayers={awayActive}
        onToggleDNP={(id) => toggleDNP('away', id)}
        onChange={(id, f, v) => updateCell('away', id, f, v)}
      />

      {error && (
        <div className="bg-surface-700 border border-surface-600 rounded-lg px-3 py-2">
          <p className="text-silver-300 text-sm">{error}</p>
        </div>
      )}

      <button onClick={() => setConfirming(true)} className="btn-primary">
        VERIFY & SAVE
      </button>

      {/* Confirm modal */}
      {confirming && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="card p-6 max-w-md w-full border-surface-500 shadow-2xl">
            <p className="text-xs font-mono text-silver-500 uppercase tracking-widest mb-3">
              ⚠ Confirm Verification
            </p>
            <p className="text-white leading-relaxed text-sm">
              This locks in the final score and every player line as the official, verified record.
              It will immediately count toward public statistics and award rankings.
              Players marked <span className="text-silver-300 font-mono">DNP</span> will be excluded.
            </p>
            <div className="mt-6 flex gap-3 justify-end">
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 text-sm text-silver-500 hover:text-white transition-colors"
              >
                CANCEL
              </button>
              <button onClick={save} disabled={saving} className="btn-primary px-5">
                {saving ? 'SAVING…' : 'CONFIRM VERIFY'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function pickAndParse(r: StatRow) {
  const { playerId, gamertag, didNotPlay, ...rest } = r;
  return {
    pts: Number(rest.pts) || 0,
    reb: Number(rest.reb) || 0,
    ast: Number(rest.ast) || 0,
    stl: Number(rest.stl) || 0,
    blk: Number(rest.blk) || 0,
    fgm: Number(rest.fgm) || 0,
    fga: Number(rest.fga) || 0,
    tpm: Number(rest.tpm) || 0,
    tpa: Number(rest.tpa) || 0,
    ftm: Number(rest.ftm) || 0,
    fta: Number(rest.fta) || 0,
    turnovers: Number(rest.turnovers) || 0,
  };
}

function StatTable({
  teamName, rows, activePlayers, onToggleDNP, onChange,
}: {
  teamName: string;
  rows: StatRow[];
  activePlayers: number;
  onToggleDNP: (playerId: string) => void;
  onChange: (playerId: string, field: keyof StatRow, value: number | '') => void;
}) {
  return (
    <div>
      <div className="flex items-center gap-3 mb-3 pb-2 border-b border-surface-700">
        <p className="text-xs font-mono text-silver-400 uppercase tracking-widest flex-1">{teamName}</p>
        <span className="text-[10px] font-mono text-silver-600 uppercase tracking-widest">
          {activePlayers} playing · {rows.length - activePlayers} DNP
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs stat-mono min-w-[820px]">
          <thead>
            <tr className="text-silver-600 uppercase border-b border-surface-700">
              <th className="text-left py-2 pr-3 font-mono tracking-widest w-36">Player</th>
              <th className="px-2 py-2 text-center w-16 text-silver-500">Status</th>
              {FIELDS.map((f) => (
                <th key={f} className="px-1 py-2 text-right tracking-wider">
                  {FIELD_LABELS[f]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr
                key={r.playerId}
                className={`border-b border-surface-800 transition-colors ${r.didNotPlay
                    ? 'opacity-40'
                    : 'hover:bg-surface-800/50'
                  }`}
              >
                <td className="py-2 pr-3 text-silver-300 font-body whitespace-nowrap">
                  {r.gamertag}
                </td>
                {/* DNP toggle */}
                <td className="px-2 py-1 text-center">
                  <button
                    onClick={() => onToggleDNP(r.playerId)}
                    className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-colors ${r.didNotPlay
                        ? 'border-surface-500 text-silver-600 bg-surface-800'
                        : 'border-surface-600 text-silver-400 hover:border-white hover:text-white'
                      }`}
                  >
                    {r.didNotPlay ? 'DNP' : 'PLAYED'}
                  </button>
                </td>
                {FIELDS.map((f) => (
                  <td key={f} className="px-1 py-1">
                    <input
                      type="number"
                      value={r[f] as number | ''}
                      disabled={r.didNotPlay}
                      onChange={(e) => onChange(r.playerId, f, e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-12 bg-surface-900 border border-surface-600 rounded px-1 py-0.5 text-right text-silver-200 focus:outline-none focus:ring-1 focus:ring-silver-500 disabled:opacity-30 disabled:cursor-not-allowed"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
