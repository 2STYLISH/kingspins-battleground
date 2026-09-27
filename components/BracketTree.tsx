'use client';

import { useMemo } from 'react';

export type Team = { id: string; name: string } | null;
export type Matchup = {
  id: string;
  round: number;
  slot: number;
  status: string;
  winner_id: string | null;
  bracket_side: 'WINNERS' | 'LOSERS' | 'GRAND_FINAL' | 'PLAY_IN' | 'ROUND_ROBIN' | 'SWISS';
  is_bye?: boolean;
  feeds_into_matchup_id?: string | null;
  loser_feeds_into_matchup_id?: string | null;
  matchNumber?: number;
  sourceA?: string;
  sourceB?: string;
  team_a: Team;
  team_b: Team;
  match_format?: string;
  schedule?: { games?: { id: string }[] };
  
  // Layout metadata computed on the fly
  y?: number;
  col?: number;
};

// ─── Constants ──────────────────────────────────────────────────────────────

const CARD_WIDTH = 200;
const CARD_HEIGHT = 56; // 2 rows of 28px
const COL_GAP = 60;
const COL_WIDTH = CARD_WIDTH + COL_GAP;
const ROW_HEIGHT = 100;

// ─── Match Card ─────────────────────────────────────────────────────────────

function MatchCard({
  matchup,
  matchNumber,
  onClick,
  defaultMatchFormat,
}: {
  matchup: Matchup;
  matchNumber: number;
  onClick?: (m: Matchup) => void;
  defaultMatchFormat?: string;
}) {
  const isComplete = matchup.status === 'COMPLETED';
  const href = `/bracket/${matchup.id}`;

  let scoreA: number | undefined;
  let scoreB: number | undefined;

  if ((matchup as any).series && (matchup as any).series.length > 0) {
    const s = (matchup as any).series[0];
    if (s.team_a_wins > 0 || s.team_b_wins > 0 || matchup.status === 'IN_PROGRESS' || matchup.status === 'COMPLETED') {
      if (s.team_a_id && matchup.team_a && s.team_a_id === matchup.team_a.id) {
        scoreA = s.team_a_wins; scoreB = s.team_b_wins;
      } else if (s.team_b_id && matchup.team_a && s.team_b_id === matchup.team_a.id) {
        scoreA = s.team_b_wins; scoreB = s.team_a_wins;
      } else {
        scoreA = s.team_a_wins; scoreB = s.team_b_wins;
      }
    }
  } else if (isComplete && matchup.winner_id) {
    scoreA = matchup.winner_id === matchup.team_a?.id ? 1 : 0;
    scoreB = matchup.winner_id === matchup.team_b?.id ? 1 : 0;
  }

  const isWinnerA = isComplete && matchup.winner_id === matchup.team_a?.id;
  const isWinnerB = isComplete && matchup.winner_id === matchup.team_b?.id;
  const isByeA = matchup.is_bye && !matchup.team_a;
  const isByeB = matchup.is_bye && !matchup.team_b;

  const innerContent = (
    <div className="flex flex-col h-full rounded-md overflow-hidden bg-surface-950 border border-surface-600 transition-colors">
      
      {/* Team A Row */}
      <div className={`flex items-center justify-between flex-1 px-3 ${isWinnerA ? 'bg-emerald-500/10' : ''}`}>
        <span className={`text-[11px] font-display uppercase tracking-widest truncate max-w-[140px] ${
          isByeA ? 'text-silver-600 italic' : isWinnerA ? 'text-emerald-400 font-bold' : !matchup.team_a ? 'text-silver-500 italic' : 'text-silver-200'
        }`}>
          {isByeA ? 'BYE' : matchup.team_a?.name ?? matchup.sourceA ?? 'TBD'}
        </span>
        {!isByeA && scoreA !== undefined && scoreA !== null && (
          <span className={`text-[13px] font-mono leading-none ${isWinnerA ? 'text-emerald-400 font-bold' : 'text-silver-400'}`}>
            {scoreA}
          </span>
        )}
      </div>
      
      <div className="border-t border-surface-700"></div>
      
      {/* Team B Row */}
      <div className={`flex items-center justify-between flex-1 px-3 ${isWinnerB ? 'bg-emerald-500/10' : ''}`}>
        <span className={`text-[11px] font-display uppercase tracking-widest truncate max-w-[140px] ${
          isByeB ? 'text-silver-600 italic' : isWinnerB ? 'text-emerald-400 font-bold' : !matchup.team_b ? 'text-silver-500 italic' : 'text-silver-200'
        }`}>
          {isByeB ? 'BYE' : matchup.team_b?.name ?? matchup.sourceB ?? 'TBD'}
        </span>
        {!isByeB && scoreB !== undefined && scoreB !== null && (
          <span className={`text-[13px] font-mono leading-none ${isWinnerB ? 'text-emerald-400 font-bold' : 'text-silver-400'}`}>
            {scoreB}
          </span>
        )}
      </div>

    </div>
  );

  return (
    <div className="relative group/bracketcard ml-6 h-full w-full">
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold transition-colors text-silver-600 group-hover/bracketcard:text-gold w-5 text-right pr-1.5 z-20">
        {matchNumber}
      </div>
      {onClick ? (
        <button onClick={() => onClick(matchup)} className={`w-full h-full text-left block hover:border-gold/50 cursor-pointer`}>
          {innerContent}
        </button>
      ) : (
        <a href={href} className={`w-full h-full text-left block hover:border-emerald-500/50`}>
          {innerContent}
        </a>
      )}
    </div>
  );
}

