/**
 * Intelligence Mesh - Event Taxonomy Extension v1.7.0
 *
 * Extends the mesh event system with Wellbeing, Parent Portal, Governance,
 * Token Economy, Developer Marketplace, and Virtual Immersion domains.
 *
 * @module IntelligenceMesh/Events
 * @version 1.7.0
 */

import { MeshEvent } from './mesh-types-v17';

// ============================================================================
// DOMAIN EXTENSIONS
// ============================================================================

export type MeshDomain =
  | 'learning'
  | 'assessment'
  | 'curriculum'
  | 'analytics'
  | 'mesh';

export type ExtendedMeshDomain = MeshDomain
  | 'wellbeing'
  | 'parent'
  | 'governance'
  | 'token'
  | 'marketplace'
  | 'immersion';

// ============================================================================
// WELLBEING EVENTS (Phase 3)
// ============================================================================

export const WELLBEING_EVENTS = {
  // Profile lifecycle
  PROFILE_CREATED: 'scholarly.wellbeing.profile.created',
  PROFILE_UPDATED: 'scholarly.wellbeing.profile.updated',
  RISK_LEVEL_CHANGED: 'scholarly.wellbeing.risk_level.changed',

  // Signal events
  SIGNAL_RECORDED: 'scholarly.wellbeing.signal.recorded',
  SIGNAL_ACKNOWLEDGED: 'scholarly.wellbeing.signal.acknowledged',
  SIGNAL_DISMISSED: 'scholarly.wellbeing.signal.dismissed',
  PATTERN_DETECTED: 'scholarly.wellbeing.pattern.detected',

  // Check-in events
  CHECK_IN_CREATED: 'scholarly.wellbeing.check_in.created',
  CHECK_IN_COMPLETED: 'scholarly.wellbeing.check_in.completed',
  CHECK_IN_FLAGGED: 'scholarly.wellbeing.check_in.flagged',
  FOLLOW_UP_REQUIRED: 'scholarly.wellbeing.follow_up.required',
  FOLLOW_UP_COMPLETED: 'scholarly.wellbeing.follow_up.completed',

  // Intervention events
  INTERVENTION_RECOMMENDED: 'scholarly.wellbeing.intervention.recommended',
  INTERVENTION_CREATED: 'scholarly.wellbeing.intervention.created',
  INTERVENTION_APPROVED: 'scholarly.wellbeing.intervention.approved',
  INTERVENTION_STARTED: 'scholarly.wellbeing.intervention.started',
  INTERVENTION_ACTIVITY_RECORDED: 'scholarly.wellbeing.intervention.activity_recorded',
  INTERVENTION_COMPLETED: 'scholarly.wellbeing.intervention.completed',
  INTERVENTION_ESCALATED: 'scholarly.wellbeing.intervention.escalated',

  // Incident events
  INCIDENT_REPORTED: 'scholarly.wellbeing.incident.reported',
  INCIDENT_INVESTIGATION_STARTED: 'scholarly.wellbeing.incident.investigation_started',
  INCIDENT_INVESTIGATION_COMPLETED: 'scholarly.wellbeing.incident.investigation_completed',
  INCIDENT_EXTERNAL_REPORT_REQUIRED: 'scholarly.wellbeing.incident.external_report_required',

  // AI synthesis events
  SYNTHESIS_COMPLETED: 'scholarly.wellbeing.synthesis.completed',
  EMERGING_CONCERN_DETECTED: 'scholarly.wellbeing.concern.emerging',
  HIGH_RISK_DETECTED: 'scholarly.wellbeing.risk.high_detected',
  CRITICAL_INCIDENT: 'scholarly.wellbeing.incident.critical',
  IMMEDIATE_ALERT: 'scholarly.wellbeing.alert.immediate',

  // Analytics events
  ANALYTICS_GENERATED: 'scholarly.wellbeing.analytics.generated',
  COHORT_TREND_DETECTED: 'scholarly.wellbeing.cohort.trend_detected'
} as const;

// ============================================================================
// PARENT PORTAL EVENTS (Phase 3)
// ============================================================================

