/**
 * Gradebook Repository - Prisma Implementation
 * 
 * Implements the GradebookRepository and related interfaces using Prisma ORM.
 * Handles all database operations for gradebooks, items, policies, and reports
 * with proper multi-tenant isolation.
 * 
 * @module IntelligenceMesh/Gradebook/Repositories
 * @version 1.5.0
 */

import { PrismaClient, Prisma, Gradebook as PrismaGradebook, GradingPolicy as PrismaPol } from '@prisma/client';
import {
  GradebookRepository,
  GradebookItemRepository,
  GradingPolicyRepository,
  ReportCardRepository,
  ReportTemplateRepository
} from '../gradebook.service';
import {
  Gradebook,
  GradebookItem,
  GradingPolicy,
  ReportCard,
  ReportCardTemplate,
  StudentScore,
  GradingSystem,
  CalculationMethod,
  ReportStatus
} from '../gradebook.types';

// ============================================================================
// GRADEBOOK REPOSITORY
// ============================================================================

function mapPrismaToGradebook(prisma: PrismaGradebook): Gradebook {
  return {
    id: prisma.id,
    tenantId: prisma.tenantId,
    createdAt: prisma.createdAt,
    updatedAt: prisma.updatedAt,
    createdBy: prisma.createdBy,
    updatedBy: prisma.updatedBy,
    schoolId: prisma.schoolId,
    classId: prisma.classId,
    className: prisma.className,
    subject: prisma.subject,
    teacherId: prisma.teacherId,
    teacherName: prisma.teacherName,
    periodId: prisma.periodId,
    periodName: prisma.periodName,
    periodStart: prisma.periodStart,
    periodEnd: prisma.periodEnd,
    gradingPolicyId: prisma.gradingPolicyId,
    categories: prisma.categories as any[],
    studentIds: prisma.studentIds,
    statistics: prisma.statistics as any,
    isLocked: prisma.isLocked,
    lockedAt: prisma.lockedAt ?? undefined,
    lockedBy: prisma.lockedBy ?? undefined
  };
}

export class PrismaGradebookRepository implements GradebookRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(tenantId: string, id: string): Promise<Gradebook | null> {
    const result = await this.prisma.gradebook.findFirst({
      where: { id, tenantId }
    });
    return result ? mapPrismaToGradebook(result) : null;
  }

  async findByClass(tenantId: string, classId: string, periodId?: string): Promise<Gradebook[]> {
    const where: Prisma.GradebookWhereInput = { tenantId, classId };
    if (periodId) where.periodId = periodId;

    const results = await this.prisma.gradebook.findMany({ where });
    return results.map(mapPrismaToGradebook);
  }

  async findByTeacher(tenantId: string, teacherId: string): Promise<Gradebook[]> {
    const results = await this.prisma.gradebook.findMany({
      where: { tenantId, teacherId },
      orderBy: { periodStart: 'desc' }
    });
    return results.map(mapPrismaToGradebook);
  }

  async findByStudent(tenantId: string, studentId: string): Promise<Gradebook[]> {
    const results = await this.prisma.gradebook.findMany({
      where: { tenantId, studentIds: { has: studentId } },
      orderBy: { periodStart: 'desc' }
    });
    return results.map(mapPrismaToGradebook);
  }

  async save(tenantId: string, gradebook: Gradebook): Promise<Gradebook> {
    const result = await this.prisma.gradebook.create({
      data: {
        id: gradebook.id,
        tenantId: gradebook.tenantId,
        createdBy: gradebook.createdBy,
        updatedBy: gradebook.updatedBy,
        schoolId: gradebook.schoolId,
        classId: gradebook.classId,
        className: gradebook.className,
        subject: gradebook.subject,
        teacherId: gradebook.teacherId,
        teacherName: gradebook.teacherName,
        periodId: gradebook.periodId,
        periodName: gradebook.periodName,
        periodStart: gradebook.periodStart,
        periodEnd: gradebook.periodEnd,
        gradingPolicyId: gradebook.gradingPolicyId,
        categories: gradebook.categories,
        studentIds: gradebook.studentIds,
        isLocked: gradebook.isLocked
      }
    });
    return mapPrismaToGradebook(result);
  }

  async update(tenantId: string, id: string, updates: Partial<Gradebook>): Promise<Gradebook> {
    const updateData: Prisma.GradebookUpdateInput = {};

    if (updates.categories !== undefined) updateData.categories = updates.categories;
    if (updates.studentIds !== undefined) updateData.studentIds = updates.studentIds;
    if (updates.statistics !== undefined) updateData.statistics = updates.statistics ?? Prisma.JsonNull;
    if (updates.isLocked !== undefined) updateData.isLocked = updates.isLocked;
    if (updates.lockedAt !== undefined) updateData.lockedAt = updates.lockedAt;
    if (updates.lockedBy !== undefined) updateData.lockedBy = updates.lockedBy;
    if (updates.updatedBy !== undefined) updateData.updatedBy = updates.updatedBy;

    const result = await this.prisma.gradebook.update({
      where: { id },
      data: updateData
    });
    return mapPrismaToGradebook(result);
  }

  async delete(tenantId: string, id: string, deletedBy: string): Promise<void> {
    await this.prisma.gradebook.delete({ where: { id } });
  }
}

