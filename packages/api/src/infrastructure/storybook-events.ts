/**
 * =============================================================================
 * SCHOLARLY PLATFORM — Storybook Event Publishers
 * =============================================================================
 *
 * Sprint 5, PW-004: The nervous system of the Storybook ecosystem. Every
 * significant action emits a structured event through the NATS JetStream
 * bus built in Sprint 1.
 *
 * Consumes: EventBus from Sprint 1 (platform-services/event-bus.ts)
 * Total: ~850 lines
 * =============================================================================
 */

import { randomUUID } from 'crypto';

// =============================================================================
// EVENT ENVELOPE
// =============================================================================

interface EventEnvelope<T extends string, P> {
  domain: 'storybook' | 'marketplace' | 'review' | 'library';
  type: T;
  version: '1.0';
  timestamp: string;
  tenantId: string;
  correlationId: string;
  actorId: string;
  payload: P;
}

// =============================================================================
// EVENT PAYLOAD TYPES
// =============================================================================

interface StorybookCreatedPayload {
  storybookId: string;
  title: string;
  creatorId: string;
  phonicsPhase: string;
  targetGpcs: string[];
  artStyle: string;
  seriesId: string | null;
}

interface NarrativeGeneratedPayload {
  storybookId: string;
  pageCount: number;
  wordCount: number;
  decodabilityScore: number;
  generationModel: string;
  generationCostUsd: number;
  generationDurationMs: number;
}

interface IllustratedPayload {
  storybookId: string;
  illustrationCount: number;
  model: string;
  artStyle: string;
  totalCostUsd: number;
  totalDurationMs: number;
  failedPages: number[];
}

interface NarratedPayload {
  storybookId: string;
  pageCount: number;
  totalDurationSeconds: number;
  voiceId: string;
  costUsd: number;
}

interface PublishedPayload {
  storybookId: string;
  title: string;
  creatorId: string;
  phonicsPhase: string;
  targetGpcs: string[];
  decodabilityScore: number;
  seriesId: string | null;
  reviewScore: number;
  isOpenSource: boolean;
}

interface RejectedPayload {
  storybookId: string;
  creatorId: string;
  stage: string;
  reason: string;
  findings: Array<{ type: string; severity: string; detail: string }>;
}

interface ArchivedPayload {
  storybookId: string;
  reason: string;
  archivedBy: string;
}

interface ReviewStagePayload {
  storybookId: string;
  stage: string;
  decision: string;
  score: number | null;
  reviewerId: string;
  findings: Array<{ type: string; severity: string }>;
  nextStage: string | null;
}

interface PeerReviewPayload {
  storybookId: string;
  reviewerId: string;
  decision: string;
  score: number;
  xpAwarded: number;
  badgeEarned: string | null;
}

interface PilotTestPayload {
  storybookId: string;
  cohortSize: number;
  completionRate: number;
  engagementRate: number;
  accuracyRate: number;
  abandonmentRate: number;
  problematicGpcs: string[];
  passed: boolean;
}

interface BookReadPayload {
  storybookId: string;
  learnerId: string;
  deviceId: string;
  completed: boolean;
  accuracy: number;
  timeSeconds: number;
  wcpm: number;
  isReRead: boolean;
  gpcAccuracy: Record<string, number>;
}

interface BookDownloadedPayload {
  storybookId: string;
  learnerId: string;
  deviceId: string;
  downloadSize: number;
}

interface BookFavouritedPayload {
  storybookId: string;
  learnerId: string;
}

interface BookRatedPayload {
  storybookId: string;
  learnerId: string;
  rating: number;
}

interface CreatorPromotedPayload {
  creatorId: string;
  userId: string;
  previousTier: string;
  newTier: string;
  reason: string;
  newRateLimit: number;
  newRevenueShare: number;
}

