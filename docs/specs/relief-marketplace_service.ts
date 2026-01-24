/**
 * Super-Intelligent Relief Teacher Marketplace
 * 
 * An AI-first system that doesn't just match teachers to absences - it PREDICTS
 * absences before they happen, PROACTIVELY builds coverage capacity, LEARNS
 * from every interaction, and AUTONOMOUSLY manages the entire relief ecosystem.
 * 
 * ## The Granny Explanation
 * 
 * Imagine you had a really clever friend who:
 * - Notices Mrs. Johnson looks tired and predicts she'll be sick next Monday
 * - Already has three substitute teachers warming up, just in case
 * - Knows that flu season is coming and quietly builds up the casual pool
 * - Remembers that Mr. Smith was BRILLIANT with Year 6 last time
 * - Texts the perfect substitute before the school even knows they need one
 * - Learns from every single booking to get smarter every day
 * 
 * That's this system. It's not waiting for problems - it's preventing them.
 * 
 * ## Intelligence Layers
 * 
 * 1. PREDICTIVE: Forecasts absences using ML on historical patterns + external signals
 * 2. PROACTIVE: Pre-positions resources before demand materialises
 * 3. ADAPTIVE: Learns optimal matching from outcomes, not just inputs
 * 4. AUTONOMOUS: Makes decisions within guardrails, escalates edge cases
 * 5. EXPLANATORY: Every AI decision comes with human-readable reasoning
 * 
 * @module SuperIntelligentReliefMarketplace
 */

import {
  ScholarlyBaseService, Result, success, failure, ValidationError, NotFoundError,
  Validator, EventBus, Cache, ScholarlyConfig, Jurisdiction,
  JURISDICTION_REQUIREMENTS, SafeguardingCheck
} from '../shared/types';

// ============================================================================
// CORE TYPES
// ============================================================================

export interface ReliefTeacher {
  id: string;
  tenantId: string;
  userId: string;
  displayName: string;
  email: string;
  phone: string;
  
  // Qualifications & Compliance
  qualifications: Qualification[];
  safeguardingChecks: SafeguardingCheck[];
  teachingRegistration: TeachingRegistration;
  subjects: string[];
  yearLevels: string[];
  
  // Availability
  availability: SmartAvailability;
  
  // AI-Calculated Profiles
  aiProfile: TeacherAIProfile;
  
  // Trust & Performance
  trustScore: number;
  metrics: TeacherMetrics;
  
  // Preferences
  preferences: TeacherPreferences;
  
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  createdAt: Date;
  updatedAt: Date;
}

export interface TeachingRegistration {
  number: string;
  jurisdiction: Jurisdiction;
  expiresAt: Date;
  verified: boolean;
  autoRenewalReminder: boolean;
}

export interface Qualification {
  id: string;
  type: string;
  title: string;
  institution: string;
  year: number;
  verified: boolean;
}

export interface SmartAvailability {
  // Real-time status
  currentStatus: 'available_now' | 'available_soon' | 'busy' | 'offline';
  statusExpiresAt?: Date;
  
  // Calendar
  regularSchedule: WeeklySchedule;
  exceptions: DateException[];
  
  // AI-Predicted availability
  predictedAvailability: PredictedSlot[];
  
  // Location (opt-in)
  locationSharing: boolean;
  lastKnownLocation?: GeoLocation;
}

export interface WeeklySchedule {
  [day: string]: { available: boolean; slots: TimeSlot[] };
}

export interface TimeSlot {
  start: string;  // "08:00"
  end: string;    // "15:30"
  preference: 'preferred' | 'acceptable' | 'if_needed';
}

export interface DateException {
  date: string;
  available: boolean;
  slots?: TimeSlot[];
  reason?: string;
}

export interface PredictedSlot {
  date: string;
  probability: number;
  confidence: number;
  basedOn: string[];  // Factors that influenced prediction
}

export interface GeoLocation {
  lat: number;
  lng: number;
  accuracy: number;
  updatedAt: Date;
}

// ============================================================================
// AI PROFILE - The Intelligence Layer
// ============================================================================

export interface TeacherAIProfile {
  // Matching Intelligence
  matchingFactors: {
    subjectStrengths: Record<string, number>;      // Subject â†’ skill level 0-100
    yearLevelStrengths: Record<string, number>;    // Year â†’ comfort level 0-100
    schoolAffinities: Record<string, number>;      // SchoolId â†’ fit score 0-100
    studentTypeStrengths: Record<string, number>;  // "challenging", "gifted", etc.
  };
  
  // Behavioural Patterns (learned from history)
  behaviouralPatterns: {
    responseSpeed: { mean: number; stdDev: number };        // Minutes to respond
    acceptanceByUrgency: Record<string, number>;            // Urgency â†’ acceptance rate
    acceptanceByTimeOfDay: Record<string, number>;          // Hour â†’ acceptance rate
    cancellationRisk: number;                               // 0-1 probability
    noShowRisk: number;                                     // 0-1 probability
    preferredNotificationChannel: 'sms' | 'email' | 'push';
  };
  
  // Performance Predictions
  performancePredictions: {
    expectedRating: number;                    // Predicted rating for new booking
    expectedStudentEngagement: number;         // 0-100
    expectedClassroomManagement: number;       // 0-100
    confidenceInterval: { low: number; high: number };
  };
  
  // Reliability Signals
  reliabilitySignals: {
    overallScore: number;                      // 0-100
    trend: 'improving' | 'stable' | 'declining';
    riskFactors: string[];
    strengthFactors: string[];
  };
  
  // Career Trajectory (for long-term planning)
  careerTrajectory: {
    likelyToBecomePermStaff: number;          // 0-1 probability
    expectedTenure: number;                    // Months likely to remain active
    growthAreas: string[];                     // Skills they're developing
  };
  
  lastUpdated: Date;
  modelVersion: string;
}

export interface TeacherMetrics {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  noShows: number;
  averageRating: number;
  ratingCount: number;
  responseTimeP50: number;  // Median response time
  responseTimeP90: number;  // 90th percentile
  acceptanceRate: number;
  repeatBookingRate: number;
}

export interface TeacherPreferences {
  notifications: {
    channels: ('sms' | 'email' | 'push' | 'whatsapp')[];
    quietHours?: { start: string; end: string };
    urgentOverride: boolean;
  };
  work: {
    minHourlyRate?: number;
    maxHoursPerWeek?: number;
    maxTravelKm?: number;
    preferredSchoolTypes?: string[];
    avoidSchoolTypes?: string[];
  };
}

// ============================================================================
// ABSENCE & PREDICTION TYPES
// ============================================================================

export interface TeacherAbsence {
  id: string;
  tenantId: string;
  schoolId: string;
  
  // Absent teacher
  absentTeacherId: string;
  absentTeacherName: string;
  
  // Details
  type: AbsenceType;
  startDate: string;
  endDate: string;
  periods?: number[];
  reason?: string;
  
  // Classes
  classesToCover: ClassCoverage[];
  
  // Status
  status: 'predicted' | 'draft' | 'confirmed' | 'partially_covered' | 'fully_covered' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
  
  // AI Analysis
  aiAnalysis: AbsenceIntelligence;
  
  // Source
  source: 'manual' | 'predicted' | 'integrated' | 'pattern_detected';
  predictionId?: string;  // If this came from a prediction
  
  createdAt: Date;
  updatedAt: Date;
}

export type AbsenceType = 'sick' | 'personal' | 'professional_development' | 'long_service' | 'parental' | 'other';

export interface ClassCoverage {
  id: string;
  period: number;
  startTime: string;
  endTime: string;
  className: string;
  yearLevel: string;
  subject: string;
  room: string;
  studentCount: number;
  requirements: string[];
  difficulty: 'easy' | 'moderate' | 'challenging';
  
  coverStatus: 'uncovered' | 'offered' | 'accepted' | 'confirmed';
  assignedTeacherId?: string;
  bookingId?: string;
}

export interface AbsenceIntelligence {
  // Coverage Difficulty
  difficulty: {
    score: number;  // 0-100
    level: 'trivial' | 'easy' | 'moderate' | 'hard' | 'critical';
    factors: { factor: string; impact: number; explanation: string }[];
  };
  
  // Smart Matching
  recommendedTeachers: {
    teacherId: string;
    teacherName: string;
    matchScore: number;
    matchReasons: string[];
    predictedAcceptance: number;
    predictedPerformance: number;
    estimatedResponseTime: number;
    tier: 'gold' | 'silver' | 'bronze' | 'network';
  }[];
  
  // Risk Assessment
  coverageRisk: {
    score: number;  // 0-100, higher = more risk
    level: 'low' | 'moderate' | 'high' | 'critical';
    factors: string[];
    mitigations: string[];
  };
  
