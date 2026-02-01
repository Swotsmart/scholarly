/**
 * Assessment Repository - Prisma Implementation
 * 
 * Implements the AssessmentRepository interface using Prisma ORM.
 * Handles all database operations for assessment definitions with
 * proper multi-tenant isolation and error handling.
 * 
 * @module IntelligenceMesh/Assessment/Repositories
 * @version 1.5.0
 */

import { PrismaClient, Prisma, AssessmentDefinition as PrismaAssessment } from '@prisma/client';
import {
  AssessmentRepository,
  AssessmentSearchFilters,
  AssessmentSearchQuery,
  AssessmentSearchResult
} from '../assessment.service';
import {
  AssessmentDefinition,
  AssessmentPurpose,
  AssessmentFormat,
  AIPolicy
} from '../assessment.types';

// ============================================================================
// TYPE MAPPERS
// ============================================================================

function mapPrismaToAssessment(prisma: PrismaAssessment): AssessmentDefinition {
  return {
    id: prisma.id,
    tenantId: prisma.tenantId,
    createdAt: prisma.createdAt,
    updatedAt: prisma.updatedAt,
    createdBy: prisma.createdBy,
    updatedBy: prisma.updatedBy,
    schoolId: prisma.schoolId,
    code: prisma.code,
    title: prisma.title,
    description: prisma.description,
    purpose: prisma.purpose as AssessmentPurpose,
    format: prisma.format as AssessmentFormat,
    yearLevels: prisma.yearLevels,
    subjects: prisma.subjects,
    curriculumCodes: prisma.curriculumCodes,
    learningObjectives: prisma.learningObjectives,
    totalMarks: prisma.totalMarks,
    passingMarks: prisma.passingMarks ?? undefined,
    weightInGradebook: prisma.weightInGradebook ?? undefined,
    duration: prisma.duration ?? undefined,
    availableFrom: prisma.availableFrom ?? undefined,
    availableTo: prisma.availableTo ?? undefined,
    lateSubmissionPolicy: prisma.lateSubmissionPolicy as any,
    sections: prisma.sections as any,
    rubricId: prisma.rubricId ?? undefined,
    aiPolicy: prisma.aiPolicy as AIPolicy,
    aiPolicyExplanation: prisma.aiPolicyExplanation ?? undefined,
    integritySettings: prisma.integritySettings as any,
    allowedAccommodations: prisma.allowedAccommodations as any[],
    peerReviewSettings: prisma.peerReviewSettings as any,
    moderationRequired: prisma.moderationRequired,
    moderators: prisma.moderators,
    status: prisma.status.toLowerCase() as 'draft' | 'published' | 'archived',
    publishedAt: prisma.publishedAt ?? undefined,
    publishedBy: prisma.publishedBy ?? undefined,
    version: prisma.version,
    previousVersionId: prisma.previousVersionId ?? undefined
  };
}

function mapAssessmentToPrisma(
  assessment: Omit<AssessmentDefinition, 'id' | 'createdAt' | 'updatedAt'>
): Prisma.AssessmentDefinitionCreateInput {
  return {
    tenantId: assessment.tenantId,
    createdBy: assessment.createdBy,
    updatedBy: assessment.updatedBy,
    schoolId: assessment.schoolId,
    code: assessment.code,
    title: assessment.title,
    description: assessment.description,
    purpose: assessment.purpose.toUpperCase() as any,
    format: assessment.format.toUpperCase() as any,
    yearLevels: assessment.yearLevels,
    subjects: assessment.subjects,
    curriculumCodes: assessment.curriculumCodes,
    learningObjectives: assessment.learningObjectives,
    totalMarks: assessment.totalMarks,
    passingMarks: assessment.passingMarks,
    weightInGradebook: assessment.weightInGradebook,
    duration: assessment.duration,
    availableFrom: assessment.availableFrom,
    availableTo: assessment.availableTo,
    lateSubmissionPolicy: assessment.lateSubmissionPolicy ?? Prisma.JsonNull,
    sections: assessment.sections ?? Prisma.JsonNull,
    rubricId: assessment.rubricId,
    aiPolicy: assessment.aiPolicy.toUpperCase() as any,
    aiPolicyExplanation: assessment.aiPolicyExplanation,
    integritySettings: assessment.integritySettings,
    allowedAccommodations: assessment.allowedAccommodations,
    peerReviewSettings: assessment.peerReviewSettings ?? Prisma.JsonNull,
    moderationRequired: assessment.moderationRequired,
    moderators: assessment.moderators ?? [],
    status: assessment.status.toUpperCase() as any,
    publishedAt: assessment.publishedAt,
    publishedBy: assessment.publishedBy,
    version: assessment.version,
    previousVersionId: assessment.previousVersionId
  };
}