// ============================================================================
// GRADEBOOK ITEM REPOSITORY
// ============================================================================

import { GradebookItem as PrismaItem } from '@prisma/client';

function mapPrismaToItem(prisma: PrismaItem): GradebookItem {
  return {
    id: prisma.id,
    tenantId: prisma.tenantId,
    createdAt: prisma.createdAt,
    updatedAt: prisma.updatedAt,
    createdBy: prisma.createdBy,
    updatedBy: prisma.updatedBy,
    gradebookId: prisma.gradebookId,
    categoryId: prisma.categoryId,
    title: prisma.title,
    description: prisma.description ?? undefined,
    sourceType: prisma.sourceType as 'manual' | 'assessment' | 'external',
    sourceId: prisma.sourceId ?? undefined,
    maxPoints: prisma.maxPoints,
    curriculumCodes: prisma.curriculumCodes,
    dueDate: prisma.dueDate ?? undefined,
    isExtraCredit: prisma.isExtraCredit,
    countsTowardFinal: prisma.countsTowardFinal,
    showToStudents: prisma.showToStudents,
    showToParents: prisma.showToParents,
    scores: prisma.scores as StudentScore[],
    statistics: prisma.statistics as any
  };
}

export class PrismaGradebookItemRepository implements GradebookItemRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(tenantId: string, id: string): Promise<GradebookItem | null> {
    const result = await this.prisma.gradebookItem.findFirst({
      where: { id, tenantId }
    });
    return result ? mapPrismaToItem(result) : null;
  }

  async findByGradebook(tenantId: string, gradebookId: string): Promise<GradebookItem[]> {
    const results = await this.prisma.gradebookItem.findMany({
      where: { tenantId, gradebookId },
      orderBy: { dueDate: 'asc' }
    });
    return results.map(mapPrismaToItem);
  }

  async findByCategory(tenantId: string, gradebookId: string, categoryId: string): Promise<GradebookItem[]> {
    const results = await this.prisma.gradebookItem.findMany({
      where: { tenantId, gradebookId, categoryId },
      orderBy: { createdAt: 'asc' }
    });
    return results.map(mapPrismaToItem);
  }

  async findOverdue(tenantId: string, gradebookId: string): Promise<GradebookItem[]> {
    const results = await this.prisma.gradebookItem.findMany({
      where: {
        tenantId,
        gradebookId,
        dueDate: { lt: new Date() }
      },
      orderBy: { dueDate: 'asc' }
    });
    return results.map(mapPrismaToItem);
  }

  async save(tenantId: string, item: GradebookItem): Promise<GradebookItem> {
    const result = await this.prisma.gradebookItem.create({
      data: {
        id: item.id,
        tenantId: item.tenantId,
        createdBy: item.createdBy,
        updatedBy: item.updatedBy,
        gradebookId: item.gradebookId,
        categoryId: item.categoryId,
        title: item.title,
        description: item.description,
        sourceType: item.sourceType,
        sourceId: item.sourceId,
        maxPoints: item.maxPoints,
        curriculumCodes: item.curriculumCodes || [],
        dueDate: item.dueDate,
        isExtraCredit: item.isExtraCredit,
        countsTowardFinal: item.countsTowardFinal,
        showToStudents: item.showToStudents,
        showToParents: item.showToParents,
        scores: item.scores || []
      }
    });
    return mapPrismaToItem(result);
  }

  async update(tenantId: string, id: string, updates: Partial<GradebookItem>): Promise<GradebookItem> {
    const updateData: Prisma.GradebookItemUpdateInput = {};

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.sourceType !== undefined) updateData.sourceType = updates.sourceType;
    if (updates.sourceId !== undefined) updateData.sourceId = updates.sourceId;
    if (updates.maxPoints !== undefined) updateData.maxPoints = updates.maxPoints;
    if (updates.dueDate !== undefined) updateData.dueDate = updates.dueDate;
    if (updates.scores !== undefined) updateData.scores = updates.scores;
    if (updates.statistics !== undefined) updateData.statistics = updates.statistics ?? Prisma.JsonNull;
    if (updates.updatedBy !== undefined) updateData.updatedBy = updates.updatedBy;

    const result = await this.prisma.gradebookItem.update({
      where: { id },
      data: updateData
    });
    return mapPrismaToItem(result);
  }

  async delete(tenantId: string, id: string, deletedBy: string): Promise<void> {
    await this.prisma.gradebookItem.delete({ where: { id } });
  }
}

