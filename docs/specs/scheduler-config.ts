/**
 * Scheduler Configuration System
 * 
 * A comprehensive, hierarchical configuration system that allows schools
 * to customize every aspect of schedule generation - from time structures
 * to constraint weights to algorithm parameters.
 * 
 * ## Configuration Hierarchy
 * 
 * ```
 * Platform Defaults (Chekd)
 *     â””â”€â”€ Jurisdiction Overrides (AU_NSW, UK_ENGLAND, etc.)
 *         â””â”€â”€ School Profile (Primary, Secondary, Special)
 *             â””â”€â”€ School Custom Config
 *                 â””â”€â”€ Term/Semester Overrides
 *                     â””â”€â”€ Special Event Overrides
 * ```
 * 
 * ## The Granny Explanation
 * 
 * Every school is different. A tiny rural primary school with 3 teachers
 * has completely different scheduling needs than a 2000-student secondary
 * school in Sydney. This configuration system lets each school say:
 * 
 * - "Our periods are 45 minutes, not 60"
 * - "We MUST have PE outdoors unless it's raining"
 * - "Mrs. Smith absolutely cannot teach before 10am (medical)"
 * - "Year 12 exams are more important than Year 7 sport"
 * - "We share a music teacher with the school next door"
 * 
 * The system remembers all these rules and applies them automatically.
 * 
 * @module SchedulerConfiguration
 */

// ============================================================================
// TIME STRUCTURE CONFIGURATION
// ============================================================================

/**
 * Defines the school's time structure - periods, breaks, terms
 */
export interface TimeStructureConfig {
  /** School's timezone (IANA format) */
  timezone: string;  // e.g., "Australia/Sydney"
  
  /** Term/semester structure */
  academicCalendar: AcademicCalendarConfig;
  
  /** Daily timetable structure */
  dailyStructure: DailyStructureConfig;
  
  /** Special day types (assembly days, sports days, etc.) */
  specialDayTypes: SpecialDayType[];
}

export interface AcademicCalendarConfig {
  type: 'terms' | 'semesters' | 'trimesters' | 'quarters';
  periods: {
    name: string;
    startDate: string;
    endDate: string;
    isTeaching: boolean;
  }[];
  holidays: {
    name: string;
    startDate: string;
    endDate: string;
  }[];
  specialEvents: {
    name: string;
    date: string;
    type: 'exam_period' | 'sports_carnival' | 'parent_teacher' | 'professional_development' | 'other';
    affectsSchedule: boolean;
  }[];
}

export interface DailyStructureConfig {
  /** Different day types (A/B days, Mon-Fri variations) */
  dayTypes: DayType[];
  
  /** Which day type applies to which weekday */
  weekPattern: {
    monday: string;    // Day type ID
    tuesday: string;
    wednesday: string;
    thursday: string;
    friday: string;
    saturday?: string;
    sunday?: string;
  };
  
  /** Rotating schedule config (if using A/B days) */
  rotation?: {
    type: 'weekly' | 'fortnightly' | 'custom';
    pattern: string[];  // Day type IDs in rotation order
  };
}

export interface DayType {
  id: string;
  name: string;  // e.g., "Standard Day", "Assembly Day", "Early Finish"
  periods: PeriodDefinition[];
  breaks: BreakDefinition[];
}

export interface PeriodDefinition {
  id: string;
  name: string;          // "Period 1", "Homeroom", "Tutor Group"
  startTime: string;     // "09:00"
  endTime: string;       // "10:00"
  duration: number;      // minutes
  type: 'teaching' | 'homeroom' | 'assembly' | 'study' | 'flexible';
  canBeSplit: boolean;   // Can this period be divided?
  canBeJoined: boolean;  // Can this join with adjacent periods?
}

export interface BreakDefinition {
  id: string;
  name: string;          // "Recess", "Lunch", "Afternoon Tea"
  startTime: string;
  endTime: string;
  duration: number;
  type: 'recess' | 'lunch' | 'transition';
  supervisionRequired: boolean;
}