export const PARENT_EVENTS = {
  // Engagement events
  GUARDIAN_REGISTERED: 'scholarly.parent.guardian.registered',
  GUARDIAN_LINKED: 'scholarly.parent.guardian.linked',
  PORTAL_LOGIN: 'scholarly.parent.portal.login',
  ENGAGEMENT_SCORE_UPDATED: 'scholarly.parent.engagement.updated',
  ENGAGEMENT_DECLINED: 'scholarly.parent.engagement.declined',
  ENGAGEMENT_IMPROVED: 'scholarly.parent.engagement.improved',

  // Communication events
  MESSAGE_SENT: 'scholarly.parent.message.sent',
  MESSAGE_DELIVERED: 'scholarly.parent.message.delivered',
  MESSAGE_READ: 'scholarly.parent.message.read',
  MESSAGE_REPLIED: 'scholarly.parent.message.replied',
  BROADCAST_SENT: 'scholarly.parent.broadcast.sent',
  COMMUNICATION_PREFERENCE_UPDATED: 'scholarly.parent.preference.updated',

  // Resource access events
  REPORT_VIEWED: 'scholarly.parent.report.viewed',
  REPORT_DOWNLOADED: 'scholarly.parent.report.downloaded',
  RESOURCE_ACCESSED: 'scholarly.parent.resource.accessed',
  LEARNING_SUMMARY_VIEWED: 'scholarly.parent.summary.viewed',

  // Booking events
  MEETING_REQUESTED: 'scholarly.parent.meeting.requested',
  MEETING_SCHEDULED: 'scholarly.parent.meeting.scheduled',
  MEETING_ATTENDED: 'scholarly.parent.meeting.attended',
  MEETING_MISSED: 'scholarly.parent.meeting.missed',

  // Consent events
  CONSENT_REQUESTED: 'scholarly.parent.consent.requested',
  CONSENT_GRANTED: 'scholarly.parent.consent.granted',
  CONSENT_DENIED: 'scholarly.parent.consent.denied',
  CONSENT_WITHDRAWN: 'scholarly.parent.consent.withdrawn',

  // Action events
  ACTION_ITEM_CREATED: 'scholarly.parent.action.created',
  ACTION_ITEM_COMPLETED: 'scholarly.parent.action.completed',
  ACTION_ITEM_OVERDUE: 'scholarly.parent.action.overdue',

  // AI events
  COMMUNICATION_OPTIMISED: 'scholarly.parent.ai.communication_optimised',
  ENGAGEMENT_PREDICTION: 'scholarly.parent.ai.engagement_prediction',
  INSIGHT_GENERATED: 'scholarly.parent.ai.insight_generated'
} as const;

// ============================================================================
// GOVERNANCE EVENTS (Phase 4)
// ============================================================================

export const GOVERNANCE_EVENTS = {
  // DAO lifecycle
  DAO_CREATED: 'scholarly.governance.dao.created',
  DAO_ACTIVATED: 'scholarly.governance.dao.activated',
  DAO_PAUSED: 'scholarly.governance.dao.paused',
  DAO_DISSOLVED: 'scholarly.governance.dao.dissolved',

  // Membership events
  MEMBER_JOINED: 'scholarly.governance.member.joined',
  MEMBER_LEFT: 'scholarly.governance.member.left',
  MEMBER_ROLE_CHANGED: 'scholarly.governance.member.role_changed',
  VOTING_POWER_UPDATED: 'scholarly.governance.member.voting_power_updated',
  DELEGATION_CREATED: 'scholarly.governance.delegation.created',
  DELEGATION_REVOKED: 'scholarly.governance.delegation.revoked',

  // Proposal events
  PROPOSAL_CREATED: 'scholarly.governance.proposal.created',
  PROPOSAL_SUBMITTED: 'scholarly.governance.proposal.submitted',
  PROPOSAL_DISCUSSION_STARTED: 'scholarly.governance.proposal.discussion_started',
  PROPOSAL_VOTING_STARTED: 'scholarly.governance.proposal.voting_started',
  PROPOSAL_VOTED: 'scholarly.governance.proposal.voted',
  PROPOSAL_VOTING_ENDED: 'scholarly.governance.proposal.voting_ended',
  PROPOSAL_PASSED: 'scholarly.governance.proposal.passed',
  PROPOSAL_REJECTED: 'scholarly.governance.proposal.rejected',
  PROPOSAL_EXECUTED: 'scholarly.governance.proposal.executed',
  PROPOSAL_VETOED: 'scholarly.governance.proposal.vetoed',

  // Treasury events
  TREASURY_DEPOSIT: 'scholarly.governance.treasury.deposit',
  TREASURY_WITHDRAWAL: 'scholarly.governance.treasury.withdrawal',
  BUDGET_ALLOCATED: 'scholarly.governance.treasury.budget_allocated',
  GRANT_AWARDED: 'scholarly.governance.treasury.grant_awarded',

  // Policy events
  POLICY_CREATED: 'scholarly.governance.policy.created',
  POLICY_UPDATED: 'scholarly.governance.policy.updated',
  POLICY_ENFORCED: 'scholarly.governance.policy.enforced',

  // AI events
  AI_RECOMMENDATION: 'scholarly.governance.ai.recommendation',
  SENTIMENT_ANALYSIS: 'scholarly.governance.ai.sentiment_analysis',
  IMPACT_ASSESSMENT: 'scholarly.governance.ai.impact_assessment'
} as const;

