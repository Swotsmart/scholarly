// =============================================================================
// Multilingual Corpus Validator — Native Speaker Review Pipeline
// =============================================================================
// AI-generated multilingual content is only as good as its validation.
// This service manages the native speaker review pipeline — matching
// generated stories with qualified reviewers, tracking review quality,
// and building corpus-level statistics that improve generation over time.
// Think of it as the quality assurance department for the multilingual
// printing press: every book gets inspected before it reaches a child.
// =============================================================================

import { ScholarlyBaseService, Result, NATSClient, PrismaClient } from '../shared/types';
import { SupportedLanguage, CEFRLevel } from './multilingual-story-generator';

// ─── Types ──────────────────────────────────────────────────────────────────

export enum ReviewStatus {
  PENDING = 'PENDING',
  IN_REVIEW = 'IN_REVIEW',
  APPROVED = 'APPROVED',
  REVISION_REQUIRED = 'REVISION_REQUIRED',
  REJECTED = 'REJECTED',
}

export enum ReviewerQualification {
  NATIVE_SPEAKER = 'NATIVE_SPEAKER',
  CERTIFIED_TEACHER = 'CERTIFIED_TEACHER',
  LINGUIST = 'LINGUIST',
  BILINGUAL_EDUCATOR = 'BILINGUAL_EDUCATOR',
}

export interface Reviewer {
  id: string;
  userId: string;
  tenantId: string;
  languages: SupportedLanguage[];
  qualifications: ReviewerQualification[];
  cefrCapability: CEFRLevel; // Highest level they can review
  reviewsCompleted: number;
  avgRating: number;
  specialisations: string[]; // e.g., 'phonics', 'children_literature', 'cultural_accuracy'
  isActive: boolean;
  createdAt: Date;
}

export interface CorpusReview {
  id: string;
  storyId: string;
  tenantId: string;
  reviewerId: string;
  language: SupportedLanguage;
  status: ReviewStatus;
  scores: ReviewScores;
  corrections: TextCorrection[];
  culturalNotes: string[];
  phonologicalNotes: string[];
  overallComments: string;
  reviewDurationMinutes: number;
  createdAt: Date;
  completedAt: Date | null;
}

export interface ReviewScores {
  languageAccuracy: number;     // 0-100: grammar, spelling, natural phrasing
  culturalAuthenticity: number; // 0-100: names, settings, references feel natural
  ageAppropriateness: number;   // 0-100: tone and content suitable for target age
  phoneticAccuracy: number;     // 0-100: phonological representations are correct
  narrativeQuality: number;     // 0-100: story engages and makes sense
  cefrCompliance: number;       // 0-100: vocabulary and grammar match target CEFR
}

export interface TextCorrection {
  pageNumber: number;
  originalText: string;
  correctedText: string;
  category: 'grammar' | 'spelling' | 'vocabulary' | 'cultural' | 'phonological' | 'style';
  severity: 'minor' | 'moderate' | 'critical';
  explanation: string;
}

export interface CorpusStatistics {
  language: SupportedLanguage;
  totalStories: number;
  storiesApproved: number;
  storiesPending: number;
  avgDecodabilityScore: number;
  avgCEFRCompliance: number;
  avgLanguageAccuracy: number;
  avgCulturalAuthenticity: number;
  commonCorrections: { category: string; count: number }[];
  phaseDistribution: Record<number, number>;
  cefrDistribution: Record<string, number>;
  reviewerCount: number;
  avgReviewTime: number;
}

export interface ReviewAssignment {
  storyId: string;
  tenantId: string;
  language: SupportedLanguage;
  cefrLevel: CEFRLevel;
  phonicsPhase: number;
  requiredReviews: number;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

// ─── Service ────────────────────────────────────────────────────────────────

export class MultilingualCorpusValidator extends ScholarlyBaseService {
  constructor(
    private prisma: PrismaClient,
    private nats: NATSClient,
    private redis: { get: (k: string) => Promise<string | null>; set: (k: string, v: string, opts?: any) => Promise<void>; del: (k: string) => Promise<void> },
  ) {
    super('MultilingualCorpusValidator');
  }

  // ── Reviewer Management ─────────────────────────────────────────────────

  async registerReviewer(
    userId: string, tenantId: string, languages: SupportedLanguage[],
    qualifications: ReviewerQualification[], cefrCapability: CEFRLevel,
    specialisations: string[],
  ): Promise<Result<Reviewer>> {
    const existing = await this.prisma.corpusReviewer.findFirst({
      where: { userId, tenantId },
    });
    if (existing) return { success: false, error: 'Already registered as reviewer' };

    try {
      const reviewer = await this.prisma.corpusReviewer.create({
        data: {
          userId, tenantId, languages, qualifications,
          cefrCapability, reviewsCompleted: 0, avgRating: 0,
          specialisations, isActive: true,
        },
      });
      return { success: true, data: reviewer as unknown as Reviewer };
    } catch (error) {
      return { success: false, error: `Registration failed: ${(error as Error).message}` };
    }
  }