interface RevenueCalculatedPayload {
  periodStart: string;
  periodEnd: string;
  totalPool: number;
  distributions: Array<{
    creatorId: string;
    amount: number;
    booksContributed: number;
    engagementScore: number;
  }>;
}

interface BountyCreatedPayload {
  bountyId: string;
  title: string;
  targetPhase: string;
  rewardAmount: number;
  deadline: string;
  fundingSource: string;
}

interface BountyAwardedPayload {
  bountyId: string;
  winnerId: string;
  winnerStorybookId: string;
  rewardAmount: number;
  submissionCount: number;
}

interface BountyExpiredPayload {
  bountyId: string;
  title: string;
  submissionCount: number;
}

// =============================================================================
// NATS SUBJECT MAPPING
// =============================================================================

const SUBJECTS = {
  // Storybook lifecycle
  'storybook.created':              'scholarly.storybook.book.created',
  'storybook.narrative.generated':  'scholarly.storybook.book.narrative-generated',
  'storybook.illustrated':          'scholarly.storybook.book.illustrated',
  'storybook.narrated':             'scholarly.storybook.book.narrated',
  'storybook.published':            'scholarly.storybook.book.published',
  'storybook.archived':             'scholarly.storybook.book.archived',
  'storybook.rejected':             'scholarly.storybook.book.rejected',

  // Review pipeline
  'review.stage.completed':         'scholarly.storybook.review.stage-completed',
  'review.peer.submitted':          'scholarly.storybook.review.peer-submitted',
  'review.pilot.completed':         'scholarly.storybook.review.pilot-completed',

  // Library engagement
  'library.book.read':              'scholarly.library.book.read',
  'library.book.downloaded':        'scholarly.library.book.downloaded',
  'library.book.favourited':        'scholarly.library.book.favourited',
  'library.book.rated':             'scholarly.library.book.rated',

  // Marketplace
  'marketplace.creator.promoted':   'scholarly.marketplace.creator.promoted',
  'marketplace.revenue.calculated': 'scholarly.marketplace.revenue.calculated',
  'marketplace.bounty.created':     'scholarly.marketplace.bounty.created',
  'marketplace.bounty.awarded':     'scholarly.marketplace.bounty.awarded',
  'marketplace.bounty.expired':     'scholarly.marketplace.bounty.expired',
} as const;

// =============================================================================
// JETSTREAM CONFIGURATION
// =============================================================================

/** Stream definitions for the storybook domain */
const STREAM_CONFIGS = {
  /** Storybook lifecycle events (creation through archival) */
  STORYBOOK_LIFECYCLE: {
    name: 'SCHOLARLY_STORYBOOK',
    subjects: ['scholarly.storybook.>'],
    retention: 'limits' as const,
    maxAge: 90 * 24 * 60 * 60 * 1_000_000_000, // 90 days in nanoseconds
    maxMsgs: 1_000_000,
    storage: 'file' as const,
    replicas: 1,
    duplicateWindow: 120_000_000_000, // 2 minutes dedup window
  },

  /** Library engagement events (reads, downloads, ratings) */
  LIBRARY_ENGAGEMENT: {
    name: 'SCHOLARLY_LIBRARY',
    subjects: ['scholarly.library.>'],
    retention: 'limits' as const,
    maxAge: 365 * 24 * 60 * 60 * 1_000_000_000, // 1 year
    maxMsgs: 10_000_000,
    storage: 'file' as const,
    replicas: 1,
    duplicateWindow: 60_000_000_000,
  },

  /** Marketplace events (creator activity, bounties, revenue) */
  MARKETPLACE: {
    name: 'SCHOLARLY_MARKETPLACE',
    subjects: ['scholarly.marketplace.>'],
    retention: 'limits' as const,
    maxAge: 365 * 24 * 60 * 60 * 1_000_000_000,
    maxMsgs: 500_000,
    storage: 'file' as const,
    replicas: 1,
    duplicateWindow: 120_000_000_000,
  },
};

