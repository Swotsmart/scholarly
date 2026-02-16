-- CreateEnum
CREATE TYPE "DIDStatus" AS ENUM ('ACTIVE', 'DEACTIVATED', 'REVOKED');

-- CreateEnum
CREATE TYPE "KeyType" AS ENUM ('Ed25519', 'secp256k1', 'P256');

-- CreateEnum
CREATE TYPE "KeyStatus" AS ENUM ('KEY_ACTIVE', 'ROTATED', 'KEY_REVOKED', 'KEY_EXPIRED');

-- CreateEnum
CREATE TYPE "KeyRotationReason" AS ENUM ('SCHEDULED', 'COMPROMISE_SUSPECTED', 'USER_REQUESTED', 'POLICY');

-- CreateEnum
CREATE TYPE "WalletStatus" AS ENUM ('WALLET_ACTIVE', 'WALLET_LOCKED', 'RECOVERING', 'WALLET_DEACTIVATED');

-- CreateEnum
CREATE TYPE "StatusListPurpose" AS ENUM ('REVOCATION', 'SUSPENSION');

-- AlterTable
ALTER TABLE "CreatorProfile" ADD COLUMN     "avgEngagement" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isVerifiedEducator" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastActiveAt" TIMESTAMP(3),
ADD COLUMN     "onboardingPhase" TEXT NOT NULL DEFAULT 'REGISTERED',
ADD COLUMN     "specialisations" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "tenantId" TEXT,
ADD COLUMN     "tier" TEXT NOT NULL DEFAULT 'NEWCOMER',
ADD COLUMN     "totalDrafts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalPublished" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EarlyYearsFamily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "primaryUserId" TEXT NOT NULL,
    "familyName" TEXT,
    "primaryLanguage" TEXT NOT NULL DEFAULT 'en',
    "homeLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "subscriptionTier" TEXT NOT NULL DEFAULT 'free',
    "subscriptionStatus" TEXT NOT NULL DEFAULT 'active',
    "subscriptionExpiresAt" TIMESTAMP(3),
    "totalLearningMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "dataProcessingConsent" BOOLEAN NOT NULL DEFAULT false,
    "dataProcessingConsentAt" TIMESTAMP(3),
    "consentIpAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EarlyYearsFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyYearsChild" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "preferredName" TEXT,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "avatarId" TEXT,
    "currentWorld" TEXT NOT NULL DEFAULT 'sound_discovery',
    "currentMentor" TEXT NOT NULL DEFAULT 'mimo_owl',
    "totalTreasures" INTEGER NOT NULL DEFAULT 0,
    "totalStars" INTEGER NOT NULL DEFAULT 0,
    "totalLearningMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "EarlyYearsChild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyYearsPicturePassword" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "imageSequenceHash" TEXT NOT NULL,
    "sequenceLength" INTEGER NOT NULL,
    "failedAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "lastAttemptAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EarlyYearsPicturePassword_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyYearsPhonicsProgress" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "currentPhase" INTEGER NOT NULL DEFAULT 1,
    "masteredGraphemes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "introducedGraphemes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strugglingGraphemes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blendingAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "segmentingAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sightWordsMastered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sightWordsIntroduced" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "graphemeHistory" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EarlyYearsPhonicsProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyYearsNumeracyProgress" (
    "id" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "currentLevel" TEXT NOT NULL DEFAULT 'foundations',
    "reliableCountingRange" INTEGER NOT NULL DEFAULT 5,
    "highestNumberRecognised" INTEGER NOT NULL DEFAULT 10,
    "subitizingAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "additionAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "subtractionAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "numeralsRecognized" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "operationsIntroduced" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "shapesKnown" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "operationHistory" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EarlyYearsNumeracyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyYearsSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "childId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL DEFAULT 'learning',
    "world" TEXT NOT NULL,
    "mentor" TEXT NOT NULL,
    "maxDurationMinutes" INTEGER NOT NULL DEFAULT 15,
    "maxActivities" INTEGER NOT NULL DEFAULT 10,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalActivities" INTEGER NOT NULL DEFAULT 0,
    "activitiesCompleted" INTEGER NOT NULL DEFAULT 0,
    "graphemesPracticed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "numbersPracticed" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "treasuresEarned" INTEGER NOT NULL DEFAULT 0,
    "starsEarned" INTEGER NOT NULL DEFAULT 0,
    "averageFocusScore" DOUBLE PRECISION,
    "childMoodRating" INTEGER,
    "parentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EarlyYearsSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyYearsActivity" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "activityType" TEXT NOT NULL,
    "targetContent" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "difficulty" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,
    "score" DOUBLE PRECISION,
    "attempts" INTEGER NOT NULL DEFAULT 1,
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "errorsCommitted" INTEGER NOT NULL DEFAULT 0,
    "responseData" JSONB NOT NULL DEFAULT '{}',
    "treasureAwarded" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "EarlyYearsActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageLearnerProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "targetLanguage" TEXT NOT NULL,
    "nativeLanguage" TEXT NOT NULL,
    "additionalLanguages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "overallLevel" TEXT NOT NULL DEFAULT 'A1',
    "listeningLevel" TEXT NOT NULL DEFAULT 'A1',
    "speakingLevel" TEXT NOT NULL DEFAULT 'A1',
    "readingLevel" TEXT NOT NULL DEFAULT 'A1',
    "writingLevel" TEXT NOT NULL DEFAULT 'A1',
    "isHeritageSpeaker" BOOLEAN NOT NULL DEFAULT false,
    "curriculumFramework" TEXT NOT NULL DEFAULT 'ACARA',
    "yearLevel" TEXT,
    "ibProgramme" TEXT,
    "ibPhaseOrLevel" TEXT,
    "ibCriteriaScores" JSONB NOT NULL DEFAULT '{}',
    "currentLevel" INTEGER NOT NULL DEFAULT 1,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "currentStreak" INTEGER NOT NULL DEFAULT 0,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,
    "totalLearningMinutes" INTEGER NOT NULL DEFAULT 0,
    "totalSpeakingMinutes" INTEGER NOT NULL DEFAULT 0,
    "lastActiveAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "offlineDataVersion" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "LanguageLearnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageVocabularyProgress" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "totalWordsExposed" INTEGER NOT NULL DEFAULT 0,
    "totalWordsMastered" INTEGER NOT NULL DEFAULT 0,
    "totalWordsLearning" INTEGER NOT NULL DEFAULT 0,
    "cefrCoverage" JSONB NOT NULL DEFAULT '{}',
    "topicCoverage" JSONB NOT NULL DEFAULT '{}',
    "dueForReview" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3),
    "averageRetentionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageVocabularyProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageVocabularyItem" (
    "id" TEXT NOT NULL,
    "progressId" TEXT NOT NULL,
    "wordId" TEXT NOT NULL,
    "word" TEXT NOT NULL,
    "translation" TEXT NOT NULL,
    "cefrLevel" TEXT NOT NULL DEFAULT 'A1',
    "partOfSpeech" TEXT,
    "exampleSentence" TEXT,
    "audioUrl" TEXT,
    "masteryLevel" TEXT NOT NULL DEFAULT 'new',
    "easeFactor" DOUBLE PRECISION NOT NULL DEFAULT 2.5,
    "interval" INTEGER NOT NULL DEFAULT 0,
    "repetitions" INTEGER NOT NULL DEFAULT 0,
    "nextReviewAt" TIMESTAMP(3),
    "timesCorrect" INTEGER NOT NULL DEFAULT 0,
    "timesIncorrect" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptCorrect" BOOLEAN,
    "firstEncounteredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastPracticedAt" TIMESTAMP(3),
    "masteredAt" TIMESTAMP(3),
    "pronunciationScore" DOUBLE PRECISION,
    "availableOffline" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LanguageVocabularyItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageHeritagePathway" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "pathwayType" TEXT NOT NULL,
    "assessmentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "oralProficiency" TEXT NOT NULL,
    "literacyLevel" TEXT NOT NULL,
    "academicRegisterLevel" TEXT NOT NULL,
    "dialectFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "focusAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skipAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "acceleratedTopics" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "literacyMilestones" JSONB NOT NULL DEFAULT '{}',
    "registerProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageHeritagePathway_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageConversation" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "cefrLevel" TEXT NOT NULL,
    "aiRole" TEXT,
    "aiPersona" TEXT,
    "scenarioId" TEXT,
    "scenarioTitle" TEXT,
    "targetVocabulary" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "targetStructures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER NOT NULL DEFAULT 0,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "fluencyScore" DOUBLE PRECISION,
    "accuracyScore" DOUBLE PRECISION,
    "overallScore" DOUBLE PRECISION,
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "areasToImprove" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "vocabularyUsed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "errorsNoted" JSONB NOT NULL DEFAULT '[]',
    "xpEarned" INTEGER NOT NULL DEFAULT 0,
    "selfFluencyRating" INTEGER,
    "selfConfidenceRating" INTEGER,
    "isHeritageVariant" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LanguageConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageAchievement" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "iconUrl" TEXT,
    "badgeUrl" TEXT,
    "criteriaType" TEXT NOT NULL,
    "criteriaValue" INTEGER NOT NULL,
    "xpReward" INTEGER NOT NULL DEFAULT 0,
    "rarity" TEXT NOT NULL DEFAULT 'common',
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "language" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageLearnerAchievement" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "currentProgress" INTEGER NOT NULL DEFAULT 0,
    "targetProgress" INTEGER,
    "celebrationShown" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LanguageLearnerAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageOfflinePackage" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "packageType" TEXT NOT NULL,
    "contentSelection" JSONB NOT NULL DEFAULT '{}',
    "vocabularyCount" INTEGER NOT NULL DEFAULT 0,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "estimatedSizeMb" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "estimatedOfflineMinutes" INTEGER NOT NULL DEFAULT 0,
    "downloadStatus" TEXT NOT NULL DEFAULT 'pending',
    "downloadedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "packageVersion" INTEGER NOT NULL DEFAULT 1,
    "offlineProgressData" JSONB NOT NULL DEFAULT '{}',
    "lastOfflineActivityAt" TIMESTAMP(3),
    "pendingSyncItems" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LanguageOfflinePackage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventSource" TEXT NOT NULL,
    "learnerId" TEXT,
    "sessionId" TEXT,
    "payload" JSONB NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processedAt" TIMESTAMP(3),

    CONSTRAINT "LearningEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MLPrediction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "modelVersion" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "predictionType" TEXT NOT NULL,
    "prediction" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),

    CONSTRAINT "MLPrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyYearsConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "characterId" TEXT NOT NULL,
    "sessionId" TEXT,
    "messages" JSONB NOT NULL DEFAULT '[]',
    "topic" TEXT,
    "learningGoal" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EarlyYearsConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EarlyYearsPicturePasswordAttempt" (
    "id" TEXT NOT NULL,
    "passwordId" TEXT NOT NULL,
    "wasSuccessful" BOOLEAN NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "EarlyYearsPicturePasswordAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageVocabularyReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "quality" INTEGER NOT NULL,
    "wasCorrect" BOOLEAN NOT NULL,
    "responseTimeMs" INTEGER,
    "previousInterval" INTEGER NOT NULL,
    "newInterval" INTEGER NOT NULL,
    "previousEasiness" DOUBLE PRECISION NOT NULL,
    "newEasiness" DOUBLE PRECISION NOT NULL,
    "reviewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageVocabularyReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LTIPlatform" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "deploymentId" TEXT NOT NULL,
    "oidcAuthUrl" TEXT NOT NULL,
    "tokenUrl" TEXT NOT NULL,
    "jwksUrl" TEXT NOT NULL,
    "publicKey" TEXT,
    "privateKey" TEXT,
    "keyId" TEXT,
    "accessTokenUrl" TEXT,
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastKeyRotation" TIMESTAMP(3),
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LTIPlatform_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LTITool" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "launchUrl" TEXT NOT NULL,
    "loginUrl" TEXT NOT NULL,
    "redirectUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "deepLinkUrl" TEXT,
    "customParameters" JSONB NOT NULL DEFAULT '{}',
    "scopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "iconUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LTITool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LTIOIDCState" (
    "id" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "loginHint" TEXT NOT NULL,
    "targetLinkUri" TEXT NOT NULL,
    "ltiMessageHint" TEXT,
    "consumed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LTIOIDCState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AGSLineItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "platformId" TEXT NOT NULL,
    "contextId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "scoreMaximum" DOUBLE PRECISION NOT NULL,
    "resourceId" TEXT,
    "resourceLinkId" TEXT,
    "tag" TEXT,
    "startDateTime" TIMESTAMP(3),
    "endDateTime" TIMESTAMP(3),
    "gradesReleased" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AGSLineItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AGSScore" (
    "id" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scoreGiven" DOUBLE PRECISION,
    "scoreMaximum" DOUBLE PRECISION,
    "comment" TEXT,
    "activityProgress" TEXT NOT NULL,
    "gradingProgress" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AGSScore_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AGSResult" (
    "id" TEXT NOT NULL,
    "lineItemId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "resultScore" DOUBLE PRECISION,
    "resultMaximum" DOUBLE PRECISION,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AGSResult_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneRosterConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "tokenUrl" TEXT NOT NULL,
    "scope" TEXT,
    "accessToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "syncStatus" TEXT NOT NULL DEFAULT 'idle',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OneRosterConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneRosterFieldMapping" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "sourceField" TEXT NOT NULL,
    "targetField" TEXT NOT NULL,
    "transform" TEXT,
    "customTransform" TEXT,

    CONSTRAINT "OneRosterFieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OneRosterSyncJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "errorRecords" INTEGER NOT NULL DEFAULT 0,
    "deltaFrom" TIMESTAMP(3),
    "errors" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OneRosterSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CASEFramework" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "uri" TEXT,
    "creator" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "publisher" TEXT,
    "description" TEXT,
    "subject" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "language" TEXT,
    "version" TEXT,
    "adoptionStatus" TEXT NOT NULL DEFAULT 'Draft',
    "sourceUrl" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "document" JSONB NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CASEFramework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CASEItem" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "uri" TEXT,
    "fullStatement" TEXT NOT NULL,
    "humanCodingScheme" TEXT,
    "cfItemType" TEXT,
    "educationLevel" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "abbreviatedStatement" TEXT,
    "conceptKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "listEnumeration" TEXT,
    "language" TEXT,
    "lastChangeDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CASEItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CASEAssociation" (
    "id" TEXT NOT NULL,
    "frameworkId" TEXT,
    "identifier" TEXT NOT NULL,
    "associationType" TEXT NOT NULL,
    "sequenceNumber" INTEGER,
    "originNodeId" TEXT NOT NULL,
    "destinationNodeId" TEXT NOT NULL,
    "lastChangeDateTime" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CASEAssociation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CASEItemMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "frameworkId" TEXT NOT NULL,
    "caseItemId" TEXT NOT NULL,
    "knowledgeGraphNodeId" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "mappedBy" TEXT NOT NULL DEFAULT 'auto',
    "mappedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CASEItemMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AchievementDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "achievementType" TEXT NOT NULL,
    "image" TEXT,
    "criteriaType" TEXT NOT NULL,
    "criteriaNarrative" TEXT,
    "criteriaId" TEXT,
    "alignment" JSONB NOT NULL DEFAULT '[]',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "evidenceDescription" TEXT,
    "resultDescriptions" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AchievementDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeAssertion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "achievementDefinitionId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "recipientIdentityHash" TEXT,
    "issuerId" TEXT NOT NULL,
    "credential" JSONB NOT NULL,
    "verificationType" TEXT NOT NULL,
    "verificationUrl" TEXT,
    "signatureJws" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "nftTokenId" TEXT,
    "nftTransactionHash" TEXT,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BadgeAssertion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BadgeRevocation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "assertionId" TEXT NOT NULL,
    "revokedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" TEXT NOT NULL,

    CONSTRAINT "BadgeRevocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EdFiConnection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "districtName" TEXT NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "oauthUrl" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "schoolYear" INTEGER NOT NULL,
    "namespace" TEXT NOT NULL,
    "apiVersion" TEXT NOT NULL DEFAULT 'v7.0',
    "pageSize" INTEGER NOT NULL DEFAULT 100,
    "rateLimitPerMin" INTEGER NOT NULL DEFAULT 300,
    "syncDirection" TEXT NOT NULL DEFAULT 'inbound',
    "enabledResources" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "accessToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "lastSyncVersion" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EdFiConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EdFiSyncJob" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalRecords" INTEGER NOT NULL DEFAULT 0,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "createdRecords" INTEGER NOT NULL DEFAULT 0,
    "updatedRecords" INTEGER NOT NULL DEFAULT 0,
    "errorRecords" INTEGER NOT NULL DEFAULT 0,
    "skippedRecords" INTEGER NOT NULL DEFAULT 0,
    "lastChangeVersion" INTEGER,
    "errors" JSONB NOT NULL DEFAULT '[]',
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "nextRetryAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EdFiSyncJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EdFiFieldMapping" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "scholarlyField" TEXT NOT NULL,
    "edfiField" TEXT NOT NULL,
    "direction" TEXT NOT NULL DEFAULT 'inbound',
    "transform" TEXT,
    "transformConfig" JSONB,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "defaultValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EdFiFieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EdFiSyncConflict" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "syncJobId" TEXT NOT NULL,
    "resourceType" TEXT NOT NULL,
    "resourceId" TEXT NOT NULL,
    "scholarlyData" JSONB NOT NULL,
    "edfiData" JSONB NOT NULL,
    "conflictFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "resolution" TEXT,
    "resolvedData" JSONB,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EdFiSyncConflict_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EdFiChangeTracker" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "previousValues" JSONB NOT NULL DEFAULT '{}',
    "newValues" JSONB NOT NULL DEFAULT '{}',
    "synced" BOOLEAN NOT NULL DEFAULT false,
    "syncJobId" TEXT,
    "trackedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EdFiChangeTracker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdaptationProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "emaAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "emaResponseTime" DOUBLE PRECISION NOT NULL DEFAULT 5000,
    "emaEngagement" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "emaHintUsage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "emaSkipRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentDifficulty" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "targetSuccessRate" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "sessionCount" INTEGER NOT NULL DEFAULT 0,
    "totalTimeMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lastSessionAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdaptationProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BKTCompetencyState" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "competencyId" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "pLearn" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "pGuess" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "pSlip" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "pKnown" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "observations" INTEGER NOT NULL DEFAULT 0,
    "lastObservationAt" TIMESTAMP(3),
    "masteryHistory" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BKTCompetencyState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdaptationRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "scopeId" TEXT,
    "priority" INTEGER NOT NULL,
    "conditions" JSONB NOT NULL,
    "conditionLogic" TEXT NOT NULL DEFAULT 'AND',
    "action" JSONB NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdaptationRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdaptationEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "ruleId" TEXT,
    "triggerSignals" JSONB NOT NULL,
    "action" JSONB NOT NULL,
    "outcome" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdaptationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuriositySignal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "signalType" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "topicName" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "strength" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "context" JSONB NOT NULL DEFAULT '{}',
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuriositySignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CuriosityProfileCache" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "overallScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "signalCount" INTEGER NOT NULL DEFAULT 0,
    "breadthScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depthScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "questionFrequency" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "explorationRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "clusters" JSONB NOT NULL DEFAULT '[]',
    "emergingInterests" JSONB NOT NULL DEFAULT '[]',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CuriosityProfileCache_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ObjectiveWeightsConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "learnerId" TEXT,
    "cohortId" TEXT,
    "institutionId" TEXT,
    "mastery" DOUBLE PRECISION NOT NULL DEFAULT 0.25,
    "engagement" DOUBLE PRECISION NOT NULL DEFAULT 0.20,
    "efficiency" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "curiosity" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "wellBeing" DOUBLE PRECISION NOT NULL DEFAULT 0.10,
    "breadth" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "depth" DOUBLE PRECISION NOT NULL DEFAULT 0.07,
    "source" TEXT NOT NULL DEFAULT 'default',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ObjectiveWeightsConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OptimizationEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "weightsUsed" JSONB NOT NULL,
    "constraintsApplied" JSONB NOT NULL,
    "paretoFrontSize" INTEGER NOT NULL,
    "selectedPathId" TEXT NOT NULL,
    "computeTimeMs" INTEGER NOT NULL,
    "result" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptimizationEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "decentralized_identifiers" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "method_specific_id" TEXT NOT NULL,
    "controller" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "DIDStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deactivated_at" TIMESTAMP(3),
    "wallet_id" TEXT,

    CONSTRAINT "decentralized_identifiers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "did_documents" (
    "id" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "document_hash" TEXT NOT NULL,
    "fetched_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "did_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_pairs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "key_type" "KeyType" NOT NULL,
    "public_key" TEXT NOT NULL,
    "encrypted_private_key" TEXT NOT NULL,
    "private_key_encryption" TEXT NOT NULL DEFAULT 'AES-256-GCM',
    "kdf" TEXT NOT NULL DEFAULT 'Argon2id',
    "purposes" JSONB NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "status" "KeyStatus" NOT NULL DEFAULT 'KEY_ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3),
    "revoked_at" TIMESTAMP(3),
    "rotated_at" TIMESTAMP(3),
    "rotated_to_key_id" TEXT,

    CONSTRAINT "key_pairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "key_rotation_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "did" TEXT NOT NULL,
    "previous_key_id" TEXT NOT NULL,
    "new_key_id" TEXT NOT NULL,
    "reason" "KeyRotationReason" NOT NULL,
    "rotated_by" TEXT NOT NULL,
    "rotated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "key_rotation_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "digital_wallets" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "primary_did" TEXT NOT NULL,
    "recovery_config" JSONB NOT NULL,
    "encryption_key_id" TEXT NOT NULL,
    "status" "WalletStatus" NOT NULL DEFAULT 'WALLET_ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_accessed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locked_at" TIMESTAMP(3),
    "deactivated_at" TIMESTAMP(3),

    CONSTRAINT "digital_wallets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wallet_backups" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "wallet_id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "encrypted_payload" TEXT NOT NULL,
    "encryption_params" JSONB NOT NULL,
    "checksum" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wallet_backups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifiable_credentials" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "credential_id" TEXT NOT NULL,
    "types" JSONB NOT NULL,
    "issuer_did" TEXT NOT NULL,
    "subject_did" TEXT NOT NULL,
    "wallet_id" TEXT,
    "credential" JSONB NOT NULL,
    "subject_data" JSONB NOT NULL,
    "status_list_index" INTEGER,
    "issuance_date" TIMESTAMP(3) NOT NULL,
    "expiration_date" TIMESTAMP(3),
    "is_revoked" BOOLEAN NOT NULL DEFAULT false,
    "revoked_at" TIMESTAMP(3),
    "revocation_reason" TEXT,
    "revoked_by" TEXT,
    "schema_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verifiable_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_schemas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "credential_type" TEXT NOT NULL,
    "schema" JSONB NOT NULL,
    "author" TEXT NOT NULL,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "valid_jurisdictions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_schemas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_status_lists" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status_list_id" TEXT NOT NULL,
    "purpose" "StatusListPurpose" NOT NULL,
    "encoded_list" TEXT NOT NULL,
    "current_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credential_status_lists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifiable_presentations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "presentation_id" TEXT NOT NULL,
    "holder_did" TEXT NOT NULL,
    "presentation" JSONB NOT NULL,
    "credential_ids" JSONB NOT NULL,
    "challenge" TEXT,
    "domain" TEXT,
    "verified" BOOLEAN,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verifiable_presentations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ssi_event_logs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "did" TEXT,
    "credential_id" TEXT,
    "wallet_id" TEXT,
    "payload" JSONB NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "request_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ssi_event_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoRecording" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "educatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "videoUrl" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "format" TEXT NOT NULL,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "status" TEXT NOT NULL DEFAULT 'processing',
    "transcript" JSONB,
    "aiAnalysis" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VideoRecording_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoShare" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "sharedWith" TEXT NOT NULL,
    "permissions" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VideoShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VideoReviewCycle" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "recordingId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewType" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "comments" JSONB NOT NULL DEFAULT '[]',
    "feedback" JSONB,
    "selfReflection" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VideoReviewCycle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerReviewSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "submissionCount" INTEGER NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PeerReviewSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PeerSubmission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "submitterId" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PeerSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewAssignment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "submissionId" TEXT NOT NULL,
    "review" JSONB,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReviewAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndustryPartner" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "industry" TEXT NOT NULL,
    "contactInfo" JSONB NOT NULL,
    "safeguardingCheck" JSONB,
    "insuranceDetails" JSONB,
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "status" TEXT NOT NULL DEFAULT 'prospective',
    "totalPlacements" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndustryPartner_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndustryOpportunity" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "partnerId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "schedule" JSONB NOT NULL,
    "compensation" JSONB,
    "maxPositions" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IndustryOpportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperienceApplication" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "applicantId" TEXT NOT NULL,
    "coverLetter" TEXT,
    "resume" JSONB,
    "portfolio" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "statusHistory" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExperienceApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExperiencePlacement" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "learningPlan" JSONB,
    "progressLogs" JSONB NOT NULL DEFAULT '[]',
    "evaluations" JSONB NOT NULL DEFAULT '[]',
    "totalHours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'pending_start',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "credentialId" TEXT,

    CONSTRAINT "ExperiencePlacement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PDCourse" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL,
    "pdCredits" DOUBLE PRECISION NOT NULL,
    "modules" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "enrollmentCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PDCourse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PDEnrollment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "educatorId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'enrolled',
    "progress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "moduleProgress" JSONB NOT NULL DEFAULT '[]',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "credentialId" TEXT,

    CONSTRAINT "PDEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PBLProject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "drivingQuestion" TEXT NOT NULL,
    "subjectAreas" TEXT[],
    "gradeLevel" TEXT NOT NULL,
    "estimatedDuration" TEXT NOT NULL,
    "goldStandard" JSONB NOT NULL,
    "milestones" JSONB NOT NULL,
    "resources" JSONB NOT NULL DEFAULT '[]',
    "assessmentPlan" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PBLProject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PBLProjectInstance" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "facilitatorId" TEXT NOT NULL,
    "teamMembers" JSONB NOT NULL,
    "currentPhase" TEXT NOT NULL DEFAULT 'launch',
    "milestoneStatus" JSONB NOT NULL,
    "reflections" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "targetEndDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "finalAssessment" JSONB,

    CONSTRAINT "PBLProjectInstance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PitchSubmission" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "instanceId" TEXT NOT NULL,
    "pitchType" TEXT NOT NULL,
    "duration" INTEGER,
    "audience" TEXT[],
    "panelists" TEXT[],
    "recordingUrl" TEXT,
    "slidesUrl" TEXT,
    "practiceData" JSONB NOT NULL DEFAULT '[]',
    "assessments" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PitchSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceProposal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalId" BIGINT NOT NULL,
    "proposer" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "actions" JSONB NOT NULL DEFAULT '[]',
    "state" TEXT NOT NULL,
    "forVotes" BIGINT NOT NULL DEFAULT 0,
    "againstVotes" BIGINT NOT NULL DEFAULT 0,
    "abstainVotes" BIGINT NOT NULL DEFAULT 0,
    "quorum" BIGINT NOT NULL DEFAULT 0,
    "eta" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GovernanceProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GovernanceVote" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "voter" TEXT NOT NULL,
    "support" TEXT NOT NULL,
    "weight" BIGINT NOT NULL,
    "reason" TEXT,
    "txHash" TEXT,
    "votedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GovernanceVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoteDelegation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "delegator" TEXT NOT NULL,
    "delegateAddress" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "txHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "VoteDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DelegateProfile" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "delegateAddress" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "bio" TEXT,
    "focusAreas" TEXT[],
    "votingPower" BIGINT NOT NULL DEFAULT 0,
    "delegatorCount" INTEGER NOT NULL DEFAULT 0,
    "proposalsVoted" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DelegateProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StakingPool" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "minimumStake" BIGINT NOT NULL,
    "lockPeriodDays" INTEGER NOT NULL,
    "apr" DOUBLE PRECISION NOT NULL,
    "totalStaked" BIGINT NOT NULL DEFAULT 0,
    "capacity" BIGINT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StakingPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StakingPosition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "stakedAmount" BIGINT NOT NULL,
    "earnedRewards" BIGINT NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "stakedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lockUntil" TIMESTAMP(3) NOT NULL,
    "unstakedAt" TIMESTAMP(3),

    CONSTRAINT "StakingPosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PublisherNFT" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tokenId" BIGINT NOT NULL,
    "creator" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "metadataUri" TEXT,
    "validationStatus" TEXT NOT NULL DEFAULT 'pending',
    "validationScores" JSONB NOT NULL DEFAULT '[]',
    "isListed" BOOLEAN NOT NULL DEFAULT false,
    "listPrice" BIGINT,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "totalRevenue" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PublisherNFT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeveloperAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountType" TEXT NOT NULL,
    "supportEmail" TEXT NOT NULL,
    "website" TEXT,
    "verificationStatus" TEXT NOT NULL DEFAULT 'unverified',
    "revenueShare" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "status" TEXT NOT NULL DEFAULT 'pending_review',
    "totalEarnings" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeveloperAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketplaceApp" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "appType" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "status" TEXT NOT NULL DEFAULT 'draft',
    "rating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "installs" INTEGER NOT NULL DEFAULT 0,
    "pricing" JSONB,
    "permissions" TEXT[],
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketplaceApp_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppInstallation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "installScope" TEXT NOT NULL,
    "grantedPermissions" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uninstalledAt" TIMESTAMP(3),

    CONSTRAINT "AppInstallation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "appId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "body" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommunityRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" JSONB NOT NULL DEFAULT '[]',
    "category" TEXT,
    "fundingGoal" BIGINT NOT NULL,
    "currentFunding" BIGINT NOT NULL DEFAULT 0,
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "bountyStatus" TEXT NOT NULL DEFAULT 'open',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommunityRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FundingPledge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "pledgerId" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FundingPledge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BountyClaim" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "developerId" TEXT NOT NULL,
    "proposal" TEXT NOT NULL,
    "milestones" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'proposed',
    "totalPaid" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BountyClaim_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImmersionScenario" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "targetLanguage" TEXT NOT NULL,
    "nativeLanguage" TEXT NOT NULL DEFAULT 'en',
    "cefrLevel" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "supportedTiers" TEXT[],
    "scenes" JSONB NOT NULL,
    "characters" JSONB NOT NULL DEFAULT '[]',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 15,
    "completionCount" INTEGER NOT NULL DEFAULT 0,
    "averageScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ImmersionScenario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImmersionSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "scenarioId" TEXT NOT NULL,
    "activeTier" TEXT NOT NULL,
    "currentSceneId" TEXT,
    "currentNodeId" TEXT,
    "dialogueHistory" JSONB NOT NULL DEFAULT '[]',
    "hintsUsed" INTEGER NOT NULL DEFAULT 0,
    "currentScore" INTEGER NOT NULL DEFAULT 0,
    "pronunciations" JSONB NOT NULL DEFAULT '[]',
    "vocabularyMet" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'active',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "result" JSONB,

    CONSTRAINT "ImmersionSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LanguageExchangeSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "participants" JSONB NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "duration" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "feedback" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LanguageExchangeSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_elevenlabs_configs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "apiKeyScope" TEXT NOT NULL DEFAULT 'full',
    "defaultTTSModel" TEXT NOT NULL DEFAULT 'eleven_multilingual_v2',
    "defaultSTTModel" TEXT NOT NULL DEFAULT 'scribe_v2',
    "preferredLatencyMode" TEXT NOT NULL DEFAULT 'balanced',
    "zeroRetentionMode" BOOLEAN NOT NULL DEFAULT true,
    "enableLogging" BOOLEAN NOT NULL DEFAULT false,
    "dataResidency" TEXT NOT NULL DEFAULT 'auto',
    "monthlyBudgetCredits" INTEGER,
    "alertThresholdPercent" INTEGER,
    "enableVoiceAgents" BOOLEAN NOT NULL DEFAULT false,
    "enableVoiceCloning" BOOLEAN NOT NULL DEFAULT false,
    "enableCustomDicts" BOOLEAN NOT NULL DEFAULT true,
    "maxConcurrentRequests" INTEGER NOT NULL DEFAULT 10,
    "requestsPerMinute" INTEGER NOT NULL DEFAULT 60,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_elevenlabs_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_linguaflow_voices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "elevenLabsVoiceId" TEXT NOT NULL,
    "elevenLabsName" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "language" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "accent" TEXT NOT NULL,
    "dialect" TEXT,
    "gender" TEXT NOT NULL,
    "ageRange" TEXT NOT NULL,
    "speakingStyles" TEXT[],
    "clarity" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "naturalness" DOUBLE PRECISION NOT NULL DEFAULT 0.8,
    "expressiveness" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "suitableFor" TEXT[],
    "certifiedAuthentic" BOOLEAN NOT NULL DEFAULT false,
    "defaultSettings" JSONB NOT NULL DEFAULT '{}',
    "usageCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'active',
    "restrictionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_linguaflow_voices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_conversation_agents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "elevenLabsAgentId" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "alternateVoices" TEXT[],
    "primaryLanguage" TEXT NOT NULL,
    "supportedLanguages" TEXT[],
    "allowLanguageSwitching" BOOLEAN NOT NULL DEFAULT true,
    "systemPrompt" TEXT NOT NULL,
    "firstMessage" TEXT NOT NULL,
    "persona" JSONB NOT NULL,
    "llmModel" TEXT NOT NULL DEFAULT 'claude',
    "customLLMEndpoint" TEXT,
    "temperature" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "maxTokens" INTEGER NOT NULL DEFAULT 1000,
    "knowledgeBaseIds" TEXT[],
    "enabledTools" JSONB NOT NULL DEFAULT '[]',
    "conversationSettings" JSONB NOT NULL,
    "assessmentConfig" JSONB,
    "maxConversationMins" INTEGER NOT NULL DEFAULT 30,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_conversation_agents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_conversation_sessions" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "agentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "learnerId" TEXT,
    "scenarioId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'initializing',
    "websocketSessionId" TEXT,
    "assessmentData" JSONB NOT NULL DEFAULT '{}',
    "languageUsage" JSONB NOT NULL DEFAULT '[]',
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "totalDurationMs" INTEGER NOT NULL DEFAULT 0,
    "creditsUsed" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,

    CONSTRAINT "voice_conversation_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_conversation_turns" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "speaker" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "audioUrl" TEXT,
    "startMs" INTEGER NOT NULL,
    "endMs" INTEGER NOT NULL,
    "language" TEXT NOT NULL,
    "assessment" JSONB,
    "correction" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_conversation_turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_pronunciation_assessments" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "overallScore" INTEGER NOT NULL,
    "accuracyScore" INTEGER NOT NULL,
    "fluencyScore" INTEGER NOT NULL,
    "completenessScore" INTEGER NOT NULL,
    "prosodyScore" INTEGER NOT NULL,
    "transcription" JSONB NOT NULL,
    "wordAnalysis" JSONB NOT NULL,
    "phonemeAnalysis" JSONB,
    "issues" JSONB NOT NULL DEFAULT '[]',
    "suggestions" JSONB NOT NULL DEFAULT '[]',
    "referenceAudioUrl" TEXT,
    "competencyUpdates" JSONB,
    "exerciseId" TEXT,
    "sessionId" TEXT,
    "processingTimeMs" INTEGER NOT NULL,
    "assessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_pronunciation_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_learner_progress" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "overallProficiency" INTEGER NOT NULL DEFAULT 0,
    "proficiencyTrend" TEXT NOT NULL DEFAULT 'stable',
    "pronunciation" JSONB NOT NULL DEFAULT '{}',
    "conversation" JSONB NOT NULL DEFAULT '{}',
    "languageProgress" JSONB NOT NULL DEFAULT '{}',
    "competencyMastery" JSONB NOT NULL DEFAULT '{}',
    "recommendations" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_learner_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_session_reviews" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "reviewerRole" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "ratingAgentApprop" INTEGER NOT NULL,
    "ratingEngagement" INTEGER NOT NULL,
    "ratingOutcomes" INTEGER NOT NULL,
    "ratingPronunciation" INTEGER NOT NULL,
    "ratingFlow" INTEGER NOT NULL,
    "feedback" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "overridePronunciation" DOUBLE PRECISION,
    "overrideGrammar" DOUBLE PRECISION,
    "overrideFluency" DOUBLE PRECISION,
    "overrideReason" TEXT,
    "recommendations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_session_reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_turn_annotations" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "turnId" TEXT NOT NULL,
    "turnSequence" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "targetText" TEXT,
    "startOffset" INTEGER,
    "endOffset" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_turn_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_session_flags" (
    "id" TEXT NOT NULL,
    "reviewId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "turnId" TEXT,
    "requiresEscalation" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "resolution" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_session_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_clone_consents" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "voiceOwnerId" TEXT NOT NULL,
    "voiceOwnerRole" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "consentText" TEXT NOT NULL,
    "consentVersion" TEXT NOT NULL,
    "consentGivenAt" TIMESTAMP(3) NOT NULL,
    "consentMethod" TEXT NOT NULL,
    "allowedPurposes" JSONB NOT NULL,
    "allowedTenants" JSONB NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_clone_consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_clones" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "consentId" TEXT NOT NULL,
    "voiceOwnerId" TEXT NOT NULL,
    "elevenLabsVoiceId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "verifiedLanguages" JSONB NOT NULL,
    "sampleIds" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'creating',
    "qualityScore" DOUBLE PRECISION,
    "totalCharactersGenerated" INTEGER NOT NULL DEFAULT 0,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_clones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_clone_samples" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "cloneId" TEXT,
    "voiceOwnerId" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "audioFormat" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "qualityAssess" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voice_clone_samples_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_dialogue_scripts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "targetLevel" TEXT NOT NULL,
    "curriculumCodes" JSONB,
    "teachingNotes" TEXT,
    "createdBy" TEXT NOT NULL,
    "lines" JSONB NOT NULL,
    "directions" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_dialogue_scripts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_dialogue_characters" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "voiceId" TEXT NOT NULL,
    "voiceSettings" JSONB,
    "personality" TEXT,
    "accentRegion" TEXT,
    "ageGroup" TEXT,

    CONSTRAINT "voice_dialogue_characters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_generated_dialogues" (
    "id" TEXT NOT NULL,
    "scriptId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "audioUrl" TEXT NOT NULL,
    "audioFormat" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "segments" JSONB NOT NULL,
    "totalCredits" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_generated_dialogues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voice_usage_daily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "ttsRequests" INTEGER NOT NULL DEFAULT 0,
    "ttsCharacters" INTEGER NOT NULL DEFAULT 0,
    "ttsCredits" INTEGER NOT NULL DEFAULT 0,
    "ttsCacheHits" INTEGER NOT NULL DEFAULT 0,
    "sttRequests" INTEGER NOT NULL DEFAULT 0,
    "sttMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sttCredits" INTEGER NOT NULL DEFAULT 0,
    "agentSessions" INTEGER NOT NULL DEFAULT 0,
    "agentMinutes" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "agentCredits" INTEGER NOT NULL DEFAULT 0,
    "assessments" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_usage_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaCompetition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "config" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "scheduledAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "currentRound" INTEGER NOT NULL DEFAULT 0,
    "totalRounds" INTEGER NOT NULL DEFAULT 1,
    "storybookId" TEXT,
    "phonicsPhase" TEXT,
    "wagerPool" INTEGER NOT NULL DEFAULT 0,
    "wagerTokenType" TEXT,
    "participantCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaCompetition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaParticipant" (
    "id" TEXT NOT NULL,
    "competitionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teamId" TEXT,
    "type" TEXT NOT NULL DEFAULT 'STUDENT',
    "handicapFactor" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "wagerAmount" INTEGER NOT NULL DEFAULT 0,
    "totalScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "roundScores" JSONB NOT NULL DEFAULT '[]',
    "rank" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'REGISTERED',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaTeam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "description" TEXT,
    "avatarUrl" TEXT,
    "createdBy" TEXT NOT NULL,
    "maxMembers" INTEGER NOT NULL DEFAULT 10,
    "memberCount" INTEGER NOT NULL DEFAULT 0,
    "treasurySparks" INTEGER NOT NULL DEFAULT 0,
    "treasuryGems" INTEGER NOT NULL DEFAULT 0,
    "totalWins" INTEGER NOT NULL DEFAULT 0,
    "totalCompetitions" INTEGER NOT NULL DEFAULT 0,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "streak" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaTeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "contributedSparks" INTEGER NOT NULL DEFAULT 0,
    "contributedGems" INTEGER NOT NULL DEFAULT 0,
    "competitionsPlayed" INTEGER NOT NULL DEFAULT 0,
    "competitionsWon" INTEGER NOT NULL DEFAULT 0,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ArenaTeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaTreasuryVote" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposerId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "purpose" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "votesFor" INTEGER NOT NULL DEFAULT 0,
    "votesAgainst" INTEGER NOT NULL DEFAULT 0,
    "totalVoters" INTEGER NOT NULL DEFAULT 0,
    "requiredApproval" DOUBLE PRECISION NOT NULL DEFAULT 0.5,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaTreasuryVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaTreasuryVoteCast" (
    "id" TEXT NOT NULL,
    "voteId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaTreasuryVoteCast_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaTeamTrade" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposerTeamId" TEXT NOT NULL,
    "recipientTeamId" TEXT NOT NULL,
    "offerTokenType" TEXT NOT NULL,
    "offerAmount" INTEGER NOT NULL,
    "requestTokenType" TEXT NOT NULL,
    "requestAmount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROPOSED',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaTeamTrade_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaTeamChallenge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "challengerTeamId" TEXT NOT NULL,
    "challengedTeamId" TEXT NOT NULL,
    "competitionId" TEXT,
    "wagerAmount" INTEGER NOT NULL DEFAULT 0,
    "wagerTokenType" TEXT,
    "format" TEXT NOT NULL,
    "phonicsPhase" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaTeamChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenBalance" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sparks" INTEGER NOT NULL DEFAULT 0,
    "gems" INTEGER NOT NULL DEFAULT 0,
    "voice" INTEGER NOT NULL DEFAULT 0,
    "stakedSparks" INTEGER NOT NULL DEFAULT 0,
    "stakedGems" INTEGER NOT NULL DEFAULT 0,
    "stakedVoice" INTEGER NOT NULL DEFAULT 0,
    "lifetimeSparksEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeGemsEarned" INTEGER NOT NULL DEFAULT 0,
    "lifetimeVoiceEarned" INTEGER NOT NULL DEFAULT 0,
    "lastEarnedAt" TIMESTAMP(3),
    "lastSpentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TokenBalance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaTokenTransaction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tokenType" TEXT NOT NULL,
    "transactionType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceBefore" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "category" TEXT,
    "referenceId" TEXT,
    "referenceType" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaTokenTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaStakePosition" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "poolType" TEXT NOT NULL,
    "poolId" TEXT,
    "tokenType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "lockedUntil" TIMESTAMP(3) NOT NULL,
    "yieldAccrued" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaStakePosition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaProposal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "specification" JSONB,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "votingStrategy" TEXT NOT NULL DEFAULT 'SIMPLE_MAJORITY',
    "votingStartsAt" TIMESTAMP(3),
    "votingEndsAt" TIMESTAMP(3),
    "executionAt" TIMESTAMP(3),
    "quorumRequired" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "votesFor" INTEGER NOT NULL DEFAULT 0,
    "votesAgainst" INTEGER NOT NULL DEFAULT 0,
    "votesAbstain" INTEGER NOT NULL DEFAULT 0,
    "totalVoters" INTEGER NOT NULL DEFAULT 0,
    "voiceLocked" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaProposal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaVote" (
    "id" TEXT NOT NULL,
    "proposalId" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "choice" TEXT NOT NULL,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "voiceSpent" INTEGER NOT NULL DEFAULT 0,
    "delegatedFrom" TEXT,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ArenaVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ArenaDelegation" (
    "id" TEXT NOT NULL,
    "delegatorId" TEXT NOT NULL,
    "delegateId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "voiceAmount" INTEGER NOT NULL DEFAULT 0,
    "expiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ArenaDelegation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DaoTreasury" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sparksBalance" INTEGER NOT NULL DEFAULT 0,
    "gemsBalance" INTEGER NOT NULL DEFAULT 0,
    "voiceBalance" INTEGER NOT NULL DEFAULT 0,
    "totalAllocated" INTEGER NOT NULL DEFAULT 0,
    "totalSpent" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DaoTreasury_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DaoTreasuryTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "proposalId" TEXT,
    "tokenType" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "direction" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DaoTreasuryTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentBounty" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "requirements" JSONB NOT NULL,
    "reward" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "submissionDeadline" TIMESTAMP(3) NOT NULL,
    "judgingDeadline" TIMESTAMP(3),
    "maxSubmissions" INTEGER NOT NULL DEFAULT 50,
    "currentSubmissions" INTEGER NOT NULL DEFAULT 0,
    "eligibleTiers" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "proposalId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentBounty_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BountySubmission" (
    "id" TEXT NOT NULL,
    "bountyId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "storyId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUBMITTED',
    "automatedScore" DOUBLE PRECISION,
    "communityScore" DOUBLE PRECISION,
    "expertScore" DOUBLE PRECISION,
    "totalScore" DOUBLE PRECISION,
    "feedback" JSONB,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "BountySubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserMenuState" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "items" JSONB NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "lastSyncAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMenuState_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuPushRecord" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskRef" TEXT NOT NULL,
    "targetRole" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "pushType" TEXT NOT NULL DEFAULT 'INSTITUTIONAL',
    "pushedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revokedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MenuPushRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuUsageEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "taskRef" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuUsageEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuAnalyticsDaily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "totalEvents" INTEGER NOT NULL DEFAULT 0,
    "promotions" INTEGER NOT NULL DEFAULT 0,
    "decays" INTEGER NOT NULL DEFAULT 0,
    "seedsAccepted" INTEGER NOT NULL DEFAULT 0,
    "seedsDismissed" INTEGER NOT NULL DEFAULT 0,
    "pushesCreated" INTEGER NOT NULL DEFAULT 0,
    "pushesExpired" INTEGER NOT NULL DEFAULT 0,
    "avgMenuSize" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "topItems" JSONB NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuAnalyticsDaily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MenuSyncLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "action" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MenuSyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EarlyYearsFamily_tenantId_idx" ON "EarlyYearsFamily"("tenantId");

-- CreateIndex
CREATE INDEX "EarlyYearsFamily_subscriptionStatus_idx" ON "EarlyYearsFamily"("subscriptionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "EarlyYearsFamily_tenantId_primaryUserId_key" ON "EarlyYearsFamily"("tenantId", "primaryUserId");

-- CreateIndex
CREATE INDEX "EarlyYearsChild_tenantId_familyId_idx" ON "EarlyYearsChild"("tenantId", "familyId");

-- CreateIndex
CREATE INDEX "EarlyYearsChild_dateOfBirth_idx" ON "EarlyYearsChild"("dateOfBirth");

-- CreateIndex
CREATE INDEX "EarlyYearsChild_status_idx" ON "EarlyYearsChild"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EarlyYearsPicturePassword_childId_key" ON "EarlyYearsPicturePassword"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "EarlyYearsPhonicsProgress_childId_key" ON "EarlyYearsPhonicsProgress"("childId");

-- CreateIndex
CREATE UNIQUE INDEX "EarlyYearsNumeracyProgress_childId_key" ON "EarlyYearsNumeracyProgress"("childId");

-- CreateIndex
CREATE INDEX "EarlyYearsSession_tenantId_childId_idx" ON "EarlyYearsSession"("tenantId", "childId");

-- CreateIndex
CREATE INDEX "EarlyYearsSession_startedAt_idx" ON "EarlyYearsSession"("startedAt");

-- CreateIndex
CREATE INDEX "EarlyYearsSession_childId_startedAt_idx" ON "EarlyYearsSession"("childId", "startedAt");

-- CreateIndex
CREATE INDEX "EarlyYearsActivity_sessionId_idx" ON "EarlyYearsActivity"("sessionId");

-- CreateIndex
CREATE INDEX "EarlyYearsActivity_activityType_idx" ON "EarlyYearsActivity"("activityType");

-- CreateIndex
CREATE INDEX "LanguageLearnerProfile_tenantId_targetLanguage_idx" ON "LanguageLearnerProfile"("tenantId", "targetLanguage");

-- CreateIndex
CREATE INDEX "LanguageLearnerProfile_userId_idx" ON "LanguageLearnerProfile"("userId");

-- CreateIndex
CREATE INDEX "LanguageLearnerProfile_overallLevel_idx" ON "LanguageLearnerProfile"("overallLevel");

-- CreateIndex
CREATE INDEX "LanguageLearnerProfile_status_idx" ON "LanguageLearnerProfile"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageLearnerProfile_tenantId_userId_targetLanguage_key" ON "LanguageLearnerProfile"("tenantId", "userId", "targetLanguage");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageVocabularyProgress_profileId_key" ON "LanguageVocabularyProgress"("profileId");

-- CreateIndex
CREATE INDEX "LanguageVocabularyItem_progressId_nextReviewAt_idx" ON "LanguageVocabularyItem"("progressId", "nextReviewAt");

-- CreateIndex
CREATE INDEX "LanguageVocabularyItem_progressId_masteryLevel_idx" ON "LanguageVocabularyItem"("progressId", "masteryLevel");

-- CreateIndex
CREATE INDEX "LanguageVocabularyItem_cefrLevel_idx" ON "LanguageVocabularyItem"("cefrLevel");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageVocabularyItem_progressId_wordId_key" ON "LanguageVocabularyItem"("progressId", "wordId");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageHeritagePathway_profileId_key" ON "LanguageHeritagePathway"("profileId");

-- CreateIndex
CREATE INDEX "LanguageConversation_profileId_startedAt_idx" ON "LanguageConversation"("profileId", "startedAt");

-- CreateIndex
CREATE INDEX "LanguageConversation_profileId_mode_idx" ON "LanguageConversation"("profileId", "mode");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageAchievement_code_key" ON "LanguageAchievement"("code");

-- CreateIndex
CREATE INDEX "LanguageAchievement_category_idx" ON "LanguageAchievement"("category");

-- CreateIndex
CREATE INDEX "LanguageAchievement_isActive_idx" ON "LanguageAchievement"("isActive");

-- CreateIndex
CREATE INDEX "LanguageLearnerAchievement_profileId_earnedAt_idx" ON "LanguageLearnerAchievement"("profileId", "earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "LanguageLearnerAchievement_profileId_achievementId_key" ON "LanguageLearnerAchievement"("profileId", "achievementId");

-- CreateIndex
CREATE INDEX "LanguageOfflinePackage_profileId_downloadStatus_idx" ON "LanguageOfflinePackage"("profileId", "downloadStatus");

-- CreateIndex
CREATE INDEX "LanguageOfflinePackage_expiresAt_idx" ON "LanguageOfflinePackage"("expiresAt");

-- CreateIndex
CREATE INDEX "LearningEvent_tenantId_eventType_idx" ON "LearningEvent"("tenantId", "eventType");

-- CreateIndex
CREATE INDEX "LearningEvent_tenantId_occurredAt_idx" ON "LearningEvent"("tenantId", "occurredAt");

-- CreateIndex
CREATE INDEX "LearningEvent_learnerId_idx" ON "LearningEvent"("learnerId");

-- CreateIndex
CREATE INDEX "LearningEvent_processedAt_idx" ON "LearningEvent"("processedAt");

-- CreateIndex
CREATE INDEX "MLPrediction_tenantId_learnerId_idx" ON "MLPrediction"("tenantId", "learnerId");

-- CreateIndex
CREATE INDEX "MLPrediction_predictionType_idx" ON "MLPrediction"("predictionType");

-- CreateIndex
CREATE INDEX "MLPrediction_expiresAt_idx" ON "MLPrediction"("expiresAt");

-- CreateIndex
CREATE INDEX "EarlyYearsConversation_tenantId_learnerId_idx" ON "EarlyYearsConversation"("tenantId", "learnerId");

-- CreateIndex
CREATE INDEX "EarlyYearsConversation_characterId_idx" ON "EarlyYearsConversation"("characterId");

-- CreateIndex
CREATE INDEX "EarlyYearsConversation_isActive_idx" ON "EarlyYearsConversation"("isActive");

-- CreateIndex
CREATE INDEX "EarlyYearsPicturePasswordAttempt_passwordId_attemptedAt_idx" ON "EarlyYearsPicturePasswordAttempt"("passwordId", "attemptedAt");

-- CreateIndex
CREATE INDEX "LanguageVocabularyReview_tenantId_learnerId_idx" ON "LanguageVocabularyReview"("tenantId", "learnerId");

-- CreateIndex
CREATE INDEX "LanguageVocabularyReview_cardId_idx" ON "LanguageVocabularyReview"("cardId");

-- CreateIndex
CREATE INDEX "LanguageVocabularyReview_reviewedAt_idx" ON "LanguageVocabularyReview"("reviewedAt");

-- CreateIndex
CREATE INDEX "LTIPlatform_tenantId_idx" ON "LTIPlatform"("tenantId");

-- CreateIndex
CREATE INDEX "LTIPlatform_issuer_idx" ON "LTIPlatform"("issuer");

-- CreateIndex
CREATE UNIQUE INDEX "LTIPlatform_tenantId_issuer_clientId_key" ON "LTIPlatform"("tenantId", "issuer", "clientId");

-- CreateIndex
CREATE INDEX "LTITool_tenantId_idx" ON "LTITool"("tenantId");

-- CreateIndex
CREATE INDEX "LTITool_platformId_idx" ON "LTITool"("platformId");

-- CreateIndex
CREATE UNIQUE INDEX "LTIOIDCState_state_key" ON "LTIOIDCState"("state");

-- CreateIndex
CREATE INDEX "LTIOIDCState_state_idx" ON "LTIOIDCState"("state");

-- CreateIndex
CREATE INDEX "LTIOIDCState_expiresAt_idx" ON "LTIOIDCState"("expiresAt");

-- CreateIndex
CREATE INDEX "AGSLineItem_tenantId_idx" ON "AGSLineItem"("tenantId");

-- CreateIndex
CREATE INDEX "AGSLineItem_platformId_contextId_idx" ON "AGSLineItem"("platformId", "contextId");

-- CreateIndex
CREATE INDEX "AGSScore_lineItemId_userId_idx" ON "AGSScore"("lineItemId", "userId");

-- CreateIndex
CREATE INDEX "AGSResult_lineItemId_userId_idx" ON "AGSResult"("lineItemId", "userId");

-- CreateIndex
CREATE INDEX "OneRosterConnection_tenantId_idx" ON "OneRosterConnection"("tenantId");

-- CreateIndex
CREATE INDEX "OneRosterFieldMapping_connectionId_idx" ON "OneRosterFieldMapping"("connectionId");

-- CreateIndex
CREATE INDEX "OneRosterSyncJob_tenantId_idx" ON "OneRosterSyncJob"("tenantId");

-- CreateIndex
CREATE INDEX "OneRosterSyncJob_connectionId_status_idx" ON "OneRosterSyncJob"("connectionId", "status");

-- CreateIndex
CREATE INDEX "CASEFramework_tenantId_idx" ON "CASEFramework"("tenantId");

-- CreateIndex
CREATE INDEX "CASEFramework_tenantId_adoptionStatus_idx" ON "CASEFramework"("tenantId", "adoptionStatus");

-- CreateIndex
CREATE UNIQUE INDEX "CASEFramework_tenantId_identifier_key" ON "CASEFramework"("tenantId", "identifier");

-- CreateIndex
CREATE INDEX "CASEItem_frameworkId_idx" ON "CASEItem"("frameworkId");

-- CreateIndex
CREATE INDEX "CASEItem_humanCodingScheme_idx" ON "CASEItem"("humanCodingScheme");

-- CreateIndex
CREATE UNIQUE INDEX "CASEItem_frameworkId_identifier_key" ON "CASEItem"("frameworkId", "identifier");

-- CreateIndex
CREATE INDEX "CASEAssociation_frameworkId_idx" ON "CASEAssociation"("frameworkId");

-- CreateIndex
CREATE INDEX "CASEAssociation_originNodeId_idx" ON "CASEAssociation"("originNodeId");

-- CreateIndex
CREATE INDEX "CASEAssociation_destinationNodeId_idx" ON "CASEAssociation"("destinationNodeId");

-- CreateIndex
CREATE INDEX "CASEAssociation_associationType_idx" ON "CASEAssociation"("associationType");

-- CreateIndex
CREATE INDEX "CASEItemMapping_tenantId_idx" ON "CASEItemMapping"("tenantId");

-- CreateIndex
CREATE INDEX "CASEItemMapping_frameworkId_idx" ON "CASEItemMapping"("frameworkId");

-- CreateIndex
CREATE UNIQUE INDEX "CASEItemMapping_caseItemId_knowledgeGraphNodeId_key" ON "CASEItemMapping"("caseItemId", "knowledgeGraphNodeId");

-- CreateIndex
CREATE INDEX "AchievementDefinition_tenantId_idx" ON "AchievementDefinition"("tenantId");

-- CreateIndex
CREATE INDEX "AchievementDefinition_achievementType_idx" ON "AchievementDefinition"("achievementType");

-- CreateIndex
CREATE INDEX "BadgeAssertion_tenantId_idx" ON "BadgeAssertion"("tenantId");

-- CreateIndex
CREATE INDEX "BadgeAssertion_recipientId_idx" ON "BadgeAssertion"("recipientId");

-- CreateIndex
CREATE INDEX "BadgeAssertion_issuerId_idx" ON "BadgeAssertion"("issuerId");

-- CreateIndex
CREATE INDEX "BadgeAssertion_status_idx" ON "BadgeAssertion"("status");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeRevocation_assertionId_key" ON "BadgeRevocation"("assertionId");

-- CreateIndex
CREATE INDEX "BadgeRevocation_tenantId_idx" ON "BadgeRevocation"("tenantId");

-- CreateIndex
CREATE INDEX "EdFiConnection_tenantId_idx" ON "EdFiConnection"("tenantId");

-- CreateIndex
CREATE INDEX "EdFiConnection_tenantId_status_idx" ON "EdFiConnection"("tenantId", "status");

-- CreateIndex
CREATE INDEX "EdFiSyncJob_tenantId_idx" ON "EdFiSyncJob"("tenantId");

-- CreateIndex
CREATE INDEX "EdFiSyncJob_connectionId_status_idx" ON "EdFiSyncJob"("connectionId", "status");

-- CreateIndex
CREATE INDEX "EdFiSyncJob_createdAt_idx" ON "EdFiSyncJob"("createdAt");

-- CreateIndex
CREATE INDEX "EdFiFieldMapping_tenantId_idx" ON "EdFiFieldMapping"("tenantId");

-- CreateIndex
CREATE INDEX "EdFiFieldMapping_connectionId_resourceType_idx" ON "EdFiFieldMapping"("connectionId", "resourceType");

-- CreateIndex
CREATE UNIQUE INDEX "EdFiFieldMapping_connectionId_resourceType_scholarlyField_e_key" ON "EdFiFieldMapping"("connectionId", "resourceType", "scholarlyField", "edfiField");

-- CreateIndex
CREATE INDEX "EdFiSyncConflict_tenantId_idx" ON "EdFiSyncConflict"("tenantId");

-- CreateIndex
CREATE INDEX "EdFiSyncConflict_connectionId_status_idx" ON "EdFiSyncConflict"("connectionId", "status");

-- CreateIndex
CREATE INDEX "EdFiSyncConflict_syncJobId_idx" ON "EdFiSyncConflict"("syncJobId");

-- CreateIndex
CREATE INDEX "EdFiChangeTracker_tenantId_idx" ON "EdFiChangeTracker"("tenantId");

-- CreateIndex
CREATE INDEX "EdFiChangeTracker_connectionId_synced_idx" ON "EdFiChangeTracker"("connectionId", "synced");

-- CreateIndex
CREATE INDEX "EdFiChangeTracker_entityType_entityId_idx" ON "EdFiChangeTracker"("entityType", "entityId");

-- CreateIndex
CREATE UNIQUE INDEX "AdaptationProfile_learnerId_key" ON "AdaptationProfile"("learnerId");

-- CreateIndex
CREATE INDEX "AdaptationProfile_tenantId_idx" ON "AdaptationProfile"("tenantId");

-- CreateIndex
CREATE INDEX "AdaptationProfile_learnerId_idx" ON "AdaptationProfile"("learnerId");

-- CreateIndex
CREATE INDEX "BKTCompetencyState_profileId_idx" ON "BKTCompetencyState"("profileId");

-- CreateIndex
CREATE INDEX "BKTCompetencyState_competencyId_idx" ON "BKTCompetencyState"("competencyId");

-- CreateIndex
CREATE INDEX "BKTCompetencyState_domain_idx" ON "BKTCompetencyState"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "BKTCompetencyState_profileId_competencyId_key" ON "BKTCompetencyState"("profileId", "competencyId");

-- CreateIndex
CREATE INDEX "AdaptationRule_tenantId_idx" ON "AdaptationRule"("tenantId");

-- CreateIndex
CREATE INDEX "AdaptationRule_tenantId_scope_isActive_idx" ON "AdaptationRule"("tenantId", "scope", "isActive");

-- CreateIndex
CREATE INDEX "AdaptationRule_priority_idx" ON "AdaptationRule"("priority");

-- CreateIndex
CREATE INDEX "AdaptationEvent_tenantId_learnerId_idx" ON "AdaptationEvent"("tenantId", "learnerId");

-- CreateIndex
CREATE INDEX "AdaptationEvent_profileId_idx" ON "AdaptationEvent"("profileId");

-- CreateIndex
CREATE INDEX "AdaptationEvent_timestamp_idx" ON "AdaptationEvent"("timestamp");

-- CreateIndex
CREATE INDEX "CuriositySignal_tenantId_learnerId_idx" ON "CuriositySignal"("tenantId", "learnerId");

-- CreateIndex
CREATE INDEX "CuriositySignal_learnerId_topicId_idx" ON "CuriositySignal"("learnerId", "topicId");

-- CreateIndex
CREATE INDEX "CuriositySignal_learnerId_signalType_idx" ON "CuriositySignal"("learnerId", "signalType");

-- CreateIndex
CREATE INDEX "CuriositySignal_recordedAt_idx" ON "CuriositySignal"("recordedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CuriosityProfileCache_learnerId_key" ON "CuriosityProfileCache"("learnerId");

-- CreateIndex
CREATE INDEX "CuriosityProfileCache_tenantId_idx" ON "CuriosityProfileCache"("tenantId");

-- CreateIndex
CREATE INDEX "CuriosityProfileCache_learnerId_idx" ON "CuriosityProfileCache"("learnerId");

-- CreateIndex
CREATE INDEX "ObjectiveWeightsConfig_tenantId_idx" ON "ObjectiveWeightsConfig"("tenantId");

-- CreateIndex
CREATE INDEX "ObjectiveWeightsConfig_learnerId_idx" ON "ObjectiveWeightsConfig"("learnerId");

-- CreateIndex
CREATE INDEX "ObjectiveWeightsConfig_cohortId_idx" ON "ObjectiveWeightsConfig"("cohortId");

-- CreateIndex
CREATE INDEX "ObjectiveWeightsConfig_institutionId_idx" ON "ObjectiveWeightsConfig"("institutionId");

-- CreateIndex
CREATE UNIQUE INDEX "ObjectiveWeightsConfig_tenantId_learnerId_key" ON "ObjectiveWeightsConfig"("tenantId", "learnerId");

-- CreateIndex
CREATE INDEX "OptimizationEvent_tenantId_learnerId_idx" ON "OptimizationEvent"("tenantId", "learnerId");

-- CreateIndex
CREATE INDEX "OptimizationEvent_timestamp_idx" ON "OptimizationEvent"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "decentralized_identifiers_did_key" ON "decentralized_identifiers"("did");

-- CreateIndex
CREATE INDEX "decentralized_identifiers_tenant_id_user_id_idx" ON "decentralized_identifiers"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "decentralized_identifiers_tenant_id_did_idx" ON "decentralized_identifiers"("tenant_id", "did");

-- CreateIndex
CREATE INDEX "decentralized_identifiers_tenant_id_is_primary_idx" ON "decentralized_identifiers"("tenant_id", "is_primary");

-- CreateIndex
CREATE UNIQUE INDEX "did_documents_did_key" ON "did_documents"("did");

-- CreateIndex
CREATE INDEX "key_pairs_tenant_id_did_idx" ON "key_pairs"("tenant_id", "did");

-- CreateIndex
CREATE INDEX "key_pairs_did_is_primary_idx" ON "key_pairs"("did", "is_primary");

-- CreateIndex
CREATE INDEX "key_rotation_logs_tenant_id_did_idx" ON "key_rotation_logs"("tenant_id", "did");

-- CreateIndex
CREATE UNIQUE INDEX "digital_wallets_user_id_key" ON "digital_wallets"("user_id");

-- CreateIndex
CREATE INDEX "digital_wallets_tenant_id_user_id_idx" ON "digital_wallets"("tenant_id", "user_id");

-- CreateIndex
CREATE INDEX "digital_wallets_tenant_id_primary_did_idx" ON "digital_wallets"("tenant_id", "primary_did");

-- CreateIndex
CREATE INDEX "wallet_backups_tenant_id_wallet_id_idx" ON "wallet_backups"("tenant_id", "wallet_id");

-- CreateIndex
CREATE UNIQUE INDEX "verifiable_credentials_credential_id_key" ON "verifiable_credentials"("credential_id");

-- CreateIndex
CREATE INDEX "verifiable_credentials_tenant_id_subject_did_idx" ON "verifiable_credentials"("tenant_id", "subject_did");

-- CreateIndex
CREATE INDEX "verifiable_credentials_tenant_id_issuer_did_idx" ON "verifiable_credentials"("tenant_id", "issuer_did");

-- CreateIndex
CREATE INDEX "verifiable_credentials_tenant_id_is_revoked_idx" ON "verifiable_credentials"("tenant_id", "is_revoked");

-- CreateIndex
CREATE INDEX "verifiable_credentials_credential_id_idx" ON "verifiable_credentials"("credential_id");

-- CreateIndex
CREATE INDEX "credential_schemas_credential_type_is_default_idx" ON "credential_schemas"("credential_type", "is_default");

-- CreateIndex
CREATE UNIQUE INDEX "credential_schemas_credential_type_version_key" ON "credential_schemas"("credential_type", "version");

-- CreateIndex
CREATE UNIQUE INDEX "credential_status_lists_status_list_id_key" ON "credential_status_lists"("status_list_id");

-- CreateIndex
CREATE INDEX "credential_status_lists_tenant_id_idx" ON "credential_status_lists"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "verifiable_presentations_presentation_id_key" ON "verifiable_presentations"("presentation_id");

-- CreateIndex
CREATE INDEX "verifiable_presentations_tenant_id_holder_did_idx" ON "verifiable_presentations"("tenant_id", "holder_did");

-- CreateIndex
CREATE INDEX "ssi_event_logs_tenant_id_event_type_idx" ON "ssi_event_logs"("tenant_id", "event_type");

-- CreateIndex
CREATE INDEX "ssi_event_logs_tenant_id_actor_id_idx" ON "ssi_event_logs"("tenant_id", "actor_id");

-- CreateIndex
CREATE INDEX "ssi_event_logs_tenant_id_did_idx" ON "ssi_event_logs"("tenant_id", "did");

-- CreateIndex
CREATE INDEX "ssi_event_logs_tenant_id_created_at_idx" ON "ssi_event_logs"("tenant_id", "created_at");

-- CreateIndex
CREATE INDEX "VideoRecording_tenantId_educatorId_idx" ON "VideoRecording"("tenantId", "educatorId");

-- CreateIndex
CREATE INDEX "VideoRecording_tenantId_status_idx" ON "VideoRecording"("tenantId", "status");

-- CreateIndex
CREATE INDEX "VideoShare_tenantId_sharedWith_idx" ON "VideoShare"("tenantId", "sharedWith");

-- CreateIndex
CREATE UNIQUE INDEX "VideoShare_recordingId_sharedWith_key" ON "VideoShare"("recordingId", "sharedWith");

-- CreateIndex
CREATE INDEX "VideoReviewCycle_tenantId_recordingId_idx" ON "VideoReviewCycle"("tenantId", "recordingId");

-- CreateIndex
CREATE INDEX "VideoReviewCycle_tenantId_reviewerId_idx" ON "VideoReviewCycle"("tenantId", "reviewerId");

-- CreateIndex
CREATE INDEX "PeerReviewSession_tenantId_status_idx" ON "PeerReviewSession"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PeerReviewSession_tenantId_creatorId_idx" ON "PeerReviewSession"("tenantId", "creatorId");

-- CreateIndex
CREATE INDEX "PeerSubmission_tenantId_sessionId_idx" ON "PeerSubmission"("tenantId", "sessionId");

-- CreateIndex
CREATE INDEX "PeerSubmission_tenantId_submitterId_idx" ON "PeerSubmission"("tenantId", "submitterId");

-- CreateIndex
CREATE INDEX "ReviewAssignment_tenantId_reviewerId_idx" ON "ReviewAssignment"("tenantId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewAssignment_sessionId_reviewerId_submissionId_key" ON "ReviewAssignment"("sessionId", "reviewerId", "submissionId");

-- CreateIndex
CREATE INDEX "IndustryPartner_tenantId_status_idx" ON "IndustryPartner"("tenantId", "status");

-- CreateIndex
CREATE INDEX "IndustryPartner_tenantId_industry_idx" ON "IndustryPartner"("tenantId", "industry");

-- CreateIndex
CREATE INDEX "IndustryOpportunity_tenantId_status_idx" ON "IndustryOpportunity"("tenantId", "status");

-- CreateIndex
CREATE INDEX "IndustryOpportunity_tenantId_type_idx" ON "IndustryOpportunity"("tenantId", "type");

-- CreateIndex
CREATE INDEX "ExperienceApplication_tenantId_applicantId_idx" ON "ExperienceApplication"("tenantId", "applicantId");

-- CreateIndex
CREATE INDEX "ExperienceApplication_tenantId_status_idx" ON "ExperienceApplication"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ExperienceApplication_opportunityId_applicantId_key" ON "ExperienceApplication"("opportunityId", "applicantId");

-- CreateIndex
CREATE UNIQUE INDEX "ExperiencePlacement_applicationId_key" ON "ExperiencePlacement"("applicationId");

-- CreateIndex
CREATE INDEX "ExperiencePlacement_tenantId_status_idx" ON "ExperiencePlacement"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PDCourse_tenantId_status_idx" ON "PDCourse"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PDCourse_tenantId_category_idx" ON "PDCourse"("tenantId", "category");

-- CreateIndex
CREATE INDEX "PDEnrollment_tenantId_educatorId_idx" ON "PDEnrollment"("tenantId", "educatorId");

-- CreateIndex
CREATE INDEX "PDEnrollment_tenantId_status_idx" ON "PDEnrollment"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PDEnrollment_courseId_educatorId_key" ON "PDEnrollment"("courseId", "educatorId");

-- CreateIndex
CREATE INDEX "PBLProject_tenantId_status_idx" ON "PBLProject"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PBLProjectInstance_tenantId_status_idx" ON "PBLProjectInstance"("tenantId", "status");

-- CreateIndex
CREATE INDEX "PBLProjectInstance_tenantId_facilitatorId_idx" ON "PBLProjectInstance"("tenantId", "facilitatorId");

-- CreateIndex
CREATE INDEX "PitchSubmission_tenantId_instanceId_idx" ON "PitchSubmission"("tenantId", "instanceId");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceProposal_proposalId_key" ON "GovernanceProposal"("proposalId");

-- CreateIndex
CREATE INDEX "GovernanceProposal_tenantId_state_idx" ON "GovernanceProposal"("tenantId", "state");

-- CreateIndex
CREATE INDEX "GovernanceProposal_tenantId_proposer_idx" ON "GovernanceProposal"("tenantId", "proposer");

-- CreateIndex
CREATE INDEX "GovernanceProposal_tenantId_category_idx" ON "GovernanceProposal"("tenantId", "category");

-- CreateIndex
CREATE INDEX "GovernanceVote_tenantId_voter_idx" ON "GovernanceVote"("tenantId", "voter");

-- CreateIndex
CREATE UNIQUE INDEX "GovernanceVote_proposalId_voter_key" ON "GovernanceVote"("proposalId", "voter");

-- CreateIndex
CREATE INDEX "VoteDelegation_tenantId_delegator_idx" ON "VoteDelegation"("tenantId", "delegator");

-- CreateIndex
CREATE INDEX "VoteDelegation_tenantId_delegateAddress_idx" ON "VoteDelegation"("tenantId", "delegateAddress");

-- CreateIndex
CREATE UNIQUE INDEX "DelegateProfile_delegateAddress_key" ON "DelegateProfile"("delegateAddress");

-- CreateIndex
CREATE INDEX "DelegateProfile_tenantId_votingPower_idx" ON "DelegateProfile"("tenantId", "votingPower" DESC);

-- CreateIndex
CREATE INDEX "StakingPool_tenantId_purpose_idx" ON "StakingPool"("tenantId", "purpose");

-- CreateIndex
CREATE INDEX "StakingPosition_tenantId_userId_idx" ON "StakingPosition"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "StakingPosition_tenantId_poolId_idx" ON "StakingPosition"("tenantId", "poolId");

-- CreateIndex
CREATE INDEX "PublisherNFT_tenantId_creator_idx" ON "PublisherNFT"("tenantId", "creator");

-- CreateIndex
CREATE INDEX "PublisherNFT_tenantId_validationStatus_idx" ON "PublisherNFT"("tenantId", "validationStatus");

-- CreateIndex
CREATE UNIQUE INDEX "PublisherNFT_tenantId_tokenId_key" ON "PublisherNFT"("tenantId", "tokenId");

-- CreateIndex
CREATE UNIQUE INDEX "DeveloperAccount_userId_key" ON "DeveloperAccount"("userId");

-- CreateIndex
CREATE INDEX "DeveloperAccount_tenantId_status_idx" ON "DeveloperAccount"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MarketplaceApp_slug_key" ON "MarketplaceApp"("slug");

-- CreateIndex
CREATE INDEX "MarketplaceApp_tenantId_status_idx" ON "MarketplaceApp"("tenantId", "status");

-- CreateIndex
CREATE INDEX "MarketplaceApp_tenantId_category_idx" ON "MarketplaceApp"("tenantId", "category");

-- CreateIndex
CREATE INDEX "AppInstallation_tenantId_userId_idx" ON "AppInstallation"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppInstallation_appId_userId_key" ON "AppInstallation"("appId", "userId");

-- CreateIndex
CREATE INDEX "AppReview_tenantId_appId_idx" ON "AppReview"("tenantId", "appId");

-- CreateIndex
CREATE UNIQUE INDEX "AppReview_appId_userId_key" ON "AppReview"("appId", "userId");

-- CreateIndex
CREATE INDEX "CommunityRequest_tenantId_status_idx" ON "CommunityRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "CommunityRequest_tenantId_bountyStatus_idx" ON "CommunityRequest"("tenantId", "bountyStatus");

-- CreateIndex
CREATE INDEX "FundingPledge_tenantId_pledgerId_idx" ON "FundingPledge"("tenantId", "pledgerId");

-- CreateIndex
CREATE INDEX "BountyClaim_tenantId_developerId_idx" ON "BountyClaim"("tenantId", "developerId");

-- CreateIndex
CREATE INDEX "ImmersionScenario_tenantId_targetLanguage_idx" ON "ImmersionScenario"("tenantId", "targetLanguage");

-- CreateIndex
CREATE INDEX "ImmersionScenario_tenantId_cefrLevel_idx" ON "ImmersionScenario"("tenantId", "cefrLevel");

-- CreateIndex
CREATE INDEX "ImmersionScenario_tenantId_status_idx" ON "ImmersionScenario"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ImmersionSession_tenantId_learnerId_idx" ON "ImmersionSession"("tenantId", "learnerId");

-- CreateIndex
CREATE INDEX "ImmersionSession_tenantId_status_idx" ON "ImmersionSession"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LanguageExchangeSession_tenantId_status_idx" ON "LanguageExchangeSession"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LanguageExchangeSession_tenantId_scheduledAt_idx" ON "LanguageExchangeSession"("tenantId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "voice_elevenlabs_configs_tenantId_key" ON "voice_elevenlabs_configs"("tenantId");

-- CreateIndex
CREATE INDEX "voice_linguaflow_voices_tenantId_language_idx" ON "voice_linguaflow_voices"("tenantId", "language");

-- CreateIndex
CREATE INDEX "voice_linguaflow_voices_tenantId_status_idx" ON "voice_linguaflow_voices"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "voice_linguaflow_voices_tenantId_elevenLabsVoiceId_key" ON "voice_linguaflow_voices"("tenantId", "elevenLabsVoiceId");

-- CreateIndex
CREATE INDEX "voice_conversation_agents_tenantId_primaryLanguage_idx" ON "voice_conversation_agents"("tenantId", "primaryLanguage");

-- CreateIndex
CREATE INDEX "voice_conversation_agents_tenantId_status_idx" ON "voice_conversation_agents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "voice_conversation_sessions_tenantId_userId_idx" ON "voice_conversation_sessions"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "voice_conversation_sessions_tenantId_learnerId_idx" ON "voice_conversation_sessions"("tenantId", "learnerId");

-- CreateIndex
CREATE INDEX "voice_conversation_sessions_tenantId_status_idx" ON "voice_conversation_sessions"("tenantId", "status");

-- CreateIndex
CREATE INDEX "voice_conversation_turns_sessionId_sequence_idx" ON "voice_conversation_turns"("sessionId", "sequence");

-- CreateIndex
CREATE INDEX "voice_pronunciation_assessments_tenantId_learnerId_idx" ON "voice_pronunciation_assessments"("tenantId", "learnerId");

-- CreateIndex
CREATE INDEX "voice_pronunciation_assessments_tenantId_sessionId_idx" ON "voice_pronunciation_assessments"("tenantId", "sessionId");

-- CreateIndex
CREATE UNIQUE INDEX "voice_learner_progress_learnerId_key" ON "voice_learner_progress"("learnerId");

-- CreateIndex
CREATE UNIQUE INDEX "voice_learner_progress_tenantId_learnerId_key" ON "voice_learner_progress"("tenantId", "learnerId");

-- CreateIndex
CREATE INDEX "voice_session_reviews_tenantId_idx" ON "voice_session_reviews"("tenantId");

-- CreateIndex
CREATE INDEX "voice_session_reviews_tenantId_sessionId_idx" ON "voice_session_reviews"("tenantId", "sessionId");

-- CreateIndex
CREATE INDEX "voice_session_reviews_tenantId_reviewerId_idx" ON "voice_session_reviews"("tenantId", "reviewerId");

-- CreateIndex
CREATE INDEX "voice_turn_annotations_reviewId_idx" ON "voice_turn_annotations"("reviewId");

-- CreateIndex
CREATE INDEX "voice_session_flags_tenantId_idx" ON "voice_session_flags"("tenantId");

-- CreateIndex
CREATE INDEX "voice_session_flags_tenantId_type_idx" ON "voice_session_flags"("tenantId", "type");

-- CreateIndex
CREATE INDEX "voice_session_flags_tenantId_severity_idx" ON "voice_session_flags"("tenantId", "severity");

-- CreateIndex
CREATE INDEX "voice_clone_consents_tenantId_idx" ON "voice_clone_consents"("tenantId");

-- CreateIndex
CREATE INDEX "voice_clone_consents_tenantId_voiceOwnerId_idx" ON "voice_clone_consents"("tenantId", "voiceOwnerId");

-- CreateIndex
CREATE INDEX "voice_clone_consents_tenantId_status_idx" ON "voice_clone_consents"("tenantId", "status");

-- CreateIndex
CREATE INDEX "voice_clones_tenantId_idx" ON "voice_clones"("tenantId");

-- CreateIndex
CREATE INDEX "voice_clones_tenantId_voiceOwnerId_idx" ON "voice_clones"("tenantId", "voiceOwnerId");

-- CreateIndex
CREATE INDEX "voice_clones_elevenLabsVoiceId_idx" ON "voice_clones"("elevenLabsVoiceId");

-- CreateIndex
CREATE INDEX "voice_clone_samples_tenantId_idx" ON "voice_clone_samples"("tenantId");

-- CreateIndex
CREATE INDEX "voice_clone_samples_cloneId_idx" ON "voice_clone_samples"("cloneId");

-- CreateIndex
CREATE INDEX "voice_dialogue_scripts_tenantId_idx" ON "voice_dialogue_scripts"("tenantId");

-- CreateIndex
CREATE INDEX "voice_dialogue_scripts_tenantId_language_idx" ON "voice_dialogue_scripts"("tenantId", "language");

-- CreateIndex
CREATE INDEX "voice_dialogue_characters_scriptId_idx" ON "voice_dialogue_characters"("scriptId");

-- CreateIndex
CREATE INDEX "voice_generated_dialogues_tenantId_idx" ON "voice_generated_dialogues"("tenantId");

-- CreateIndex
CREATE INDEX "voice_generated_dialogues_scriptId_idx" ON "voice_generated_dialogues"("scriptId");

-- CreateIndex
CREATE INDEX "voice_usage_daily_tenantId_date_idx" ON "voice_usage_daily"("tenantId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "voice_usage_daily_tenantId_date_key" ON "voice_usage_daily"("tenantId", "date");

-- CreateIndex
CREATE INDEX "ArenaCompetition_tenantId_status_idx" ON "ArenaCompetition"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ArenaCompetition_tenantId_format_idx" ON "ArenaCompetition"("tenantId", "format");

-- CreateIndex
CREATE INDEX "ArenaParticipant_tenantId_userId_idx" ON "ArenaParticipant"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaParticipant_competitionId_userId_key" ON "ArenaParticipant"("competitionId", "userId");

-- CreateIndex
CREATE INDEX "ArenaTeam_tenantId_type_idx" ON "ArenaTeam"("tenantId", "type");

-- CreateIndex
CREATE INDEX "ArenaTeam_tenantId_isActive_idx" ON "ArenaTeam"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "ArenaTeamMember_tenantId_userId_idx" ON "ArenaTeamMember"("tenantId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaTeamMember_teamId_userId_key" ON "ArenaTeamMember"("teamId", "userId");

-- CreateIndex
CREATE INDEX "ArenaTreasuryVote_teamId_status_idx" ON "ArenaTreasuryVote"("teamId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaTreasuryVoteCast_voteId_voterId_key" ON "ArenaTreasuryVoteCast"("voteId", "voterId");

-- CreateIndex
CREATE INDEX "ArenaTeamTrade_tenantId_status_idx" ON "ArenaTeamTrade"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ArenaTeamTrade_proposerTeamId_idx" ON "ArenaTeamTrade"("proposerTeamId");

-- CreateIndex
CREATE INDEX "ArenaTeamTrade_recipientTeamId_idx" ON "ArenaTeamTrade"("recipientTeamId");

-- CreateIndex
CREATE INDEX "ArenaTeamChallenge_tenantId_status_idx" ON "ArenaTeamChallenge"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ArenaTeamChallenge_challengerTeamId_idx" ON "ArenaTeamChallenge"("challengerTeamId");

-- CreateIndex
CREATE INDEX "ArenaTeamChallenge_challengedTeamId_idx" ON "ArenaTeamChallenge"("challengedTeamId");

-- CreateIndex
CREATE INDEX "TokenBalance_tenantId_idx" ON "TokenBalance"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TokenBalance_tenantId_userId_key" ON "TokenBalance"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "ArenaTokenTransaction_tenantId_userId_tokenType_idx" ON "ArenaTokenTransaction"("tenantId", "userId", "tokenType");

-- CreateIndex
CREATE INDEX "ArenaTokenTransaction_tenantId_tokenType_createdAt_idx" ON "ArenaTokenTransaction"("tenantId", "tokenType", "createdAt");

-- CreateIndex
CREATE INDEX "ArenaTokenTransaction_referenceId_referenceType_idx" ON "ArenaTokenTransaction"("referenceId", "referenceType");

-- CreateIndex
CREATE INDEX "ArenaStakePosition_tenantId_userId_idx" ON "ArenaStakePosition"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "ArenaStakePosition_tenantId_poolType_idx" ON "ArenaStakePosition"("tenantId", "poolType");

-- CreateIndex
CREATE INDEX "ArenaProposal_tenantId_status_idx" ON "ArenaProposal"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ArenaProposal_tenantId_type_idx" ON "ArenaProposal"("tenantId", "type");

-- CreateIndex
CREATE INDEX "ArenaProposal_tenantId_creatorId_idx" ON "ArenaProposal"("tenantId", "creatorId");

-- CreateIndex
CREATE INDEX "ArenaVote_tenantId_voterId_idx" ON "ArenaVote"("tenantId", "voterId");

-- CreateIndex
CREATE UNIQUE INDEX "ArenaVote_proposalId_voterId_key" ON "ArenaVote"("proposalId", "voterId");

-- CreateIndex
CREATE INDEX "ArenaDelegation_tenantId_delegatorId_idx" ON "ArenaDelegation"("tenantId", "delegatorId");

-- CreateIndex
CREATE INDEX "ArenaDelegation_tenantId_delegateId_idx" ON "ArenaDelegation"("tenantId", "delegateId");

-- CreateIndex
CREATE UNIQUE INDEX "DaoTreasury_tenantId_key" ON "DaoTreasury"("tenantId");

-- CreateIndex
CREATE INDEX "DaoTreasuryTransaction_tenantId_createdAt_idx" ON "DaoTreasuryTransaction"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "ContentBounty_tenantId_status_idx" ON "ContentBounty"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ContentBounty_tenantId_category_idx" ON "ContentBounty"("tenantId", "category");

-- CreateIndex
CREATE INDEX "BountySubmission_bountyId_creatorId_idx" ON "BountySubmission"("bountyId", "creatorId");

-- CreateIndex
CREATE INDEX "BountySubmission_tenantId_status_idx" ON "BountySubmission"("tenantId", "status");

-- CreateIndex
CREATE INDEX "UserMenuState_tenantId_idx" ON "UserMenuState"("tenantId");

-- CreateIndex
CREATE INDEX "UserMenuState_userId_idx" ON "UserMenuState"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserMenuState_userId_tenantId_role_key" ON "UserMenuState"("userId", "tenantId", "role");

-- CreateIndex
CREATE INDEX "MenuPushRecord_tenantId_targetRole_idx" ON "MenuPushRecord"("tenantId", "targetRole");

-- CreateIndex
CREATE INDEX "MenuPushRecord_expiresAt_idx" ON "MenuPushRecord"("expiresAt");

-- CreateIndex
CREATE INDEX "MenuUsageEvent_tenantId_userId_idx" ON "MenuUsageEvent"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "MenuUsageEvent_timestamp_idx" ON "MenuUsageEvent"("timestamp");

-- CreateIndex
CREATE INDEX "MenuUsageEvent_taskRef_idx" ON "MenuUsageEvent"("taskRef");

-- CreateIndex
CREATE INDEX "MenuAnalyticsDaily_tenantId_idx" ON "MenuAnalyticsDaily"("tenantId");

-- CreateIndex
CREATE INDEX "MenuAnalyticsDaily_date_idx" ON "MenuAnalyticsDaily"("date");

-- CreateIndex
CREATE UNIQUE INDEX "MenuAnalyticsDaily_tenantId_date_key" ON "MenuAnalyticsDaily"("tenantId", "date");

-- CreateIndex
CREATE INDEX "MenuSyncLog_userId_tenantId_idx" ON "MenuSyncLog"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "MenuSyncLog_deviceId_idx" ON "MenuSyncLog"("deviceId");

-- CreateIndex
CREATE INDEX "CreatorProfile_tenantId_tier_idx" ON "CreatorProfile"("tenantId", "tier");

-- AddForeignKey
ALTER TABLE "EarlyYearsFamily" ADD CONSTRAINT "EarlyYearsFamily_primaryUserId_fkey" FOREIGN KEY ("primaryUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyYearsChild" ADD CONSTRAINT "EarlyYearsChild_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "EarlyYearsFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyYearsPicturePassword" ADD CONSTRAINT "EarlyYearsPicturePassword_childId_fkey" FOREIGN KEY ("childId") REFERENCES "EarlyYearsChild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyYearsPhonicsProgress" ADD CONSTRAINT "EarlyYearsPhonicsProgress_childId_fkey" FOREIGN KEY ("childId") REFERENCES "EarlyYearsChild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyYearsNumeracyProgress" ADD CONSTRAINT "EarlyYearsNumeracyProgress_childId_fkey" FOREIGN KEY ("childId") REFERENCES "EarlyYearsChild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyYearsSession" ADD CONSTRAINT "EarlyYearsSession_childId_fkey" FOREIGN KEY ("childId") REFERENCES "EarlyYearsChild"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EarlyYearsActivity" ADD CONSTRAINT "EarlyYearsActivity_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "EarlyYearsSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageLearnerProfile" ADD CONSTRAINT "LanguageLearnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageVocabularyProgress" ADD CONSTRAINT "LanguageVocabularyProgress_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "LanguageLearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageVocabularyItem" ADD CONSTRAINT "LanguageVocabularyItem_progressId_fkey" FOREIGN KEY ("progressId") REFERENCES "LanguageVocabularyProgress"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageHeritagePathway" ADD CONSTRAINT "LanguageHeritagePathway_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "LanguageLearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageConversation" ADD CONSTRAINT "LanguageConversation_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "LanguageLearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageLearnerAchievement" ADD CONSTRAINT "LanguageLearnerAchievement_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "LanguageLearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageLearnerAchievement" ADD CONSTRAINT "LanguageLearnerAchievement_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "LanguageAchievement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LanguageOfflinePackage" ADD CONSTRAINT "LanguageOfflinePackage_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "LanguageLearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LTITool" ADD CONSTRAINT "LTITool_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "LTIPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LTIOIDCState" ADD CONSTRAINT "LTIOIDCState_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "LTIPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AGSLineItem" ADD CONSTRAINT "AGSLineItem_platformId_fkey" FOREIGN KEY ("platformId") REFERENCES "LTIPlatform"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AGSScore" ADD CONSTRAINT "AGSScore_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "AGSLineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AGSResult" ADD CONSTRAINT "AGSResult_lineItemId_fkey" FOREIGN KEY ("lineItemId") REFERENCES "AGSLineItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneRosterFieldMapping" ADD CONSTRAINT "OneRosterFieldMapping_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "OneRosterConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OneRosterSyncJob" ADD CONSTRAINT "OneRosterSyncJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "OneRosterConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CASEItem" ADD CONSTRAINT "CASEItem_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "CASEFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CASEAssociation" ADD CONSTRAINT "CASEAssociation_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "CASEFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CASEAssociation" ADD CONSTRAINT "CASEAssociation_originNodeId_fkey" FOREIGN KEY ("originNodeId") REFERENCES "CASEItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CASEAssociation" ADD CONSTRAINT "CASEAssociation_destinationNodeId_fkey" FOREIGN KEY ("destinationNodeId") REFERENCES "CASEItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CASEItemMapping" ADD CONSTRAINT "CASEItemMapping_frameworkId_fkey" FOREIGN KEY ("frameworkId") REFERENCES "CASEFramework"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CASEItemMapping" ADD CONSTRAINT "CASEItemMapping_caseItemId_fkey" FOREIGN KEY ("caseItemId") REFERENCES "CASEItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeAssertion" ADD CONSTRAINT "BadgeAssertion_achievementDefinitionId_fkey" FOREIGN KEY ("achievementDefinitionId") REFERENCES "AchievementDefinition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EdFiSyncJob" ADD CONSTRAINT "EdFiSyncJob_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "EdFiConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EdFiFieldMapping" ADD CONSTRAINT "EdFiFieldMapping_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "EdFiConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EdFiSyncConflict" ADD CONSTRAINT "EdFiSyncConflict_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "EdFiConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EdFiSyncConflict" ADD CONSTRAINT "EdFiSyncConflict_syncJobId_fkey" FOREIGN KEY ("syncJobId") REFERENCES "EdFiSyncJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EdFiChangeTracker" ADD CONSTRAINT "EdFiChangeTracker_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "EdFiConnection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BKTCompetencyState" ADD CONSTRAINT "BKTCompetencyState_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AdaptationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdaptationEvent" ADD CONSTRAINT "AdaptationEvent_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "AdaptationProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "decentralized_identifiers" ADD CONSTRAINT "decentralized_identifiers_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "digital_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "key_pairs" ADD CONSTRAINT "key_pairs_did_fkey" FOREIGN KEY ("did") REFERENCES "decentralized_identifiers"("did") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "wallet_backups" ADD CONSTRAINT "wallet_backups_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "digital_wallets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifiable_credentials" ADD CONSTRAINT "verifiable_credentials_issuer_did_fkey" FOREIGN KEY ("issuer_did") REFERENCES "decentralized_identifiers"("did") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifiable_credentials" ADD CONSTRAINT "verifiable_credentials_subject_did_fkey" FOREIGN KEY ("subject_did") REFERENCES "decentralized_identifiers"("did") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifiable_credentials" ADD CONSTRAINT "verifiable_credentials_wallet_id_fkey" FOREIGN KEY ("wallet_id") REFERENCES "digital_wallets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "verifiable_credentials" ADD CONSTRAINT "verifiable_credentials_schema_id_fkey" FOREIGN KEY ("schema_id") REFERENCES "credential_schemas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoShare" ADD CONSTRAINT "VideoShare_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "VideoRecording"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VideoReviewCycle" ADD CONSTRAINT "VideoReviewCycle_recordingId_fkey" FOREIGN KEY ("recordingId") REFERENCES "VideoRecording"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PeerSubmission" ADD CONSTRAINT "PeerSubmission_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PeerReviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewAssignment" ADD CONSTRAINT "ReviewAssignment_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PeerReviewSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IndustryOpportunity" ADD CONSTRAINT "IndustryOpportunity_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "IndustryPartner"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperienceApplication" ADD CONSTRAINT "ExperienceApplication_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "IndustryOpportunity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExperiencePlacement" ADD CONSTRAINT "ExperiencePlacement_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "ExperienceApplication"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PDEnrollment" ADD CONSTRAINT "PDEnrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "PDCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PBLProjectInstance" ADD CONSTRAINT "PBLProjectInstance_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "PBLProject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PitchSubmission" ADD CONSTRAINT "PitchSubmission_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES "PBLProjectInstance"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GovernanceVote" ADD CONSTRAINT "GovernanceVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "GovernanceProposal"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StakingPosition" ADD CONSTRAINT "StakingPosition_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "StakingPool"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketplaceApp" ADD CONSTRAINT "MarketplaceApp_developerId_fkey" FOREIGN KEY ("developerId") REFERENCES "DeveloperAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppInstallation" ADD CONSTRAINT "AppInstallation_appId_fkey" FOREIGN KEY ("appId") REFERENCES "MarketplaceApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppReview" ADD CONSTRAINT "AppReview_appId_fkey" FOREIGN KEY ("appId") REFERENCES "MarketplaceApp"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FundingPledge" ADD CONSTRAINT "FundingPledge_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CommunityRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BountyClaim" ADD CONSTRAINT "BountyClaim_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "CommunityRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImmersionSession" ADD CONSTRAINT "ImmersionSession_scenarioId_fkey" FOREIGN KEY ("scenarioId") REFERENCES "ImmersionScenario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_conversation_sessions" ADD CONSTRAINT "voice_conversation_sessions_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "voice_conversation_agents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_conversation_turns" ADD CONSTRAINT "voice_conversation_turns_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "voice_conversation_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_session_reviews" ADD CONSTRAINT "voice_session_reviews_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "voice_conversation_sessions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_turn_annotations" ADD CONSTRAINT "voice_turn_annotations_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "voice_session_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_session_flags" ADD CONSTRAINT "voice_session_flags_reviewId_fkey" FOREIGN KEY ("reviewId") REFERENCES "voice_session_reviews"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_clones" ADD CONSTRAINT "voice_clones_consentId_fkey" FOREIGN KEY ("consentId") REFERENCES "voice_clone_consents"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_clone_samples" ADD CONSTRAINT "voice_clone_samples_cloneId_fkey" FOREIGN KEY ("cloneId") REFERENCES "voice_clones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_dialogue_characters" ADD CONSTRAINT "voice_dialogue_characters_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "voice_dialogue_scripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voice_generated_dialogues" ADD CONSTRAINT "voice_generated_dialogues_scriptId_fkey" FOREIGN KEY ("scriptId") REFERENCES "voice_dialogue_scripts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaParticipant" ADD CONSTRAINT "ArenaParticipant_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "ArenaCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaParticipant" ADD CONSTRAINT "ArenaParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaTeam" ADD CONSTRAINT "ArenaTeam_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaTeamMember" ADD CONSTRAINT "ArenaTeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "ArenaTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaTeamMember" ADD CONSTRAINT "ArenaTeamMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaTreasuryVote" ADD CONSTRAINT "ArenaTreasuryVote_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "ArenaTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaTreasuryVote" ADD CONSTRAINT "ArenaTreasuryVote_proposerId_fkey" FOREIGN KEY ("proposerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaTreasuryVoteCast" ADD CONSTRAINT "ArenaTreasuryVoteCast_voteId_fkey" FOREIGN KEY ("voteId") REFERENCES "ArenaTreasuryVote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaTreasuryVoteCast" ADD CONSTRAINT "ArenaTreasuryVoteCast_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaTeamTrade" ADD CONSTRAINT "ArenaTeamTrade_proposerTeamId_fkey" FOREIGN KEY ("proposerTeamId") REFERENCES "ArenaTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaTeamTrade" ADD CONSTRAINT "ArenaTeamTrade_recipientTeamId_fkey" FOREIGN KEY ("recipientTeamId") REFERENCES "ArenaTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaTeamChallenge" ADD CONSTRAINT "ArenaTeamChallenge_challengerTeamId_fkey" FOREIGN KEY ("challengerTeamId") REFERENCES "ArenaTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaTeamChallenge" ADD CONSTRAINT "ArenaTeamChallenge_challengedTeamId_fkey" FOREIGN KEY ("challengedTeamId") REFERENCES "ArenaTeam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaTeamChallenge" ADD CONSTRAINT "ArenaTeamChallenge_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "ArenaCompetition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenBalance" ADD CONSTRAINT "TokenBalance_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaTokenTransaction" ADD CONSTRAINT "ArenaTokenTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaStakePosition" ADD CONSTRAINT "ArenaStakePosition_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaProposal" ADD CONSTRAINT "ArenaProposal_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaVote" ADD CONSTRAINT "ArenaVote_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ArenaProposal"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaVote" ADD CONSTRAINT "ArenaVote_voterId_fkey" FOREIGN KEY ("voterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaDelegation" ADD CONSTRAINT "ArenaDelegation_delegatorId_fkey" FOREIGN KEY ("delegatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ArenaDelegation" ADD CONSTRAINT "ArenaDelegation_delegateId_fkey" FOREIGN KEY ("delegateId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DaoTreasuryTransaction" ADD CONSTRAINT "DaoTreasuryTransaction_proposalId_fkey" FOREIGN KEY ("proposalId") REFERENCES "ArenaProposal"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentBounty" ADD CONSTRAINT "ContentBounty_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BountySubmission" ADD CONSTRAINT "BountySubmission_bountyId_fkey" FOREIGN KEY ("bountyId") REFERENCES "ContentBounty"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BountySubmission" ADD CONSTRAINT "BountySubmission_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