// ============================================================================
// REPOSITORY IMPLEMENTATION
// ============================================================================

export class PrismaAssessmentRepository implements AssessmentRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(tenantId: string, id: string): Promise<AssessmentDefinition | null> {
    const result = await this.prisma.assessmentDefinition.findFirst({
      where: { id, tenantId }
    });

    return result ? mapPrismaToAssessment(result) : null;
  }

  async findBySchool(
    tenantId: string,
    schoolId: string,
    filters?: AssessmentSearchFilters
  ): Promise<AssessmentDefinition[]> {
    const where: Prisma.AssessmentDefinitionWhereInput = {
      tenantId,
      schoolId
    };

    if (filters?.status?.length) {
      where.status = { in: filters.status.map(s => s.toUpperCase()) as any };
    }
    if (filters?.purpose?.length) {
      where.purpose = { in: filters.purpose.map(p => p.toUpperCase()) as any };
    }
    if (filters?.subjects?.length) {
      where.subjects = { hasSome: filters.subjects };
    }
    if (filters?.yearLevels?.length) {
      where.yearLevels = { hasSome: filters.yearLevels };
    }
    if (filters?.teacherId) {
      where.createdBy = filters.teacherId;
    }
    if (filters?.fromDate) {
      where.createdAt = { gte: filters.fromDate };
    }
    if (filters?.toDate) {
      where.createdAt = { ...where.createdAt as any, lte: filters.toDate };
    }

    const results = await this.prisma.assessmentDefinition.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return results.map(mapPrismaToAssessment);
  }

  async findByClass(tenantId: string, classId: string): Promise<AssessmentDefinition[]> {
    // Class is typically associated via curriculum codes or subjects
    // This would need to join with class data - simplified here
    const results = await this.prisma.assessmentDefinition.findMany({
      where: { tenantId, status: 'PUBLISHED' },
      orderBy: { availableFrom: 'desc' }
    });

    return results.map(mapPrismaToAssessment);
  }

  async findByCurriculumCode(tenantId: string, curriculumCode: string): Promise<AssessmentDefinition[]> {
    const results = await this.prisma.assessmentDefinition.findMany({
      where: {
        tenantId,
        curriculumCodes: { has: curriculumCode }
      },
      orderBy: { createdAt: 'desc' }
    });

    return results.map(mapPrismaToAssessment);
  }

  async search(tenantId: string, query: AssessmentSearchQuery): Promise<AssessmentSearchResult> {
    const page = query.page || 1;
    const pageSize = query.pageSize || 20;
    const skip = (page - 1) * pageSize;

    const where: Prisma.AssessmentDefinitionWhereInput = { tenantId };

    if (query.searchText) {
      where.OR = [
        { title: { contains: query.searchText, mode: 'insensitive' } },
        { description: { contains: query.searchText, mode: 'insensitive' } },
        { code: { contains: query.searchText, mode: 'insensitive' } }
      ];
    }
    if (query.status?.length) {
      where.status = { in: query.status.map(s => s.toUpperCase()) as any };
    }
    if (query.purpose?.length) {
      where.purpose = { in: query.purpose.map(p => p.toUpperCase()) as any };
    }
    if (query.subjects?.length) {
      where.subjects = { hasSome: query.subjects };
    }
    if (query.yearLevels?.length) {
      where.yearLevels = { hasSome: query.yearLevels };
    }

    const orderBy: Prisma.AssessmentDefinitionOrderByWithRelationInput = {};
    if (query.sortBy) {
      orderBy[query.sortBy] = query.sortOrder || 'desc';
    } else {
      orderBy.createdAt = 'desc';
    }

    const [results, totalCount] = await Promise.all([
      this.prisma.assessmentDefinition.findMany({
        where,
        orderBy,
        skip,
        take: pageSize
      }),
      this.prisma.assessmentDefinition.count({ where })
    ]);

    return {
      assessments: results.map(mapPrismaToAssessment),
      totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize)
    };
  }

  async save(tenantId: string, assessment: AssessmentDefinition): Promise<AssessmentDefinition> {
    const data = mapAssessmentToPrisma(assessment);

    const result = await this.prisma.assessmentDefinition.create({
      data: {
        ...data,
        id: assessment.id // Use provided ID
      }
    });

    return mapPrismaToAssessment(result);
  }

  async update(
    tenantId: string,
    id: string,
    updates: Partial<AssessmentDefinition>
  ): Promise<AssessmentDefinition> {
    const updateData: Prisma.AssessmentDefinitionUpdateInput = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.sections !== undefined) updateData.sections = updates.sections ?? Prisma.JsonNull;
    if (updates.status !== undefined) updateData.status = updates.status.toUpperCase() as any;
    if (updates.publishedAt !== undefined) updateData.publishedAt = updates.publishedAt;
    if (updates.publishedBy !== undefined) updateData.publishedBy = updates.publishedBy;
    if (updates.availableFrom !== undefined) updateData.availableFrom = updates.availableFrom;
    if (updates.availableTo !== undefined) updateData.availableTo = updates.availableTo;
    if (updates.updatedBy !== undefined) updateData.updatedBy = updates.updatedBy;
    if (updates.integritySettings !== undefined) updateData.integritySettings = updates.integritySettings;
    if (updates.peerReviewSettings !== undefined) {
      updateData.peerReviewSettings = updates.peerReviewSettings ?? Prisma.JsonNull;
    }

    const result = await this.prisma.assessmentDefinition.update({
      where: { id },
      data: updateData
    });

    return mapPrismaToAssessment(result);
  }

  async delete(tenantId: string, id: string, deletedBy: string): Promise<void> {
    // Soft delete by archiving
    await this.prisma.assessmentDefinition.update({
      where: { id },
      data: {
        status: 'ARCHIVED',
        updatedBy: deletedBy,
        updatedAt: new Date()
      }
    });
  }
}