export interface SpecialDayType {
  id: string;
  name: string;
  structure: DayType;
  appliesTo: string[];   // Dates or recurrence rules
  priority: number;      // Higher overrides lower
}

// ============================================================================
// CONSTRAINT CONFIGURATION
// ============================================================================

/**
 * Defines which constraints matter and how much
 */
export interface ConstraintConfig {
  /** Hard constraints - MUST be satisfied */
  hardConstraints: HardConstraintConfig[];
  
  /** Soft constraints - SHOULD be satisfied, weighted */
  softConstraints: SoftConstraintConfig[];
  
  /** Constraint groups for bulk enable/disable */
  constraintGroups: ConstraintGroup[];
  
  /** School-specific custom constraints */
  customConstraints: CustomConstraintConfig[];
}

export interface HardConstraintConfig {
  id: string;
  type: HardConstraintType;
  enabled: boolean;
  description: string;
  parameters?: Record<string, any>;
  
  /** Can this be temporarily relaxed in emergency? */
  canRelax: boolean;
  relaxationApprovalRequired?: 'admin' | 'principal' | 'system';
}

export type HardConstraintType =
  | 'teacher_qualification'        // Teacher must be qualified for subject
  | 'room_capacity'               // Room must fit all students
  | 'teacher_availability'        // Teacher must be available
  | 'room_availability'           // Room must be available
  | 'no_double_booking_teacher'   // Teacher can't be in two places
  | 'no_double_booking_room'      // Room can't have two classes
  | 'no_double_booking_student'   // Student can't be in two classes
  | 'safeguarding'                // Valid WWCC/background check
  | 'supervision_ratio'           // Minimum adult:student ratio
  | 'accessibility'               // Accessibility requirements met
  | 'mandatory_subjects'          // Required subjects scheduled
  | 'exam_conditions'             // Exam room requirements
  | 'custom';

export interface SoftConstraintConfig {
  id: string;
  type: SoftConstraintType;
  enabled: boolean;
  weight: number;         // 0-100, higher = more important
  description: string;
  parameters?: Record<string, any>;
  
  /** Category for grouping in UI */
  category: 'teacher_welfare' | 'student_learning' | 'resource_efficiency' | 'fairness' | 'preference';
}

export type SoftConstraintType =
  // Teacher welfare
  | 'teacher_max_consecutive'      // Max periods in a row
  | 'teacher_max_daily'            // Max periods per day
  | 'teacher_break_minimum'        // Minimum break duration
  | 'teacher_day_spread'           // Avoid split days (morning + afternoon gap)
  | 'teacher_preference_time'      // Preferred teaching times
  | 'teacher_preference_room'      // Preferred rooms
  | 'teacher_travel_time'          // Minimize room changes
  
  // Student learning
  | 'student_subject_spread'       // Spread subjects across week
  | 'student_no_double_subject'    // No same subject twice in day
  | 'student_morning_core'         // Core subjects in morning
  | 'student_practical_afternoon'  // Practical subjects afternoon
  | 'student_exam_preparation'     // Light schedule before exams
  
  // Resource efficiency
  | 'room_utilization'             // Maximize room usage
  | 'room_type_match'              // Match room to subject needs
  | 'resource_sharing'             // Efficient shared resource use
  | 'energy_efficiency'            // Group classes to reduce heating/cooling
  
  // Fairness
  | 'teacher_workload_balance'     // Even distribution of classes
  | 'difficult_class_distribution' // Share challenging classes
  | 'prime_time_distribution'      // Fair access to good time slots
  | 'room_quality_distribution'    // Fair access to good rooms
  
  // Custom
  | 'custom';

export interface ConstraintGroup {
  id: string;
  name: string;
  description: string;
  constraintIds: string[];
  enabled: boolean;
  
  /** Preset profiles */
  profile?: 'strict' | 'balanced' | 'flexible' | 'emergency';
}

