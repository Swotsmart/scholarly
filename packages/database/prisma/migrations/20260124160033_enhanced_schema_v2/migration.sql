-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "userRole" TEXT,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "changes" JSONB,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "requestId" TEXT,
    "sensitivity" TEXT NOT NULL DEFAULT 'normal',
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subject" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "learningArea" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "streetAddress" TEXT,
    "suburb" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postcode" TEXT,
    "country" TEXT NOT NULL DEFAULT 'Australia',
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "type" TEXT NOT NULL DEFAULT 'primary',
    "label" TEXT,
    "homeschoolFamilyId" TEXT,
    "microSchoolId" TEXT,
    "homeschoolCoopId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalId" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "passwordHash" TEXT,
    "displayName" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "avatarUrl" TEXT,
    "bio" TEXT,
    "roles" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "jurisdiction" TEXT NOT NULL DEFAULT 'AU_NSW',
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "phoneVerified" BOOLEAN NOT NULL DEFAULT false,
    "identityVerified" BOOLEAN NOT NULL DEFAULT false,
    "trustScore" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "tokenBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "walletAddress" TEXT,
    "walletVerifiedAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastActiveAt" TIMESTAMP(3),
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "yearLevel" TEXT NOT NULL,
    "parentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialNeeds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredSessionLength" INTEGER,
    "preferredTimeOfDay" TEXT,
    "preferredDays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "learningPace" TEXT,
    "attentionSpan" TEXT,
    "bestMotivators" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "lisProfileSharing" JSONB NOT NULL DEFAULT '{}',
    "lisProfileId" TEXT,
    "lisIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearnerProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearnerSubject" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "currentLevel" TEXT NOT NULL,
    "needsHelp" BOOLEAN NOT NULL DEFAULT false,
    "canHelpOthers" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "LearnerSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ParentProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "childIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "approvedTutorIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "paymentMethodOnFile" BOOLEAN NOT NULL DEFAULT false,
    "monthlyBudget" DOUBLE PRECISION,
    "isHomeschoolParent" BOOLEAN NOT NULL DEFAULT false,
    "notificationPreferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ParentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tutorType" TEXT NOT NULL DEFAULT 'professional',
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMP(3),
    "profileCompleteness" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "yearLevelsTeaching" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sessionTypes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "maxStudentsPerGroup" INTEGER NOT NULL DEFAULT 1,
    "teachingStyle" JSONB NOT NULL DEFAULT '{}',
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorAvailabilitySlot" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "isRecurring" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorAvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorPricingTier" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "baseRate" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'AUD',
    "groupDiscount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maxGroupSize" INTEGER NOT NULL DEFAULT 1,
    "introRate" DOUBLE PRECISION,
    "packageRate" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutorPricingTier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorSubject" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "yearLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidenceLevel" INTEGER NOT NULL DEFAULT 3,
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "examBoardsKnown" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "curriculumCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "TutorSubject_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutorQualification" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "institution" TEXT,
    "dateObtained" TIMESTAMP(3),
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verificationMethod" TEXT,
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TutorQualification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SafeguardingCheck" (
    "id" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "jurisdiction" TEXT NOT NULL,
    "checkNumber" TEXT NOT NULL,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'pending',
    "verificationMethod" TEXT NOT NULL DEFAULT 'manual',
    "documentUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SafeguardingCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreatorProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "websiteUrl" TEXT,
    "totalContent" INTEGER NOT NULL DEFAULT 0,
    "totalSales" INTEGER NOT NULL DEFAULT 0,
    "totalDownloads" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalReviews" INTEGER NOT NULL DEFAULT 0,
    "totalEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "level" TEXT NOT NULL DEFAULT 'new',
    "badges" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "featuredSince" TIMESTAMP(3),
    "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "verificationStatus" TEXT NOT NULL DEFAULT 'pending',
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CreatorProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "bookedByUserId" TEXT NOT NULL,
    "learnerIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "sessionType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "topicsNeedingHelp" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "curriculumCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "learnerNotes" TEXT,
    "isGroupSession" BOOLEAN NOT NULL DEFAULT false,
    "openToOthers" BOOLEAN NOT NULL DEFAULT false,
    "maxGroupSize" INTEGER NOT NULL DEFAULT 1,
    "pricing" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "cancellationReason" TEXT,
    "cancelledBy" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "paymentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TutoringSession" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "tutorProfileId" TEXT NOT NULL,
    "tutorUserId" TEXT NOT NULL,
    "scheduledStart" TIMESTAMP(3) NOT NULL,
    "scheduledEnd" TIMESTAMP(3) NOT NULL,
    "actualStart" TIMESTAMP(3),
    "actualEnd" TIMESTAMP(3),
    "timezone" TEXT NOT NULL,
    "sessionType" TEXT NOT NULL,
    "isGroupSession" BOOLEAN NOT NULL DEFAULT false,
    "location" JSONB,
    "videoRoomUrl" TEXT,
    "subjectId" TEXT NOT NULL,
    "topicsFocus" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "curriculumCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "preworkAssigned" TEXT,
    "sessionNotes" TEXT,
    "homeworkAssigned" TEXT,
    "resourcesShared" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tutorFeedback" JSONB,
    "learnerFeedback" JSONB,
    "parentFeedback" JSONB,
    "lisSessionReport" JSONB,
    "billingStatus" TEXT NOT NULL DEFAULT 'pending',
    "amountCharged" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tutorEarnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformCommission" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "tokenRewards" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TutoringSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionParticipant" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "learnerProfileId" TEXT NOT NULL,
    "attended" BOOLEAN NOT NULL DEFAULT false,
    "feedback" JSONB,

    CONSTRAINT "SessionParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CurriculumStandard" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "externalId" TEXT,
    "uri" TEXT,
    "type" TEXT NOT NULL,
    "learningArea" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "strand" TEXT,
    "substrand" TEXT,
    "yearLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bandDescriptor" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "elaborations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "contentDescriptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "bloomsLevel" TEXT,
    "cognitiveVerbs" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "concepts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "prerequisites" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "relatedStandards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "crossCurricularLinks" JSONB NOT NULL DEFAULT '[]',
    "generalCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "crossCurriculumPriorities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "source" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CurriculumStandard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonPlan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "yearLevel" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "duration" INTEGER NOT NULL,
    "learningIntentions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "successCriteria" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generalCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "crossCurriculumPriorities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sections" JSONB NOT NULL,
    "differentiation" JSONB NOT NULL,
    "resources" JSONB NOT NULL DEFAULT '[]',
    "assessmentOpportunities" JSONB NOT NULL DEFAULT '[]',
    "crossCurricularConnections" JSONB NOT NULL DEFAULT '[]',
    "generatedBy" TEXT NOT NULL DEFAULT 'ai',
    "generationPrompt" TEXT,
    "qualityScore" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LessonPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LessonPlanStandard" (
    "id" TEXT NOT NULL,
    "lessonPlanId" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,

    CONSTRAINT "LessonPlanStandard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Content" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "previewUrl" TEXT,
    "subjectId" TEXT,
    "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "curriculumFrameworks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "curriculumCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generalCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "format" TEXT NOT NULL,
    "fileSize" INTEGER,
    "pageCount" INTEGER,
    "duration" INTEGER,
    "pricing" JSONB NOT NULL,
    "license" JSONB NOT NULL,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reviewCount" INTEGER NOT NULL DEFAULT 0,
    "averageRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "purchaseCount" INTEGER NOT NULL DEFAULT 0,
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "searchableText" TEXT NOT NULL,
    "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Content_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentAlignment" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "standardId" TEXT NOT NULL,
    "alignmentScore" DOUBLE PRECISION NOT NULL,
    "alignmentMethod" TEXT NOT NULL,
    "conceptsMatched" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "skillsMatched" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "confidence" DOUBLE PRECISION NOT NULL,
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContentAlignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentReview" (
    "id" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "title" TEXT,
    "comment" TEXT,
    "topicsWellCovered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "topicsNeedMoreWork" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "wouldRecommend" BOOLEAN NOT NULL DEFAULT true,
    "helpfulCount" INTEGER NOT NULL DEFAULT 0,
    "notHelpfulCount" INTEGER NOT NULL DEFAULT 0,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "yearLevelUsed" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContentReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContentPurchase" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "contentId" TEXT NOT NULL,
    "buyerId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL,
    "tokenAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "platformFee" DOUBLE PRECISION NOT NULL,
    "creatorEarnings" DOUBLE PRECISION NOT NULL,
    "tokenRewards" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "maxDownloads" INTEGER NOT NULL DEFAULT 5,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "purchasedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastDownloadedAt" TIMESTAMP(3),

    CONSTRAINT "ContentPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningAssetRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "requesterId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "curriculumCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specifications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preferredFormat" TEXT,
    "budgetMin" DOUBLE PRECISION,
    "budgetMax" DOUBLE PRECISION,
    "deadline" TIMESTAMP(3),
    "voteCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'open',
    "fulfilledByContentIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "fulfilledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningAssetRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningAssetVote" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LearningAssetVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeschoolFamily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "primaryContactUserId" TEXT NOT NULL,
    "primaryContactName" TEXT NOT NULL,
    "primaryContactEmail" TEXT NOT NULL,
    "primaryContactPhone" TEXT,
    "additionalContacts" JSONB NOT NULL DEFAULT '[]',
    "educationalPhilosophy" TEXT,
    "curriculumApproach" TEXT,
    "teachingCapabilities" JSONB NOT NULL DEFAULT '[]',
    "coopPreferences" JSONB NOT NULL DEFAULT '{}',
    "compliance" JSONB NOT NULL DEFAULT '{}',
    "aiProfile" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastActiveAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeschoolFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeschoolChild" (
    "id" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "currentYearLevel" TEXT NOT NULL,
    "learningStyle" TEXT,
    "interests" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "strengths" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "challengeAreas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specialNeeds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "curriculumFramework" TEXT NOT NULL DEFAULT 'ACARA',
    "subjectProgress" JSONB NOT NULL DEFAULT '[]',
    "lisProfileId" TEXT,
    "lisIntegrationEnabled" BOOLEAN NOT NULL DEFAULT false,
    "friendConnections" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "coopParticipation" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeschoolChild_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HomeschoolCoop" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "philosophy" TEXT NOT NULL,
    "meetingLocations" JSONB NOT NULL DEFAULT '[]',
    "maxFamilies" INTEGER NOT NULL DEFAULT 10,
    "membershipFee" DOUBLE PRECISION,
    "meetingSchedule" JSONB NOT NULL,
    "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "ageRange" JSONB NOT NULL,
    "educationalApproaches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "structure" JSONB NOT NULL,
    "roles" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'forming',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HomeschoolCoop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CoopMember" (
    "id" TEXT NOT NULL,
    "coopId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'member',
    "teachingSubjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "CoopMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Excursion" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "coopId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "venue" JSONB NOT NULL,
    "curriculumConnections" JSONB NOT NULL DEFAULT '[]',
    "learningObjectives" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "meetingPoint" TEXT NOT NULL,
    "transportation" TEXT NOT NULL,
    "minParticipants" INTEGER NOT NULL,
    "maxParticipants" INTEGER NOT NULL,
    "costPerChild" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "costPerAdult" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "paymentDeadline" TIMESTAMP(3),
    "waitlist" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "preActivities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "postActivities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'planning',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Excursion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExcursionRegistration" (
    "id" TEXT NOT NULL,
    "excursionId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "childrenIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "adultsAttending" INTEGER NOT NULL DEFAULT 1,
    "dietaryRequirements" TEXT,
    "medicalNotes" TEXT,
    "emergencyContact" TEXT NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExcursionRegistration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroSchool" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "philosophy" TEXT NOT NULL,
    "educationalModel" TEXT NOT NULL,
    "facilities" JSONB NOT NULL DEFAULT '[]',
    "legalEntity" JSONB,
    "compliance" JSONB NOT NULL,
    "founderId" TEXT NOT NULL,
    "enrollmentCapacity" INTEGER NOT NULL DEFAULT 20,
    "curriculumFramework" TEXT NOT NULL DEFAULT 'ACARA',
    "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearLevelsOffered" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "schedule" JSONB NOT NULL,
    "termDates" JSONB NOT NULL DEFAULT '[]',
    "tuitionFees" JSONB NOT NULL,
    "healthAnalysis" JSONB,
    "status" TEXT NOT NULL DEFAULT 'forming',
    "foundedDate" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicroSchool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroSchoolStaff" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "role" TEXT NOT NULL,
    "employmentType" TEXT NOT NULL,
    "qualifications" JSONB NOT NULL DEFAULT '[]',
    "teachingSubjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearLevelCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "safeguardingCheck" JSONB,
    "firstAidCertification" JSONB,
    "teachingRegistration" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicroSchoolStaff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MicroSchoolStudent" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3) NOT NULL,
    "yearLevel" TEXT NOT NULL,
    "enrollmentStatus" TEXT NOT NULL DEFAULT 'enrolled',
    "enrollmentDate" TIMESTAMP(3),
    "withdrawalDate" TIMESTAMP(3),
    "learningProfile" JSONB,
    "medicalInformation" JSONB,
    "emergencyContacts" JSONB NOT NULL DEFAULT '[]',
    "lisProfileId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MicroSchoolStudent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentApplication" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "familyId" TEXT NOT NULL,
    "studentName" TEXT NOT NULL,
    "studentDob" TIMESTAMP(3) NOT NULL,
    "requestedYearLevel" TEXT NOT NULL,
    "requestedStartDate" TIMESTAMP(3) NOT NULL,
    "reasonForEnrolling" TEXT NOT NULL,
    "previousSchooling" TEXT NOT NULL,
    "learningNeeds" TEXT,
    "additionalInfo" TEXT,
    "parentConsent" BOOLEAN NOT NULL DEFAULT false,
    "consentTimestamp" TIMESTAMP(3),
    "documents" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "reviewNotes" TEXT,
    "reviewedBy" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentApplication_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReliefTeacher" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "avatarUrl" TEXT,
    "location" JSONB NOT NULL,
    "qualifications" JSONB NOT NULL DEFAULT '[]',
    "teachingRegistration" JSONB NOT NULL,
    "safeguardingCheck" JSONB NOT NULL,
    "subjects" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "specializations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "availability" JSONB NOT NULL,
    "preferredSchools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "excludedSchools" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metrics" JSONB NOT NULL DEFAULT '{}',
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "aiProfile" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'pending_verification',
    "verifiedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReliefTeacher_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReliefPool" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "autonomousActions" JSONB NOT NULL DEFAULT '{}',
    "statistics" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReliefPool_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReliefPoolMember" (
    "id" TEXT NOT NULL,
    "poolId" TEXT NOT NULL,
    "reliefTeacherId" TEXT NOT NULL,
    "tier" TEXT NOT NULL DEFAULT 'standard',
    "priority" INTEGER NOT NULL DEFAULT 1,
    "schoolRating" DOUBLE PRECISION,
    "lastBookedAt" TIMESTAMP(3),
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReliefPoolMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeacherAbsence" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "teacherName" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isFullDay" BOOLEAN NOT NULL DEFAULT true,
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "coverageRequired" JSONB NOT NULL DEFAULT '[]',
    "status" TEXT NOT NULL DEFAULT 'reported',
    "wasPredicted" BOOLEAN NOT NULL DEFAULT false,
    "predictionConfidence" DOUBLE PRECISION,
    "reportedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reportedBy" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TeacherAbsence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReliefAssignment" (
    "id" TEXT NOT NULL,
    "absenceId" TEXT NOT NULL,
    "reliefTeacherId" TEXT NOT NULL,
    "coverageRequirementIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'offered',
    "offeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "confirmedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "rating" INTEGER,
    "feedback" TEXT,

    CONSTRAINT "ReliefAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReliefBooking" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "absenceId" TEXT NOT NULL,
    "reliefTeacherId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "periods" JSONB NOT NULL,
    "totalHours" DOUBLE PRECISION NOT NULL,
    "hourlyRate" DOUBLE PRECISION NOT NULL,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'pending',
    "status" TEXT NOT NULL DEFAULT 'confirmed',
    "schoolRating" INTEGER,
    "schoolFeedback" TEXT,
    "teacherRating" INTEGER,
    "teacherFeedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "ReliefBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsenceNotification" (
    "id" TEXT NOT NULL,
    "absenceId" TEXT NOT NULL,
    "recipientId" TEXT NOT NULL,
    "recipientType" TEXT NOT NULL,
    "channel" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'sent',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),

    CONSTRAINT "AbsenceNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AbsencePrediction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "predictedAbsences" JSONB NOT NULL,
    "totalPredicted" INTEGER NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "factors" JSONB NOT NULL DEFAULT '[]',
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsencePrediction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RefreshToken" (
    "id" TEXT NOT NULL,
    "tokenFamily" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "hashedToken" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "replacedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RefreshToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialNFT" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenId" BIGINT NOT NULL,
    "contractAddress" TEXT NOT NULL,
    "credentialType" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "dataHash" TEXT NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "revokedAt" TIMESTAMP(3),
    "revocationReason" TEXT,
    "mintTxHash" TEXT NOT NULL,
    "revokeTxHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredentialNFT_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EscrowTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "escrowId" TEXT NOT NULL,
    "bookingId" TEXT NOT NULL,
    "learnerId" TEXT NOT NULL,
    "tutorId" TEXT NOT NULL,
    "learnerWallet" TEXT NOT NULL,
    "tutorWallet" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "platformFeeBps" INTEGER NOT NULL DEFAULT 500,
    "platformFee" DECIMAL(36,18) NOT NULL,
    "tutorAmount" DECIMAL(36,18) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'created',
    "createTxHash" TEXT,
    "fundTxHash" TEXT,
    "releaseTxHash" TEXT,
    "refundTxHash" TEXT,
    "disputeReason" TEXT,
    "disputeRaisedAt" TIMESTAMP(3),
    "disputeResolvedAt" TIMESTAMP(3),
    "disputeResolution" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EscrowTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OnChainReputation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "onChainScore" INTEGER NOT NULL DEFAULT 0,
    "totalSessions" INTEGER NOT NULL DEFAULT 0,
    "completedSessions" INTEGER NOT NULL DEFAULT 0,
    "totalRatings" INTEGER NOT NULL DEFAULT 0,
    "ratingSum" INTEGER NOT NULL DEFAULT 0,
    "disputesWon" INTEGER NOT NULL DEFAULT 0,
    "disputesLost" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "averageRating" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncTxHash" TEXT,
    "syncErrorCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OnChainReputation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TokenTransaction" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" DECIMAL(36,18) NOT NULL,
    "fromAddress" TEXT,
    "toAddress" TEXT NOT NULL,
    "referenceType" TEXT,
    "referenceId" TEXT,
    "txHash" TEXT NOT NULL,
    "blockNumber" INTEGER,
    "gasUsed" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmedAt" TIMESTAMP(3),

    CONSTRAINT "TokenTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIBuddyConversation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "context" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AIBuddyConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AIBuddySettings" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "responseStyle" TEXT NOT NULL DEFAULT 'encouraging',
    "verbosityLevel" TEXT NOT NULL DEFAULT 'concise',
    "useEmojis" BOOLEAN NOT NULL DEFAULT true,
    "includeExamples" BOOLEAN NOT NULL DEFAULT true,
    "provideChallenges" BOOLEAN NOT NULL DEFAULT true,
    "reminderFrequency" TEXT NOT NULL DEFAULT 'none',
    "parentNotifications" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AIBuddySettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Portfolio" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "coverImageUrl" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "theme" JSONB NOT NULL,
    "sections" JSONB NOT NULL,
    "stats" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Portfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Artifact" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "metadata" JSONB NOT NULL,
    "reflection" JSONB,
    "curriculumAlignment" JSONB,
    "feedback" JSONB NOT NULL DEFAULT '[]',
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'draft',
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "Artifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningGoal" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subject" TEXT,
    "targetDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'not_started',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "milestones" JSONB NOT NULL DEFAULT '[]',
    "relatedArtifacts" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "curriculumCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "LearningGoal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL,
    "issuedBy" TEXT NOT NULL,
    "criteria" TEXT NOT NULL,
    "evidence" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "blockchain" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningJourney" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "subject" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "path" JSONB NOT NULL,
    "currentNode" TEXT NOT NULL,
    "aiRecommendations" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduScrumTeam" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "scrumMasterId" TEXT NOT NULL,
    "productOwnerId" TEXT,
    "memberIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "velocity" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "maturityLevel" TEXT NOT NULL DEFAULT 'forming',
    "healthScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "sprintDuration" INTEGER NOT NULL DEFAULT 14,
    "standupSchedule" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EduScrumTeam_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduScrumSprint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "goal" TEXT NOT NULL,
    "sprintNumber" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "backlogItems" JSONB NOT NULL DEFAULT '[]',
    "totalStoryPoints" INTEGER NOT NULL DEFAULT 0,
    "completedPoints" INTEGER NOT NULL DEFAULT 0,
    "standups" JSONB NOT NULL DEFAULT '[]',
    "burndownData" JSONB NOT NULL DEFAULT '[]',
    "aiInsights" JSONB,
    "status" TEXT NOT NULL DEFAULT 'planning',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EduScrumSprint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EduScrumRetrospective" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "sprintId" TEXT,
    "wentWell" JSONB NOT NULL DEFAULT '[]',
    "toImprove" JSONB NOT NULL DEFAULT '[]',
    "actionItems" JSONB NOT NULL DEFAULT '[]',
    "participantIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "facilitatorId" TEXT NOT NULL,
    "aiSummary" TEXT,
    "aiRecommendations" JSONB NOT NULL DEFAULT '[]',
    "teamDynamicsScore" DOUBLE PRECISION,
    "conductedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EduScrumRetrospective_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceCheck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "framework" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "evidence" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedBy" TEXT NOT NULL,
    "remediationRequired" BOOLEAN NOT NULL DEFAULT false,
    "remediationDeadline" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportType" TEXT NOT NULL,
    "period" JSONB NOT NULL,
    "frameworks" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" JSONB NOT NULL,
    "checkIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "recommendations" JSONB NOT NULL DEFAULT '[]',
    "certifications" JSONB NOT NULL DEFAULT '[]',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ACARACurriculumCode" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "learningArea" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "yearLevel" TEXT NOT NULL,
    "strand" TEXT NOT NULL,
    "subStrand" TEXT,
    "description" TEXT NOT NULL,
    "elaborations" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "achievementStandard" TEXT NOT NULL,
    "generalCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "crossCurriculumPriorities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "source" TEXT NOT NULL DEFAULT 'ACARA',
    "version" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ACARACurriculumCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "channels" TEXT[] DEFAULT ARRAY['in_app']::TEXT[],
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "inAppStatus" TEXT NOT NULL DEFAULT 'unread',
    "emailStatus" TEXT,
    "smsStatus" TEXT,
    "pushStatus" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "groupKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NotificationPreference" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "smsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "pushEnabled" BOOLEAN NOT NULL DEFAULT true,
    "inAppEnabled" BOOLEAN NOT NULL DEFAULT true,
    "categoryPreferences" JSONB NOT NULL DEFAULT '{}',
    "quietHoursEnabled" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursStart" TEXT,
    "quietHoursEnd" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Australia/Sydney',
    "digestEnabled" BOOLEAN NOT NULL DEFAULT false,
    "digestFrequency" TEXT,
    "digestTime" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NotificationPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalyticsEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "properties" JSONB NOT NULL DEFAULT '{}',
    "deviceType" TEXT,
    "browser" TEXT,
    "os" TEXT,
    "country" TEXT,
    "region" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalyticsEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportDefinition" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "reportType" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "filters" JSONB NOT NULL DEFAULT '{}',
    "columns" JSONB NOT NULL,
    "isScheduled" BOOLEAN NOT NULL DEFAULT false,
    "schedule" JSONB,
    "recipients" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdBy" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "sharedWith" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportDefinition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportExecution" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "parameters" JSONB NOT NULL,
    "filters" JSONB NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "resultSummary" JSONB,
    "resultFileUrl" TEXT,
    "rowCount" INTEGER,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "duration" INTEGER,
    "errorMessage" TEXT,
    "executedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportExecution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeatureFlag" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT false,
    "rules" JSONB NOT NULL DEFAULT '[]',
    "rolloutPercentage" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "owner" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FeatureFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantConfiguration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "branding" JSONB NOT NULL DEFAULT '{}',
    "enabledFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "disabledFeatures" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "limits" JSONB NOT NULL DEFAULT '{}',
    "integrations" JSONB NOT NULL DEFAULT '{}',
    "dataRetentionDays" INTEGER NOT NULL DEFAULT 2555,
    "gdprEnabled" BOOLEAN NOT NULL DEFAULT true,
    "billingPlan" TEXT NOT NULL DEFAULT 'free',
    "billingCycle" TEXT NOT NULL DEFAULT 'monthly',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TenantConfiguration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataMigration" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "totalRecords" INTEGER,
    "processedRecords" INTEGER NOT NULL DEFAULT 0,
    "failedRecords" INTEGER NOT NULL DEFAULT 0,
    "resultSummary" JSONB,
    "errorLog" JSONB NOT NULL DEFAULT '[]',
    "isReversible" BOOLEAN NOT NULL DEFAULT false,
    "rollbackData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataMigration_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_timestamp_idx" ON "AuditLog"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_entityType_entityId_idx" ON "AuditLog"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_userId_timestamp_idx" ON "AuditLog"("tenantId", "userId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_action_timestamp_idx" ON "AuditLog"("tenantId", "action", "timestamp");

-- CreateIndex
CREATE INDEX "AuditLog_sensitivity_timestamp_idx" ON "AuditLog"("sensitivity", "timestamp");

-- CreateIndex
CREATE INDEX "Subject_tenantId_isActive_idx" ON "Subject"("tenantId", "isActive");

-- CreateIndex
CREATE INDEX "Subject_learningArea_idx" ON "Subject"("learningArea");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_tenantId_code_key" ON "Subject"("tenantId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "Address_homeschoolFamilyId_key" ON "Address"("homeschoolFamilyId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_microSchoolId_key" ON "Address"("microSchoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Address_homeschoolCoopId_key" ON "Address"("homeschoolCoopId");

-- CreateIndex
CREATE INDEX "Address_tenantId_idx" ON "Address"("tenantId");

-- CreateIndex
CREATE INDEX "Address_latitude_longitude_idx" ON "Address"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Address_postcode_idx" ON "Address"("postcode");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "Tenant"("slug");

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "Tenant"("status");

-- CreateIndex
CREATE INDEX "Tenant_deletedAt_idx" ON "Tenant"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "User"("tenantId");

-- CreateIndex
CREATE INDEX "User_tenantId_status_idx" ON "User"("tenantId", "status");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_walletAddress_idx" ON "User"("walletAddress");

-- CreateIndex
CREATE INDEX "User_deletedAt_idx" ON "User"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_tenantId_email_key" ON "User"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerProfile_userId_key" ON "LearnerProfile"("userId");

-- CreateIndex
CREATE INDEX "LearnerProfile_yearLevel_idx" ON "LearnerProfile"("yearLevel");

-- CreateIndex
CREATE INDEX "LearnerSubject_subjectId_idx" ON "LearnerSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "LearnerSubject_profileId_subjectId_key" ON "LearnerSubject"("profileId", "subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "ParentProfile_userId_key" ON "ParentProfile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorProfile_userId_key" ON "TutorProfile"("userId");

-- CreateIndex
CREATE INDEX "TutorProfile_verificationStatus_idx" ON "TutorProfile"("verificationStatus");

-- CreateIndex
CREATE INDEX "TutorProfile_tutorType_idx" ON "TutorProfile"("tutorType");

-- CreateIndex
CREATE INDEX "TutorProfile_deletedAt_idx" ON "TutorProfile"("deletedAt");

-- CreateIndex
CREATE INDEX "TutorAvailabilitySlot_profileId_idx" ON "TutorAvailabilitySlot"("profileId");

-- CreateIndex
CREATE INDEX "TutorAvailabilitySlot_profileId_dayOfWeek_idx" ON "TutorAvailabilitySlot"("profileId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "TutorPricingTier_profileId_isActive_idx" ON "TutorPricingTier"("profileId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "TutorPricingTier_profileId_sessionType_duration_key" ON "TutorPricingTier"("profileId", "sessionType", "duration");

-- CreateIndex
CREATE INDEX "TutorSubject_subjectId_idx" ON "TutorSubject"("subjectId");

-- CreateIndex
CREATE UNIQUE INDEX "TutorSubject_profileId_subjectId_key" ON "TutorSubject"("profileId", "subjectId");

-- CreateIndex
CREATE INDEX "TutorQualification_profileId_idx" ON "TutorQualification"("profileId");

-- CreateIndex
CREATE INDEX "TutorQualification_type_verified_idx" ON "TutorQualification"("type", "verified");

-- CreateIndex
CREATE INDEX "SafeguardingCheck_profileId_idx" ON "SafeguardingCheck"("profileId");

-- CreateIndex
CREATE INDEX "SafeguardingCheck_status_expiresAt_idx" ON "SafeguardingCheck"("status", "expiresAt");

-- CreateIndex
CREATE INDEX "SafeguardingCheck_jurisdiction_type_idx" ON "SafeguardingCheck"("jurisdiction", "type");

-- CreateIndex
CREATE UNIQUE INDEX "CreatorProfile_userId_key" ON "CreatorProfile"("userId");

-- CreateIndex
CREATE INDEX "CreatorProfile_level_idx" ON "CreatorProfile"("level");

-- CreateIndex
CREATE INDEX "CreatorProfile_verificationStatus_idx" ON "CreatorProfile"("verificationStatus");

-- CreateIndex
CREATE INDEX "Booking_tenantId_idx" ON "Booking"("tenantId");

-- CreateIndex
CREATE INDEX "Booking_tenantId_status_idx" ON "Booking"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Booking_tutorId_idx" ON "Booking"("tutorId");

-- CreateIndex
CREATE INDEX "Booking_tutorId_scheduledStart_idx" ON "Booking"("tutorId", "scheduledStart");

-- CreateIndex
CREATE INDEX "Booking_scheduledStart_idx" ON "Booking"("scheduledStart");

-- CreateIndex
CREATE INDEX "Booking_tenantId_status_scheduledStart_idx" ON "Booking"("tenantId", "status", "scheduledStart");

-- CreateIndex
CREATE UNIQUE INDEX "TutoringSession_bookingId_key" ON "TutoringSession"("bookingId");

-- CreateIndex
CREATE INDEX "TutoringSession_tenantId_idx" ON "TutoringSession"("tenantId");

-- CreateIndex
CREATE INDEX "TutoringSession_tutorProfileId_idx" ON "TutoringSession"("tutorProfileId");

-- CreateIndex
CREATE INDEX "TutoringSession_tutorProfileId_scheduledStart_status_idx" ON "TutoringSession"("tutorProfileId", "scheduledStart", "status");

-- CreateIndex
CREATE INDEX "TutoringSession_scheduledStart_idx" ON "TutoringSession"("scheduledStart");

-- CreateIndex
CREATE INDEX "TutoringSession_status_idx" ON "TutoringSession"("status");

-- CreateIndex
CREATE INDEX "SessionParticipant_learnerProfileId_idx" ON "SessionParticipant"("learnerProfileId");

-- CreateIndex
CREATE UNIQUE INDEX "SessionParticipant_sessionId_learnerProfileId_key" ON "SessionParticipant"("sessionId", "learnerProfileId");

-- CreateIndex
CREATE INDEX "CurriculumStandard_tenantId_idx" ON "CurriculumStandard"("tenantId");

-- CreateIndex
CREATE INDEX "CurriculumStandard_framework_idx" ON "CurriculumStandard"("framework");

-- CreateIndex
CREATE INDEX "CurriculumStandard_learningArea_idx" ON "CurriculumStandard"("learningArea");

-- CreateIndex
CREATE INDEX "CurriculumStandard_subject_idx" ON "CurriculumStandard"("subject");

-- CreateIndex
CREATE INDEX "CurriculumStandard_yearLevels_idx" ON "CurriculumStandard"("yearLevels");

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumStandard_tenantId_framework_code_key" ON "CurriculumStandard"("tenantId", "framework", "code");

-- CreateIndex
CREATE INDEX "LessonPlan_tenantId_idx" ON "LessonPlan"("tenantId");

-- CreateIndex
CREATE INDEX "LessonPlan_subject_idx" ON "LessonPlan"("subject");

-- CreateIndex
CREATE INDEX "LessonPlan_yearLevel_idx" ON "LessonPlan"("yearLevel");

-- CreateIndex
CREATE INDEX "LessonPlan_status_idx" ON "LessonPlan"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LessonPlanStandard_lessonPlanId_standardId_key" ON "LessonPlanStandard"("lessonPlanId", "standardId");

-- CreateIndex
CREATE INDEX "Content_tenantId_idx" ON "Content"("tenantId");

-- CreateIndex
CREATE INDEX "Content_tenantId_status_idx" ON "Content"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Content_tenantId_status_subjects_idx" ON "Content"("tenantId", "status", "subjects");

-- CreateIndex
CREATE INDEX "Content_tenantId_status_yearLevels_idx" ON "Content"("tenantId", "status", "yearLevels");

-- CreateIndex
CREATE INDEX "Content_creatorId_idx" ON "Content"("creatorId");

-- CreateIndex
CREATE INDEX "Content_type_idx" ON "Content"("type");

-- CreateIndex
CREATE INDEX "Content_status_idx" ON "Content"("status");

-- CreateIndex
CREATE INDEX "Content_deletedAt_idx" ON "Content"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContentAlignment_contentId_standardId_key" ON "ContentAlignment"("contentId", "standardId");

-- CreateIndex
CREATE INDEX "ContentReview_contentId_idx" ON "ContentReview"("contentId");

-- CreateIndex
CREATE INDEX "ContentReview_reviewerId_idx" ON "ContentReview"("reviewerId");

-- CreateIndex
CREATE INDEX "ContentReview_rating_idx" ON "ContentReview"("rating");

-- CreateIndex
CREATE UNIQUE INDEX "ContentReview_contentId_reviewerId_key" ON "ContentReview"("contentId", "reviewerId");

-- CreateIndex
CREATE INDEX "ContentPurchase_tenantId_idx" ON "ContentPurchase"("tenantId");

-- CreateIndex
CREATE INDEX "ContentPurchase_buyerId_idx" ON "ContentPurchase"("buyerId");

-- CreateIndex
CREATE INDEX "ContentPurchase_contentId_idx" ON "ContentPurchase"("contentId");

-- CreateIndex
CREATE UNIQUE INDEX "ContentPurchase_contentId_buyerId_key" ON "ContentPurchase"("contentId", "buyerId");

-- CreateIndex
CREATE INDEX "LearningAssetRequest_tenantId_idx" ON "LearningAssetRequest"("tenantId");

-- CreateIndex
CREATE INDEX "LearningAssetRequest_tenantId_status_idx" ON "LearningAssetRequest"("tenantId", "status");

-- CreateIndex
CREATE INDEX "LearningAssetRequest_status_idx" ON "LearningAssetRequest"("status");

-- CreateIndex
CREATE UNIQUE INDEX "LearningAssetRequest_tenantId_requesterId_title_key" ON "LearningAssetRequest"("tenantId", "requesterId", "title");

-- CreateIndex
CREATE INDEX "LearningAssetVote_requestId_idx" ON "LearningAssetVote"("requestId");

-- CreateIndex
CREATE INDEX "LearningAssetVote_userId_idx" ON "LearningAssetVote"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LearningAssetVote_requestId_userId_key" ON "LearningAssetVote"("requestId", "userId");

-- CreateIndex
CREATE INDEX "HomeschoolFamily_tenantId_idx" ON "HomeschoolFamily"("tenantId");

-- CreateIndex
CREATE INDEX "HomeschoolFamily_tenantId_status_idx" ON "HomeschoolFamily"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HomeschoolFamily_deletedAt_idx" ON "HomeschoolFamily"("deletedAt");

-- CreateIndex
CREATE INDEX "HomeschoolChild_familyId_idx" ON "HomeschoolChild"("familyId");

-- CreateIndex
CREATE INDEX "HomeschoolChild_currentYearLevel_idx" ON "HomeschoolChild"("currentYearLevel");

-- CreateIndex
CREATE INDEX "HomeschoolCoop_tenantId_idx" ON "HomeschoolCoop"("tenantId");

-- CreateIndex
CREATE INDEX "HomeschoolCoop_tenantId_status_idx" ON "HomeschoolCoop"("tenantId", "status");

-- CreateIndex
CREATE INDEX "HomeschoolCoop_deletedAt_idx" ON "HomeschoolCoop"("deletedAt");

-- CreateIndex
CREATE INDEX "CoopMember_familyId_idx" ON "CoopMember"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "CoopMember_coopId_familyId_key" ON "CoopMember"("coopId", "familyId");

-- CreateIndex
CREATE INDEX "Excursion_tenantId_idx" ON "Excursion"("tenantId");

-- CreateIndex
CREATE INDEX "Excursion_tenantId_status_idx" ON "Excursion"("tenantId", "status");

-- CreateIndex
CREATE INDEX "Excursion_date_idx" ON "Excursion"("date");

-- CreateIndex
CREATE INDEX "Excursion_coopId_idx" ON "Excursion"("coopId");

-- CreateIndex
CREATE INDEX "ExcursionRegistration_familyId_idx" ON "ExcursionRegistration"("familyId");

-- CreateIndex
CREATE UNIQUE INDEX "ExcursionRegistration_excursionId_familyId_key" ON "ExcursionRegistration"("excursionId", "familyId");

-- CreateIndex
CREATE INDEX "MicroSchool_tenantId_idx" ON "MicroSchool"("tenantId");

-- CreateIndex
CREATE INDEX "MicroSchool_tenantId_status_idx" ON "MicroSchool"("tenantId", "status");

-- CreateIndex
CREATE INDEX "MicroSchool_deletedAt_idx" ON "MicroSchool"("deletedAt");

-- CreateIndex
CREATE INDEX "MicroSchoolStaff_schoolId_idx" ON "MicroSchoolStaff"("schoolId");

-- CreateIndex
CREATE INDEX "MicroSchoolStaff_schoolId_status_idx" ON "MicroSchoolStaff"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "MicroSchoolStaff_schoolId_userId_key" ON "MicroSchoolStaff"("schoolId", "userId");

-- CreateIndex
CREATE INDEX "MicroSchoolStudent_schoolId_idx" ON "MicroSchoolStudent"("schoolId");

-- CreateIndex
CREATE INDEX "MicroSchoolStudent_schoolId_enrollmentStatus_idx" ON "MicroSchoolStudent"("schoolId", "enrollmentStatus");

-- CreateIndex
CREATE UNIQUE INDEX "MicroSchoolStudent_schoolId_familyId_name_key" ON "MicroSchoolStudent"("schoolId", "familyId", "name");

-- CreateIndex
CREATE INDEX "EnrollmentApplication_schoolId_idx" ON "EnrollmentApplication"("schoolId");

-- CreateIndex
CREATE INDEX "EnrollmentApplication_schoolId_status_idx" ON "EnrollmentApplication"("schoolId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentApplication_schoolId_familyId_studentName_key" ON "EnrollmentApplication"("schoolId", "familyId", "studentName");

-- CreateIndex
CREATE UNIQUE INDEX "ReliefTeacher_userId_key" ON "ReliefTeacher"("userId");

-- CreateIndex
CREATE INDEX "ReliefTeacher_tenantId_idx" ON "ReliefTeacher"("tenantId");

-- CreateIndex
CREATE INDEX "ReliefTeacher_tenantId_status_idx" ON "ReliefTeacher"("tenantId", "status");

-- CreateIndex
CREATE INDEX "ReliefTeacher_tier_idx" ON "ReliefTeacher"("tier");

-- CreateIndex
CREATE INDEX "ReliefTeacher_deletedAt_idx" ON "ReliefTeacher"("deletedAt");

-- CreateIndex
CREATE INDEX "ReliefPool_tenantId_idx" ON "ReliefPool"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "ReliefPool_tenantId_schoolId_key" ON "ReliefPool"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "ReliefPoolMember_reliefTeacherId_idx" ON "ReliefPoolMember"("reliefTeacherId");

-- CreateIndex
CREATE UNIQUE INDEX "ReliefPoolMember_poolId_reliefTeacherId_key" ON "ReliefPoolMember"("poolId", "reliefTeacherId");

-- CreateIndex
CREATE INDEX "TeacherAbsence_tenantId_idx" ON "TeacherAbsence"("tenantId");

-- CreateIndex
CREATE INDEX "TeacherAbsence_tenantId_schoolId_idx" ON "TeacherAbsence"("tenantId", "schoolId");

-- CreateIndex
CREATE INDEX "TeacherAbsence_schoolId_idx" ON "TeacherAbsence"("schoolId");

-- CreateIndex
CREATE INDEX "TeacherAbsence_date_idx" ON "TeacherAbsence"("date");

-- CreateIndex
CREATE INDEX "TeacherAbsence_tenantId_date_status_idx" ON "TeacherAbsence"("tenantId", "date", "status");

-- CreateIndex
CREATE INDEX "ReliefAssignment_absenceId_idx" ON "ReliefAssignment"("absenceId");

-- CreateIndex
CREATE INDEX "ReliefAssignment_reliefTeacherId_idx" ON "ReliefAssignment"("reliefTeacherId");

-- CreateIndex
CREATE INDEX "ReliefAssignment_status_idx" ON "ReliefAssignment"("status");

-- CreateIndex
CREATE INDEX "ReliefBooking_tenantId_idx" ON "ReliefBooking"("tenantId");

-- CreateIndex
CREATE INDEX "ReliefBooking_tenantId_date_idx" ON "ReliefBooking"("tenantId", "date");

-- CreateIndex
CREATE INDEX "ReliefBooking_date_idx" ON "ReliefBooking"("date");

-- CreateIndex
CREATE INDEX "ReliefBooking_reliefTeacherId_idx" ON "ReliefBooking"("reliefTeacherId");

-- CreateIndex
CREATE INDEX "AbsenceNotification_absenceId_idx" ON "AbsenceNotification"("absenceId");

-- CreateIndex
CREATE INDEX "AbsenceNotification_recipientId_idx" ON "AbsenceNotification"("recipientId");

-- CreateIndex
CREATE INDEX "AbsencePrediction_date_idx" ON "AbsencePrediction"("date");

-- CreateIndex
CREATE UNIQUE INDEX "AbsencePrediction_tenantId_schoolId_date_key" ON "AbsencePrediction"("tenantId", "schoolId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "RefreshToken_hashedToken_key" ON "RefreshToken"("hashedToken");

-- CreateIndex
CREATE INDEX "RefreshToken_userId_idx" ON "RefreshToken"("userId");

-- CreateIndex
CREATE INDEX "RefreshToken_tokenFamily_idx" ON "RefreshToken"("tokenFamily");

-- CreateIndex
CREATE INDEX "RefreshToken_hashedToken_idx" ON "RefreshToken"("hashedToken");

-- CreateIndex
CREATE INDEX "RefreshToken_expiresAt_idx" ON "RefreshToken"("expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "CredentialNFT_tokenId_key" ON "CredentialNFT"("tokenId");

-- CreateIndex
CREATE INDEX "CredentialNFT_userId_idx" ON "CredentialNFT"("userId");

-- CreateIndex
CREATE INDEX "CredentialNFT_credentialType_idx" ON "CredentialNFT"("credentialType");

-- CreateIndex
CREATE INDEX "CredentialNFT_tokenId_idx" ON "CredentialNFT"("tokenId");

-- CreateIndex
CREATE INDEX "CredentialNFT_contractAddress_idx" ON "CredentialNFT"("contractAddress");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowTransaction_escrowId_key" ON "EscrowTransaction"("escrowId");

-- CreateIndex
CREATE UNIQUE INDEX "EscrowTransaction_bookingId_key" ON "EscrowTransaction"("bookingId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_bookingId_idx" ON "EscrowTransaction"("bookingId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_learnerId_idx" ON "EscrowTransaction"("learnerId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_tutorId_idx" ON "EscrowTransaction"("tutorId");

-- CreateIndex
CREATE INDEX "EscrowTransaction_status_idx" ON "EscrowTransaction"("status");

-- CreateIndex
CREATE UNIQUE INDEX "OnChainReputation_userId_key" ON "OnChainReputation"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "OnChainReputation_walletAddress_key" ON "OnChainReputation"("walletAddress");

-- CreateIndex
CREATE INDEX "OnChainReputation_walletAddress_idx" ON "OnChainReputation"("walletAddress");

-- CreateIndex
CREATE INDEX "OnChainReputation_onChainScore_idx" ON "OnChainReputation"("onChainScore");

-- CreateIndex
CREATE UNIQUE INDEX "TokenTransaction_txHash_key" ON "TokenTransaction"("txHash");

-- CreateIndex
CREATE INDEX "TokenTransaction_userId_idx" ON "TokenTransaction"("userId");

-- CreateIndex
CREATE INDEX "TokenTransaction_txHash_idx" ON "TokenTransaction"("txHash");

-- CreateIndex
CREATE INDEX "TokenTransaction_type_idx" ON "TokenTransaction"("type");

-- CreateIndex
CREATE INDEX "TokenTransaction_status_idx" ON "TokenTransaction"("status");

-- CreateIndex
CREATE INDEX "TokenTransaction_tenantId_type_createdAt_idx" ON "TokenTransaction"("tenantId", "type", "createdAt");

-- CreateIndex
CREATE INDEX "AIBuddyConversation_tenantId_idx" ON "AIBuddyConversation"("tenantId");

-- CreateIndex
CREATE INDEX "AIBuddyConversation_tenantId_userId_idx" ON "AIBuddyConversation"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "AIBuddyConversation_userId_idx" ON "AIBuddyConversation"("userId");

-- CreateIndex
CREATE INDEX "AIBuddyConversation_status_idx" ON "AIBuddyConversation"("status");

-- CreateIndex
CREATE INDEX "AIBuddyConversation_lastMessageAt_idx" ON "AIBuddyConversation"("lastMessageAt");

-- CreateIndex
CREATE UNIQUE INDEX "AIBuddySettings_userId_tenantId_key" ON "AIBuddySettings"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "Portfolio_tenantId_idx" ON "Portfolio"("tenantId");

-- CreateIndex
CREATE INDEX "Portfolio_visibility_idx" ON "Portfolio"("visibility");

-- CreateIndex
CREATE UNIQUE INDEX "Portfolio_userId_tenantId_key" ON "Portfolio"("userId", "tenantId");

-- CreateIndex
CREATE INDEX "Artifact_portfolioId_idx" ON "Artifact"("portfolioId");

-- CreateIndex
CREATE INDEX "Artifact_tenantId_idx" ON "Artifact"("tenantId");

-- CreateIndex
CREATE INDEX "Artifact_userId_idx" ON "Artifact"("userId");

-- CreateIndex
CREATE INDEX "Artifact_type_idx" ON "Artifact"("type");

-- CreateIndex
CREATE INDEX "Artifact_status_idx" ON "Artifact"("status");

-- CreateIndex
CREATE INDEX "LearningGoal_portfolioId_idx" ON "LearningGoal"("portfolioId");

-- CreateIndex
CREATE INDEX "LearningGoal_tenantId_idx" ON "LearningGoal"("tenantId");

-- CreateIndex
CREATE INDEX "LearningGoal_userId_idx" ON "LearningGoal"("userId");

-- CreateIndex
CREATE INDEX "LearningGoal_status_idx" ON "LearningGoal"("status");

-- CreateIndex
CREATE INDEX "Achievement_portfolioId_idx" ON "Achievement"("portfolioId");

-- CreateIndex
CREATE INDEX "Achievement_tenantId_idx" ON "Achievement"("tenantId");

-- CreateIndex
CREATE INDEX "Achievement_userId_idx" ON "Achievement"("userId");

-- CreateIndex
CREATE INDEX "Achievement_type_idx" ON "Achievement"("type");

-- CreateIndex
CREATE INDEX "LearningJourney_portfolioId_idx" ON "LearningJourney"("portfolioId");

-- CreateIndex
CREATE INDEX "LearningJourney_tenantId_idx" ON "LearningJourney"("tenantId");

-- CreateIndex
CREATE INDEX "LearningJourney_userId_idx" ON "LearningJourney"("userId");

-- CreateIndex
CREATE INDEX "LearningJourney_status_idx" ON "LearningJourney"("status");

-- CreateIndex
CREATE INDEX "EduScrumTeam_tenantId_idx" ON "EduScrumTeam"("tenantId");

-- CreateIndex
CREATE INDEX "EduScrumTeam_tenantId_status_idx" ON "EduScrumTeam"("tenantId", "status");

-- CreateIndex
CREATE INDEX "EduScrumSprint_tenantId_idx" ON "EduScrumSprint"("tenantId");

-- CreateIndex
CREATE INDEX "EduScrumSprint_teamId_idx" ON "EduScrumSprint"("teamId");

-- CreateIndex
CREATE INDEX "EduScrumSprint_status_idx" ON "EduScrumSprint"("status");

-- CreateIndex
CREATE UNIQUE INDEX "EduScrumSprint_teamId_sprintNumber_key" ON "EduScrumSprint"("teamId", "sprintNumber");

-- CreateIndex
CREATE INDEX "EduScrumRetrospective_tenantId_idx" ON "EduScrumRetrospective"("tenantId");

-- CreateIndex
CREATE INDEX "EduScrumRetrospective_teamId_idx" ON "EduScrumRetrospective"("teamId");

-- CreateIndex
CREATE INDEX "EduScrumRetrospective_sprintId_idx" ON "EduScrumRetrospective"("sprintId");

-- CreateIndex
CREATE INDEX "ComplianceCheck_tenantId_idx" ON "ComplianceCheck"("tenantId");

-- CreateIndex
CREATE INDEX "ComplianceCheck_tenantId_entityType_entityId_idx" ON "ComplianceCheck"("tenantId", "entityType", "entityId");

-- CreateIndex
CREATE INDEX "ComplianceCheck_entityType_entityId_idx" ON "ComplianceCheck"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ComplianceCheck_framework_idx" ON "ComplianceCheck"("framework");

-- CreateIndex
CREATE INDEX "ComplianceCheck_status_idx" ON "ComplianceCheck"("status");

-- CreateIndex
CREATE INDEX "ComplianceReport_tenantId_idx" ON "ComplianceReport"("tenantId");

-- CreateIndex
CREATE INDEX "ComplianceReport_tenantId_generatedAt_idx" ON "ComplianceReport"("tenantId", "generatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "ACARACurriculumCode_code_key" ON "ACARACurriculumCode"("code");

-- CreateIndex
CREATE INDEX "ACARACurriculumCode_learningArea_idx" ON "ACARACurriculumCode"("learningArea");

-- CreateIndex
CREATE INDEX "ACARACurriculumCode_subject_idx" ON "ACARACurriculumCode"("subject");

-- CreateIndex
CREATE INDEX "ACARACurriculumCode_yearLevel_idx" ON "ACARACurriculumCode"("yearLevel");

-- CreateIndex
CREATE INDEX "ACARACurriculumCode_strand_idx" ON "ACARACurriculumCode"("strand");

-- CreateIndex
CREATE INDEX "Notification_tenantId_userId_idx" ON "Notification"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_inAppStatus_idx" ON "Notification"("userId", "inAppStatus");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_type_idx" ON "Notification"("type");

-- CreateIndex
CREATE INDEX "Notification_scheduledFor_idx" ON "Notification"("scheduledFor");

-- CreateIndex
CREATE INDEX "NotificationPreference_userId_idx" ON "NotificationPreference"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "NotificationPreference_tenantId_userId_key" ON "NotificationPreference"("tenantId", "userId");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_timestamp_idx" ON "AnalyticsEvent"("tenantId", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_eventType_timestamp_idx" ON "AnalyticsEvent"("tenantId", "eventType", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_tenantId_userId_timestamp_idx" ON "AnalyticsEvent"("tenantId", "userId", "timestamp");

-- CreateIndex
CREATE INDEX "AnalyticsEvent_entityType_entityId_idx" ON "AnalyticsEvent"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "ReportDefinition_tenantId_idx" ON "ReportDefinition"("tenantId");

-- CreateIndex
CREATE INDEX "ReportDefinition_tenantId_reportType_idx" ON "ReportDefinition"("tenantId", "reportType");

-- CreateIndex
CREATE INDEX "ReportDefinition_createdBy_idx" ON "ReportDefinition"("createdBy");

-- CreateIndex
CREATE INDEX "ReportExecution_tenantId_idx" ON "ReportExecution"("tenantId");

-- CreateIndex
CREATE INDEX "ReportExecution_reportId_idx" ON "ReportExecution"("reportId");

-- CreateIndex
CREATE INDEX "ReportExecution_status_idx" ON "ReportExecution"("status");

-- CreateIndex
CREATE INDEX "ReportExecution_createdAt_idx" ON "ReportExecution"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FeatureFlag_key_key" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_key_idx" ON "FeatureFlag"("key");

-- CreateIndex
CREATE INDEX "FeatureFlag_isEnabled_idx" ON "FeatureFlag"("isEnabled");

-- CreateIndex
CREATE INDEX "FeatureFlag_category_idx" ON "FeatureFlag"("category");

-- CreateIndex
CREATE UNIQUE INDEX "TenantConfiguration_tenantId_key" ON "TenantConfiguration"("tenantId");

-- CreateIndex
CREATE INDEX "TenantConfiguration_billingPlan_idx" ON "TenantConfiguration"("billingPlan");

-- CreateIndex
CREATE UNIQUE INDEX "DataMigration_name_key" ON "DataMigration"("name");

-- CreateIndex
CREATE INDEX "DataMigration_status_idx" ON "DataMigration"("status");

-- CreateIndex
CREATE INDEX "DataMigration_createdAt_idx" ON "DataMigration"("createdAt");

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_homeschoolFamilyId_fkey" FOREIGN KEY ("homeschoolFamilyId") REFERENCES "HomeschoolFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_microSchoolId_fkey" FOREIGN KEY ("microSchoolId") REFERENCES "MicroSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Address" ADD CONSTRAINT "Address_homeschoolCoopId_fkey" FOREIGN KEY ("homeschoolCoopId") REFERENCES "HomeschoolCoop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerProfile" ADD CONSTRAINT "LearnerProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerSubject" ADD CONSTRAINT "LearnerSubject_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "LearnerProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearnerSubject" ADD CONSTRAINT "LearnerSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ParentProfile" ADD CONSTRAINT "ParentProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorProfile" ADD CONSTRAINT "TutorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorAvailabilitySlot" ADD CONSTRAINT "TutorAvailabilitySlot_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorPricingTier" ADD CONSTRAINT "TutorPricingTier_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSubject" ADD CONSTRAINT "TutorSubject_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorSubject" ADD CONSTRAINT "TutorSubject_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutorQualification" ADD CONSTRAINT "TutorQualification_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SafeguardingCheck" ADD CONSTRAINT "SafeguardingCheck_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "TutorProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreatorProfile" ADD CONSTRAINT "CreatorProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_tutorId_fkey" FOREIGN KEY ("tutorId") REFERENCES "TutorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_bookedByUserId_fkey" FOREIGN KEY ("bookedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutoringSession" ADD CONSTRAINT "TutoringSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutoringSession" ADD CONSTRAINT "TutoringSession_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutoringSession" ADD CONSTRAINT "TutoringSession_tutorProfileId_fkey" FOREIGN KEY ("tutorProfileId") REFERENCES "TutorProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutoringSession" ADD CONSTRAINT "TutoringSession_tutorUserId_fkey" FOREIGN KEY ("tutorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TutoringSession" ADD CONSTRAINT "TutoringSession_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "TutoringSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionParticipant" ADD CONSTRAINT "SessionParticipant_learnerProfileId_fkey" FOREIGN KEY ("learnerProfileId") REFERENCES "LearnerProfile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CurriculumStandard" ADD CONSTRAINT "CurriculumStandard_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlanStandard" ADD CONSTRAINT "LessonPlanStandard_lessonPlanId_fkey" FOREIGN KEY ("lessonPlanId") REFERENCES "LessonPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LessonPlanStandard" ADD CONSTRAINT "LessonPlanStandard_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "CurriculumStandard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Content" ADD CONSTRAINT "Content_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAlignment" ADD CONSTRAINT "ContentAlignment_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentAlignment" ADD CONSTRAINT "ContentAlignment_standardId_fkey" FOREIGN KEY ("standardId") REFERENCES "CurriculumStandard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReview" ADD CONSTRAINT "ContentReview_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentReview" ADD CONSTRAINT "ContentReview_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPurchase" ADD CONSTRAINT "ContentPurchase_contentId_fkey" FOREIGN KEY ("contentId") REFERENCES "Content"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContentPurchase" ADD CONSTRAINT "ContentPurchase_buyerId_fkey" FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAssetRequest" ADD CONSTRAINT "LearningAssetRequest_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAssetVote" ADD CONSTRAINT "LearningAssetVote_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "LearningAssetRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningAssetVote" ADD CONSTRAINT "LearningAssetVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeschoolFamily" ADD CONSTRAINT "HomeschoolFamily_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeschoolChild" ADD CONSTRAINT "HomeschoolChild_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "HomeschoolFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HomeschoolCoop" ADD CONSTRAINT "HomeschoolCoop_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoopMember" ADD CONSTRAINT "CoopMember_coopId_fkey" FOREIGN KEY ("coopId") REFERENCES "HomeschoolCoop"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CoopMember" ADD CONSTRAINT "CoopMember_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "HomeschoolFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Excursion" ADD CONSTRAINT "Excursion_coopId_fkey" FOREIGN KEY ("coopId") REFERENCES "HomeschoolCoop"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcursionRegistration" ADD CONSTRAINT "ExcursionRegistration_excursionId_fkey" FOREIGN KEY ("excursionId") REFERENCES "Excursion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExcursionRegistration" ADD CONSTRAINT "ExcursionRegistration_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "HomeschoolFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroSchool" ADD CONSTRAINT "MicroSchool_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroSchoolStaff" ADD CONSTRAINT "MicroSchoolStaff_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "MicroSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MicroSchoolStudent" ADD CONSTRAINT "MicroSchoolStudent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "MicroSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EnrollmentApplication" ADD CONSTRAINT "EnrollmentApplication_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "MicroSchool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReliefTeacher" ADD CONSTRAINT "ReliefTeacher_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReliefPool" ADD CONSTRAINT "ReliefPool_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReliefPoolMember" ADD CONSTRAINT "ReliefPoolMember_poolId_fkey" FOREIGN KEY ("poolId") REFERENCES "ReliefPool"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReliefPoolMember" ADD CONSTRAINT "ReliefPoolMember_reliefTeacherId_fkey" FOREIGN KEY ("reliefTeacherId") REFERENCES "ReliefTeacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReliefAssignment" ADD CONSTRAINT "ReliefAssignment_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "TeacherAbsence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReliefAssignment" ADD CONSTRAINT "ReliefAssignment_reliefTeacherId_fkey" FOREIGN KEY ("reliefTeacherId") REFERENCES "ReliefTeacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReliefBooking" ADD CONSTRAINT "ReliefBooking_reliefTeacherId_fkey" FOREIGN KEY ("reliefTeacherId") REFERENCES "ReliefTeacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AbsenceNotification" ADD CONSTRAINT "AbsenceNotification_absenceId_fkey" FOREIGN KEY ("absenceId") REFERENCES "TeacherAbsence"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RefreshToken" ADD CONSTRAINT "RefreshToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialNFT" ADD CONSTRAINT "CredentialNFT_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EscrowTransaction" ADD CONSTRAINT "EscrowTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OnChainReputation" ADD CONSTRAINT "OnChainReputation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TokenTransaction" ADD CONSTRAINT "TokenTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Artifact" ADD CONSTRAINT "Artifact_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningGoal" ADD CONSTRAINT "LearningGoal_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningJourney" ADD CONSTRAINT "LearningJourney_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "Portfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduScrumSprint" ADD CONSTRAINT "EduScrumSprint_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "EduScrumTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EduScrumRetrospective" ADD CONSTRAINT "EduScrumRetrospective_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "EduScrumTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExecution" ADD CONSTRAINT "ReportExecution_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "ReportDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