// ============================================================================
// ATTEMPT REPOSITORY
// ============================================================================

import { AssessmentAttempt as PrismaAttempt } from '@prisma/client';
import { AttemptRepository, AttemptFilters } from '../assessment.service';
import { AssessmentAttempt, AttemptStatus, QuestionResponse } from '../assessment.types';

function mapPrismaToAttempt(prisma: PrismaAttempt): AssessmentAttempt {
  return {
    id: prisma.id,
    tenantId: prisma.tenantId,
    createdAt: prisma.createdAt,
    updatedAt: prisma.updatedAt,
    createdBy: prisma.createdBy,
    updatedBy: prisma.updatedBy,
    assessmentId: prisma.assessmentId,
    studentId: prisma.studentId,
    studentName: prisma.studentName,
    status: prisma.status.toLowerCase().replace('_', '_') as AttemptStatus,
    attemptNumber: prisma.attemptNumber,
    startedAt: prisma.startedAt ?? undefined,
    lastActivityAt: prisma.lastActivityAt ?? undefined,
    submittedAt: prisma.submittedAt ?? undefined,
    accommodations: prisma.accommodations as any[],
    timeExtension: prisma.timeExtension ?? undefined,
    adjustedDuration: prisma.adjustedDuration ?? undefined,
    responses: prisma.responses as QuestionResponse[],
    submissionMethod: prisma.submissionMethod as any,
    lateSubmission: prisma.lateSubmission,
    latePenalty: prisma.latePenalty ?? undefined,
    questionsAnswered: prisma.questionsAnswered,
    totalQuestions: prisma.totalQuestions,
    sectionsComplete: prisma.sectionsComplete,
    processData: prisma.processData as any,
    integrityFlags: prisma.integrityFlags as any[],
    score: prisma.score ?? undefined,
    percentageScore: prisma.percentageScore ?? undefined,
    adjustedScore: prisma.adjustedScore ?? undefined,
    masteryEstimate: prisma.masteryEstimate ?? undefined,
    overallFeedback: prisma.overallFeedback ?? undefined,
    teacherComments: prisma.teacherComments ?? undefined,
    markedAt: prisma.markedAt ?? undefined,
    markedBy: prisma.markedBy ?? undefined,
    reviewedAt: prisma.reviewedAt ?? undefined,
    reviewedBy: prisma.reviewedBy ?? undefined,
    appealStatus: prisma.appealStatus as any,
    appealReason: prisma.appealReason ?? undefined,
    appealResolution: prisma.appealResolution ?? undefined
  };
}

