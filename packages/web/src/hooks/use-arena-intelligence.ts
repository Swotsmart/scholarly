'use client';

import { useMemo } from 'react';
import type {
  ArenaInsight, ArenaRecommendation, PerformanceTrend, NextAction,
  ArenaIntelligence, ArenaCompetition, TokenBalance, ArenaTeam,
  ArenaProposal, ContentBounty, UserCompetitionStats,
} from '@/types/arena';

// =============================================================================
// TYPES
// =============================================================================

export type ArenaContext = 'hub' | 'competitions' | 'teams' | 'tokens' | 'bounties' | 'governance' | 'community';

export interface ArenaIntelligenceParams {
  context?: ArenaContext;
  competitions?: ArenaCompetition[];
  tokenBalance?: TokenBalance | null;
  teams?: ArenaTeam[];
  proposals?: ArenaProposal[];
  bounties?: ContentBounty[];
  userStats?: UserCompetitionStats | null;
}

// =============================================================================
// HELPERS
// =============================================================================

const DAY_MS = 24 * 60 * 60 * 1000;
const fmt = (s: string) => s.replace(/_/g, ' ').toLowerCase();
const plural = (n: number, word: string) => `${n} ${word}${n !== 1 ? 's' : ''}`;
const withinMs = (iso: string | undefined, ms: number) => {
  if (!iso) return false;
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < ms;
};

// =============================================================================
// INSIGHT GENERATORS
// =============================================================================

function hubInsights(comps: ArenaCompetition[], bal: TokenBalance | null, teams: ArenaTeam[], props: ArenaProposal[]): ArenaInsight[] {
  const insights: ArenaInsight[] = [];
  const active = comps.filter((c) => c.status === 'IN_PROGRESS' || c.status === 'REGISTRATION_OPEN');
  const ending = active.filter((c) => withinMs(c.scheduledAt, DAY_MS));
  insights.push({
    id: 'active-competitions', icon: 'Swords', label: 'Active Competitions', value: active.length,
    urgency: ending.length > 0 ? 'high' : active.length > 0 ? 'medium' : 'low', href: '/arena/competitions',
    description: ending.length > 0 ? `${ending.length} ending within 24 hours` : `${active.length} competitions running now`,
  });
  if (bal) {
    insights.push({
      id: 'token-balance', icon: 'Coins', label: 'Token Balance', value: (bal.sparks + bal.gems + bal.voice).toLocaleString(),
      urgency: 'low', href: '/arena/tokens', description: `${bal.sparks} Sparks, ${bal.gems} Gems, ${bal.voice} Voice`,
    });
  }
  const best = teams.reduce<ArenaTeam | null>((b, t) => (!b || t.streak > b.streak ? t : b), null);
  if (best && best.streak > 0) {
    insights.push({
      id: 'team-streak', icon: 'Flame', label: 'Best Team Streak', value: `${best.streak}-win`,
      urgency: best.streak >= 5 ? 'high' : 'medium', href: `/arena/teams/${best.id}`,
      description: `${best.name} is on a ${best.streak}-win streak`,
    });
  }
  const ap = props.filter((p) => p.status === 'ACTIVE');
  if (ap.length > 0) {
    insights.push({
      id: 'proposals-pending', icon: 'Vote', label: 'Proposals to Vote', value: ap.length,
      urgency: ap.length >= 3 ? 'high' : 'medium', href: '/arena/governance',
      description: `${plural(ap.length, 'active proposal')} need your vote`,
    });
  }
  return insights;
}

function competitionInsights(_comps: ArenaCompetition[], stats: UserCompetitionStats | null): ArenaInsight[] {
  if (!stats) return [];
  const wr = stats.totalCompetitions > 0 ? Math.round((stats.wins / stats.totalCompetitions) * 100) : 0;
  const insights: ArenaInsight[] = [
    { id: 'win-rate', icon: 'Trophy', label: 'Win Rate', value: `${wr}%`,
      urgency: wr >= 60 ? 'low' : wr >= 40 ? 'medium' : 'high', href: '/arena/competitions',
      description: `${stats.wins} wins out of ${stats.totalCompetitions} competitions` },
  ];
  if (stats.bestFormat) {
    insights.push({
      id: 'best-format', icon: 'Star', label: 'Best Format', value: fmt(stats.bestFormat),
      urgency: 'low', href: '/arena/competitions',
      description: `You perform best in ${fmt(stats.bestFormat)} competitions`,
    });
  }
  insights.push({
    id: 'active-count', icon: 'Zap', label: 'Active Now', value: stats.activeCompetitions,
    urgency: stats.activeCompetitions > 0 ? 'medium' : 'low', href: '/arena/competitions',
    description: stats.activeCompetitions > 0 ? `You are competing in ${stats.activeCompetitions} right now` : 'No active competitions — join one!',
  });
  return insights;
}

