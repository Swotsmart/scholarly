/**
 * AI-Enabled EduScrum Orchestrator
 *
 * Brings agile/scrum methodology to education with AI coaching. Students work
 * in self-organizing teams on learning sprints, with the AI acting as an
 * intelligent Scrum Master that adapts to each team's dynamics.
 *
 * ## Schema Integration
 *
 * Uses the enhanced schema with:
 * - EduScrumTeam for team management
 * - EduScrumSprint for sprint tracking
 * - EduScrumRetrospective for retrospective data
 */

import { prisma, Prisma } from '@scholarly/database';
import { ScholarlyBaseService, Result, success, failure } from './base.service';
import { log } from '../lib/logger';

// ============================================================================
// TYPES
// ============================================================================

// Prisma model types with relations
export type EduScrumTeamWithRelations = Prisma.EduScrumTeamGetPayload<{
  include: {
    sprints: true;
    retrospectives: true;
  };
}>;

export type EduScrumSprintWithRelations = Prisma.EduScrumSprintGetPayload<{
  include: {
    team: true;
  };
}>;

// Team member structure stored in JSON
export interface TeamMember {
  learnerId: string;
  role: 'member' | 'facilitator' | 'note_taker' | 'timekeeper';
  contributionScore: number;
  strengths: string[];
  growthAreas: string[];
}

// Team dynamics for AI analysis
export interface TeamDynamics {
  cohesionScore: number;
  participationBalance: number;
  conflictLevel: 'none' | 'healthy' | 'concerning' | 'critical';
  aiObservations: AIObservation[];
  suggestedInterventions: TeamIntervention[];
  trend: 'improving' | 'stable' | 'declining';
}

export interface AIObservation {
  id: string;
  timestamp: Date;
  type: 'participation' | 'conflict' | 'progress' | 'struggle';
  description: string;
  affectedMembers: string[];
  severity: 'info' | 'attention' | 'concern' | 'urgent';
}

export interface TeamIntervention {
  id: string;
  type: 'role_rotation' | 'pair_work' | 'team_meeting' | 'individual_checkin' | 'scaffolding';
  description: string;
  targetMembers: string[];
  priority: 'low' | 'medium' | 'high';
  status: 'suggested' | 'accepted' | 'completed' | 'dismissed';
}

export type TeamFormationType = 'self_selected' | 'ai_suggested' | 'teacher_assigned' | 'random';
export type TeamMaturityLevel = 'forming' | 'storming' | 'norming' | 'performing';

// Sprint backlog item stored in JSON
export interface SprintBacklogItem {
  id: string;
  title: string;
  description: string;
  learningObjectiveId: string;
  storyPoints: number;
  assignedTo: string[];
  status: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  acceptanceCriteria: string[];
  criteriaMetStatus: Record<string, boolean>;
  blockers: Blocker[];
  movedToInProgressAt?: string;
  completedAt?: string;
}

export interface Blocker {
  id: string;
  description: string;
  reportedBy: string;
  reportedAt: string;
  resolvedAt?: string;
  aiSuggestedResolution?: string;
}

export interface StandupEntry {
  date: string;
  responses: StandupResponse[];
  aiSummary?: string;
}

export interface StandupResponse {
  memberId: string;
  yesterday: string;
  today: string;
  blockers: string[];
  mood: 'great' | 'good' | 'okay' | 'struggling';
}

export interface BurndownPoint {
  date: string;
  plannedRemaining: number;
  actualRemaining: number;
}

export interface AIInsights {
  currentInsights: AIInsight[];
  completionPrediction: { likelyToComplete: boolean; confidence: number; riskFactors: string[] };
  coachingMessages: CoachingMessage[];
  difficultyAssessment: { current: 'too_easy' | 'appropriate' | 'too_hard' };
}

export interface AIInsight {
  id: string;
  timestamp: string;
  type: 'progress' | 'collaboration' | 'quality' | 'risk';
  title: string;
  description: string;
  priority: 'info' | 'attention' | 'action_needed';
}

export interface CoachingMessage {
  id: string;
  timestamp: string;
  targetAudience: 'team' | 'individual';
  targetId?: string;
  messageType: 'encouragement' | 'suggestion' | 'warning' | 'celebration';
  content: string;
  acknowledged: boolean;
}

export interface KanbanBoard {
  id: string;
  teamId: string;
  sprintId: string;
  columns: { id: string; name: string; status: string; itemIds: string[]; wipLimit?: number }[];
}

// Retrospective action item
export interface ActionItem {
  id: string;
  description: string;
  assignedTo: string;
  status: 'open' | 'in_progress' | 'completed';
}

// ============================================================================
// SERVICE
// ============================================================================

let eduScrumOrchestratorInstance: EduScrumOrchestrator | null = null;

export class EduScrumOrchestrator extends ScholarlyBaseService {
  constructor() {
    super('EduScrumOrchestrator');
  }

