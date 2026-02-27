/**
 * ============================================================================
 * SCHOLARLY PLATFORM — UC v5.0 Integration Boot Script
 * ============================================================================
 *
 * This script is the power adapter that plugs the UC platform into Scholarly's
 * electrical grid. The UC platform is a self-contained building with its own
 * wiring (EventBus, plugins, storage). Scholarly is the city grid (Prisma,
 * NATS, JWT auth, multi-tenant isolation). This script connects the building
 * to the grid so that:
 *
 *   1. UC endpoints validate Scholarly JWT tokens (RS256)
 *   2. UC events flow bidirectionally through NATS (scholarly.uc.* namespace)
 *   3. UC plugins persist through Scholarly's PostgreSQL via Prisma
 *   4. UC operations are scoped to the authenticated tenant
 *
 * Without this script, UC v5.0 runs standalone (in-memory storage, no NATS,
 * no auth) — exactly as it did in v3.3. With this script, it becomes a
 * first-class citizen of the Scholarly Intelligence Mesh.
 *
 * ## Configuration
 *
 * All configuration is loaded from environment variables with sensible
 * defaults. See the `loadScholarlyUCConfig()` function below for the
 * complete list.
 *
 * ## Usage
 *
 * In Scholarly's main server.ts:
 *
 *   import { bootScholarlyUC } from './integrations/uc-v5-boot';
 *   const ucPlatform = await bootScholarlyUC(prismaClient);
 *   // UC is now running on its configured port with full Scholarly integration
 *
 * ## Competition Platform Dependency
 *
 * The Competition Platform (scholarly-competition-platform-architecture.docx)
 * depends on UC v5.0 for four capabilities:
 *   - Email/SMS/In-App notifications (priority EOI system)
 *   - Video conferencing (live dictation delivery, jury judging)
 *   - In-app messaging (organiser-school communication)
 *   - Broadcast mode (one-to-many streaming during competition rounds)
 *
 * Deploying UC v5.0 now unblocks the Competition Platform build (18-week
 * timeline starting March 2026, targeting Dicta d'Or 2026 in July). This
 * is critical for Érudits, whose Dicta d'Or competition is the flagship
 * use case that validates the entire platform migration.
 *
 * @module scholarly/integrations/uc-v5-boot
 * @version 1.0.0
 */

// ─── Import UC Platform (peer dependency) ────────────────────────────────
// In production, these come from '@scholarly/unified-communications'.
// During Sprint 1, we reference the extracted package directly.

import type { PlatformConfig, NatsBridgeConfig, ScholarlyAuthConfig } from '../uc-v4/src/config';
import { mergeConfig } from '../uc-v4/src/config';
import { EventBus } from '../uc-v4/src/bus/event-bus';
import { NatsEventBridge } from '../uc-v4/src/adapters/nats-event-bridge';
import { PrismaStorageAdapter } from '../uc-v4/src/adapters/prisma-storage-adapter';
import { createScholarlyAuthMiddleware } from '../uc-v4/src/adapters/scholarly-auth-middleware';

// ============================================================================
// §1 — CONFIGURATION
// ============================================================================

/**
 * Load UC v5.0 configuration from environment variables.
 *
 * Every value has a sensible default for local development. In production,
 * these are set via Azure Key Vault references in the container environment.
 *
 * The configuration follows a hierarchy:
 *   1. Environment variables (highest priority)
 *   2. Azure Key Vault secrets (via managed identity)
 *   3. Defaults defined here (lowest priority)
 */
export interface ScholarlyUCConfig {
  /** UC HTTP port. Default: 3100 */
  port: number;
  /** UC WebSocket port. Default: 3101 */
  wsPort: number;
  /** Node environment */
  nodeEnv: 'development' | 'production' | 'test';
  /** Log level */
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  /** CORS allowed origins (comma-separated) */
  corsOrigins: string[];

  // ── Scholarly Auth ──
  /** JWT secret or RSA public key for token verification */
  jwtSecret: string;
  /** JWT algorithm. Scholarly uses RS256 in production */
  jwtAlgorithm: 'HS256' | 'RS256' | 'ES256';
  /** Expected JWT issuer */
  jwtIssuer: string;
  /** Expected JWT audience */
  jwtAudience: string;
  /** Paths that bypass authentication */
  publicPaths: string[];

  // ── NATS ──
  /** NATS server URL(s). Comma-separated for clustering */
  natsUrl: string;
  /** NATS subject prefix for UC events */
  natsSubjectPrefix: string;
  /** NATS credentials */
  natsUser: string;
  natsPass: string;
  /**
   * Event filter: which event prefixes to bridge to NATS.
   * Empty = bridge all events.
   * Recommended: filter out high-frequency events like typing indicators
   * to prevent NATS flooding.
   */
  natsEventFilter: string[];
  /** Whether to subscribe to external NATS events and re-emit locally */
  natsBidirectional: boolean;

