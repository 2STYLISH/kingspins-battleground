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
  schedule?: { games?: { id: string }[] };
};

// Removed hardcoded ROUND_LABELS as they are now dynamic

export default function BracketTree({ 
  matchups,
  onMatchupClick
}: { 
  matchups: Matchup[];
  onMatchupClick?: (matchup: Matchup) => void;
}) {
  // Sort and assign global match numbers
  const sortedMatchups = [...matchups].sort((a, b) => {
    const getOrder = (side?: string) => {
      if (side === 'PLAY_IN') return 0;
      if (side === 'WINNERS' || !side) return 1;
      if (side === 'LOSERS') return 2;
      return 3;
    };
    const orderA = getOrder(a.bracket_side);
    const orderB = getOrder(b.bracket_side);
    if (orderA !== orderB) return orderA - orderB;
    if (a.round !== b.round) return a.round - b.round;
    return a.slot - b.slot;
  });

  sortedMatchups.forEach((m, idx) => {
    m.matchNumber = idx + 1;
  });

  // Calculate sources for TBD slots
  sortedMatchups.forEach((m) => {
    const upstreams = sortedMatchups.filter(
      up => up.feeds_into_matchup_id === m.id || up.loser_feeds_into_matchup_id === m.id
    ).sort((a, b) => (a.matchNumber || 0) - (b.matchNumber || 0));

    if (upstreams.length > 0) {
      const emptySlots = (!m.team_a ? 1 : 0) + (!m.team_b ? 1 : 0);
      
      if (emptySlots === 2 && upstreams.length === 1) {
        // One manual seed, one feed. Default to feed being team_b (the lower seed).
        m.sourceB = upstreams[0].loser_feeds_into_matchup_id === m.id ? `Loser of ${upstreams[0].matchNumber}` : `Winner of ${upstreams[0].matchNumber}`;
      } else {
        let uIdx = 0;
        if (!m.team_a && uIdx < upstreams.length) {
          const u = upstreams[uIdx++];
          m.sourceA = u.loser_feeds_into_matchup_id === m.id ? `Loser of ${u.matchNumber}` : `Winner of ${u.matchNumber}`;
        }
        if (!m.team_b && uIdx < upstreams.length) {
          const u = upstreams[uIdx++];
          m.sourceB = u.loser_feeds_into_matchup_id === m.id ? `Loser of ${u.matchNumber}` : `Winner of ${u.matchNumber}`;
        }
      }
    }
  });

  const visibleMatchups = sortedMatchups.filter(m => !m.is_bye);
  const winners = visibleMatchups.filter((m) => m.bracket_side !== 'LOSERS' && m.bracket_side !== 'GRAND_FINAL' && m.bracket_side !== 'PLAY_IN');
  const losers = visibleMatchups.filter((m) => m.bracket_side === 'LOSERS');
  const grandFinal = visibleMatchups.filter((m) => m.bracket_side === 'GRAND_FINAL');
  const playIns = visibleMatchups.filter((m) => m.bracket_side === 'PLAY_IN');

  return (
    <div className="space-y-12">
      {playIns.length > 0 && <BracketSection title="PLAY-IN STAGE" matchups={playIns} onMatchupClick={onMatchupClick} />}
      <BracketSection title="PLAYOFF BRACKET" matchups={winners} onMatchupClick={onMatchupClick} />
      {losers.length > 0 && <BracketSection title="LOWER BRACKET" matchups={losers} onMatchupClick={onMatchupClick} />}
      {grandFinal.length > 0 && <BracketSection title="GRAND FINAL" matchups={grandFinal} onMatchupClick={onMatchupClick} />}
    </div>
  );
}