// ─── Layout Engine ──────────────────────────────────────────────────────────

function computeTreeLayout(matchups: Matchup[], side: string) {
  const sideMatches = matchups.filter(m => m.bracket_side === side);
  if (sideMatches.length === 0) return { height: 0, width: 0, columns: 0 };

  const byId = new Map(sideMatches.map(m => [m.id, m]));
  const rounds = [...new Set(sideMatches.map(m => m.round))].sort((a, b) => a - b);
  
  sideMatches.forEach(m => {
    m.col = rounds.indexOf(m.round);
  });
  
  const columns = rounds.length;
  
  // A root is a match that feeds into a match that is NOT in the same side (or null)
  const roots = sideMatches.filter(m => {
    if (!m.feeds_into_matchup_id) return true;
    const target = byId.get(m.feeds_into_matchup_id);
    return !target; // If target is not in this side, it's a root
  });
  
  const maxDepth = columns;
  const offsetY = CARD_HEIGHT / 2 + 20;
  
  // Mathematical formula for perfect binary tree
  const initialRootY = ((Math.pow(2, maxDepth - 1) - 1) / 2) * ROW_HEIGHT;
  const initialSpread = Math.pow(2, maxDepth - 2) * ROW_HEIGHT / 2; // Fixed spread math
  
  let currentRootY = initialRootY + offsetY;
  let maxY = 0;

  function dfs(nodeId: string, yCenter: number, ySpread: number) {
    const node = byId.get(nodeId);
    if (!node) return;
    
    node.y = yCenter;
    if (yCenter > maxY) maxY = yCenter;

    const feeders = sideMatches.filter(m => m.feeds_into_matchup_id === nodeId);
    
    if (feeders.length === 2) {
      // Sort by slot to ensure top/bottom is consistent if teams are missing
      feeders.sort((a, b) => a.slot - b.slot);
      
      // Determine which is top and bottom
      let f0IsTop = true;
      if (node.team_b && (node.team_b.id === feeders[0].winner_id || node.team_b.id === feeders[0].team_a?.id || node.team_b.id === feeders[0].team_b?.id)) {
        f0IsTop = false;
      } else if (node.team_a && (node.team_a.id === feeders[1].winner_id || node.team_a.id === feeders[1].team_a?.id || node.team_a.id === feeders[1].team_b?.id)) {
        f0IsTop = false;
      }

      if (f0IsTop) {
        dfs(feeders[0].id, yCenter - ySpread, ySpread / 2);
        dfs(feeders[1].id, yCenter + ySpread, ySpread / 2);
      } else {
        dfs(feeders[0].id, yCenter + ySpread, ySpread / 2);
        dfs(feeders[1].id, yCenter - ySpread, ySpread / 2);
      }
    } else if (feeders.length === 1) {
      const feeder = feeders[0];
      let isTop = true;
      if (node.team_b && (node.team_b.id === feeder.winner_id || node.team_b.id === feeder.team_a?.id || node.team_b.id === feeder.team_b?.id)) {
        isTop = false;
      }
      
      if (side === 'LOSERS') {
        // Minor round in LB keeps the same Y
        dfs(feeder.id, yCenter, ySpread);
      } else {
        if (isTop) dfs(feeder.id, yCenter - ySpread, ySpread / 2);
        else dfs(feeder.id, yCenter + ySpread, ySpread / 2);
      }
    }
  }

  roots.forEach(root => {
    dfs(root.id, currentRootY, initialSpread);
    currentRootY += (initialRootY * 2) + ROW_HEIGHT;
  });

  const height = maxY + ROW_HEIGHT;
  const width = columns * COL_WIDTH;
  
  return { height, width, columns };
}