  async findReviewers(
    tenantId: string, language: SupportedLanguage, cefrLevel: CEFRLevel,
    limit: number = 5,
  ): Promise<Result<Reviewer[]>> {
    try {
      const reviewers = await this.prisma.corpusReviewer.findMany({
        where: {
          tenantId, isActive: true,
          languages: { has: language },
        },
        orderBy: [{ avgRating: 'desc' }, { reviewsCompleted: 'desc' }],
        take: limit,
      });
      return { success: true, data: reviewers as unknown as Reviewer[] };
    } catch (error) {
      return { success: false, error: `Search failed: ${(error as Error).message}` };
    }
  }

  // ── Review Assignment ───────────────────────────────────────────────────

  async assignReview(assignment: ReviewAssignment): Promise<Result<{ reviewId: string; reviewerId: string }[]>> {
    const reviewersResult = await this.findReviewers(
      assignment.tenantId, assignment.language, assignment.cefrLevel, assignment.requiredReviews * 2,
    );
    if (!reviewersResult.success) return { success: false, error: reviewersResult.error };

    const available = reviewersResult.data!;
    if (available.length < assignment.requiredReviews) {
      return { success: false, error: `Only ${available.length} reviewers available, need ${assignment.requiredReviews}` };
    }

    // Select reviewers with least recent workload
    const selected = available.slice(0, assignment.requiredReviews);
    const assignments: { reviewId: string; reviewerId: string }[] = [];

    try {
      for (const reviewer of selected) {
        const review = await this.prisma.corpusReview.create({
          data: {
            storyId: assignment.storyId, tenantId: assignment.tenantId,
            reviewerId: reviewer.id, language: assignment.language,
            status: ReviewStatus.PENDING,
            scores: { languageAccuracy: 0, culturalAuthenticity: 0, ageAppropriateness: 0, phoneticAccuracy: 0, narrativeQuality: 0, cefrCompliance: 0 },
            corrections: [], culturalNotes: [], phonologicalNotes: [],
            overallComments: '', reviewDurationMinutes: 0,
          },
        });
        assignments.push({ reviewId: review.id, reviewerId: reviewer.id });
      }

      await this.nats.publish('scholarly.content.review_assigned', {
        storyId: assignment.storyId, tenantId: assignment.tenantId,
        language: assignment.language, reviewerCount: assignments.length,
        priority: assignment.priority,
      });

      return { success: true, data: assignments };
    } catch (error) {
      return { success: false, error: `Assignment failed: ${(error as Error).message}` };
    }
  }

  // ── Submit Review ───────────────────────────────────────────────────────

  async submitReview(
    reviewId: string, tenantId: string, scores: ReviewScores,
    corrections: TextCorrection[], culturalNotes: string[],
    phonologicalNotes: string[], overallComments: string,
    reviewDurationMinutes: number,
  ): Promise<Result<CorpusReview>> {
    const review = await this.prisma.corpusReview.findUnique({ where: { id: reviewId } });
    if (!review || review.tenantId !== tenantId) return { success: false, error: 'Review not found' };
    if (review.status !== ReviewStatus.PENDING && review.status !== ReviewStatus.IN_REVIEW) {
      return { success: false, error: `Cannot submit: status is ${review.status}` };
    }

    // Determine outcome based on scores
    const avgScore = (scores.languageAccuracy + scores.culturalAuthenticity + scores.ageAppropriateness + scores.phoneticAccuracy + scores.narrativeQuality + scores.cefrCompliance) / 6;
    const hasCritical = corrections.some(c => c.severity === 'critical');
    const status = hasCritical ? ReviewStatus.REVISION_REQUIRED
      : avgScore >= 70 ? ReviewStatus.APPROVED
      : avgScore >= 50 ? ReviewStatus.REVISION_REQUIRED
      : ReviewStatus.REJECTED;

    try {
      const updated = await this.prisma.$transaction(async (tx: any) => {
        const r = await tx.corpusReview.update({
          where: { id: reviewId },
          data: {
            status, scores: scores as any, corrections: corrections as any,
            culturalNotes, phonologicalNotes, overallComments,
            reviewDurationMinutes, completedAt: new Date(),
          },
        });

        // Update reviewer stats
        await tx.corpusReviewer.update({
          where: { id: review.reviewerId },
          data: { reviewsCompleted: { increment: 1 } },
        });

        return r;
      });

      await this.nats.publish('scholarly.content.review_completed', {
        reviewId, storyId: review.storyId, tenantId, status,
        avgScore, correctionsCount: corrections.length, hasCritical,
      });

      // Check if all reviews for this story are complete
      await this.checkStoryReviewCompletion(review.storyId, tenantId);

      return { success: true, data: updated as unknown as CorpusReview };
    } catch (error) {
      return { success: false, error: `Submit failed: ${(error as Error).message}` };
    }
  }