  // ── Multi-Tenant ──
  /** Tenant isolation mode */
  tenantIsolation: 'strict' | 'permissive' | 'none';

  // ── Plugins ──
  /** Which plugins to enable (comma-separated plugin IDs) */
  enabledPlugins: string[];
}

/**
 * Load configuration from environment variables with defaults.
 */
export function loadScholarlyUCConfig(): ScholarlyUCConfig {
  return {
    port: parseInt(process.env.UC_PORT || '3100', 10),
    wsPort: parseInt(process.env.UC_WS_PORT || '3101', 10),
    nodeEnv: (process.env.NODE_ENV as 'development' | 'production' | 'test') || 'development',
    logLevel: (process.env.UC_LOG_LEVEL as 'debug' | 'info' | 'warn' | 'error') || 'info',
    corsOrigins: process.env.UC_CORS_ORIGINS
      ? process.env.UC_CORS_ORIGINS.split(',').map((s: string) => s.trim())
      : ['http://localhost:3000'],

    // Auth
    jwtSecret: process.env.JWT_PUBLIC_KEY || process.env.JWT_SECRET || 'dev-secret-change-in-production',
    jwtAlgorithm: (process.env.JWT_ALGORITHM as 'HS256' | 'RS256' | 'ES256') || 'RS256',
    jwtIssuer: process.env.JWT_ISSUER || 'scholarly-auth',
    jwtAudience: process.env.JWT_AUDIENCE || 'scholarly-api',
    publicPaths: [
      '/health',
      '/plugins',
      '/bus/subscriptions',
      '/api/webhooks/*',           // Twilio, SendGrid, Meta webhooks
      '/api/omnichannel/webhooks/*', // Omnichannel provider webhooks
    ],

    // NATS
    natsUrl: process.env.NATS_URL || 'nats://localhost:4222',
    natsSubjectPrefix: process.env.NATS_UC_PREFIX || 'scholarly.uc',
    natsUser: process.env.NATS_USER || '',
    natsPass: process.env.NATS_PASS || '',
    natsEventFilter: process.env.NATS_EVENT_FILTER
      ? process.env.NATS_EVENT_FILTER.split(',').map((s: string) => s.trim())
      : [], // Empty = bridge all events
    natsBidirectional: process.env.NATS_BIDIRECTIONAL !== 'false',

    // Multi-Tenant
    tenantIsolation: (process.env.TENANT_ISOLATION as 'strict' | 'permissive' | 'none') || 'strict',

    // Plugins — start with essential plugins for Sprint 1
    enabledPlugins: process.env.UC_ENABLED_PLUGINS
      ? process.env.UC_ENABLED_PLUGINS.split(',').map((s: string) => s.trim())
      : [
        'video',
        'chat',
        'telephony',
        'notifications',
        'omnichannel',
        'ai-transcription',
      ],
  };
}

// ============================================================================
// §2 — BOOT FUNCTION
// ============================================================================

/**
 * Boot the UC v5.0 platform with full Scholarly integration.
 *
 * This function:
 * 1. Loads configuration from environment
 * 2. Creates the Prisma storage adapter
 * 3. Configures JWT auth middleware
 * 4. Initialises the NATS event bridge
 * 5. Returns the configured platform config ready for UnifiedCommsPlatform
 *
 * The caller (Scholarly's server.ts) uses the returned config to instantiate
 * and start the UC platform:
 *
 *   const { config, natsBridge, storage } = await bootScholarlyUC(prisma);
 *   const platform = new UnifiedCommsPlatform(config);
 *   // ... register plugins ...
 *   await platform.start();
 */