function tokenInsights(bal: TokenBalance | null): ArenaInsight[] {
  if (!bal) return [];
  const insights: ArenaInsight[] = [];
  const staked = bal.stakedSparks + bal.stakedGems + bal.stakedVoice;
  if (bal.sparks > 500 && staked === 0) {
    insights.push({
      id: 'idle-tokens', icon: 'PiggyBank', label: 'Idle Tokens', value: `${bal.sparks} Sparks`,
      urgency: 'medium', href: '/arena/tokens', description: 'You have Sparks sitting idle — consider staking them for yield',
    });
  }
  const life = bal.lifetimeSparksEarned + bal.lifetimeGemsEarned + bal.lifetimeVoiceEarned;
  insights.push({
    id: 'lifetime-earnings', icon: 'TrendingUp', label: 'Lifetime Earnings', value: life.toLocaleString(),
    urgency: 'low', href: '/arena/tokens',
    description: `${bal.lifetimeSparksEarned} Sparks, ${bal.lifetimeGemsEarned} Gems, ${bal.lifetimeVoiceEarned} Voice earned all-time`,
  });
  return insights;
}

function governanceInsights(props: ArenaProposal[]): ArenaInsight[] {
  const active = props.filter((p) => p.status === 'ACTIVE');
  if (active.length === 0) return [];
  const expiring = active.filter((p) => withinMs(p.votingEndsAt, DAY_MS));
  return [{
    id: 'governance-active', icon: 'Scale', label: 'Active Proposals', value: active.length,
    urgency: expiring.length > 0 ? 'critical' : 'high', href: '/arena/governance',
    description: expiring.length > 0
      ? `${plural(expiring.length, 'proposal')} expiring within 24 hours!`
      : `${plural(active.length, 'proposal')} awaiting your vote`,
  }];
}

function bountyInsights(bounties: ContentBounty[]): ArenaInsight[] {
  const insights: ArenaInsight[] = [];
  const open = bounties.filter((b) => b.status === 'ACCEPTING' || b.status === 'PUBLISHED');
  if (open.length > 0) {
    insights.push({
      id: 'open-bounties', icon: 'ScrollText', label: 'Open Bounties', value: open.length,
      urgency: 'medium', href: '/arena/bounties', description: `${open.length} bounties accepting submissions`,
    });
  }
  const closing = bounties.filter((b) => b.status === 'ACCEPTING' && withinMs(b.submissionDeadline, 2 * DAY_MS));
  if (closing.length > 0) {
    insights.push({
      id: 'bounty-deadline', icon: 'Clock', label: 'Closing Soon', value: closing.length,
      urgency: 'high', href: '/arena/bounties',
      description: `${closing.length} bount${closing.length !== 1 ? 'ies' : 'y'} closing within 48 hours`,
    });
  }
  return insights;
}

// =============================================================================
// RECOMMENDATIONS
// =============================================================================