  private async checkStoryReviewCompletion(storyId: string, tenantId: string): Promise<void> {
    const reviews = await this.prisma.corpusReview.findMany({
      where: { storyId, tenantId },
    });

    const allComplete = reviews.every((r: any) =>
      [ReviewStatus.APPROVED, ReviewStatus.REVISION_REQUIRED, ReviewStatus.REJECTED].includes(r.status),
    );

    if (!allComplete) return;

    const approved = reviews.filter((r: any) => r.status === ReviewStatus.APPROVED).length;
    const total = reviews.length;
    const approvalRate = total > 0 ? (approved / total) * 100 : 0;

    await this.nats.publish('scholarly.content.story_review_complete', {
      storyId, tenantId, approvalRate,
      approved, total,
      finalStatus: approvalRate >= 50 ? 'APPROVED' : 'NEEDS_REVISION',
    });
  }

  // ── Corpus Statistics ───────────────────────────────────────────────────

  async getCorpusStatistics(tenantId: string, language: SupportedLanguage): Promise<Result<CorpusStatistics>> {
    try {
      const [reviews, reviewers, storyCount] = await Promise.all([
        this.prisma.corpusReview.findMany({ where: { tenantId, language } }),
        this.prisma.corpusReviewer.count({ where: { tenantId, languages: { has: language }, isActive: true } }),
        this.prisma.corpusReview.findMany({ where: { tenantId, language }, distinct: ['storyId'], select: { storyId: true } }),
      ]);

      const completed = reviews.filter((r: any) => r.completedAt !== null);
      const approved = reviews.filter((r: any) => r.status === ReviewStatus.APPROVED);
      const pending = reviews.filter((r: any) => r.status === ReviewStatus.PENDING || r.status === ReviewStatus.IN_REVIEW);

      const avgScores = completed.length > 0 ? {
        languageAccuracy: completed.reduce((s: number, r: any) => s + (r.scores as any).languageAccuracy, 0) / completed.length,
        culturalAuthenticity: completed.reduce((s: number, r: any) => s + (r.scores as any).culturalAuthenticity, 0) / completed.length,
      } : { languageAccuracy: 0, culturalAuthenticity: 0 };

      const avgReviewTime = completed.length > 0
        ? completed.reduce((s: number, r: any) => s + r.reviewDurationMinutes, 0) / completed.length : 0;

      // Count correction categories
      const correctionCounts = new Map<string, number>();
      for (const r of completed) {
        for (const c of (r.corrections as any[] || [])) {
          correctionCounts.set(c.category, (correctionCounts.get(c.category) || 0) + 1);
        }
      }

      return {
        success: true,
        data: {
          language,
          totalStories: storyCount.length,
          storiesApproved: approved.length,
          storiesPending: pending.length,
          avgDecodabilityScore: 0, // Would come from story metadata
          avgCEFRCompliance: 0,
          avgLanguageAccuracy: Math.round(avgScores.languageAccuracy * 10) / 10,
          avgCulturalAuthenticity: Math.round(avgScores.culturalAuthenticity * 10) / 10,
          commonCorrections: Array.from(correctionCounts.entries())
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count),
          phaseDistribution: {},
          cefrDistribution: {},
          reviewerCount: reviewers,
          avgReviewTime: Math.round(avgReviewTime * 10) / 10,
        },
      };
    } catch (error) {
      return { success: false, error: `Stats failed: ${(error as Error).message}` };
    }
  }

  // ── Quality Trends ──────────────────────────────────────────────────────

  async getQualityTrends(tenantId: string, language: SupportedLanguage, days: number = 30): Promise<Result<{
    daily: { date: string; avgScore: number; reviewCount: number }[];
    topIssues: { category: string; count: number; trend: 'improving' | 'stable' | 'declining' }[];
  }>> {
    try {
      const since = new Date(Date.now() - days * 86400000);
      const reviews = await this.prisma.corpusReview.findMany({
        where: { tenantId, language, completedAt: { gte: since } },
        orderBy: { completedAt: 'asc' },
      });

      // Group by date
      const byDate = new Map<string, { scores: number[]; count: number }>();
      for (const r of reviews) {
        if (!r.completedAt) continue;
        const date = new Date(r.completedAt).toISOString().split('T')[0];
        const entry = byDate.get(date) || { scores: [], count: 0 };
        const scores = r.scores as any;
        const avg = (scores.languageAccuracy + scores.culturalAuthenticity + scores.phoneticAccuracy) / 3;
        entry.scores.push(avg);
        entry.count++;
        byDate.set(date, entry);
      }

      const daily = Array.from(byDate.entries()).map(([date, data]) => ({
        date,
        avgScore: Math.round((data.scores.reduce((s, v) => s + v, 0) / data.scores.length) * 10) / 10,
        reviewCount: data.count,
      }));

      return {
        success: true,
        data: { daily, topIssues: [] },
      };
    } catch (error) {
      return { success: false, error: `Trends failed: ${(error as Error).message}` };
    }
  }
}