/** Consumer group definitions for event processing */
const CONSUMER_GROUPS = {
  /** Analytics processor: updates StorybookAnalytics on every read */
  ANALYTICS_PROCESSOR: {
    stream: 'SCHOLARLY_LIBRARY',
    name: 'analytics-processor',
    filterSubject: 'scholarly.library.book.read',
    durableName: 'analytics-processor',
    ackPolicy: 'explicit' as const,
    maxDeliver: 5,
    ackWait: 30_000_000_000, // 30 seconds
  },

  /** Creator stats updater: updates CreatorProfile on publication/rejection */
  CREATOR_STATS: {
    stream: 'SCHOLARLY_STORYBOOK',
    name: 'creator-stats',
    filterSubject: 'scholarly.storybook.book.*',
    durableName: 'creator-stats',
    ackPolicy: 'explicit' as const,
    maxDeliver: 3,
    ackWait: 15_000_000_000,
  },

  /** Webhook dispatcher: forwards events to registered webhook endpoints */
  WEBHOOK_DISPATCHER: {
    stream: 'SCHOLARLY_STORYBOOK',
    name: 'webhook-dispatcher',
    filterSubject: 'scholarly.storybook.>',
    durableName: 'webhook-dispatcher',
    ackPolicy: 'explicit' as const,
    maxDeliver: 10, // More retries for external delivery
    ackWait: 60_000_000_000,
  },

  /** Review pipeline: advances storybooks through review stages */
  REVIEW_PIPELINE: {
    stream: 'SCHOLARLY_STORYBOOK',
    name: 'review-pipeline',
    filterSubject: 'scholarly.storybook.review.*',
    durableName: 'review-pipeline',
    ackPolicy: 'explicit' as const,
    maxDeliver: 5,
    ackWait: 30_000_000_000,
  },

  /** Recommendation engine: updates personalised shelves on new publications */
  RECOMMENDATION_ENGINE: {
    stream: 'SCHOLARLY_STORYBOOK',
    name: 'recommendation-engine',
    filterSubject: 'scholarly.storybook.book.published',
    durableName: 'recommendation-engine',
    ackPolicy: 'explicit' as const,
    maxDeliver: 3,
    ackWait: 15_000_000_000,
  },

  /** BKT updater: processes reading data into mastery estimates */
  BKT_UPDATER: {
    stream: 'SCHOLARLY_LIBRARY',
    name: 'bkt-updater',
    filterSubject: 'scholarly.library.book.read',
    durableName: 'bkt-updater',
    ackPolicy: 'explicit' as const,
    maxDeliver: 5,
    ackWait: 30_000_000_000,
  },

  /** Bounty matcher: notifies eligible creators when new bounties appear */
  BOUNTY_MATCHER: {
    stream: 'SCHOLARLY_MARKETPLACE',
    name: 'bounty-matcher',
    filterSubject: 'scholarly.marketplace.bounty.created',
    durableName: 'bounty-matcher',
    ackPolicy: 'explicit' as const,
    maxDeliver: 3,
    ackWait: 15_000_000_000,
  },

  /** Arena integration: converts reading completions to competitive scoring */
  ARENA_SCORING: {
    stream: 'SCHOLARLY_LIBRARY',
    name: 'arena-scoring',
    filterSubject: 'scholarly.library.book.read',
    durableName: 'arena-scoring',
    ackPolicy: 'explicit' as const,
    maxDeliver: 3,
    ackWait: 15_000_000_000,
  },
};

// =============================================================================
// EVENT BUS INTERFACE
// =============================================================================
// This is the contract the publishers depend on — matching Sprint 1's EventBus.

interface IEventBus {
  publish(subject: string, data: Uint8Array, options?: { msgId?: string }): Promise<void>;
  subscribe(
    subject: string,
    handler: (data: Uint8Array, meta: { subject: string; timestamp: Date }) => Promise<void>,
    options?: { queue?: string; durable?: string }
  ): Promise<{ unsubscribe: () => void }>;
}