export interface CustomConstraintConfig {
  id: string;
  name: string;
  description: string;
  type: 'hard' | 'soft';
  weight?: number;        // For soft constraints
  
  /** Rule definition */
  rule: ConstraintRule;
  
  /** When does this apply? */
  applicability: {
    terms?: string[];
    dateRange?: { start: string; end: string };
    dayTypes?: string[];
    yearLevels?: string[];
    subjects?: string[];
  };
}

export interface ConstraintRule {
  type: 'simple' | 'conditional' | 'aggregate' | 'temporal' | 'expression';
  
  /** Simple: entity.field operator value */
  simple?: {
    entity: 'teacher' | 'room' | 'class' | 'student';
    field: string;
    operator: '==' | '!=' | '>' | '<' | '>=' | '<=' | 'in' | 'not_in' | 'contains';
    value: any;
  };
  
  /** Conditional: if condition then constraint */
  conditional?: {
    if: ConstraintRule;
    then: ConstraintRule;
    else?: ConstraintRule;
  };
  
  /** Aggregate: count/sum/avg across entities */
  aggregate?: {
    function: 'count' | 'sum' | 'avg' | 'min' | 'max';
    over: string;
    where?: ConstraintRule;
    operator: string;
    value: number;
  };
  
  /** Temporal: time-based constraints */
  temporal?: {
    type: 'before' | 'after' | 'between' | 'not_between' | 'consecutive' | 'gap';
    reference?: string;
    value: number;
    unit: 'periods' | 'hours' | 'days';
  };
  
  /** Expression: free-form expression (advanced) */
  expression?: string;
}

// ============================================================================
// ALGORITHM PIPELINE CONFIGURATION
// ============================================================================

/**
 * Configure which algorithms run and in what order
 */
export interface PipelineConfig {
  /** Which stages are enabled */
  stages: PipelineStageConfig[];
  
  /** Early termination conditions */
  termination: TerminationConfig;
  
  /** Parallelization settings */
  parallelization: ParallelizationConfig;
  
  /** Caching between runs */
  caching: CachingConfig;
}

export interface PipelineStageConfig {
  id: string;
  type: 'csp' | 'ilp' | 'ga' | 'sa' | 'ml' | 'scenario' | 'custom';
  enabled: boolean;
  order: number;
  
  /** Stage-specific parameters */
  parameters: CSPConfig | ILPConfig | GAConfig | SAConfig | MLConfig | ScenarioConfig | CustomStageConfig;
  
  /** Conditions to run this stage */
  runConditions?: {
    minSolutionsFromPrevious?: number;
    maxSolutionsFromPrevious?: number;
    previousStageScore?: { min?: number; max?: number };
    timeRemaining?: number;  // ms
  };
  
  /** Time budget for this stage */
  timeBudget?: {
    min: number;   // ms - minimum time to run
    max: number;   // ms - maximum time allowed
    ideal: number; // ms - target time
  };
}

export interface CSPConfig {
  maxIterations: number;
  backtrackingLimit: number;
  
  /** Variable ordering heuristic */
  variableOrdering: 'mrv' | 'degree' | 'mrv_degree' | 'random' | 'custom';
  customVariableOrdering?: string;  // Expression
  
  /** Value ordering heuristic */
  valueOrdering: 'lcv' | 'random' | 'custom';
  customValueOrdering?: string;  // Expression
  
  /** Constraint propagation */
  propagation: 'none' | 'forward_checking' | 'arc_consistency' | 'full';
  
  /** Solution limit */
  maxSolutions: number;
}

export interface ILPConfig {
  solver: 'cbc' | 'glpk' | 'gurobi' | 'cplex' | 'highs';
  
  /** Time limit in seconds */
  timeLimit: number;
  
  /** Acceptable gap from optimal */
  gapTolerance: number;
  
  /** What to emphasize */
  emphasize: 'feasibility' | 'optimality' | 'balance';
  