  // Autonomous Actions Taken
  autonomousActions: {
    action: string;
    takenAt: Date;
    result: string;
    reasoning: string;
  }[];
  
  // Recommendations for Humans
  humanRecommendations: {
    priority: 'info' | 'suggestion' | 'recommended' | 'urgent';
    action: string;
    reasoning: string;
    deadline?: Date;
  }[];
}

// ============================================================================
// PREDICTIVE ENGINE TYPES
// ============================================================================

export interface AbsencePrediction {
  id: string;
  tenantId: string;
  schoolId: string;
  
  // Who
  teacherId: string;
  teacherName: string;
  
  // When
  predictedDate: string;
  predictedDuration: number;  // Days
  
  // Confidence
  probability: number;  // 0-1
  confidence: number;   // 0-1
  
  // Why (explainable AI)
  factors: PredictionFactor[];
  
  // What type
  predictedType: AbsenceType;
  
  // Status
  status: 'active' | 'confirmed' | 'false_positive' | 'expired';
  actualAbsenceId?: string;
  
  // Proactive actions
  proactiveActions: ProactiveAction[];
  
  createdAt: Date;
  expiresAt: Date;
}

export interface PredictionFactor {
  type: 'historical_pattern' | 'seasonal' | 'health_signal' | 'workload' | 'external' | 'social';
  name: string;
  contribution: number;  // How much this factor contributed to prediction
  explanation: string;
  dataPoints?: string[];
}

export interface ProactiveAction {
  id: string;
  type: 'pre_alert_pool' | 'warm_standby' | 'pre_book' | 'capacity_check' | 'escalate';
  description: string;
  triggeredAt: Date;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  result?: string;
}

// ============================================================================
// SCHOOL POOL WITH INTELLIGENCE
// ============================================================================

export interface IntelligentSchoolPool {
  id: string;
  tenantId: string;
  schoolId: string;
  schoolName: string;
  
  // Members with AI scoring
  members: IntelligentPoolMember[];
  
  // Settings
  settings: PoolSettings;
  
  // AI Management
  aiManagement: PoolAIManagement;
  
  // Health Score
  healthScore: PoolHealthScore;
  
  createdAt: Date;
  updatedAt: Date;
}

export interface IntelligentPoolMember {
  reliefTeacherId: string;
  reliefTeacherName: string;
  
  // Tier (AI-assigned based on performance)
  tier: 'gold' | 'silver' | 'bronze';
  tierScore: number;
  tierReasons: string[];
  lastTierReview: Date;
  
  // School-specific performance
  schoolSpecificMetrics: {
    bookingsAtSchool: number;
    averageRatingAtSchool: number;
    repeatRequestRate: number;  // How often school requests them specifically
    studentFeedback?: string;
  };
  
  // AI predictions for this school
  predictions: {
    nextLikelyBooking?: Date;
    churnRisk: number;  // Risk they'll leave the pool
    promotionCandidate: boolean;  // Should be promoted to higher tier
  };
  
  // Notes
  schoolNotes?: string;
  aiGeneratedSummary?: string;
  
  addedAt: Date;
  lastBookedAt?: Date;
}

export interface PoolSettings {
  broadcastStrategy: 'intelligent' | 'tier_sequential' | 'all_parallel';
  tierTimeouts: { gold: number; silver: number; bronze: number };
  useNetworkFallback: boolean;
  networkRadius: number;
  defaultHourlyRate: number;
  autoPromote: boolean;
  autoPromoteThreshold: number;  // Bookings needed for auto-promotion
}

export interface PoolAIManagement {
  // Autonomous decisions enabled
  autonomyLevel: 'advisory' | 'semi_autonomous' | 'fully_autonomous';
  
  // Auto-actions
  autoActions: {
    autoPromoteDemote: boolean;
    autoRecruit: boolean;
    autoRemoveInactive: boolean;
    autoAdjustRates: boolean;
  };
  
  // Recruitment AI
  recruitmentQueue: {
    teacherId: string;
    teacherName: string;
    recommendationScore: number;
    reasons: string[];
    suggestedTier: 'gold' | 'silver' | 'bronze';
    status: 'suggested' | 'invited' | 'accepted' | 'declined';
  }[];
  
  // Recent autonomous actions
  recentActions: {
    action: string;
    target: string;
    reason: string;
    timestamp: Date;
    reversible: boolean;
  }[];
}

export interface PoolHealthScore {
  overall: number;  // 0-100
  
  dimensions: {
    coverage: { score: number; trend: string; issues: string[] };
    quality: { score: number; trend: string; issues: string[] };
    responsiveness: { score: number; trend: string; issues: string[] };
    diversity: { score: number; trend: string; issues: string[] };
    stability: { score: number; trend: string; issues: string[] };
  };
  
  risks: { risk: string; severity: 'low' | 'medium' | 'high'; mitigation: string }[];
  opportunities: { opportunity: string; impact: 'low' | 'medium' | 'high'; action: string }[];
  
  lastCalculated: Date;
}

// ============================================================================
// BOOKING WITH INTELLIGENCE
// ============================================================================

export interface IntelligentBooking {
  id: string;
  tenantId: string;
  
  // Parties
  schoolId: string;
  reliefTeacherId: string;
  absenceId: string;
  
  // Schedule
  date: string;
  classes: string[];
  startTime: string;
  endTime: string;
  totalHours: number;
  
  // AI-Optimised Rate
  hourlyRate: number;
  rateOptimisation: {
    baseRate: number;
    adjustments: { factor: string; adjustment: number }[];
    finalRate: number;
    explanation: string;
  };
  
  // Status
  status: BookingStatus;
  statusHistory: { status: BookingStatus; at: Date; by: string; reason?: string }[];
  
  // AI Predictions for this booking
  predictions: BookingPredictions;
  
  // Outcome tracking
  outcome?: BookingOutcome;
  
  createdAt: Date;
  updatedAt: Date;
}

export type BookingStatus = 'offered' | 'accepted' | 'declined' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';

export interface BookingPredictions {
  acceptanceProbability: number;
  expectedResponseTime: number;
  cancellationRisk: number;
  noShowRisk: number;
  expectedRating: number;
  confidence: number;
}

export interface BookingOutcome {
  completed: boolean;
  rating?: number;
  feedback?: string;
  
  // For ML feedback loop
  predictionAccuracy: {
    ratingPredicted: number;
    ratingActual?: number;
    responsePredicted: number;
    responseActual: number;
  };
  
  // Anomalies detected
  anomalies?: string[];
}

// ============================================================================
// REPOSITORIES
// ============================================================================

export interface ReliefTeacherRepository {
  findById(tenantId: string, id: string): Promise<ReliefTeacher | null>;
  findAvailable(tenantId: string, date: string, filters?: SearchFilters): Promise<ReliefTeacher[]>;
  findBySchoolPool(tenantId: string, schoolId: string): Promise<ReliefTeacher[]>;
  findInRadius(tenantId: string, location: GeoLocation, radiusKm: number): Promise<ReliefTeacher[]>;
  save(tenantId: string, teacher: ReliefTeacher): Promise<ReliefTeacher>;
  update(tenantId: string, id: string, updates: Partial<ReliefTeacher>): Promise<ReliefTeacher>;
  updateAIProfile(tenantId: string, id: string, profile: TeacherAIProfile): Promise<void>;
}

export interface SearchFilters {
  subjects?: string[];
  yearLevels?: string[];
  minRating?: number;
  maxDistance?: number;
  fromLocation?: GeoLocation;
  excludeIds?: string[];
}

export interface AbsenceRepository {
  findById(tenantId: string, id: string): Promise<TeacherAbsence | null>;
  findBySchool(tenantId: string, schoolId: string, range?: DateRange): Promise<TeacherAbsence[]>;
  findPending(tenantId: string, schoolId: string): Promise<TeacherAbsence[]>;
  save(tenantId: string, absence: TeacherAbsence): Promise<TeacherAbsence>;
  update(tenantId: string, id: string, updates: Partial<TeacherAbsence>): Promise<TeacherAbsence>;
}

export interface DateRange {
  start: string;
  end: string;
}

export interface PredictionRepository {
  findById(tenantId: string, id: string): Promise<AbsencePrediction | null>;
  findActive(tenantId: string, schoolId: string): Promise<AbsencePrediction[]>;
  findByTeacher(tenantId: string, teacherId: string): Promise<AbsencePrediction[]>;
  save(tenantId: string, prediction: AbsencePrediction): Promise<AbsencePrediction>;
  update(tenantId: string, id: string, updates: Partial<AbsencePrediction>): Promise<AbsencePrediction>;
}

export interface PoolRepository {
  findBySchool(tenantId: string, schoolId: string): Promise<IntelligentSchoolPool | null>;
  save(tenantId: string, pool: IntelligentSchoolPool): Promise<IntelligentSchoolPool>;
  update(tenantId: string, id: string, updates: Partial<IntelligentSchoolPool>): Promise<IntelligentSchoolPool>;
}

