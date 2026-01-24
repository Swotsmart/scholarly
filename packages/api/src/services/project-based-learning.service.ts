/**
 * Project-Based Learning Service
 *
 * Comprehensive service for managing project-based learning experiences:
 * - Project Templates - Pre-built and custom project structures
 * - Team Collaboration - Student team formation and collaboration tools
 * - Milestone Tracking - Progress tracking and checkpoint management
 * - Portfolio Builder - Integration with digital portfolios
 *
 * Supports cross-curricular projects, EduScrum methodology, and
 * real-world authentic learning experiences.
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  ScholarlyError,
  Validator,
  EventBus,
  Cache,
  ScholarlyConfig
} from '@scholarly/shared/types/scholarly-types';

import { AIIntegrationService, getAIService } from './ai-integration.service';
import { DigitalPortfolioService, getDigitalPortfolioService, Artifact } from './digital-portfolio.service';
import { GeneralCapability, CrossCurriculumPriority } from './standards-compliance.service';

// ============================================================================
// PROJECT TEMPLATE TYPES
// ============================================================================

export interface ProjectTemplate {
  id: string;
  name: string;
  description: string;
  category: ProjectCategory;
  subjects: string[];
  yearLevels: string[];
  estimatedDuration: string;
  teamSize: { min: number; max: number };
  curriculumAlignment: {
    codes: string[];
    generalCapabilities: GeneralCapability[];
    crossCurriculumPriorities: CrossCurriculumPriority[];
  };
  drivingQuestion: string;
  learningObjectives: string[];
  phases: ProjectPhase[];
  milestones: MilestoneTemplate[];
  deliverables: DeliverableTemplate[];
  assessmentCriteria: AssessmentCriteria[];
  resources: ProjectResource[];
  scaffolds: ProjectScaffold[];
  teacherGuidance: TeacherGuidance;
  metadata: {
    createdBy: string;
    createdAt: Date;
    updatedAt: Date;
    usageCount: number;
    rating: number;
    tags: string[];
    difficulty: 'beginner' | 'intermediate' | 'advanced';
    isPublic: boolean;
  };
}

export type ProjectCategory =
  | 'stem'
  | 'humanities'
  | 'arts'
  | 'cross_curricular'
  | 'community_service'
  | 'entrepreneurship'
  | 'environmental'
  | 'cultural'
  | 'health_wellbeing'
  | 'digital_technology';

export interface ProjectPhase {
  id: string;
  name: string;
  description: string;
  order: number;
  duration: string;
  activities: PhaseActivity[];
  checkpoints: string[];
  teamRoles?: string[];
}

export interface PhaseActivity {
  id: string;
  name: string;
  description: string;
  type: 'research' | 'design' | 'create' | 'collaborate' | 'present' | 'reflect' | 'feedback';
  duration: string;
  individual: boolean;
  resources: string[];
  outputs: string[];
}

export interface MilestoneTemplate {
  id: string;
  name: string;
  description: string;
  phase: string;
  dueOffset: string; // e.g., "week 2", "day 5"
  deliverables: string[];
  assessmentWeight: number;
  checkInRequired: boolean;
}

export interface DeliverableTemplate {
  id: string;
  name: string;
  description: string;
  type: DeliverableType;
  format: string[];
  requirements: string[];
  rubricCriteria: string[];
  exemplars?: string[];
}

export type DeliverableType =
  | 'report'
  | 'presentation'
  | 'prototype'
  | 'video'
  | 'website'
  | 'poster'
  | 'portfolio'
  | 'performance'
  | 'model'
  | 'code'
  | 'artwork'
  | 'experiment';

export interface AssessmentCriteria {
  id: string;
  name: string;
  description: string;
  weight: number;
  levels: { level: string; description: string; points: number }[];
  evidenceTypes: string[];
}

export interface ProjectResource {
  id: string;
  name: string;
  type: 'guide' | 'template' | 'tool' | 'example' | 'rubric' | 'checklist' | 'video' | 'reading';
  url?: string;
  description: string;
  phase?: string;
}

export interface ProjectScaffold {
  id: string;
  type: 'planning_tool' | 'graphic_organizer' | 'checklist' | 'sentence_starter' | 'example' | 'protocol';
  name: string;
  description: string;
  content: string;
  targetPhase?: string;
  targetSkill?: string;
}

export interface TeacherGuidance {
  overview: string;
  preparation: string[];
  facilitationTips: string[];
  differentiationSuggestions: string[];
  commonChallenges: { challenge: string; solution: string }[];
  extensionIdeas: string[];
  assessmentGuidance: string;
}

// ============================================================================
// ACTIVE PROJECT TYPES
// ============================================================================

export interface Project {
  id: string;
  tenantId: string;
  templateId?: string;
  name: string;
  description: string;
  drivingQuestion: string;
  status: ProjectStatus;
  startDate: Date;
  endDate: Date;
  teacherId: string;
  classId?: string;
  team: ProjectTeam;
  phases: ActivePhase[];
  milestones: ActiveMilestone[];
  deliverables: ActiveDeliverable[];
  reflections: ProjectReflection[];
  feedback: ProjectFeedback[];
  metrics: ProjectMetrics;
  portfolioLinks: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type ProjectStatus =
  | 'planning'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'archived';

export interface ProjectTeam {
  id: string;
  name: string;
  members: TeamMember[];
  roles: TeamRole[];
  communicationChannel?: string;
  meetingSchedule?: string;
  agreements?: string[];
}

export interface TeamMember {
  userId: string;
  name: string;
  email?: string;
  role?: string;
  joinedAt: Date;
  contributions: number;
  lastActive: Date;
}

export interface TeamRole {
  name: string;
  description: string;
  responsibilities: string[];
  assignedTo?: string;
  rotates: boolean;
}

export interface ActivePhase {
  id: string;
  templatePhaseId?: string;
  name: string;
  status: 'not_started' | 'in_progress' | 'completed';
  startDate?: Date;
  endDate?: Date;
  completedActivities: string[];
  notes: string;
  blockers?: string[];
}

export interface ActiveMilestone {
  id: string;
  templateMilestoneId?: string;
  name: string;
  description: string;
  dueDate: Date;
  status: 'pending' | 'in_progress' | 'submitted' | 'reviewed' | 'completed';
  submittedAt?: Date;
  reviewedAt?: Date;
  submissionUrl?: string;
  feedback?: string;
  score?: number;
  evidence: MilestoneEvidence[];
}

export interface MilestoneEvidence {
  id: string;
  type: 'artifact' | 'link' | 'file' | 'reflection';
  title: string;
  url?: string;
  description?: string;
  submittedBy: string;
  submittedAt: Date;
}

export interface ActiveDeliverable {
  id: string;
  templateDeliverableId?: string;
  name: string;
  type: DeliverableType;
  status: 'not_started' | 'in_progress' | 'draft' | 'submitted' | 'graded';
  versions: DeliverableVersion[];
  currentVersion?: string;
  dueDate?: Date;
  submittedAt?: Date;
  grade?: {
    score: number;
    feedback: string;
    rubricScores: { criteriaId: string; score: number; feedback: string }[];
  };
}

export interface DeliverableVersion {
  id: string;
  versionNumber: number;
  url: string;
  submittedBy: string;
  submittedAt: Date;
  notes?: string;
  feedback?: string;
}

export interface ProjectReflection {
  id: string;
  userId: string;
  type: 'individual' | 'team';
  phase?: string;
  milestone?: string;
  prompts: { question: string; response: string }[];
  submittedAt: Date;
  linkedToPortfolio: boolean;
}

export interface ProjectFeedback {
  id: string;
  fromUserId: string;
  fromRole: 'teacher' | 'peer' | 'mentor' | 'self';
  targetType: 'project' | 'milestone' | 'deliverable' | 'team';
  targetId: string;
  type: 'praise' | 'suggestion' | 'question' | 'concern';
  content: string;
  isPrivate: boolean;
  createdAt: Date;
  acknowledged: boolean;
}

export interface ProjectMetrics {
  overallProgress: number;
  phaseProgress: Record<string, number>;
  milestoneCompletion: { completed: number; total: number };
  teamEngagement: {
    averageContributions: number;
    collaborationScore: number;
    meetingsHeld: number;
  };
  timeTracking: {
    estimatedHours: number;
    loggedHours: number;
    onTrack: boolean;
  };
  qualityIndicators: {
    draftIterations: number;
    feedbackResponses: number;
    reflectionsCompleted: number;
  };
}

// ============================================================================
// TEAM COLLABORATION TYPES
// ============================================================================

export interface TeamFormationRequest {
  projectId: string;
  studentIds: string[];
  method: 'random' | 'balanced' | 'student_choice' | 'teacher_assigned' | 'skill_based';
  teamSize: number;
  constraints?: {
    mustInclude?: string[][];
    mustSeparate?: string[][];
    balanceBy?: string[];
  };
}

export interface TeamFormationResult {
  teams: ProjectTeam[];
  rationale: string;
  balanceMetrics: Record<string, number>;
  warnings?: string[];
}

export interface CollaborationActivity {
  id: string;
  projectId: string;
  teamId: string;
  type: 'comment' | 'edit' | 'share' | 'meeting' | 'task_complete' | 'milestone_submit';
  userId: string;
  targetId?: string;
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface TeamMeeting {
  id: string;
  projectId: string;
  teamId: string;
  scheduledAt: Date;
  duration: number;
  agenda: string[];
  attendees: string[];
  notes?: string;
  actionItems?: { task: string; assignee: string; dueDate: Date }[];
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface ProjectTemplateRepository {
  findById(id: string): Promise<ProjectTemplate | null>;
  findByCategory(category: ProjectCategory): Promise<ProjectTemplate[]>;
  findBySubjectYear(subject: string, yearLevel: string): Promise<ProjectTemplate[]>;
  search(query: string, filters?: Record<string, any>): Promise<ProjectTemplate[]>;
  save(template: ProjectTemplate): Promise<ProjectTemplate>;
  incrementUsage(id: string): Promise<void>;
}

export interface ProjectRepository {
  findById(tenantId: string, id: string): Promise<Project | null>;
  findByTeacher(tenantId: string, teacherId: string): Promise<Project[]>;
  findByStudent(tenantId: string, studentId: string): Promise<Project[]>;
  findByClass(tenantId: string, classId: string): Promise<Project[]>;
  save(tenantId: string, project: Project): Promise<Project>;
  update(tenantId: string, id: string, updates: Partial<Project>): Promise<Project>;
}

export interface CollaborationRepository {
  logActivity(activity: CollaborationActivity): Promise<void>;
  getActivities(projectId: string, teamId?: string, limit?: number): Promise<CollaborationActivity[]>;
  saveMeeting(meeting: TeamMeeting): Promise<TeamMeeting>;
  getMeetings(projectId: string, teamId: string): Promise<TeamMeeting[]>;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class ProjectBasedLearningService extends ScholarlyBaseService {
  private readonly templateRepo: ProjectTemplateRepository;
  private readonly projectRepo: ProjectRepository;
  private readonly collaborationRepo: CollaborationRepository;
  private aiService: AIIntegrationService;
  private portfolioService: DigitalPortfolioService;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    templateRepo: ProjectTemplateRepository;
    projectRepo: ProjectRepository;
    collaborationRepo: CollaborationRepository;
  }) {
    super('ProjectBasedLearningService', deps);
    this.templateRepo = deps.templateRepo;
    this.projectRepo = deps.projectRepo;
    this.collaborationRepo = deps.collaborationRepo;
    this.aiService = getAIService();
    this.portfolioService = getDigitalPortfolioService();
  }

  // ==========================================================================
  // PROJECT TEMPLATES
  // ==========================================================================

  /**
   * Get available project templates
   */
  async getProjectTemplates(
    tenantId: string,
    filters?: {
      category?: ProjectCategory;
      subject?: string;
      yearLevel?: string;
      difficulty?: string;
      searchQuery?: string;
    }
  ): Promise<Result<ProjectTemplate[]>> {
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getProjectTemplates', tenantId, async () => {
      if (filters?.searchQuery) {
        return await this.templateRepo.search(filters.searchQuery, filters);
      }

      if (filters?.category) {
        return await this.templateRepo.findByCategory(filters.category);
      }

      if (filters?.subject && filters?.yearLevel) {
        return await this.templateRepo.findBySubjectYear(filters.subject, filters.yearLevel);
      }

      // Return featured templates
      return await this.templateRepo.search('', { featured: true, limit: 20 });
    });
  }

  /**
   * Generate a custom project template using AI
   */
  async generateProjectTemplate(
    tenantId: string,
    request: {
      name: string;
      subjects: string[];
      yearLevels: string[];
      theme: string;
      duration: string;
      teamSize: { min: number; max: number };
      curriculumCodes?: string[];
      focusCapabilities?: GeneralCapability[];
      realWorldConnection?: string;
    }
  ): Promise<Result<ProjectTemplate>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.name, 'name');
      Validator.required(request.theme, 'theme');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateProjectTemplate', tenantId, async () => {
      const prompt = `Create a detailed project-based learning template:

Theme: ${request.theme}
Subjects: ${request.subjects.join(', ')}
Year Levels: ${request.yearLevels.join(', ')}
Duration: ${request.duration}
Team Size: ${request.teamSize.min}-${request.teamSize.max} students
${request.curriculumCodes ? `Curriculum Codes: ${request.curriculumCodes.join(', ')}` : ''}
${request.focusCapabilities ? `Focus Capabilities: ${request.focusCapabilities.join(', ')}` : ''}
${request.realWorldConnection ? `Real-World Connection: ${request.realWorldConnection}` : ''}

Generate:
1. A compelling driving question
2. 5-6 learning objectives
3. 4-5 project phases with activities
4. Key milestones with deliverables
5. Assessment criteria with rubric levels
6. Differentiation scaffolds
7. Teacher facilitation guidance

Focus on authentic, student-driven learning with real-world applications.`;

      const aiResult = await this.aiService.structuredOutput<GeneratedTemplate>(
        tenantId,
        {
          prompt,
          schema: this.getTemplateSchema(),
          maxTokens: 4000
        }
      );

      if (!aiResult.success) {
        throw new Error('Failed to generate project template');
      }

      const generated = aiResult.data;

      const template: ProjectTemplate = {
        id: this.generateId('template'),
        name: request.name,
        description: generated.description,
        category: this.determineCategory(request.subjects, request.theme),
        subjects: request.subjects,
        yearLevels: request.yearLevels,
        estimatedDuration: request.duration,
        teamSize: request.teamSize,
        curriculumAlignment: {
          codes: request.curriculumCodes || [],
          generalCapabilities: request.focusCapabilities || ['critical_creative_thinking', 'personal_social_capability'],
          crossCurriculumPriorities: generated.crossCurriculumPriorities || []
        },
        drivingQuestion: generated.drivingQuestion,
        learningObjectives: generated.learningObjectives,
        phases: generated.phases.map((phase, i) => ({
          id: `phase-${i + 1}`,
          name: phase.name,
          description: phase.description,
          order: i + 1,
          duration: phase.duration,
          activities: phase.activities.map((a, j) => ({
            id: `activity-${i + 1}-${j + 1}`,
            name: a.name,
            description: a.description,
            type: a.type,
            duration: a.duration,
            individual: a.individual || false,
            resources: a.resources || [],
            outputs: a.outputs || []
          })),
          checkpoints: phase.checkpoints || [],
          teamRoles: phase.teamRoles
        })),
        milestones: generated.milestones.map((m, i) => ({
          id: `milestone-${i + 1}`,
          name: m.name,
          description: m.description,
          phase: m.phase,
          dueOffset: m.dueOffset,
          deliverables: m.deliverables,
          assessmentWeight: m.assessmentWeight || 0,
          checkInRequired: m.checkInRequired || false
        })),
        deliverables: generated.deliverables.map((d, i) => ({
          id: `deliverable-${i + 1}`,
          name: d.name,
          description: d.description,
          type: d.type,
          format: d.format || [],
          requirements: d.requirements || [],
          rubricCriteria: d.rubricCriteria || []
        })),
        assessmentCriteria: generated.assessmentCriteria.map((c, i) => ({
          id: `criteria-${i + 1}`,
          name: c.name,
          description: c.description,
          weight: c.weight,
          levels: c.levels,
          evidenceTypes: c.evidenceTypes || []
        })),
        resources: generated.resources || [],
        scaffolds: generated.scaffolds || [],
        teacherGuidance: generated.teacherGuidance || {
          overview: '',
          preparation: [],
          facilitationTips: [],
          differentiationSuggestions: [],
          commonChallenges: [],
          extensionIdeas: [],
          assessmentGuidance: ''
        },
        metadata: {
          createdBy: 'ai-generated',
          createdAt: new Date(),
          updatedAt: new Date(),
          usageCount: 0,
          rating: 0,
          tags: generated.tags || [],
          difficulty: generated.difficulty || 'intermediate',
          isPublic: false
        }
      };

      const saved = await this.templateRepo.save(template);

      await this.publishEvent('scholarly.pbl.template_created', tenantId, {
        templateId: saved.id,
        name: saved.name,
        category: saved.category
      });

      return saved;
    });
  }

  // ==========================================================================
  // PROJECT MANAGEMENT
  // ==========================================================================

  /**
   * Create a new project from a template
   */
  async createProject(
    tenantId: string,
    request: {
      templateId?: string;
      name: string;
      description?: string;
      drivingQuestion?: string;
      teacherId: string;
      classId?: string;
      startDate: Date;
      endDate: Date;
      studentIds?: string[];
      teamFormation?: TeamFormationRequest['method'];
      teamSize?: number;
    }
  ): Promise<Result<Project>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.name, 'name');
      Validator.required(request.teacherId, 'teacherId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createProject', tenantId, async () => {
      let template: ProjectTemplate | null = null;

      if (request.templateId) {
        template = await this.templateRepo.findById(request.templateId);
        if (!template) throw new NotFoundError('Project template', request.templateId);
        await this.templateRepo.incrementUsage(request.templateId);
      }

      const project: Project = {
        id: this.generateId('project'),
        tenantId,
        templateId: request.templateId,
        name: request.name,
        description: request.description || template?.description || '',
        drivingQuestion: request.drivingQuestion || template?.drivingQuestion || '',
        status: 'planning',
        startDate: request.startDate,
        endDate: request.endDate,
        teacherId: request.teacherId,
        classId: request.classId,
        team: {
          id: this.generateId('team'),
          name: `${request.name} Team`,
          members: [],
          roles: template?.phases[0]?.teamRoles?.map(r => ({
            name: r,
            description: '',
            responsibilities: [],
            rotates: true
          })) || []
        },
        phases: template?.phases.map(p => ({
          id: this.generateId('phase'),
          templatePhaseId: p.id,
          name: p.name,
          status: 'not_started',
          completedActivities: [],
          notes: ''
        })) || [],
        milestones: template?.milestones.map(m => ({
          id: this.generateId('milestone'),
          templateMilestoneId: m.id,
          name: m.name,
          description: m.description,
          dueDate: this.calculateDueDate(request.startDate, m.dueOffset),
          status: 'pending',
          evidence: []
        })) || [],
        deliverables: template?.deliverables.map(d => ({
          id: this.generateId('deliverable'),
          templateDeliverableId: d.id,
          name: d.name,
          type: d.type,
          status: 'not_started',
          versions: []
        })) || [],
        reflections: [],
        feedback: [],
        metrics: {
          overallProgress: 0,
          phaseProgress: {},
          milestoneCompletion: { completed: 0, total: template?.milestones.length || 0 },
          teamEngagement: { averageContributions: 0, collaborationScore: 0, meetingsHeld: 0 },
          timeTracking: { estimatedHours: 0, loggedHours: 0, onTrack: true },
          qualityIndicators: { draftIterations: 0, feedbackResponses: 0, reflectionsCompleted: 0 }
        },
        portfolioLinks: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Form teams if students provided
      if (request.studentIds && request.studentIds.length > 0) {
        const teamResult = await this.formTeams(tenantId, {
          projectId: project.id,
          studentIds: request.studentIds,
          method: request.teamFormation || 'balanced',
          teamSize: request.teamSize || template?.teamSize.max || 4
        });

        if (teamResult.success && teamResult.data.teams.length > 0) {
          project.team = teamResult.data.teams[0];
        }
      }

      const saved = await this.projectRepo.save(tenantId, project);

      await this.publishEvent('scholarly.pbl.project_created', tenantId, {
        projectId: saved.id,
        templateId: request.templateId,
        teacherId: request.teacherId
      });

      return saved;
    });
  }

  /**
   * Get project details
   */
  async getProject(
    tenantId: string,
    projectId: string
  ): Promise<Result<Project>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(projectId, 'projectId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getProject', tenantId, async () => {
      const project = await this.projectRepo.findById(tenantId, projectId);
      if (!project) throw new NotFoundError('Project', projectId);
      return project;
    });
  }

  /**
   * Update project status and progress
   */
  async updateProjectProgress(
    tenantId: string,
    projectId: string,
    updates: {
      status?: ProjectStatus;
      phaseId?: string;
      phaseStatus?: 'not_started' | 'in_progress' | 'completed';
      completedActivities?: string[];
      notes?: string;
    }
  ): Promise<Result<Project>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(projectId, 'projectId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('updateProjectProgress', tenantId, async () => {
      const project = await this.projectRepo.findById(tenantId, projectId);
      if (!project) throw new NotFoundError('Project', projectId);

      if (updates.status) {
        project.status = updates.status;
      }

      if (updates.phaseId) {
        const phase = project.phases.find(p => p.id === updates.phaseId);
        if (phase) {
          if (updates.phaseStatus) phase.status = updates.phaseStatus;
          if (updates.completedActivities) {
            phase.completedActivities = [...new Set([...phase.completedActivities, ...updates.completedActivities])];
          }
          if (updates.notes) phase.notes = updates.notes;
        }
      }

      // Recalculate metrics
      project.metrics = this.calculateProjectMetrics(project);
      project.updatedAt = new Date();

      const saved = await this.projectRepo.update(tenantId, projectId, project);

      await this.publishEvent('scholarly.pbl.project_updated', tenantId, {
        projectId,
        status: project.status,
        progress: project.metrics.overallProgress
      });

      return saved;
    });
  }

  // ==========================================================================
  // TEAM COLLABORATION
  // ==========================================================================

  /**
   * Form teams for a project
   */
  async formTeams(
    tenantId: string,
    request: TeamFormationRequest
  ): Promise<Result<TeamFormationResult>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.projectId, 'projectId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('formTeams', tenantId, async () => {
      const { studentIds, method, teamSize, constraints } = request;

      let teams: ProjectTeam[] = [];
      let rationale = '';

      switch (method) {
        case 'random':
          teams = this.formRandomTeams(studentIds, teamSize);
          rationale = 'Teams formed randomly';
          break;

        case 'balanced':
          teams = await this.formBalancedTeams(tenantId, studentIds, teamSize, constraints?.balanceBy);
          rationale = 'Teams balanced by specified criteria';
          break;

        case 'skill_based':
          teams = await this.formSkillBasedTeams(tenantId, studentIds, teamSize);
          rationale = 'Teams formed to maximize skill diversity';
          break;

        case 'student_choice':
          // Return empty teams for students to self-organize
          const numTeams = Math.ceil(studentIds.length / teamSize);
          teams = Array.from({ length: numTeams }, (_, i) => ({
            id: this.generateId('team'),
            name: `Team ${i + 1}`,
            members: [],
            roles: []
          }));
          rationale = 'Empty teams created for student self-selection';
          break;

        case 'teacher_assigned':
          // Return students as unassigned, teacher will assign manually
          teams = [{
            id: this.generateId('team'),
            name: 'Unassigned',
            members: studentIds.map(id => ({
              userId: id,
              name: id, // Would be fetched from user service
              joinedAt: new Date(),
              contributions: 0,
              lastActive: new Date()
            })),
            roles: []
          }];
          rationale = 'Students ready for teacher assignment';
          break;
      }

      // Apply constraints
      if (constraints) {
        teams = this.applyTeamConstraints(teams, constraints);
      }

      // Calculate balance metrics
      const balanceMetrics = this.calculateTeamBalance(teams);

      // Check for warnings
      const warnings: string[] = [];
      if (studentIds.length % teamSize !== 0) {
        warnings.push(`Uneven team sizes: some teams will have ${Math.ceil(studentIds.length / teamSize)} members`);
      }

      return {
        teams,
        rationale,
        balanceMetrics,
        warnings: warnings.length > 0 ? warnings : undefined
      };
    });
  }

  /**
   * Add a member to a team
   */
  async addTeamMember(
    tenantId: string,
    projectId: string,
    member: {
      userId: string;
      name: string;
      email?: string;
      role?: string;
    }
  ): Promise<Result<ProjectTeam>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(projectId, 'projectId');
      Validator.required(member.userId, 'member.userId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('addTeamMember', tenantId, async () => {
      const project = await this.projectRepo.findById(tenantId, projectId);
      if (!project) throw new NotFoundError('Project', projectId);

      const newMember: TeamMember = {
        userId: member.userId,
        name: member.name,
        email: member.email,
        role: member.role,
        joinedAt: new Date(),
        contributions: 0,
        lastActive: new Date()
      };

      project.team.members.push(newMember);
      await this.projectRepo.update(tenantId, projectId, { team: project.team });

      await this.collaborationRepo.logActivity({
        id: this.generateId('activity'),
        projectId,
        teamId: project.team.id,
        type: 'comment',
        userId: member.userId,
        description: `${member.name} joined the team`,
        timestamp: new Date()
      });

      return project.team;
    });
  }

  /**
   * Assign roles to team members
   */
  async assignTeamRoles(
    tenantId: string,
    projectId: string,
    assignments: { userId: string; role: string }[]
  ): Promise<Result<ProjectTeam>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(projectId, 'projectId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('assignTeamRoles', tenantId, async () => {
      const project = await this.projectRepo.findById(tenantId, projectId);
      if (!project) throw new NotFoundError('Project', projectId);

      for (const assignment of assignments) {
        // Update member role
        const member = project.team.members.find(m => m.userId === assignment.userId);
        if (member) {
          member.role = assignment.role;
        }

        // Update role assignment
        const role = project.team.roles.find(r => r.name === assignment.role);
        if (role) {
          role.assignedTo = assignment.userId;
        }
      }

      await this.projectRepo.update(tenantId, projectId, { team: project.team });

      return project.team;
    });
  }

  /**
   * Log a collaboration activity
   */
  async logActivity(
    tenantId: string,
    activity: Omit<CollaborationActivity, 'id' | 'timestamp'>
  ): Promise<Result<void>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(activity.projectId, 'projectId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('logActivity', tenantId, async () => {
      await this.collaborationRepo.logActivity({
        ...activity,
        id: this.generateId('activity'),
        timestamp: new Date()
      });

      // Update team member contributions
      const project = await this.projectRepo.findById(tenantId, activity.projectId);
      if (project) {
        const member = project.team.members.find(m => m.userId === activity.userId);
        if (member) {
          member.contributions++;
          member.lastActive = new Date();
          await this.projectRepo.update(tenantId, activity.projectId, { team: project.team });
        }
      }
    });
  }

  /**
   * Schedule a team meeting
   */
  async scheduleTeamMeeting(
    tenantId: string,
    projectId: string,
    meeting: Omit<TeamMeeting, 'id' | 'status'>
  ): Promise<Result<TeamMeeting>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(projectId, 'projectId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('scheduleTeamMeeting', tenantId, async () => {
      const teamMeeting: TeamMeeting = {
        ...meeting,
        id: this.generateId('meeting'),
        status: 'scheduled'
      };

      const saved = await this.collaborationRepo.saveMeeting(teamMeeting);

      await this.publishEvent('scholarly.pbl.meeting_scheduled', tenantId, {
        projectId,
        meetingId: saved.id,
        scheduledAt: saved.scheduledAt
      });

      return saved;
    });
  }

  // ==========================================================================
  // MILESTONE TRACKING
  // ==========================================================================

  /**
   * Submit evidence for a milestone
   */
  async submitMilestoneEvidence(
    tenantId: string,
    projectId: string,
    milestoneId: string,
    evidence: Omit<MilestoneEvidence, 'id' | 'submittedAt'>
  ): Promise<Result<ActiveMilestone>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(projectId, 'projectId');
      Validator.required(milestoneId, 'milestoneId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('submitMilestoneEvidence', tenantId, async () => {
      const project = await this.projectRepo.findById(tenantId, projectId);
      if (!project) throw new NotFoundError('Project', projectId);

      const milestone = project.milestones.find(m => m.id === milestoneId);
      if (!milestone) throw new NotFoundError('Milestone', milestoneId);

      const newEvidence: MilestoneEvidence = {
        ...evidence,
        id: this.generateId('evidence'),
        submittedAt: new Date()
      };

      milestone.evidence.push(newEvidence);
      milestone.status = 'submitted';
      milestone.submittedAt = new Date();

      await this.projectRepo.update(tenantId, projectId, { milestones: project.milestones });

      await this.publishEvent('scholarly.pbl.milestone_submitted', tenantId, {
        projectId,
        milestoneId,
        evidenceCount: milestone.evidence.length
      });

      return milestone;
    });
  }

  /**
   * Review and grade a milestone
   */
  async reviewMilestone(
    tenantId: string,
    projectId: string,
    milestoneId: string,
    review: {
      feedback: string;
      score?: number;
      status: 'reviewed' | 'completed';
    }
  ): Promise<Result<ActiveMilestone>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(projectId, 'projectId');
      Validator.required(milestoneId, 'milestoneId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('reviewMilestone', tenantId, async () => {
      const project = await this.projectRepo.findById(tenantId, projectId);
      if (!project) throw new NotFoundError('Project', projectId);

      const milestone = project.milestones.find(m => m.id === milestoneId);
      if (!milestone) throw new NotFoundError('Milestone', milestoneId);

      milestone.feedback = review.feedback;
      milestone.score = review.score;
      milestone.status = review.status;
      milestone.reviewedAt = new Date();

      // Update project metrics
      if (review.status === 'completed') {
        project.metrics.milestoneCompletion.completed++;
      }

      project.metrics = this.calculateProjectMetrics(project);
      await this.projectRepo.update(tenantId, projectId, project);

      await this.publishEvent('scholarly.pbl.milestone_reviewed', tenantId, {
        projectId,
        milestoneId,
        status: review.status,
        score: review.score
      });

      return milestone;
    });
  }

  /**
   * Get project timeline with milestones
   */
  async getProjectTimeline(
    tenantId: string,
    projectId: string
  ): Promise<Result<{
    phases: { phase: ActivePhase; milestones: ActiveMilestone[] }[];
    upcomingDeadlines: { type: string; name: string; dueDate: Date; daysUntil: number }[];
    completionProjection: Date;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(projectId, 'projectId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getProjectTimeline', tenantId, async () => {
      const project = await this.projectRepo.findById(tenantId, projectId);
      if (!project) throw new NotFoundError('Project', projectId);

      // Group milestones by phase
      const phases = project.phases.map(phase => ({
        phase,
        milestones: project.milestones.filter(m =>
          m.templateMilestoneId?.includes(phase.templatePhaseId || '')
        )
      }));

      // Get upcoming deadlines
      const now = new Date();
      const upcomingDeadlines = [
        ...project.milestones
          .filter(m => m.status !== 'completed' && m.dueDate > now)
          .map(m => ({
            type: 'milestone',
            name: m.name,
            dueDate: m.dueDate,
            daysUntil: Math.ceil((m.dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          })),
        ...project.deliverables
          .filter(d => d.status !== 'graded' && d.dueDate && d.dueDate > now)
          .map(d => ({
            type: 'deliverable',
            name: d.name,
            dueDate: d.dueDate!,
            daysUntil: Math.ceil((d.dueDate!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          }))
      ].sort((a, b) => a.daysUntil - b.daysUntil);

      // Project completion based on current pace
      const completionProjection = this.projectCompletionDate(project);

      return {
        phases,
        upcomingDeadlines,
        completionProjection
      };
    });
  }

  // ==========================================================================
  // PORTFOLIO INTEGRATION
  // ==========================================================================

  /**
   * Link project artifact to student portfolio
   */
  async linkToPortfolio(
    tenantId: string,
    projectId: string,
    userId: string,
    artifact: {
      title: string;
      description: string;
      type: 'project' | 'reflection' | 'deliverable';
      sourceId: string;
      url?: string;
    }
  ): Promise<Result<{ artifactId: string; portfolioId: string }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(projectId, 'projectId');
      Validator.required(userId, 'userId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('linkToPortfolio', tenantId, async () => {
      const project = await this.projectRepo.findById(tenantId, projectId);
      if (!project) throw new NotFoundError('Project', projectId);

      // Add artifact to portfolio
      const portfolioResult = await this.portfolioService.addArtifact(tenantId, userId, {
        title: artifact.title,
        description: artifact.description,
        type: 'project',
        content: {
          url: artifact.url,
          text: `From project: ${project.name}`
        },
        metadata: {
          subject: project.templateId ? 'Cross-curricular' : undefined,
          assignmentId: projectId
        },
        tags: ['project-based-learning', project.name.toLowerCase().replace(/\s+/g, '-')]
      });

      if (!portfolioResult.success) {
        throw new Error('Failed to add artifact to portfolio');
      }

      // Track portfolio link in project
      const artifactId = portfolioResult.data.id;
      if (!project.portfolioLinks.includes(artifactId)) {
        project.portfolioLinks.push(artifactId);
        await this.projectRepo.update(tenantId, projectId, { portfolioLinks: project.portfolioLinks });
      }

      return {
        artifactId,
        portfolioId: portfolioResult.data.portfolioId || ''
      };
    });
  }

  /**
   * Add reflection to project and optionally portfolio
   */
  async addReflection(
    tenantId: string,
    projectId: string,
    reflection: Omit<ProjectReflection, 'id' | 'submittedAt'>
  ): Promise<Result<ProjectReflection>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(projectId, 'projectId');
      Validator.required(reflection.userId, 'userId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('addReflection', tenantId, async () => {
      const project = await this.projectRepo.findById(tenantId, projectId);
      if (!project) throw new NotFoundError('Project', projectId);

      const newReflection: ProjectReflection = {
        ...reflection,
        id: this.generateId('reflection'),
        submittedAt: new Date()
      };

      project.reflections.push(newReflection);
      project.metrics.qualityIndicators.reflectionsCompleted++;
      await this.projectRepo.update(tenantId, projectId, project);

      // Link to portfolio if requested
      if (reflection.linkedToPortfolio) {
        await this.linkToPortfolio(tenantId, projectId, reflection.userId, {
          title: `Reflection: ${project.name}`,
          description: reflection.prompts.map(p => p.response).join('\n\n'),
          type: 'reflection',
          sourceId: newReflection.id
        });
      }

      return newReflection;
    });
  }

  /**
   * Generate AI-powered reflection prompts
   */
  async generateReflectionPrompts(
    tenantId: string,
    projectId: string,
    context: {
      phase?: string;
      milestone?: string;
      focusArea?: 'learning' | 'collaboration' | 'challenges' | 'growth';
    }
  ): Promise<Result<string[]>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(projectId, 'projectId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateReflectionPrompts', tenantId, async () => {
      const project = await this.projectRepo.findById(tenantId, projectId);
      if (!project) throw new NotFoundError('Project', projectId);

      const prompt = `Generate 5 thoughtful reflection prompts for a student working on a project-based learning experience.

Project: ${project.name}
Driving Question: ${project.drivingQuestion}
${context.phase ? `Current Phase: ${context.phase}` : ''}
${context.milestone ? `Recent Milestone: ${context.milestone}` : ''}
Focus Area: ${context.focusArea || 'general'}

Generate prompts that encourage:
- Deep thinking about learning
- Connection to real-world applications
- Recognition of growth and challenges
- Team collaboration insights
- Goal setting for next steps`;

      const aiResult = await this.aiService.complete(tenantId, {
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 1000
      });

      if (!aiResult.success) {
        return [
          'What was the most challenging part of this phase, and how did you work through it?',
          'How did your team collaborate effectively? What could be improved?',
          'What connections can you make between this project and the real world?',
          'What skills have you developed or strengthened through this project?',
          'What would you do differently if you were starting this phase again?'
        ];
      }

      const prompts = aiResult.data.content
        .split('\n')
        .filter(line => line.trim() && !line.startsWith('#'))
        .map(line => line.replace(/^\d+\.\s*/, '').trim())
        .filter(line => line.endsWith('?'))
        .slice(0, 5);

      return prompts.length > 0 ? prompts : [
        'What was the most challenging part of this phase, and how did you work through it?',
        'How did your team collaborate effectively? What could be improved?',
        'What connections can you make between this project and the real world?',
        'What skills have you developed or strengthened through this project?',
        'What would you do differently if you were starting this phase again?'
      ];
    });
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private getTemplateSchema(): object {
    return {
      type: 'object',
      properties: {
        description: { type: 'string' },
        drivingQuestion: { type: 'string' },
        learningObjectives: { type: 'array', items: { type: 'string' } },
        phases: { type: 'array', items: { type: 'object' } },
        milestones: { type: 'array', items: { type: 'object' } },
        deliverables: { type: 'array', items: { type: 'object' } },
        assessmentCriteria: { type: 'array', items: { type: 'object' } },
        resources: { type: 'array', items: { type: 'object' } },
        scaffolds: { type: 'array', items: { type: 'object' } },
        teacherGuidance: { type: 'object' },
        crossCurriculumPriorities: { type: 'array', items: { type: 'string' } },
        tags: { type: 'array', items: { type: 'string' } },
        difficulty: { type: 'string' }
      }
    };
  }

  private determineCategory(subjects: string[], theme: string): ProjectCategory {
    const themeLC = theme.toLowerCase();
    const subjectsLC = subjects.map(s => s.toLowerCase());

    if (subjectsLC.some(s => ['science', 'maths', 'mathematics', 'technology', 'engineering'].includes(s))) {
      return 'stem';
    }
    if (themeLC.includes('environment') || themeLC.includes('sustainability')) {
      return 'environmental';
    }
    if (themeLC.includes('community') || themeLC.includes('service')) {
      return 'community_service';
    }
    if (themeLC.includes('business') || themeLC.includes('entrepreneur')) {
      return 'entrepreneurship';
    }
    if (subjectsLC.some(s => ['art', 'music', 'drama', 'dance'].includes(s))) {
      return 'arts';
    }
    if (subjectsLC.some(s => ['history', 'geography', 'civics', 'economics'].includes(s))) {
      return 'humanities';
    }
    if (subjects.length > 1) {
      return 'cross_curricular';
    }

    return 'cross_curricular';
  }

  private calculateDueDate(startDate: Date, offset: string): Date {
    const match = offset.match(/(\d+)\s*(day|week|month)/i);
    if (!match) return new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);

    const amount = parseInt(match[1]);
    const unit = match[2].toLowerCase();

    const result = new Date(startDate);
    switch (unit) {
      case 'day':
        result.setDate(result.getDate() + amount);
        break;
      case 'week':
        result.setDate(result.getDate() + amount * 7);
        break;
      case 'month':
        result.setMonth(result.getMonth() + amount);
        break;
    }

    return result;
  }

  private calculateProjectMetrics(project: Project): ProjectMetrics {
    // Calculate phase progress
    const phaseProgress: Record<string, number> = {};
    let totalPhaseProgress = 0;

    for (const phase of project.phases) {
      let progress = 0;
      if (phase.status === 'completed') progress = 100;
      else if (phase.status === 'in_progress') progress = 50;
      phaseProgress[phase.id] = progress;
      totalPhaseProgress += progress;
    }

    // Calculate milestone completion
    const completedMilestones = project.milestones.filter(m => m.status === 'completed').length;

    // Calculate team engagement
    const totalContributions = project.team.members.reduce((sum, m) => sum + m.contributions, 0);
    const avgContributions = project.team.members.length > 0
      ? totalContributions / project.team.members.length
      : 0;

    // Calculate quality indicators
    const reflectionsCompleted = project.reflections.length;
    const feedbackResponses = project.feedback.filter(f => f.acknowledged).length;
    const draftIterations = project.deliverables.reduce((sum, d) => sum + d.versions.length, 0);

    return {
      overallProgress: project.phases.length > 0
        ? totalPhaseProgress / project.phases.length
        : 0,
      phaseProgress,
      milestoneCompletion: {
        completed: completedMilestones,
        total: project.milestones.length
      },
      teamEngagement: {
        averageContributions: avgContributions,
        collaborationScore: Math.min(100, avgContributions * 10),
        meetingsHeld: 0 // Would be fetched from collaboration repo
      },
      timeTracking: {
        estimatedHours: 0,
        loggedHours: 0,
        onTrack: true
      },
      qualityIndicators: {
        draftIterations,
        feedbackResponses,
        reflectionsCompleted
      }
    };
  }

  private formRandomTeams(studentIds: string[], teamSize: number): ProjectTeam[] {
    const shuffled = [...studentIds].sort(() => Math.random() - 0.5);
    const teams: ProjectTeam[] = [];

    for (let i = 0; i < shuffled.length; i += teamSize) {
      const memberIds = shuffled.slice(i, i + teamSize);
      teams.push({
        id: this.generateId('team'),
        name: `Team ${teams.length + 1}`,
        members: memberIds.map(id => ({
          userId: id,
          name: id,
          joinedAt: new Date(),
          contributions: 0,
          lastActive: new Date()
        })),
        roles: []
      });
    }

    return teams;
  }

  private async formBalancedTeams(
    _tenantId: string,
    studentIds: string[],
    teamSize: number,
    _balanceBy?: string[]
  ): Promise<ProjectTeam[]> {
    // In production, would fetch student data and balance by specified criteria
    // For now, use random as fallback
    return this.formRandomTeams(studentIds, teamSize);
  }

  private async formSkillBasedTeams(
    _tenantId: string,
    studentIds: string[],
    teamSize: number
  ): Promise<ProjectTeam[]> {
    // In production, would fetch student skills and form diverse teams
    // For now, use random as fallback
    return this.formRandomTeams(studentIds, teamSize);
  }

  private applyTeamConstraints(
    teams: ProjectTeam[],
    constraints: TeamFormationRequest['constraints']
  ): ProjectTeam[] {
    if (!constraints) return teams;

    // Apply mustInclude constraints
    if (constraints.mustInclude) {
      for (const group of constraints.mustInclude) {
        // Find team with first member, move others to same team
        for (const team of teams) {
          if (team.members.some(m => group.includes(m.userId))) {
            for (const userId of group) {
              const currentTeam = teams.find(t => t.members.some(m => m.userId === userId));
              if (currentTeam && currentTeam !== team) {
                const member = currentTeam.members.find(m => m.userId === userId);
                if (member) {
                  currentTeam.members = currentTeam.members.filter(m => m.userId !== userId);
                  team.members.push(member);
                }
              }
            }
            break;
          }
        }
      }
    }

    // Apply mustSeparate constraints
    if (constraints.mustSeparate) {
      for (const group of constraints.mustSeparate) {
        // Ensure no two members are in the same team
        for (let i = 1; i < group.length; i++) {
          const userId = group[i];
          const currentTeam = teams.find(t => t.members.some(m => m.userId === userId));
          const firstUserTeam = teams.find(t => t.members.some(m => m.userId === group[0]));

          if (currentTeam === firstUserTeam && currentTeam) {
            // Move to a different team
            const otherTeam = teams.find(t => t !== currentTeam && !group.some(gid => t.members.some(m => m.userId === gid)));
            if (otherTeam) {
              const member = currentTeam.members.find(m => m.userId === userId);
              if (member) {
                currentTeam.members = currentTeam.members.filter(m => m.userId !== userId);
                otherTeam.members.push(member);
              }
            }
          }
        }
      }
    }

    return teams;
  }

  private calculateTeamBalance(teams: ProjectTeam[]): Record<string, number> {
    const sizes = teams.map(t => t.members.length);
    const avgSize = sizes.reduce((a, b) => a + b, 0) / sizes.length;
    const variance = sizes.reduce((sum, size) => sum + Math.pow(size - avgSize, 2), 0) / sizes.length;

    return {
      teamCount: teams.length,
      averageSize: avgSize,
      sizeVariance: variance,
      balanceScore: Math.max(0, 100 - variance * 20)
    };
  }

  private projectCompletionDate(project: Project): Date {
    // Calculate based on current progress rate
    const elapsedDays = (Date.now() - project.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const progress = project.metrics.overallProgress;

    if (progress === 0) return project.endDate;

    const projectedTotalDays = elapsedDays / (progress / 100);
    const projectedCompletion = new Date(project.startDate.getTime() + projectedTotalDays * 24 * 60 * 60 * 1000);

    return projectedCompletion;
  }
}

