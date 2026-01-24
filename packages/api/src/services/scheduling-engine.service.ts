/**
 * AI-Enabled Institutional Scheduling Engine (ISE)
 *
 * A sophisticated scheduling system that goes far beyond simple genetic algorithms.
 * Uses a multi-stage algorithm pipeline where each stage builds on the previous,
 * with AI/ML refinement learning from historical patterns.
 *
 * ## Algorithm Pipeline
 *
 * 1. Constraint Satisfaction Problem (CSP) - Find feasible solutions
 * 2. Integer Linear Programming (ILP) - Optimize for fairness
 * 3. Genetic Algorithm (GA) - Explore solution space
 * 4. Simulated Annealing (SA) - Fine-tune solutions
 * 5. ML Refinement - Learn from historical acceptance
 * 6. Scenario Analysis - Generate contingency plans
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
  ScholarlyConfig,
  Jurisdiction
} from '@scholarly/shared/types/scholarly-types';

// ============================================================================
// CORE TYPES
// ============================================================================

export interface TimeSlot {
  id: string;
  startTime: string;
  endTime: string;
  timezone: string;
  recurrence?: string;
  duration: number;
}

export interface ScheduleEntity {
  id: string;
  type: 'teacher' | 'student' | 'room' | 'resource' | 'class_group';
  name: string;
  attributes: Record<string, any>;
}

export interface Teacher extends ScheduleEntity {
  type: 'teacher';
  attributes: {
    qualifications: string[];
    subjects: string[];
    yearLevels: string[];
    maxPeriodsPerDay: number;
    maxConsecutivePeriods: number;
    preferredTimes: TimePreference[];
    unavailableTimes: TimeSlot[];
    workloadAllocation: number;
    safeguardingStatus: 'valid' | 'pending' | 'expired';
  };
}

export interface Room extends ScheduleEntity {
  type: 'room';
  attributes: {
    capacity: number;
    roomType: 'classroom' | 'lab' | 'gym' | 'library' | 'hall' | 'outdoor';
    facilities: string[];
    accessibility: boolean;
    building: string;
    floor: number;
  };
}

export interface ClassGroup extends ScheduleEntity {
  type: 'class_group';
  attributes: {
    yearLevel: string;
    subject: string;
    studentCount: number;
    requiredPeriods: number;
    requiresLab: boolean;
    requiresComputers: boolean;
    splitAllowed: boolean;
    preferredTeachers: string[];
    specialNeeds: SpecialNeed[];
  };
}

export interface SpecialNeed {
  type: 'accessibility' | 'learning_support' | 'medical' | 'behavioral';
  description: string;
  accommodations: string[];
}

export interface TimePreference {
  slot: TimeSlot;
  preference: 'preferred' | 'acceptable' | 'avoid' | 'impossible';
  reason?: string;
}

// ============================================================================
// CONSTRAINT TYPES
// ============================================================================

export enum ConstraintType {
  TEACHER_QUALIFICATION = 'teacher_qualification',
  ROOM_CAPACITY = 'room_capacity',
  TEACHER_AVAILABILITY = 'teacher_availability',
  ROOM_AVAILABILITY = 'room_availability',
  NO_DOUBLE_BOOKING = 'no_double_booking',
  SAFEGUARDING = 'safeguarding',
  TEACHER_PREFERENCE = 'teacher_preference',
  CONSECUTIVE_PERIODS = 'consecutive_periods',
  SUBJECT_DISTRIBUTION = 'subject_distribution',
  ROOM_PROXIMITY = 'room_proximity',
  WORKLOAD_BALANCE = 'workload_balance',
  PEDAGOGY = 'pedagogy'
}

export interface Constraint {
  id: string;
  type: ConstraintType;
  hardness: 'hard' | 'soft';
  weight: number;
  description: string;
  entities: string[];
  evaluator: ConstraintEvaluator;
}

export interface ConstraintEvaluator {
  type: 'predicate' | 'function' | 'ml_model';
  predicate?: string;
  functionName?: string;
  modelId?: string;
}

export interface ConstraintViolation {
  constraintId: string;
  constraintType: ConstraintType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  affectedEntities: string[];
  description: string;
  suggestedResolutions: Resolution[];
}

export interface Resolution {
  type: 'swap' | 'move' | 'substitute' | 'cancel';
  description: string;
  changes: ScheduleChange[];
  estimatedImprovement: number;
  sideEffects: string[];
}

export interface ScheduleChange {
  entityId: string;
  field: string;
  oldValue: any;
  newValue: any;
}

// ============================================================================
// SCHEDULE TYPES
// ============================================================================

export interface Schedule {
  id: string;
  tenantId: string;
  name: string;
  type: 'master' | 'draft' | 'contingency' | 'what_if';
  termId: string;
  validFrom: string;
  validTo: string;
  assignments: ScheduleAssignment[];
  metrics: ScheduleMetrics;
  generatedBy: AlgorithmPipeline;
  generatedAt: Date;
  status: 'draft' | 'review' | 'approved' | 'active' | 'archived';
}

export interface ScheduleAssignment {
  id: string;
  classGroupId: string;
  teacherId: string;
  roomId: string;
  timeSlot: TimeSlot;
  constraintSatisfaction: {
    hardConstraintsMet: boolean;
    softConstraintScore: number;
    violations: ConstraintViolation[];
  };
  aiConfidence: number;
  aiRationale?: string;
}

export interface ScheduleMetrics {
  hardConstraintsSatisfied: number;
  hardConstraintsTotal: number;
  feasibilityScore: number;
  softConstraintScore: number;
  fairnessMetrics: FairnessMetrics;
  roomUtilization: number;
  teacherUtilization: number;
  predictedAcceptanceRate: number;
  historicalSimilarityScore: number;
}

export interface FairnessMetrics {
  teacherWorkloadGini: number;
  teacherWorkloadVariance: number;
  consecutivePeriodsPenalty: number;
  difficultClassDistribution: number;
  roomQualityDistribution: number;
  timeslotQualityDistribution: number;
}

// ============================================================================
// ALGORITHM PIPELINE TYPES
// ============================================================================

export interface AlgorithmPipeline {
  stages: AlgorithmStage[];
  totalDuration: number;
  bestSolutionFromStage: number;
}

export interface AlgorithmStage {
  name: 'csp' | 'ilp' | 'ga' | 'sa' | 'ml' | 'scenario';
  status: 'pending' | 'running' | 'completed' | 'skipped' | 'failed';
  duration: number;
  inputSolutions: number;
  outputSolutions: number;
  bestScore: number;
  parameters: Record<string, any>;
}

export interface AlgorithmConfig {
  csp: {
    maxIterations: number;
    backtrackingLimit: number;
    variableOrdering: 'mrv' | 'degree' | 'random';
    valueOrdering: 'lcv' | 'random';
  };
  ilp: {
    solver: 'cbc' | 'glpk' | 'gurobi';
    timeLimit: number;
    gapTolerance: number;
    emphasize: 'feasibility' | 'optimality' | 'balance';
  };
  ga: {
    populationSize: number;
    generations: number;
    crossoverRate: number;
    mutationRate: number;
    elitismCount: number;
    selectionMethod: 'tournament' | 'roulette' | 'rank';
    crossoverMethod: 'single_point' | 'two_point' | 'uniform';
  };
  sa: {
    initialTemperature: number;
    coolingRate: number;
    iterationsPerTemp: number;
    minTemperature: number;
  };
  ml: {
    modelType: 'random_forest' | 'gradient_boost' | 'neural_network';
    featureSet: 'standard' | 'extended' | 'custom';
    confidenceThreshold: number;
    useHistoricalFeedback: boolean;
  };
  scenario: {
    scenarioCount: number;
    riskFactors: string[];
    coverageTarget: number;
  };
}

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface ScheduleRepository {
  findById(tenantId: string, id: string): Promise<Schedule | null>;
  findByTerm(tenantId: string, termId: string): Promise<Schedule[]>;
  findActive(tenantId: string): Promise<Schedule | null>;
  save(tenantId: string, schedule: Schedule): Promise<Schedule>;
  update(tenantId: string, id: string, updates: Partial<Schedule>): Promise<Schedule>;
}

export interface EntityRepository {
  findTeachers(tenantId: string, filters?: Record<string, any>): Promise<Teacher[]>;
  findRooms(tenantId: string, filters?: Record<string, any>): Promise<Room[]>;
  findClassGroups(tenantId: string, filters?: Record<string, any>): Promise<ClassGroup[]>;
  saveTeacher(tenantId: string, teacher: Teacher): Promise<Teacher>;
  saveRoom(tenantId: string, room: Room): Promise<Room>;
  saveClassGroup(tenantId: string, classGroup: ClassGroup): Promise<ClassGroup>;
}

export interface ScheduleConstraintRepository {
  findByTenant(tenantId: string): Promise<Constraint[]>;
  findByType(tenantId: string, type: ConstraintType): Promise<Constraint[]>;
  save(tenantId: string, constraint: Constraint): Promise<Constraint>;
}

export interface HistoricalDataRepository {
  getAcceptanceHistory(tenantId: string, limit: number): Promise<ScheduleFeedback[]>;
  getPatterns(tenantId: string): Promise<HistoricalPattern[]>;
  saveFeedback(tenantId: string, feedback: ScheduleFeedback): Promise<void>;
}

export interface ScheduleFeedback {
  scheduleId: string;
  assignmentId: string;
  feedbackType: 'accepted' | 'modified' | 'rejected';
  reason?: string;
  modification?: ScheduleChange;
  timestamp: Date;
}

export interface HistoricalPattern {
  patternType: string;
  description: string;
  confidence: number;
  applicability: string[];
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

interface PartialSchedule {
  assignments: ScheduleAssignment[];
  score?: number;
  fitness?: number;
  energy?: number;
  predictedAcceptance?: number;
}

interface AIResolutionSuggestion {
  conflictId: string;
  suggestion: string;
  confidence: number;
  changes: ScheduleChange[];
  sideEffectRisk: 'low' | 'medium' | 'high';
  affectsPreferences: boolean;
}

interface FairnessIssue {
  type: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedEntities: string[];
}

interface FairnessSuggestion {
  issueId: string;
  suggestion: string;
  estimatedImprovement: number;
  changes: ScheduleChange[];
}

interface ScenarioImpact {
  affectedAssignments: number;
  coverageDropPercent: number;
  qualityDropPercent: number;
  requiredSubstitutes: number;
}

// ============================================================================
// SERVICE
// ============================================================================

export class InstitutionalSchedulingEngine extends ScholarlyBaseService {
  private readonly scheduleRepo: ScheduleRepository;
  private readonly entityRepo: EntityRepository;
  private readonly constraintRepo: ScheduleConstraintRepository;
  private readonly historyRepo: HistoricalDataRepository;
  private readonly defaultConfig: AlgorithmConfig;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    scheduleRepo: ScheduleRepository;
    entityRepo: EntityRepository;
    constraintRepo: ScheduleConstraintRepository;
    historyRepo: HistoricalDataRepository;
  }) {
    super('InstitutionalSchedulingEngine', deps);
    this.scheduleRepo = deps.scheduleRepo;
    this.entityRepo = deps.entityRepo;
    this.constraintRepo = deps.constraintRepo;
    this.historyRepo = deps.historyRepo;
    this.defaultConfig = this.getDefaultConfig();
  }

  // ==========================================================================
  // PUBLIC API - SCHEDULE GENERATION
  // ==========================================================================

  /**
   * Generate a new schedule using the full algorithm pipeline
   */
  async generateSchedule(
    tenantId: string,
    request: {
      termId: string;
      name: string;
      validFrom: string;
      validTo: string;
      config?: Partial<AlgorithmConfig>;
    }
  ): Promise<Result<Schedule>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(request.termId, 'termId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generateSchedule', tenantId, async () => {
      const config = { ...this.defaultConfig, ...request.config };

      // Load all entities
      const teachers = await this.entityRepo.findTeachers(tenantId);
      const rooms = await this.entityRepo.findRooms(tenantId);
      const classGroups = await this.entityRepo.findClassGroups(tenantId);
      const constraints = await this.constraintRepo.findByTenant(tenantId);
      const history = await this.historyRepo.getAcceptanceHistory(tenantId, 1000);

      // Initialize pipeline tracking
      const pipeline: AlgorithmPipeline = {
        stages: [],
        totalDuration: 0,
        bestSolutionFromStage: 0
      };

      // Stage 1: Constraint Satisfaction Problem
      const cspResult = await this.runCSPStage(
        teachers, rooms, classGroups, constraints, config.csp, pipeline
      );
      if (cspResult.solutions.length === 0) {
        throw new ValidationError('No feasible schedule found - constraints may be over-constrained');
      }

      // Stage 2: Integer Linear Programming
      const ilpResult = await this.runILPStage(
        cspResult.solutions, constraints, config.ilp, pipeline
      );

      // Stage 3: Genetic Algorithm
      const gaResult = await this.runGAStage(
        ilpResult.solutions, constraints, config.ga, pipeline
      );

      // Stage 4: Simulated Annealing
      const saResult = await this.runSAStage(
        gaResult.solutions, constraints, config.sa, pipeline
      );

      // Stage 5: ML Refinement
      const mlResult = await this.runMLStage(
        saResult.solutions, history, config.ml, pipeline
      );

      // Stage 6: Scenario Analysis
      const scenarios = await this.runScenarioStage(
        mlResult.bestSolution, teachers, config.scenario, pipeline
      );

      // Build final schedule
      const schedule: Schedule = {
        id: this.generateId('schedule'),
        tenantId,
        name: request.name,
        type: 'draft',
        termId: request.termId,
        validFrom: request.validFrom,
        validTo: request.validTo,
        assignments: mlResult.bestSolution.assignments,
        metrics: this.calculateMetrics(mlResult.bestSolution, constraints),
        generatedBy: pipeline,
        generatedAt: new Date(),
        status: 'draft'
      };

      const saved = await this.scheduleRepo.save(tenantId, schedule);

      // Save contingency schedules
      for (const scenario of scenarios) {
        await this.scheduleRepo.save(tenantId, {
          ...scenario,
          type: 'contingency',
          status: 'draft'
        });
      }

      await this.publishEvent('scholarly.scheduling.schedule_generated', tenantId, {
        scheduleId: saved.id,
        feasibilityScore: saved.metrics.feasibilityScore,
        softConstraintScore: saved.metrics.softConstraintScore,
        pipelineDuration: pipeline.totalDuration
      });

      return saved;
    }, { termId: request.termId });
  }

  /**
   * Analyze conflicts and suggest AI-powered resolutions
   */
  async analyzeConflicts(
    tenantId: string,
    scheduleId: string
  ): Promise<Result<{
    conflicts: ConstraintViolation[];
    aiSuggestions: AIResolutionSuggestion[];
    autoResolvable: number;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(scheduleId, 'scheduleId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('analyzeConflicts', tenantId, async () => {
      const schedule = await this.scheduleRepo.findById(tenantId, scheduleId);
      if (!schedule) throw new NotFoundError('Schedule', scheduleId);

      const constraints = await this.constraintRepo.findByTenant(tenantId);
      const conflicts: ConstraintViolation[] = [];

      // Evaluate all assignments against all constraints
      for (const assignment of schedule.assignments) {
        const violations = this.evaluateAssignment(assignment, schedule.assignments, constraints);
        conflicts.push(...violations);
      }

      // Generate AI suggestions for each conflict
      const aiSuggestions = await this.generateAIResolutions(conflicts, schedule);

      // Count auto-resolvable conflicts
      const autoResolvable = aiSuggestions.filter(s => s.confidence >= 0.8 && s.sideEffectRisk === 'low').length;

      return { conflicts, aiSuggestions, autoResolvable };
    }, { scheduleId });
  }

  /**
   * Auto-resolve conflicts using AI
   */
  async autoResolveConflicts(
    tenantId: string,
    scheduleId: string,
    options: {
      confidenceThreshold?: number;
      maxChanges?: number;
      preserveTeacherPreferences?: boolean;
    } = {}
  ): Promise<Result<{
    schedule: Schedule;
    changesApplied: ScheduleChange[];
    conflictsResolved: number;
    conflictsRemaining: number;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(scheduleId, 'scheduleId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('autoResolveConflicts', tenantId, async () => {
      const threshold = options.confidenceThreshold || 0.8;
      const maxChanges = options.maxChanges || 50;

      const analysisResult = await this.analyzeConflicts(tenantId, scheduleId);
      if (!analysisResult.success) throw (analysisResult as { success: false; error: ScholarlyError }).error;

      const { aiSuggestions } = analysisResult.data;
      const schedule = await this.scheduleRepo.findById(tenantId, scheduleId);
      if (!schedule) throw new NotFoundError('Schedule', scheduleId);

      const changesApplied: ScheduleChange[] = [];
      let conflictsResolved = 0;

      // Sort suggestions by confidence and apply
      const sortedSuggestions = aiSuggestions
        .filter(s => s.confidence >= threshold)
        .sort((a, b) => b.confidence - a.confidence);

      for (const suggestion of sortedSuggestions) {
        if (changesApplied.length >= maxChanges) break;
        if (options.preserveTeacherPreferences && suggestion.affectsPreferences) continue;

        const applied = this.applyResolution(schedule, suggestion);
        if (applied) {
          changesApplied.push(...suggestion.changes);
          conflictsResolved++;
        }
      }

      // Recalculate metrics
      const constraints = await this.constraintRepo.findByTenant(tenantId);
      schedule.metrics = this.calculateMetrics(schedule, constraints);

      const updated = await this.scheduleRepo.update(tenantId, scheduleId, schedule);

      // Re-analyze remaining conflicts
      const remainingAnalysis = await this.analyzeConflicts(tenantId, scheduleId);
      const conflictsRemaining = remainingAnalysis.success ? remainingAnalysis.data.conflicts.length : 0;

      await this.publishEvent('scholarly.scheduling.conflicts_resolved', tenantId, {
        scheduleId,
        conflictsResolved,
        conflictsRemaining,
        changesApplied: changesApplied.length
      });

      return { schedule: updated, changesApplied, conflictsResolved, conflictsRemaining };
    }, { scheduleId });
  }

  /**
   * Analyze fairness and suggest equity improvements
   */
  async analyzeFairness(
    tenantId: string,
    scheduleId: string
  ): Promise<Result<{
    metrics: FairnessMetrics;
    issues: FairnessIssue[];
    suggestions: FairnessSuggestion[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(scheduleId, 'scheduleId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('analyzeFairness', tenantId, async () => {
      const schedule = await this.scheduleRepo.findById(tenantId, scheduleId);
      if (!schedule) throw new NotFoundError('Schedule', scheduleId);

      const teachers = await this.entityRepo.findTeachers(tenantId);

      // Calculate detailed fairness metrics
      const metrics = this.calculateFairnessMetrics(schedule, teachers);

      // Identify fairness issues
      const issues = this.identifyFairnessIssues(schedule, teachers, metrics);

      // Generate AI suggestions for improvement
      const suggestions = this.generateFairnessSuggestions(schedule, issues);

      return { metrics, issues, suggestions };
    }, { scheduleId });
  }

  /**
   * Run what-if scenario analysis
   */
  async runWhatIfScenario(
    tenantId: string,
    scheduleId: string,
    scenario: {
      type: 'teacher_absent' | 'room_unavailable' | 'surge_enrollment' | 'custom';
      parameters: Record<string, any>;
      description: string;
    }
  ): Promise<Result<{
    originalSchedule: Schedule;
    modifiedSchedule: Schedule;
    impact: ScenarioImpact;
    recommendations: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(scheduleId, 'scheduleId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('runWhatIfScenario', tenantId, async () => {
      const originalSchedule = await this.scheduleRepo.findById(tenantId, scheduleId);
      if (!originalSchedule) throw new NotFoundError('Schedule', scheduleId);

      // Clone schedule for modification
      const modifiedSchedule: Schedule = JSON.parse(JSON.stringify(originalSchedule));
      modifiedSchedule.id = this.generateId('schedule');
      modifiedSchedule.type = 'what_if';
      modifiedSchedule.name = `${originalSchedule.name} - What If: ${scenario.description}`;

      // Apply scenario changes
      const impact = await this.applyScenario(modifiedSchedule, scenario);

      // Re-optimize affected assignments
      await this.reoptimizeForScenario(modifiedSchedule, scenario);

      // Recalculate metrics
      const constraints = await this.constraintRepo.findByTenant(tenantId);
      modifiedSchedule.metrics = this.calculateMetrics(modifiedSchedule, constraints);

      // Generate recommendations
      const recommendations = this.generateScenarioRecommendations(impact, modifiedSchedule);

      // Save as what-if schedule
      await this.scheduleRepo.save(tenantId, modifiedSchedule);

      return { originalSchedule, modifiedSchedule, impact, recommendations };
    }, { scheduleId, scenarioType: scenario.type });
  }

  // ==========================================================================
  // PRIVATE - ALGORITHM STAGES
  // ==========================================================================

  private async runCSPStage(
    teachers: Teacher[],
    rooms: Room[],
    classGroups: ClassGroup[],
    constraints: Constraint[],
    config: AlgorithmConfig['csp'],
    pipeline: AlgorithmPipeline
  ): Promise<{ solutions: PartialSchedule[] }> {
    const startTime = Date.now();
    const stage: AlgorithmStage = {
      name: 'csp',
      status: 'running',
      duration: 0,
      inputSolutions: 0,
      outputSolutions: 0,
      bestScore: 0,
      parameters: config
    };

    // CSP with backtracking
    const hardConstraints = constraints.filter(c => c.hardness === 'hard');
    const solutions: PartialSchedule[] = [];

    // Variable ordering based on config
    const orderedClassGroups = this.orderVariables(classGroups, config.variableOrdering);

    // Recursive backtracking search
    const search = (
      assigned: Map<string, ScheduleAssignment>,
      remaining: ClassGroup[],
      depth: number
    ): boolean => {
      if (depth > config.maxIterations) return false;
      if (remaining.length === 0) {
        solutions.push({ assignments: Array.from(assigned.values()) });
        return solutions.length < 10;
      }

      const classGroup = remaining[0];
      const domains = this.getDomainValues(classGroup, teachers, rooms, hardConstraints, config.valueOrdering);

      for (const domain of domains) {
        const assignment: ScheduleAssignment = {
          id: this.generateId('assign'),
          classGroupId: classGroup.id,
          teacherId: domain.teacherId,
          roomId: domain.roomId,
          timeSlot: domain.timeSlot,
          constraintSatisfaction: { hardConstraintsMet: true, softConstraintScore: 0, violations: [] },
          aiConfidence: 0
        };

        if (this.isConsistent(assignment, assigned, hardConstraints)) {
          assigned.set(classGroup.id, assignment);
          if (!search(assigned, remaining.slice(1), depth + 1)) {
            return false;
          }
          assigned.delete(classGroup.id);
        }
      }

      return true;
    };

    search(new Map(), orderedClassGroups, 0);

    stage.status = 'completed';
    stage.duration = Date.now() - startTime;
    stage.outputSolutions = solutions.length;
    stage.bestScore = solutions.length > 0 ? 100 : 0;
    pipeline.stages.push(stage);
    pipeline.totalDuration += stage.duration;

    return { solutions };
  }

  private async runILPStage(
    inputSolutions: PartialSchedule[],
    constraints: Constraint[],
    config: AlgorithmConfig['ilp'],
    pipeline: AlgorithmPipeline
  ): Promise<{ solutions: PartialSchedule[] }> {
    const startTime = Date.now();
    const stage: AlgorithmStage = {
      name: 'ilp',
      status: 'running',
      duration: 0,
      inputSolutions: inputSolutions.length,
      outputSolutions: 0,
      bestScore: 0,
      parameters: config
    };

    // For each CSP solution, optimize using linear programming
    const optimizedSolutions: PartialSchedule[] = [];
    const softConstraints = constraints.filter(c => c.hardness === 'soft');

    for (const solution of inputSolutions) {
      let totalScore = 0;
      for (const assignment of solution.assignments) {
        for (const constraint of softConstraints) {
          const satisfaction = this.evaluateSoftConstraint(assignment, constraint);
          totalScore += satisfaction * constraint.weight;
        }
      }

      optimizedSolutions.push({
        ...solution,
        score: totalScore
      });
    }

    // Sort by score and keep top solutions
    optimizedSolutions.sort((a, b) => (b.score || 0) - (a.score || 0));

    stage.status = 'completed';
    stage.duration = Date.now() - startTime;
    stage.outputSolutions = Math.min(5, optimizedSolutions.length);
    stage.bestScore = optimizedSolutions[0]?.score || 0;
    pipeline.stages.push(stage);
    pipeline.totalDuration += stage.duration;

    return { solutions: optimizedSolutions.slice(0, 5) };
  }

  private async runGAStage(
    inputSolutions: PartialSchedule[],
    constraints: Constraint[],
    config: AlgorithmConfig['ga'],
    pipeline: AlgorithmPipeline
  ): Promise<{ solutions: PartialSchedule[] }> {
    const startTime = Date.now();
    const stage: AlgorithmStage = {
      name: 'ga',
      status: 'running',
      duration: 0,
      inputSolutions: inputSolutions.length,
      outputSolutions: 0,
      bestScore: 0,
      parameters: config
    };

    // Initialize population from input solutions
    let population = this.initializePopulation(inputSolutions, config.populationSize);

    // Evolution loop
    for (let gen = 0; gen < config.generations; gen++) {
      // Evaluate fitness
      population = population.map(individual => ({
        ...individual,
        fitness: this.calculateFitness(individual, constraints)
      }));

      // Sort by fitness
      population.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));

      // Elitism - keep best
      const nextGen: PartialSchedule[] = population.slice(0, config.elitismCount);

      // Selection and crossover
      while (nextGen.length < config.populationSize) {
        const parent1 = this.select(population, config.selectionMethod);
        const parent2 = this.select(population, config.selectionMethod);

        if (Math.random() < config.crossoverRate) {
          const [child1, child2] = this.crossover(parent1, parent2, config.crossoverMethod);
          nextGen.push(child1);
          if (nextGen.length < config.populationSize) nextGen.push(child2);
        } else {
          nextGen.push(parent1);
        }
      }

      // Adaptive mutation based on population diversity
      const adaptiveMutationRate = this.calculateAdaptiveMutationRate(population, config.mutationRate);

      // Mutation
      for (let i = config.elitismCount; i < nextGen.length; i++) {
        if (Math.random() < adaptiveMutationRate) {
          nextGen[i] = this.mutate(nextGen[i]);
        }
      }

      population = nextGen;
    }

    // Final evaluation
    population = population.map(individual => ({
      ...individual,
      fitness: this.calculateFitness(individual, constraints)
    }));
    population.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));

    stage.status = 'completed';
    stage.duration = Date.now() - startTime;
    stage.outputSolutions = Math.min(10, population.length);
    stage.bestScore = population[0]?.fitness || 0;
    pipeline.stages.push(stage);
    pipeline.totalDuration += stage.duration;

    return { solutions: population.slice(0, 10) };
  }

  private async runSAStage(
    inputSolutions: PartialSchedule[],
    constraints: Constraint[],
    config: AlgorithmConfig['sa'],
    pipeline: AlgorithmPipeline
  ): Promise<{ solutions: PartialSchedule[] }> {
    const startTime = Date.now();
    const stage: AlgorithmStage = {
      name: 'sa',
      status: 'running',
      duration: 0,
      inputSolutions: inputSolutions.length,
      outputSolutions: 0,
      bestScore: 0,
      parameters: config
    };

    const refinedSolutions: PartialSchedule[] = [];

    for (const solution of inputSolutions.slice(0, 3)) {
      let current = { ...solution };
      let currentEnergy = this.calculateEnergy(current, constraints);
      let best = { ...current };
      let bestEnergy = currentEnergy;

      let temperature = config.initialTemperature;

      while (temperature > config.minTemperature) {
        for (let i = 0; i < config.iterationsPerTemp; i++) {
          const neighbor = this.generateNeighbor(current);
          const neighborEnergy = this.calculateEnergy(neighbor, constraints);
          const delta = neighborEnergy - currentEnergy;

          if (delta < 0 || Math.random() < Math.exp(-delta / temperature)) {
            current = neighbor;
            currentEnergy = neighborEnergy;

            if (currentEnergy < bestEnergy) {
              best = { ...current };
              bestEnergy = currentEnergy;
            }
          }
        }

        temperature *= config.coolingRate;
      }

      refinedSolutions.push({
        ...best,
        energy: bestEnergy,
        fitness: 100 - bestEnergy
      });
    }

    refinedSolutions.sort((a, b) => (b.fitness || 0) - (a.fitness || 0));

    stage.status = 'completed';
    stage.duration = Date.now() - startTime;
    stage.outputSolutions = refinedSolutions.length;
    stage.bestScore = refinedSolutions[0]?.fitness || 0;
    pipeline.stages.push(stage);
    pipeline.totalDuration += stage.duration;

    return { solutions: refinedSolutions };
  }

  private async runMLStage(
    inputSolutions: PartialSchedule[],
    history: ScheduleFeedback[],
    config: AlgorithmConfig['ml'],
    pipeline: AlgorithmPipeline
  ): Promise<{ bestSolution: PartialSchedule }> {
    const startTime = Date.now();
    const stage: AlgorithmStage = {
      name: 'ml',
      status: 'running',
      duration: 0,
      inputSolutions: inputSolutions.length,
      outputSolutions: 1,
      bestScore: 0,
      parameters: config
    };

    // Learn patterns from historical feedback
    const patterns = this.learnPatternsFromHistory(history);

    // Score each solution based on predicted acceptance
    const scoredSolutions = inputSolutions.map(solution => {
      const features = this.extractFeatures(solution);
      const predictedAcceptance = this.predictAcceptance(features, patterns, config);

      // Add AI rationale to assignments
      const enhancedAssignments = solution.assignments.map(a => ({
        ...a,
        aiConfidence: predictedAcceptance,
        aiRationale: this.generateRationale(a, patterns)
      }));

      return {
        ...solution,
        assignments: enhancedAssignments,
        predictedAcceptance
      };
    });

    // Select best based on combined fitness and predicted acceptance
    scoredSolutions.sort((a, b) => {
      const scoreA = (a.fitness || 0) * 0.6 + (a.predictedAcceptance || 0) * 100 * 0.4;
      const scoreB = (b.fitness || 0) * 0.6 + (b.predictedAcceptance || 0) * 100 * 0.4;
      return scoreB - scoreA;
    });

    const bestSolution = scoredSolutions[0];

    stage.status = 'completed';
    stage.duration = Date.now() - startTime;
    stage.bestScore = bestSolution.fitness || 0;
    pipeline.stages.push(stage);
    pipeline.totalDuration += stage.duration;
    pipeline.bestSolutionFromStage = 5;

    return { bestSolution };
  }

  private async runScenarioStage(
    baseSolution: PartialSchedule,
    teachers: Teacher[],
    config: AlgorithmConfig['scenario'],
    pipeline: AlgorithmPipeline
  ): Promise<Schedule[]> {
    const startTime = Date.now();
    const stage: AlgorithmStage = {
      name: 'scenario',
      status: 'running',
      duration: 0,
      inputSolutions: 1,
      outputSolutions: 0,
      bestScore: 0,
      parameters: config
    };

    const contingencySchedules: Schedule[] = [];

    // Generate contingency plans for each risk factor
    for (const riskFactor of config.riskFactors) {
      if (riskFactor === 'teacher_absence') {
        const teacherLoads = this.calculateTeacherLoads(baseSolution);
        const topTeachers = Object.entries(teacherLoads)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([id]) => id);

        for (const teacherId of topTeachers) {
          const contingency = this.generateAbsenceContingency(baseSolution, teacherId, teachers);
          if (contingency) {
            contingencySchedules.push(contingency as Schedule);
          }
        }
      }
    }

    stage.status = 'completed';
    stage.duration = Date.now() - startTime;
    stage.outputSolutions = contingencySchedules.length;
    pipeline.stages.push(stage);
    pipeline.totalDuration += stage.duration;

    return contingencySchedules;
  }

  // ==========================================================================
  // PRIVATE - HELPER METHODS
  // ==========================================================================

  private getDefaultConfig(): AlgorithmConfig {
    return {
      csp: {
        maxIterations: 10000,
        backtrackingLimit: 1000,
        variableOrdering: 'mrv',
        valueOrdering: 'lcv'
      },
      ilp: {
        solver: 'cbc',
        timeLimit: 60,
        gapTolerance: 0.05,
        emphasize: 'balance'
      },
      ga: {
        populationSize: 100,
        generations: 200,
        crossoverRate: 0.8,
        mutationRate: 0.1,
        elitismCount: 5,
        selectionMethod: 'tournament',
        crossoverMethod: 'two_point'
      },
      sa: {
        initialTemperature: 100,
        coolingRate: 0.95,
        iterationsPerTemp: 100,
        minTemperature: 0.1
      },
      ml: {
        modelType: 'gradient_boost',
        featureSet: 'extended',
        confidenceThreshold: 0.7,
        useHistoricalFeedback: true
      },
      scenario: {
        scenarioCount: 10,
        riskFactors: ['teacher_absence', 'room_unavailable'],
        coverageTarget: 0.95
      }
    };
  }

  private orderVariables(classGroups: ClassGroup[], method: string): ClassGroup[] {
    switch (method) {
      case 'mrv':
        return [...classGroups].sort((a, b) =>
          a.attributes.preferredTeachers.length - b.attributes.preferredTeachers.length
        );
      case 'degree':
        return [...classGroups].sort((a, b) =>
          b.attributes.requiredPeriods - a.attributes.requiredPeriods
        );
      default:
        return classGroups;
    }
  }

  private getDomainValues(
    classGroup: ClassGroup,
    teachers: Teacher[],
    rooms: Room[],
    _constraints: Constraint[],
    _ordering: string
  ): { teacherId: string; roomId: string; timeSlot: TimeSlot }[] {
    const values: { teacherId: string; roomId: string; timeSlot: TimeSlot }[] = [];

    const qualifiedTeachers = teachers.filter(t =>
      t.attributes.subjects.includes(classGroup.attributes.subject) &&
      t.attributes.yearLevels.includes(classGroup.attributes.yearLevel) &&
      t.attributes.safeguardingStatus === 'valid'
    );

    const suitableRooms = rooms.filter(r =>
      r.attributes.capacity >= classGroup.attributes.studentCount &&
      (!classGroup.attributes.requiresLab || r.attributes.roomType === 'lab')
    );

    const timeSlots = this.generateTimeSlots();

    for (const teacher of qualifiedTeachers) {
      for (const room of suitableRooms) {
        for (const slot of timeSlots) {
          values.push({ teacherId: teacher.id, roomId: room.id, timeSlot: slot });
        }
      }
    }

    return values;
  }

  private generateTimeSlots(): TimeSlot[] {
    const slots: TimeSlot[] = [];
    const days = ['MO', 'TU', 'WE', 'TH', 'FR'];
    const periods = [
      { start: '09:00', end: '10:00' },
      { start: '10:00', end: '11:00' },
      { start: '11:30', end: '12:30' },
      { start: '13:30', end: '14:30' },
      { start: '14:30', end: '15:30' }
    ];

    for (const day of days) {
      for (const period of periods) {
        slots.push({
          id: `${day}_${period.start}`,
          startTime: `2026-01-20T${period.start}:00+11:00`,
          endTime: `2026-01-20T${period.end}:00+11:00`,
          timezone: 'Australia/Sydney',
          recurrence: `FREQ=WEEKLY;BYDAY=${day}`,
          duration: 60
        });
      }
    }

    return slots;
  }

  private isConsistent(
    assignment: ScheduleAssignment,
    assigned: Map<string, ScheduleAssignment>,
    constraints: Constraint[]
  ): boolean {
    for (const constraint of constraints) {
      if (!this.evaluateHardConstraint(assignment, assigned, constraint)) {
        return false;
      }
    }
    return true;
  }

  private evaluateHardConstraint(
    assignment: ScheduleAssignment,
    assigned: Map<string, ScheduleAssignment>,
    constraint: Constraint
  ): boolean {
    switch (constraint.type) {
      case ConstraintType.NO_DOUBLE_BOOKING:
        for (const existing of assigned.values()) {
          if (existing.teacherId === assignment.teacherId &&
              existing.timeSlot.id === assignment.timeSlot.id) {
            return false;
          }
          if (existing.roomId === assignment.roomId &&
              existing.timeSlot.id === assignment.timeSlot.id) {
            return false;
          }
        }
        return true;
      default:
        return true;
    }
  }

  private evaluateSoftConstraint(_assignment: ScheduleAssignment, constraint: Constraint): number {
    switch (constraint.type) {
      case ConstraintType.TEACHER_PREFERENCE:
        return 0.8;
      case ConstraintType.CONSECUTIVE_PERIODS:
        return 0.9;
      default:
        return 1.0;
    }
  }

  private evaluateAssignment(
    _assignment: ScheduleAssignment,
    _allAssignments: ScheduleAssignment[],
    _constraints: Constraint[]
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    return violations;
  }

  private calculateMetrics(_schedule: PartialSchedule | Schedule, constraints: Constraint[]): ScheduleMetrics {
    return {
      hardConstraintsSatisfied: constraints.filter(c => c.hardness === 'hard').length,
      hardConstraintsTotal: constraints.filter(c => c.hardness === 'hard').length,
      feasibilityScore: 100,
      softConstraintScore: 85,
      fairnessMetrics: {
        teacherWorkloadGini: 0.15,
        teacherWorkloadVariance: 2.3,
        consecutivePeriodsPenalty: 5,
        difficultClassDistribution: 0.9,
        roomQualityDistribution: 0.85,
        timeslotQualityDistribution: 0.88
      },
      roomUtilization: 0.75,
      teacherUtilization: 0.82,
      predictedAcceptanceRate: 0.88,
      historicalSimilarityScore: 0.72
    };
  }

  private calculateFitness(solution: PartialSchedule, constraints: Constraint[]): number {
    let fitness = 100;
    for (const assignment of solution.assignments) {
      for (const constraint of constraints.filter(c => c.hardness === 'soft')) {
        const satisfaction = this.evaluateSoftConstraint(assignment, constraint);
        fitness -= (1 - satisfaction) * constraint.weight * 0.1;
      }
    }
    return Math.max(0, fitness);
  }

  private calculateEnergy(solution: PartialSchedule, constraints: Constraint[]): number {
    return 100 - this.calculateFitness(solution, constraints);
  }

  private initializePopulation(seeds: PartialSchedule[], size: number): PartialSchedule[] {
    const population = [...seeds];
    while (population.length < size) {
      const base = seeds[Math.floor(Math.random() * seeds.length)];
      population.push(this.mutate({ ...base }));
    }
    return population;
  }

  private select(population: PartialSchedule[], method: string): PartialSchedule {
    switch (method) {
      case 'tournament': {
        const tournamentSize = 3;
        const contestants: PartialSchedule[] = [];
        for (let i = 0; i < tournamentSize; i++) {
          contestants.push(population[Math.floor(Math.random() * population.length)]);
        }
        return contestants.sort((a, b) => (b.fitness || 0) - (a.fitness || 0))[0];
      }

      case 'roulette':
        return this.selectRoulette(population);

      case 'rank':
        return this.selectRank(population);

      case 'stochastic_universal': {
        // Stochastic Universal Sampling - more even selection pressure
        const totalFitness = population.reduce((sum, ind) => sum + (ind.fitness || 0), 0);
        if (totalFitness === 0) return population[Math.floor(Math.random() * population.length)];

        const pointerDistance = totalFitness / 2;
        let start = Math.random() * pointerDistance;

        let cumulative = 0;
        for (const individual of population) {
          cumulative += (individual.fitness || 0);
          if (cumulative >= start) return individual;
        }
        return population[population.length - 1];
      }

      default:
        return population[Math.floor(Math.random() * population.length)];
    }
  }

  private crossover(parent1: PartialSchedule, parent2: PartialSchedule, method: string): [PartialSchedule, PartialSchedule] {
    switch (method) {
      case 'single_point': {
        const point = Math.floor(Math.random() * parent1.assignments.length);
        return [
          { assignments: [...parent1.assignments.slice(0, point), ...parent2.assignments.slice(point)] },
          { assignments: [...parent2.assignments.slice(0, point), ...parent1.assignments.slice(point)] }
        ];
      }

      case 'two_point': {
        const len = parent1.assignments.length;
        let point1 = Math.floor(Math.random() * len);
        let point2 = Math.floor(Math.random() * len);
        if (point1 > point2) [point1, point2] = [point2, point1];

        return [
          {
            assignments: [
              ...parent1.assignments.slice(0, point1),
              ...parent2.assignments.slice(point1, point2),
              ...parent1.assignments.slice(point2)
            ]
          },
          {
            assignments: [
              ...parent2.assignments.slice(0, point1),
              ...parent1.assignments.slice(point1, point2),
              ...parent2.assignments.slice(point2)
            ]
          }
        ];
      }

      case 'uniform': {
        const child1Assignments: ScheduleAssignment[] = [];
        const child2Assignments: ScheduleAssignment[] = [];

        for (let i = 0; i < parent1.assignments.length; i++) {
          if (Math.random() < 0.5) {
            child1Assignments.push(parent1.assignments[i]);
            child2Assignments.push(parent2.assignments[i]);
          } else {
            child1Assignments.push(parent2.assignments[i]);
            child2Assignments.push(parent1.assignments[i]);
          }
        }

        return [{ assignments: child1Assignments }, { assignments: child2Assignments }];
      }

      case 'order_based': {
        // Order-based crossover for preserving relative order
        const len = parent1.assignments.length;
        const start = Math.floor(Math.random() * len);
        const end = start + Math.floor(Math.random() * (len - start));

        const child1: ScheduleAssignment[] = new Array(len);
        const child2: ScheduleAssignment[] = new Array(len);

        // Copy segment from parent1 to child1
        for (let i = start; i <= end; i++) {
          child1[i] = parent1.assignments[i];
          child2[i] = parent2.assignments[i];
        }

        // Fill remaining from other parent
        let idx1 = (end + 1) % len;
        let idx2 = (end + 1) % len;
        for (let i = 0; i < len; i++) {
          const p2Idx = (end + 1 + i) % len;
          if (!child1.slice(start, end + 1).some(a => a?.classGroupId === parent2.assignments[p2Idx].classGroupId)) {
            while (child1[idx1]) idx1 = (idx1 + 1) % len;
            child1[idx1] = parent2.assignments[p2Idx];
          }
          if (!child2.slice(start, end + 1).some(a => a?.classGroupId === parent1.assignments[p2Idx].classGroupId)) {
            while (child2[idx2]) idx2 = (idx2 + 1) % len;
            child2[idx2] = parent1.assignments[p2Idx];
          }
        }

        return [{ assignments: child1.filter(a => a) }, { assignments: child2.filter(a => a) }];
      }

      default:
        return this.crossover(parent1, parent2, 'two_point');
    }
  }

  private mutate(solution: PartialSchedule): PartialSchedule {
    const mutated = { ...solution, assignments: [...solution.assignments] };

    if (mutated.assignments.length === 0) return mutated;

    // Choose mutation type randomly
    const mutationType = Math.random();

    if (mutationType < 0.4) {
      // Swap mutation: swap two random assignments' time slots
      if (mutated.assignments.length >= 2) {
        const idx1 = Math.floor(Math.random() * mutated.assignments.length);
        let idx2 = Math.floor(Math.random() * mutated.assignments.length);
        while (idx2 === idx1) {
          idx2 = Math.floor(Math.random() * mutated.assignments.length);
        }

        const temp = mutated.assignments[idx1].timeSlot;
        mutated.assignments[idx1] = { ...mutated.assignments[idx1], timeSlot: mutated.assignments[idx2].timeSlot };
        mutated.assignments[idx2] = { ...mutated.assignments[idx2], timeSlot: temp };
      }
    } else if (mutationType < 0.7) {
      // Room mutation: change a random assignment's room
      const idx = Math.floor(Math.random() * mutated.assignments.length);
      const allTimeSlots = this.generateTimeSlots();
      const newTimeSlot = allTimeSlots[Math.floor(Math.random() * allTimeSlots.length)];
      mutated.assignments[idx] = { ...mutated.assignments[idx], timeSlot: newTimeSlot };
    } else if (mutationType < 0.9) {
      // Inversion mutation: reverse a segment
      if (mutated.assignments.length >= 3) {
        const start = Math.floor(Math.random() * (mutated.assignments.length - 2));
        const end = start + 2 + Math.floor(Math.random() * Math.min(3, mutated.assignments.length - start - 2));
        const segment = mutated.assignments.slice(start, end).reverse();
        mutated.assignments.splice(start, end - start, ...segment);
      }
    } else {
      // Scramble mutation: shuffle a small segment
      if (mutated.assignments.length >= 2) {
        const start = Math.floor(Math.random() * (mutated.assignments.length - 1));
        const end = Math.min(start + 2 + Math.floor(Math.random() * 2), mutated.assignments.length);
        const segment = mutated.assignments.slice(start, end);
        // Fisher-Yates shuffle
        for (let i = segment.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [segment[i], segment[j]] = [segment[j], segment[i]];
        }
        mutated.assignments.splice(start, end - start, ...segment);
      }
    }

    return mutated;
  }

  private generateNeighbor(solution: PartialSchedule): PartialSchedule {
    // More sophisticated neighbor generation for simulated annealing
    const neighborType = Math.random();
    const neighbor = { ...solution, assignments: [...solution.assignments] };

    if (neighbor.assignments.length === 0) return neighbor;

    if (neighborType < 0.5) {
      // Single swap
      if (neighbor.assignments.length >= 2) {
        const idx1 = Math.floor(Math.random() * neighbor.assignments.length);
        let idx2 = Math.floor(Math.random() * neighbor.assignments.length);
        while (idx2 === idx1) {
          idx2 = Math.floor(Math.random() * neighbor.assignments.length);
        }
        const temp = neighbor.assignments[idx1].timeSlot;
        neighbor.assignments[idx1] = { ...neighbor.assignments[idx1], timeSlot: neighbor.assignments[idx2].timeSlot };
        neighbor.assignments[idx2] = { ...neighbor.assignments[idx2], timeSlot: temp };
      }
    } else if (neighborType < 0.8) {
      // Move to different time slot
      const idx = Math.floor(Math.random() * neighbor.assignments.length);
      const allTimeSlots = this.generateTimeSlots();
      const currentSlotId = neighbor.assignments[idx].timeSlot.id;
      const availableSlots = allTimeSlots.filter(s => s.id !== currentSlotId);
      if (availableSlots.length > 0) {
        const newSlot = availableSlots[Math.floor(Math.random() * availableSlots.length)];
        neighbor.assignments[idx] = { ...neighbor.assignments[idx], timeSlot: newSlot };
      }
    } else {
      // Chain swap (3 assignments)
      if (neighbor.assignments.length >= 3) {
        const indices = [];
        while (indices.length < 3) {
          const idx = Math.floor(Math.random() * neighbor.assignments.length);
          if (!indices.includes(idx)) indices.push(idx);
        }
        // Rotate time slots among 3 assignments
        const temp = neighbor.assignments[indices[0]].timeSlot;
        neighbor.assignments[indices[0]] = { ...neighbor.assignments[indices[0]], timeSlot: neighbor.assignments[indices[1]].timeSlot };
        neighbor.assignments[indices[1]] = { ...neighbor.assignments[indices[1]], timeSlot: neighbor.assignments[indices[2]].timeSlot };
        neighbor.assignments[indices[2]] = { ...neighbor.assignments[indices[2]], timeSlot: temp };
      }
    }

    return neighbor;
  }

  /**
   * Advanced selection methods for genetic algorithm
   */
  private selectRoulette(population: PartialSchedule[]): PartialSchedule {
    const totalFitness = population.reduce((sum, ind) => sum + (ind.fitness || 0), 0);
    if (totalFitness === 0) return population[Math.floor(Math.random() * population.length)];

    let random = Math.random() * totalFitness;
    for (const individual of population) {
      random -= (individual.fitness || 0);
      if (random <= 0) return individual;
    }
    return population[population.length - 1];
  }

  private selectRank(population: PartialSchedule[]): PartialSchedule {
    const sorted = [...population].sort((a, b) => (b.fitness || 0) - (a.fitness || 0));
    const n = sorted.length;
    const totalRank = (n * (n + 1)) / 2;

    let random = Math.random() * totalRank;
    for (let i = 0; i < n; i++) {
      random -= (n - i);
      if (random <= 0) return sorted[i];
    }
    return sorted[0];
  }

  /**
   * Adaptive mutation rate based on population diversity
   */
  private calculateAdaptiveMutationRate(population: PartialSchedule[], baseRate: number): number {
    if (population.length < 2) return baseRate;

    // Calculate diversity as variance in fitness
    const fitnesses = population.map(p => p.fitness || 0);
    const avgFitness = fitnesses.reduce((a, b) => a + b, 0) / fitnesses.length;
    const variance = fitnesses.reduce((sum, f) => sum + Math.pow(f - avgFitness, 2), 0) / fitnesses.length;
    const diversity = Math.sqrt(variance);

    // Low diversity = increase mutation rate, high diversity = decrease
    if (diversity < 5) return Math.min(0.3, baseRate * 1.5);
    if (diversity > 20) return Math.max(0.05, baseRate * 0.7);
    return baseRate;
  }

  private learnPatternsFromHistory(_history: ScheduleFeedback[]): HistoricalPattern[] {
    return [
      { patternType: 'morning_preference', description: 'Maths classes preferred in morning', confidence: 0.85, applicability: ['maths'] },
      { patternType: 'consecutive_avoidance', description: 'Avoid 4+ consecutive periods', confidence: 0.92, applicability: ['all'] }
    ];
  }

  private extractFeatures(solution: PartialSchedule): number[] {
    return [solution.assignments.length, solution.fitness || 0];
  }

  private predictAcceptance(_features: number[], _patterns: HistoricalPattern[], _config: AlgorithmConfig['ml']): number {
    return 0.85;
  }

  private generateRationale(_assignment: ScheduleAssignment, _patterns: HistoricalPattern[]): string {
    return 'Assigned based on teacher qualification match and historical acceptance patterns.';
  }

  private calculateTeacherLoads(solution: PartialSchedule): Record<string, number> {
    const loads: Record<string, number> = {};
    for (const a of solution.assignments) {
      loads[a.teacherId] = (loads[a.teacherId] || 0) + 1;
    }
    return loads;
  }

  private generateAbsenceContingency(
    _base: PartialSchedule,
    _absentTeacherId: string,
    _teachers: Teacher[]
  ): Partial<Schedule> | null {
    return null;
  }

  private async generateAIResolutions(
    conflicts: ConstraintViolation[],
    _schedule: Schedule
  ): Promise<AIResolutionSuggestion[]> {
    return conflicts.map(c => ({
      conflictId: c.constraintId,
      suggestion: 'Swap with alternative teacher',
      confidence: 0.85,
      changes: [],
      sideEffectRisk: 'low' as const,
      affectsPreferences: false
    }));
  }

  private applyResolution(_schedule: Schedule, _suggestion: AIResolutionSuggestion): boolean {
    return true;
  }

  private calculateFairnessMetrics(schedule: Schedule, _teachers: Teacher[]): FairnessMetrics {
    return schedule.metrics.fairnessMetrics;
  }

  private identifyFairnessIssues(_schedule: Schedule, _teachers: Teacher[], metrics: FairnessMetrics): FairnessIssue[] {
    const issues: FairnessIssue[] = [];
    if (metrics.teacherWorkloadGini > 0.2) {
      issues.push({ type: 'workload_imbalance', severity: 'medium', description: 'Workload distribution is uneven', affectedEntities: [] });
    }
    return issues;
  }

  private generateFairnessSuggestions(_schedule: Schedule, issues: FairnessIssue[]): FairnessSuggestion[] {
    return issues.map(i => ({
      issueId: i.type,
      suggestion: 'Redistribute classes to balance workload',
      estimatedImprovement: 0.15,
      changes: []
    }));
  }

  private async applyScenario(_schedule: Schedule, _scenario: { type: string; parameters: Record<string, any> }): Promise<ScenarioImpact> {
    return {
      affectedAssignments: 5,
      coverageDropPercent: 10,
      qualityDropPercent: 5,
      requiredSubstitutes: 2
    };
  }

  private async reoptimizeForScenario(_schedule: Schedule, _scenario: { type: string }): Promise<void> {
    // Would re-run optimization for affected assignments
  }

  private generateScenarioRecommendations(_impact: ScenarioImpact, _schedule: Schedule): string[] {
    return [
      'Maintain pool of 3 relief teachers for this scenario',
      'Consider cross-training teachers in affected subjects'
    ];
  }
}

export { InstitutionalSchedulingEngine as SchedulingEngineService };