export async function bootScholarlyUC(prismaClient: unknown): Promise<{
  config: PlatformConfig;
  eventBus: EventBus;
  natsBridge: NatsEventBridge;
  storage: PrismaStorageAdapter;
  ucConfig: ScholarlyUCConfig;
}> {
  const ucConfig = loadScholarlyUCConfig();

  console.log('[UC v5.0] Booting with Scholarly integration...');
  console.log(`[UC v5.0] Port: ${ucConfig.port}, WS Port: ${ucConfig.wsPort}`);
  console.log(`[UC v5.0] Tenant Isolation: ${ucConfig.tenantIsolation}`);
  console.log(`[UC v5.0] Enabled Plugins: ${ucConfig.enabledPlugins.join(', ')}`);

  // ── 1. Create Event Bus ──
  const eventBus = new EventBus({ maxHistory: 5000 });

  // ── 2. Create Prisma Storage Adapter ──
  const storage = new PrismaStorageAdapter({
    prisma: prismaClient,
    tenantIsolation: ucConfig.tenantIsolation,
    tableName: 'uc_kv_store',
  });

  // Verify database connection
  const healthCheck = await storage.healthCheck();
  if (healthCheck.status === 'unhealthy') {
    console.error(`[UC v5.0] Database health check FAILED: ${healthCheck.message}`);
    throw new Error(`UC v5.0 cannot start: database unreachable. ${healthCheck.message}`);
  }
  console.log('[UC v5.0] Database connection verified ✓');

  // ── 3. Configure Auth ──
  const authConfig: ScholarlyAuthConfig = {
    jwtSecret: ucConfig.jwtSecret,
    jwtAlgorithm: ucConfig.jwtAlgorithm,
    jwtIssuer: ucConfig.jwtIssuer,
    jwtAudience: ucConfig.jwtAudience,
    publicPaths: ucConfig.publicPaths,
  };

  // ── 4. Configure NATS Bridge ──
  const natsConfig: NatsBridgeConfig = {
    url: ucConfig.natsUrl,
    subjectPrefix: ucConfig.natsSubjectPrefix,
    eventFilter: ucConfig.natsEventFilter,
    bidirectional: ucConfig.natsBidirectional,
    credentials: ucConfig.natsUser
      ? { user: ucConfig.natsUser, pass: ucConfig.natsPass }
      : undefined,
  };

  const natsBridge = new NatsEventBridge(eventBus, natsConfig);

  // Connect to NATS (non-blocking — platform works without NATS)
  await natsBridge.connect();

  const natsHealth = await natsBridge.healthCheck();
  if (natsHealth.status === 'healthy') {
    console.log(`[UC v5.0] NATS bridge connected: ${natsHealth.message} ✓`);
  } else {
    console.warn(`[UC v5.0] NATS bridge: ${natsHealth.message} (operating without NATS)`);
  }

  // ── 5. Build Platform Config ──
  const config = mergeConfig({
    port: ucConfig.port,
    wsPort: ucConfig.wsPort,
    jwtSecret: ucConfig.jwtSecret,
    nodeEnv: ucConfig.nodeEnv,
    logLevel: ucConfig.logLevel,
    corsOrigins: ucConfig.corsOrigins,
    prismaClient,
    natsConfig,
    authConfig,
    tenantIsolation: ucConfig.tenantIsolation,
    plugins: {},
  });

  console.log('[UC v5.0] Platform configuration assembled ✓');
  console.log('[UC v5.0] Boot complete. Ready for plugin registration.');

  return { config, eventBus, natsBridge, storage, ucConfig };
}

// ============================================================================
// §3 — NATS EVENT NAMESPACE MAP
// ============================================================================

/**
 * Maps UC internal event types to their NATS subjects under the
 * scholarly.uc.* namespace. This is the Rosetta Stone that lets
 * external Scholarly services listen for specific UC events.
 *
 * Example:
 *   UC internal:  'room:created'
 *   NATS subject:  'scholarly.uc.room.created'
 *
 * The NatsEventBridge handles this transformation automatically via
 * the `subjectPrefix` config. This map is documented here for reference
 * by other Scholarly services that want to subscribe to UC events.
 */
export const UC_NATS_SUBJECTS = {
  // Video conferencing
  'room:created':                'scholarly.uc.room.created',
  'room:closed':                 'scholarly.uc.room.closed',
  'room:participant-joined':     'scholarly.uc.room.participant-joined',
  'room:participant-left':       'scholarly.uc.room.participant-left',
  'room:recording-started':      'scholarly.uc.room.recording-started',
  'room:recording-stopped':      'scholarly.uc.room.recording-stopped',

  // Chat
  'chat:channel-created':        'scholarly.uc.chat.channel-created',
  'chat:message-sent':           'scholarly.uc.chat.message-sent',

  // Telephony
  'call:initiated':              'scholarly.uc.call.initiated',
  'call:completed':              'scholarly.uc.call.completed',

  // Omnichannel
  'omnichannel:conversation-created':    'scholarly.uc.omnichannel.conversation-created',
  'omnichannel:message-received':        'scholarly.uc.omnichannel.message-received',
  'omnichannel:message-sent':            'scholarly.uc.omnichannel.message-sent',

  // AI Meeting Intelligence
  'transcription:completed':     'scholarly.uc.transcription.completed',
  'meeting-notes:generated':     'scholarly.uc.meeting-notes.generated',

  // Notifications
  'notification:queued':         'scholarly.uc.notification.queued',
  'notification:delivered':      'scholarly.uc.notification.delivered',

  // Scheduling
  'meeting:scheduled':           'scholarly.uc.meeting.scheduled',
  'meeting:cancelled':           'scholarly.uc.meeting.cancelled',

  // CRM
  'crm:contact-synced':          'scholarly.uc.crm.contact-synced',
  'crm:activity-logged':         'scholarly.uc.crm.activity-logged',

  // Webinar (Competition Platform dependency)
  'webinar:broadcast-started':   'scholarly.uc.webinar.broadcast-started',
  'webinar:broadcast-ended':     'scholarly.uc.webinar.broadcast-ended',
  'webinar:participant-joined':  'scholarly.uc.webinar.participant-joined',

  // Approval Workflow
  'approval:request-submitted':  'scholarly.uc.approval.request-submitted',
  'approval:request-approved':   'scholarly.uc.approval.request-approved',
  'approval:request-rejected':   'scholarly.uc.approval.request-rejected',
} as const;