// ─── Connectors SVG ─────────────────────────────────────────────────────────

function ConnectorsLayer({ matchups, side }: { matchups: Matchup[], side: string }) {
  const sideMatches = matchups.filter(m => m.bracket_side === side);
  
  return (
    <svg className="absolute inset-0 pointer-events-none" style={{ minWidth: '100%', minHeight: '100%', overflow: 'visible', zIndex: 0 }}>
      {sideMatches.map(m => {
        if (!m.feeds_into_matchup_id) return null;
        const target = matchups.find(t => t.id === m.feeds_into_matchup_id);
        if (!target || target.bracket_side !== side) return null;
        if (m.y === undefined || m.col === undefined || target.y === undefined || target.col === undefined) return null;

        const startX = m.col * COL_WIDTH + CARD_WIDTH + 24; // right edge of card (card is ml-6=24px shifted)
        const startY = m.y;
        const endX = target.col * COL_WIDTH + 24; // left edge of target card
        const endY = target.y;

        // Draw a path: right -> vertical -> right
        const midX = startX + (endX - startX) / 2;
        
        return (
          <path
            key={`conn-${m.id}`}
            d={`M ${startX} ${startY} L ${midX} ${startY} L ${midX} ${endY} L ${endX} ${endY}`}
            fill="none"
            stroke="#333333"
            strokeWidth="2"
            strokeLinecap="square"
            strokeLinejoin="miter"
          />
        );
      })}
    </svg>
  );
}

// ─── Render Bracket Area ────────────────────────────────────────────────────

