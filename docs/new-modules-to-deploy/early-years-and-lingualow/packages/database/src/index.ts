/**
 * Scholarly Platform - Database Package
 * 
 * Exports Prisma client, repositories, and database utilities.
 * 
 * @module @scholarly/database
 */

// Client and utilities
export {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
  withDatabase,
  withTransaction,
  excludeDeleted,
  softDeleteData,
  paginationToSkipTake,
  buildOrderBy,
  Prisma,
  PrismaClient,
} from './client.js';

export type {
  TransactionClient,
  PaginationParams,
} from './client.js';

// Prisma types
export type {
  Tenant,
  User,
  RefreshToken,
  AuditLog,
  EarlyYearsFamily,
  EarlyYearsChild,
  EarlyYearsPicturePassword,
  EarlyYearsPhonicsProgress,
  EarlyYearsNumeracyProgress,
  EarlyYearsSession,
  EarlyYearsActivity,
  LanguageLearnerProfile,
  LanguageVocabularyProgress,
  LanguageVocabularyItem,
  LanguageHeritagePathway,
  LanguageConversation,
  LanguageAchievement,
  LanguageLearnerAchievement,
  LanguageOfflinePackage,
  LearningEvent,
  MLPrediction,
} from './client.js';

// Base repository
export {
  BaseRepository,
  TenantScopedRepository,
} from './repositories/base.repository.js';

export type {
  BaseEntity,
  TenantEntity,
  FindOptions,
  FindManyOptions,
} from './repositories/base.repository.js';

// User repository
export {
  UserRepository,
  userRepository,
} from './repositories/user.repository.js';

// Early Years repositories
export {
  FamilyRepository,
  ChildRepository,
  SessionRepository,
  ActivityRepository,
  PhonicsProgressRepository,
  PicturePasswordRepository,
  familyRepository,
  childRepository,
  sessionRepository,
  activityRepository,
  phonicsProgressRepository,
  picturePasswordRepository,
} from './repositories/early-years.repository.js';

// LinguaFlow repositories
export {
  LanguageProfileRepository,
  VocabularyProgressRepository,
  VocabularyItemRepository,
  ConversationRepository,
  HeritagePathwayRepository,
  AchievementRepository,
  LearnerAchievementRepository,
  languageProfileRepository,
  vocabularyProgressRepository,
  vocabularyItemRepository,
  conversationRepository,
  heritagePathwayRepository,
  achievementRepository,
  learnerAchievementRepository,
} from './repositories/linguaflow.repository.js';