  /** Pre-solve optimizations */
  presolve: boolean;
  
  /** Cut generation */
  cuts: 'none' | 'light' | 'aggressive';
  
  /** Parallel threads */
  threads: number;
}

export interface GAConfig {
  populationSize: number;
  generations: number;
  
  /** Selection */
  selection: {
    method: 'tournament' | 'roulette' | 'rank' | 'sus' | 'custom';
    tournamentSize?: number;
    customFunction?: string;
  };
  
  /** Crossover */
  crossover: {
    method: 'single_point' | 'two_point' | 'uniform' | 'pmx' | 'ox' | 'custom';
    rate: number;
    customFunction?: string;
  };
  
  /** Mutation */
  mutation: {
    method: 'swap' | 'insert' | 'scramble' | 'inversion' | 'custom';
    rate: number;
    adaptiveRate?: boolean;
    customFunction?: string;
  };
  
  /** Elitism */
  elitism: {
    count: number;
    preserveBest: boolean;
  };
  
  /** Diversity */
  diversity: {
    maintain: boolean;
    method?: 'crowding' | 'sharing' | 'island';
    threshold?: number;
  };
  
  /** Island model (if using parallel) */
  islands?: {
    count: number;
    migrationRate: number;
    migrationInterval: number;
  };
}

export interface SAConfig {
  /** Initial temperature */
  initialTemperature: number;
  
  /** Cooling schedule */
  cooling: {
    method: 'linear' | 'exponential' | 'logarithmic' | 'adaptive' | 'custom';
    rate: number;
    customFunction?: string;
  };
  
  /** Iterations per temperature */
  iterationsPerTemp: number;
  
  /** Minimum temperature (stopping condition) */
  minTemperature: number;
  
  /** Reheating */
  reheat?: {
    enabled: boolean;
    trigger: 'stagnation' | 'diversity' | 'custom';
    amount: number;
  };
  
  /** Neighborhood generation */
  neighborhood: {
    method: 'swap' | 'move' | 'block_swap' | 'custom';
    size: number;
    customFunction?: string;
  };
}

export interface MLConfig {
  /** Model type */
  model: {
    type: 'random_forest' | 'gradient_boost' | 'neural_network' | 'ensemble' | 'custom';
    parameters?: Record<string, any>;
    customModel?: string;  // Path to model
  };
  
  /** Feature engineering */
  features: {
    set: 'minimal' | 'standard' | 'extended' | 'custom';
    customFeatures?: string[];
    featureSelection?: boolean;
  };
  
  /** Training data */
  training: {
    useHistorical: boolean;
    historicalWindow: number;  // days
    augmentation: boolean;
  };
  
  /** Prediction */
  prediction: {
    confidenceThreshold: number;
    ensembleMethod?: 'voting' | 'stacking' | 'averaging';
  };
  
  /** Online learning */
  onlineLearning: {
    enabled: boolean;
    updateFrequency: 'per_schedule' | 'daily' | 'weekly';
  };
}

export interface ScenarioConfig {
  /** How many scenarios to generate */
  scenarioCount: number;
  
  /** Which risks to model */
  riskFactors: RiskFactorConfig[];
  
  /** Coverage target (0-1) */
  coverageTarget: number;
  
  /** Monte Carlo simulation */
  monteCarlo?: {
    enabled: boolean;
    iterations: number;
  };
}

export interface RiskFactorConfig {
  id: string;
  type: 'teacher_absence' | 'room_unavailable' | 'emergency' | 'weather' | 'custom';
  probability: number;  // 0-1
  impact: 'low' | 'medium' | 'high' | 'critical';
  mitigation: string;
}

export interface CustomStageConfig {
  name: string;
  description: string;
  implementation: string;  // Path to custom algorithm
  parameters: Record<string, any>;
}

export interface TerminationConfig {
  /** Maximum total time */
  maxTime: number;  // ms
  