function buildRecommendations(
  comps: ArenaCompetition[], bal: TokenBalance | null, teams: ArenaTeam[],
  props: ArenaProposal[], bounties: ContentBounty[], stats: UserCompetitionStats | null,
): ArenaRecommendation[] {
  const recs: ArenaRecommendation[] = [];
  const open = comps.filter((c) => c.status === 'REGISTRATION_OPEN');

  // Competition matching
  if (stats?.bestFormat && open.length > 0) {
    const match = open.find((c) => c.format === stats.bestFormat);
    if (match) {
      recs.push({ type: 'competition', title: `Join "${match.title}"`, confidence: 85,
        reason: `This ${fmt(match.format)} matches your best format`,
        action: { label: 'View Competition', href: `/arena/competitions/${match.id}` } });
    }
  } else if (open.length > 0) {
    recs.push({ type: 'competition', title: 'Enter a competition', confidence: 70,
      reason: `${plural(open.length, 'competition')} open for registration`,
      action: { label: 'Browse Competitions', href: '/arena/competitions' } });
  }

  // Token advisor
  if (bal && bal.sparks > 500 && bal.stakedSparks + bal.stakedGems + bal.stakedVoice === 0) {
    recs.push({ type: 'token', title: 'Stake your idle Sparks', confidence: 75,
      reason: `You have ${bal.sparks} Sparks that could be earning yield in a staking pool`,
      action: { label: 'Explore Staking', href: '/arena/tokens' } });
  }

  // Team suggestion
  if (teams.length === 0) {
    recs.push({ type: 'team', title: 'Join a team', confidence: 65,
      reason: 'Team competitions offer bonus rewards and a collaborative learning experience',
      action: { label: 'Find Teams', href: '/arena/teams' } });
  }

  // Governance nudge
  const active = props.filter((p) => p.status === 'ACTIVE');
  if (active.length > 0) {
    recs.push({ type: 'governance', title: 'Vote on community proposals', confidence: 80,
      reason: `${plural(active.length, 'active proposal')} need community input`,
      action: { label: 'View Proposals', href: '/arena/governance' } });
  }

  // Bounty matching
  const accepting = bounties.filter((b) => b.status === 'ACCEPTING');
  if (accepting.length > 0) {
    recs.push({ type: 'bounty', title: 'Submit to a content bounty', confidence: 60,
      reason: `${accepting.length} bount${accepting.length !== 1 ? 'ies' : 'y'} accepting submissions with token rewards`,
      action: { label: 'Browse Bounties', href: '/arena/bounties' } });
  }

  return recs;
}

// =============================================================================
// PERFORMANCE TREND & NEXT ACTION
// =============================================================================

function computeTrend(stats: UserCompetitionStats | null): PerformanceTrend {
  if (!stats) return { direction: 'stable', metric: 'avgScore', change: 0, period: 'all-time' };
  const change = Math.round((stats.avgScore - 50) * 10) / 10;
  const direction = stats.avgScore > 55 ? 'improving' : stats.avgScore < 45 ? 'declining' : 'stable';
  return { direction, metric: 'avgScore', change, period: 'all-time' };
}

function computeNextAction(comps: ArenaCompetition[], bal: TokenBalance | null, props: ArenaProposal[]): NextAction {
  if (props.some((p) => p.status === 'ACTIVE' && withinMs(p.votingEndsAt, DAY_MS)))
    return { label: 'Vote on proposals', href: '/arena/governance', icon: 'Scale', urgency: 'critical' };
  if (comps.some((c) => c.status === 'REGISTRATION_OPEN'))
    return { label: 'Join a competition', href: '/arena/competitions', icon: 'Swords', urgency: 'high' };
  if (bal && bal.sparks > 500 && bal.stakedSparks + bal.stakedGems + bal.stakedVoice === 0)
    return { label: 'Stake your tokens', href: '/arena/tokens', icon: 'PiggyBank', urgency: 'medium' };
  return { label: 'Explore the Arena', href: '/arena', icon: 'Compass', urgency: 'low' };
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useArenaIntelligence(params: ArenaIntelligenceParams = {}): ArenaIntelligence {
  const {
    context = 'hub', competitions = [], tokenBalance = null,
    teams = [], proposals = [], bounties = [], userStats = null,
  } = params;

  return useMemo(() => {
    const hour = new Date().getHours();
    const greeting = hour < 12 ? 'Good morning! Ready to compete?'
      : hour < 17 ? 'Good afternoon! Your arena awaits.'
      : 'Good evening! Time for a challenge?';

    let insights: ArenaInsight[];
    switch (context) {
      case 'competitions': insights = competitionInsights(competitions, userStats); break;
      case 'tokens':       insights = tokenInsights(tokenBalance); break;
      case 'governance':   insights = governanceInsights(proposals); break;
      case 'bounties':     insights = bountyInsights(bounties); break;
      case 'teams':        insights = hubInsights(competitions, tokenBalance, teams, proposals).filter((i) => i.id === 'team-streak'); break;
      case 'community':    insights = [...competitionInsights(competitions, userStats).slice(0, 1), ...bountyInsights(bounties).slice(0, 1)]; break;
      default:             insights = hubInsights(competitions, tokenBalance, teams, proposals); break;
    }

    return {
      greeting,
      insights,
      recommendations: buildRecommendations(competitions, tokenBalance, teams, proposals, bounties, userStats),
      performanceTrend: computeTrend(userStats),
      nextBestAction: computeNextAction(competitions, tokenBalance, proposals),
    };
  }, [context, competitions, tokenBalance, teams, proposals, bounties, userStats]);
}

export default useArenaIntelligence;
