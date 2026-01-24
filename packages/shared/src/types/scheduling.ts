/**
 * Scheduling Engine Types
 */

export interface SchedulingRequest {
  id: string;
  tenantId: string;
  schoolId: string;

  // Request Parameters
  termId: string;
  startDate: Date;
  endDate: Date;

  // Input Data
  teachers: TeacherInput[];
  rooms: RoomInput[];
  subjects: SubjectInput[];
  classes: ClassInput[];
  constraints: SchedulingConstraint[];

  // Configuration
  config: SchedulerConfig;

  // Status
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number;
  errorMessage?: string;

  // Result
  result?: ScheduleResult;

  createdAt: Date;
  updatedAt: Date;
}

export interface TeacherInput {
  id: string;
  name: string;
  subjects: string[];
  maxPeriodsPerDay: number;
  maxPeriodsPerWeek: number;
  availability: TeacherAvailability[];
  preferences: TeacherPreference[];
}

export interface TeacherAvailability {
  dayOfWeek: number;
  periods: number[];
  available: boolean;
}

export interface TeacherPreference {
  type: 'prefer' | 'avoid';
  target: 'day' | 'period' | 'room' | 'class';
  targetId: string | number;
  weight: number;
}

export interface RoomInput {
  id: string;
  name: string;
  capacity: number;
  type: 'general' | 'lab' | 'computer' | 'art' | 'music' | 'gym' | 'library' | 'outdoor';
  facilities: string[];
  availability: RoomAvailability[];
}

export interface RoomAvailability {
  dayOfWeek: number;
  periods: number[];
  available: boolean;
}

export interface SubjectInput {
  id: string;
  name: string;
  periodsPerWeek: number;
  requiresSpecialRoom?: string;
  preferDoubles?: boolean;
  maxPerDay?: number;
}

export interface ClassInput {
  id: string;
  name: string;
  yearLevel: string;
  studentCount: number;
  subjects: ClassSubject[];
}

export interface ClassSubject {
  subjectId: string;
  teacherId?: string;
  periodsPerWeek: number;
}

export interface SchedulingConstraint {
  id: string;
  type: ConstraintType;
  priority: 'hard' | 'soft';
  weight?: number;
  parameters: Record<string, unknown>;
  description?: string;
}

export type ConstraintType =
  | 'no_clash'
  | 'teacher_availability'
  | 'room_availability'
  | 'max_periods_per_day'
  | 'max_consecutive'
  | 'preferred_time'
  | 'avoid_time'
  | 'subject_spread'
  | 'double_periods'
  | 'lunch_break'
  | 'room_type'
  | 'custom';

export interface SchedulerConfig {
  // Time Structure
  daysPerWeek: number;
  periodsPerDay: number;
  periodDuration: number; // minutes
  breakAfterPeriods: number[];
  lunchPeriod: number;

  // Algorithm Settings
  algorithm: 'genetic' | 'simulated_annealing' | 'constraint' | 'hybrid';
  maxIterations: number;
  timeout: number; // seconds
  populationSize?: number;
  mutationRate?: number;
  crossoverRate?: number;

  // Optimization Goals
  optimizationGoals: OptimizationGoal[];
}

export interface OptimizationGoal {
  type: 'minimize_gaps' | 'balance_load' | 'respect_preferences' | 'minimize_room_changes' | 'cluster_subjects';
  weight: number;
}

export interface ScheduleResult {
  schedule: ScheduledEvent[];
  quality: ScheduleQuality;
  violations: ConstraintViolation[];
  alternatives?: ScheduleAlternative[];
  generatedAt: Date;
  computationTime: number;
}

export interface ScheduledEvent {
  id: string;
  classId: string;
  subjectId: string;
  teacherId: string;
  roomId: string;
  dayOfWeek: number;
  period: number;
  duration: number; // periods
}

export interface ScheduleQuality {
  overallScore: number;
  hardConstraintsSatisfied: number;
  softConstraintsSatisfied: number;
  teacherSatisfaction: number;
  studentSatisfaction: number;
  resourceUtilization: number;
  breakdown: QualityBreakdown[];
}

export interface QualityBreakdown {
  metric: string;
  score: number;
  details: string;
}

export interface ConstraintViolation {
  constraintId: string;
  constraintType: ConstraintType;
  severity: 'hard' | 'soft';
  description: string;
  affectedEntities: string[];
}

export interface ScheduleAlternative {
  id: string;
  description: string;
  quality: ScheduleQuality;
  changes: ScheduleChange[];
}

export interface ScheduleChange {
  eventId: string;
  field: string;
  from: string;
  to: string;
  impact: string;
}

// ============================================================================
// EDUSCRUM TYPES
// ============================================================================

export interface EduScrumTeam {
  id: string;
  tenantId: string;
  name: string;
  classId: string;

  // Members
  members: TeamMember[];

  // Current Sprint
  currentSprintId?: string;
  sprints: string[];

  // Metrics
  velocity: number;
  totalPointsCompleted: number;

  // Status
  status: 'forming' | 'active' | 'completed';
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMember {
  userId: string;
  name: string;
  role: 'product_owner' | 'scrum_master' | 'developer';
  skills: string[];
  joinedAt: Date;
}

export interface Sprint {
  id: string;
  teamId: string;
  number: number;

  // Planning
  goal: string;
  startDate: Date;
  endDate: Date;
  plannedPoints: number;

  // Backlog
  backlogItems: BacklogItem[];

  // Progress
  completedPoints: number;
  burndown: BurndownPoint[];

  // Ceremonies
  dailyStandups: StandupRecord[];
  retrospective?: RetrospectiveRecord;

  // Status
  status: 'planning' | 'active' | 'review' | 'completed';
  completedAt?: Date;
}

export interface BacklogItem {
  id: string;
  title: string;
  description: string;
  type: 'story' | 'task' | 'bug' | 'learning_goal';
  points: number;
  priority: 'high' | 'medium' | 'low';
  status: 'todo' | 'in_progress' | 'review' | 'done';
  assigneeId?: string;
  curriculumCodes?: string[];
  acceptanceCriteria: string[];
  createdAt: Date;
  completedAt?: Date;
}

export interface BurndownPoint {
  date: Date;
  remainingPoints: number;
  completedPoints: number;
}

export interface StandupRecord {
  date: Date;
  attendees: string[];
  updates: StandupUpdate[];
  blockers: string[];
  aiInsights?: string[];
}

export interface StandupUpdate {
  memberId: string;
  yesterday: string;
  today: string;
  blockers: string[];
}

export interface RetrospectiveRecord {
  date: Date;
  attendees: string[];
  whatWentWell: string[];
  whatToImprove: string[];
  actionItems: ActionItem[];
  aiSuggestions?: string[];
}

export interface ActionItem {
  id: string;
  description: string;
  assigneeId?: string;
  status: 'open' | 'completed';
  dueDate?: Date;
}