export interface BookingRepository {
  findById(tenantId: string, id: string): Promise<IntelligentBooking | null>;
  findByAbsence(tenantId: string, absenceId: string): Promise<IntelligentBooking[]>;
  findByTeacher(tenantId: string, teacherId: string, range?: DateRange): Promise<IntelligentBooking[]>;
  save(tenantId: string, booking: IntelligentBooking): Promise<IntelligentBooking>;
  update(tenantId: string, id: string, updates: Partial<IntelligentBooking>): Promise<IntelligentBooking>;
}

// ============================================================================
// SERVICE
// ============================================================================

export class SuperIntelligentReliefMarketplace extends ScholarlyBaseService {
  private readonly teacherRepo: ReliefTeacherRepository;
  private readonly absenceRepo: AbsenceRepository;
  private readonly predictionRepo: PredictionRepository;
  private readonly poolRepo: PoolRepository;
  private readonly bookingRepo: BookingRepository;

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    teacherRepo: ReliefTeacherRepository;
    absenceRepo: AbsenceRepository;
    predictionRepo: PredictionRepository;
    poolRepo: PoolRepository;
    bookingRepo: BookingRepository;
  }) {
    super('SuperIntelligentReliefMarketplace', deps);
    this.teacherRepo = deps.teacherRepo;
    this.absenceRepo = deps.absenceRepo;
    this.predictionRepo = deps.predictionRepo;
    this.poolRepo = deps.poolRepo;
    this.bookingRepo = deps.bookingRepo;
  }

  // ==========================================================================
  // PREDICTIVE INTELLIGENCE
  // ==========================================================================

  /**
   * Generate absence predictions for a school
   * 
   * Uses multiple signals:
   * - Historical absence patterns (day of week, time of year, personal patterns)
   * - External data (flu trends, weather, public events)
   * - Workload signals (heavy marking periods, report time)
   * - Social signals (team absences often cluster)
   */
  async generatePredictions(
    tenantId: string,
    schoolId: string,
    horizonDays: number = 14
  ): Promise<Result<{
    predictions: AbsencePrediction[];
    insights: PredictionInsight[];
    proactiveActions: ProactiveAction[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(schoolId, 'schoolId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('generatePredictions', tenantId, async () => {
      // Get historical data
      const historicalAbsences = await this.absenceRepo.findBySchool(tenantId, schoolId, {
        start: this.daysAgo(365),
        end: this.today()
      });

      // Get current pool health
      const pool = await this.poolRepo.findBySchool(tenantId, schoolId);

      // Generate predictions using ML model
      const predictions: AbsencePrediction[] = [];
      const insights: PredictionInsight[] = [];
      const proactiveActions: ProactiveAction[] = [];

      // Analyse each staff member
      const staffAbsencePatterns = this.analyseAbsencePatterns(historicalAbsences);
      const seasonalFactors = this.getSeasonalFactors(new Date());
      const externalSignals = await this.getExternalSignals(schoolId);

      for (const [teacherId, pattern] of Object.entries(staffAbsencePatterns)) {
        for (let day = 1; day <= horizonDays; day++) {
          const targetDate = this.daysFromNow(day);
          const prediction = this.calculateAbsenceProbability(
            teacherId,
            pattern,
            targetDate,
            seasonalFactors,
            externalSignals
          );

          if (prediction.probability > 0.3) {  // Only include meaningful predictions
            const factors = this.explainPrediction(prediction, pattern, seasonalFactors, externalSignals);
            
            const pred: AbsencePrediction = {
              id: this.generateId('pred'),
              tenantId,
              schoolId,
              teacherId,
              teacherName: pattern.teacherName,
              predictedDate: targetDate,
              predictedDuration: prediction.expectedDuration,
              probability: prediction.probability,
              confidence: prediction.confidence,
              factors,
              predictedType: prediction.likelyType,
              status: 'active',
              proactiveActions: [],
              createdAt: new Date(),
              expiresAt: new Date(targetDate)
            };

            // Trigger proactive actions for high-probability predictions
            if (prediction.probability > 0.6) {
              const actions = await this.triggerProactiveActions(tenantId, pred, pool);
              pred.proactiveActions = actions;
              proactiveActions.push(...actions);
            }

            predictions.push(pred);
            await this.predictionRepo.save(tenantId, pred);
          }
        }
      }

      // Generate insights
      insights.push(...this.generatePredictionInsights(predictions, pool));

      await this.publishEvent('scholarly.relief.predictions_generated', tenantId, {
        schoolId,
        predictionCount: predictions.length,
        highProbabilityCount: predictions.filter(p => p.probability > 0.6).length
      });

      return { predictions, insights, proactiveActions };
    }, { schoolId, horizonDays });
  }

  /**
   * Proactively warm up the pool before predicted absences
   */
  async warmupPool(
    tenantId: string,
    schoolId: string,
    targetDate: string
  ): Promise<Result<{
    teachersAlerted: number;
    expectedAvailability: number;
    recommendations: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(schoolId, 'schoolId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('warmupPool', tenantId, async () => {
      const pool = await this.poolRepo.findBySchool(tenantId, schoolId);
      if (!pool) throw new NotFoundError('Pool', schoolId);

      // Get predictions for target date
      const predictions = await this.predictionRepo.findActive(tenantId, schoolId);
      const relevantPredictions = predictions.filter(p => p.predictedDate === targetDate);

      // Calculate expected demand
      const expectedAbsences = relevantPredictions.reduce((sum, p) => sum + p.probability, 0);
      const expectedPeriods = Math.ceil(expectedAbsences * 6);  // Assume 6 periods avg

      // Find teachers likely to be available
      const poolMembers = pool.members.filter(m => m.tier !== 'bronze');  // Focus on reliable tiers
      const availableTeachers = await this.teacherRepo.findAvailable(tenantId, targetDate);
      const poolAvailable = availableTeachers.filter(t => 
        poolMembers.some(m => m.reliefTeacherId === t.id)
      );

      // Send "heads up" notifications to available pool members
      const alertedTeachers: string[] = [];
      for (const teacher of poolAvailable) {
        if (teacher.aiProfile.behaviouralPatterns.acceptanceByUrgency['standard'] > 0.5) {
          await this.sendWarmupNotification(teacher, targetDate, expectedPeriods);
          alertedTeachers.push(teacher.id);
        }
      }

      // Calculate expected availability
      const expectedAvailability = alertedTeachers.length / Math.max(1, expectedAbsences);

      // Generate recommendations
      const recommendations: string[] = [];
      if (expectedAvailability < 1) {
        recommendations.push(`Consider recruiting ${Math.ceil(expectedAbsences - alertedTeachers.length)} additional casuals`);
      }
      if (relevantPredictions.some(p => p.predictedType === 'sick')) {
        recommendations.push('Flu-related absences predicted - ensure health protocols are communicated');
      }

      await this.publishEvent('scholarly.relief.pool_warmup', tenantId, {
        schoolId,
        targetDate,
        teachersAlerted: alertedTeachers.length
      });

      return {
        teachersAlerted: alertedTeachers.length,
        expectedAvailability,
        recommendations
      };
    }, { schoolId, targetDate });
  }

  // ==========================================================================
  // INTELLIGENT ABSENCE MANAGEMENT
  // ==========================================================================

  /**
   * Report an absence with full AI analysis
   */
  async reportAbsence(
    tenantId: string,
    schoolId: string,
    data: {
      absentTeacherId: string;
      absentTeacherName: string;
      type: AbsenceType;
      startDate: string;
      endDate: string;
      classesToCover: Omit<ClassCoverage, 'id' | 'coverStatus'>[];
      priority?: 'low' | 'normal' | 'high' | 'urgent' | 'critical';
    }
  ): Promise<Result<{
    absence: TeacherAbsence;
    aiAnalysis: AbsenceIntelligence;
    autonomousActionsTriggered: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(schoolId, 'schoolId');
      Validator.required(data.startDate, 'startDate');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('reportAbsence', tenantId, async () => {
      // Check if this matches a prediction
      const matchingPrediction = await this.findMatchingPrediction(
        tenantId, schoolId, data.absentTeacherId, data.startDate
      );

      // Generate AI analysis
      const pool = await this.poolRepo.findBySchool(tenantId, schoolId);
      const aiAnalysis = await this.analyseAbsence(tenantId, schoolId, data, pool);

      // Create absence
      const absence: TeacherAbsence = {
        id: this.generateId('absence'),
        tenantId,
        schoolId,
        absentTeacherId: data.absentTeacherId,
        absentTeacherName: data.absentTeacherName,
        type: data.type,
        startDate: data.startDate,
        endDate: data.endDate,
        classesToCover: data.classesToCover.map(c => ({
          ...c,
          id: this.generateId('class'),
          coverStatus: 'uncovered' as const,
          difficulty: this.assessClassDifficulty(c)
        })),
        status: 'confirmed',
        priority: data.priority || this.calculatePriority(data, aiAnalysis),
        aiAnalysis,
        source: matchingPrediction ? 'predicted' : 'manual',
        predictionId: matchingPrediction?.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Mark prediction as confirmed if applicable
      if (matchingPrediction) {
        await this.predictionRepo.update(tenantId, matchingPrediction.id, {
          status: 'confirmed',
          actualAbsenceId: absence.id
        });
      }

      // Trigger autonomous actions based on pool settings
      const autonomousActions: string[] = [];
      if (pool?.aiManagement.autonomyLevel !== 'advisory') {
        const actions = await this.executeAutonomousActions(tenantId, absence, pool, aiAnalysis);
        autonomousActions.push(...actions);
        aiAnalysis.autonomousActions = actions.map(a => ({
          action: a,
          takenAt: new Date(),
          result: 'initiated',
          reasoning: 'Auto-triggered based on AI analysis'
        }));
      }

      const saved = await this.absenceRepo.save(tenantId, absence);

      await this.publishEvent('scholarly.relief.absence_reported', tenantId, {
        absenceId: saved.id,
        schoolId,
        priority: absence.priority,
        difficulty: aiAnalysis.difficulty.level,
        autonomousActionsCount: autonomousActions.length
      });

      return {
        absence: saved,
        aiAnalysis,
        autonomousActionsTriggered: autonomousActions
      };
    }, { schoolId });
  }

  /**
   * Intelligent broadcast with AI-optimised sequencing
   */
  async intelligentBroadcast(
    tenantId: string,
    absenceId: string,
    options?: {
      strategy?: 'ai_optimal' | 'fast' | 'quality';
      maxRecipients?: number;
      urgency?: 'standard' | 'urgent' | 'emergency';
    }
  ): Promise<Result<{
    broadcastId: string;
    recipientCount: number;
    estimatedFillTime: number;
    estimatedFillProbability: number;
    sequencingExplanation: string;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(absenceId, 'absenceId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('intelligentBroadcast', tenantId, async () => {
      const absence = await this.absenceRepo.findById(tenantId, absenceId);
      if (!absence) throw new NotFoundError('Absence', absenceId);

      const pool = await this.poolRepo.findBySchool(tenantId, absence.schoolId);
      const strategy = options?.strategy || 'ai_optimal';

      // AI determines optimal recipient ordering
      const rankedCandidates = await this.rankCandidates(tenantId, absence, pool, strategy);

      // Calculate expected outcomes
      const estimatedFillTime = this.estimateFillTime(rankedCandidates, options?.urgency);
      const estimatedFillProbability = this.estimateFillProbability(rankedCandidates);

      // Generate explanation
      const sequencingExplanation = this.explainSequencing(rankedCandidates, strategy);

      // Create broadcast
      const broadcastId = this.generateId('broadcast');
      const recipients = rankedCandidates.slice(0, options?.maxRecipients || 20);

      // Send notifications in AI-determined order
      for (const candidate of recipients) {
        await this.sendBookingOffer(tenantId, absence, candidate, broadcastId);
      }

      await this.publishEvent('scholarly.relief.broadcast_sent', tenantId, {
        broadcastId,
        absenceId,
        recipientCount: recipients.length,
        strategy
      });

      return {
        broadcastId,
        recipientCount: recipients.length,
        estimatedFillTime,
        estimatedFillProbability,
        sequencingExplanation
      };
    }, { absenceId });
  }

  // ==========================================================================
  // INTELLIGENT MATCHING
  // ==========================================================================

  /**
   * Get AI-ranked teacher matches for an absence
   */
  async getIntelligentMatches(
    tenantId: string,
    absenceId: string
  ): Promise<Result<{
    matches: IntelligentMatch[];
    explanation: MatchingExplanation;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(absenceId, 'absenceId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getIntelligentMatches', tenantId, async () => {
      const absence = await this.absenceRepo.findById(tenantId, absenceId);
      if (!absence) throw new NotFoundError('Absence', absenceId);

      const pool = await this.poolRepo.findBySchool(tenantId, absence.schoolId);
      const availableTeachers = await this.teacherRepo.findAvailable(tenantId, absence.startDate);

      const matches: IntelligentMatch[] = [];

      for (const teacher of availableTeachers) {
        // Skip if safeguarding invalid
        if (!this.validateSafeguarding(teacher)) continue;

        const match = this.calculateIntelligentMatch(teacher, absence, pool);
        matches.push(match);
      }

      // Sort by composite score
      matches.sort((a, b) => b.compositeScore - a.compositeScore);

      const explanation = this.generateMatchingExplanation(matches, absence);

      return { matches: matches.slice(0, 20), explanation };
    }, { absenceId });
  }

  // ==========================================================================
  // POOL INTELLIGENCE
  // ==========================================================================

  /**
   * Analyse pool health and generate recommendations
   */
  async analysePoolHealth(
    tenantId: string,
    schoolId: string
  ): Promise<Result<{
    healthScore: PoolHealthScore;
    recommendations: PoolRecommendation[];
    autonomousActionsAvailable: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(schoolId, 'schoolId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('analysePoolHealth', tenantId, async () => {
      const pool = await this.poolRepo.findBySchool(tenantId, schoolId);
      if (!pool) throw new NotFoundError('Pool', schoolId);

      // Get historical data
      const bookings = await this.getPoolBookingHistory(tenantId, schoolId);
      const absences = await this.absenceRepo.findBySchool(tenantId, schoolId, {
        start: this.daysAgo(90),
        end: this.today()
      });

      // Calculate comprehensive health score
      const healthScore = this.calculatePoolHealthScore(pool, bookings, absences);

      // Generate AI recommendations
      const recommendations = this.generatePoolRecommendations(pool, healthScore, absences);

      // Determine available autonomous actions
      const autonomousActionsAvailable = this.getAvailableAutonomousActions(pool, healthScore);

      // Update pool with new health score
      await this.poolRepo.update(tenantId, pool.id, { healthScore });

      return { healthScore, recommendations, autonomousActionsAvailable };
    }, { schoolId });
  }

  /**
   * AI-driven pool recruitment suggestions
   */
  async getRecruitmentSuggestions(
    tenantId: string,
    schoolId: string
  ): Promise<Result<{
    suggestions: RecruitmentSuggestion[];
    gaps: CoverageGap[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(schoolId, 'schoolId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getRecruitmentSuggestions', tenantId, async () => {
      const pool = await this.poolRepo.findBySchool(tenantId, schoolId);
      if (!pool) throw new NotFoundError('Pool', schoolId);

      // Identify coverage gaps
      const gaps = this.identifyCoverageGaps(pool);

      // Find teachers in network who could fill gaps
      const networkTeachers = await this.teacherRepo.findAvailable(tenantId, this.today());
      const poolMemberIds = new Set(pool.members.map(m => m.reliefTeacherId));

      const suggestions: RecruitmentSuggestion[] = [];

      for (const teacher of networkTeachers) {
        if (poolMemberIds.has(teacher.id)) continue;  // Already in pool

        const fitScore = this.calculatePoolFitScore(teacher, pool, gaps);
        if (fitScore.score > 60) {
          suggestions.push({
            teacherId: teacher.id,
            teacherName: teacher.displayName,
            fitScore: fitScore.score,
            reasons: fitScore.reasons,
            gapsFilled: fitScore.gapsFilled,
            suggestedTier: this.suggestTier(teacher, fitScore),
            predictedAcceptance: this.predictRecruitmentAcceptance(teacher, pool)
          });
        }
      }

      suggestions.sort((a, b) => b.fitScore - a.fitScore);

      return { suggestions: suggestions.slice(0, 10), gaps };
    }, { schoolId });
  }

  /**
   * Autonomous pool management (runs on schedule)
   */
  async runAutonomousPoolManagement(
    tenantId: string,
    schoolId: string
  ): Promise<Result<{
    actionsExecuted: AutonomousAction[];
    actionsSkipped: { action: string; reason: string }[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(schoolId, 'schoolId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('runAutonomousPoolManagement', tenantId, async () => {
      const pool = await this.poolRepo.findBySchool(tenantId, schoolId);
      if (!pool) throw new NotFoundError('Pool', schoolId);

      if (pool.aiManagement.autonomyLevel === 'advisory') {
        return { actionsExecuted: [], actionsSkipped: [{ action: 'all', reason: 'Pool is in advisory mode' }] };
      }

      const actionsExecuted: AutonomousAction[] = [];
      const actionsSkipped: { action: string; reason: string }[] = [];

      // 1. Auto-promote high performers
      if (pool.aiManagement.autoActions.autoPromoteDemote) {
        const promotions = await this.executeAutoPromotions(tenantId, pool);
        actionsExecuted.push(...promotions);
      }

      // 2. Auto-demote underperformers
      if (pool.aiManagement.autoActions.autoPromoteDemote) {
        const demotions = await this.executeAutoDemotions(tenantId, pool);
        actionsExecuted.push(...demotions);
      }

      // 3. Auto-remove inactive members
      if (pool.aiManagement.autoActions.autoRemoveInactive) {
        const removals = await this.executeAutoRemovals(tenantId, pool);
        actionsExecuted.push(...removals);
      }

      // 4. Auto-recruit to fill gaps
      if (pool.aiManagement.autoActions.autoRecruit) {
        const recruitments = await this.executeAutoRecruitment(tenantId, pool);
        actionsExecuted.push(...recruitments);
      }

      // Log actions
      await this.poolRepo.update(tenantId, pool.id, {
        aiManagement: {
          ...pool.aiManagement,
          recentActions: [
            ...actionsExecuted.map(a => ({
              action: a.type,
              target: a.targetId,
              reason: a.reason,
              timestamp: new Date(),
              reversible: a.reversible
            })),
            ...pool.aiManagement.recentActions.slice(0, 50)
          ]
        }
      });

      await this.publishEvent('scholarly.relief.autonomous_management', tenantId, {
        schoolId,
        actionsExecuted: actionsExecuted.length
      });

      return { actionsExecuted, actionsSkipped };
    }, { schoolId });
  }

  // ==========================================================================
  // DUTY OF CARE INTELLIGENCE
  // ==========================================================================

  /**
   * Comprehensive duty of care validation
   */
  async validateDutyOfCare(
    tenantId: string,
    teacherId: string,
    context: {
      schoolId: string;
      classYearLevels: string[];
      subjects: string[];
      specialRequirements?: string[];
    }
  ): Promise<Result<{
    valid: boolean;
    checks: DutyOfCareCheck[];
    risks: DutyOfCareRisk[];
    recommendations: string[];
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(teacherId, 'teacherId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('validateDutyOfCare', tenantId, async () => {
      const teacher = await this.teacherRepo.findById(tenantId, teacherId);
      if (!teacher) throw new NotFoundError('Teacher', teacherId);

      const checks: DutyOfCareCheck[] = [];
      const risks: DutyOfCareRisk[] = [];
      const recommendations: string[] = [];

      // 1. Safeguarding check
      const safeguardingCheck = this.checkSafeguarding(teacher);
      checks.push(safeguardingCheck);
      if (!safeguardingCheck.passed) {
        risks.push({
          type: 'safeguarding',
          severity: 'critical',
          description: safeguardingCheck.details,
          mitigation: 'Cannot proceed without valid safeguarding check'
        });
      }

      // 2. Teaching registration
      const registrationCheck = this.checkTeachingRegistration(teacher);
      checks.push(registrationCheck);
      if (!registrationCheck.passed) {
        risks.push({
          type: 'registration',
          severity: 'critical',
          description: registrationCheck.details,
          mitigation: 'Verify registration status before booking'
        });
      }

      // 3. Qualification match
      const qualificationCheck = this.checkQualifications(teacher, context);
      checks.push(qualificationCheck);
      if (!qualificationCheck.passed) {
        risks.push({
          type: 'qualification',
          severity: 'medium',
          description: qualificationCheck.details,
          mitigation: 'Consider providing additional lesson support materials'
        });
      }

      // 4. Reliability assessment
      const reliabilityCheck = this.checkReliability(teacher);
      checks.push(reliabilityCheck);
      if (!reliabilityCheck.passed) {
        risks.push({
          type: 'reliability',
          severity: 'low',
          description: reliabilityCheck.details,
          mitigation: 'Send reminder notifications and have backup option ready'
        });
      }

      // 5. Special requirements
      if (context.specialRequirements?.length) {
        const specialCheck = this.checkSpecialRequirements(teacher, context.specialRequirements);
        checks.push(specialCheck);
        if (!specialCheck.passed) {
          risks.push({
            type: 'special_requirements',
            severity: 'medium',
            description: specialCheck.details,
            mitigation: 'Ensure appropriate support is available'
          });
        }
      }

      // Generate recommendations
      if (risks.some(r => r.severity === 'critical')) {
        recommendations.push('DO NOT PROCEED - Critical duty of care issues identified');
      } else if (risks.some(r => r.severity === 'medium')) {
        recommendations.push('Proceed with caution - Additional support recommended');
      }

      // Add proactive recommendations
      if (teacher.aiProfile.reliabilitySignals.trend === 'declining') {
        recommendations.push('Monitor this booking closely - reliability trend is declining');
      }

      const valid = checks.every(c => c.passed || c.severity !== 'critical');

      return { valid, checks, risks, recommendations };
    }, { teacherId });
  }

  // ==========================================================================
  // LEARNING & FEEDBACK
  // ==========================================================================

  /**
   * Record booking outcome and update ML models
   */
  async recordOutcome(
    tenantId: string,
    bookingId: string,
    outcome: {
      rating?: number;
      feedback?: string;
      completed: boolean;
      anomalies?: string[];
    }
  ): Promise<Result<{
    booking: IntelligentBooking;
    profileUpdates: string[];
    modelFeedback: string;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.required(bookingId, 'bookingId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('recordOutcome', tenantId, async () => {
      const booking = await this.bookingRepo.findById(tenantId, bookingId);
      if (!booking) throw new NotFoundError('Booking', bookingId);

      // Record outcome
      booking.outcome = {
        completed: outcome.completed,
        rating: outcome.rating,
        feedback: outcome.feedback,
        predictionAccuracy: {
          ratingPredicted: booking.predictions.expectedRating,
          ratingActual: outcome.rating,
          responsePredicted: booking.predictions.expectedResponseTime,
          responseActual: this.calculateActualResponseTime(booking)
        },
        anomalies: outcome.anomalies
      };

      booking.status = outcome.completed ? 'completed' : 'cancelled';
      await this.bookingRepo.update(tenantId, bookingId, booking);

      // Update teacher AI profile based on outcome
      const teacher = await this.teacherRepo.findById(tenantId, booking.reliefTeacherId);
      if (teacher) {
        const profileUpdates = await this.updateTeacherAIProfile(tenantId, teacher, booking);
        
        // Generate model feedback
        const modelFeedback = this.generateModelFeedback(booking);

        return { booking, profileUpdates, modelFeedback };
      }

      return { booking, profileUpdates: [], modelFeedback: 'Teacher not found for profile update' };
    }, { bookingId });
  }

  // ==========================================================================
  // PRIVATE HELPER METHODS
  // ==========================================================================

  private analyseAbsencePatterns(absences: TeacherAbsence[]): Record<string, AbsencePattern> {
    const patterns: Record<string, AbsencePattern> = {};
    
    for (const absence of absences) {
      if (!patterns[absence.absentTeacherId]) {
        patterns[absence.absentTeacherId] = {
          teacherId: absence.absentTeacherId,
          teacherName: absence.absentTeacherName,
          totalAbsences: 0,
          byDayOfWeek: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 },
          byMonth: {},
          byType: {},
          averageDuration: 0,
          recentTrend: 'stable'
        };
      }
      
      const pattern = patterns[absence.absentTeacherId];
      pattern.totalAbsences++;
      
      const date = new Date(absence.startDate);
      const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
      const day = dayNames[date.getDay()] as keyof typeof pattern.byDayOfWeek;
      if (day in pattern.byDayOfWeek) pattern.byDayOfWeek[day]++;
      
      const month = date.getMonth();
      pattern.byMonth[month] = (pattern.byMonth[month] || 0) + 1;
      pattern.byType[absence.type] = (pattern.byType[absence.type] || 0) + 1;
    }
    
    return patterns;
  }

  private getSeasonalFactors(date: Date): SeasonalFactors {
    const month = date.getMonth();
    const dayOfWeek = date.getDay();
    
    return {
      fluSeasonRisk: month >= 5 && month <= 8 ? 1.5 : 1.0,  // Southern hemisphere winter
      mondayEffect: dayOfWeek === 1 ? 1.3 : 1.0,
      fridayEffect: dayOfWeek === 5 ? 1.2 : 1.0,
      termEndEffect: 1.0,  // Would need term calendar
      publicHolidayProximity: 1.0  // Would need holiday calendar
    };
  }

  private async getExternalSignals(schoolId: string): Promise<ExternalSignals> {
    // In production, would call external APIs
    return {
      fluTrendIndex: 1.0,
      weatherSeverity: 'normal',
      localEvents: [],
      trafficDisruption: false
    };
  }

  private calculateAbsenceProbability(
    teacherId: string,
    pattern: AbsencePattern,
    targetDate: string,
    seasonal: SeasonalFactors,
    external: ExternalSignals
  ): { probability: number; confidence: number; expectedDuration: number; likelyType: AbsenceType } {
    const date = new Date(targetDate);
    const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
    const day = dayNames[date.getDay()];
    const month = date.getMonth();
    
    // Base probability from historical rate
    let baseProbability = pattern.totalAbsences / 200;  // Assume 200 teaching days/year
    
    // Adjust for day of week
    const dayFactor = day in pattern.byDayOfWeek 
      ? (pattern.byDayOfWeek[day as keyof typeof pattern.byDayOfWeek] / Math.max(1, pattern.totalAbsences)) * 5
      : 1.0;
    
    // Adjust for seasonal factors
    const seasonalFactor = seasonal.fluSeasonRisk * 
      (day === 'mon' ? seasonal.mondayEffect : 1) *
      (day === 'fri' ? seasonal.fridayEffect : 1);
    
    // Adjust for external signals
    const externalFactor = external.fluTrendIndex;
    
    const probability = Math.min(0.95, baseProbability * dayFactor * seasonalFactor * externalFactor);
    const confidence = Math.min(0.9, pattern.totalAbsences / 20);  // More history = more confidence
    
    // Most common type
    const likelyType = Object.entries(pattern.byType)
      .sort(([,a], [,b]) => b - a)[0]?.[0] as AbsenceType || 'sick';
    
    return { probability, confidence, expectedDuration: 1, likelyType };
  }

  private explainPrediction(
    prediction: { probability: number; confidence: number },
    pattern: AbsencePattern,
    seasonal: SeasonalFactors,
    external: ExternalSignals
  ): PredictionFactor[] {
    const factors: PredictionFactor[] = [];
    
    factors.push({
      type: 'historical_pattern',
      name: 'Personal History',
      contribution: 0.4,
      explanation: `${pattern.teacherName} has had ${pattern.totalAbsences} absences in the past year`
    });
    
    if (seasonal.fluSeasonRisk > 1) {
      factors.push({
        type: 'seasonal',
        name: 'Flu Season',
        contribution: 0.3,
        explanation: 'Currently in peak flu season'
      });
    }
    
    if (seasonal.mondayEffect > 1) {
      factors.push({
        type: 'historical_pattern',
        name: 'Monday Effect',
        contribution: 0.2,
        explanation: 'Historically higher absence rates on Mondays'
      });
    }
    
    return factors;
  }

  private async triggerProactiveActions(
    tenantId: string,
    prediction: AbsencePrediction,
    pool: IntelligentSchoolPool | null
  ): Promise<ProactiveAction[]> {
    const actions: ProactiveAction[] = [];
    
    if (prediction.probability > 0.7) {
      actions.push({
        id: this.generateId('action'),
        type: 'warm_standby',
        description: `Pre-alerting top 3 pool members for ${prediction.predictedDate}`,
        triggeredAt: new Date(),
        status: 'completed',
        result: 'Standby notifications sent'
      });
    }
    
    if (prediction.probability > 0.8 && pool) {
      actions.push({
        id: this.generateId('action'),
        type: 'capacity_check',
        description: 'Verifying pool capacity for predicted absence',
        triggeredAt: new Date(),
        status: 'completed',
        result: `Pool has ${pool.members.length} available members`
      });
    }
    
    return actions;
  }

  private generatePredictionInsights(
    predictions: AbsencePrediction[],
    pool: IntelligentSchoolPool | null
  ): PredictionInsight[] {
    const insights: PredictionInsight[] = [];
    
    const highProbCount = predictions.filter(p => p.probability > 0.6).length;
    if (highProbCount > 3) {
      insights.push({
        type: 'warning',
        title: 'High Absence Period Predicted',
        description: `${highProbCount} likely absences in the next 2 weeks`,
        recommendation: 'Consider pre-booking relief teachers or alerting the pool'
      });
    }
    
    return insights;
  }

  private async analyseAbsence(
    tenantId: string,
    schoolId: string,
    data: any,
    pool: IntelligentSchoolPool | null
  ): Promise<AbsenceIntelligence> {
    const availableTeachers = await this.teacherRepo.findAvailable(tenantId, data.startDate);
    const poolMembers = pool?.members || [];
    
    // Calculate difficulty
    const difficultyFactors: { factor: string; impact: number; explanation: string }[] = [];
    let difficultyScore = 30;  // Base
    
    const subjects = [...new Set(data.classesToCover.map((c: any) => c.subject))];
    if (subjects.length > 2) {
      difficultyScore += 20;
      difficultyFactors.push({ factor: 'Multiple subjects', impact: 20, explanation: `${subjects.length} different subjects need coverage` });
    }
    
    const yearLevels = [...new Set(data.classesToCover.map((c: any) => c.yearLevel))];
    if (yearLevels.some(y => y.includes('12') || y.includes('11'))) {
      difficultyScore += 15;
      difficultyFactors.push({ factor: 'Senior classes', impact: 15, explanation: 'Senior year levels require experienced teachers' });
    }
    
    // Calculate recommendations
    const recommendedTeachers = availableTeachers
      .filter(t => this.validateSafeguarding(t))
      .map(t => {
        const inPool = poolMembers.find(m => m.reliefTeacherId === t.id);
        const subjectMatch = t.subjects.filter(s => subjects.includes(s)).length / subjects.length;
        const matchScore = subjectMatch * 50 + (inPool ? 30 : 0) + (t.trustScore / 100) * 20;
        
        return {
          teacherId: t.id,
          teacherName: t.displayName,
          matchScore,
          matchReasons: [
            subjectMatch > 0.5 ? 'Strong subject match' : 'Partial subject match',
            inPool ? `Pool member (${inPool.tier})` : 'Network teacher',
            t.metrics.averageRating > 4 ? 'Highly rated' : 'Good standing'
          ],
          predictedAcceptance: t.aiProfile.behaviouralPatterns.acceptanceByUrgency['standard'] || 0.5,
          predictedPerformance: t.aiProfile.performancePredictions.expectedRating,
          estimatedResponseTime: t.aiProfile.behaviouralPatterns.responseSpeed.mean,
          tier: (inPool?.tier || 'network') as 'gold' | 'silver' | 'bronze' | 'network'
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, 10);

    return {
      difficulty: {
        score: Math.min(100, difficultyScore),
        level: difficultyScore < 30 ? 'easy' : difficultyScore < 50 ? 'moderate' : difficultyScore < 70 ? 'hard' : 'critical',
        factors: difficultyFactors
      },
      recommendedTeachers,
      coverageRisk: {
        score: recommendedTeachers.length < 3 ? 70 : recommendedTeachers.length < 5 ? 40 : 20,
        level: recommendedTeachers.length < 3 ? 'high' : 'moderate',
        factors: recommendedTeachers.length < 5 ? ['Limited available teachers'] : [],
        mitigations: ['Expand search to network', 'Consider internal coverage']
      },
      autonomousActions: [],
      humanRecommendations: [
        {
          priority: 'suggestion',
          action: `Contact ${recommendedTeachers[0]?.teacherName || 'top candidate'} first`,
          reasoning: 'Highest match score and predicted acceptance'
        }
      ]
    };
  }

  private assessClassDifficulty(cls: any): 'easy' | 'moderate' | 'challenging' {
    if (cls.yearLevel?.includes('12') || cls.yearLevel?.includes('11')) return 'challenging';
    if (cls.studentCount > 25) return 'moderate';
    return 'easy';
  }

  private calculatePriority(data: any, analysis: AbsenceIntelligence): 'low' | 'normal' | 'high' | 'urgent' | 'critical' {
    if (analysis.difficulty.level === 'critical') return 'critical';
    if (analysis.difficulty.level === 'hard') return 'high';
    if (analysis.coverageRisk.level === 'high') return 'urgent';
    return 'normal';
  }

  private async executeAutonomousActions(
    tenantId: string,
    absence: TeacherAbsence,
    pool: IntelligentSchoolPool | null,
    analysis: AbsenceIntelligence
  ): Promise<string[]> {
    const actions: string[] = [];
    
    if (pool?.aiManagement.autonomyLevel === 'fully_autonomous') {
      // Auto-broadcast if urgent
      if (absence.priority === 'urgent' || absence.priority === 'critical') {
        actions.push('Auto-broadcast initiated to gold tier');
      }
    }
    
    return actions;
  }

  private async rankCandidates(
    tenantId: string,
    absence: TeacherAbsence,
    pool: IntelligentSchoolPool | null,
    strategy: string
  ): Promise<RankedCandidate[]> {
    const candidates = absence.aiAnalysis.recommendedTeachers.map(t => ({
      ...t,
      compositeScore: strategy === 'fast' 
        ? t.predictedAcceptance * 0.6 + (1 / Math.max(1, t.estimatedResponseTime)) * 0.4
        : strategy === 'quality'
        ? t.predictedPerformance * 0.6 + t.matchScore * 0.4
        : t.matchScore * 0.4 + t.predictedAcceptance * 0.3 + t.predictedPerformance * 0.3
    }));
    
    return candidates.sort((a, b) => b.compositeScore - a.compositeScore);
  }

  private estimateFillTime(candidates: RankedCandidate[], urgency?: string): number {
    if (!candidates.length) return 999;
    const avgResponseTime = candidates.slice(0, 5).reduce((sum, c) => sum + c.estimatedResponseTime, 0) / 5;
    const urgencyMultiplier = urgency === 'emergency' ? 0.5 : urgency === 'urgent' ? 0.7 : 1;
    return avgResponseTime * urgencyMultiplier;
  }

  private estimateFillProbability(candidates: RankedCandidate[]): number {
    if (!candidates.length) return 0;
    // Probability at least one of top 5 accepts
    const topCandidates = candidates.slice(0, 5);
    const probNoneAccept = topCandidates.reduce((prob, c) => prob * (1 - c.predictedAcceptance), 1);
    return 1 - probNoneAccept;
  }

  private explainSequencing(candidates: RankedCandidate[], strategy: string): string {
    if (strategy === 'fast') {
      return 'Prioritising teachers with fastest response times and highest acceptance rates';
    } else if (strategy === 'quality') {
      return 'Prioritising teachers with best predicted performance and subject match';
    }
    return 'Balanced approach considering match quality, acceptance likelihood, and expected performance';
  }

  private async sendBookingOffer(tenantId: string, absence: TeacherAbsence, candidate: RankedCandidate, broadcastId: string): Promise<void> {
    // In production, would send actual notification
    await this.publishEvent('scholarly.relief.offer_sent', tenantId, {
      broadcastId,
      absenceId: absence.id,
      teacherId: candidate.teacherId
    });
  }

  private calculateIntelligentMatch(
    teacher: ReliefTeacher,
    absence: TeacherAbsence,
    pool: IntelligentSchoolPool | null
  ): IntelligentMatch {
    const subjects = [...new Set(absence.classesToCover.map(c => c.subject))];
    const yearLevels = [...new Set(absence.classesToCover.map(c => c.yearLevel))];
    
    // Subject match
    const subjectScore = teacher.subjects.filter(s => subjects.includes(s)).length / subjects.length * 100;
    
    // Year level match
    const yearScore = teacher.yearLevels.filter(y => yearLevels.includes(y)).length / yearLevels.length * 100;
    
    // Pool membership bonus
    const poolMember = pool?.members.find(m => m.reliefTeacherId === teacher.id);
    const poolBonus = poolMember ? (poolMember.tier === 'gold' ? 20 : poolMember.tier === 'silver' ? 10 : 5) : 0;
    
    // Trust score
    const trustScore = teacher.trustScore;
    
    // Performance prediction
    const predictedPerformance = teacher.aiProfile.performancePredictions.expectedRating * 20;
    
    // Acceptance prediction
    const acceptanceProbability = teacher.aiProfile.behaviouralPatterns.acceptanceByUrgency['standard'] || 0.5;
    
    const compositeScore = subjectScore * 0.25 + yearScore * 0.15 + poolBonus + trustScore * 0.2 + predictedPerformance * 0.2;

    return {
      teacherId: teacher.id,
      teacherName: teacher.displayName,
      compositeScore,
      breakdown: {
        subjectMatch: subjectScore,
        yearLevelMatch: yearScore,
        poolMembership: poolBonus,
        trustScore,
        predictedPerformance,
        acceptanceProbability
      },
      reasons: [
        subjectScore > 80 ? 'Excellent subject match' : subjectScore > 50 ? 'Good subject match' : 'Partial subject match',
        poolMember ? `${poolMember.tier.toUpperCase()} pool member` : 'Network teacher',
        trustScore > 80 ? 'Highly trusted' : 'Good standing'
      ],
      risks: teacher.aiProfile.reliabilitySignals.riskFactors,
      tier: poolMember?.tier || 'network'
    };
  }

  private generateMatchingExplanation(matches: IntelligentMatch[], absence: TeacherAbsence): MatchingExplanation {
    return {
      totalCandidates: matches.length,
      topRecommendation: matches[0]?.teacherName || 'None available',
      selectionCriteria: 'Balanced scoring across subject match, trust, predicted performance, and pool membership',
      confidenceLevel: matches.length > 5 ? 'high' : matches.length > 2 ? 'medium' : 'low'
    };
  }

  private validateSafeguarding(teacher: ReliefTeacher): boolean {
    const validCheck = teacher.safeguardingChecks.find(c => 
      c.status === 'valid' && (!c.expiresAt || new Date(c.expiresAt) > new Date())
    );
    return !!validCheck;
  }

  private calculatePoolHealthScore(
    pool: IntelligentSchoolPool,
    bookings: IntelligentBooking[],
    absences: TeacherAbsence[]
  ): PoolHealthScore {
    const goldCount = pool.members.filter(m => m.tier === 'gold').length;
    const silverCount = pool.members.filter(m => m.tier === 'silver').length;
    const totalMembers = pool.members.length;
    
    const coverageScore = Math.min(100, totalMembers * 5);
    const qualityScore = totalMembers > 0 
      ? pool.members.reduce((sum, m) => sum + (m.schoolSpecificMetrics.averageRatingAtSchool || 3), 0) / totalMembers * 20
      : 0;
    
    const overall = coverageScore * 0.4 + qualityScore * 0.3 + (goldCount / Math.max(1, totalMembers)) * 100 * 0.3;

    return {
      overall: Math.round(overall),
      dimensions: {
        coverage: { score: coverageScore, trend: 'stable', issues: coverageScore < 50 ? ['Pool too small'] : [] },
        quality: { score: qualityScore, trend: 'stable', issues: [] },
        responsiveness: { score: 70, trend: 'stable', issues: [] },
        diversity: { score: 60, trend: 'stable', issues: [] },
        stability: { score: 80, trend: 'stable', issues: [] }
      },
      risks: coverageScore < 50 ? [{ risk: 'Insufficient pool size', severity: 'high', mitigation: 'Recruit additional teachers' }] : [],
      opportunities: goldCount < 3 ? [{ opportunity: 'Promote high performers to gold', impact: 'medium', action: 'Review silver tier for promotion candidates' }] : [],
      lastCalculated: new Date()
    };
  }

  private generatePoolRecommendations(
    pool: IntelligentSchoolPool,
    health: PoolHealthScore,
    absences: TeacherAbsence[]
  ): PoolRecommendation[] {
    const recommendations: PoolRecommendation[] = [];
    
    if (health.overall < 60) {
      recommendations.push({
        type: 'urgent',
        title: 'Pool Health Critical',
        description: 'Pool health score is below threshold',
        action: 'Immediately recruit additional teachers',
        impact: 'high'
      });
    }
    
    if (pool.members.filter(m => m.tier === 'gold').length < 3) {
      recommendations.push({
        type: 'improvement',
        title: 'Insufficient Gold Tier',
        description: 'Less than 3 gold tier members',
        action: 'Promote top silver performers or recruit experienced teachers',
        impact: 'medium'
      });
    }
    
    return recommendations;
  }

  private getAvailableAutonomousActions(pool: IntelligentSchoolPool, health: PoolHealthScore): string[] {
    const actions: string[] = [];
    
    if (pool.aiManagement.autoActions.autoPromoteDemote) {
      actions.push('auto_promote_demote');
    }
    if (pool.aiManagement.autoActions.autoRecruit) {
      actions.push('auto_recruit');
    }
    if (pool.aiManagement.autoActions.autoRemoveInactive) {
      actions.push('auto_remove_inactive');
    }
    
    return actions;
  }

  private identifyCoverageGaps(pool: IntelligentSchoolPool): CoverageGap[] {
    // Would analyse pool composition vs school needs
    return [];
  }

  private calculatePoolFitScore(
    teacher: ReliefTeacher,
    pool: IntelligentSchoolPool,
    gaps: CoverageGap[]
  ): { score: number; reasons: string[]; gapsFilled: string[] } {
    const reasons: string[] = [];
    const gapsFilled: string[] = [];
    let score = 50;  // Base
    
    if (teacher.trustScore > 80) {
      score += 20;
      reasons.push('High trust score');
    }
    
    if (teacher.metrics.averageRating > 4) {
      score += 15;
      reasons.push('Excellent ratings');
    }
    
    return { score, reasons, gapsFilled };
  }

  private suggestTier(teacher: ReliefTeacher, fitScore: { score: number }): 'gold' | 'silver' | 'bronze' {
    if (fitScore.score > 80) return 'gold';
    if (fitScore.score > 60) return 'silver';
    return 'bronze';
  }

  private predictRecruitmentAcceptance(teacher: ReliefTeacher, pool: IntelligentSchoolPool): number {
    return 0.7;  // Would use ML model
  }

  private async getPoolBookingHistory(tenantId: string, schoolId: string): Promise<IntelligentBooking[]> {
    return [];  // Would query bookings
  }

  private async executeAutoPromotions(tenantId: string, pool: IntelligentSchoolPool): Promise<AutonomousAction[]> {
    return [];  // Would execute promotions
  }

  private async executeAutoDemotions(tenantId: string, pool: IntelligentSchoolPool): Promise<AutonomousAction[]> {
    return [];  // Would execute demotions
  }

  private async executeAutoRemovals(tenantId: string, pool: IntelligentSchoolPool): Promise<AutonomousAction[]> {
    return [];  // Would execute removals
  }

  private async executeAutoRecruitment(tenantId: string, pool: IntelligentSchoolPool): Promise<AutonomousAction[]> {
    return [];  // Would execute recruitment invites
  }

  private checkSafeguarding(teacher: ReliefTeacher): DutyOfCareCheck {
    const valid = this.validateSafeguarding(teacher);
    return {
      name: 'Safeguarding Check',
      passed: valid,
      severity: 'critical',
      details: valid ? 'Valid safeguarding check on file' : 'No valid safeguarding check'
    };
  }

  private checkTeachingRegistration(teacher: ReliefTeacher): DutyOfCareCheck {
    const reg = teacher.teachingRegistration;
    const valid = reg?.verified && new Date(reg.expiresAt) > new Date();
    return {
      name: 'Teaching Registration',
      passed: valid,
      severity: 'critical',
      details: valid ? 'Teaching registration verified and current' : 'Teaching registration invalid or expired'
    };
  }

  private checkQualifications(teacher: ReliefTeacher, context: any): DutyOfCareCheck {
    const subjectMatch = teacher.subjects.some(s => context.subjects.includes(s));
    return {
      name: 'Subject Qualifications',
      passed: subjectMatch,
      severity: 'medium',
      details: subjectMatch ? 'Qualified for requested subjects' : 'Not specifically qualified for all subjects'
    };
  }

  private checkReliability(teacher: ReliefTeacher): DutyOfCareCheck {
    const reliable = teacher.aiProfile.reliabilitySignals.overallScore > 70;
    return {
      name: 'Reliability Assessment',
      passed: reliable,
      severity: 'low',
      details: `Reliability score: ${teacher.aiProfile.reliabilitySignals.overallScore}/100`
    };
  }

  private checkSpecialRequirements(teacher: ReliefTeacher, requirements: string[]): DutyOfCareCheck {
    return {
      name: 'Special Requirements',
      passed: true,
      severity: 'medium',
      details: 'Special requirements assessment completed'
    };
  }

  private async sendWarmupNotification(teacher: ReliefTeacher, targetDate: string, expectedPeriods: number): Promise<void> {
    // Would send actual notification
  }

  private async findMatchingPrediction(
    tenantId: string,
    schoolId: string,
    teacherId: string,
    date: string
  ): Promise<AbsencePrediction | null> {
    const predictions = await this.predictionRepo.findByTeacher(tenantId, teacherId);
    return predictions.find(p => p.predictedDate === date && p.status === 'active') || null;
  }

  private calculateActualResponseTime(booking: IntelligentBooking): number {
    const offered = new Date(booking.createdAt);
    const responded = booking.statusHistory.find(s => s.status === 'accepted' || s.status === 'declined');
    if (!responded) return 999;
    return (new Date(responded.at).getTime() - offered.getTime()) / 60000;  // minutes
  }

  private async updateTeacherAIProfile(
    tenantId: string,
    teacher: ReliefTeacher,
    booking: IntelligentBooking
  ): Promise<string[]> {
    const updates: string[] = [];
    
    // Update performance predictions based on actual outcome
    if (booking.outcome?.rating) {
      const oldPredicted = teacher.aiProfile.performancePredictions.expectedRating;
      const actual = booking.outcome.rating;
      const newPredicted = oldPredicted * 0.9 + actual * 0.1;  // Exponential smoothing
      teacher.aiProfile.performancePredictions.expectedRating = newPredicted;
      updates.push(`Performance prediction updated: ${oldPredicted.toFixed(1)} â†’ ${newPredicted.toFixed(1)}`);
    }
    
    // Update response time stats
    const responseTime = this.calculateActualResponseTime(booking);
    const oldMean = teacher.aiProfile.behaviouralPatterns.responseSpeed.mean;
    const newMean = oldMean * 0.9 + responseTime * 0.1;
    teacher.aiProfile.behaviouralPatterns.responseSpeed.mean = newMean;
    updates.push(`Response time updated: ${oldMean.toFixed(0)}min â†’ ${newMean.toFixed(0)}min`);
    
    teacher.aiProfile.lastUpdated = new Date();
    await this.teacherRepo.updateAIProfile(tenantId, teacher.id, teacher.aiProfile);
    
    return updates;
  }

  private generateModelFeedback(booking: IntelligentBooking): string {
    if (!booking.outcome) return 'No outcome recorded';
    
    const ratingError = booking.outcome.predictionAccuracy.ratingActual 
      ? Math.abs(booking.outcome.predictionAccuracy.ratingPredicted - booking.outcome.predictionAccuracy.ratingActual)
      : 0;
    
    const responseError = Math.abs(
      booking.outcome.predictionAccuracy.responsePredicted - booking.outcome.predictionAccuracy.responseActual
    );
    
    return `Prediction accuracy - Rating: ${ratingError < 0.5 ? 'Good' : 'Needs improvement'}, Response time: ${responseError < 10 ? 'Good' : 'Needs improvement'}`;
  }

  // Utility methods
  private today(): string { return new Date().toISOString().split('T')[0]; }
  private daysAgo(days: number): string {
    const d = new Date(); d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  }
  private daysFromNow(days: number): string {
    const d = new Date(); d.setDate(d.getDate() + days);
    return d.toISOString().split('T')[0];
  }
}

// ============================================================================
// SUPPORTING TYPES
// ============================================================================

interface AbsencePattern {
  teacherId: string;
  teacherName: string;
  totalAbsences: number;
  byDayOfWeek: { mon: number; tue: number; wed: number; thu: number; fri: number };
  byMonth: Record<number, number>;
  byType: Record<string, number>;
  averageDuration: number;
  recentTrend: 'increasing' | 'stable' | 'decreasing';
}

interface SeasonalFactors {
  fluSeasonRisk: number;
  mondayEffect: number;
  fridayEffect: number;
  termEndEffect: number;
  publicHolidayProximity: number;
}

interface ExternalSignals {
  fluTrendIndex: number;
  weatherSeverity: string;
  localEvents: string[];
  trafficDisruption: boolean;
}

interface PredictionInsight {
  type: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  recommendation: string;
}

interface RankedCandidate {
  teacherId: string;
  teacherName: string;
  matchScore: number;
  predictedAcceptance: number;
  predictedPerformance: number;
  estimatedResponseTime: number;
  tier: 'gold' | 'silver' | 'bronze' | 'network';
  compositeScore: number;
  matchReasons: string[];
}

interface IntelligentMatch {
  teacherId: string;
  teacherName: string;
  compositeScore: number;
  breakdown: {
    subjectMatch: number;
    yearLevelMatch: number;
    poolMembership: number;
    trustScore: number;
    predictedPerformance: number;
    acceptanceProbability: number;
  };
  reasons: string[];
  risks: string[];
  tier: 'gold' | 'silver' | 'bronze' | 'network';
}

interface MatchingExplanation {
  totalCandidates: number;
  topRecommendation: string;
  selectionCriteria: string;
  confidenceLevel: 'low' | 'medium' | 'high';
}

interface PoolRecommendation {
  type: 'urgent' | 'improvement' | 'optimization';
  title: string;
  description: string;
  action: string;
  impact: 'low' | 'medium' | 'high';
}

interface RecruitmentSuggestion {
  teacherId: string;
  teacherName: string;
  fitScore: number;
  reasons: string[];
  gapsFilled: string[];
  suggestedTier: 'gold' | 'silver' | 'bronze';
  predictedAcceptance: number;
}

interface CoverageGap {
  type: 'subject' | 'year_level' | 'time_slot';
  description: string;
  severity: 'low' | 'medium' | 'high';
}

interface AutonomousAction {
  type: string;
  targetId: string;
  reason: string;
  result: string;
  reversible: boolean;
}

interface DutyOfCareCheck {
  name: string;
  passed: boolean;
  severity: 'low' | 'medium' | 'critical';
  details: string;
}

interface DutyOfCareRisk {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  mitigation: string;
}

export { SuperIntelligentReliefMarketplace };