  /** Target score to achieve */
  targetScore?: number;
  
  /** Stagnation detection */
  stagnation: {
    enabled: boolean;
    generations: number;
    threshold: number;
  };
  
  /** Early termination if good enough */
  earlyTermination: {
    enabled: boolean;
    minScore: number;
    minConfidence: number;
  };
}

export interface ParallelizationConfig {
  enabled: boolean;
  maxWorkers: number;
  
  /** Which stages to parallelize */
  parallelStages: string[];
  
  /** How to distribute work */
  distribution: 'round_robin' | 'load_balanced' | 'custom';
}

export interface CachingConfig {
  enabled: boolean;
  
  /** What to cache */
  cacheTargets: ('constraints' | 'domains' | 'solutions' | 'predictions')[];
  
  /** Cache invalidation */
  invalidation: {
    onDataChange: boolean;
    onConfigChange: boolean;
    ttl: number;  // seconds
  };
}

// ============================================================================
// OUTPUT CONFIGURATION
// ============================================================================

/**
 * Configure what outputs the scheduler produces
 */
export interface OutputConfig {
  /** Main schedule format */
  scheduleFormat: {
    includeAlternatives: boolean;
    alternativeCount: number;
    includeScenarios: boolean;
  };
  
  /** Reports to generate */
  reports: ReportConfig[];
  
  /** Notifications */
  notifications: NotificationConfig[];
  
  /** Integrations */
  integrations: IntegrationConfig[];
}

export interface ReportConfig {
  id: string;
  type: 'summary' | 'detailed' | 'fairness' | 'utilization' | 'conflicts' | 'custom';
  format: 'pdf' | 'excel' | 'json' | 'html';
  recipients: string[];
  schedule?: 'on_generation' | 'daily' | 'weekly';
}

export interface NotificationConfig {
  event: 'schedule_generated' | 'conflicts_found' | 'approval_needed' | 'published';
  channels: ('email' | 'sms' | 'push' | 'slack' | 'teams')[];
  recipients: string[];
  template: string;
}

export interface IntegrationConfig {
  type: 'sis' | 'calendar' | 'hr' | 'custom';
  provider: string;
  syncDirection: 'push' | 'pull' | 'bidirectional';
  mapping: Record<string, string>;
}

// ============================================================================
// SCHOOL PROFILE PRESETS
// ============================================================================

/**
 * Pre-configured profiles for different school types
 */
export interface SchoolProfilePreset {
  id: string;
  name: string;
  description: string;
  applicableTo: ('primary' | 'secondary' | 'k12' | 'special' | 'vocational')[];
  
  timeStructure: Partial<TimeStructureConfig>;
  constraints: Partial<ConstraintConfig>;
  pipeline: Partial<PipelineConfig>;
  output: Partial<OutputConfig>;
}