// ============================================================================
// GRADING POLICY REPOSITORY
// ============================================================================

function mapPrismaToPolicy(prisma: PrismaPol): GradingPolicy {
  return {
    id: prisma.id,
    tenantId: prisma.tenantId,
    createdAt: prisma.createdAt,
    updatedAt: prisma.updatedAt,
    createdBy: prisma.createdBy,
    updatedBy: prisma.updatedBy,
    schoolId: prisma.schoolId,
    name: prisma.name,
    description: prisma.description ?? undefined,
    gradingSystem: prisma.gradingSystem as GradingSystem,
    gradeScale: prisma.gradeScale as any[],
    calculationMethod: prisma.calculationMethod as CalculationMethod,
    categoryWeights: prisma.categoryWeights as any[],
    dropLowestEnabled: prisma.dropLowestEnabled,
    dropLowestCount: prisma.dropLowestCount ?? undefined,
    lateWorkPolicy: prisma.lateWorkPolicy as any,
    missingWorkPolicy: prisma.missingWorkPolicy as any,
    standardsBasedSettings: prisma.standardsBasedSettings as any,
    isDefault: prisma.isDefault,
    yearLevels: prisma.yearLevels,
    subjects: prisma.subjects,
    effectiveFrom: prisma.effectiveFrom,
    effectiveTo: prisma.effectiveTo ?? undefined
  };
}

export class PrismaGradingPolicyRepository implements GradingPolicyRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(tenantId: string, id: string): Promise<GradingPolicy | null> {
    const result = await this.prisma.gradingPolicy.findFirst({
      where: { id, tenantId }
    });
    return result ? mapPrismaToPolicy(result) : null;
  }

  async findBySchool(tenantId: string, schoolId: string): Promise<GradingPolicy[]> {
    const results = await this.prisma.gradingPolicy.findMany({
      where: { tenantId, schoolId },
      orderBy: { name: 'asc' }
    });
    return results.map(mapPrismaToPolicy);
  }

  async findActive(tenantId: string, schoolId: string): Promise<GradingPolicy | null> {
    const now = new Date();
    const result = await this.prisma.gradingPolicy.findFirst({
      where: {
        tenantId,
        schoolId,
        isDefault: true,
        effectiveFrom: { lte: now },
        OR: [
          { effectiveTo: null },
          { effectiveTo: { gte: now } }
        ]
      }
    });
    return result ? mapPrismaToPolicy(result) : null;
  }

  async save(tenantId: string, policy: GradingPolicy): Promise<GradingPolicy> {
    const result = await this.prisma.gradingPolicy.create({
      data: {
        id: policy.id,
        tenantId: policy.tenantId,
        createdBy: policy.createdBy,
        updatedBy: policy.updatedBy,
        schoolId: policy.schoolId,
        name: policy.name,
        description: policy.description,
        gradingSystem: policy.gradingSystem.toUpperCase() as any,
        gradeScale: policy.gradeScale,
        calculationMethod: policy.calculationMethod.toUpperCase() as any,
        categoryWeights: policy.categoryWeights,
        dropLowestEnabled: policy.dropLowestEnabled,
        dropLowestCount: policy.dropLowestCount,
        lateWorkPolicy: policy.lateWorkPolicy,
        missingWorkPolicy: policy.missingWorkPolicy,
        standardsBasedSettings: policy.standardsBasedSettings ?? Prisma.JsonNull,
        isDefault: policy.isDefault,
        yearLevels: policy.yearLevels || [],
        subjects: policy.subjects || [],
        effectiveFrom: policy.effectiveFrom,
        effectiveTo: policy.effectiveTo
      }
    });
    return mapPrismaToPolicy(result);
  }

  async update(tenantId: string, id: string, updates: Partial<GradingPolicy>): Promise<GradingPolicy> {
    const updateData: Prisma.GradingPolicyUpdateInput = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.gradeScale !== undefined) updateData.gradeScale = updates.gradeScale;
    if (updates.categoryWeights !== undefined) updateData.categoryWeights = updates.categoryWeights;
    if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;
    if (updates.effectiveTo !== undefined) updateData.effectiveTo = updates.effectiveTo;
    if (updates.updatedBy !== undefined) updateData.updatedBy = updates.updatedBy;

    const result = await this.prisma.gradingPolicy.update({
      where: { id },
      data: updateData
    });
    return mapPrismaToPolicy(result);
  }
}