export class PrismaAttemptRepository implements AttemptRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(tenantId: string, id: string): Promise<AssessmentAttempt | null> {
    const result = await this.prisma.assessmentAttempt.findFirst({
      where: { id, tenantId }
    });

    return result ? mapPrismaToAttempt(result) : null;
  }

  async findByAssessment(tenantId: string, assessmentId: string): Promise<AssessmentAttempt[]> {
    const results = await this.prisma.assessmentAttempt.findMany({
      where: { tenantId, assessmentId },
      orderBy: { createdAt: 'desc' }
    });

    return results.map(mapPrismaToAttempt);
  }

  async findByStudent(
    tenantId: string,
    studentId: string,
    filters?: AttemptFilters
  ): Promise<AssessmentAttempt[]> {
    const where: Prisma.AssessmentAttemptWhereInput = { tenantId, studentId };

    if (filters?.assessmentId) {
      where.assessmentId = filters.assessmentId;
    }
    if (filters?.status?.length) {
      where.status = { in: filters.status.map(s => s.toUpperCase().replace('_', '_')) as any };
    }
    if (filters?.fromDate) {
      where.createdAt = { gte: filters.fromDate };
    }
    if (filters?.toDate) {
      where.createdAt = { ...where.createdAt as any, lte: filters.toDate };
    }

    const results = await this.prisma.assessmentAttempt.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return results.map(mapPrismaToAttempt);
  }

  async findByStudentAndAssessment(
    tenantId: string,
    studentId: string,
    assessmentId: string
  ): Promise<AssessmentAttempt[]> {
    const results = await this.prisma.assessmentAttempt.findMany({
      where: { tenantId, studentId, assessmentId },
      orderBy: { attemptNumber: 'asc' }
    });

    return results.map(mapPrismaToAttempt);
  }

  async findByStatus(tenantId: string, status: AttemptStatus[]): Promise<AssessmentAttempt[]> {
    const results = await this.prisma.assessmentAttempt.findMany({
      where: {
        tenantId,
        status: { in: status.map(s => s.toUpperCase()) as any }
      },
      orderBy: { submittedAt: 'asc' }
    });

    return results.map(mapPrismaToAttempt);
  }

  async findRequiringMarking(tenantId: string): Promise<AssessmentAttempt[]> {
    const results = await this.prisma.assessmentAttempt.findMany({
      where: {
        tenantId,
        status: { in: ['SUBMITTED', 'AI_MARKED', 'MARKING'] }
      },
      orderBy: { submittedAt: 'asc' }
    });

    return results.map(mapPrismaToAttempt);
  }

  async save(tenantId: string, attempt: AssessmentAttempt): Promise<AssessmentAttempt> {
    const result = await this.prisma.assessmentAttempt.create({
      data: {
        id: attempt.id,
        tenantId: attempt.tenantId,
        createdBy: attempt.createdBy,
        updatedBy: attempt.updatedBy,
        assessmentId: attempt.assessmentId,
        studentId: attempt.studentId,
        studentName: attempt.studentName,
        status: attempt.status.toUpperCase() as any,
        attemptNumber: attempt.attemptNumber,
        startedAt: attempt.startedAt,
        lastActivityAt: attempt.lastActivityAt,
        accommodations: attempt.accommodations,
        adjustedDuration: attempt.adjustedDuration,
        responses: attempt.responses ?? [],
        lateSubmission: attempt.lateSubmission,
        questionsAnswered: attempt.questionsAnswered,
        totalQuestions: attempt.totalQuestions,
        sectionsComplete: attempt.sectionsComplete
      }
    });

    return mapPrismaToAttempt(result);
  }

  async update(
    tenantId: string,
    id: string,
    updates: Partial<AssessmentAttempt>
  ): Promise<AssessmentAttempt> {
    const updateData: Prisma.AssessmentAttemptUpdateInput = {};

    if (updates.status !== undefined) updateData.status = updates.status.toUpperCase() as any;
    if (updates.lastActivityAt !== undefined) updateData.lastActivityAt = updates.lastActivityAt;
    if (updates.submittedAt !== undefined) updateData.submittedAt = updates.submittedAt;
    if (updates.submissionMethod !== undefined) updateData.submissionMethod = updates.submissionMethod;
    if (updates.lateSubmission !== undefined) updateData.lateSubmission = updates.lateSubmission;
    if (updates.latePenalty !== undefined) updateData.latePenalty = updates.latePenalty;
    if (updates.questionsAnswered !== undefined) updateData.questionsAnswered = updates.questionsAnswered;
    if (updates.responses !== undefined) updateData.responses = updates.responses;
    if (updates.integrityFlags !== undefined) updateData.integrityFlags = updates.integrityFlags ?? Prisma.JsonNull;
    if (updates.score !== undefined) updateData.score = updates.score;
    if (updates.percentageScore !== undefined) updateData.percentageScore = updates.percentageScore;
    if (updates.adjustedScore !== undefined) updateData.adjustedScore = updates.adjustedScore;
    if (updates.masteryEstimate !== undefined) updateData.masteryEstimate = updates.masteryEstimate;
    if (updates.overallFeedback !== undefined) updateData.overallFeedback = updates.overallFeedback;
    if (updates.teacherComments !== undefined) updateData.teacherComments = updates.teacherComments;
    if (updates.markedAt !== undefined) updateData.markedAt = updates.markedAt;
    if (updates.markedBy !== undefined) updateData.markedBy = updates.markedBy;
    if (updates.reviewedAt !== undefined) updateData.reviewedAt = updates.reviewedAt;
    if (updates.reviewedBy !== undefined) updateData.reviewedBy = updates.reviewedBy;
    if (updates.updatedBy !== undefined) updateData.updatedBy = updates.updatedBy;

    const result = await this.prisma.assessmentAttempt.update({
      where: { id },
      data: updateData
    });

    return mapPrismaToAttempt(result);
  }

  async saveResponse(
    tenantId: string,
    attemptId: string,
    response: QuestionResponse
  ): Promise<void> {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id: attemptId }
    });

    if (!attempt) {
      throw new Error(`Attempt ${attemptId} not found`);
    }

    const responses = (attempt.responses as QuestionResponse[]) || [];
    const existingIndex = responses.findIndex(r => r.questionId === response.questionId);

    if (existingIndex >= 0) {
      responses[existingIndex] = response;
    } else {
      responses.push(response);
    }

    await this.prisma.assessmentAttempt.update({
      where: { id: attemptId },
      data: { responses }
    });
  }

  async bulkSave(tenantId: string, attempts: AssessmentAttempt[]): Promise<AssessmentAttempt[]> {
    const results: AssessmentAttempt[] = [];

    for (const attempt of attempts) {
      const saved = await this.save(tenantId, attempt);
      results.push(saved);
    }

    return results;
  }
}