// ============================================================================
// TOKEN ECONOMY EVENTS (Phase 4)
// ============================================================================

export const TOKEN_EVENTS = {
  // Token lifecycle
  TOKEN_MINTED: 'scholarly.token.minted',
  TOKEN_BURNED: 'scholarly.token.burned',
  TOKEN_TRANSFERRED: 'scholarly.token.transferred',
  TOKEN_LOCKED: 'scholarly.token.locked',
  TOKEN_UNLOCKED: 'scholarly.token.unlocked',

  // Reward events
  REWARD_EARNED: 'scholarly.token.reward.earned',
  REWARD_CLAIMED: 'scholarly.token.reward.claimed',
  ACHIEVEMENT_UNLOCKED: 'scholarly.token.achievement.unlocked',
  STREAK_BONUS: 'scholarly.token.streak.bonus',

  // Staking events
  STAKE_CREATED: 'scholarly.token.stake.created',
  STAKE_INCREASED: 'scholarly.token.stake.increased',
  STAKE_WITHDRAWN: 'scholarly.token.stake.withdrawn',
  STAKING_REWARD_DISTRIBUTED: 'scholarly.token.stake.reward',

  // Marketplace events
  LISTING_CREATED: 'scholarly.token.listing.created',
  LISTING_PURCHASED: 'scholarly.token.listing.purchased',
  LISTING_CANCELLED: 'scholarly.token.listing.cancelled',
  AUCTION_STARTED: 'scholarly.token.auction.started',
  AUCTION_BID: 'scholarly.token.auction.bid',
  AUCTION_ENDED: 'scholarly.token.auction.ended',

  // NFT events
  NFT_MINTED: 'scholarly.token.nft.minted',
  NFT_TRANSFERRED: 'scholarly.token.nft.transferred',
  CREDENTIAL_ISSUED: 'scholarly.token.credential.issued',
  CREDENTIAL_VERIFIED: 'scholarly.token.credential.verified',

  // Exchange events
  EXCHANGE_ORDER_PLACED: 'scholarly.token.exchange.order_placed',
  EXCHANGE_ORDER_FILLED: 'scholarly.token.exchange.order_filled',
  EXCHANGE_ORDER_CANCELLED: 'scholarly.token.exchange.order_cancelled',

  // AI events
  PRICE_PREDICTION: 'scholarly.token.ai.price_prediction',
  REWARD_OPTIMISATION: 'scholarly.token.ai.reward_optimisation'
} as const;

// ============================================================================
// DEVELOPER MARKETPLACE EVENTS (Phase 4)
// ============================================================================