// Type helper for AI response
interface GeneratedTemplate {
  description: string;
  drivingQuestion: string;
  learningObjectives: string[];
  phases: {
    name: string;
    description: string;
    duration: string;
    activities: {
      name: string;
      description: string;
      type: string;
      duration: string;
      individual?: boolean;
      resources?: string[];
      outputs?: string[];
    }[];
    checkpoints?: string[];
    teamRoles?: string[];
  }[];
  milestones: {
    name: string;
    description: string;
    phase: string;
    dueOffset: string;
    deliverables: string[];
    assessmentWeight?: number;
    checkInRequired?: boolean;
  }[];
  deliverables: {
    name: string;
    description: string;
    type: DeliverableType;
    format?: string[];
    requirements?: string[];
    rubricCriteria?: string[];
  }[];
  assessmentCriteria: {
    name: string;
    description: string;
    weight: number;
    levels: { level: string; description: string; points: number }[];
    evidenceTypes?: string[];
  }[];
  resources?: ProjectResource[];
  scaffolds?: ProjectScaffold[];
  teacherGuidance?: TeacherGuidance;
  crossCurriculumPriorities?: CrossCurriculumPriority[];
  tags?: string[];
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
}

// Singleton instance management
let projectBasedLearningInstance: ProjectBasedLearningService | null = null;

export function initializeProjectBasedLearningService(deps: {
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
  templateRepo: ProjectTemplateRepository;
  projectRepo: ProjectRepository;
  collaborationRepo: CollaborationRepository;
}): ProjectBasedLearningService {
  projectBasedLearningInstance = new ProjectBasedLearningService(deps);
  return projectBasedLearningInstance;
}

export function getProjectBasedLearningService(): ProjectBasedLearningService {
  if (!projectBasedLearningInstance) {
    throw new Error('ProjectBasedLearningService not initialized. Call initializeProjectBasedLearningService first.');
  }
  return projectBasedLearningInstance;
}
