/**
 * Attendance Service
 *
 * Captures daily presence data and transforms it into actionable intelligence
 * for early intervention. Attendance isn't just about counting who's present -
 * it's a rich signal source that reveals engagement, wellbeing, and potential
 * issues before they manifest academically.
 *
 * ## The Granny Explanation
 *
 * Remember when you were a kid and your grandmother could tell something was
 * wrong just by how you walked through the door? "You're not yourself today,"
 * she'd say, before you'd even said a word. That's what this system does with
 * attendance data.
 *
 * It notices patterns that humans miss:
 * - "Timmy's been absent every Monday for three weeks" might mean Sunday nights
 *   are hard at home, or Monday morning sport is causing anxiety.
 * - "Sarah was never late, but now she's late twice a week" might signal
 *   morning struggles, sleep issues, or avoidance.
 * - "Three kids from the same friend group are all absent today" might indicate
 *   planned truancy, social conflict, or a shared illness.
 *
 * The system doesn't just record absences - it asks "why?" and "what does this
 * mean?" and "who should know?"
 *
 * @module IntelligenceMesh/Attendance
 * @version 1.4.0
 */

import { log } from '../lib/logger';
import { ScholarlyBaseService, Result, success, failure, ScholarlyError, Validator, ValidationError, NotFoundError } from './base.service';

import {
  MeshBaseEntity, MeshStudent, AttendanceRecord, AttendanceStatus, AbsenceReason,
  AttendancePattern, PatternType, AttendanceAlert, AlertType
} from './mesh-types';

import { ATTENDANCE_EVENTS } from './mesh-events';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface AttendanceRecordRepository {
  findById(tenantId: string, id: string): Promise<AttendanceRecord | null>;
  findByStudent(tenantId: string, studentId: string, dateRange?: DateRange): Promise<AttendanceRecord[]>;
  findByDate(tenantId: string, date: Date, classGroup?: string): Promise<AttendanceRecord[]>;
  findByDateRange(tenantId: string, dateRange: DateRange, studentIds?: string[]): Promise<AttendanceRecord[]>;
  findUnexplainedAbsences(tenantId: string, daysOld?: number): Promise<AttendanceRecord[]>;
  save(tenantId: string, record: AttendanceRecord): Promise<AttendanceRecord>;
  update(tenantId: string, id: string, updates: Partial<AttendanceRecord>): Promise<AttendanceRecord>;
  bulkSave(tenantId: string, records: AttendanceRecord[]): Promise<AttendanceRecord[]>;
}

export interface DateRange {
  from: Date;
  to: Date;
}

export interface PatternRepository {
  findById(tenantId: string, id: string): Promise<AttendancePattern | null>;
  findByStudent(tenantId: string, studentId: string): Promise<AttendancePattern[]>;
  findActivePatterns(tenantId: string): Promise<AttendancePattern[]>;
  findByType(tenantId: string, patternType: PatternType): Promise<AttendancePattern[]>;
  save(tenantId: string, pattern: AttendancePattern): Promise<AttendancePattern>;
  update(tenantId: string, id: string, updates: Partial<AttendancePattern>): Promise<AttendancePattern>;
}

export interface AlertRepository {
  findById(tenantId: string, id: string): Promise<AttendanceAlert | null>;
  findByStudent(tenantId: string, studentId: string): Promise<AttendanceAlert[]>;
  findActive(tenantId: string): Promise<AttendanceAlert[]>;
  findByStatus(tenantId: string, status: AttendanceAlert['status']): Promise<AttendanceAlert[]>;
  findPendingEscalation(tenantId: string): Promise<AttendanceAlert[]>;
  save(tenantId: string, alert: AttendanceAlert): Promise<AttendanceAlert>;
  update(tenantId: string, id: string, updates: Partial<AttendanceAlert>): Promise<AttendanceAlert>;
}

