import { SupabaseClient } from '@supabase/supabase-js';

type DB = any;

export async function collapseGhostNodes(supabase: SupabaseClient<DB>, tournamentId: string) {
  const { data: matches } = await supabase.from('bracket_matchups').select('*').eq('tournament_id', tournamentId);
  if (!matches || matches.length === 0) return;

  // We will build an in-memory graph
  const nodes = new Map<string, any>();
  for (const m of matches) {
    nodes.set(m.id, { ...m, deleted: false, new_feeds_into: m.feeds_into_matchup_id, new_loser_feeds: m.loser_feeds_into_matchup_id });
  }

  // To find real incoming edges, we track which node ID produces a REAL team.
  // A node produces a REAL WINNER if it has at least 1 real team, or if its upstream produces a real winner.
  // A node produces a REAL LOSER if it has at least 2 real teams (meaning a real team actually loses). If it has 1 real team (a BYE), the loser is a GHOST.

  let changed = true;
  while (changed) {
    changed = false;

    for (const node of Array.from(nodes.values())) {
      if (node.deleted) continue;

      // Count real teams currently in this node
      let realTeamCount = (node.team_a_id ? 1 : 0) + (node.team_b_id ? 1 : 0);
      
      // Find all NON-DELETED nodes that feed into this node
      const incomingWinners = Array.from(nodes.values()).filter(n => !n.deleted && n.new_feeds_into === node.id);
      const incomingLosers = Array.from(nodes.values()).filter(n => !n.deleted && n.new_loser_feeds === node.id);

      // A node produces a real winner if it has at least 1 real team OR any real incoming edges
      const hasRealWinner = (n: any): boolean => {
        if (n.team_a_id || n.team_b_id) return true;
        const inW = Array.from(nodes.values()).filter(x => !x.deleted && x.new_feeds_into === n.id);
        const inL = Array.from(nodes.values()).filter(x => !x.deleted && x.new_loser_feeds === n.id);
        return inW.some(hasRealWinner) || inL.some(hasRealWinner);
      };

      // A node produces a real loser ONLY if it is a real match (both sides are real)
      const hasRealLoser = (n: any): boolean => {
        // If it's R1, it must have 2 real teams.
        // If it's downstream, it must have 2 real incoming paths.
        let paths = (n.team_a_id ? 1 : 0) + (n.team_b_id ? 1 : 0);
        const inW = Array.from(nodes.values()).filter(x => !x.deleted && x.new_feeds_into === n.id);
        const inL = Array.from(nodes.values()).filter(x => !x.deleted && x.new_loser_feeds === n.id);
        
        for (const w of inW) if (hasRealWinner(w)) paths++;
        for (const l of inL) if (hasRealWinner(l)) paths++; // A real winner from a loser bracket match entering this node
        
        return paths >= 2;
      };

      let realIncomingPaths = realTeamCount;
      for (const w of incomingWinners) if (hasRealWinner(w)) realIncomingPaths++;
      for (const l of incomingLosers) if (hasRealLoser(l)) realIncomingPaths++;

      if (realIncomingPaths === 0) {
        // Pure Ghost. Delete it.
        node.deleted = true;
        changed = true;
        const targetOutput = node.new_feeds_into;
        for (const w of incomingWinners) {
          w.new_feeds_into = targetOutput;
        }
        for (const l of incomingLosers) {
          l.new_loser_feeds = targetOutput;
        }
      } else if (realIncomingPaths === 1 && node.bracket_side === 'LOSERS') {
        // It's a BYE in the Losers Bracket. We can safely prune it to make the bracket compact.
        // We route its incoming real path directly to its output.
        node.deleted = true;
        changed = true;

        // Route incoming to node's output
        const targetOutput = node.new_feeds_into;
        
        // Find the single real incoming path and repoint it
        if (node.team_a_id || node.team_b_id) {
          // If the real path is a team sitting in this node, we just move the team to the target output!
          if (targetOutput) {
            const target = nodes.get(targetOutput);
            if (target) {
              if (!target.team_a_id) target.team_a_id = node.team_a_id || node.team_b_id;
              else target.team_b_id = node.team_a_id || node.team_b_id;
            }
          }
        }

        for (const w of incomingWinners) {
          w.new_feeds_into = targetOutput;
        }
        for (const l of incomingLosers) {
          l.new_loser_feeds = targetOutput;
        }
      }
    }
  }

  // Apply to DB
  for (const node of Array.from(nodes.values())) {
    if (node.deleted) {
      await supabase.from('bracket_matchups').delete().eq('id', node.id);
    } else {
      await supabase.from('bracket_matchups').update({
        feeds_into_matchup_id: node.new_feeds_into,
        loser_feeds_into_matchup_id: node.new_loser_feeds,
        team_a_id: node.team_a_id,
        team_b_id: node.team_b_id
      }).eq('id', node.id);
    }
  }
}
