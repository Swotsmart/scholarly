/**
 * AI-Enabled EduScrum Orchestrator
 * 
 * Brings agile/scrum methodology to education with AI coaching. Students work
 * in self-organizing teams on learning sprints, with the AI acting as an
 * intelligent Scrum Master that adapts to each team's dynamics.
 * 
 * ## The Granny Explanation
 * 
 * Remember how you learned to cook? Not by reading a recipe book cover to cover,
 * but by picking a dish, trying it, messing up, getting help, and trying again.
 * 
 * EduScrum works the same way:
 * - Instead of "learn all of maths", you pick a goal: "make a budget for a party"
 * - Instead of working alone, you team up with others
 * - Instead of the teacher telling you every step, YOU figure out how to learn it
 * - Every week you show what you learned (like tasting the dish)
 * - Then you reflect: "what worked? what didn't?"
 * 
 * The AI is like having a wise mentor watching over your shoulder:
 * - "I notice Sarah hasn't contributed much - maybe check in with her?"
 * - "Your team is ahead of schedule - want a harder challenge?"
 * - "You've been stuck on this for 2 days - here's a hint..."
 * 
 * @module EduScrumOrchestrator
 */

import {
  ScholarlyBaseService, Result, success, failure, ValidationError, NotFoundError,
  Validator, EventBus, Cache, ScholarlyConfig
} from '../shared/types';

// ============================================================================
// TYPES
// ============================================================================

export interface LearningTeam {
  id: string;
  tenantId: string;
  name: string;
  members: TeamMember[];
  maxSize: number;
  formationType: 'self_selected' | 'ai_suggested' | 'teacher_assigned' | 'random';
  dynamics: TeamDynamics;
  currentSprintId?: string;
  completedSprints: number;
  averageVelocity: number;
  createdAt: Date;
}

export interface TeamMember {
  learnerId: string;
  role: 'member' | 'facilitator' | 'note_taker' | 'timekeeper';
  contributionScore: number;
  strengths: string[];
  growthAreas: string[];
}

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

export interface LearningSprint {
  id: string;
  tenantId: string;
  teamId: string;
  sprintNumber: number;
  name: string;
  goal: string;
  startDate: string;
  endDate: string;
  duration: number;
  backlogItems: SprintBacklogItem[];
  ceremonies: SprintCeremony[];
  status: 'planning' | 'active' | 'review' | 'retrospective' | 'completed';
  burndownData: BurndownPoint[];
  metrics: SprintMetrics;
  aiCoaching: AISprintCoaching;
  createdAt: Date;
}

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
  movedToInProgressAt?: Date;
  completedAt?: Date;
}

export interface Blocker {
  id: string;
  description: string;
  reportedBy: string;
  reportedAt: Date;
  resolvedAt?: Date;
  aiSuggestedResolution?: string;
}

export interface SprintCeremony {
  type: 'planning' | 'daily_standup' | 'review' | 'retrospective';
  scheduledAt: string;
  duration: number;
  status: 'scheduled' | 'completed' | 'skipped';
  notes?: CeremonyNotes;
}

