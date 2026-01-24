-- CreateTable
CREATE TABLE "DesignChallenge" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "complexity" TEXT NOT NULL DEFAULT 'intermediate',
    "estimatedDuration" TEXT NOT NULL,
    "subject" TEXT,
    "yearLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "curriculumCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "generalCapabilities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "crossCurriculumPriorities" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "constraints" JSONB NOT NULL DEFAULT '[]',
    "resourceLinks" JSONB NOT NULL DEFAULT '[]',
    "exemplars" JSONB NOT NULL DEFAULT '[]',
    "rubric" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignChallenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignJourney" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "currentPhase" TEXT NOT NULL DEFAULT 'empathize',
    "status" TEXT NOT NULL DEFAULT 'in_progress',
    "problemStatement" TEXT,
    "hmwStatement" TEXT,
    "problemValidation" JSONB,
    "empathizeData" JSONB NOT NULL DEFAULT '{}',
    "defineData" JSONB NOT NULL DEFAULT '{}',
    "ideateData" JSONB NOT NULL DEFAULT '{}',
    "prototypeData" JSONB NOT NULL DEFAULT '{}',
    "iterateData" JSONB NOT NULL DEFAULT '{}',
    "pitchData" JSONB NOT NULL DEFAULT '{}',
    "phaseProgress" JSONB NOT NULL DEFAULT '{}',
    "overallProgress" INTEGER NOT NULL DEFAULT 0,
    "aiInteractions" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),
    "finalScore" DOUBLE PRECISION,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignJourney_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignArtifact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "phase" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "fileUrl" TEXT,
    "thumbnailUrl" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "parentArtifactId" TEXT,
    "aiAnalysis" JSONB,
    "skillsTagged" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "qualityScore" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignArtifact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignPeerReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "reviewerId" TEXT NOT NULL,
    "artifactIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "isAnonymous" BOOLEAN NOT NULL DEFAULT true,
    "feedback" TEXT NOT NULL,
    "feedbackPins" JSONB NOT NULL DEFAULT '[]',
    "rubricScores" JSONB,
    "overallScore" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueAt" TIMESTAMP(3),
    "submittedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignPeerReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DesignPitchDeck" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slides" JSONB NOT NULL,
    "slideCount" INTEGER NOT NULL DEFAULT 0,
    "estimatedDuration" INTEGER NOT NULL DEFAULT 0,
    "minFontSize" INTEGER NOT NULL DEFAULT 30,
    "aiCoachingNotes" JSONB NOT NULL DEFAULT '[]',
    "lastCoachingAt" TIMESTAMP(3),
    "readinessScore" DOUBLE PRECISION,
    "practiceRuns" JSONB NOT NULL DEFAULT '[]',
    "presentationDate" TIMESTAMP(3),
    "presentedTo" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "finalScore" DOUBLE PRECISION,
    "evaluatorFeedback" JSONB,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DesignPitchDeck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowcasePortfolio" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "journeyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "headline" TEXT NOT NULL,
    "bio" TEXT,
    "avatarUrl" TEXT,
    "coverImageUrl" TEXT,
    "customSlug" TEXT,
    "vanityUrl" TEXT,
    "visibility" TEXT NOT NULL DEFAULT 'private',
    "theme" JSONB NOT NULL DEFAULT '{}',
    "layout" TEXT NOT NULL DEFAULT 'standard',
    "executiveSummary" TEXT,
    "growthNarrative" TEXT,
    "skillTags" JSONB NOT NULL DEFAULT '[]',
    "totalViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueViews" INTEGER NOT NULL DEFAULT 0,
    "averageTimeOnPage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowcasePortfolio_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowcaseItem" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "artifactId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL,
    "curatedContent" JSONB NOT NULL,
    "mediaUrl" TEXT,
    "thumbnailUrl" TEXT,
    "curatorNotes" TEXT,
    "skillsHighlighted" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShowcaseItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowcaseGuestbook" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "authorName" TEXT NOT NULL,
    "authorEmail" TEXT,
    "authorCompany" TEXT,
    "authorRole" TEXT,
    "message" TEXT NOT NULL,
    "rating" INTEGER,
    "isApproved" BOOLEAN NOT NULL DEFAULT false,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowcaseGuestbook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShowcaseViewLog" (
    "id" TEXT NOT NULL,
    "portfolioId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "referrer" TEXT,
    "userAgent" TEXT,
    "country" TEXT,
    "city" TEXT,
    "duration" INTEGER NOT NULL DEFAULT 0,
    "itemsViewed" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "interactions" JSONB NOT NULL DEFAULT '[]',
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ShowcaseViewLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DesignChallenge_tenantId_idx" ON "DesignChallenge"("tenantId");

-- CreateIndex
CREATE INDEX "DesignChallenge_status_idx" ON "DesignChallenge"("status");

-- CreateIndex
CREATE INDEX "DesignChallenge_complexity_idx" ON "DesignChallenge"("complexity");

-- CreateIndex
CREATE INDEX "DesignChallenge_subject_idx" ON "DesignChallenge"("subject");