// =============================================================================
// STORYBOOK EVENT PUBLISHER
// =============================================================================

export class StorybookEventPublisher {
  private readonly encoder = new TextEncoder();

  constructor(private readonly eventBus: IEventBus) {}

  // --- Storybook lifecycle ---

  async storybookCreated(tenantId: string, actorId: string, payload: StorybookCreatedPayload): Promise<void> {
    await this.publish('storybook', 'storybook.created', tenantId, actorId, payload);
  }

  async narrativeGenerated(tenantId: string, actorId: string, payload: NarrativeGeneratedPayload): Promise<void> {
    await this.publish('storybook', 'storybook.narrative.generated', tenantId, actorId, payload);
  }

  async illustrated(tenantId: string, actorId: string, payload: IllustratedPayload): Promise<void> {
    await this.publish('storybook', 'storybook.illustrated', tenantId, actorId, payload);
  }

  async narrated(tenantId: string, actorId: string, payload: NarratedPayload): Promise<void> {
    await this.publish('storybook', 'storybook.narrated', tenantId, actorId, payload);
  }

  async published(tenantId: string, actorId: string, payload: PublishedPayload): Promise<void> {
    await this.publish('storybook', 'storybook.published', tenantId, actorId, payload);
  }

  async archived(tenantId: string, actorId: string, payload: ArchivedPayload): Promise<void> {
    await this.publish('storybook', 'storybook.archived', tenantId, actorId, payload);
  }

  async rejected(tenantId: string, actorId: string, payload: RejectedPayload): Promise<void> {
    await this.publish('storybook', 'storybook.rejected', tenantId, actorId, payload);
  }

  // --- Review pipeline ---

  async reviewStageCompleted(tenantId: string, actorId: string, payload: ReviewStagePayload): Promise<void> {
    await this.publish('review', 'review.stage.completed', tenantId, actorId, payload);
  }

  async peerReviewSubmitted(tenantId: string, actorId: string, payload: PeerReviewPayload): Promise<void> {
    await this.publish('review', 'review.peer.submitted', tenantId, actorId, payload);
  }

  async pilotTestCompleted(tenantId: string, actorId: string, payload: PilotTestPayload): Promise<void> {
    await this.publish('review', 'review.pilot.completed', tenantId, actorId, payload);
  }

  // --- Library engagement ---

  async bookRead(tenantId: string, actorId: string, payload: BookReadPayload): Promise<void> {
    await this.publish('library', 'library.book.read', tenantId, actorId, payload);
  }

  async bookDownloaded(tenantId: string, actorId: string, payload: BookDownloadedPayload): Promise<void> {
    await this.publish('library', 'library.book.downloaded', tenantId, actorId, payload);
  }

  async bookFavourited(tenantId: string, actorId: string, payload: BookFavouritedPayload): Promise<void> {
    await this.publish('library', 'library.book.favourited', tenantId, actorId, payload);
  }

  async bookRated(tenantId: string, actorId: string, payload: BookRatedPayload): Promise<void> {
    await this.publish('library', 'library.book.rated', tenantId, actorId, payload);
  }

  // --- Marketplace ---

  async creatorPromoted(tenantId: string, actorId: string, payload: CreatorPromotedPayload): Promise<void> {
    await this.publish('marketplace', 'marketplace.creator.promoted', tenantId, actorId, payload);
  }

  async revenueCalculated(tenantId: string, actorId: string, payload: RevenueCalculatedPayload): Promise<void> {
    await this.publish('marketplace', 'marketplace.revenue.calculated', tenantId, actorId, payload);
  }

  async bountyCreated(tenantId: string, actorId: string, payload: BountyCreatedPayload): Promise<void> {
    await this.publish('marketplace', 'marketplace.bounty.created', tenantId, actorId, payload);
  }