export const MARKETPLACE_EVENTS = {
  // App lifecycle
  APP_SUBMITTED: 'scholarly.marketplace.app.submitted',
  APP_REVIEWED: 'scholarly.marketplace.app.reviewed',
  APP_APPROVED: 'scholarly.marketplace.app.approved',
  APP_REJECTED: 'scholarly.marketplace.app.rejected',
  APP_PUBLISHED: 'scholarly.marketplace.app.published',
  APP_UPDATED: 'scholarly.marketplace.app.updated',
  APP_DEPRECATED: 'scholarly.marketplace.app.deprecated',
  APP_REMOVED: 'scholarly.marketplace.app.removed',

  // Installation events
  APP_INSTALLED: 'scholarly.marketplace.app.installed',
  APP_UNINSTALLED: 'scholarly.marketplace.app.uninstalled',
  APP_ENABLED: 'scholarly.marketplace.app.enabled',
  APP_DISABLED: 'scholarly.marketplace.app.disabled',

  // Developer events
  DEVELOPER_REGISTERED: 'scholarly.marketplace.developer.registered',
  DEVELOPER_VERIFIED: 'scholarly.marketplace.developer.verified',
  DEVELOPER_PAYOUT: 'scholarly.marketplace.developer.payout',

  // Review events
  REVIEW_SUBMITTED: 'scholarly.marketplace.review.submitted',
  REVIEW_MODERATED: 'scholarly.marketplace.review.moderated',
  REVIEW_RESPONDED: 'scholarly.marketplace.review.responded',

  // Bounty events
  BOUNTY_CREATED: 'scholarly.marketplace.bounty.created',
  BOUNTY_FUNDED: 'scholarly.marketplace.bounty.funded',
  BOUNTY_CLAIMED: 'scholarly.marketplace.bounty.claimed',
  BOUNTY_COMPLETED: 'scholarly.marketplace.bounty.completed',
  BOUNTY_DISPUTED: 'scholarly.marketplace.bounty.disputed',

  // API events
  API_KEY_CREATED: 'scholarly.marketplace.api.key_created',
  API_KEY_REVOKED: 'scholarly.marketplace.api.key_revoked',
  API_USAGE_LIMIT_REACHED: 'scholarly.marketplace.api.limit_reached',
  WEBHOOK_REGISTERED: 'scholarly.marketplace.webhook.registered',

  // AI events
  APP_RECOMMENDATION: 'scholarly.marketplace.ai.recommendation',
  SECURITY_SCAN_COMPLETED: 'scholarly.marketplace.ai.security_scan'
} as const;

// ============================================================================
// VIRTUAL IMMERSION EVENTS (Phase 4)
// ============================================================================

export const IMMERSION_EVENTS = {
  // Session lifecycle
  SESSION_CREATED: 'scholarly.immersion.session.created',
  SESSION_STARTED: 'scholarly.immersion.session.started',
  SESSION_JOINED: 'scholarly.immersion.session.joined',
  SESSION_LEFT: 'scholarly.immersion.session.left',
  SESSION_ENDED: 'scholarly.immersion.session.ended',

  // Environment events
  ENVIRONMENT_LOADED: 'scholarly.immersion.environment.loaded',
  ENVIRONMENT_CHANGED: 'scholarly.immersion.environment.changed',
  ASSET_LOADED: 'scholarly.immersion.asset.loaded',

  // Interaction events
  OBJECT_INTERACTED: 'scholarly.immersion.object.interacted',
  NPC_CONVERSATION_STARTED: 'scholarly.immersion.npc.conversation_started',
  NPC_CONVERSATION_ENDED: 'scholarly.immersion.npc.conversation_ended',
  SPEECH_DETECTED: 'scholarly.immersion.speech.detected',
  GESTURE_DETECTED: 'scholarly.immersion.gesture.detected',

  // Learning events
  VOCABULARY_PRACTICED: 'scholarly.immersion.vocabulary.practiced',
  GRAMMAR_PRACTICED: 'scholarly.immersion.grammar.practiced',
  PRONUNCIATION_ASSESSED: 'scholarly.immersion.pronunciation.assessed',
  SCENARIO_COMPLETED: 'scholarly.immersion.scenario.completed',
  ACHIEVEMENT_EARNED: 'scholarly.immersion.achievement.earned',

  // Social events
  PEER_CONNECTED: 'scholarly.immersion.peer.connected',
  PEER_DISCONNECTED: 'scholarly.immersion.peer.disconnected',
  COLLABORATION_STARTED: 'scholarly.immersion.collaboration.started',
  COLLABORATION_ENDED: 'scholarly.immersion.collaboration.ended',

  // Performance events
  FRAME_RATE_DROPPED: 'scholarly.immersion.performance.frame_rate_dropped',
  LATENCY_SPIKE: 'scholarly.immersion.performance.latency_spike',
  CONNECTION_QUALITY_CHANGED: 'scholarly.immersion.performance.connection_changed',

  // AI events
  AI_TUTOR_ACTIVATED: 'scholarly.immersion.ai.tutor_activated',
  AI_FEEDBACK_PROVIDED: 'scholarly.immersion.ai.feedback_provided',
  DIFFICULTY_ADJUSTED: 'scholarly.immersion.ai.difficulty_adjusted',
  CONTENT_GENERATED: 'scholarly.immersion.ai.content_generated'
} as const;

// ============================================================================
// MESH SYNTHESIS EVENTS (Cross-Domain Intelligence)
// ============================================================================

