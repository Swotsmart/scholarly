/**
 * Little Explorers - Early Years Education Platform
 * 
 * A comprehensive, AI-enabled classroom management and communication platform
 * designed for Early Years Education (ages 3-7), families, and educators.
 * 
 * ## Overview
 * 
 * Little Explorers transforms early years education by:
 * 
 * 1. **Reducing Teacher Cognitive Load**: AI automatically suggests behaviour
 *    points, drafts parent communications, tags portfolio items with curriculum
 *    codes, and generates progress narratives - letting teachers focus on
 *    teaching rather than admin.
 * 
 * 2. **Engaging Young Learners**: Monster avatars that level up, celebration
 *    animations, streaks, and age-appropriate interfaces make positive
 *    behaviour reinforcement fun and motivating.
 * 
 * 3. **Connecting Families**: Real-time updates through Class Story, instant
 *    messaging with auto-translation, digital portfolios, and comprehensive
 *    progress reports keep parents informed and engaged.
 * 
 * 4. **Ensuring Safety**: COPPA/FERPA/GDPR compliant, with safeguarding
 *    monitoring, consent management, and secure data handling.
 * 
 * ## Architecture
 * 
 * ```
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │                          LITTLE EXPLORERS                               │
 * │                                                                         │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │
 * │  │  Behaviour  │  │Communication│  │  Portfolio  │  │  Classroom  │   │
 * │  │   Service   │  │   Service   │  │   Service   │  │   Toolkit   │   │
 * │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘   │
 * │         │                │                │                │          │
 * │         └────────────────┼────────────────┼────────────────┘          │
 * │                          ▼                                            │
 * │                 ┌─────────────────┐                                   │
 * │                 │   AI SERVICE    │ ← The brain that reduces          │
 * │                 │                 │   cognitive load                  │
 * │                 │ • Suggestions   │                                   │
 * │                 │ • Insights      │                                   │
 * │                 │ • Drafts        │                                   │
 * │                 │ • Tagging       │                                   │
 * │                 │ • Safeguarding  │                                   │
 * │                 └─────────────────┘                                   │
 * │                          │                                            │
 * │         ┌────────────────┼────────────────┐                          │
 * │         ▼                ▼                ▼                          │
 * │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                   │
 * │  │  Event Bus  │  │    Cache    │  │  Database   │                   │
 * │  │   (NATS)    │  │   (Redis)   │  │ (PostgreSQL)│                   │
 * │  └─────────────┘  └─────────────┘  └─────────────┘                   │
 * │                                                                       │
 * └───────────────────────────────────────────────────────────────────────┘
 * ```
 * 
 * ## Modules
 * 
 * - **Types**: Comprehensive type definitions for all domains
 * - **Infrastructure**: Logging, events, caching, base service
 * - **AI Service**: Central intelligence layer for all AI features
 * - **Behaviour Service**: Explorer Points, skills, celebrations
 * - **Communication Service**: Stories, messaging, events (coming soon)
 * - **Portfolio Service**: Digital portfolios, activities (coming soon)
 * 
 * ## Getting Started
 * 
 * ```typescript
 * import {
 *   initializeInfrastructure,
 *   createAIService,
 *   createBehaviourService
 * } from 'little-explorers';
 * 
 * // Initialize infrastructure
 * const { eventBus, cache, config } = initializeInfrastructure();
 * 
 * // Create AI service
 * const aiService = createAIService({ eventBus, cache, config });
 * 
 * // Create Behaviour service
 * const behaviourService = createBehaviourService(
 *   { eventBus, cache, config },
 *   repositories,
 *   aiService
 * );
 * 
 * // Award points
 * const result = await behaviourService.awardPoints({
 *   tenantId: 'school_123',
 *   schoolId: 'sch_456',
 *   classroomId: 'class_789',
 *   awardedBy: 'teacher_001',
 *   studentIds: ['student_abc'],
 *   skillId: 'skill_kind_hearts'
 * });
 * ```
 * 
 * @module LittleExplorers
 * @version 1.0.0
 */

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Core types
export * from './types/core.types';

// Domain types
export * from './types/behaviour.types';
export * from './types/communication.types';
export * from './types/portfolio.types';
export * from './types/ai.types';

// ============================================================================
// INFRASTRUCTURE EXPORTS
// ============================================================================

export {
  // Logging
  Logger,
  LogLevel,
  LogContext,
  ConsoleLogger,
  createLogger,
  
  // Event Bus
  LittleExplorersEvent,
  EventHandler,
  EventBus,
  InMemoryEventBus,
  
  // Cache
  Cache,
  InMemoryCache,
  
  // Configuration
  LittleExplorersConfig,
  DEFAULT_CONFIG,
  
  // Base Service
  ServiceDependencies,
  LittleExplorersBaseService,
  
  // Factory functions
  initializeInfrastructure,
  getEventBus,
  getCache,
  getConfig
} from './infrastructure';

// ============================================================================
// AI SERVICE EXPORTS
// ============================================================================

export {
  LittleExplorersAIService,
  createAIService
} from './ai/ai-service';

// ============================================================================
// SERVICE EXPORTS
// ============================================================================

export {
  BehaviourService,
  createBehaviourService
} from './services/behaviour-service';

export {
  CommunicationService,
  createCommunicationService
} from './services/communication-service';

export {
  PortfolioService,
  createPortfolioService
} from './services/portfolio-service';

// ============================================================================
// API EXPORTS
// ============================================================================

export {
  createAPIRouter,
  createBehaviourRoutes,
  createCommunicationRoutes,
  createPortfolioRoutes,
  authenticate,
  requireRole,
  requireClassroomAccess,
  errorHandler
} from './api/routes';

// ============================================================================
// VERSION
// ============================================================================

export const VERSION = '1.0.0';
export const MODULE_NAME = 'Little Explorers';
export const DESCRIPTION = 'AI-Enabled Early Years Education Platform';

/**
 * Module capabilities
 */
export const CAPABILITIES = {
  behaviour: [
    'Explorer Points System',
    'AI-powered suggestions',
    'Group & whole-class awards',
    'Streak tracking',
    'Milestone celebrations',
    'Comprehensive analytics'
  ],
  communication: [
    'Class Story feed',
    'Direct messaging',
    'AI message drafts',
    '20+ language translation',
    'Quiet hours',
    'Emergency alerts',
    'Calendar with RSVP'
  ],
  portfolio: [
    'Multi-media portfolios',
    'AI curriculum tagging',
    'Learning activities',
    'Teacher observations',
    'Milestone detection',
    'Progress reports',
    'Student QR login'
  ]
};

// ============================================================================
// DEFAULT EXPORTS (for convenience)
// ============================================================================

export default {
  VERSION,
  MODULE_NAME,
  DESCRIPTION,
  CAPABILITIES
};