  /**
   * Form a new EduScrum team
   */
  async formTeam(
    tenantId: string,
    request: {
      name: string;
      memberIds: string[];
      formationType: TeamFormationType;
      scrumMasterId: string;
      productOwnerId?: string;
      description?: string;
    }
  ): Promise<Result<EduScrumTeamWithRelations>> {
    return this.withTiming('formTeam', async () => {
      if (!request.name?.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Team name is required' });
      }
      if (request.memberIds.length < 2) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Team must have at least 2 members' });
      }

      const team = await prisma.eduScrumTeam.create({
        data: {
          tenantId,
          name: request.name,
          description: request.description,
          scrumMasterId: request.scrumMasterId,
          productOwnerId: request.productOwnerId,
          memberIds: request.memberIds,
          velocity: 0,
          maturityLevel: 'forming',
          healthScore: 50,
          sprintDuration: 14,
          status: 'active',
        },
        include: {
          sprints: true,
          retrospectives: true,
        },
      });

      log.info('EduScrum team formed', { teamId: team.id, memberCount: request.memberIds.length });

      return success(team);
    });
  }

  /**
   * Get AI suggestions for team composition
   */
  async suggestTeamComposition(
    tenantId: string,
    learnerIds: string[],
    teamSize: number
  ): Promise<Result<{
    suggestedTeams: { members: string[]; rationale: string; predictedCohesion: number }[];
  }>> {
    return this.withTiming('suggestTeamComposition', async () => {
      const teams = await this.aiSuggestTeams(learnerIds, teamSize);
      return success({ suggestedTeams: teams });
    });
  }

  /**
   * Assess team dynamics and get AI recommendations
   */
  async assessTeamDynamics(
    tenantId: string,
    teamId: string
  ): Promise<Result<{
    dynamics: TeamDynamics;
    recommendations: string[];
  }>> {
    return this.withTiming('assessTeamDynamics', async () => {
      const team = await prisma.eduScrumTeam.findFirst({
        where: { id: teamId, tenantId },
        include: {
          sprints: true,
          retrospectives: true,
        },
      });

      if (!team) {
        return failure({ code: 'NOT_FOUND', message: `Team ${teamId} not found` });
      }

      const analysis = this.aiAnalyzeTeamDynamics(team);

      // Update health score
      await prisma.eduScrumTeam.update({
        where: { id: teamId },
        data: { healthScore: analysis.dynamics.cohesionScore },
      });

      return success({ dynamics: analysis.dynamics, recommendations: analysis.recommendations });
    });
  }

  /**
   * Get a team by ID
   */
  async getTeam(
    tenantId: string,
    teamId: string
  ): Promise<Result<EduScrumTeamWithRelations>> {
    return this.withTiming('getTeam', async () => {
      const team = await prisma.eduScrumTeam.findFirst({
        where: { id: teamId, tenantId },
        include: {
          sprints: { orderBy: { sprintNumber: 'desc' } },
          retrospectives: { orderBy: { conductedAt: 'desc' } },
        },
      });

      if (!team) {
        return failure({ code: 'NOT_FOUND', message: `Team ${teamId} not found` });
      }

      return success(team);
    });
  }

  /**
   * Get teams for a member
   */
  async getTeamsByMember(
    tenantId: string,
    memberId: string
  ): Promise<Result<EduScrumTeamWithRelations[]>> {
    return this.withTiming('getTeamsByMember', async () => {
      const teams = await prisma.eduScrumTeam.findMany({
        where: {
          tenantId,
          memberIds: { has: memberId },
          status: 'active',
        },
        include: {
          sprints: { orderBy: { sprintNumber: 'desc' }, take: 1 },
          retrospectives: { orderBy: { conductedAt: 'desc' }, take: 1 },
        },
      });

      return success(teams);
    });
  }

  /**
   * Start sprint planning for a team
   */
  async startSprintPlanning(
    tenantId: string,
    teamId: string,
    config: {
      name: string;
      goal: string;
      duration?: number;
      startDate: Date;
    }
  ): Promise<Result<EduScrumSprintWithRelations>> {
    return this.withTiming('startSprintPlanning', async () => {
      if (!config.goal?.trim()) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Sprint goal is required' });
      }

      const team = await prisma.eduScrumTeam.findFirst({
        where: { id: teamId, tenantId },
        include: { sprints: { orderBy: { sprintNumber: 'desc' }, take: 1 } },
      });

      if (!team) {
        return failure({ code: 'NOT_FOUND', message: `Team ${teamId} not found` });
      }

      // Check for active sprint
      const activeSprint = await prisma.eduScrumSprint.findFirst({
        where: {
          teamId,
          status: { in: ['planning', 'active', 'review'] },
        },
      });

      if (activeSprint) {
        return failure({ code: 'CONFLICT', message: 'Team already has an active sprint' });
      }

      const sprintDuration = config.duration || team.sprintDuration;
      const endDate = new Date(config.startDate);
      endDate.setDate(endDate.getDate() + sprintDuration);

      const lastSprintNumber = team.sprints[0]?.sprintNumber || 0;
      const suggestedVelocity = Math.round(team.velocity) || 20;

      // Create initial AI insights
      const aiInsights: AIInsights = {
        currentInsights: [{
          id: this.generateId('insight'),
          timestamp: new Date().toISOString(),
          type: 'progress',
          title: 'Sprint Planning Started',
          description: `Based on your history, I suggest ${suggestedVelocity} story points.`,
          priority: 'info',
        }],
        completionPrediction: { likelyToComplete: true, confidence: 0.5, riskFactors: [] },
        coachingMessages: [],
        difficultyAssessment: { current: 'appropriate' },
      };

      const sprint = await prisma.eduScrumSprint.create({
        data: {
          tenantId,
          teamId,
          name: config.name,
          goal: config.goal,
          sprintNumber: lastSprintNumber + 1,
          startDate: config.startDate,
          endDate,
          backlogItems: [],
          totalStoryPoints: 0,
          completedPoints: 0,
          standups: [],
          burndownData: [],
          aiInsights: aiInsights as unknown as Prisma.InputJsonValue,
          status: 'planning',
        },
        include: { team: true },
      });

      log.info('Sprint planning started', { sprintId: sprint.id, teamId });

      return success(sprint);
    });
  }

  /**
   * Add item to sprint backlog
   */
  async addToSprintBacklog(
    tenantId: string,
    sprintId: string,
    item: {
      title: string;
      description: string;
      learningObjectiveId: string;
      storyPoints: number;
      acceptanceCriteria: string[];
    }
  ): Promise<Result<SprintBacklogItem>> {
    return this.withTiming('addToSprintBacklog', async () => {
      const sprint = await prisma.eduScrumSprint.findFirst({
        where: { id: sprintId, tenantId },
      });

      if (!sprint) {
        return failure({ code: 'NOT_FOUND', message: `Sprint ${sprintId} not found` });
      }

      if (sprint.status !== 'planning') {
        return failure({ code: 'VALIDATION_ERROR', message: 'Can only add items during planning phase' });
      }

      const backlogItem: SprintBacklogItem = {
        id: this.generateId('item'),
        title: item.title,
        description: item.description,
        learningObjectiveId: item.learningObjectiveId,
        storyPoints: item.storyPoints,
        assignedTo: [],
        status: 'backlog',
        acceptanceCriteria: item.acceptanceCriteria,
        criteriaMetStatus: {},
        blockers: [],
      };

      const currentBacklog = (sprint.backlogItems as unknown as SprintBacklogItem[]) || [];
      const newBacklog = [...currentBacklog, backlogItem];
      const newTotalPoints = sprint.totalStoryPoints + item.storyPoints;

      // Update AI prediction
      const aiInsights = (sprint.aiInsights as unknown as AIInsights) || this.getDefaultAIInsights();
      aiInsights.completionPrediction = this.aiPredictCompletion(newTotalPoints, sprint.completedPoints, sprint.startDate, sprint.endDate);

      await prisma.eduScrumSprint.update({
        where: { id: sprintId },
        data: {
          backlogItems: newBacklog as unknown as Prisma.InputJsonValue,
          totalStoryPoints: newTotalPoints,
          aiInsights: aiInsights as unknown as Prisma.InputJsonValue,
        },
      });

      return success(backlogItem);
    });
  }

  /**
   * Start an active sprint
   */
  async startSprint(
    tenantId: string,
    sprintId: string
  ): Promise<Result<EduScrumSprintWithRelations>> {
    return this.withTiming('startSprint', async () => {
      const sprint = await prisma.eduScrumSprint.findFirst({
        where: { id: sprintId, tenantId },
        include: { team: true },
      });

      if (!sprint) {
        return failure({ code: 'NOT_FOUND', message: `Sprint ${sprintId} not found` });
      }

      if (sprint.status !== 'planning') {
        return failure({ code: 'VALIDATION_ERROR', message: 'Sprint must be in planning phase to start' });
      }

      // Move all items to 'todo' status
      const backlogItems = (sprint.backlogItems as unknown as SprintBacklogItem[]) || [];
      const updatedItems = backlogItems.map((item) => ({ ...item, status: 'todo' as const }));

      // Initialize burndown
      const burndownData: BurndownPoint[] = [{
        date: new Date().toISOString(),
        plannedRemaining: sprint.totalStoryPoints,
        actualRemaining: sprint.totalStoryPoints,
      }];

      // Add coaching message
      const aiInsights = (sprint.aiInsights as unknown as AIInsights) || this.getDefaultAIInsights();
      const durationDays = Math.ceil((sprint.endDate.getTime() - sprint.startDate.getTime()) / 86400000);
      aiInsights.coachingMessages.push({
        id: this.generateId('msg'),
        timestamp: new Date().toISOString(),
        targetAudience: 'team',
        messageType: 'encouragement',
        content: `Sprint "${sprint.name}" is GO! Goal: "${sprint.goal}". ${sprint.totalStoryPoints} points in ${durationDays} days. You've got this!`,
        acknowledged: false,
      });

      const updated = await prisma.eduScrumSprint.update({
        where: { id: sprintId },
        data: {
          status: 'active',
          backlogItems: updatedItems as unknown as Prisma.InputJsonValue,
          burndownData: burndownData as unknown as Prisma.InputJsonValue,
          aiInsights: aiInsights as unknown as Prisma.InputJsonValue,
        },
        include: { team: true },
      });

      log.info('Sprint started', { sprintId });

      return success(updated);
    });
  }

  /**
   * Record daily standup responses
   */
  async recordStandup(
    tenantId: string,
    sprintId: string,
    responses: StandupResponse[]
  ): Promise<Result<{
    aiSummary: string;
    flaggedConcerns: string[];
  }>> {
    return this.withTiming('recordStandup', async () => {
      const sprint = await prisma.eduScrumSprint.findFirst({
        where: { id: sprintId, tenantId },
      });

      if (!sprint) {
        return failure({ code: 'NOT_FOUND', message: `Sprint ${sprintId} not found` });
      }

      const analysis = this.aiAnalyzeStandup(responses);

      // Update standups
      const standups = (sprint.standups as unknown as StandupEntry[]) || [];
      standups.push({
        date: new Date().toISOString(),
        responses,
        aiSummary: analysis.summary,
      });

      // Update burndown
      const backlogItems = (sprint.backlogItems as unknown as SprintBacklogItem[]) || [];
      const remainingPoints = backlogItems
        .filter((i) => i.status !== 'done')
        .reduce((s, i) => s + i.storyPoints, 0);

      const burndownData = (sprint.burndownData as unknown as BurndownPoint[]) || [];
      burndownData.push({
        date: new Date().toISOString(),
        plannedRemaining: this.calculateIdealBurndown(sprint.totalStoryPoints, sprint.startDate, sprint.endDate),
        actualRemaining: remainingPoints,
      });

      // Update AI insights with concerns
      const aiInsights = (sprint.aiInsights as unknown as AIInsights) || this.getDefaultAIInsights();
      aiInsights.currentInsights.push(...analysis.insights);
      for (const concern of analysis.concerns) {
        aiInsights.coachingMessages.push({
          id: this.generateId('msg'),
          timestamp: new Date().toISOString(),
          targetAudience: 'individual',
          targetId: concern.memberId,
          messageType: 'suggestion',
          content: concern.message,
          acknowledged: false,
        });
      }

      await prisma.eduScrumSprint.update({
        where: { id: sprintId },
        data: {
          standups: standups as unknown as Prisma.InputJsonValue,
          burndownData: burndownData as unknown as Prisma.InputJsonValue,
          aiInsights: aiInsights as unknown as Prisma.InputJsonValue,
        },
      });

      return success({
        aiSummary: analysis.summary,
        flaggedConcerns: analysis.concerns.map((c) => c.description),
      });
    });
  }

  /**
   * Move backlog item to new status
   */
  async moveItem(
    tenantId: string,
    sprintId: string,
    itemId: string,
    newStatus: SprintBacklogItem['status']
  ): Promise<Result<{
    item: SprintBacklogItem;
    aiComment?: string;
  }>> {
    return this.withTiming('moveItem', async () => {
      const sprint = await prisma.eduScrumSprint.findFirst({
        where: { id: sprintId, tenantId },
      });

      if (!sprint) {
        return failure({ code: 'NOT_FOUND', message: `Sprint ${sprintId} not found` });
      }

      const backlogItems = (sprint.backlogItems as unknown as SprintBacklogItem[]) || [];
      const itemIndex = backlogItems.findIndex((i) => i.id === itemId);

      if (itemIndex === -1) {
        return failure({ code: 'NOT_FOUND', message: `Item ${itemId} not found` });
      }

      const item = backlogItems[itemIndex];
      const oldStatus = item.status;
      item.status = newStatus;

      let completedPoints = sprint.completedPoints;

      if (newStatus === 'in_progress' && !item.movedToInProgressAt) {
        item.movedToInProgressAt = new Date().toISOString();
      }

      if (newStatus === 'done' && oldStatus !== 'done') {
        item.completedAt = new Date().toISOString();
        completedPoints += item.storyPoints;
      } else if (oldStatus === 'done' && newStatus !== 'done') {
        // Item moved out of done
        completedPoints -= item.storyPoints;
      }

      // Generate AI comment
      let aiComment: string | undefined;
      if (newStatus === 'done') {
        aiComment = `"${item.title}" complete! +${item.storyPoints} points!`;
        const prediction = this.aiPredictCompletion(sprint.totalStoryPoints, completedPoints, sprint.startDate, sprint.endDate);
        if (prediction.likelyToComplete) aiComment += ' On track for goal!';
      } else if (newStatus === 'in_progress') {
        const wip = backlogItems.filter((i) => i.status === 'in_progress').length;
        if (wip > 3) aiComment = `${wip} items in progress - finish some first!`;
      }

      // Update AI prediction
      const aiInsights = (sprint.aiInsights as unknown as AIInsights) || this.getDefaultAIInsights();
      aiInsights.completionPrediction = this.aiPredictCompletion(sprint.totalStoryPoints, completedPoints, sprint.startDate, sprint.endDate);

      backlogItems[itemIndex] = item;

      await prisma.eduScrumSprint.update({
        where: { id: sprintId },
        data: {
          backlogItems: backlogItems as unknown as Prisma.InputJsonValue,
          completedPoints,
          aiInsights: aiInsights as unknown as Prisma.InputJsonValue,
        },
      });

      log.info('Item moved', { sprintId, itemId, oldStatus, newStatus });

      return success({ item, aiComment });
    });
  }

  /**
   * Report a blocker on an item
   */
  async reportBlocker(
    tenantId: string,
    sprintId: string,
    itemId: string,
    description: string,
    reportedBy: string
  ): Promise<Result<{
    blocker: Blocker;
    aiSuggestion: string;
  }>> {
    return this.withTiming('reportBlocker', async () => {
      const sprint = await prisma.eduScrumSprint.findFirst({
        where: { id: sprintId, tenantId },
      });

      if (!sprint) {
        return failure({ code: 'NOT_FOUND', message: `Sprint ${sprintId} not found` });
      }

      const backlogItems = (sprint.backlogItems as unknown as SprintBacklogItem[]) || [];
      const itemIndex = backlogItems.findIndex((i) => i.id === itemId);

      if (itemIndex === -1) {
        return failure({ code: 'NOT_FOUND', message: `Item ${itemId} not found` });
      }

      const item = backlogItems[itemIndex];
      const aiSuggestion = this.aiSuggestBlockerResolution(description);

      const blocker: Blocker = {
        id: this.generateId('blocker'),
        description,
        reportedBy,
        reportedAt: new Date().toISOString(),
        aiSuggestedResolution: aiSuggestion,
      };

      item.blockers.push(blocker);
      backlogItems[itemIndex] = item;

      // Add AI insight
      const aiInsights = (sprint.aiInsights as unknown as AIInsights) || this.getDefaultAIInsights();
      aiInsights.currentInsights.push({
        id: this.generateId('insight'),
        timestamp: new Date().toISOString(),
        type: 'risk',
        title: 'Blocker Reported',
        description: `"${item.title}": ${description}`,
        priority: 'action_needed',
      });

      await prisma.eduScrumSprint.update({
        where: { id: sprintId },
        data: {
          backlogItems: backlogItems as unknown as Prisma.InputJsonValue,
          aiInsights: aiInsights as unknown as Prisma.InputJsonValue,
        },
      });

      return success({ blocker, aiSuggestion });
    });
  }

  /**
   * Run sprint review ceremony
   */
  async runSprintReview(
    tenantId: string,
    sprintId: string,
    reviewData: {
      demonstratedItems: string[];
      feedbackReceived: string[];
    }
  ): Promise<Result<{
    aiSummary: string;
    learningOutcomes: string[];
  }>> {
    return this.withTiming('runSprintReview', async () => {
      const sprint = await prisma.eduScrumSprint.findFirst({
        where: { id: sprintId, tenantId },
      });

      if (!sprint) {
        return failure({ code: 'NOT_FOUND', message: `Sprint ${sprintId} not found` });
      }

      const backlogItems = (sprint.backlogItems as unknown as SprintBacklogItem[]) || [];
      const completedItems = backlogItems.filter((i) => i.status === 'done');
      const completedPoints = completedItems.reduce((s, i) => s + i.storyPoints, 0);
      const velocityRatio = completedPoints / Math.max(1, sprint.totalStoryPoints);

      const aiSummary = this.aiGenerateReviewSummary(sprint.name, completedPoints, sprint.totalStoryPoints);
      const learningOutcomes = completedItems.map((i) => `Mastered: ${i.title}`);

      // Add celebration message
      const aiInsights = (sprint.aiInsights as unknown as AIInsights) || this.getDefaultAIInsights();
      aiInsights.coachingMessages.push({
        id: this.generateId('msg'),
        timestamp: new Date().toISOString(),
        targetAudience: 'team',
        messageType: 'celebration',
        content: this.aiCelebrationMessage(velocityRatio, completedPoints),
        acknowledged: false,
      });

      await prisma.eduScrumSprint.update({
        where: { id: sprintId },
        data: {
          status: 'review',
          completedPoints,
          aiInsights: aiInsights as unknown as Prisma.InputJsonValue,
        },
      });

      return success({ aiSummary, learningOutcomes });
    });
  }

  /**
   * Run retrospective ceremony
   */
  async runRetrospective(
    tenantId: string,
    sprintId: string,
    retroData: {
      wentWell: string[];
      toImprove: string[];
      actionItems: { description: string; assignedTo: string }[];
      facilitatorId: string;
      participantIds: string[];
    }
  ): Promise<Result<{
    retrospective: Prisma.EduScrumRetrospectiveGetPayload<{}>;
    aiInsights: string[];
    suggestedExperiments: string[];
  }>> {
    return this.withTiming('runRetrospective', async () => {
      const sprint = await prisma.eduScrumSprint.findFirst({
        where: { id: sprintId, tenantId },
        include: { team: true },
      });

      if (!sprint) {
        return failure({ code: 'NOT_FOUND', message: `Sprint ${sprintId} not found` });
      }

      const aiInsights = this.aiAnalyzeRetro(retroData);
      const suggestedExperiments = this.aiSuggestExperiments(retroData, sprint.completedPoints, sprint.totalStoryPoints);

      // Create retrospective record
      const retrospective = await prisma.eduScrumRetrospective.create({
        data: {
          tenantId,
          teamId: sprint.teamId,
          sprintId,
          wentWell: retroData.wentWell as Prisma.InputJsonValue,
          toImprove: retroData.toImprove as Prisma.InputJsonValue,
          actionItems: retroData.actionItems.map((ai) => ({
            id: this.generateId('action'),
            description: ai.description,
            assignedTo: ai.assignedTo,
            status: 'open',
          })) as unknown as Prisma.InputJsonValue,
          participantIds: retroData.participantIds,
          facilitatorId: retroData.facilitatorId,
          aiSummary: `Team reflected on ${retroData.wentWell.length} positives and ${retroData.toImprove.length} areas to improve.`,
          aiRecommendations: suggestedExperiments as Prisma.InputJsonValue,
        },
      });

      // Update sprint status
      await prisma.eduScrumSprint.update({
        where: { id: sprintId },
        data: { status: 'retrospective' },
      });

      return success({ retrospective, aiInsights, suggestedExperiments });
    });
  }

  /**
   * Complete a sprint and update team velocity
   */
  async completeSprint(
    tenantId: string,
    sprintId: string
  ): Promise<Result<{
    sprint: EduScrumSprintWithRelations;
    teamUpdate: { newVelocity: number; velocityTrend: string };
  }>> {
    return this.withTiming('completeSprint', async () => {
      const sprint = await prisma.eduScrumSprint.findFirst({
        where: { id: sprintId, tenantId },
        include: { team: true },
      });

      if (!sprint) {
        return failure({ code: 'NOT_FOUND', message: `Sprint ${sprintId} not found` });
      }

      const team = sprint.team;
      const completedSprints = await prisma.eduScrumSprint.count({
        where: { teamId: team.id, status: 'completed' },
      });

      const oldVelocity = team.velocity;
      const newVelocity =
        completedSprints === 0
          ? sprint.completedPoints
          : (team.velocity * completedSprints + sprint.completedPoints) / (completedSprints + 1);
      const velocityTrend = newVelocity > oldVelocity ? 'increasing' : newVelocity < oldVelocity ? 'decreasing' : 'stable';

      // Update team velocity
      await prisma.eduScrumTeam.update({
        where: { id: team.id },
        data: { velocity: newVelocity },
      });

      // Update sprint status
      const updatedSprint = await prisma.eduScrumSprint.update({
        where: { id: sprintId },
        data: { status: 'completed' },
        include: { team: true },
      });

      log.info('Sprint completed', { sprintId, newVelocity });

      return success({
        sprint: updatedSprint,
        teamUpdate: { newVelocity, velocityTrend },
      });
    });
  }

  /**
   * Get Kanban board view for a sprint
   */
  async getKanbanBoard(
    tenantId: string,
    sprintId: string
  ): Promise<Result<KanbanBoard>> {
    return this.withTiming('getKanbanBoard', async () => {
      const sprint = await prisma.eduScrumSprint.findFirst({
        where: { id: sprintId, tenantId },
      });

      if (!sprint) {
        return failure({ code: 'NOT_FOUND', message: `Sprint ${sprintId} not found` });
      }

      const backlogItems = (sprint.backlogItems as unknown as SprintBacklogItem[]) || [];

      const columns = ['backlog', 'todo', 'in_progress', 'review', 'done'].map((status) => ({
        id: status,
        name: status.replace('_', ' ').toUpperCase(),
        status,
        itemIds: backlogItems.filter((item) => item.status === status).map((item) => item.id),
        wipLimit: status === 'in_progress' ? 3 : undefined,
      }));

      return success({
        id: `board_${sprintId}`,
        teamId: sprint.teamId,
        sprintId,
        columns,
      });
    });
  }

  /**
   * Get AI coaching insights for a team
   */
  async getAICoaching(
    tenantId: string,
    teamId: string
  ): Promise<Result<{
    insights: AIInsight[];
    recommendations: string[];
    pendingMessages: CoachingMessage[];
  }>> {
    return this.withTiming('getAICoaching', async () => {
      const team = await prisma.eduScrumTeam.findFirst({
        where: { id: teamId, tenantId },
        include: {
          sprints: {
            where: { status: { in: ['planning', 'active', 'review'] } },
            orderBy: { sprintNumber: 'desc' },
            take: 1,
          },
        },
      });

      if (!team) {
        return failure({ code: 'NOT_FOUND', message: `Team ${teamId} not found` });
      }

      const activeSprint = team.sprints[0];
      if (!activeSprint) {
        return success({
          insights: [],
          recommendations: ['Start a new sprint to begin tracking progress'],
          pendingMessages: [],
        });
      }

      const aiInsights = (activeSprint.aiInsights as unknown as AIInsights) || this.getDefaultAIInsights();
      const backlogItems = (activeSprint.backlogItems as unknown as SprintBacklogItem[]) || [];

      const insights = aiInsights.currentInsights.slice(-5);
      const pendingMessages = aiInsights.coachingMessages.filter((m) => !m.acknowledged);
      const recommendations = this.aiGenerateRecommendations(backlogItems);

      return success({ insights, recommendations, pendingMessages });
    });
  }

  /**
   * Get sprint by ID
   */
  async getSprint(
    tenantId: string,
    sprintId: string
  ): Promise<Result<EduScrumSprintWithRelations>> {
    return this.withTiming('getSprint', async () => {
      const sprint = await prisma.eduScrumSprint.findFirst({
        where: { id: sprintId, tenantId },
        include: { team: true },
      });

      if (!sprint) {
        return failure({ code: 'NOT_FOUND', message: `Sprint ${sprintId} not found` });
      }

      return success(sprint);
    });
  }

  // --------------------------------------------------------------------------
  // PRIVATE AI METHODS
  // --------------------------------------------------------------------------

  private getDefaultAIInsights(): AIInsights {
    return {
      currentInsights: [],
      completionPrediction: { likelyToComplete: true, confidence: 0.5, riskFactors: [] },
      coachingMessages: [],
      difficultyAssessment: { current: 'appropriate' },
    };
  }

  private async aiSuggestTeams(
    learnerIds: string[],
    teamSize: number
  ): Promise<{ members: string[]; rationale: string; predictedCohesion: number }[]> {
    const shuffled = [...learnerIds].sort(() => Math.random() - 0.5);
    const teams: { members: string[]; rationale: string; predictedCohesion: number }[] = [];
    for (let i = 0; i < shuffled.length; i += teamSize) {
      const members = shuffled.slice(i, i + teamSize);
      if (members.length >= 2) {
        teams.push({ members, rationale: 'Balanced skills', predictedCohesion: 75 });
      }
    }
    return teams;
  }

  private aiAnalyzeTeamDynamics(team: EduScrumTeamWithRelations): {
    dynamics: TeamDynamics;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    const completedSprints = team.sprints.filter((s) => s.status === 'completed');

    // Analyze velocity trend
    if (completedSprints.length >= 2) {
      const recentVelocities = completedSprints.slice(-3).map((s) => s.completedPoints);
      const avgRecent = recentVelocities.reduce((a, b) => a + b, 0) / recentVelocities.length;
      if (avgRecent < team.velocity * 0.8) {
        recommendations.push('Recent velocity is below average - consider reducing sprint scope');
      }
    }

    if (team.memberIds.length > 5) {
      recommendations.push('Consider splitting into smaller teams for better collaboration');
    }

    const dynamics: TeamDynamics = {
      cohesionScore: team.healthScore,
      participationBalance: 80,
      conflictLevel: 'none',
      aiObservations: [],
      suggestedInterventions: [],
      trend: 'stable',
    };

    return { dynamics, recommendations };
  }

  private aiPredictCompletion(
    totalPoints: number,
    completedPoints: number,
    startDate: Date,
    endDate: Date
  ): AIInsights['completionPrediction'] {
    const remaining = totalPoints - completedPoints;
    const daysElapsed = Math.max(1, (Date.now() - startDate.getTime()) / 86400000);
    const totalDays = (endDate.getTime() - startDate.getTime()) / 86400000;
    const burnRate = completedPoints / daysElapsed;
    const daysRemaining = Math.max(0, totalDays - daysElapsed);
    const projected = burnRate * daysRemaining;

    return {
      likelyToComplete: projected >= remaining * 0.8,
      confidence: Math.min(0.9, 0.5 + (daysElapsed / totalDays) * 0.4),
      riskFactors: remaining > projected ? ['Behind schedule'] : [],
    };
  }

  private aiAnalyzeStandup(responses: StandupResponse[]): {
    summary: string;
    insights: AIInsight[];
    concerns: { memberId: string; description: string; message: string }[];
  } {
    const concerns: { memberId: string; description: string; message: string }[] = [];

    for (const r of responses.filter((r) => r.mood === 'struggling')) {
      concerns.push({
        memberId: r.memberId,
        description: 'Struggling',
        message: "I noticed you're struggling. Want to talk about what's blocking you?",
      });
    }

    for (const r of responses.filter((r) => r.blockers.length > 0)) {
      concerns.push({
        memberId: r.memberId,
        description: `${r.blockers.length} blockers reported`,
        message: 'You have blockers - let the team know so we can help resolve them.',
      });
    }

    const moodCounts = responses.reduce(
      (acc, r) => {
        acc[r.mood] = (acc[r.mood] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const moodSummary = Object.entries(moodCounts)
      .map(([mood, count]) => `${count} ${mood}`)
      .join(', ');

    return {
      summary: `${responses.length} check-ins. Moods: ${moodSummary}`,
      insights: [],
      concerns,
    };
  }

  private calculateIdealBurndown(totalPoints: number, startDate: Date, endDate: Date): number {
    const elapsed = (Date.now() - startDate.getTime()) / 86400000;
    const totalDays = (endDate.getTime() - startDate.getTime()) / 86400000;
    return Math.max(0, totalPoints * (1 - elapsed / totalDays));
  }

  private aiSuggestBlockerResolution(description: string): string {
    const lower = description.toLowerCase();
    if (lower.includes('understand') || lower.includes('confused')) {
      return 'Review materials or ask a teammate to explain.';
    }
    if (lower.includes('time') || lower.includes('busy')) {
      return 'Discuss redistributing work with your team.';
    }
    if (lower.includes('stuck') || lower.includes('help')) {
      return 'Try pair programming or ask the scrum master for guidance.';
    }
    return 'Try breaking the task into smaller steps or pair with a teammate.';
  }

  private aiGenerateReviewSummary(sprintName: string, completedPoints: number, totalPoints: number): string {
    const pct = Math.round((completedPoints / Math.max(1, totalPoints)) * 100);
    return `Sprint "${sprintName}": ${completedPoints}/${totalPoints} points (${pct}%). ${
      pct >= 80 ? 'Great work!' : 'Reflect on blockers for next sprint.'
    }`;
  }

  private aiCelebrationMessage(velocityRatio: number, completedPoints: number): string {
    if (velocityRatio >= 0.9) return `AMAZING! ${completedPoints} points! You crushed it!`;
    if (velocityRatio >= 0.7) return `Great job! ${completedPoints} points completed!`;
    return 'Sprint complete! Every sprint teaches us something!';
  }

  private aiAnalyzeRetro(retroData: { wentWell: string[]; toImprove: string[] }): string[] {
    const insights: string[] = [];

    if (retroData.toImprove.some((i) => i.toLowerCase().includes('time'))) {
      insights.push('Time management noted - try timeboxing.');
    }
    if (retroData.wentWell.some((i) => i.toLowerCase().includes('collabor'))) {
      insights.push('Collaboration is strong - keep it up!');
    }
    if (retroData.toImprove.some((i) => i.toLowerCase().includes('communicat'))) {
      insights.push('Communication could improve - consider more frequent check-ins.');
    }

    return insights.length ? insights : ['Great reflection session!'];
  }

  private aiSuggestExperiments(
    retroData: { wentWell: string[]; toImprove: string[] },
    completedPoints: number,
    totalPoints: number
  ): string[] {
    const experiments: string[] = [];
    const velocityRatio = completedPoints / Math.max(1, totalPoints);

    if (velocityRatio < 0.7) {
      experiments.push('Try fewer story points next sprint');
    }
    if (retroData.toImprove.length > retroData.wentWell.length) {
      experiments.push('Focus on 1-2 improvements at a time');
    }

    experiments.push('Rotate roles to develop new skills');

    return experiments;
  }

  private aiGenerateRecommendations(backlogItems: SprintBacklogItem[]): string[] {
    const recs: string[] = [];

    const wip = backlogItems.filter((i) => i.status === 'in_progress').length;
    if (wip > 3) {
      recs.push(`${wip} items in progress - finish some before starting more`);
    }

    const blocked = backlogItems.filter((i) => i.blockers.some((b) => !b.resolvedAt)).length;
    if (blocked > 0) {
      recs.push(`${blocked} items blocked - address these first!`);
    }

    const inBacklog = backlogItems.filter((i) => i.status === 'backlog').length;
    if (inBacklog > 0 && backlogItems.filter((i) => i.status === 'in_progress').length === 0) {
      recs.push('Start working on backlog items!');
    }

    return recs;
  }
}

// ============================================================================
// Service Initialization
// ============================================================================

export function initializeEduScrumOrchestrator(): EduScrumOrchestrator {
  if (!eduScrumOrchestratorInstance) {
    eduScrumOrchestratorInstance = new EduScrumOrchestrator();
  }
  return eduScrumOrchestratorInstance;
}

export function getEduScrumOrchestrator(): EduScrumOrchestrator {
  if (!eduScrumOrchestratorInstance) {
    throw new Error('EduScrumOrchestrator not initialized. Call initializeEduScrumOrchestrator() first.');
  }
  return eduScrumOrchestratorInstance;
}