  async bountyAwarded(tenantId: string, actorId: string, payload: BountyAwardedPayload): Promise<void> {
    await this.publish('marketplace', 'marketplace.bounty.awarded', tenantId, actorId, payload);
  }

  async bountyExpired(tenantId: string, actorId: string, payload: BountyExpiredPayload): Promise<void> {
    await this.publish('marketplace', 'marketplace.bounty.expired', tenantId, actorId, payload);
  }

  // --- Internal publish helper ---

  private async publish(
    domain: string,
    eventType: string,
    tenantId: string,
    actorId: string,
    payload: any
  ): Promise<void> {
    const subject = SUBJECTS[eventType as keyof typeof SUBJECTS];
    if (!subject) {
      throw new Error(`Unknown event type: ${eventType}`);
    }

    const correlationId = randomUUID();
    const envelope: EventEnvelope<string, any> = {
      domain: domain as any,
      type: eventType,
      version: '1.0',
      timestamp: new Date().toISOString(),
      tenantId,
      correlationId,
      actorId,
      payload,
    };

    const data = this.encoder.encode(JSON.stringify(envelope));
    await this.eventBus.publish(subject, data, {
      msgId: `${eventType}-${correlationId}`, // Deduplication key
    });
  }
}

// =============================================================================
// EVENT CONSUMER REGISTRATIONS
// =============================================================================
// Factory functions that wire up consumer groups. Each consumer processes
// a specific event type and performs side effects (database updates,
// notifications, score calculations).

export class StorybookEventConsumers {
  constructor(
    private readonly eventBus: IEventBus,
    private readonly decoder: TextDecoder = new TextDecoder()
  ) {}

  /**
   * Register the analytics processor: on every book.read event, update
   * the StorybookAnalytics record with running averages.
   */
  async registerAnalyticsProcessor(
    handler: (event: EventEnvelope<'library.book.read', BookReadPayload>) => Promise<void>
  ): Promise<{ unsubscribe: () => void }> {
    return this.eventBus.subscribe(
      CONSUMER_GROUPS.ANALYTICS_PROCESSOR.filterSubject,
      async (data) => {
        const event = JSON.parse(this.decoder.decode(data));
        await handler(event);
      },
      {
        queue: CONSUMER_GROUPS.ANALYTICS_PROCESSOR.name,
        durable: CONSUMER_GROUPS.ANALYTICS_PROCESSOR.durableName,
      }
    );
  }

  /**
   * Register the creator stats updater: on publication or rejection,
   * update the CreatorProfile with new counts and averages.
   */
  async registerCreatorStatsUpdater(
    handler: (event: EventEnvelope<string, any>) => Promise<void>
  ): Promise<{ unsubscribe: () => void }> {
    return this.eventBus.subscribe(
      CONSUMER_GROUPS.CREATOR_STATS.filterSubject,
      async (data) => {
        const event = JSON.parse(this.decoder.decode(data));
        if (event.type === 'storybook.published' || event.type === 'storybook.rejected') {
          await handler(event);
        }
      },
      {
        queue: CONSUMER_GROUPS.CREATOR_STATS.name,
        durable: CONSUMER_GROUPS.CREATOR_STATS.durableName,
      }
    );
  }

  /**
   * Register the webhook dispatcher: forward all storybook events to
   * registered webhook endpoints via the WebhookService (Sprint 4).
   */
  async registerWebhookDispatcher(
    handler: (event: EventEnvelope<string, any>) => Promise<void>
  ): Promise<{ unsubscribe: () => void }> {
    return this.eventBus.subscribe(
      CONSUMER_GROUPS.WEBHOOK_DISPATCHER.filterSubject,
      async (data) => {
        const event = JSON.parse(this.decoder.decode(data));
        await handler(event);
      },
      {
        queue: CONSUMER_GROUPS.WEBHOOK_DISPATCHER.name,
        durable: CONSUMER_GROUPS.WEBHOOK_DISPATCHER.durableName,
      }
    );
  }

