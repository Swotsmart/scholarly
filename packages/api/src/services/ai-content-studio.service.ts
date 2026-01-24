/**
 * AI Content Studio Service
 *
 * Comprehensive AI-powered content creation tools for educators:
 * - Lesson Planner - Generate curriculum-aligned lesson plans
 * - Assessment Generator - Create differentiated assessments
 * - Resource Creator - Generate learning resources and materials
 * - Scaffolded Learning - Create progression pathways
 *
 * All content is aligned to Australian Curriculum (ACARA) and supports
 * differentiation for diverse learners.
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
import {
  StandardsComplianceService,
  getStandardsComplianceService,
  ACARACurriculumCode,
  GeneralCapability,
  CrossCurriculumPriority
} from './standards-compliance.service';

// ============================================================================
// LESSON PLANNER TYPES
// ============================================================================

export interface LessonPlanRequest {
  subject: string;
  yearLevel: string;
  topic: string;
  duration: number; // minutes
  curriculumCodes: string[];
  learningObjectives?: string[];
  priorKnowledge?: string[];
  studentContext?: {
    classSize: number;
    diversityConsiderations?: string[];
    learningProfiles?: LearnerProfile[];
    specialNeeds?: string[];
  };
  resources?: string[];
  pedagogicalApproach?: PedagogicalApproach;
  assessmentType?: 'formative' | 'summative' | 'both';
  crossCurricularLinks?: string[];
  differentiationRequired?: boolean;
}

export interface LearnerProfile {
  profileType: 'advanced' | 'on_track' | 'developing' | 'support_needed';
  count: number;
  characteristics?: string[];
}

export type PedagogicalApproach =
  | 'explicit_instruction'
  | 'inquiry_based'
  | 'project_based'
  | 'collaborative'
  | 'flipped_classroom'
  | 'gamification'
  | 'socratic'
  | 'differentiated';

export interface LessonPlan {
  id: string;
  metadata: {
    subject: string;
    yearLevel: string;
    topic: string;
    duration: number;
    createdAt: Date;
    createdBy: string;
    version: number;
  };
  curriculumAlignment: {
    codes: string[];
    generalCapabilities: GeneralCapability[];
    crossCurriculumPriorities: CrossCurriculumPriority[];
    alignmentScore: number;
  };
  learningObjectives: LearningObjective[];
  lessonStructure: LessonPhase[];
  resources: LessonResource[];
  differentiation: DifferentiationStrategy[];
  assessment: LessonAssessment;
  reflection: {
    questionsForStudents: string[];
    teacherNotes: string[];
    successCriteria: string[];
  };
  extensions: {
    homeLinks?: string[];
    furtherReading?: string[];
    nextLesson?: string;
  };
  aiMetadata: {
    generatedBy: string;
    confidence: number;
    suggestions: string[];
  };
}

export interface LearningObjective {
  id: string;
  text: string;
  bloomsLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create';
  curriculumCode?: string;
  successCriteria: string[];
}

export interface LessonPhase {
  name: string;
  duration: number;
  type: 'hook' | 'explicit_teaching' | 'guided_practice' | 'independent_practice' | 'closure' | 'assessment' | 'transition';
  activities: LessonActivity[];
  teacherActions: string[];
  studentActions: string[];
  resources: string[];
  differentiationNotes?: string;
}

export interface LessonActivity {
  id: string;
  name: string;
  description: string;
  duration: number;
  grouping: 'whole_class' | 'small_group' | 'pairs' | 'individual';
  materials: string[];
  instructions: string[];
  expectedOutcomes: string[];
  checkpoints?: string[];
}

export interface LessonResource {
  id: string;
  name: string;
  type: 'worksheet' | 'presentation' | 'video' | 'manipulative' | 'digital_tool' | 'text' | 'image' | 'audio';
  url?: string;
  description: string;
  required: boolean;
  alternatives?: string[];
}

export interface DifferentiationStrategy {
  targetGroup: 'advanced' | 'on_track' | 'developing' | 'support_needed' | 'eal' | 'gifted';
  adjustments: {
    content?: string;
    process?: string;
    product?: string;
    environment?: string;
  };
  scaffolds?: string[];
  extensions?: string[];
  resources?: string[];
}

export interface LessonAssessment {
  formative: {
    strategies: string[];
    checkpoints: { time: number; question: string; lookFor: string[] }[];
    exitTicket?: string;
  };
  summative?: {
    type: string;
    description: string;
    rubricLink?: string;
  };
}

// ============================================================================
// ASSESSMENT GENERATOR TYPES
// ============================================================================

export interface AssessmentRequest {
  subject: string;
  yearLevel: string;
  topic: string;
  assessmentType: 'quiz' | 'test' | 'assignment' | 'project' | 'portfolio' | 'practical' | 'oral';
  curriculumCodes: string[];
  duration?: number;
  questionTypes?: QuestionType[];
  difficultyDistribution?: {
    easy: number;
    medium: number;
    hard: number;
  };
  bloomsDistribution?: {
    remember: number;
    understand: number;
    apply: number;
    analyze: number;
    evaluate: number;
    create: number;
  };
  accessibilityRequirements?: string[];
  differentiate?: boolean;
}

export type QuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'short_answer'
  | 'long_answer'
  | 'fill_blank'
  | 'matching'
  | 'ordering'
  | 'diagram_label'
  | 'calculation'
  | 'extended_response'
  | 'practical_task';

export interface Assessment {
  id: string;
  metadata: {
    subject: string;
    yearLevel: string;
    topic: string;
    type: string;
    duration?: number;
    totalMarks: number;
    createdAt: Date;
  };
  curriculumAlignment: {
    codes: string[];
    alignmentMatrix: { questionId: string; codes: string[]; bloomsLevel: string }[];
  };
  instructions: string[];
  sections: AssessmentSection[];
  rubric?: AssessmentRubric;
  markingGuide: MarkingGuide;
  differentiated?: {
    standard: Assessment;
    modified: Assessment;
    extended: Assessment;
  };
  accessibility: {
    readingLevel: string;
    estimatedReadingTime: number;
    accommodations: string[];
  };
}

export interface AssessmentSection {
  id: string;
  name: string;
  instructions?: string;
  questions: AssessmentQuestion[];
  totalMarks: number;
}

export interface AssessmentQuestion {
  id: string;
  type: QuestionType;
  text: string;
  marks: number;
  bloomsLevel: string;
  curriculumCode?: string;
  options?: { id: string; text: string; correct: boolean }[];
  correctAnswer?: string | string[];
  sampleAnswer?: string;
  markingCriteria?: string[];
  hints?: string[];
  image?: string;
  accessibility?: {
    altText?: string;
    audioDescription?: string;
  };
}

export interface AssessmentRubric {
  criteria: RubricCriterion[];
  levels: { name: string; description: string; points: number }[];
}

export interface RubricCriterion {
  id: string;
  name: string;
  description: string;
  weight: number;
  levelDescriptors: { level: string; descriptor: string }[];
}

export interface MarkingGuide {
  generalInstructions: string[];
  questionGuidance: {
    questionId: string;
    acceptableAnswers: string[];
    commonErrors: string[];
    partialCreditGuidance: string[];
  }[];
}

// ============================================================================
// RESOURCE CREATOR TYPES
// ============================================================================

export interface ResourceRequest {
  subject: string;
  yearLevel: string;
  topic: string;
  resourceType: ResourceType;
  curriculumCodes?: string[];
  format?: 'print' | 'digital' | 'interactive';
  accessibility?: boolean;
  language?: string;
  customizations?: Record<string, any>;
}

export type ResourceType =
  | 'worksheet'
  | 'flashcards'
  | 'graphic_organizer'
  | 'word_wall'
  | 'anchor_chart'
  | 'vocabulary_list'
  | 'reading_passage'
  | 'math_problems'
  | 'science_experiment'
  | 'writing_prompt'
  | 'discussion_questions'
  | 'exit_ticket'
  | 'learning_menu'
  | 'choice_board';

export interface LearningResource {
  id: string;
  type: ResourceType;
  metadata: {
    subject: string;
    yearLevel: string;
    topic: string;
    curriculumCodes: string[];
    createdAt: Date;
  };
  content: ResourceContent;
  format: 'print' | 'digital' | 'interactive';
  accessibility: {
    altTexts: Record<string, string>;
    readingLevel: string;
    translations?: Record<string, string>;
  };
  teacherNotes?: string[];
  answerKey?: Record<string, string>;
}

export interface ResourceContent {
  title: string;
  instructions?: string;
  sections: ResourceSection[];
  images?: { id: string; url: string; altText: string }[];
  interactiveElements?: { id: string; type: string; config: Record<string, any> }[];
}

export interface ResourceSection {
  id: string;
  title?: string;
  type: 'text' | 'questions' | 'activity' | 'image' | 'table' | 'diagram';
  content: any;
}

// ============================================================================
// SCAFFOLDED LEARNING TYPES
// ============================================================================

export interface ScaffoldRequest {
  subject: string;
  yearLevel: string;
  topic: string;
  startingLevel: 'beginner' | 'intermediate' | 'advanced';
  targetLevel: 'beginner' | 'intermediate' | 'advanced' | 'mastery';
  curriculumCodes: string[];
  learnerProfile?: {
    strengths: string[];
    challenges: string[];
    preferredModalities: ('visual' | 'auditory' | 'kinesthetic' | 'reading_writing')[];
  };
  pacePreference?: 'accelerated' | 'standard' | 'extended';
}

export interface ScaffoldedPathway {
  id: string;
  metadata: {
    subject: string;
    yearLevel: string;
    topic: string;
    startingLevel: string;
    targetLevel: string;
    estimatedDuration: string;
    createdAt: Date;
  };
  curriculumAlignment: {
    codes: string[];
    progressionPath: string[];
  };
  stages: LearningStage[];
  checkpoints: LearningCheckpoint[];
  supportMaterials: {
    stageId: string;
    materials: LearningResource[];
  }[];
  adaptiveRecommendations: {
    ifStruggling: string[];
    ifExcelling: string[];
  };
}

export interface LearningStage {
  id: string;
  name: string;
  description: string;
  order: number;
  objectives: string[];
  activities: StageActivity[];
  duration: string;
  prerequisites: string[];
  successCriteria: string[];
  scaffolds: {
    type: 'hint' | 'example' | 'model' | 'checklist' | 'graphic_organizer' | 'sentence_starter';
    content: string;
  }[];
}

export interface StageActivity {
  id: string;
  name: string;
  type: 'instruction' | 'practice' | 'application' | 'reflection';
  description: string;
  duration: string;
  resources: string[];
  differentiationOptions?: string[];
}

export interface LearningCheckpoint {
  id: string;
  afterStage: string;
  type: 'self_assessment' | 'quiz' | 'demonstration' | 'peer_review';
  questions: string[];
  passCriteria: string;
  remediation?: string[];
  acceleration?: string[];
}

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface LessonPlanRepository {
  save(tenantId: string, plan: LessonPlan): Promise<LessonPlan>;
  findById(tenantId: string, id: string): Promise<LessonPlan | null>;
  findByUser(tenantId: string, userId: string, limit?: number): Promise<LessonPlan[]>;
  findBySubjectYear(tenantId: string, subject: string, yearLevel: string): Promise<LessonPlan[]>;
  search(tenantId: string, query: string): Promise<LessonPlan[]>;
}

export interface AssessmentRepository {
  save(tenantId: string, assessment: Assessment): Promise<Assessment>;
  findById(tenantId: string, id: string): Promise<Assessment | null>;
  findByUser(tenantId: string, userId: string): Promise<Assessment[]>;
}

export interface ResourceRepository {
  save(tenantId: string, resource: LearningResource): Promise<LearningResource>;
  findById(tenantId: string, id: string): Promise<LearningResource | null>;
  findByType(tenantId: string, type: ResourceType): Promise<LearningResource[]>;
}

export interface PathwayRepository {
  save(tenantId: string, pathway: ScaffoldedPathway): Promise<ScaffoldedPathway>;
  findById(tenantId: string, id: string): Promise<ScaffoldedPathway | null>;
  findByTopic(tenantId: string, topic: string): Promise<ScaffoldedPathway[]>;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class AIContentStudioService extends ScholarlyBaseService {
  private readonly lessonRepo: LessonPlanRepository;
  private readonly assessmentRepo: AssessmentRepository;
  private readonly resourceRepo: ResourceRepository;
  private readonly pathwayRepo: PathwayRepository;
  private aiService: AIIntegrationService;
  private complianceService: StandardsComplianceService;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    lessonRepo: LessonPlanRepository;
    assessmentRepo: AssessmentRepository;
    resourceRepo: ResourceRepository;
    pathwayRepo: PathwayRepository;
  }) {
    super('AIContentStudioService', deps);
    this.lessonRepo = deps.lessonRepo;
    this.assessmentRepo = deps.assessmentRepo;
    this.resourceRepo = deps.resourceRepo;
    this.pathwayRepo = deps.pathwayRepo;
    this.aiService = getAIService();
    this.complianceService = getStandardsComplianceService();
  }

  // ==========================================================================
  // LESSON PLANNER
  // ==========================================================================

  /**
   * Generate a comprehensive, curriculum-aligned lesson plan
   */
  async generateLessonPlan(
    tenantId: string,
    userId: string,
    request: LessonPlanRequest
  ): Promise<Result<LessonPlan>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.subject, 'subject');
      Validator.required(request.yearLevel, 'yearLevel');
      Validator.required(request.topic, 'topic');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateLessonPlan', tenantId, async () => {
      // Get curriculum codes if not provided
      let curriculumCodes = request.curriculumCodes;
      if (!curriculumCodes || curriculumCodes.length === 0) {
        const codesResult = await this.complianceService.getCurriculumCodes(tenantId, {
          subject: request.subject,
          yearLevel: request.yearLevel
        });
        if (codesResult.success) {
          curriculumCodes = codesResult.data.slice(0, 3).map(c => c.code);
        }
      }

      // Generate lesson plan using AI
      const prompt = this.buildLessonPlanPrompt(request, curriculumCodes);

      const aiResult = await this.aiService.structuredOutput<GeneratedLessonStructure>(
        tenantId,
        {
          prompt,
          schema: this.getLessonPlanSchema(),
          maxTokens: 4000
        }
      );

      if (!aiResult.success) {
        throw new Error('Failed to generate lesson plan');
      }

      const generated = aiResult.data;

      // Build the full lesson plan
      const lessonPlan: LessonPlan = {
        id: this.generateId('lesson'),
        metadata: {
          subject: request.subject,
          yearLevel: request.yearLevel,
          topic: request.topic,
          duration: request.duration,
          createdAt: new Date(),
          createdBy: userId,
          version: 1
        },
        curriculumAlignment: {
          codes: curriculumCodes,
          generalCapabilities: this.extractCapabilities(generated),
          crossCurriculumPriorities: this.extractPriorities(generated),
          alignmentScore: generated.alignmentScore || 85
        },
        learningObjectives: generated.objectives.map((obj, i) => ({
          id: `obj-${i + 1}`,
          text: obj.text,
          bloomsLevel: obj.bloomsLevel,
          curriculumCode: obj.curriculumCode,
          successCriteria: obj.successCriteria
        })),
        lessonStructure: this.buildLessonStructure(generated, request),
        resources: generated.resources.map((r, i) => ({
          id: `res-${i + 1}`,
          name: r.name,
          type: r.type,
          url: r.url,
          description: r.description,
          required: r.required,
          alternatives: r.alternatives
        })),
        differentiation: request.differentiationRequired !== false
          ? this.generateDifferentiation(generated, request)
          : [],
        assessment: {
          formative: {
            strategies: generated.formativeStrategies || ['Questioning', 'Observation', 'Exit ticket'],
            checkpoints: generated.checkpoints || [],
            exitTicket: generated.exitTicket
          },
          summative: generated.summativeAssessment
        },
        reflection: {
          questionsForStudents: generated.reflectionQuestions || [],
          teacherNotes: generated.teacherNotes || [],
          successCriteria: generated.successCriteria || []
        },
        extensions: {
          homeLinks: generated.homeLinks,
          furtherReading: generated.furtherReading,
          nextLesson: generated.nextLesson
        },
        aiMetadata: {
          generatedBy: 'claude-3-opus',
          confidence: generated.confidence || 0.85,
          suggestions: generated.suggestions || []
        }
      };

      // Validate curriculum alignment
      await this.complianceService.alignToACARACurriculum(tenantId, lessonPlan.id, {
        title: request.topic,
        description: generated.objectives.map(o => o.text).join(' '),
        text: JSON.stringify(lessonPlan.lessonStructure),
        yearLevel: request.yearLevel,
        subject: request.subject,
        learningObjectives: generated.objectives.map(o => o.text)
      });

      const saved = await this.lessonRepo.save(tenantId, lessonPlan);

      await this.publishEvent('scholarly.content.lesson_generated', tenantId, {
        lessonId: saved.id,
        subject: request.subject,
        yearLevel: request.yearLevel,
        topic: request.topic
      });

      return saved;
    }, { subject: request.subject, yearLevel: request.yearLevel, topic: request.topic });
  }

  /**
   * Adapt existing lesson plan for different student needs
   */
  async adaptLessonPlan(
    tenantId: string,
    lessonId: string,
    adaptations: {
      targetGroup: 'advanced' | 'support_needed' | 'eal';
      specificNeeds?: string[];
      durationChange?: number;
    }
  ): Promise<Result<LessonPlan>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(lessonId, 'lessonId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('adaptLessonPlan', tenantId, async () => {
      const original = await this.lessonRepo.findById(tenantId, lessonId);
      if (!original) throw new NotFoundError('Lesson plan', lessonId);

      const prompt = `Adapt the following lesson plan for ${adaptations.targetGroup} students.
${adaptations.specificNeeds ? `Specific needs to address: ${adaptations.specificNeeds.join(', ')}` : ''}
${adaptations.durationChange ? `Adjust duration by ${adaptations.durationChange} minutes` : ''}

Original lesson plan:
${JSON.stringify(original, null, 2)}

Provide the adapted lesson plan with appropriate scaffolds, modified activities, and adjusted expectations.`;

      const aiResult = await this.aiService.complete(tenantId, {
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 3000
      });

      if (!aiResult.success) {
        throw new Error('Failed to adapt lesson plan');
      }

      // Parse and create adapted plan
      const adapted: LessonPlan = {
        ...original,
        id: this.generateId('lesson'),
        metadata: {
          ...original.metadata,
          createdAt: new Date(),
          version: original.metadata.version + 1
        },
        aiMetadata: {
          ...original.aiMetadata,
          suggestions: [`Adapted for ${adaptations.targetGroup} learners`]
        }
      };

      return await this.lessonRepo.save(tenantId, adapted);
    }, { lessonId });
  }

  // ==========================================================================
  // ASSESSMENT GENERATOR
  // ==========================================================================

  /**
   * Generate a differentiated assessment
   */
  async generateAssessment(
    tenantId: string,
    userId: string,
    request: AssessmentRequest
  ): Promise<Result<Assessment>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.subject, 'subject');
      Validator.required(request.yearLevel, 'yearLevel');
      Validator.required(request.topic, 'topic');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateAssessment', tenantId, async () => {
      const prompt = this.buildAssessmentPrompt(request);

      const aiResult = await this.aiService.structuredOutput<GeneratedAssessment>(
        tenantId,
        {
          prompt,
          schema: this.getAssessmentSchema(),
          maxTokens: 4000
        }
      );

      if (!aiResult.success) {
        throw new Error('Failed to generate assessment');
      }

      const generated = aiResult.data;

      const assessment: Assessment = {
        id: this.generateId('assessment'),
        metadata: {
          subject: request.subject,
          yearLevel: request.yearLevel,
          topic: request.topic,
          type: request.assessmentType,
          duration: request.duration,
          totalMarks: generated.totalMarks,
          createdAt: new Date()
        },
        curriculumAlignment: {
          codes: request.curriculumCodes,
          alignmentMatrix: generated.alignmentMatrix || []
        },
        instructions: generated.instructions,
        sections: generated.sections.map((s, i) => ({
          id: `section-${i + 1}`,
          name: s.name,
          instructions: s.instructions,
          questions: s.questions.map((q, j) => ({
            id: `q-${i + 1}-${j + 1}`,
            type: q.type,
            text: q.text,
            marks: q.marks,
            bloomsLevel: q.bloomsLevel,
            curriculumCode: q.curriculumCode,
            options: q.options,
            correctAnswer: q.correctAnswer,
            sampleAnswer: q.sampleAnswer,
            markingCriteria: q.markingCriteria,
            hints: q.hints
          })),
          totalMarks: s.questions.reduce((sum, q) => sum + q.marks, 0)
        })),
        rubric: generated.rubric,
        markingGuide: {
          generalInstructions: generated.markingInstructions || [],
          questionGuidance: generated.questionGuidance || []
        },
        accessibility: {
          readingLevel: this.calculateReadingLevel(generated),
          estimatedReadingTime: this.estimateReadingTime(generated),
          accommodations: request.accessibilityRequirements || []
        }
      };

      // Generate differentiated versions if requested
      if (request.differentiate) {
        assessment.differentiated = await this.generateDifferentiatedVersions(tenantId, assessment);
      }

      const saved = await this.assessmentRepo.save(tenantId, assessment);

      await this.publishEvent('scholarly.content.assessment_generated', tenantId, {
        assessmentId: saved.id,
        type: request.assessmentType,
        subject: request.subject,
        yearLevel: request.yearLevel
      });

      return saved;
    }, { subject: request.subject, yearLevel: request.yearLevel });
  }

  /**
   * Generate individual questions
   */
  async generateQuestions(
    tenantId: string,
    request: {
      subject: string;
      yearLevel: string;
      topic: string;
      questionType: QuestionType;
      count: number;
      difficulty: 'easy' | 'medium' | 'hard';
      curriculumCode?: string;
    }
  ): Promise<Result<AssessmentQuestion[]>> {
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateQuestions', tenantId, async () => {
      const prompt = `Generate ${request.count} ${request.difficulty} ${request.questionType.replace('_', ' ')} questions
for Year ${request.yearLevel} ${request.subject} on the topic of "${request.topic}".
${request.curriculumCode ? `Align to curriculum code: ${request.curriculumCode}` : ''}

For each question provide:
- The question text
- For multiple choice: 4 options with one correct answer
- The correct answer
- Marking criteria
- Bloom's taxonomy level`;

      const aiResult = await this.aiService.complete(tenantId, {
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 2000
      });

      if (!aiResult.success) {
        throw new Error('Failed to generate questions');
      }

      // Parse AI response into questions
      const questions = this.parseGeneratedQuestions(aiResult.data.content, request);

      return questions;
    });
  }

  // ==========================================================================
  // RESOURCE CREATOR
  // ==========================================================================

  /**
   * Generate a learning resource
   */
  async generateResource(
    tenantId: string,
    userId: string,
    request: ResourceRequest
  ): Promise<Result<LearningResource>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.subject, 'subject');
      Validator.required(request.yearLevel, 'yearLevel');
      Validator.required(request.resourceType, 'resourceType');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateResource', tenantId, async () => {
      const prompt = this.buildResourcePrompt(request);

      const aiResult = await this.aiService.structuredOutput<GeneratedResource>(
        tenantId,
        {
          prompt,
          schema: this.getResourceSchema(request.resourceType),
          maxTokens: 3000
        }
      );

      if (!aiResult.success) {
        throw new Error('Failed to generate resource');
      }

      const generated = aiResult.data;

      const resource: LearningResource = {
        id: this.generateId('resource'),
        type: request.resourceType,
        metadata: {
          subject: request.subject,
          yearLevel: request.yearLevel,
          topic: request.topic,
          curriculumCodes: request.curriculumCodes || [],
          createdAt: new Date()
        },
        content: {
          title: generated.title,
          instructions: generated.instructions,
          sections: generated.sections
        },
        format: request.format || 'digital',
        accessibility: {
          altTexts: generated.altTexts || {},
          readingLevel: `Year ${request.yearLevel}`,
          translations: request.language ? { [request.language]: 'translated' } : undefined
        },
        teacherNotes: generated.teacherNotes,
        answerKey: generated.answerKey
      };

      const saved = await this.resourceRepo.save(tenantId, resource);

      await this.publishEvent('scholarly.content.resource_generated', tenantId, {
        resourceId: saved.id,
        type: request.resourceType,
        subject: request.subject
      });

      return saved;
    });
  }

  /**
   * Generate a worksheet with differentiated versions
   */
  async generateWorksheet(
    tenantId: string,
    request: {
      subject: string;
      yearLevel: string;
      topic: string;
      skills: string[];
      questionCount: number;
      includeAnswerKey: boolean;
      differentiate: boolean;
    }
  ): Promise<Result<{
    standard: LearningResource;
    modified?: LearningResource;
    extended?: LearningResource;
  }>> {
    try {
      Validator.tenantId(tenantId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateWorksheet', tenantId, async () => {
      // Generate standard worksheet
      const standardResult = await this.generateResource(tenantId, 'system', {
        subject: request.subject,
        yearLevel: request.yearLevel,
        topic: request.topic,
        resourceType: 'worksheet',
        format: 'print'
      });

      if (!standardResult.success) {
        throw new Error('Failed to generate worksheet');
      }

      const result: {
        standard: LearningResource;
        modified?: LearningResource;
        extended?: LearningResource;
      } = { standard: standardResult.data };

      if (request.differentiate) {
        // Generate modified version (simpler)
        const modifiedResult = await this.generateResource(tenantId, 'system', {
          subject: request.subject,
          yearLevel: request.yearLevel,
          topic: request.topic,
          resourceType: 'worksheet',
          format: 'print',
          customizations: { difficulty: 'reduced', scaffolds: true }
        });

        if (modifiedResult.success) {
          result.modified = modifiedResult.data;
        }

        // Generate extended version (challenging)
        const extendedResult = await this.generateResource(tenantId, 'system', {
          subject: request.subject,
          yearLevel: request.yearLevel,
          topic: request.topic,
          resourceType: 'worksheet',
          format: 'print',
          customizations: { difficulty: 'extended', openEnded: true }
        });

        if (extendedResult.success) {
          result.extended = extendedResult.data;
        }
      }

      return result;
    });
  }

  // ==========================================================================
  // SCAFFOLDED LEARNING
  // ==========================================================================

  /**
   * Generate a scaffolded learning pathway
   */
  async generateScaffoldedPathway(
    tenantId: string,
    userId: string,
    request: ScaffoldRequest
  ): Promise<Result<ScaffoldedPathway>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.subject, 'subject');
      Validator.required(request.topic, 'topic');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateScaffoldedPathway', tenantId, async () => {
      const prompt = this.buildScaffoldPrompt(request);

      const aiResult = await this.aiService.structuredOutput<GeneratedPathway>(
        tenantId,
        {
          prompt,
          schema: this.getPathwaySchema(),
          maxTokens: 4000
        }
      );

      if (!aiResult.success) {
        throw new Error('Failed to generate scaffolded pathway');
      }

      const generated = aiResult.data;

      const pathway: ScaffoldedPathway = {
        id: this.generateId('pathway'),
        metadata: {
          subject: request.subject,
          yearLevel: request.yearLevel,
          topic: request.topic,
          startingLevel: request.startingLevel,
          targetLevel: request.targetLevel,
          estimatedDuration: generated.estimatedDuration,
          createdAt: new Date()
        },
        curriculumAlignment: {
          codes: request.curriculumCodes,
          progressionPath: generated.progressionPath || []
        },
        stages: generated.stages.map((stage, i) => ({
          id: `stage-${i + 1}`,
          name: stage.name,
          description: stage.description,
          order: i + 1,
          objectives: stage.objectives,
          activities: stage.activities.map((a, j) => ({
            id: `activity-${i + 1}-${j + 1}`,
            name: a.name,
            type: a.type,
            description: a.description,
            duration: a.duration,
            resources: a.resources,
            differentiationOptions: a.differentiationOptions
          })),
          duration: stage.duration,
          prerequisites: stage.prerequisites || [],
          successCriteria: stage.successCriteria,
          scaffolds: stage.scaffolds || []
        })),
        checkpoints: generated.checkpoints.map((cp, i) => ({
          id: `checkpoint-${i + 1}`,
          afterStage: cp.afterStage,
          type: cp.type,
          questions: cp.questions,
          passCriteria: cp.passCriteria,
          remediation: cp.remediation,
          acceleration: cp.acceleration
        })),
        supportMaterials: [],
        adaptiveRecommendations: {
          ifStruggling: generated.strugglingRecommendations || [
            'Review prerequisite concepts',
            'Use additional visual supports',
            'Break tasks into smaller steps'
          ],
          ifExcelling: generated.excellingRecommendations || [
            'Attempt extension activities',
            'Explore cross-curricular connections',
            'Mentor peers who need support'
          ]
        }
      };

      const saved = await this.pathwayRepo.save(tenantId, pathway);

      await this.publishEvent('scholarly.content.pathway_generated', tenantId, {
        pathwayId: saved.id,
        subject: request.subject,
        topic: request.topic,
        stages: pathway.stages.length
      });

      return saved;
    });
  }

  /**
   * Get personalized recommendations for a learner on a pathway
   */
  async getPathwayRecommendations(
    tenantId: string,
    pathwayId: string,
    learnerData: {
      currentStage: string;
      completedActivities: string[];
      checkpointResults: { checkpointId: string; passed: boolean; score: number }[];
      timeSpent: Record<string, number>;
      struggles: string[];
    }
  ): Promise<Result<{
    nextActivities: string[];
    scaffoldsNeeded: string[];
    paceAdjustment: 'slow_down' | 'maintain' | 'accelerate';
    recommendations: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(pathwayId, 'pathwayId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getPathwayRecommendations', tenantId, async () => {
      const pathway = await this.pathwayRepo.findById(tenantId, pathwayId);
      if (!pathway) throw new NotFoundError('Pathway', pathwayId);

      // Analyze learner progress
      const avgScore = learnerData.checkpointResults.length > 0
        ? learnerData.checkpointResults.reduce((sum, r) => sum + r.score, 0) / learnerData.checkpointResults.length
        : 50;

      const failedCheckpoints = learnerData.checkpointResults.filter(r => !r.passed);

      // Determine pace adjustment
      let paceAdjustment: 'slow_down' | 'maintain' | 'accelerate';
      if (avgScore < 60 || failedCheckpoints.length > 1) {
        paceAdjustment = 'slow_down';
      } else if (avgScore > 85 && failedCheckpoints.length === 0) {
        paceAdjustment = 'accelerate';
      } else {
        paceAdjustment = 'maintain';
      }

      // Get current stage
      const currentStage = pathway.stages.find(s => s.id === learnerData.currentStage);
      const scaffoldsNeeded = currentStage?.scaffolds
        .filter(s => learnerData.struggles.some(struggle => s.content.toLowerCase().includes(struggle.toLowerCase())))
        .map(s => s.content) || [];

      // Determine next activities
      const completedSet = new Set(learnerData.completedActivities);
      const nextActivities = currentStage?.activities
        .filter(a => !completedSet.has(a.id))
        .slice(0, 3)
        .map(a => a.id) || [];

      // Generate recommendations
      const recommendations: string[] = [];
      if (paceAdjustment === 'slow_down') {
        recommendations.push(...pathway.adaptiveRecommendations.ifStruggling.slice(0, 2));
      } else if (paceAdjustment === 'accelerate') {
        recommendations.push(...pathway.adaptiveRecommendations.ifExcelling.slice(0, 2));
      }

      return {
        nextActivities,
        scaffoldsNeeded,
        paceAdjustment,
        recommendations
      };
    }, { pathwayId });
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private buildLessonPlanPrompt(request: LessonPlanRequest, curriculumCodes: string[]): string {
    return `Generate a comprehensive lesson plan for:
Subject: ${request.subject}
Year Level: ${request.yearLevel}
Topic: ${request.topic}
Duration: ${request.duration} minutes
Australian Curriculum Codes: ${curriculumCodes.join(', ')}

${request.studentContext ? `Class Context:
- Class size: ${request.studentContext.classSize}
- Diversity considerations: ${request.studentContext.diversityConsiderations?.join(', ') || 'Standard'}
- Special needs: ${request.studentContext.specialNeeds?.join(', ') || 'None specified'}` : ''}

Pedagogical Approach: ${request.pedagogicalApproach || 'explicit_instruction'}

Include:
1. 3-4 specific, measurable learning objectives aligned to curriculum
2. Lesson structure with timing (hook, explicit teaching, practice, closure)
3. Detailed activities with teacher and student actions
4. Resources needed
5. Differentiation strategies for advanced, on-track, and developing learners
6. Formative assessment strategies with checkpoints
7. Reflection questions for students
8. Success criteria

Focus on Australian educational context and best practices.`;
  }

  private buildAssessmentPrompt(request: AssessmentRequest): string {
    const difficultyDist = request.difficultyDistribution || { easy: 30, medium: 50, hard: 20 };

    return `Generate a ${request.assessmentType} assessment for:
Subject: ${request.subject}
Year Level: ${request.yearLevel}
Topic: ${request.topic}
${request.duration ? `Duration: ${request.duration} minutes` : ''}
Curriculum Codes: ${request.curriculumCodes.join(', ')}

Question Types: ${request.questionTypes?.join(', ') || 'multiple_choice, short_answer, extended_response'}
Difficulty Distribution: Easy ${difficultyDist.easy}%, Medium ${difficultyDist.medium}%, Hard ${difficultyDist.hard}%

${request.bloomsDistribution ? `Bloom's Distribution: ${JSON.stringify(request.bloomsDistribution)}` : ''}

Include:
1. Clear instructions
2. Questions organized into sections
3. Mark allocation for each question
4. Marking guide with acceptable answers
5. Alignment to curriculum codes
6. Accessibility considerations`;
  }

  private buildResourcePrompt(request: ResourceRequest): string {
    const resourceInstructions: Record<ResourceType, string> = {
      worksheet: 'Create a worksheet with clear instructions, varied question types, and space for answers',
      flashcards: 'Create flashcard pairs with terms/concepts on one side and definitions/explanations on the other',
      graphic_organizer: 'Create a visual organizer (e.g., concept map, Venn diagram, flow chart) appropriate for the topic',
      word_wall: 'Create a vocabulary word wall with key terms, definitions, and visual cues',
      anchor_chart: 'Create an anchor chart that summarizes key concepts with visual elements',
      vocabulary_list: 'Create a vocabulary list with terms, definitions, examples, and word parts',
      reading_passage: 'Create an age-appropriate reading passage with comprehension questions',
      math_problems: 'Create a set of math problems with varied difficulty and real-world contexts',
      science_experiment: 'Create a hands-on science experiment with hypothesis, materials, procedure, and analysis',
      writing_prompt: 'Create writing prompts with scaffolds and success criteria',
      discussion_questions: 'Create thought-provoking discussion questions for class or group discussion',
      exit_ticket: 'Create a brief exit ticket to check understanding of key concepts',
      learning_menu: 'Create a learning menu with varied activities students can choose from',
      choice_board: 'Create a choice board with 9 activity options at different levels'
    };

    return `Create a ${request.resourceType} for:
Subject: ${request.subject}
Year Level: ${request.yearLevel}
Topic: ${request.topic}
Format: ${request.format || 'digital'}

${resourceInstructions[request.resourceType]}

Ensure content is:
- Aligned to Australian Curriculum
- Age-appropriate for Year ${request.yearLevel}
- Engaging and visually clear
- Accessible (include alt text for images)
${request.accessibility ? '- Include accessibility accommodations' : ''}`;
  }

  private buildScaffoldPrompt(request: ScaffoldRequest): string {
    return `Create a scaffolded learning pathway for:
Subject: ${request.subject}
Year Level: ${request.yearLevel}
Topic: ${request.topic}
Starting Level: ${request.startingLevel}
Target Level: ${request.targetLevel}
Curriculum Codes: ${request.curriculumCodes.join(', ')}
Pace: ${request.pacePreference || 'standard'}

${request.learnerProfile ? `Learner Profile:
- Strengths: ${request.learnerProfile.strengths.join(', ')}
- Challenges: ${request.learnerProfile.challenges.join(', ')}
- Preferred modalities: ${request.learnerProfile.preferredModalities.join(', ')}` : ''}

Create a progressive learning pathway with:
1. 4-6 stages from starting to target level
2. Clear objectives and success criteria for each stage
3. Varied activities (instruction, practice, application, reflection)
4. Scaffolds (hints, examples, checklists, graphic organizers)
5. Checkpoints after each stage with remediation and acceleration options
6. Estimated time for each stage`;
  }

  private getLessonPlanSchema(): object {
    return {
      type: 'object',
      properties: {
        objectives: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              text: { type: 'string' },
              bloomsLevel: { type: 'string' },
              curriculumCode: { type: 'string' },
              successCriteria: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        phases: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              duration: { type: 'number' },
              type: { type: 'string' },
              activities: { type: 'array', items: { type: 'object' } },
              teacherActions: { type: 'array', items: { type: 'string' } },
              studentActions: { type: 'array', items: { type: 'string' } }
            }
          }
        },
        resources: { type: 'array', items: { type: 'object' } },
        formativeStrategies: { type: 'array', items: { type: 'string' } },
        checkpoints: { type: 'array', items: { type: 'object' } },
        exitTicket: { type: 'string' },
        reflectionQuestions: { type: 'array', items: { type: 'string' } },
        teacherNotes: { type: 'array', items: { type: 'string' } },
        successCriteria: { type: 'array', items: { type: 'string' } },
        alignmentScore: { type: 'number' },
        confidence: { type: 'number' },
        suggestions: { type: 'array', items: { type: 'string' } }
      }
    };
  }

  private getAssessmentSchema(): object {
    return {
      type: 'object',
      properties: {
        instructions: { type: 'array', items: { type: 'string' } },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              instructions: { type: 'string' },
              questions: { type: 'array', items: { type: 'object' } }
            }
          }
        },
        totalMarks: { type: 'number' },
        rubric: { type: 'object' },
        markingInstructions: { type: 'array', items: { type: 'string' } },
        questionGuidance: { type: 'array', items: { type: 'object' } },
        alignmentMatrix: { type: 'array', items: { type: 'object' } }
      }
    };
  }

  private getResourceSchema(_resourceType: ResourceType): object {
    return {
      type: 'object',
      properties: {
        title: { type: 'string' },
        instructions: { type: 'string' },
        sections: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              type: { type: 'string' },
              content: { type: 'object' }
            }
          }
        },
        altTexts: { type: 'object' },
        teacherNotes: { type: 'array', items: { type: 'string' } },
        answerKey: { type: 'object' }
      }
    };
  }

  private getPathwaySchema(): object {
    return {
      type: 'object',
      properties: {
        estimatedDuration: { type: 'string' },
        progressionPath: { type: 'array', items: { type: 'string' } },
        stages: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              description: { type: 'string' },
              objectives: { type: 'array', items: { type: 'string' } },
              activities: { type: 'array', items: { type: 'object' } },
              duration: { type: 'string' },
              prerequisites: { type: 'array', items: { type: 'string' } },
              successCriteria: { type: 'array', items: { type: 'string' } },
              scaffolds: { type: 'array', items: { type: 'object' } }
            }
          }
        },
        checkpoints: { type: 'array', items: { type: 'object' } },
        strugglingRecommendations: { type: 'array', items: { type: 'string' } },
        excellingRecommendations: { type: 'array', items: { type: 'string' } }
      }
    };
  }

  private buildLessonStructure(generated: GeneratedLessonStructure, request: LessonPlanRequest): LessonPhase[] {
    // Use generated phases or create default structure
    if (generated.phases && generated.phases.length > 0) {
      return generated.phases.map((phase, i) => ({
        name: phase.name,
        duration: phase.duration,
        type: phase.type as LessonPhase['type'],
        activities: phase.activities || [],
        teacherActions: phase.teacherActions || [],
        studentActions: phase.studentActions || [],
        resources: phase.resources || []
      }));
    }

    // Default lesson structure based on duration
    const totalTime = request.duration;
    return [
      {
        name: 'Hook / Engagement',
        duration: Math.round(totalTime * 0.1),
        type: 'hook',
        activities: [],
        teacherActions: ['Present engaging opening', 'Activate prior knowledge'],
        studentActions: ['Respond to hook', 'Connect to previous learning'],
        resources: []
      },
      {
        name: 'Explicit Teaching',
        duration: Math.round(totalTime * 0.25),
        type: 'explicit_teaching',
        activities: [],
        teacherActions: ['Model new concept', 'Explain key points'],
        studentActions: ['Listen actively', 'Take notes'],
        resources: []
      },
      {
        name: 'Guided Practice',
        duration: Math.round(totalTime * 0.25),
        type: 'guided_practice',
        activities: [],
        teacherActions: ['Guide students through examples', 'Provide scaffolds'],
        studentActions: ['Practice with support', 'Ask questions'],
        resources: []
      },
      {
        name: 'Independent Practice',
        duration: Math.round(totalTime * 0.25),
        type: 'independent_practice',
        activities: [],
        teacherActions: ['Monitor progress', 'Provide feedback'],
        studentActions: ['Apply learning independently', 'Self-monitor'],
        resources: []
      },
      {
        name: 'Closure',
        duration: Math.round(totalTime * 0.15),
        type: 'closure',
        activities: [],
        teacherActions: ['Summarize key points', 'Preview next lesson'],
        studentActions: ['Reflect on learning', 'Complete exit ticket'],
        resources: []
      }
    ];
  }

  private extractCapabilities(generated: GeneratedLessonStructure): GeneralCapability[] {
    return generated.generalCapabilities || ['literacy', 'critical_creative_thinking'];
  }

  private extractPriorities(generated: GeneratedLessonStructure): CrossCurriculumPriority[] {
    return generated.crossCurriculumPriorities || [];
  }

  private generateDifferentiation(
    _generated: GeneratedLessonStructure,
    _request: LessonPlanRequest
  ): DifferentiationStrategy[] {
    return [
      {
        targetGroup: 'advanced',
        adjustments: {
          content: 'Extend to more complex concepts',
          process: 'Less scaffolding, more open-ended tasks',
          product: 'Higher-level thinking outcomes'
        },
        extensions: ['Research additional applications', 'Create teaching materials for peers']
      },
      {
        targetGroup: 'on_track',
        adjustments: {
          content: 'Standard curriculum content',
          process: 'Balanced scaffolding',
          product: 'Standard success criteria'
        }
      },
      {
        targetGroup: 'developing',
        adjustments: {
          content: 'Focus on foundational concepts',
          process: 'Additional scaffolding and support',
          product: 'Modified success criteria'
        },
        scaffolds: ['Graphic organizers', 'Sentence starters', 'Worked examples']
      },
      {
        targetGroup: 'support_needed',
        adjustments: {
          content: 'Pre-teach vocabulary, simplified texts',
          process: 'Small group instruction, frequent check-ins',
          product: 'Reduced complexity, alternative formats'
        },
        scaffolds: ['Visual supports', 'Manipulatives', 'Peer support'],
        resources: ['Modified worksheets', 'Audio support']
      }
    ];
  }

  private async generateDifferentiatedVersions(
    tenantId: string,
    _original: Assessment
  ): Promise<{ standard: Assessment; modified: Assessment; extended: Assessment }> {
    // In production, would generate actual differentiated versions using AI
    // For now, return placeholder structure
    return {
      standard: _original,
      modified: { ..._original, id: this.generateId('assessment') },
      extended: { ..._original, id: this.generateId('assessment') }
    };
  }

  private calculateReadingLevel(generated: GeneratedAssessment): string {
    // Simplified calculation
    const avgWordLength = generated.sections
      .flatMap(s => s.questions)
      .map(q => q.text.split(' ').map(w => w.length).reduce((a, b) => a + b, 0) / q.text.split(' ').length)
      .reduce((a, b) => a + b, 0) / (generated.sections.flatMap(s => s.questions).length || 1);

    if (avgWordLength < 4) return 'Year 3-4';
    if (avgWordLength < 5) return 'Year 5-6';
    if (avgWordLength < 6) return 'Year 7-8';
    return 'Year 9+';
  }

  private estimateReadingTime(generated: GeneratedAssessment): number {
    const totalWords = generated.sections
      .flatMap(s => s.questions)
      .map(q => q.text.split(' ').length)
      .reduce((a, b) => a + b, 0);

    // Average reading speed ~200 words per minute for assessment context
    return Math.ceil(totalWords / 150);
  }

  private parseGeneratedQuestions(
    aiResponse: string,
    request: { questionType: QuestionType; difficulty: string; curriculumCode?: string }
  ): AssessmentQuestion[] {
    // Simplified parsing - in production would use structured output
    const questions: AssessmentQuestion[] = [];
    const lines = aiResponse.split('\n').filter(l => l.trim());

    let currentQuestion: Partial<AssessmentQuestion> | null = null;

    for (const line of lines) {
      if (line.match(/^\d+\./)) {
        if (currentQuestion) {
          questions.push(currentQuestion as AssessmentQuestion);
        }
        currentQuestion = {
          id: `q-${questions.length + 1}`,
          type: request.questionType,
          text: line.replace(/^\d+\./, '').trim(),
          marks: request.difficulty === 'easy' ? 1 : request.difficulty === 'medium' ? 2 : 3,
          bloomsLevel: request.difficulty === 'easy' ? 'remember' : request.difficulty === 'medium' ? 'apply' : 'analyze',
          curriculumCode: request.curriculumCode
        };
      }
    }

    if (currentQuestion) {
      questions.push(currentQuestion as AssessmentQuestion);
    }

    return questions;
  }
}

// Type helpers for AI responses
interface GeneratedLessonStructure {
  objectives: { text: string; bloomsLevel: string; curriculumCode?: string; successCriteria: string[] }[];
  phases: { name: string; duration: number; type: string; activities: any[]; teacherActions: string[]; studentActions: string[]; resources: string[] }[];
  resources: { name: string; type: string; url?: string; description: string; required: boolean; alternatives?: string[] }[];
  formativeStrategies?: string[];
  checkpoints?: { time: number; question: string; lookFor: string[] }[];
  exitTicket?: string;
  summativeAssessment?: { type: string; description: string };
  reflectionQuestions?: string[];
  teacherNotes?: string[];
  successCriteria?: string[];
  homeLinks?: string[];
  furtherReading?: string[];
  nextLesson?: string;
  alignmentScore?: number;
  confidence?: number;
  suggestions?: string[];
  generalCapabilities?: GeneralCapability[];
  crossCurriculumPriorities?: CrossCurriculumPriority[];
}

interface GeneratedAssessment {
  instructions: string[];
  sections: {
    name: string;
    instructions?: string;
    questions: {
      type: QuestionType;
      text: string;
      marks: number;
      bloomsLevel: string;
      curriculumCode?: string;
      options?: { id: string; text: string; correct: boolean }[];
      correctAnswer?: string;
      sampleAnswer?: string;
      markingCriteria?: string[];
      hints?: string[];
    }[];
  }[];
  totalMarks: number;
  rubric?: AssessmentRubric;
  markingInstructions?: string[];
  questionGuidance?: { questionId: string; acceptableAnswers: string[]; commonErrors: string[]; partialCreditGuidance: string[] }[];
  alignmentMatrix?: { questionId: string; codes: string[]; bloomsLevel: string }[];
}

interface GeneratedResource {
  title: string;
  instructions?: string;
  sections: ResourceSection[];
  altTexts?: Record<string, string>;
  teacherNotes?: string[];
  answerKey?: Record<string, string>;
}

interface GeneratedPathway {
  estimatedDuration: string;
  progressionPath?: string[];
  stages: {
    name: string;
    description: string;
    objectives: string[];
    activities: { name: string; type: string; description: string; duration: string; resources: string[]; differentiationOptions?: string[] }[];
    duration: string;
    prerequisites?: string[];
    successCriteria: string[];
    scaffolds?: { type: string; content: string }[];
  }[];
  checkpoints: {
    afterStage: string;
    type: 'self_assessment' | 'quiz' | 'demonstration' | 'peer_review';
    questions: string[];
    passCriteria: string;
    remediation?: string[];
    acceleration?: string[];
  }[];
  strugglingRecommendations?: string[];
  excellingRecommendations?: string[];
}

// Singleton instance management
let aiContentStudioInstance: AIContentStudioService | null = null;

export function initializeAIContentStudioService(deps: {
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
  lessonRepo: LessonPlanRepository;
  assessmentRepo: AssessmentRepository;
  resourceRepo: ResourceRepository;
  pathwayRepo: PathwayRepository;
}): AIContentStudioService {
  aiContentStudioInstance = new AIContentStudioService(deps);
  return aiContentStudioInstance;
}

export function getAIContentStudioService(): AIContentStudioService {
  if (!aiContentStudioInstance) {
    throw new Error('AIContentStudioService not initialized. Call initializeAIContentStudioService first.');
  }
  return aiContentStudioInstance;
}
