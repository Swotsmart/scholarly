/**
 * Attendance API Routes
 * 
 * Express router defining the REST API endpoints for the Attendance module.
 * All endpoints require authentication and tenant context.
 * 
 * @module IntelligenceMesh/Attendance/Routes
 * @version 1.4.0
 */

import { Router, Request, Response, NextFunction } from 'express';
import { AttendanceService } from './attendance.service';

// ============================================================================
// TYPES
// ============================================================================

interface AuthenticatedRequest extends Request {
  tenantId: string;
  userId: string;
  userRole: string;
}

type AsyncHandler = (req: AuthenticatedRequest, res: Response, next: NextFunction) => Promise<void>;

const asyncHandler = (fn: AsyncHandler) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req as AuthenticatedRequest, res, next)).catch(next);
};

// ============================================================================
// ROUTER FACTORY
// ============================================================================

export function createAttendanceRoutes(service: AttendanceService): Router {
  const router = Router();

  // ==========================================================================
  // ATTENDANCE MARKING ENDPOINTS
  // ==========================================================================

  /**
   * POST /attendance
   * Mark attendance for a single student
   */
  router.post('/attendance', asyncHandler(async (req, res) => {
    const result = await service.markAttendance(req.tenantId, {
      studentId: req.body.studentId,
      date: new Date(req.body.date),
      period: req.body.period,
      status: req.body.status,
      absenceDetails: req.body.absenceDetails,
      lateDetails: req.body.lateDetails,
      recordedBy: req.userId,
      recordingMethod: req.body.recordingMethod || 'manual'
    });

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  /**
   * POST /attendance/class
   * Mark attendance for an entire class
   */
  router.post('/attendance/class', asyncHandler(async (req, res) => {
    const result = await service.markClassAttendance(req.tenantId, {
      classGroup: req.body.classGroup,
      date: new Date(req.body.date),
      period: req.body.period,
      attendanceData: req.body.attendanceData,
      recordedBy: req.userId
    });

    if (!result.success) {
      res.status(400).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  /**
   * POST /attendance/kiosk
   * Record a kiosk check-in
   */
  router.post('/attendance/kiosk', asyncHandler(async (req, res) => {
    const result = await service.recordKioskCheckin(req.tenantId, {
      studentId: req.body.studentId,
      kioskId: req.body.kioskId,
      timestamp: new Date(req.body.timestamp || Date.now()),
      verificationMethod: req.body.verificationMethod
    });

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  /**
   * POST /attendance/parent-absence
   * Submit parent absence notification
   */
  router.post('/attendance/parent-absence', asyncHandler(async (req, res) => {
    const result = await service.submitParentAbsence(req.tenantId, {
      studentId: req.body.studentId,
      guardianId: req.body.guardianId || req.userId,
      dates: req.body.dates.map((d: string) => new Date(d)),
      reason: req.body.reason,
      explanation: req.body.explanation,
      verificationDocument: req.body.verificationDocument
    });

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  // ==========================================================================
  // STUDENT ATTENDANCE ENDPOINTS
  // ==========================================================================

  /**
   * GET /students/:studentId/attendance
   * Get attendance summary for a student
   */
  router.get('/students/:studentId/attendance', asyncHandler(async (req, res) => {
    const dateRange = req.query.from && req.query.to ? {
      from: new Date(req.query.from as string),
      to: new Date(req.query.to as string)
    } : undefined;

    const result = await service.getStudentAttendanceSummary(
      req.tenantId,
      req.params.studentId,
      dateRange
    );

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  /**
   * GET /students/:studentId/attendance/risk
   * Calculate chronic absenteeism risk for a student
   */
  router.get('/students/:studentId/attendance/risk', asyncHandler(async (req, res) => {
    const result = await service.calculateChronicAbsenteeismRiskScore(
      req.tenantId,
      req.params.studentId
    );

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  /**
   * POST /students/:studentId/attendance/patterns
   * Detect attendance patterns for a student
   */
  router.post('/students/:studentId/attendance/patterns', asyncHandler(async (req, res) => {
    const result = await service.detectPatterns(
      req.tenantId,
      req.params.studentId,
      req.body.lookbackDays || 90
    );

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  // ==========================================================================
  // CLASS & SCHOOL REPORTS
  // ==========================================================================

  /**
   * GET /classes/:classGroup/attendance
   * Get class attendance report for a date
   */
  router.get('/classes/:classGroup/attendance', asyncHandler(async (req, res) => {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();

    const result = await service.getClassAttendanceReport(
      req.tenantId,
      req.params.classGroup,
      date
    );

    if (!result.success) {
      res.status(400).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  // ==========================================================================
  // ALERT ENDPOINTS
  // ==========================================================================

  /**
   * POST /alerts/:alertId/acknowledge
   * Acknowledge an attendance alert
   */
  router.post('/alerts/:alertId/acknowledge', asyncHandler(async (req, res) => {
    const result = await service.acknowledgeAlert(
      req.tenantId,
      req.params.alertId,
      req.userId
    );

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  /**
   * POST /alerts/:alertId/resolve
   * Resolve an attendance alert
   */
  router.post('/alerts/:alertId/resolve', asyncHandler(async (req, res) => {
    const result = await service.resolveAlert(req.tenantId, req.params.alertId, {
      action: req.body.action,
      outcome: req.body.outcome,
      resolvedBy: req.userId
    });

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  return router;
}