// ============================================================================
// REPORT CARD REPOSITORY
// ============================================================================

import { ReportCard as PrismaReport, ReportCardTemplate as PrismaTemplate } from '@prisma/client';

function mapPrismaToReport(prisma: PrismaReport): ReportCard {
  return {
    id: prisma.id,
    tenantId: prisma.tenantId,
    createdAt: prisma.createdAt,
    updatedAt: prisma.updatedAt,
    createdBy: prisma.createdBy,
    updatedBy: prisma.updatedBy,
    studentId: prisma.studentId,
    studentName: prisma.studentName,
    periodId: prisma.periodId,
    periodName: prisma.periodName,
    yearLevel: prisma.yearLevel,
    templateId: prisma.templateId,
    status: prisma.status.toLowerCase().replace('_', '_') as ReportStatus,
    workflow: prisma.workflow as any[],
    subjectGrades: prisma.subjectGrades as any[],
    narratives: prisma.narratives as any[],
    attendanceSummary: prisma.attendanceSummary as any,
    teacherSignature: prisma.teacherSignature as any,
    coordinatorSignature: prisma.coordinatorSignature as any,
    principalSignature: prisma.principalSignature as any,
    parentAcknowledgment: prisma.parentAcknowledgment as any,
    publishedAt: prisma.publishedAt ?? undefined
  };
}

export class PrismaReportCardRepository implements ReportCardRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(tenantId: string, id: string): Promise<ReportCard | null> {
    const result = await this.prisma.reportCard.findFirst({
      where: { id, tenantId }
    });
    return result ? mapPrismaToReport(result) : null;
  }

  async findByStudent(tenantId: string, studentId: string): Promise<ReportCard[]> {
    const results = await this.prisma.reportCard.findMany({
      where: { tenantId, studentId },
      orderBy: { createdAt: 'desc' }
    });
    return results.map(mapPrismaToReport);
  }

  async findByPeriod(tenantId: string, periodId: string): Promise<ReportCard[]> {
    const results = await this.prisma.reportCard.findMany({
      where: { tenantId, periodId },
      orderBy: { studentName: 'asc' }
    });
    return results.map(mapPrismaToReport);
  }

  async findByStatus(tenantId: string, status: ReportStatus): Promise<ReportCard[]> {
    const results = await this.prisma.reportCard.findMany({
      where: { tenantId, status: status.toUpperCase() as any },
      orderBy: { updatedAt: 'desc' }
    });
    return results.map(mapPrismaToReport);
  }

  async save(tenantId: string, report: ReportCard): Promise<ReportCard> {
    const result = await this.prisma.reportCard.create({
      data: {
        id: report.id,
        tenantId: report.tenantId,
        createdBy: report.createdBy,
        updatedBy: report.updatedBy,
        studentId: report.studentId,
        studentName: report.studentName,
        periodId: report.periodId,
        periodName: report.periodName,
        yearLevel: report.yearLevel,
        templateId: report.templateId,
        status: report.status.toUpperCase() as any,
        workflow: report.workflow,
        subjectGrades: report.subjectGrades,
        narratives: report.narratives
      }
    });
    return mapPrismaToReport(result);
  }

  async update(tenantId: string, id: string, updates: Partial<ReportCard>): Promise<ReportCard> {
    const updateData: Prisma.ReportCardUpdateInput = {};

    if (updates.status !== undefined) updateData.status = updates.status.toUpperCase() as any;
    if (updates.workflow !== undefined) updateData.workflow = updates.workflow;
    if (updates.subjectGrades !== undefined) updateData.subjectGrades = updates.subjectGrades;
    if (updates.narratives !== undefined) updateData.narratives = updates.narratives;
    if (updates.attendanceSummary !== undefined) updateData.attendanceSummary = updates.attendanceSummary ?? Prisma.JsonNull;
    if (updates.teacherSignature !== undefined) updateData.teacherSignature = updates.teacherSignature ?? Prisma.JsonNull;
    if (updates.coordinatorSignature !== undefined) updateData.coordinatorSignature = updates.coordinatorSignature ?? Prisma.JsonNull;
    if (updates.principalSignature !== undefined) updateData.principalSignature = updates.principalSignature ?? Prisma.JsonNull;
    if (updates.parentAcknowledgment !== undefined) updateData.parentAcknowledgment = updates.parentAcknowledgment ?? Prisma.JsonNull;
    if (updates.publishedAt !== undefined) updateData.publishedAt = updates.publishedAt;
    if (updates.updatedBy !== undefined) updateData.updatedBy = updates.updatedBy;

    const result = await this.prisma.reportCard.update({
      where: { id },
      data: updateData
    });
    return mapPrismaToReport(result);
  }
}

