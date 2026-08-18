export type Team = { id: string; name: string } | null;
export type Matchup = {
  id: string;
  round: number;
  slot: number;
  status: string;
  winner_id: string | null;
  bracket_side: 'WINNERS' | 'LOSERS' | 'GRAND_FINAL';
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

const ROUND_LABELS: Record<number, string> = {
  1: 'ROUND 1',
  2: 'QUARTERFINALS',
  3: 'SEMIFINALS',
  4: 'FINALS',
};

export default function BracketTree({ matchups }: { matchups: Matchup[] }) {
  // Sort and assign global match numbers
  const sortedMatchups = [...matchups].sort((a, b) => {
    const orderA = a.bracket_side === 'WINNERS' || !a.bracket_side ? 1 : a.bracket_side === 'LOSERS' ? 2 : 3;
    const orderB = b.bracket_side === 'WINNERS' || !b.bracket_side ? 1 : b.bracket_side === 'LOSERS' ? 2 : 3;
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
      if (!m.team_a) {
        const u = upstreams[0];
        m.sourceA = u.loser_feeds_into_matchup_id === m.id ? `Loser of ${u.matchNumber}` : `Winner of ${u.matchNumber}`;
      }
      if (!m.team_b) {
        const u = upstreams.length > 1 ? upstreams[1] : upstreams[0];
        m.sourceB = u.loser_feeds_into_matchup_id === m.id ? `Loser of ${u.matchNumber}` : `Winner of ${u.matchNumber}`;
      }
    }
  });

  const visibleMatchups = sortedMatchups.filter(m => !m.is_bye);
  const winners = visibleMatchups.filter((m) => m.bracket_side === 'WINNERS' || !m.bracket_side);
  const losers = visibleMatchups.filter((m) => m.bracket_side === 'LOSERS');
  const grandFinal = visibleMatchups.filter((m) => m.bracket_side === 'GRAND_FINAL');

  return (
    <div className="space-y-12">
      <BracketSection title="UPPER BRACKET" matchups={winners} />
      {losers.length > 0 && <BracketSection title="LOWER BRACKET" matchups={losers} />}
      {grandFinal.length > 0 && <BracketSection title="GRAND FINAL" matchups={grandFinal} />}
    </div>
  );
}

function BracketSection({ title, matchups }: { title: string; matchups: Matchup[] }) {
  const rounds = [...new Set(matchups.map((m) => m.round))].sort((a, b) => a - b);
  
  return (
    <div>
      <h3 className="text-xl font-display text-gold tracking-[0.2em] mb-4">{title}</h3>
      <div className="flex gap-6 overflow-x-auto pb-4 pl-6">
        {rounds.map((round) => (
          <div key={round} className="flex flex-col justify-around gap-6 min-w-[220px]">
            <p className="text-xs font-mono text-silver-400 uppercase tracking-widest mb-2">
              {ROUND_LABELS[round] ?? `ROUND ${round}`}
            </p>
            {matchups
              .filter((m) => m.round === round)
              .sort((a, b) => a.slot - b.slot)
              .map((m) => (
                <MatchCard key={m.id} matchup={m} />
              ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchCard({ matchup }: { matchup: Matchup }) {
  const isComplete = matchup.status === 'COMPLETED';
  const gameId = matchup.schedule?.games?.[0]?.id;
  const href = isComplete && gameId ? `/games/${gameId}` : `/bracket/${matchup.id}`;

  return (
    <div className="relative">
      <div className="absolute -left-6 top-1/2 -translate-y-1/2 text-[10px] font-mono text-mute">{matchup.matchNumber}</div>
      <a href={href} className="card p-3 block hover:border-gold/60 transition-colors">
        <TeamRow name={matchup.team_a?.name} isWinner={isComplete && matchup.winner_id === matchup.team_a?.id} isByePlaceholder={matchup.is_bye && !matchup.team_a} placeholderText={matchup.sourceA} />
        <div className="hairline border-t my-1" />
        <TeamRow name={matchup.team_b?.name} isWinner={isComplete && matchup.winner_id === matchup.team_b?.id} isByePlaceholder={matchup.is_bye && !matchup.team_b} placeholderText={matchup.sourceB} />
        <p className="text-[10px] font-mono uppercase text-mute mt-2">
          {matchup.is_bye ? 'BYE' : isComplete ? 'FINAL' : matchup.status === 'SCHEDULED' ? 'SCHEDULED' : matchup.team_a && matchup.team_b ? 'VS' : 'TBD'}
        </p>
      </a>
    </div>
  );
}

function TeamRow({ name, isWinner, isByePlaceholder, placeholderText }: { name?: string; isWinner: boolean; isByePlaceholder?: boolean; placeholderText?: string }) {
  if (isByePlaceholder) {
    return <p className="text-sm text-mute italic">BYE</p>;
  }
  return (
    <p className={`text-sm truncate ${isWinner ? 'text-gold font-semibold' : 'text-bone'} ${!name ? 'text-mute/50 italic text-[13px]' : ''}`}>
      {name ?? placeholderText ?? 'TBD'}
    </p>
  );
}