/**
 * Competition Platform UC event dependencies (from architecture doc §4).
 * These are the specific NATS subjects the Competition Platform subscribes to.
 * Documented here to make the dependency explicit and verifiable.
 */
export const COMPETITION_PLATFORM_UC_DEPS = {
  /** Live dictation delivery: tutor broadcasts to all students */
  dictationDelivery: [
    'scholarly.uc.webinar.broadcast-started',
    'scholarly.uc.webinar.broadcast-ended',
    'scholarly.uc.webinar.participant-joined',
  ],
  /** Priority EOI notifications: email/SMS/in-app for competition announcements */
  eoiNotifications: [
    'scholarly.uc.notification.queued',
    'scholarly.uc.notification.delivered',
  ],
  /** Jury video conferencing: judges deliberate via video rooms */
  juryJudging: [
    'scholarly.uc.room.created',
    'scholarly.uc.room.participant-joined',
    'scholarly.uc.room.recording-started',
  ],
  /** Organiser-school messaging: direct communication channel */
  organiserMessaging: [
    'scholarly.uc.chat.channel-created',
    'scholarly.uc.chat.message-sent',
  ],
} as const;

// ============================================================================
// §4 — PLUGIN REGISTRATION HELPER
// ============================================================================

/**
 * Helper to dynamically import and register UC plugins based on the
 * enabled plugins configuration. This avoids importing all plugins
 * when only a subset is needed.
 *
 * Usage:
 *   const platform = new UnifiedCommsPlatform(config);
 *   await registerEnabledPlugins(platform, ucConfig.enabledPlugins);
 *   await platform.start();
 */
export async function getEnabledPluginImports(enabledPlugins: string[]): Promise<Record<string, string>> {
  /**
   * Maps plugin IDs to their import paths within the UC package.
   * In production, these resolve from '@scholarly/unified-communications/plugins/*'.
   * During Sprint 1, they resolve from the extracted uc-v4 directory.
   */
  const pluginImportMap: Record<string, string> = {
    'video':             '../uc-v4/src/plugins/video',
    'chat':              '../uc-v4/src/plugins/chat',
    'telephony':         '../uc-v4/src/plugins/telephony',
    'cloud-files':       '../uc-v4/src/plugins/cloud-files',
    'whiteboard':        '../uc-v4/src/plugins/whiteboard',
    'crm':               '../uc-v4/src/plugins/crm-connector',
    'omnichannel':       '../uc-v4/src/plugins/omnichannel-inbox',
    'ai-transcription':  '../uc-v4/src/plugins/ai-transcription',
    'translation':       '../uc-v4/src/plugins/translation',
    'agentic-ai':        '../uc-v4/src/plugins/agentic-ai',
    'notifications':     '../uc-v4/src/plugins/notifications',
    'scheduling':        '../uc-v4/src/plugins/scheduling',
    'search':            '../uc-v4/src/plugins/search-archive',
    'analytics':         '../uc-v4/src/plugins/analytics',
    'compliance':        '../uc-v4/src/plugins/compliance',
    'webinar':           '../uc-v4/src/plugins/webinar',
    'approval-workflow': '../uc-v4/src/plugins/approval-workflow',
  };

  const result: Record<string, string> = {};
  for (const pluginId of enabledPlugins) {
    const importPath = pluginImportMap[pluginId];
    if (importPath) {
      result[pluginId] = importPath;
    } else {
      console.warn(`[UC v5.0] Unknown plugin ID: '${pluginId}'. Skipping.`);
    }
  }

  return result;
}

// ============================================================================
// §5 — GRACEFUL SHUTDOWN
// ============================================================================

/**
 * Shutdown handler for the UC platform. Should be called from Scholarly's
 * process signal handlers (SIGTERM, SIGINT).
 */
export async function shutdownScholarlyUC(
  natsBridge: NatsEventBridge,
): Promise<void> {
  console.log('[UC v5.0] Shutting down...');

  await natsBridge.shutdown();

  console.log('[UC v5.0] Shutdown complete.');
}

export default bootScholarlyUC;