export const SCHOOL_PROFILE_PRESETS: SchoolProfilePreset[] = [
  {
    id: 'small_primary',
    name: 'Small Primary School',
    description: 'Under 200 students, generalist teachers, simple timetable',
    applicableTo: ['primary'],
    timeStructure: {
      dailyStructure: {
        dayTypes: [{
          id: 'standard',
          name: 'Standard Day',
          periods: [
            { id: 'p1', name: 'Period 1', startTime: '09:00', endTime: '10:00', duration: 60, type: 'teaching', canBeSplit: false, canBeJoined: true },
            { id: 'p2', name: 'Period 2', startTime: '10:00', endTime: '11:00', duration: 60, type: 'teaching', canBeSplit: false, canBeJoined: true },
            { id: 'p3', name: 'Period 3', startTime: '11:30', endTime: '12:30', duration: 60, type: 'teaching', canBeSplit: false, canBeJoined: true },
            { id: 'p4', name: 'Period 4', startTime: '13:30', endTime: '14:30', duration: 60, type: 'teaching', canBeSplit: false, canBeJoined: true },
            { id: 'p5', name: 'Period 5', startTime: '14:30', endTime: '15:00', duration: 30, type: 'teaching', canBeSplit: false, canBeJoined: false }
          ],
          breaks: [
            { id: 'recess', name: 'Recess', startTime: '11:00', endTime: '11:30', duration: 30, type: 'recess', supervisionRequired: true },
            { id: 'lunch', name: 'Lunch', startTime: '12:30', endTime: '13:30', duration: 60, type: 'lunch', supervisionRequired: true }
          ]
        }],
        weekPattern: { monday: 'standard', tuesday: 'standard', wednesday: 'standard', thursday: 'standard', friday: 'standard' }
      }
    },
    constraints: {
      softConstraints: [
        { id: 'same_teacher', type: 'custom', enabled: true, weight: 90, description: 'Same teacher for class', category: 'student_learning' }
      ]
    },
    pipeline: {
      stages: [
        { id: 'csp', type: 'csp', enabled: true, order: 1, parameters: { maxIterations: 1000, backtrackingLimit: 500, variableOrdering: 'mrv', valueOrdering: 'lcv', propagation: 'forward_checking', maxSolutions: 3 } as CSPConfig },
        { id: 'sa', type: 'sa', enabled: true, order: 2, parameters: { initialTemperature: 50, cooling: { method: 'exponential', rate: 0.95 }, iterationsPerTemp: 50, minTemperature: 0.1, neighborhood: { method: 'swap', size: 3 } } as SAConfig }
      ]
    },
    output: {}
  },
  {
    id: 'large_secondary',
    name: 'Large Secondary School',
    description: 'Over 1000 students, specialist teachers, complex timetable',
    applicableTo: ['secondary'],
    timeStructure: {
      dailyStructure: {
        dayTypes: [{
          id: 'standard',
          name: 'Standard Day',
          periods: Array.from({ length: 6 }, (_, i) => ({
            id: `p${i + 1}`,
            name: `Period ${i + 1}`,
            startTime: `${8 + Math.floor(i * 1.1)}:${i % 2 === 0 ? '00' : '05'}`,
            endTime: `${9 + Math.floor(i * 1.1)}:${i % 2 === 0 ? '00' : '05'}`,
            duration: 55,
            type: 'teaching' as const,
            canBeSplit: true,
            canBeJoined: true
          })),
          breaks: [
            { id: 'recess', name: 'Recess', startTime: '10:55', endTime: '11:15', duration: 20, type: 'recess' as const, supervisionRequired: true },
            { id: 'lunch', name: 'Lunch', startTime: '13:05', endTime: '13:50', duration: 45, type: 'lunch' as const, supervisionRequired: true }
          ]
        }],
        weekPattern: { monday: 'standard', tuesday: 'standard', wednesday: 'standard', thursday: 'standard', friday: 'standard' }
      }
    },
    constraints: {
      softConstraints: [
        { id: 'teacher_consecutive', type: 'teacher_max_consecutive', enabled: true, weight: 85, description: 'Max 4 consecutive periods', category: 'teacher_welfare', parameters: { max: 4 } },
        { id: 'morning_core', type: 'student_morning_core', enabled: true, weight: 70, description: 'Core subjects before lunch', category: 'student_learning' },
        { id: 'workload_balance', type: 'teacher_workload_balance', enabled: true, weight: 80, description: 'Even workload distribution', category: 'fairness' }
      ]
    },
    pipeline: {
      stages: [
        { id: 'csp', type: 'csp', enabled: true, order: 1, parameters: { maxIterations: 10000, backtrackingLimit: 2000, variableOrdering: 'mrv_degree', valueOrdering: 'lcv', propagation: 'arc_consistency', maxSolutions: 10 } as CSPConfig },
        { id: 'ilp', type: 'ilp', enabled: true, order: 2, parameters: { solver: 'cbc', timeLimit: 120, gapTolerance: 0.03, emphasize: 'balance', presolve: true, cuts: 'light', threads: 4 } as ILPConfig },
        { id: 'ga', type: 'ga', enabled: true, order: 3, parameters: { populationSize: 200, generations: 300, selection: { method: 'tournament', tournamentSize: 5 }, crossover: { method: 'pmx', rate: 0.85 }, mutation: { method: 'swap', rate: 0.15, adaptiveRate: true }, elitism: { count: 10, preserveBest: true }, diversity: { maintain: true, method: 'crowding' } } as GAConfig },
        { id: 'ml', type: 'ml', enabled: true, order: 4, parameters: { model: { type: 'gradient_boost' }, features: { set: 'extended' }, training: { useHistorical: true, historicalWindow: 365, augmentation: false }, prediction: { confidenceThreshold: 0.75 }, onlineLearning: { enabled: true, updateFrequency: 'weekly' } } as MLConfig },
        { id: 'scenario', type: 'scenario', enabled: true, order: 5, parameters: { scenarioCount: 5, riskFactors: [{ id: 'teacher_absence', type: 'teacher_absence', probability: 0.05, impact: 'medium', mitigation: 'relief_pool' }], coverageTarget: 0.95 } as ScenarioConfig }
      ]
    },
    output: {}
  }
];