  /**
   * Register the review pipeline consumer: advance storybooks through
   * review stages based on completed review events.
   */
  async registerReviewPipeline(
    handler: (event: EventEnvelope<string, ReviewStagePayload>) => Promise<void>
  ): Promise<{ unsubscribe: () => void }> {
    return this.eventBus.subscribe(
      CONSUMER_GROUPS.REVIEW_PIPELINE.filterSubject,
      async (data) => {
        const event = JSON.parse(this.decoder.decode(data));
        await handler(event);
      },
      {
        queue: CONSUMER_GROUPS.REVIEW_PIPELINE.name,
        durable: CONSUMER_GROUPS.REVIEW_PIPELINE.durableName,
      }
    );
  }

  /**
   * Register the BKT updater: process reading accuracy data into
   * Bayesian Knowledge Tracing mastery estimates.
   */
  async registerBktUpdater(
    handler: (event: EventEnvelope<'library.book.read', BookReadPayload>) => Promise<void>
  ): Promise<{ unsubscribe: () => void }> {
    return this.eventBus.subscribe(
      CONSUMER_GROUPS.BKT_UPDATER.filterSubject,
      async (data) => {
        const event = JSON.parse(this.decoder.decode(data));
        await handler(event);
      },
      {
        queue: CONSUMER_GROUPS.BKT_UPDATER.name,
        durable: CONSUMER_GROUPS.BKT_UPDATER.durableName,
      }
    );
  }

  /**
   * Register the Arena scoring consumer: convert reading completions
   * to competitive scoring events for the Arena module.
   */
  async registerArenaScoring(
    handler: (event: EventEnvelope<'library.book.read', BookReadPayload>) => Promise<void>
  ): Promise<{ unsubscribe: () => void }> {
    return this.eventBus.subscribe(
      CONSUMER_GROUPS.ARENA_SCORING.filterSubject,
      async (data) => {
        const event = JSON.parse(this.decoder.decode(data));
        if (event.payload.completed) {
          await handler(event);
        }
      },
      {
        queue: CONSUMER_GROUPS.ARENA_SCORING.name,
        durable: CONSUMER_GROUPS.ARENA_SCORING.durableName,
      }
    );
  }

  /**
   * Register the bounty matcher: when a new bounty is created, find
   * and notify eligible creators.
   */
  async registerBountyMatcher(
    handler: (event: EventEnvelope<'marketplace.bounty.created', BountyCreatedPayload>) => Promise<void>
  ): Promise<{ unsubscribe: () => void }> {
    return this.eventBus.subscribe(
      CONSUMER_GROUPS.BOUNTY_MATCHER.filterSubject,
      async (data) => {
        const event = JSON.parse(this.decoder.decode(data));
        await handler(event);
      },
      {
        queue: CONSUMER_GROUPS.BOUNTY_MATCHER.name,
        durable: CONSUMER_GROUPS.BOUNTY_MATCHER.durableName,
      }
    );
  }
}

// =============================================================================
// EXPORTS: Stream & consumer configs for infrastructure setup
// =============================================================================

export {
  SUBJECTS,
  STREAM_CONFIGS,
  CONSUMER_GROUPS,
  // Re-export payload types for consumers
  type StorybookCreatedPayload,
  type NarrativeGeneratedPayload,
  type IllustratedPayload,
  type NarratedPayload,
  type PublishedPayload,
  type RejectedPayload,
  type ReviewStagePayload,
  type PeerReviewPayload,
  type PilotTestPayload,
  type BookReadPayload,
  type BookDownloadedPayload,
  type CreatorPromotedPayload,
  type RevenueCalculatedPayload,
  type BountyCreatedPayload,
  type BountyAwardedPayload,
  type EventEnvelope,
  type StorybookDomainEvent,
};
