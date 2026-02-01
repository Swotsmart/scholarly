/**
 * Form Builder API Routes
 * 
 * Express router defining the REST API endpoints for the Form Builder module.
 * Provides endpoints for form configuration management and submission processing.
 * 
 * @module IntelligenceMesh/Enrollment/FormBuilder/Routes
 * @version 1.4.1
 */

import { Router, Request, Response, NextFunction } from 'express';
import { FormBuilderService } from './form-builder.service';
import { FormSection, FormField, ConditionalRule, CrossFieldValidationRule, SubmissionSettings } from './form-builder.types';

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

export function createFormBuilderRoutes(service: FormBuilderService): Router {
  const router = Router();

  // ==========================================================================
  // FORM CONFIGURATION ENDPOINTS
  // ==========================================================================

  /**
   * POST /forms
   * Create a new form configuration
   */
  router.post('/forms', asyncHandler(async (req, res) => {
    const result = await service.createFormConfig(req.tenantId, {
      name: req.body.name,
      description: req.body.description,
      applicableYearLevels: req.body.applicableYearLevels,
      applicableEnrollmentTypes: req.body.applicableEnrollmentTypes,
      createdBy: req.userId
    });

    if (!result.success) {
      res.status(400).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  /**
   * POST /forms/from-template/:templateId
   * Create a form from a template
   */
  router.post('/forms/from-template/:templateId', asyncHandler(async (req, res) => {
    const result = await service.createFromTemplate(req.tenantId, req.params.templateId, {
      name: req.body.name,
      description: req.body.description,
      createdBy: req.userId
    });

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  /**
   * GET /forms/active
   * Get the active form configuration
   */
  router.get('/forms/active', asyncHandler(async (req, res) => {
    const result = await service.getActiveForm(
      req.tenantId,
      req.query.yearLevel as string,
      req.query.enrollmentType as string
    );

    if (!result.success) {
      res.status(400).json({ error: result.error.message, code: result.error.code });
      return;
    }

    if (!result.data) {
      res.status(404).json({ error: 'No active form found', code: 'NOT_FOUND' });
      return;
    }

    res.json(result.data);
  }));

  /**
   * PUT /forms/:formId
   * Update a form configuration
   */
  router.put('/forms/:formId', asyncHandler(async (req, res) => {
    const result = await service.updateFormConfig(req.tenantId, req.params.formId, {
      name: req.body.name,
      description: req.body.description,
      applicableYearLevels: req.body.applicableYearLevels,
      applicableEnrollmentTypes: req.body.applicableEnrollmentTypes,
      sections: req.body.sections,
      conditionalRules: req.body.conditionalRules,
      validationRules: req.body.validationRules,
      submissionSettings: req.body.submissionSettings,
      updatedBy: req.userId
    });

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  /**
   * POST /forms/:formId/sections
   * Add a section to a form
   */
  router.post('/forms/:formId/sections', asyncHandler(async (req, res) => {
    const section: Omit<FormSection, 'id'> = {
      title: req.body.title,
      description: req.body.description,
      order: req.body.order,
      fields: req.body.fields || [],
      collapsible: req.body.collapsible ?? true,
      defaultCollapsed: req.body.defaultCollapsed ?? false,
      showCondition: req.body.showCondition,
      icon: req.body.icon,
      repeatable: req.body.repeatable ?? false,
      repeatableConfig: req.body.repeatableConfig
    };

    const result = await service.addSection(req.tenantId, req.params.formId, section, req.userId);

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  /**
   * POST /forms/:formId/sections/:sectionId/fields
   * Add a field to a section
   */
  router.post('/forms/:formId/sections/:sectionId/fields', asyncHandler(async (req, res) => {
    const field: Omit<FormField, 'id'> = {
      type: req.body.type,
      label: req.body.label,
      placeholder: req.body.placeholder,
      helpText: req.body.helpText,
      required: req.body.required ?? false,
      requiredCondition: req.body.requiredCondition,
      order: req.body.order ?? 0,
      width: req.body.width ?? 12,
      config: req.body.config,
      validation: req.body.validation ?? { rules: [] },
      showCondition: req.body.showCondition,
      readOnly: req.body.readOnly ?? false,
      defaultValue: req.body.defaultValue,
      mappedField: req.body.mappedField,
      customDataKey: req.body.customDataKey,
      tags: req.body.tags
    };

    const result = await service.addField(
      req.tenantId,
      req.params.formId,
      req.params.sectionId,
      field,
      req.userId
    );

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  /**
   * PUT /forms/:formId/fields/:fieldId
   * Update a field
   */
  router.put('/forms/:formId/fields/:fieldId', asyncHandler(async (req, res) => {
    const result = await service.updateField(
      req.tenantId,
      req.params.formId,
      req.params.fieldId,
      req.body,
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
   * DELETE /forms/:formId/fields/:fieldId
   * Remove a field
   */
  router.delete('/forms/:formId/fields/:fieldId', asyncHandler(async (req, res) => {
    const result = await service.removeField(
      req.tenantId,
      req.params.formId,
      req.params.fieldId,
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
   * POST /forms/:formId/publish
   * Publish a form (make it active)
   */
  router.post('/forms/:formId/publish', asyncHandler(async (req, res) => {
    const result = await service.publishForm(req.tenantId, req.params.formId, req.userId);

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  // ==========================================================================
  // FORM SUBMISSION ENDPOINTS
  // ==========================================================================

  /**
   * POST /submissions
   * Start a new form submission
   */
  router.post('/submissions', asyncHandler(async (req, res) => {
    const result = await service.startSubmission(
      req.tenantId,
      req.body.formConfigId,
      req.userId,
      {
        userAgent: req.headers['user-agent'],
        ipAddress: req.ip,
        sessionId: req.body.sessionId
      }
    );

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.status(201).json(result.data);
  }));

  /**
   * PUT /submissions/:submissionId/responses
   * Save responses to a submission
   */
  router.put('/submissions/:submissionId/responses', asyncHandler(async (req, res) => {
    const result = await service.saveResponses(
      req.tenantId,
      req.params.submissionId,
      req.body.responses,
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
   * POST /submissions/:submissionId/submit
   * Submit the form (final submission)
   */
  router.post('/submissions/:submissionId/submit', asyncHandler(async (req, res) => {
    const result = await service.submitForm(req.tenantId, req.params.submissionId, req.userId);

    if (!result.success) {
      const status = result.error.code === 'NOT_FOUND' ? 404 : 400;
      res.status(status).json({ error: result.error.message, code: result.error.code });
      return;
    }

    res.json(result.data);
  }));

  return router;
}