function BracketSection({ title, matchups, onMatchupClick }: { title: string; matchups: Matchup[]; onMatchupClick?: (matchup: Matchup) => void }) {
  const rounds = [...new Set(matchups.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <div>
      <h3 className="text-xl font-display text-[#b8860b] tracking-[0.2em] mb-4">{title}</h3>
      <div className="flex gap-6 overflow-x-auto pb-4 pl-6">
        {rounds.map((round) => {
          let label = `ROUND ${round}`;
          if (title === 'GRAND FINAL') {
            label = round === 1 ? 'MATCH 1' : 'MATCH 2';
          } else if (title !== 'PLAY-IN STAGE') {
            const maxRound = rounds[rounds.length - 1];
            if (round === maxRound) label = 'FINALS';
            else if (round === maxRound - 1) label = 'SEMIFINALS';
            else if (round === maxRound - 2) label = 'QUARTERFINALS';
          }

          return (
            <div key={round} className="flex flex-col justify-around gap-6 min-w-[220px]">
              <p className="text-xs font-mono text-white uppercase tracking-widest mb-2 font-semibold">
                {label}
              </p>
            {matchups
              .filter((m) => m.round === round)
              .sort((a, b) => a.slot - b.slot)
              .map((m) => (
                <MatchCard key={m.id} matchup={m} onClick={onMatchupClick} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MatchCard({ matchup, onClick }: { matchup: Matchup; onClick?: (m: Matchup) => void }) {
  const isComplete = matchup.status === 'COMPLETED';
  const gameId = matchup.schedule?.games?.[0]?.id;
  const href = isComplete && gameId ? `/games/${gameId}` : `/bracket/${matchup.id}`;

  const innerContent = (
    <>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.02),transparent_70%)] pointer-events-none"></div>
      <TeamRow name={matchup.team_a?.name} isWinner={isComplete && matchup.winner_id === matchup.team_a?.id} isByePlaceholder={matchup.is_bye && !matchup.team_a} placeholderText={matchup.sourceA} />
      <div className="border-t border-surface-700/50 my-2 relative z-10" />
      <TeamRow name={matchup.team_b?.name} isWinner={isComplete && matchup.winner_id === matchup.team_b?.id} isByePlaceholder={matchup.is_bye && !matchup.team_b} placeholderText={matchup.sourceB} />
      <p className={`text-[9px] font-mono font-bold uppercase tracking-widest mt-3 relative z-10 ${
        matchup.is_bye ? 'text-silver-500' : isComplete ? 'text-emerald-500' : matchup.status === 'SCHEDULED' ? 'text-silver-400' : matchup.team_a && matchup.team_b ? 'text-gold' : 'text-silver-600'
      }`}>
        {matchup.is_bye ? 'BYE' : isComplete ? 'FINAL' : matchup.status === 'SCHEDULED' ? 'SCHEDULED' : matchup.team_a && matchup.team_b ? 'VS' : 'TBD'}
      </p>
    </>
  );

  return (
    <div className="relative group/bracketcard">
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-[10px] font-mono text-silver-500 font-bold drop-shadow-sm group-hover/bracketcard:text-gold transition-colors">{matchup.matchNumber}</div>
      {onClick ? (
        <button onClick={() => onClick(matchup)} className="w-full text-left relative border border-surface-600 bg-surface-950/80 backdrop-blur-md p-4 block hover:border-gold/50 hover:shadow-[0_0_20px_rgba(255,215,0,0.15)] transition-all rounded-xl shadow-2xl cursor-pointer overflow-hidden">
          {innerContent}
        </button>
      ) : (
        <a href={href} className="w-full text-left relative border border-surface-600 bg-surface-950/80 backdrop-blur-md p-4 block hover:border-emerald-500/50 hover:shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-all rounded-xl shadow-2xl overflow-hidden">
          {innerContent}
        </a>
      )}
    </div>
  );
}

function TeamRow({ name, isWinner, isByePlaceholder, placeholderText }: { name?: string; isWinner: boolean; isByePlaceholder?: boolean; placeholderText?: string }) {
  if (isByePlaceholder) {
    return <p className="text-sm font-display tracking-widest text-silver-500 italic uppercase">BYE</p>;
  }
  return (
    <p className={`text-sm font-display tracking-widest uppercase truncate relative z-10 ${isWinner ? 'text-emerald-400 font-bold drop-shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'text-white'} ${!name ? 'text-silver-500 italic text-[12px]' : ''}`}>
      {name ?? placeholderText ?? 'TBD'}
    </p>
  );
}