export const MESH_EVENTS = {
  // Student intelligence
  STUDENT_PROFILE_SYNTHESISED: 'scholarly.mesh.student.synthesised',
  STUDENT_TRAJECTORY_PREDICTED: 'scholarly.mesh.student.trajectory_predicted',
  STUDENT_INTERVENTION_TRIGGERED: 'scholarly.mesh.student.intervention_triggered',

  // Pattern detection
  CROSS_DOMAIN_PATTERN_DETECTED: 'scholarly.mesh.pattern.cross_domain',
  COHORT_ANOMALY_DETECTED: 'scholarly.mesh.pattern.cohort_anomaly',

  // Data flow
  DATA_SYNC_COMPLETED: 'scholarly.mesh.sync.completed',
  DATA_CONFLICT_DETECTED: 'scholarly.mesh.sync.conflict',
  LIS_SYNC_COMPLETED: 'scholarly.mesh.lis.sync_completed',

  // AI orchestration
  AI_PIPELINE_STARTED: 'scholarly.mesh.ai.pipeline_started',
  AI_PIPELINE_COMPLETED: 'scholarly.mesh.ai.pipeline_completed',
  AI_MODEL_UPDATED: 'scholarly.mesh.ai.model_updated'
} as const;

// ============================================================================
// EVENT PAYLOAD INTERFACES
// ============================================================================

export interface WellbeingSignalRecordedEvent extends MeshEvent {
  type: typeof WELLBEING_EVENTS.SIGNAL_RECORDED;
  payload: {
    signalId: string;
    studentId: string;
    source: string;
    domain: string;
    severity: string;
    riskContribution: number;
  };
}

export interface WellbeingHighRiskDetectedEvent extends MeshEvent {
  type: typeof WELLBEING_EVENTS.HIGH_RISK_DETECTED;
  payload: {
    studentId: string;
    riskLevel: string;
    riskScore: number;
    primaryConcerns: string[];
    recommendedActions: string[];
  };
}

export interface ParentEngagementDeclinedEvent extends MeshEvent {
  type: typeof PARENT_EVENTS.ENGAGEMENT_DECLINED;
  payload: {
    guardianId: string;
    studentIds: string[];
    previousScore: number;
    currentScore: number;
    daysSinceLastLogin: number;
  };
}

export interface GovernanceProposalPassedEvent extends MeshEvent {
  type: typeof GOVERNANCE_EVENTS.PROPOSAL_PASSED;
  payload: {
    proposalId: string;
    daoId: string;
    title: string;
    votesFor: number;
    votesAgainst: number;
    executionTime: Date;
  };
}

export interface TokenRewardEarnedEvent extends MeshEvent {
  type: typeof TOKEN_EVENTS.REWARD_EARNED;
  payload: {
    userId: string;
    amount: number;
    reason: string;
    category: string;
    transactionId: string;
  };
}

export interface MarketplaceAppPublishedEvent extends MeshEvent {
  type: typeof MARKETPLACE_EVENTS.APP_PUBLISHED;
  payload: {
    appId: string;
    developerId: string;
    name: string;
    version: string;
    category: string;
  };
}

export interface ImmersionSessionCompletedEvent extends MeshEvent {
  type: typeof IMMERSION_EVENTS.SESSION_ENDED;
  payload: {
    sessionId: string;
    userId: string;
    duration: number;
    language: string;
    scenariosCompleted: number;
    vocabularyPracticed: number;
    pronunciationScore: number;
  };
}

// ============================================================================
// EVENT FACTORY
// ============================================================================

export function createMeshEvent<T extends MeshEvent>(
  type: string,
  tenantId: string,
  payload: T['payload'],
  options?: {
    domain?: ExtendedMeshDomain;
    affectsStudents?: string[];
    correlationId?: string;
    causedBy?: string;
    containsPII?: boolean;
    privacyLevel?: 'public' | 'staff' | 'restricted';
    shouldSyncToLIS?: boolean;
  }
): T {
  return {
    id: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    type,
    tenantId,
    timestamp: new Date().toISOString(),
    payload,
    meshMetadata: {
      domain: options?.domain || 'mesh',
      affectsStudents: options?.affectsStudents || [],
      correlationId: options?.correlationId,
      causedBy: options?.causedBy,
      containsPII: options?.containsPII || false,
      privacyLevel: options?.privacyLevel || 'staff'
    },
    lisSync: options?.shouldSyncToLIS ? {
      shouldSync: true,
      syncType: 'batch'
    } : undefined
  } as unknown as T;
}