-- CreateIndex
CREATE INDEX "DesignJourney_tenantId_idx" ON "DesignJourney"("tenantId");

-- CreateIndex
CREATE INDEX "DesignJourney_userId_idx" ON "DesignJourney"("userId");

-- CreateIndex
CREATE INDEX "DesignJourney_challengeId_idx" ON "DesignJourney"("challengeId");

-- CreateIndex
CREATE INDEX "DesignJourney_status_idx" ON "DesignJourney"("status");

-- CreateIndex
CREATE INDEX "DesignJourney_currentPhase_idx" ON "DesignJourney"("currentPhase");

-- CreateIndex
CREATE INDEX "DesignArtifact_tenantId_idx" ON "DesignArtifact"("tenantId");

-- CreateIndex
CREATE INDEX "DesignArtifact_journeyId_idx" ON "DesignArtifact"("journeyId");

-- CreateIndex
CREATE INDEX "DesignArtifact_userId_idx" ON "DesignArtifact"("userId");

-- CreateIndex
CREATE INDEX "DesignArtifact_type_idx" ON "DesignArtifact"("type");

-- CreateIndex
CREATE INDEX "DesignArtifact_phase_idx" ON "DesignArtifact"("phase");

-- CreateIndex
CREATE INDEX "DesignPeerReview_tenantId_idx" ON "DesignPeerReview"("tenantId");

-- CreateIndex
CREATE INDEX "DesignPeerReview_journeyId_idx" ON "DesignPeerReview"("journeyId");

-- CreateIndex
CREATE INDEX "DesignPeerReview_reviewerId_idx" ON "DesignPeerReview"("reviewerId");

-- CreateIndex
CREATE INDEX "DesignPeerReview_status_idx" ON "DesignPeerReview"("status");

-- CreateIndex
CREATE UNIQUE INDEX "DesignPeerReview_journeyId_reviewerId_key" ON "DesignPeerReview"("journeyId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "DesignPitchDeck_journeyId_key" ON "DesignPitchDeck"("journeyId");

-- CreateIndex
CREATE INDEX "DesignPitchDeck_tenantId_idx" ON "DesignPitchDeck"("tenantId");

-- CreateIndex
CREATE INDEX "DesignPitchDeck_userId_idx" ON "DesignPitchDeck"("userId");

-- CreateIndex
CREATE INDEX "DesignPitchDeck_status_idx" ON "DesignPitchDeck"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ShowcasePortfolio_journeyId_key" ON "ShowcasePortfolio"("journeyId");

-- CreateIndex
CREATE UNIQUE INDEX "ShowcasePortfolio_customSlug_key" ON "ShowcasePortfolio"("customSlug");

-- CreateIndex
CREATE INDEX "ShowcasePortfolio_tenantId_idx" ON "ShowcasePortfolio"("tenantId");

-- CreateIndex
CREATE INDEX "ShowcasePortfolio_userId_idx" ON "ShowcasePortfolio"("userId");

-- CreateIndex
CREATE INDEX "ShowcasePortfolio_status_idx" ON "ShowcasePortfolio"("status");

-- CreateIndex
CREATE INDEX "ShowcasePortfolio_customSlug_idx" ON "ShowcasePortfolio"("customSlug");

-- CreateIndex
CREATE INDEX "ShowcaseItem_portfolioId_idx" ON "ShowcaseItem"("portfolioId");

-- CreateIndex
CREATE INDEX "ShowcaseItem_artifactId_idx" ON "ShowcaseItem"("artifactId");

-- CreateIndex
CREATE INDEX "ShowcaseGuestbook_portfolioId_idx" ON "ShowcaseGuestbook"("portfolioId");

-- CreateIndex
CREATE INDEX "ShowcaseGuestbook_isApproved_idx" ON "ShowcaseGuestbook"("isApproved");

-- CreateIndex
CREATE INDEX "ShowcaseViewLog_portfolioId_idx" ON "ShowcaseViewLog"("portfolioId");

-- CreateIndex
CREATE INDEX "ShowcaseViewLog_viewedAt_idx" ON "ShowcaseViewLog"("viewedAt");

-- AddForeignKey
ALTER TABLE "DesignJourney" ADD CONSTRAINT "DesignJourney_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "DesignChallenge"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignArtifact" ADD CONSTRAINT "DesignArtifact_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "DesignJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignPeerReview" ADD CONSTRAINT "DesignPeerReview_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "DesignJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DesignPitchDeck" ADD CONSTRAINT "DesignPitchDeck_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "DesignJourney"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcasePortfolio" ADD CONSTRAINT "ShowcasePortfolio_journeyId_fkey" FOREIGN KEY ("journeyId") REFERENCES "DesignJourney"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseItem" ADD CONSTRAINT "ShowcaseItem_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "ShowcasePortfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseGuestbook" ADD CONSTRAINT "ShowcaseGuestbook_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "ShowcasePortfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShowcaseViewLog" ADD CONSTRAINT "ShowcaseViewLog_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "ShowcasePortfolio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