export interface CeremonyNotes {
  standupResponses?: StandupResponse[];
  wentWell?: string[];
  toImprove?: string[];
  actionItems?: { id: string; description: string; assignedTo: string; status: string }[];
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

export interface SprintMetrics {
  plannedPoints: number;
  completedPoints: number;
  velocityRatio: number;
  qualityRatio: number;
  participationRate: number;
  velocityTrend: 'increasing' | 'stable' | 'decreasing';
}

export interface AISprintCoaching {
  currentInsights: AIInsight[];
  completionPrediction: { likelyToComplete: boolean; confidence: number; riskFactors: string[] };
  coachingMessages: CoachingMessage[];
  difficultyAssessment: { current: 'too_easy' | 'appropriate' | 'too_hard' };
}

export interface AIInsight {
  id: string;
  timestamp: Date;
  type: 'progress' | 'collaboration' | 'quality' | 'risk';
  title: string;
  description: string;
  priority: 'info' | 'attention' | 'action_needed';
}

export interface CoachingMessage {
  id: string;
  timestamp: Date;
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

// ============================================================================
// REPOSITORIES
// ============================================================================

export interface TeamRepository {
  findById(tenantId: string, id: string): Promise<LearningTeam | null>;
  findByMember(tenantId: string, learnerId: string): Promise<LearningTeam[]>;
  save(tenantId: string, team: LearningTeam): Promise<LearningTeam>;
  update(tenantId: string, id: string, updates: Partial<LearningTeam>): Promise<LearningTeam>;
}

export interface SprintRepository {
  findById(tenantId: string, id: string): Promise<LearningSprint | null>;
  findByTeam(tenantId: string, teamId: string): Promise<LearningSprint[]>;
  findActive(tenantId: string, teamId: string): Promise<LearningSprint | null>;
  save(tenantId: string, sprint: LearningSprint): Promise<LearningSprint>;
  update(tenantId: string, id: string, updates: Partial<LearningSprint>): Promise<LearningSprint>;
}

// ============================================================================
// SERVICE
// ============================================================================

export class EduScrumOrchestrator extends ScholarlyBaseService {
  private readonly teamRepo: TeamRepository;
  private readonly sprintRepo: SprintRepository;

  constructor(deps: {
    eventBus: EventBus; cache: Cache; config: ScholarlyConfig;
    teamRepo: TeamRepository; sprintRepo: SprintRepository;
  }) {
    super('EduScrumOrchestrator', deps);
    this.teamRepo = deps.teamRepo;
    this.sprintRepo = deps.sprintRepo;
  }

  // --------------------------------------------------------------------------
  // TEAM MANAGEMENT
  // --------------------------------------------------------------------------