function AbsoluteBracketArea({ 
  title, 
  matchups, 
  side,
  getRoundLabel,
  onClick,
  defaultMatchFormat
}: { 
  title: string, 
  matchups: Matchup[], 
  side: string,
  getRoundLabel: (round: number, rounds: number[]) => string,
  onClick?: (m: Matchup) => void,
  defaultMatchFormat?: string
}) {
  const layout = useMemo(() => computeTreeLayout(matchups, side), [matchups, side]);
  const sideMatches = matchups.filter(m => m.bracket_side === side);
  
  if (sideMatches.length === 0) return null;

  const rounds = [...new Set(sideMatches.map(m => m.round))].sort((a, b) => a - b);

  return (
    <div className="mb-12">
      <h3 className="text-lg font-display text-[#b8860b] tracking-[0.2em] mb-6 uppercase border-b border-surface-700 pb-2">
        {title}
      </h3>
      
      <div className="overflow-x-auto pb-8 relative">
        <div style={{ width: layout.width, height: layout.height + 40, position: 'relative' }}>
          
          {/* Round Headers */}
          <div className="absolute top-0 left-0 w-full flex h-8">
            {rounds.map((r, idx) => (
              <div 
                key={`header-${r}`} 
                style={{ position: 'absolute', left: idx * COL_WIDTH, width: CARD_WIDTH + 24, textAlign: 'center' }}
                className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-silver-500"
              >
                {getRoundLabel(r, rounds)}
              </div>
            ))}
          </div>

          {/* Connectors */}
          <div className="absolute left-0 top-10" style={{ width: layout.width, height: layout.height }}>
            <ConnectorsLayer matchups={matchups} side={side} />
            
            {/* Matches */}
            {sideMatches.map(m => (
              <div 
                key={m.id} 
                style={{ 
                  position: 'absolute', 
                  left: (m.col || 0) * COL_WIDTH, 
                  top: (m.y || 0) - (CARD_HEIGHT / 2), 
                  width: CARD_WIDTH,
                  height: CARD_HEIGHT,
                  zIndex: 10
                }}
              >
                <MatchCard
                  matchup={m}
                  matchNumber={m.matchNumber!}
                  onClick={onClick}
                  defaultMatchFormat={defaultMatchFormat}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main BracketTree ─────────────────────────────────────────────────────────

export default function BracketTree({
  matchups,
  defaultMatchFormat,
  onMatchupClick,
}: {
  matchups: Matchup[];
  defaultMatchFormat?: string;
  onMatchupClick?: (matchup: Matchup) => void;
}) {
  // Sort and assign global match numbers
  const sortedMatchups = [...matchups].sort((a, b) => {
    const sideOrder = { WINNERS: 0, PLAY_IN: 0, LOSERS: 1, GRAND_FINAL: 2, ROUND_ROBIN: 3, SWISS: 3 };
    const sA = sideOrder[a.bracket_side] ?? 3;
    const sB = sideOrder[b.bracket_side] ?? 3;
    if (sA !== sB) return sA - sB;
    if (a.round !== b.round) return a.round - b.round;
    return a.slot - b.slot;
  });

  let matchCounter = 0;
  sortedMatchups.forEach((m) => {
    if (!m.is_bye) m.matchNumber = ++matchCounter;
  });

  const visibleMatchups = sortedMatchups;

  const getUpperLabel = (round: number, allRounds: number[]) => {
    const maxRound = allRounds[allRounds.length - 1];
    if (round === maxRound) return 'UB FINAL';
    if (round === maxRound - 1) return 'SEMIFINALS';
    if (round === maxRound - 2) return 'QUARTERFINALS';
    return `ROUND ${allRounds.indexOf(round) + 1}`;
  };

  const getLowerLabel = (round: number, allRounds: number[]) => {
    const roundIdx = allRounds.indexOf(round);
    const isLast = roundIdx === allRounds.length - 1;
    if (isLast) return 'LOWER FINAL';
    return `LB ROUND ${roundIdx + 1}`;
  };

  // Grand final logic
  const grandFinalMatchups = visibleMatchups.filter(m => m.bracket_side === 'GRAND_FINAL');
  const gf1 = grandFinalMatchups.find(m => m.round === 1);
  const gf2 = grandFinalMatchups.find(m => m.round === 2);

  return (
    <div className="bracket-container">
      <AbsoluteBracketArea 
        title="UPPER BRACKET" 
        matchups={visibleMatchups} 
        side="WINNERS" 
        getRoundLabel={getUpperLabel} 
        onClick={onMatchupClick} 
        defaultMatchFormat={defaultMatchFormat} 
      />
      
      <AbsoluteBracketArea 
        title="LOWER BRACKET" 
        matchups={visibleMatchups} 
        side="LOSERS" 
        getRoundLabel={getLowerLabel} 
        onClick={onMatchupClick} 
        defaultMatchFormat={defaultMatchFormat} 
      />

      {grandFinalMatchups.length > 0 && (
        <div className="mb-12">
          <h3 className="text-lg font-display text-[#b8860b] tracking-[0.2em] mb-6 uppercase border-b border-surface-700 pb-2">
            GRAND FINAL
          </h3>
          <div className="flex items-start gap-12 overflow-x-auto pb-8 pl-2">
            {gf1 && (
              <div style={{ width: CARD_WIDTH + 24 }}>
                <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-silver-500 mb-4 text-center">GRAND FINAL</p>
                <div style={{ height: CARD_HEIGHT }}>
                  <MatchCard matchup={gf1} matchNumber={gf1.matchNumber!} onClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />
                </div>
                {gf1.status === 'COMPLETED' && gf1.winner_id && (
                  <div className="mt-5 text-center bg-surface-900 border border-gold/30 rounded-lg p-3 shadow-[0_0_20px_rgba(184,134,11,0.1)]">
                    <p className="text-[10px] font-mono text-gold uppercase tracking-widest mb-1">🏆 CHAMPION</p>
                    <p className="text-base font-display text-emerald-400 font-bold tracking-widest uppercase">
                      {gf1.team_a?.id === gf1.winner_id ? gf1.team_a?.name : gf1.team_b?.name}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            <div style={{ width: CARD_WIDTH + 24 }}>
              <p className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-silver-500 mb-4 text-center">RESET FINAL</p>
              {gf2 ? (
                <div style={{ height: CARD_HEIGHT }}>
                  <MatchCard matchup={gf2} matchNumber={gf2.matchNumber!} onClick={onMatchupClick} defaultMatchFormat={defaultMatchFormat} />
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-surface-600 bg-surface-950/50 p-6 flex flex-col items-center justify-center text-center" style={{ height: CARD_HEIGHT }}>
                  <p className="text-[10px] font-mono text-silver-500 uppercase tracking-widest">NOT NEEDED</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