// ============================================================================
// CONFIGURATION SERVICE
// ============================================================================

/**
 * Master configuration that combines all aspects
 */
export interface SchedulerMasterConfig {
  id: string;
  tenantId: string;
  schoolId: string;
  name: string;
  version: number;
  
  /** Base profile */
  baseProfile?: string;
  
  /** Configuration sections */
  timeStructure: TimeStructureConfig;
  constraints: ConstraintConfig;
  pipeline: PipelineConfig;
  output: OutputConfig;
  
  /** Metadata */
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  approvedBy?: string;
  approvedAt?: Date;
  
  /** Audit trail */
  changeHistory: ConfigChange[];
}

export interface ConfigChange {
  timestamp: Date;
  userId: string;
  section: string;
  path: string;
  oldValue: any;
  newValue: any;
  reason?: string;
}

/**
 * Configuration templates for common scenarios
 */
export interface ConfigTemplate {
  id: string;
  name: string;
  description: string;
  category: 'time_structure' | 'constraints' | 'pipeline' | 'full';
  config: Partial<SchedulerMasterConfig>;
  tags: string[];
}

export const CONFIG_TEMPLATES: ConfigTemplate[] = [
  {
    id: 'exam_period',
    name: 'Exam Period Configuration',
    description: 'Optimized for exam week scheduling',
    category: 'constraints',
    config: {
      constraints: {
        softConstraints: [
          { id: 'exam_prep', type: 'student_exam_preparation', enabled: true, weight: 95, description: 'Light schedule before exams', category: 'student_learning' }
        ],
        hardConstraints: [
          { id: 'exam_rooms', type: 'exam_conditions', enabled: true, description: 'Exam room requirements', canRelax: false }
        ],
        constraintGroups: [],
        customConstraints: []
      }
    },
    tags: ['exam', 'assessment', 'temporary']
  },
  {
    id: 'staff_shortage',
    name: 'Staff Shortage Mode',
    description: 'Relaxed constraints for emergency staffing',
    category: 'constraints',
    config: {
      constraints: {
        softConstraints: [
          { id: 'teacher_consecutive', type: 'teacher_max_consecutive', enabled: true, weight: 50, description: 'Relaxed consecutive limit', category: 'teacher_welfare', parameters: { max: 6 } }
        ],
        hardConstraints: [],
        constraintGroups: [
          { id: 'welfare', name: 'Teacher Welfare', description: 'Staff wellbeing constraints', constraintIds: [], enabled: false, profile: 'emergency' }
        ],
        customConstraints: []
      }
    },
    tags: ['emergency', 'staffing', 'temporary']
  }
];

export { SchedulerMasterConfig, ConfigTemplate };