  async formTeam(tenantId: string, request: {
    name: string; memberIds: string[]; formationType: LearningTeam['formationType'];
  }): Promise<Result<LearningTeam>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.name, 'name');
      if (request.memberIds.length < 2) throw new ValidationError('Team must have at least 2 members');
    } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('formTeam', tenantId, async () => {
      const analysis = await this.aiAnalyzeComposition(request.memberIds);

      const team: LearningTeam = {
        id: this.generateId('team'), tenantId, name: request.name,
        members: request.memberIds.map((id, idx) => ({
          learnerId: id, role: idx === 0 ? 'facilitator' as const : 'member' as const,
          contributionScore: 50, strengths: analysis.strengths[id] || [], growthAreas: []
        })),
        maxSize: 5, formationType: request.formationType,
        dynamics: {
          cohesionScore: 50, participationBalance: 100, conflictLevel: 'none',
          aiObservations: [], suggestedInterventions: analysis.suggestions, trend: 'stable'
        },
        completedSprints: 0, averageVelocity: 0, createdAt: new Date()
      };

      const saved = await this.teamRepo.save(tenantId, team);
      await this.publishEvent('scholarly.eduscrum.team_formed', tenantId, { teamId: saved.id });
      return saved;
    }, {});
  }

  async suggestTeamComposition(tenantId: string, learnerIds: string[], teamSize: number): Promise<Result<{
    suggestedTeams: { members: string[]; rationale: string; predictedCohesion: number }[];
  }>> {
    try { Validator.tenantId(tenantId); } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('suggestTeamComposition', tenantId, async () => {
      const teams = await this.aiSuggestTeams(learnerIds, teamSize);
      return { suggestedTeams: teams };
    }, {});
  }

  async assessTeamDynamics(tenantId: string, teamId: string): Promise<Result<{
    dynamics: TeamDynamics; recommendations: string[];
  }>> {
    try { Validator.tenantId(tenantId); Validator.required(teamId, 'teamId'); } 
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('assessTeamDynamics', tenantId, async () => {
      const team = await this.teamRepo.findById(tenantId, teamId);
      if (!team) throw new NotFoundError('Team', teamId);

      const sprints = await this.sprintRepo.findByTeam(tenantId, teamId);
      const analysis = this.aiAnalyzeTeamDynamics(team, sprints);
      
      team.dynamics = { ...team.dynamics, ...analysis.dynamics };
      await this.teamRepo.update(tenantId, teamId, { dynamics: team.dynamics });

      return { dynamics: team.dynamics, recommendations: analysis.recommendations };
    }, {});
  }

  // --------------------------------------------------------------------------
  // SPRINT MANAGEMENT
  // --------------------------------------------------------------------------

  async startSprintPlanning(tenantId: string, teamId: string, config: {
    name: string; goal: string; duration: number; startDate: string;
  }): Promise<Result<LearningSprint>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(teamId, 'teamId');
      Validator.required(config.goal, 'goal');
    } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('startSprintPlanning', tenantId, async () => {
      const team = await this.teamRepo.findById(tenantId, teamId);
      if (!team) throw new NotFoundError('Team', teamId);

      const activeSprint = await this.sprintRepo.findActive(tenantId, teamId);
      if (activeSprint) throw new ValidationError('Team already has an active sprint');

      const endDate = new Date(config.startDate);
      endDate.setDate(endDate.getDate() + config.duration);
      const suggestedVelocity = team.completedSprints === 0 ? 20 : Math.round(team.averageVelocity);

      const sprint: LearningSprint = {
        id: this.generateId('sprint'), tenantId, teamId,
        sprintNumber: team.completedSprints + 1,
        name: config.name, goal: config.goal,
        startDate: config.startDate, endDate: endDate.toISOString(),
        duration: config.duration, backlogItems: [],
        ceremonies: this.generateCeremonies(config.startDate, config.duration),
        status: 'planning', burndownData: [],
        metrics: { plannedPoints: 0, completedPoints: 0, velocityRatio: 0, qualityRatio: 0, participationRate: 100, velocityTrend: 'stable' },
        aiCoaching: {
          currentInsights: [{
            id: this.generateId('insight'), timestamp: new Date(), type: 'progress',
            title: 'Sprint Planning Started',
            description: `Based on your history, I suggest ${suggestedVelocity} story points.`,
            priority: 'info'
          }],
          completionPrediction: { likelyToComplete: true, confidence: 0.5, riskFactors: [] },
          coachingMessages: [],
          difficultyAssessment: { current: 'appropriate' }
        },
        createdAt: new Date()
      };

      const saved = await this.sprintRepo.save(tenantId, sprint);
      await this.teamRepo.update(tenantId, teamId, { currentSprintId: saved.id });
      await this.publishEvent('scholarly.eduscrum.sprint_planning_started', tenantId, { sprintId: saved.id });
      return saved;
    }, {});
  }

  async addToSprintBacklog(tenantId: string, sprintId: string, item: {
    title: string; description: string; learningObjectiveId: string;
    storyPoints: number; acceptanceCriteria: string[];
  }): Promise<Result<SprintBacklogItem>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(sprintId, 'sprintId');
    } catch (e) { return failure(e as ValidationError); }

    return this.withTiming('addToSprintBacklog', tenantId, async () => {
      const sprint = await this.sprintRepo.findById(tenantId, sprintId);
      if (!sprint) throw new NotFoundError('Sprint', sprintId);
      if (sprint.status !== 'planning') throw new ValidationError('Can only add during planning');

      const backlogItem: SprintBacklogItem = {
        id: this.generateId('item'), title: item.title, description: item.description,
        learningObjectiveId: item.learningObjectiveId, storyPoints: item.storyPoints,
        assignedTo: [], status: 'backlog', acceptanceCriteria: item.acceptanceCriteria,
        criteriaMetStatus: {}, blockers: []
      };

      sprint.backlogItems.push(backlogItem);
      sprint.metrics.plannedPoints += item.storyPoints;
      sprint.aiCoaching.completionPrediction = this.aiPredictCompletion(sprint);

      await this.sprintRepo.update(tenantId, sprintId, sprint);
      return backlogItem;
    }, {});
  }

  async startSprint(tenantId: string, sprintId: string): Promise<Result<LearningSprint>> {
    try { Validator.tenantId(tenantId); Validator.required(sprintId, 'sprintId'); } 
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('startSprint', tenantId, async () => {
      const sprint = await this.sprintRepo.findById(tenantId, sprintId);
      if (!sprint) throw new NotFoundError('Sprint', sprintId);
      if (sprint.status !== 'planning') throw new ValidationError('Sprint not in planning');

      sprint.backlogItems = sprint.backlogItems.map(i => ({ ...i, status: 'todo' as const }));
      sprint.status = 'active';
      sprint.burndownData = [{
        date: new Date().toISOString(),
        plannedRemaining: sprint.metrics.plannedPoints,
        actualRemaining: sprint.metrics.plannedPoints
      }];
      sprint.aiCoaching.coachingMessages.push({
        id: this.generateId('msg'), timestamp: new Date(), targetAudience: 'team',
        messageType: 'encouragement',
        content: `ðŸš€ Sprint "${sprint.name}" is GO! Goal: "${sprint.goal}". ${sprint.metrics.plannedPoints} points in ${sprint.duration} days. You've got this!`,
        acknowledged: false
      });

      const updated = await this.sprintRepo.update(tenantId, sprintId, sprint);
      await this.publishEvent('scholarly.eduscrum.sprint_started', tenantId, { sprintId });
      return updated;
    }, {});
  }

  async recordStandup(tenantId: string, sprintId: string, responses: StandupResponse[]): Promise<Result<{
    sprint: LearningSprint; aiSummary: string; flaggedConcerns: string[];
  }>> {
    try { Validator.tenantId(tenantId); Validator.required(sprintId, 'sprintId'); } 
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('recordStandup', tenantId, async () => {
      const sprint = await this.sprintRepo.findById(tenantId, sprintId);
      if (!sprint) throw new NotFoundError('Sprint', sprintId);

      const analysis = this.aiAnalyzeStandup(responses, sprint);
      sprint.aiCoaching.currentInsights.push(...analysis.insights);

      for (const concern of analysis.concerns) {
        sprint.aiCoaching.coachingMessages.push({
          id: this.generateId('msg'), timestamp: new Date(), targetAudience: 'individual',
          targetId: concern.memberId, messageType: 'suggestion', content: concern.message, acknowledged: false
        });
      }

      const remainingPoints = sprint.backlogItems.filter(i => i.status !== 'done').reduce((s, i) => s + i.storyPoints, 0);
      sprint.burndownData.push({
        date: new Date().toISOString(),
        plannedRemaining: this.calculateIdealBurndown(sprint),
        actualRemaining: remainingPoints
      });

      await this.sprintRepo.update(tenantId, sprintId, sprint);
      return { sprint, aiSummary: analysis.summary, flaggedConcerns: analysis.concerns.map(c => c.description) };
    }, {});
  }

  async moveItem(tenantId: string, sprintId: string, itemId: string, newStatus: SprintBacklogItem['status']): Promise<Result<{
    item: SprintBacklogItem; aiComment?: string;
  }>> {
    try { Validator.tenantId(tenantId); Validator.required(sprintId, 'sprintId'); } 
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('moveItem', tenantId, async () => {
      const sprint = await this.sprintRepo.findById(tenantId, sprintId);
      if (!sprint) throw new NotFoundError('Sprint', sprintId);

      const item = sprint.backlogItems.find(i => i.id === itemId);
      if (!item) throw new NotFoundError('Item', itemId);

      const oldStatus = item.status;
      item.status = newStatus;

      if (newStatus === 'in_progress' && !item.movedToInProgressAt) item.movedToInProgressAt = new Date();
      if (newStatus === 'done') {
        item.completedAt = new Date();
        sprint.metrics.completedPoints += item.storyPoints;
      }

      let aiComment: string | undefined;
      if (newStatus === 'done') {
        aiComment = `ðŸŽ‰ "${item.title}" complete! +${item.storyPoints} points!`;
        const prediction = this.aiPredictCompletion(sprint);
        if (prediction.likelyToComplete) aiComment += ' On track for goal!';
      } else if (newStatus === 'in_progress') {
        const wip = sprint.backlogItems.filter(i => i.status === 'in_progress').length;
        if (wip > 3) aiComment = `âš ï¸ ${wip} items in progress - finish some first!`;
      }

      sprint.aiCoaching.completionPrediction = this.aiPredictCompletion(sprint);
      await this.sprintRepo.update(tenantId, sprintId, sprint);
      await this.publishEvent('scholarly.eduscrum.item_moved', tenantId, { sprintId, itemId, oldStatus, newStatus });
      return { item, aiComment };
    }, {});
  }

  async reportBlocker(tenantId: string, sprintId: string, itemId: string, description: string, reportedBy: string): Promise<Result<{
    blocker: Blocker; aiSuggestion: string;
  }>> {
    try { Validator.tenantId(tenantId); Validator.required(sprintId, 'sprintId'); } 
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('reportBlocker', tenantId, async () => {
      const sprint = await this.sprintRepo.findById(tenantId, sprintId);
      if (!sprint) throw new NotFoundError('Sprint', sprintId);

      const item = sprint.backlogItems.find(i => i.id === itemId);
      if (!item) throw new NotFoundError('Item', itemId);

      const aiSuggestion = this.aiSuggestBlockerResolution(description);
      const blocker: Blocker = {
        id: this.generateId('blocker'), description, reportedBy,
        reportedAt: new Date(), aiSuggestedResolution: aiSuggestion
      };

      item.blockers.push(blocker);
      sprint.aiCoaching.currentInsights.push({
        id: this.generateId('insight'), timestamp: new Date(), type: 'risk',
        title: 'Blocker Reported', description: `"${item.title}": ${description}`, priority: 'action_needed'
      });

      await this.sprintRepo.update(tenantId, sprintId, sprint);
      return { blocker, aiSuggestion };
    }, {});
  }

  async runSprintReview(tenantId: string, sprintId: string, reviewData: {
    demonstratedItems: string[]; feedbackReceived: string[];
  }): Promise<Result<{ sprint: LearningSprint; aiSummary: string; learningOutcomes: string[] }>> {
    try { Validator.tenantId(tenantId); Validator.required(sprintId, 'sprintId'); } 
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('runSprintReview', tenantId, async () => {
      const sprint = await this.sprintRepo.findById(tenantId, sprintId);
      if (!sprint) throw new NotFoundError('Sprint', sprintId);

      sprint.status = 'review';
      const completed = sprint.backlogItems.filter(i => i.status === 'done');
      sprint.metrics.completedPoints = completed.reduce((s, i) => s + i.storyPoints, 0);
      sprint.metrics.velocityRatio = sprint.metrics.completedPoints / Math.max(1, sprint.metrics.plannedPoints);

      const aiSummary = this.aiGenerateReviewSummary(sprint);
      const learningOutcomes = completed.map(i => `Mastered: ${i.title}`);

      sprint.aiCoaching.coachingMessages.push({
        id: this.generateId('msg'), timestamp: new Date(), targetAudience: 'team',
        messageType: 'celebration', content: this.aiCelebrationMessage(sprint), acknowledged: false
      });

      await this.sprintRepo.update(tenantId, sprintId, sprint);
      return { sprint, aiSummary, learningOutcomes };
    }, {});
  }

  async runRetrospective(tenantId: string, sprintId: string, retroData: {
    wentWell: string[]; toImprove: string[]; actionItems: { description: string; assignedTo: string }[];
  }): Promise<Result<{ sprint: LearningSprint; aiInsights: string[]; suggestedExperiments: string[] }>> {
    try { Validator.tenantId(tenantId); Validator.required(sprintId, 'sprintId'); } 
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('runRetrospective', tenantId, async () => {
      const sprint = await this.sprintRepo.findById(tenantId, sprintId);
      if (!sprint) throw new NotFoundError('Sprint', sprintId);

      sprint.status = 'retrospective';
      const retroCeremony = sprint.ceremonies.find(c => c.type === 'retrospective');
      if (retroCeremony) {
        retroCeremony.status = 'completed';
        retroCeremony.notes = {
          wentWell: retroData.wentWell, toImprove: retroData.toImprove,
          actionItems: retroData.actionItems.map(ai => ({
            id: this.generateId('action'), description: ai.description,
            assignedTo: ai.assignedTo, status: 'open'
          }))
        };
      }

      const aiInsights = this.aiAnalyzeRetro(retroData);
      const suggestedExperiments = this.aiSuggestExperiments(retroData, sprint);

      await this.sprintRepo.update(tenantId, sprintId, sprint);
      return { sprint, aiInsights, suggestedExperiments };
    }, {});
  }

  async completeSprint(tenantId: string, sprintId: string): Promise<Result<{
    sprint: LearningSprint; teamUpdate: { newVelocity: number; velocityTrend: string };
  }>> {
    try { Validator.tenantId(tenantId); Validator.required(sprintId, 'sprintId'); } 
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('completeSprint', tenantId, async () => {
      const sprint = await this.sprintRepo.findById(tenantId, sprintId);
      if (!sprint) throw new NotFoundError('Sprint', sprintId);

      sprint.status = 'completed';

      const team = await this.teamRepo.findById(tenantId, sprint.teamId);
      if (!team) throw new NotFoundError('Team', sprint.teamId);

      const oldVelocity = team.averageVelocity;
      const newVelocity = team.completedSprints === 0
        ? sprint.metrics.completedPoints
        : (team.averageVelocity * team.completedSprints + sprint.metrics.completedPoints) / (team.completedSprints + 1);
      const velocityTrend = newVelocity > oldVelocity ? 'increasing' : newVelocity < oldVelocity ? 'decreasing' : 'stable';

      team.completedSprints++;
      team.averageVelocity = newVelocity;
      team.currentSprintId = undefined;

      await this.teamRepo.update(tenantId, sprint.teamId, team);
      await this.sprintRepo.update(tenantId, sprintId, sprint);
      await this.publishEvent('scholarly.eduscrum.sprint_completed', tenantId, { sprintId, newVelocity });

      return { sprint, teamUpdate: { newVelocity, velocityTrend } };
    }, {});
  }

  async getKanbanBoard(tenantId: string, sprintId: string): Promise<Result<KanbanBoard>> {
    try { Validator.tenantId(tenantId); Validator.required(sprintId, 'sprintId'); } 
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('getKanbanBoard', tenantId, async () => {
      const sprint = await this.sprintRepo.findById(tenantId, sprintId);
      if (!sprint) throw new NotFoundError('Sprint', sprintId);

      const columns = ['backlog', 'todo', 'in_progress', 'review', 'done'].map((status, i) => ({
        id: status, name: status.replace('_', ' ').toUpperCase(), status,
        itemIds: sprint.backlogItems.filter(item => item.status === status).map(item => item.id),
        wipLimit: status === 'in_progress' ? 3 : undefined
      }));

      return { id: `board_${sprintId}`, teamId: sprint.teamId, sprintId, columns };
    }, {});
  }

  async getAICoaching(tenantId: string, teamId: string): Promise<Result<{
    insights: AIInsight[]; recommendations: string[]; pendingMessages: CoachingMessage[];
  }>> {
    try { Validator.tenantId(tenantId); Validator.required(teamId, 'teamId'); } 
    catch (e) { return failure(e as ValidationError); }

    return this.withTiming('getAICoaching', tenantId, async () => {
      const team = await this.teamRepo.findById(tenantId, teamId);
      if (!team) throw new NotFoundError('Team', teamId);

      const sprint = team.currentSprintId ? await this.sprintRepo.findById(tenantId, team.currentSprintId) : null;
      const insights = sprint?.aiCoaching.currentInsights.slice(-5) || [];
      const pendingMessages = sprint?.aiCoaching.coachingMessages.filter(m => !m.acknowledged) || [];
      const recommendations = sprint ? this.aiGenerateRecommendations(team, sprint) : [];

      return { insights, recommendations, pendingMessages };
    }, {});
  }

  // --------------------------------------------------------------------------
  // PRIVATE AI METHODS
  // --------------------------------------------------------------------------

  private async aiAnalyzeComposition(memberIds: string[]): Promise<{
    strengths: Record<string, string[]>; suggestions: TeamIntervention[];
  }> {
    const strengths: Record<string, string[]> = {};
    memberIds.forEach(id => strengths[id] = ['collaboration']);
    return {
      strengths,
      suggestions: [{
        id: this.generateId('intervention'), type: 'role_rotation',
        description: 'Rotate facilitator weekly to develop leadership', targetMembers: memberIds,
        priority: 'medium', status: 'suggested'
      }]
    };
  }

  private async aiSuggestTeams(learnerIds: string[], teamSize: number): Promise<{ members: string[]; rationale: string; predictedCohesion: number }[]> {
    const shuffled = [...learnerIds].sort(() => Math.random() - 0.5);
    const teams: { members: string[]; rationale: string; predictedCohesion: number }[] = [];
    for (let i = 0; i < shuffled.length; i += teamSize) {
      const members = shuffled.slice(i, i + teamSize);
      if (members.length >= 2) teams.push({ members, rationale: 'Balanced skills', predictedCohesion: 75 });
    }
    return teams;
  }

  private aiAnalyzeTeamDynamics(team: LearningTeam, sprints: LearningSprint[]): {
    dynamics: Partial<TeamDynamics>; recommendations: string[];
  } {
    const recommendations: string[] = [];
    const scores = team.members.map(m => m.contributionScore);
    const variance = scores.reduce((s, v) => s + Math.pow(v - 50, 2), 0) / scores.length;
    if (variance > 400) recommendations.push('Participation is uneven - consider role rotation');
    return { dynamics: { participationBalance: Math.max(0, 100 - Math.sqrt(variance)) }, recommendations };
  }

  private generateCeremonies(startDate: string, duration: number): SprintCeremony[] {
    const ceremonies: SprintCeremony[] = [{ type: 'planning', scheduledAt: startDate, duration: 30, status: 'scheduled' }];
    const start = new Date(startDate);
    for (let d = 1; d < duration; d++) {
      const date = new Date(start); date.setDate(date.getDate() + d);
      ceremonies.push({ type: 'daily_standup', scheduledAt: date.toISOString(), duration: 10, status: 'scheduled' });
    }
    const end = new Date(start); end.setDate(end.getDate() + duration - 1);
    ceremonies.push({ type: 'review', scheduledAt: end.toISOString(), duration: 30, status: 'scheduled' });
    ceremonies.push({ type: 'retrospective', scheduledAt: end.toISOString(), duration: 30, status: 'scheduled' });
    return ceremonies;
  }

  private aiPredictCompletion(sprint: LearningSprint): AISprintCoaching['completionPrediction'] {
    const remaining = sprint.backlogItems.filter(i => i.status !== 'done').reduce((s, i) => s + i.storyPoints, 0);
    const daysElapsed = Math.max(1, (Date.now() - new Date(sprint.startDate).getTime()) / 86400000);
    const burnRate = sprint.metrics.completedPoints / daysElapsed;
    const daysRemaining = Math.max(0, sprint.duration - daysElapsed);
    const projected = burnRate * daysRemaining;
    return { likelyToComplete: projected >= remaining * 0.8, confidence: 0.5 + daysElapsed / sprint.duration * 0.4, riskFactors: [] };
  }

  private aiAnalyzeStandup(responses: StandupResponse[], sprint: LearningSprint): {
    summary: string; insights: AIInsight[]; concerns: { memberId: string; description: string; message: string }[];
  } {
    const concerns: { memberId: string; description: string; message: string }[] = [];
    for (const r of responses.filter(r => r.mood === 'struggling')) {
      concerns.push({ memberId: r.memberId, description: 'Struggling', message: 'I noticed you\'re struggling. Want to talk about what\'s blocking you?' });
    }
    const moods = responses.map(r => r.mood).join(', ');
    return { summary: `${responses.length} check-ins. Moods: ${moods}`, insights: [], concerns };
  }

  private calculateIdealBurndown(sprint: LearningSprint): number {
    const elapsed = (Date.now() - new Date(sprint.startDate).getTime()) / 86400000;
    return Math.max(0, sprint.metrics.plannedPoints * (1 - elapsed / sprint.duration));
  }

  private aiSuggestBlockerResolution(description: string): string {
    if (description.toLowerCase().includes('understand')) return 'Review materials or ask a teammate to explain.';
    if (description.toLowerCase().includes('time')) return 'Discuss redistributing work with your team.';
    return 'Try breaking the task into smaller steps or pair with a teammate.';
  }

  private aiGenerateReviewSummary(sprint: LearningSprint): string {
    const pct = Math.round(sprint.metrics.velocityRatio * 100);
    return `Sprint "${sprint.name}": ${sprint.metrics.completedPoints}/${sprint.metrics.plannedPoints} points (${pct}%). ${pct >= 80 ? 'Great work!' : 'Reflect on blockers.'}`;
  }

  private aiCelebrationMessage(sprint: LearningSprint): string {
    const pct = sprint.metrics.velocityRatio;
    if (pct >= 0.9) return `ðŸŽŠ AMAZING! ${sprint.metrics.completedPoints} points! You crushed it!`;
    if (pct >= 0.7) return `ðŸ‘ Great job! ${sprint.metrics.completedPoints} points completed!`;
    return `ðŸ’ª Sprint complete! Every sprint teaches us something!`;
  }

  private aiAnalyzeRetro(retroData: { wentWell: string[]; toImprove: string[] }): string[] {
    const insights: string[] = [];
    if (retroData.toImprove.some(i => i.toLowerCase().includes('time'))) insights.push('Time management noted - try timeboxing.');
    if (retroData.wentWell.some(i => i.toLowerCase().includes('collabor'))) insights.push('Collaboration is strong - keep it up!');
    return insights.length ? insights : ['Great reflection session!'];
  }

  private aiSuggestExperiments(retroData: { wentWell: string[]; toImprove: string[] }, sprint: LearningSprint): string[] {
    const experiments: string[] = [];
    if (sprint.metrics.velocityRatio < 0.7) experiments.push('Try fewer points next sprint');
    experiments.push('Rotate roles to develop new skills');
    return experiments;
  }

  private aiGenerateRecommendations(team: LearningTeam, sprint: LearningSprint): string[] {
    const recs: string[] = [];
    const wip = sprint.backlogItems.filter(i => i.status === 'in_progress').length;
    if (wip > 3) recs.push(`${wip} items in progress - finish some before starting more`);
    const blocked = sprint.backlogItems.filter(i => i.blockers.some(b => !b.resolvedAt)).length;
    if (blocked > 0) recs.push(`${blocked} items blocked - address these first!`);
    return recs;
  }
}

export { EduScrumOrchestrator };