export interface StudentRepository {
  findById(tenantId: string, id: string): Promise<MeshStudent | null>;
  findByClassGroup(tenantId: string, classGroup: string): Promise<MeshStudent[]>;
  findByYearLevel(tenantId: string, yearLevel: string): Promise<MeshStudent[]>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface AttendanceConfig {
  chronicAbsenteeismThreshold: number;
  consecutiveAbsenceAlertThreshold: number;
  lateArrivalAlertThreshold: number;
  lateThresholdMinutes: number;
  alertEscalationHours: number[];
  enablePatternDetection: boolean;
  patternConfidenceThreshold: number;
  autoParentNotification: boolean;
  parentNotificationDelay: number;
}

const DEFAULT_CONFIG: AttendanceConfig = {
  chronicAbsenteeismThreshold: 10,
  consecutiveAbsenceAlertThreshold: 3,
  lateArrivalAlertThreshold: 5,
  lateThresholdMinutes: 15,
  alertEscalationHours: [24, 48, 72],
  enablePatternDetection: true,
  patternConfidenceThreshold: 0.7,
  autoParentNotification: true,
  parentNotificationDelay: 30
};

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class AttendanceMeshService extends ScholarlyBaseService {
  private readonly recordRepo: AttendanceRecordRepository;
  private readonly patternRepo: PatternRepository;
  private readonly alertRepo: AlertRepository;
  private readonly studentRepo: StudentRepository;
  private readonly attendanceConfig: AttendanceConfig;

  constructor(deps: {
    recordRepo: AttendanceRecordRepository;
    patternRepo: PatternRepository;
    alertRepo: AlertRepository;
    studentRepo: StudentRepository;
    attendanceConfig?: Partial<AttendanceConfig>;
  }) {
    super('AttendanceMeshService');
    this.recordRepo = deps.recordRepo;
    this.patternRepo = deps.patternRepo;
    this.alertRepo = deps.alertRepo;
    this.studentRepo = deps.studentRepo;
    this.attendanceConfig = { ...DEFAULT_CONFIG, ...deps.attendanceConfig };
  }

  // ==========================================================================
  // ATTENDANCE MARKING
  // ==========================================================================

  /**
   * Mark attendance for a single student
   */
  async markAttendance(
    tenantId: string,
    data: {
      studentId: string;
      date: Date;
      period?: string;
      status: AttendanceStatus;
      absenceDetails?: AttendanceRecord['absenceDetails'];
      lateDetails?: AttendanceRecord['lateDetails'];
      recordedBy: string;
      recordingMethod: AttendanceRecord['recordingMethod'];
    }
  ): Promise<Result<AttendanceRecord>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.studentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'studentId is required' });
    }
    if (!data.date) {
      return failure({ code: 'VALIDATION_ERROR', message: 'date is required' });
    }
    if (!data.status) {
      return failure({ code: 'VALIDATION_ERROR', message: 'status is required' });
    }

    if (data.status === 'absent' && !data.absenceDetails) {
      data.absenceDetails = {
        reason: 'unexplained',
        verificationStatus: 'unverified',
        parentNotified: false
      };
    }

    if (data.status === 'late' && !data.lateDetails) {
      return failure({ code: 'VALIDATION_ERROR', message: 'Late details required for late status' });
    }

    return this.withTiming('markAttendance', async () => {
      const student = await this.studentRepo.findById(tenantId, data.studentId);
      if (!student) {
        throw new NotFoundError('Student', data.studentId);
      }

      const now = new Date();
      const recordId = this.generateId('att');

      const record: AttendanceRecord = {
        id: recordId,
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: data.recordedBy,
        updatedBy: data.recordedBy,
        studentId: data.studentId,
        date: data.date,
        period: data.period,
        status: data.status,
        absenceDetails: data.absenceDetails,
        lateDetails: data.lateDetails,
        recordedBy: data.recordedBy,
        recordedAt: now,
        recordingMethod: data.recordingMethod
      };

      const saved = await this.recordRepo.save(tenantId, record);

      await this.publishEvent(ATTENDANCE_EVENTS.ATTENDANCE_MARKED, tenantId, {
        recordId: saved.id,
        studentId: data.studentId,
        date: data.date.toISOString(),
        period: data.period,
        status: data.status,
        recordedBy: data.recordedBy,
        recordingMethod: data.recordingMethod
      });

      if (data.status === 'absent') {
        await this.handleAbsence(tenantId, saved, student);
      } else if (data.status === 'late') {
        await this.handleLateArrival(tenantId, saved, student);
      }

      if (this.attendanceConfig.enablePatternDetection) {
        this.detectPatternsAsync(tenantId, data.studentId);
      }

      return success(saved);
    });
  }

  /**
   * Mark attendance for an entire class
   */
  async markClassAttendance(
    tenantId: string,
    data: {
      classGroup: string;
      date: Date;
      period?: string;
      attendanceData: { studentId: string; status: AttendanceStatus; notes?: string }[];
      recordedBy: string;
    }
  ): Promise<Result<{
    records: AttendanceRecord[];
    summary: { present: number; absent: number; late: number; other: number };
  }>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.classGroup) {
      return failure({ code: 'VALIDATION_ERROR', message: 'classGroup is required' });
    }
    if (!data.date) {
      return failure({ code: 'VALIDATION_ERROR', message: 'date is required' });
    }
    if (!data.attendanceData) {
      return failure({ code: 'VALIDATION_ERROR', message: 'attendanceData is required' });
    }

    return this.withTiming('markClassAttendance', async () => {
      const records: AttendanceRecord[] = [];
      const summary = { present: 0, absent: 0, late: 0, other: 0 };

      for (const item of data.attendanceData) {
        const result = await this.markAttendance(tenantId, {
          studentId: item.studentId,
          date: data.date,
          period: data.period,
          status: item.status,
          absenceDetails: item.status === 'absent' ? {
            reason: 'unexplained',
            explanation: item.notes,
            verificationStatus: 'unverified',
            parentNotified: false
          } : undefined,
          recordedBy: data.recordedBy,
          recordingMethod: 'manual'
        });

        if (result.success) {
          records.push(result.data);
          if (item.status === 'present') summary.present++;
          else if (item.status === 'absent') summary.absent++;
          else if (item.status === 'late') summary.late++;
          else summary.other++;
        }
      }

      await this.publishEvent(ATTENDANCE_EVENTS.ROLL_COMPLETED, tenantId, {
        classGroup: data.classGroup,
        date: data.date.toISOString(),
        period: data.period,
        ...summary,
        total: records.length
      });

      return success({ records, summary });
    });
  }

  /**
   * Record a kiosk check-in
   */
  async recordKioskCheckin(
    tenantId: string,
    data: {
      studentId: string;
      kioskId: string;
      timestamp: Date;
      verificationMethod: 'nfc' | 'barcode' | 'pin' | 'biometric';
    }
  ): Promise<Result<AttendanceRecord>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.studentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'studentId is required' });
    }
    if (!data.kioskId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'kioskId is required' });
    }

    return this.withTiming('recordKioskCheckin', async () => {
      const student = await this.studentRepo.findById(tenantId, data.studentId);
      if (!student) {
        throw new NotFoundError('Student', data.studentId);
      }

      const schoolStartTime = new Date(data.timestamp);
      schoolStartTime.setHours(9, 0, 0, 0);

      const minutesAfterStart = (data.timestamp.getTime() - schoolStartTime.getTime()) / (1000 * 60);
      const isLate = minutesAfterStart > this.attendanceConfig.lateThresholdMinutes;

      return this.markAttendance(tenantId, {
        studentId: data.studentId,
        date: data.timestamp,
        status: isLate ? 'late' : 'present',
        lateDetails: isLate ? {
          arrivalTime: data.timestamp.toISOString(),
          minutesLate: Math.round(minutesAfterStart),
          parentNotified: false
        } : undefined,
        recordedBy: `kiosk:${data.kioskId}`,
        recordingMethod: data.verificationMethod === 'nfc' ? 'nfc' :
                        data.verificationMethod === 'biometric' ? 'biometric' : 'kiosk'
      });
    });
  }

  /**
   * Submit parent absence notification
   */
  async submitParentAbsence(
    tenantId: string,
    data: {
      studentId: string;
      guardianId: string;
      dates: Date[];
      reason: AbsenceReason;
      explanation: string;
      verificationDocument?: string;
    }
  ): Promise<Result<AttendanceRecord[]>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.studentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'studentId is required' });
    }
    if (!data.guardianId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'guardianId is required' });
    }
    if (!data.dates) {
      return failure({ code: 'VALIDATION_ERROR', message: 'dates is required' });
    }
    if (!data.reason) {
      return failure({ code: 'VALIDATION_ERROR', message: 'reason is required' });
    }

    return this.withTiming('submitParentAbsence', async () => {
      const records: AttendanceRecord[] = [];

      for (const date of data.dates) {
        const existing = await this.recordRepo.findByStudent(tenantId, data.studentId, {
          from: date,
          to: date
        });

        if (existing.length > 0) {
          const updated = await this.recordRepo.update(tenantId, existing[0].id, {
            status: 'absent',
            absenceDetails: {
              reason: data.reason,
              explanation: data.explanation,
              verificationStatus: data.verificationDocument ? 'parent_note' : 'parent_note',
              verificationDocument: data.verificationDocument,
              parentNotified: true,
              parentNotifiedAt: new Date()
            },
            updatedAt: new Date(),
            updatedBy: `guardian:${data.guardianId}`
          });
          records.push(updated);
        } else {
          const result = await this.markAttendance(tenantId, {
            studentId: data.studentId,
            date,
            status: 'approved_leave',
            absenceDetails: {
              reason: data.reason,
              explanation: data.explanation,
              verificationStatus: 'parent_note',
              verificationDocument: data.verificationDocument,
              parentNotified: true,
              parentNotifiedAt: new Date()
            },
            recordedBy: `guardian:${data.guardianId}`,
            recordingMethod: 'parent_app'
          });

          if (result.success) {
            records.push(result.data);
          }
        }
      }

      await this.publishEvent(ATTENDANCE_EVENTS.ABSENCE_EXPLAINED, tenantId, {
        studentId: data.studentId,
        guardianId: data.guardianId,
        dates: data.dates.map(d => d.toISOString()),
        reason: data.reason
      });

      return success(records);
    });
  }

  // ==========================================================================
  // ABSENCE & LATE HANDLING
  // ==========================================================================

  private async handleAbsence(
    tenantId: string,
    record: AttendanceRecord,
    student: MeshStudent
  ): Promise<void> {
    await this.publishEvent(ATTENDANCE_EVENTS.ABSENCE_RECORDED, tenantId, {
      recordId: record.id,
      studentId: student.id,
      date: record.date.toISOString(),
      reason: record.absenceDetails?.reason || 'unexplained',
      verified: record.absenceDetails?.verificationStatus !== 'unverified'
    });

    const recentRecords = await this.recordRepo.findByStudent(tenantId, student.id, {
      from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      to: new Date()
    });

    const consecutiveAbsences = this.countConsecutiveAbsences(recentRecords);

    if (consecutiveAbsences >= this.attendanceConfig.consecutiveAbsenceAlertThreshold) {
      await this.createAlert(tenantId, {
        studentId: student.id,
        alertType: 'consecutive_absence',
        severity: consecutiveAbsences >= 5 ? 'critical' : 'warning',
        title: `${consecutiveAbsences} consecutive absences`,
        description: `${student.firstName} ${student.lastName} has been absent for ${consecutiveAbsences} consecutive school days.`,
        triggerConditions: [{
          condition: 'consecutive_absences',
          value: consecutiveAbsences,
          threshold: this.attendanceConfig.consecutiveAbsenceAlertThreshold
        }]
      });
    }

    if (record.absenceDetails?.reason === 'unexplained' && this.attendanceConfig.autoParentNotification) {
      await this.publishEvent(ATTENDANCE_EVENTS.PARENT_CONTACT_REQUIRED, tenantId, {
        studentId: student.id,
        recordId: record.id,
        reason: 'unexplained_absence',
        scheduledFor: new Date(Date.now() + this.attendanceConfig.parentNotificationDelay * 60 * 1000)
      });
    }
  }

  private async handleLateArrival(
    tenantId: string,
    record: AttendanceRecord,
    student: MeshStudent
  ): Promise<void> {
    await this.publishEvent(ATTENDANCE_EVENTS.LATE_ARRIVAL_RECORDED, tenantId, {
      recordId: record.id,
      studentId: student.id,
      date: record.date.toISOString(),
      minutesLate: record.lateDetails?.minutesLate || 0,
      reason: record.lateDetails?.reason
    });

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const monthRecords = await this.recordRepo.findByStudent(tenantId, student.id, {
      from: monthStart,
      to: new Date()
    });

    const lateCount = monthRecords.filter(r => r.status === 'late').length;

    if (lateCount >= this.attendanceConfig.lateArrivalAlertThreshold) {
      await this.createAlert(tenantId, {
        studentId: student.id,
        alertType: 'late_threshold',
        severity: 'warning',
        title: `Excessive lateness this month`,
        description: `${student.firstName} ${student.lastName} has been late ${lateCount} times this month.`,
        triggerConditions: [{
          condition: 'monthly_late_count',
          value: lateCount,
          threshold: this.attendanceConfig.lateArrivalAlertThreshold
        }]
      });
    }
  }

  private countConsecutiveAbsences(records: AttendanceRecord[]): number {
    const sorted = [...records].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    let consecutive = 0;
    for (const record of sorted) {
      if (record.status === 'absent') {
        consecutive++;
      } else if (record.status === 'present' || record.status === 'late') {
        break;
      }
    }

    return consecutive;
  }

  // ==========================================================================
  // PATTERN DETECTION
  // ==========================================================================

  /**
   * Detect attendance patterns for a student
   */
  async detectPatterns(
    tenantId: string,
    studentId: string,
    lookbackDays: number = 90
  ): Promise<Result<AttendancePattern[]>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!studentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'studentId is required' });
    }

    return this.withTiming('detectPatterns', async () => {
      const student = await this.studentRepo.findById(tenantId, studentId);
      if (!student) {
        throw new NotFoundError('Student', studentId);
      }

      const records = await this.recordRepo.findByStudent(tenantId, studentId, {
        from: new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000),
        to: new Date()
      });

      if (records.length < 10) {
        return success([]);
      }

      const patterns: AttendancePattern[] = [];

      const dayOfWeekPattern = this.detectDayOfWeekPattern(tenantId, studentId, records);
      if (dayOfWeekPattern) patterns.push(dayOfWeekPattern);

      const trendPattern = this.detectIncreasingAbsenceTrend(tenantId, studentId, records);
      if (trendPattern) patterns.push(trendPattern);

      const latenessPattern = this.detectChronicLateness(tenantId, studentId, records);
      if (latenessPattern) patterns.push(latenessPattern);

      for (const pattern of patterns) {
        await this.patternRepo.save(tenantId, pattern);

        await this.publishEvent(ATTENDANCE_EVENTS.PATTERN_DETECTED, tenantId, {
          patternId: pattern.id,
          studentId,
          patternType: pattern.patternType,
          confidence: pattern.confidence,
          description: pattern.description,
          evidencePeriod: {
            from: pattern.evidencePeriod.from.toISOString(),
            to: pattern.evidencePeriod.to.toISOString()
          },
          riskLevel: pattern.chronicAbsenteeismRisk,
          recommendedActions: pattern.recommendedActions
        });
      }

      return success(patterns);
    });
  }

  private async detectPatternsAsync(tenantId: string, studentId: string): Promise<void> {
    try {
      await this.detectPatterns(tenantId, studentId);
    } catch (error) {
      log.error('Pattern detection failed', error as Error, { studentId });
    }
  }

  private detectDayOfWeekPattern(
    tenantId: string,
    studentId: string,
    records: AttendanceRecord[]
  ): AttendancePattern | null {
    const dayCount: Record<number, { absent: number; total: number }> = {};
    for (let i = 0; i < 5; i++) {
      dayCount[i] = { absent: 0, total: 0 };
    }

    for (const record of records) {
      const dayOfWeek = new Date(record.date).getDay();
      if (dayOfWeek >= 1 && dayOfWeek <= 5) {
        dayCount[dayOfWeek - 1].total++;
        if (record.status === 'absent') {
          dayCount[dayOfWeek - 1].absent++;
        }
      }
    }

    const avgAbsenceRate = records.filter(r => r.status === 'absent').length / records.length;

    for (const [day, counts] of Object.entries(dayCount)) {
      if (counts.total >= 4) {
        const dayAbsenceRate = counts.absent / counts.total;
        if (dayAbsenceRate > avgAbsenceRate * 2 && dayAbsenceRate > 0.3) {
          const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
          const patternType: PatternType = parseInt(day) === 0 ? 'monday_absence' :
                                          parseInt(day) === 4 ? 'friday_absence' :
                                          'period_specific';

          return this.createPatternRecord(tenantId, studentId, {
            patternType,
            description: `Frequent absences on ${dayNames[parseInt(day)]}s (${Math.round(dayAbsenceRate * 100)}% vs ${Math.round(avgAbsenceRate * 100)}% average)`,
            confidence: Math.min(0.95, 0.5 + (dayAbsenceRate - avgAbsenceRate) / avgAbsenceRate),
            records,
            statistics: {
              absenceRate: avgAbsenceRate * 100,
              lateRate: records.filter(r => r.status === 'late').length / records.length * 100,
              dayOfWeekBias: { [dayNames[parseInt(day)]]: dayAbsenceRate }
            },
            recommendedActions: [
              { action: `Investigate reason for ${dayNames[parseInt(day)]} absences`, priority: 'soon', targetAudience: 'teacher' },
              { action: 'Contact parents to understand pattern', priority: 'soon', targetAudience: 'admin' }
            ]
          });
        }
      }
    }

    return null;
  }

  private detectIncreasingAbsenceTrend(
    tenantId: string,
    studentId: string,
    records: AttendanceRecord[]
  ): AttendancePattern | null {
    const midpoint = Math.floor(records.length / 2);
    const sorted = [...records].sort((a, b) =>
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const firstHalf = sorted.slice(0, midpoint);
    const secondHalf = sorted.slice(midpoint);

    const firstHalfAbsenceRate = firstHalf.filter(r => r.status === 'absent').length / firstHalf.length;
    const secondHalfAbsenceRate = secondHalf.filter(r => r.status === 'absent').length / secondHalf.length;

    if (secondHalfAbsenceRate > firstHalfAbsenceRate * 1.5 && secondHalfAbsenceRate > 0.1) {
      return this.createPatternRecord(tenantId, studentId, {
        patternType: 'increasing_absences',
        description: `Absence rate has increased from ${Math.round(firstHalfAbsenceRate * 100)}% to ${Math.round(secondHalfAbsenceRate * 100)}%`,
        confidence: Math.min(0.9, 0.5 + (secondHalfAbsenceRate - firstHalfAbsenceRate)),
        records,
        statistics: {
          absenceRate: secondHalfAbsenceRate * 100,
          lateRate: records.filter(r => r.status === 'late').length / records.length * 100
        },
        recommendedActions: [
          { action: 'Investigate cause of increasing absences', priority: 'immediate', targetAudience: 'teacher' },
          { action: 'Consider wellbeing check-in', priority: 'soon', targetAudience: 'counsellor' },
          { action: 'Schedule parent meeting', priority: 'soon', targetAudience: 'admin' }
        ]
      });
    }

    return null;
  }

  private detectChronicLateness(
    tenantId: string,
    studentId: string,
    records: AttendanceRecord[]
  ): AttendancePattern | null {
    const lateCount = records.filter(r => r.status === 'late').length;
    const lateRate = lateCount / records.length;

    if (lateRate > 0.15) {
      return this.createPatternRecord(tenantId, studentId, {
        patternType: 'chronic_lateness',
        description: `Consistently late to school (${Math.round(lateRate * 100)}% of days)`,
        confidence: Math.min(0.9, 0.5 + lateRate),
        records,
        statistics: {
          absenceRate: records.filter(r => r.status === 'absent').length / records.length * 100,
          lateRate: lateRate * 100
        },
        recommendedActions: [
          { action: 'Investigate barriers to punctual arrival', priority: 'soon', targetAudience: 'teacher' },
          { action: 'Contact parents about morning routines', priority: 'soon', targetAudience: 'admin' }
        ]
      });
    }

    return null;
  }

  private createPatternRecord(
    tenantId: string,
    studentId: string,
    data: {
      patternType: PatternType;
      description: string;
      confidence: number;
      records: AttendanceRecord[];
      statistics: AttendancePattern['statistics'];
      recommendedActions: AttendancePattern['recommendedActions'];
    }
  ): AttendancePattern {
    const now = new Date();
    const recordDates = data.records.map(r => new Date(r.date).getTime());

    return {
      id: this.generateId('pat'),
      tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
      studentId,
      patternType: data.patternType,
      confidence: data.confidence,
      description: data.description,
      detectedAt: now,
      evidencePeriod: {
        from: new Date(Math.min(...recordDates)),
        to: new Date(Math.max(...recordDates))
      },
      evidenceRecords: data.records.map(r => r.id),
      statistics: data.statistics,
      chronicAbsenteeismRisk: this.calculateChronicAbsenteeismRisk(data.statistics.absenceRate),
      riskFactors: this.identifyRiskFactors(data),
      recommendedActions: data.recommendedActions,
      alertStatus: 'pending'
    };
  }

  private calculateChronicAbsenteeismRisk(absenceRate: number): 'low' | 'moderate' | 'high' | 'chronic' {
    if (absenceRate >= 20) return 'chronic';
    if (absenceRate >= 15) return 'high';
    if (absenceRate >= 10) return 'moderate';
    return 'low';
  }

  private identifyRiskFactors(data: {
    patternType: PatternType;
    statistics: AttendancePattern['statistics'];
  }): string[] {
    const factors: string[] = [];

    if (data.statistics.absenceRate > 15) factors.push('High absence rate');
    if (data.statistics.lateRate > 10) factors.push('Frequent lateness');
    if (data.patternType === 'increasing_absences') factors.push('Deteriorating attendance trend');
    if (data.patternType === 'monday_absence' || data.patternType === 'friday_absence') {
      factors.push('Day-of-week pattern suggests avoidance or home issues');
    }

    return factors;
  }

  // ==========================================================================
  // ALERT MANAGEMENT
  // ==========================================================================

  private async createAlert(
    tenantId: string,
    data: {
      studentId: string;
      patternId?: string;
      alertType: AlertType;
      severity: AttendanceAlert['severity'];
      title: string;
      description: string;
      triggerConditions: AttendanceAlert['triggerConditions'];
    }
  ): Promise<AttendanceAlert> {
    const now = new Date();
    const alertId = this.generateId('alt');

    const alert: AttendanceAlert = {
      id: alertId,
      tenantId,
      createdAt: now,
      updatedAt: now,
      createdBy: 'system',
      updatedBy: 'system',
      studentId: data.studentId,
      patternId: data.patternId,
      alertType: data.alertType,
      severity: data.severity,
      title: data.title,
      description: data.description,
      triggerConditions: data.triggerConditions,
      status: 'active',
      escalationLevel: 0,
      escalationHistory: []
    };

    const saved = await this.alertRepo.save(tenantId, alert);

    await this.publishEvent(ATTENDANCE_EVENTS.ALERT_TRIGGERED, tenantId, {
      alertId: saved.id,
      studentId: data.studentId,
      alertType: data.alertType,
      severity: data.severity,
      title: data.title,
      description: data.description,
      triggerConditions: data.triggerConditions
    });

    return saved;
  }

  /**
   * Acknowledge an attendance alert
   */
  async acknowledgeAlert(
    tenantId: string,
    alertId: string,
    acknowledgedBy: string
  ): Promise<Result<AttendanceAlert>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!alertId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'alertId is required' });
    }

    return this.withTiming('acknowledgeAlert', async () => {
      const alert = await this.alertRepo.findById(tenantId, alertId);
      if (!alert) {
        throw new NotFoundError('Alert', alertId);
      }

      const updated = await this.alertRepo.update(tenantId, alertId, {
        status: 'acknowledged',
        acknowledgedAt: new Date(),
        acknowledgedBy,
        updatedAt: new Date(),
        updatedBy: acknowledgedBy
      });

      await this.publishEvent(ATTENDANCE_EVENTS.ALERT_ACKNOWLEDGED, tenantId, {
        alertId,
        studentId: alert.studentId,
        acknowledgedBy
      });

      return success(updated);
    });
  }

  /**
   * Resolve an attendance alert
   */
  async resolveAlert(
    tenantId: string,
    alertId: string,
    data: { action: string; outcome: string; resolvedBy: string }
  ): Promise<Result<AttendanceAlert>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!alertId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'alertId is required' });
    }
    if (!data.action) {
      return failure({ code: 'VALIDATION_ERROR', message: 'action is required' });
    }
    if (!data.outcome) {
      return failure({ code: 'VALIDATION_ERROR', message: 'outcome is required' });
    }

    return this.withTiming('resolveAlert', async () => {
      const alert = await this.alertRepo.findById(tenantId, alertId);
      if (!alert) {
        throw new NotFoundError('Alert', alertId);
      }

      const updated = await this.alertRepo.update(tenantId, alertId, {
        status: 'resolved',
        resolution: {
          action: data.action,
          outcome: data.outcome,
          resolvedAt: new Date(),
          resolvedBy: data.resolvedBy
        },
        updatedAt: new Date(),
        updatedBy: data.resolvedBy
      });

      await this.publishEvent(ATTENDANCE_EVENTS.ALERT_RESOLVED, tenantId, {
        alertId,
        studentId: alert.studentId,
        action: data.action,
        outcome: data.outcome
      });

      return success(updated);
    });
  }

  // ==========================================================================
  // STATISTICS & REPORTING
  // ==========================================================================

  /**
   * Calculate chronic absenteeism risk for a student
   */
  async calculateChronicAbsenteeismRiskScore(
    tenantId: string,
    studentId: string
  ): Promise<Result<{
    currentAbsenceRate: number;
    riskLevel: 'low' | 'moderate' | 'high' | 'chronic';
    projectedEndOfTermRate: number;
    daysUntilThreshold: number;
    interventionRequired: boolean;
    contributingFactors: string[];
  }>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!studentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'studentId is required' });
    }

    return this.withTiming('calculateChronicAbsenteeismRiskScore', async () => {
      const termStart = new Date();
      termStart.setMonth(termStart.getMonth() - 3);

      const records = await this.recordRepo.findByStudent(tenantId, studentId, {
        from: termStart,
        to: new Date()
      });

      if (records.length === 0) {
        return success({
          currentAbsenceRate: 0,
          riskLevel: 'low' as 'low' | 'moderate' | 'high' | 'chronic',
          projectedEndOfTermRate: 0,
          daysUntilThreshold: 999,
          interventionRequired: false as boolean,
          contributingFactors: [] as string[]
        });
      }

      const absences = records.filter(r => r.status === 'absent').length;
      const currentAbsenceRate = (absences / records.length) * 100;

      const daysRemaining = 50 - records.length;
      const projectedAbsences = absences + (currentAbsenceRate / 100) * daysRemaining;
      const projectedEndOfTermRate = (projectedAbsences / 50) * 100;

      const threshold = this.attendanceConfig.chronicAbsenteeismThreshold;
      const maxAllowedAbsences = Math.floor(50 * (threshold / 100));
      const daysUntilThreshold = maxAllowedAbsences - absences;

      const riskLevel = this.calculateChronicAbsenteeismRisk(currentAbsenceRate);

      const contributingFactors: string[] = [];
      if (currentAbsenceRate > 5) contributingFactors.push('Above average absence rate');
      if (records.filter(r => r.absenceDetails?.reason === 'unexplained').length > 2) {
        contributingFactors.push('Multiple unexplained absences');
      }

      const interventionRequired = riskLevel === 'high' || riskLevel === 'chronic' || daysUntilThreshold <= 3;

      return success({
        currentAbsenceRate,
        riskLevel,
        projectedEndOfTermRate,
        daysUntilThreshold: Math.max(0, daysUntilThreshold),
        interventionRequired,
        contributingFactors
      });
    });
  }

  /**
   * Get attendance summary for a student
   */
  async getStudentAttendanceSummary(
    tenantId: string,
    studentId: string,
    dateRange?: DateRange
  ): Promise<Result<{
    totalDays: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendanceRate: number;
    punctualityRate: number;
    patterns: AttendancePattern[];
    activeAlerts: AttendanceAlert[];
  }>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!studentId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'studentId is required' });
    }

    return this.withTiming('getStudentAttendanceSummary', async () => {
      const range = dateRange || {
        from: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        to: new Date()
      };

      const records = await this.recordRepo.findByStudent(tenantId, studentId, range);
      const patterns = await this.patternRepo.findByStudent(tenantId, studentId);
      const alerts = (await this.alertRepo.findByStudent(tenantId, studentId))
        .filter(a => a.status === 'active' || a.status === 'acknowledged');

      const present = records.filter(r => r.status === 'present').length;
      const absent = records.filter(r => r.status === 'absent').length;
      const late = records.filter(r => r.status === 'late').length;
      const excused = records.filter(r =>
        r.status === 'approved_leave' || r.status === 'school_activity' ||
        (r.status === 'absent' && r.absenceDetails?.verificationStatus !== 'unverified')
      ).length;

      const totalDays = records.length;
      const attendanceRate = totalDays > 0 ? ((present + late) / totalDays) * 100 : 100;
      const punctualityRate = (present + late) > 0 ? (present / (present + late)) * 100 : 100;

      return success({
        totalDays,
        present,
        absent,
        late,
        excused,
        attendanceRate,
        punctualityRate,
        patterns: patterns.filter(p => p.alertStatus !== 'actioned'),
        activeAlerts: alerts
      });
    });
  }

  /**
   * Get class attendance report
   */
  async getClassAttendanceReport(
    tenantId: string,
    classGroup: string,
    date: Date
  ): Promise<Result<{
    date: Date;
    classGroup: string;
    totalStudents: number;
    present: number;
    absent: number;
    late: number;
    attendanceRate: number;
    absentStudents: { studentId: string; studentName: string; reason?: string }[];
    lateStudents: { studentId: string; studentName: string; minutesLate: number }[];
  }>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!classGroup) {
      return failure({ code: 'VALIDATION_ERROR', message: 'classGroup is required' });
    }

    return this.withTiming('getClassAttendanceReport', async () => {
      const students = await this.studentRepo.findByClassGroup(tenantId, classGroup);
      const records = await this.recordRepo.findByDate(tenantId, date, classGroup);

      const recordMap = new Map(records.map(r => [r.studentId, r]));

      const absentStudents: { studentId: string; studentName: string; reason?: string }[] = [];
      const lateStudents: { studentId: string; studentName: string; minutesLate: number }[] = [];

      let present = 0;
      let absent = 0;
      let late = 0;

      for (const student of students) {
        const record = recordMap.get(student.id);
        if (!record) {
          absent++;
          absentStudents.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            reason: 'No record'
          });
        } else if (record.status === 'present') {
          present++;
        } else if (record.status === 'absent') {
          absent++;
          absentStudents.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            reason: record.absenceDetails?.reason
          });
        } else if (record.status === 'late') {
          late++;
          present++;
          lateStudents.push({
            studentId: student.id,
            studentName: `${student.firstName} ${student.lastName}`,
            minutesLate: record.lateDetails?.minutesLate || 0
          });
        }
      }

      return success({
        date,
        classGroup,
        totalStudents: students.length,
        present,
        absent,
        late,
        attendanceRate: students.length > 0 ? (present / students.length) * 100 : 100,
        absentStudents,
        lateStudents
      });
    });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let attendanceMeshServiceInstance: AttendanceMeshService | null = null;

export function initializeAttendanceMeshService(deps: {
  recordRepo: AttendanceRecordRepository;
  patternRepo: PatternRepository;
  alertRepo: AlertRepository;
  studentRepo: StudentRepository;
  attendanceConfig?: Partial<AttendanceConfig>;
}): AttendanceMeshService {
  attendanceMeshServiceInstance = new AttendanceMeshService(deps);
  return attendanceMeshServiceInstance;
}

export function getAttendanceMeshService(): AttendanceMeshService {
  if (!attendanceMeshServiceInstance) {
    throw new Error('AttendanceMeshService has not been initialized. Call initializeAttendanceMeshService first.');
  }
  return attendanceMeshServiceInstance;
}
