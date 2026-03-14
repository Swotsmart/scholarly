-- CreateEnum
CREATE TYPE "StorybookStatus" AS ENUM ('GENERATING', 'ILLUSTRATING', 'NARRATING', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED', 'FAILED');

-- CreateEnum
CREATE TYPE "ArtStyle" AS ENUM ('WATERCOLOUR', 'FLAT_VECTOR', 'SOFT_3D', 'CRAYON', 'PAPERCRAFT', 'STORYBOOK_CLASSIC', 'ANIME_SOFT', 'PIXEL_ART', 'COLLAGE', 'PENCIL_SKETCH', 'GOUACHE', 'DIGITAL_PAINT', 'WOODBLOCK', 'LINOCUT', 'POP_ART');

-- CreateEnum
CREATE TYPE "ReviewStage" AS ENUM ('AUTOMATED_VALIDATION', 'AI_REVIEW', 'PEER_REVIEW', 'PILOT_TESTING', 'LIBRARY_PUBLICATION');

-- CreateTable (must come before Storybook due to FK)
CREATE TABLE "StorybookSeries" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "theme" TEXT,
    "narrativeArc" TEXT,
    "targetPhases" JSONB NOT NULL,
    "ageGroupMin" INTEGER NOT NULL DEFAULT 3,
    "ageGroupMax" INTEGER NOT NULL DEFAULT 7,
    "artStyle" "ArtStyle" NOT NULL DEFAULT 'WATERCOLOUR',
    "coverImageUrl" TEXT,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "StorybookSeries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Storybook" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "StorybookStatus" NOT NULL DEFAULT 'GENERATING',
    "creatorId" TEXT NOT NULL,
    "creatorType" TEXT NOT NULL DEFAULT 'ai',
    "seriesId" TEXT,
    "seriesOrder" INTEGER,
    "phonicsPhase" INTEGER NOT NULL,
    "targetGpcs" JSONB NOT NULL,
    "taughtGpcSet" JSONB NOT NULL,
    "decodabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "wcpmBand" JSONB,
    "vocabularyTier" TEXT NOT NULL DEFAULT 'tier_1',
    "morphemeFocus" JSONB,
    "comprehensionStrand" TEXT,
    "eylfAlignment" JSONB,
    "ibPypAlignment" JSONB,
    "culturalContext" JSONB,
    "ageGroupMin" INTEGER NOT NULL DEFAULT 3,
    "ageGroupMax" INTEGER NOT NULL DEFAULT 7,
    "artStyle" "ArtStyle" NOT NULL DEFAULT 'WATERCOLOUR',
    "themes" JSONB NOT NULL,
    "narrativeTemplate" TEXT,
    "pageCount" INTEGER NOT NULL DEFAULT 0,
    "generationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "generationModel" TEXT,
    "generationPrompt" JSONB,

    CONSTRAINT "Storybook_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorybookPage" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storybookId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "illustrationUrl" TEXT,
    "audioUrl" TEXT,
    "wordTimestamps" JSONB,
    "sceneLayout" JSONB,
    "textOverlayZone" JSONB,
    "decodableWords" JSONB,
    "nonDecodableWords" JSONB,

    CONSTRAINT "StorybookPage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorybookCharacter" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "personalityTraits" JSONB,
    "styleSheetUrl" TEXT,
    "stylePrompt" TEXT,
    "artStyle" "ArtStyle",
    "seriesId" TEXT,
    "creatorId" TEXT NOT NULL,

    CONSTRAINT "StorybookCharacter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorybookIllustration" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storybookId" TEXT NOT NULL,
    "pageNumber" INTEGER,
    "prompt" TEXT NOT NULL,
    "negativePrompt" TEXT,
    "model" TEXT NOT NULL,
    "artStyle" "ArtStyle" NOT NULL,
    "seed" INTEGER,
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "moderationResult" JSONB,
    "moderationPassed" BOOLEAN NOT NULL DEFAULT true,
    "generationCost" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "StorybookIllustration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorybookReview" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "storybookId" TEXT NOT NULL,
    "stage" "ReviewStage" NOT NULL,
    "reviewerId" TEXT,
    "reviewerType" TEXT NOT NULL DEFAULT 'automated',
    "overallScore" DOUBLE PRECISION,
    "decodabilityOk" BOOLEAN NOT NULL DEFAULT false,
    "safetyOk" BOOLEAN NOT NULL DEFAULT false,
    "curriculumAligned" BOOLEAN NOT NULL DEFAULT false,
    "narrativeCoherent" BOOLEAN NOT NULL DEFAULT false,
    "ageAppropriate" BOOLEAN NOT NULL DEFAULT false,
    "comments" TEXT,
    "structuredReport" JSONB,
    "passed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "StorybookReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StorybookAnalytics" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "storybookId" TEXT NOT NULL,
    "readCount" INTEGER NOT NULL DEFAULT 0,
    "uniqueReaders" INTEGER NOT NULL DEFAULT 0,
    "completionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reReadRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgTimeSeconds" INTEGER NOT NULL DEFAULT 0,
    "avgAccuracy" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "avgWcpm" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "gpcMasteryImpact" JSONB,
    "avgRating" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StorybookAnalytics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DeviceStorybook" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deviceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storybookId" TEXT NOT NULL,
    "downloadStatus" TEXT NOT NULL DEFAULT 'pending',
    "storageSizeBytes" INTEGER NOT NULL DEFAULT 0,
    "syncVersion" INTEGER NOT NULL DEFAULT 1,
    "lastAccessedAt" TIMESTAMP(3),
    "currentPage" INTEGER NOT NULL DEFAULT 0,
    "currentWordIndex" INTEGER NOT NULL DEFAULT 0,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "DeviceStorybook_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorybookSeries_id_tenantId_key" ON "StorybookSeries"("id", "tenantId");
CREATE UNIQUE INDEX "StorybookSeries_tenantId_slug_key" ON "StorybookSeries"("tenantId", "slug");
CREATE INDEX "StorybookSeries_tenantId_creatorId_idx" ON "StorybookSeries"("tenantId", "creatorId");

-- CreateIndex
CREATE UNIQUE INDEX "Storybook_id_tenantId_key" ON "Storybook"("id", "tenantId");
CREATE UNIQUE INDEX "Storybook_tenantId_slug_key" ON "Storybook"("tenantId", "slug");
CREATE INDEX "Storybook_tenantId_status_idx" ON "Storybook"("tenantId", "status");
CREATE INDEX "Storybook_tenantId_phonicsPhase_idx" ON "Storybook"("tenantId", "phonicsPhase");
CREATE INDEX "Storybook_tenantId_creatorId_idx" ON "Storybook"("tenantId", "creatorId");
CREATE INDEX "Storybook_tenantId_seriesId_idx" ON "Storybook"("tenantId", "seriesId");

-- CreateIndex
CREATE UNIQUE INDEX "StorybookPage_storybookId_pageNumber_key" ON "StorybookPage"("storybookId", "pageNumber");
CREATE INDEX "StorybookPage_tenantId_storybookId_idx" ON "StorybookPage"("tenantId", "storybookId");

-- CreateIndex
CREATE UNIQUE INDEX "StorybookCharacter_id_tenantId_key" ON "StorybookCharacter"("id", "tenantId");
CREATE INDEX "StorybookCharacter_tenantId_seriesId_idx" ON "StorybookCharacter"("tenantId", "seriesId");
CREATE INDEX "StorybookCharacter_tenantId_creatorId_idx" ON "StorybookCharacter"("tenantId", "creatorId");

-- CreateIndex
CREATE INDEX "StorybookIllustration_tenantId_storybookId_idx" ON "StorybookIllustration"("tenantId", "storybookId");

-- CreateIndex
CREATE INDEX "StorybookReview_tenantId_storybookId_idx" ON "StorybookReview"("tenantId", "storybookId");
CREATE INDEX "StorybookReview_tenantId_stage_idx" ON "StorybookReview"("tenantId", "stage");
CREATE INDEX "StorybookReview_tenantId_reviewerId_idx" ON "StorybookReview"("tenantId", "reviewerId");

-- CreateIndex
CREATE UNIQUE INDEX "StorybookAnalytics_storybookId_key" ON "StorybookAnalytics"("storybookId");
CREATE INDEX "StorybookAnalytics_tenantId_idx" ON "StorybookAnalytics"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "DeviceStorybook_deviceId_storybookId_key" ON "DeviceStorybook"("deviceId", "storybookId");
CREATE INDEX "DeviceStorybook_tenantId_userId_idx" ON "DeviceStorybook"("tenantId", "userId");
CREATE INDEX "DeviceStorybook_tenantId_deviceId_idx" ON "DeviceStorybook"("tenantId", "deviceId");

-- AddForeignKey
ALTER TABLE "Storybook" ADD CONSTRAINT "Storybook_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "StorybookSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorybookPage" ADD CONSTRAINT "StorybookPage_storybookId_fkey" FOREIGN KEY ("storybookId") REFERENCES "Storybook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorybookCharacter" ADD CONSTRAINT "StorybookCharacter_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "StorybookSeries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorybookIllustration" ADD CONSTRAINT "StorybookIllustration_storybookId_fkey" FOREIGN KEY ("storybookId") REFERENCES "Storybook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorybookReview" ADD CONSTRAINT "StorybookReview_storybookId_fkey" FOREIGN KEY ("storybookId") REFERENCES "Storybook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StorybookAnalytics" ADD CONSTRAINT "StorybookAnalytics_storybookId_fkey" FOREIGN KEY ("storybookId") REFERENCES "Storybook"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DeviceStorybook" ADD CONSTRAINT "DeviceStorybook_storybookId_fkey" FOREIGN KEY ("storybookId") REFERENCES "Storybook"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