// ============================================================================
// REPORT TEMPLATE REPOSITORY
// ============================================================================

function mapPrismaToTemplate(prisma: PrismaTemplate): ReportCardTemplate {
  return {
    id: prisma.id,
    tenantId: prisma.tenantId,
    createdAt: prisma.createdAt,
    updatedAt: prisma.updatedAt,
    createdBy: prisma.createdBy,
    updatedBy: prisma.updatedBy,
    schoolId: prisma.schoolId,
    name: prisma.name,
    description: prisma.description ?? undefined,
    yearLevels: prisma.yearLevels,
    headerConfig: prisma.headerConfig as any,
    gradeTableConfig: prisma.gradeTableConfig as any,
    narrativeSettings: prisma.narrativeSettings as any,
    attendanceSummary: prisma.attendanceSummary,
    customSections: prisma.customSections as any[],
    signatureConfig: prisma.signatureConfig as any,
    isDefault: prisma.isDefault,
    isActive: prisma.isActive
  };
}

export class PrismaReportTemplateRepository implements ReportTemplateRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(tenantId: string, id: string): Promise<ReportCardTemplate | null> {
    const result = await this.prisma.reportCardTemplate.findFirst({
      where: { id, tenantId }
    });
    return result ? mapPrismaToTemplate(result) : null;
  }

  async findBySchool(tenantId: string, schoolId: string): Promise<ReportCardTemplate[]> {
    const results = await this.prisma.reportCardTemplate.findMany({
      where: { tenantId, schoolId, isActive: true },
      orderBy: { name: 'asc' }
    });
    return results.map(mapPrismaToTemplate);
  }

  async findDefault(tenantId: string, schoolId: string, yearLevel: string): Promise<ReportCardTemplate | null> {
    const result = await this.prisma.reportCardTemplate.findFirst({
      where: {
        tenantId,
        schoolId,
        isDefault: true,
        isActive: true,
        yearLevels: { has: yearLevel }
      }
    });
    return result ? mapPrismaToTemplate(result) : null;
  }

  async save(tenantId: string, template: ReportCardTemplate): Promise<ReportCardTemplate> {
    const result = await this.prisma.reportCardTemplate.create({
      data: {
        id: template.id,
        tenantId: template.tenantId,
        createdBy: template.createdBy,
        updatedBy: template.updatedBy,
        schoolId: template.schoolId,
        name: template.name,
        description: template.description,
        yearLevels: template.yearLevels,
        headerConfig: template.headerConfig,
        gradeTableConfig: template.gradeTableConfig,
        narrativeSettings: template.narrativeSettings,
        attendanceSummary: template.attendanceSummary,
        customSections: template.customSections ?? Prisma.JsonNull,
        signatureConfig: template.signatureConfig,
        isDefault: template.isDefault,
        isActive: template.isActive
      }
    });
    return mapPrismaToTemplate(result);
  }

  async update(tenantId: string, id: string, updates: Partial<ReportCardTemplate>): Promise<ReportCardTemplate> {
    const updateData: Prisma.ReportCardTemplateUpdateInput = {};

    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.yearLevels !== undefined) updateData.yearLevels = updates.yearLevels;
    if (updates.narrativeSettings !== undefined) updateData.narrativeSettings = updates.narrativeSettings;
    if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
    if (updates.updatedBy !== undefined) updateData.updatedBy = updates.updatedBy;

    const result = await this.prisma.reportCardTemplate.update({
      where: { id },
      data: updateData
    });
    return mapPrismaToTemplate(result);
  }
}
