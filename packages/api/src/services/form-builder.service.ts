/**
 * Form Builder Service
 *
 * Manages configurable enrollment forms - creation, versioning, submission
 * processing, and mapping to the core EnrollmentApplication model.
 *
 * ## Key Responsibilities
 *
 * 1. **Form Configuration Management**
 *    - Create, update, version, and publish form configurations
 *    - Clone from templates or existing forms
 *    - Validate form structure and field mappings
 *
 * 2. **Form Rendering Support**
 *    - Provide form configuration for dynamic UI rendering
 *    - Evaluate conditional logic for show/hide rules
 *    - Calculate field values and validation states
 *
 * 3. **Submission Processing**
 *    - Validate submissions against form rules
 *    - Map responses to EnrollmentApplication model
 *    - Handle draft saves and final submissions
 *
 * 4. **Field Mapping**
 *    - Transform custom form responses into standard model
 *    - Preserve custom data in flexible storage
 *    - Support repeatable sections (e.g., multiple guardians)
 *
 * @module IntelligenceMesh/Enrollment/FormBuilder
 * @version 1.4.1
 */

import { log } from '../lib/logger';
import { ScholarlyBaseService, Result, success, failure, ScholarlyError, Validator, ValidationError, NotFoundError } from './base.service';

import { EnrollmentApplication } from './mesh-types';

import {
  EnrollmentFormConfig, FormSection, FormField, FieldType, FieldConfig,
  FieldValidation, ValidationRule, ValidationType, CrossFieldValidationRule,
  ConditionalRule, ConditionExpression, SimpleCondition, CompoundCondition,
  ConditionOperator, ConditionalAction, SubmissionSettings,
  FormSubmission, FormResponse, FormTemplate,
  SelectFieldConfig, SelectOption,
  CORE_ENROLLMENT_FIELDS, COMMON_CUSTOM_FIELDS
} from './form-builder-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface FormConfigRepository {
  findById(tenantId: string, id: string): Promise<EnrollmentFormConfig | null>;
  findByTenant(tenantId: string, includeArchived?: boolean): Promise<EnrollmentFormConfig[]>;
  findActive(tenantId: string, yearLevel?: string, enrollmentType?: string): Promise<EnrollmentFormConfig | null>;
  findVersionHistory(tenantId: string, formId: string): Promise<EnrollmentFormConfig[]>;
  save(tenantId: string, config: EnrollmentFormConfig): Promise<EnrollmentFormConfig>;
  update(tenantId: string, id: string, updates: Partial<EnrollmentFormConfig>): Promise<EnrollmentFormConfig>;
}

export interface FormSubmissionRepository {
  findById(tenantId: string, id: string): Promise<FormSubmission | null>;
  findByApplication(tenantId: string, applicationId: string): Promise<FormSubmission | null>;
  findByForm(tenantId: string, formConfigId: string, status?: FormSubmission['status']): Promise<FormSubmission[]>;
  findDrafts(tenantId: string, userId: string): Promise<FormSubmission[]>;
  save(tenantId: string, submission: FormSubmission): Promise<FormSubmission>;
  update(tenantId: string, id: string, updates: Partial<FormSubmission>): Promise<FormSubmission>;
}

export interface FormTemplateRepository {
  findById(id: string): Promise<FormTemplate | null>;
  findAll(category?: string, jurisdiction?: string): Promise<FormTemplate[]>;
  findPopular(limit: number): Promise<FormTemplate[]>;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class FormBuilderService extends ScholarlyBaseService {
  private readonly configRepo: FormConfigRepository;
  private readonly submissionRepo: FormSubmissionRepository;
  private readonly templateRepo: FormTemplateRepository;

  constructor(deps: {
    configRepo: FormConfigRepository;
    submissionRepo: FormSubmissionRepository;
    templateRepo: FormTemplateRepository;
  }) {
    super('FormBuilderService');
    this.configRepo = deps.configRepo;
    this.submissionRepo = deps.submissionRepo;
    this.templateRepo = deps.templateRepo;
  }

  // ==========================================================================
  // FORM CONFIGURATION MANAGEMENT
  // ==========================================================================

  /**
   * Create a new form configuration
   */
  async createFormConfig(
    tenantId: string,
    data: {
      name: string;
      description?: string;
      applicableYearLevels?: string[];
      applicableEnrollmentTypes?: EnrollmentFormConfig['applicableEnrollmentTypes'];
      createdBy: string;
    }
  ): Promise<Result<EnrollmentFormConfig>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!data.name) {
      return failure({ code: 'VALIDATION_ERROR', message: 'name is required' });
    }

    return this.withTiming('createFormConfig', async () => {
      const now = new Date();
      const configId = this.generateId('frm');

      // Start with default sections containing core fields
      const defaultSections = this.createDefaultSections();

      const config: EnrollmentFormConfig = {
        id: configId,
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
        name: data.name,
        description: data.description,
        version: 1,
        applicableYearLevels: data.applicableYearLevels || [],
        applicableEnrollmentTypes: data.applicableEnrollmentTypes || ['new_student', 'transfer'],
        sections: defaultSections,
        conditionalRules: [],
        validationRules: [],
        submissionSettings: this.getDefaultSubmissionSettings(),
        status: 'draft'
      };

      const saved = await this.configRepo.save(tenantId, config);

      await this.publishEvent('scholarly.enrollment.form_created', tenantId, {
        formId: saved.id,
        name: saved.name
      });

      return success(saved);
    });
  }

  /**
   * Create form from a template
   */
  async createFromTemplate(
    tenantId: string,
    templateId: string,
    data: {
      name: string;
      description?: string;
      createdBy: string;
    }
  ): Promise<Result<EnrollmentFormConfig>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!templateId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'templateId is required' });
    }
    if (!data.name) {
      return failure({ code: 'VALIDATION_ERROR', message: 'name is required' });
    }

    return this.withTiming('createFromTemplate', async () => {
      const template = await this.templateRepo.findById(templateId);
      if (!template) {
        throw new NotFoundError('FormTemplate', templateId);
      }

      const now = new Date();
      const configId = this.generateId('frm');

      const config: EnrollmentFormConfig = {
        id: configId,
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: data.createdBy,
        updatedBy: data.createdBy,
        name: data.name,
        description: data.description || template.description,
        version: 1,
        applicableYearLevels: [],
        applicableEnrollmentTypes: ['new_student', 'transfer'],
        sections: JSON.parse(JSON.stringify(template.sections)), // Deep clone
        conditionalRules: [],
        validationRules: [],
        submissionSettings: this.getDefaultSubmissionSettings(),
        status: 'draft'
      };

      const saved = await this.configRepo.save(tenantId, config);

      await this.publishEvent('scholarly.enrollment.form_created_from_template', tenantId, {
        formId: saved.id,
        templateId,
        name: saved.name
      });

      return success(saved);
    });
  }

  /**
   * Update form configuration (creates new version if published)
   */
  async updateFormConfig(
    tenantId: string,
    formId: string,
    updates: {
      name?: string;
      description?: string;
      applicableYearLevels?: string[];
      applicableEnrollmentTypes?: EnrollmentFormConfig['applicableEnrollmentTypes'];
      sections?: FormSection[];
      conditionalRules?: ConditionalRule[];
      validationRules?: CrossFieldValidationRule[];
      submissionSettings?: SubmissionSettings;
      updatedBy: string;
    }
  ): Promise<Result<EnrollmentFormConfig>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!formId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'formId is required' });
    }

    return this.withTiming('updateFormConfig', async () => {
      const existing = await this.configRepo.findById(tenantId, formId);
      if (!existing) {
        throw new NotFoundError('EnrollmentFormConfig', formId);
      }

      // If form is active/published, create a new draft version
      if (existing.status === 'active') {
        const newVersion = await this.createNewVersion(tenantId, existing, updates);
        return success(newVersion);
      }

      // Otherwise, update in place
      const updated = await this.configRepo.update(tenantId, formId, {
        ...updates,
        updatedAt: new Date(),
        updatedBy: updates.updatedBy
      });

      await this.publishEvent('scholarly.enrollment.form_updated', tenantId, {
        formId: updated.id,
        version: updated.version
      });

      return success(updated);
    });
  }

  private async createNewVersion(
    tenantId: string,
    existing: EnrollmentFormConfig,
    updates: Partial<EnrollmentFormConfig>
  ): Promise<EnrollmentFormConfig> {
    const now = new Date();
    const newId = this.generateId('frm');

    const newVersion: EnrollmentFormConfig = {
      ...existing,
      ...updates,
      id: newId,
      version: existing.version + 1,
      status: 'draft',
      previousVersionId: existing.id,
      createdAt: now,
      updatedAt: now,
      publishedAt: undefined,
      publishedBy: undefined
    };

    return this.configRepo.save(tenantId, newVersion);
  }

  /**
   * Add a section to a form
   */
  async addSection(
    tenantId: string,
    formId: string,
    section: Omit<FormSection, 'id'>,
    updatedBy: string
  ): Promise<Result<EnrollmentFormConfig>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!formId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'formId is required' });
    }
    if (!section.title) {
      return failure({ code: 'VALIDATION_ERROR', message: 'section.title is required' });
    }

    return this.withTiming('addSection', async () => {
      const config = await this.configRepo.findById(tenantId, formId);
      if (!config) {
        throw new NotFoundError('EnrollmentFormConfig', formId);
      }

      const sectionId = this.generateId('sec');
      const newSection: FormSection = {
        ...section,
        id: sectionId,
        order: section.order ?? config.sections.length
      };

      const updatedSections = [...config.sections, newSection].sort((a, b) => a.order - b.order);

      return this.updateFormConfig(tenantId, formId, {
        sections: updatedSections,
        updatedBy
      });
    });
  }

  /**
   * Add a field to a section
   */
  async addField(
    tenantId: string,
    formId: string,
    sectionId: string,
    field: Omit<FormField, 'id'>,
    updatedBy: string
  ): Promise<Result<EnrollmentFormConfig>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!formId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'formId is required' });
    }
    if (!sectionId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'sectionId is required' });
    }
    if (!field.type) {
      return failure({ code: 'VALIDATION_ERROR', message: 'field.type is required' });
    }
    if (!field.label) {
      return failure({ code: 'VALIDATION_ERROR', message: 'field.label is required' });
    }

    return this.withTiming('addField', async () => {
      const config = await this.configRepo.findById(tenantId, formId);
      if (!config) {
        throw new NotFoundError('EnrollmentFormConfig', formId);
      }

      const sectionIndex = config.sections.findIndex(s => s.id === sectionId);
      if (sectionIndex === -1) {
        throw new NotFoundError('FormSection', sectionId);
      }

      const fieldId = this.generateId('fld');
      const newField: FormField = {
        ...field,
        id: fieldId,
        order: field.order ?? config.sections[sectionIndex].fields.length,
        width: field.width ?? 12,
        readOnly: field.readOnly ?? false,
        validation: field.validation ?? { rules: [] }
      };

      const updatedSections = [...config.sections];
      updatedSections[sectionIndex] = {
        ...updatedSections[sectionIndex],
        fields: [...updatedSections[sectionIndex].fields, newField].sort((a, b) => a.order - b.order)
      };

      return this.updateFormConfig(tenantId, formId, {
        sections: updatedSections,
        updatedBy
      });
    });
  }

  /**
   * Update a field in a form
   */
  async updateField(
    tenantId: string,
    formId: string,
    fieldId: string,
    updates: Partial<Omit<FormField, 'id'>>,
    updatedBy: string
  ): Promise<Result<EnrollmentFormConfig>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!formId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'formId is required' });
    }
    if (!fieldId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'fieldId is required' });
    }

    return this.withTiming('updateField', async () => {
      const config = await this.configRepo.findById(tenantId, formId);
      if (!config) {
        throw new NotFoundError('EnrollmentFormConfig', formId);
      }

      let found = false;
      const updatedSections = config.sections.map(section => ({
        ...section,
        fields: section.fields.map(field => {
          if (field.id === fieldId) {
            found = true;
            return { ...field, ...updates };
          }
          return field;
        })
      }));

      if (!found) {
        throw new NotFoundError('FormField', fieldId);
      }

      return this.updateFormConfig(tenantId, formId, {
        sections: updatedSections,
        updatedBy
      });
    });
  }

  /**
   * Remove a field from a form
   */
  async removeField(
    tenantId: string,
    formId: string,
    fieldId: string,
    updatedBy: string
  ): Promise<Result<EnrollmentFormConfig>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!formId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'formId is required' });
    }
    if (!fieldId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'fieldId is required' });
    }

    return this.withTiming('removeField', async () => {
      const config = await this.configRepo.findById(tenantId, formId);
      if (!config) {
        throw new NotFoundError('EnrollmentFormConfig', formId);
      }

      const updatedSections = config.sections.map(section => ({
        ...section,
        fields: section.fields.filter(field => field.id !== fieldId)
      }));

      // Also remove any conditional rules referencing this field
      const updatedRules = config.conditionalRules.filter(rule =>
        !this.ruleReferencesField(rule, fieldId)
      );

      return this.updateFormConfig(tenantId, formId, {
        sections: updatedSections,
        conditionalRules: updatedRules,
        updatedBy
      });
    });
  }

  private ruleReferencesField(rule: ConditionalRule, fieldId: string): boolean {
    const conditionReferences = this.conditionReferencesField(rule.condition, fieldId);
    const actionReferences = rule.actions.some(a => a.targetId === fieldId);
    return conditionReferences || actionReferences;
  }

  private conditionReferencesField(condition: ConditionExpression, fieldId: string): boolean {
    if (condition.type === 'simple') {
      return condition.fieldId === fieldId;
    }
    return condition.conditions.some(c => this.conditionReferencesField(c, fieldId));
  }

  /**
   * Publish a form configuration (make it active)
   */
  async publishForm(
    tenantId: string,
    formId: string,
    publishedBy: string
  ): Promise<Result<EnrollmentFormConfig>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!formId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'formId is required' });
    }

    return this.withTiming('publishForm', async () => {
      const config = await this.configRepo.findById(tenantId, formId);
      if (!config) {
        throw new NotFoundError('EnrollmentFormConfig', formId);
      }

      if (config.status === 'active') {
        throw new ValidationError('Form is already published');
      }

      // Validate form has required core fields
      const validationResult = this.validateFormCompleteness(config);
      if (!validationResult.isValid) {
        throw new ValidationError(`Form validation failed: ${validationResult.errors.join(', ')}`);
      }

      // Archive previous active version if exists
      const currentActive = await this.configRepo.findActive(
        tenantId,
        config.applicableYearLevels[0],
        config.applicableEnrollmentTypes[0]
      );

      if (currentActive && currentActive.id !== formId) {
        await this.configRepo.update(tenantId, currentActive.id, {
          status: 'archived',
          updatedAt: new Date(),
          updatedBy: publishedBy
        });
      }

      const updated = await this.configRepo.update(tenantId, formId, {
        status: 'active',
        publishedAt: new Date(),
        publishedBy,
        updatedAt: new Date(),
        updatedBy: publishedBy
      });

      await this.publishEvent('scholarly.enrollment.form_published', tenantId, {
        formId: updated.id,
        version: updated.version,
        name: updated.name
      });

      return success(updated);
    });
  }

  /**
   * Validate form has all required core fields
   */
  validateFormCompleteness(config: EnrollmentFormConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const allFields = config.sections.flatMap(s => s.fields);

    // Check required core fields are present
    const requiredMappings = [
      'student.firstName',
      'student.lastName',
      'student.dateOfBirth',
      'guardians[].email',
      'requestedYearLevel'
    ];

    for (const mapping of requiredMappings) {
      const hasField = allFields.some(f => f.mappedField === mapping || f.mappedField?.startsWith(mapping.replace('[]', '[0]')));
      if (!hasField) {
        errors.push(`Missing required field mapping: ${mapping}`);
      }
    }

    // Check at least one guardian section exists
    const hasGuardianSection = config.sections.some(s =>
      s.repeatable && s.fields.some(f => f.mappedField?.includes('guardians'))
    );
    if (!hasGuardianSection) {
      errors.push('Form must include a repeatable guardian section');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get the active form for a tenant
   */
  async getActiveForm(
    tenantId: string,
    yearLevel?: string,
    enrollmentType?: string
  ): Promise<Result<EnrollmentFormConfig | null>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }

    return this.withTiming('getActiveForm', async () => {
      const result = await this.configRepo.findActive(tenantId, yearLevel, enrollmentType);
      return success(result);
    });
  }

  // ==========================================================================
  // SUBMISSION PROCESSING
  // ==========================================================================

  /**
   * Start a new form submission (creates draft)
   */
  async startSubmission(
    tenantId: string,
    formConfigId: string,
    startedBy: string,
    metadata?: FormSubmission['submissionMetadata']
  ): Promise<Result<FormSubmission>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!formConfigId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'formConfigId is required' });
    }

    return this.withTiming('startSubmission', async () => {
      const config = await this.configRepo.findById(tenantId, formConfigId);
      if (!config) {
        throw new NotFoundError('EnrollmentFormConfig', formConfigId);
      }

      if (config.status !== 'active') {
        throw new ValidationError('Cannot submit to inactive form');
      }

      // Check capacity if configured
      if (config.submissionSettings.capacity?.maxSubmissions) {
        const existingCount = (await this.submissionRepo.findByForm(tenantId, formConfigId, 'completed')).length;
        if (existingCount >= config.submissionSettings.capacity.maxSubmissions) {
          throw new ValidationError(config.submissionSettings.capacity.capacityReachedMessage || 'Form capacity reached');
        }
      }

      const now = new Date();
      const submissionId = this.generateId('sub');

      const submission: FormSubmission = {
        id: submissionId,
        tenantId,
        createdAt: now,
        updatedAt: now,
        createdBy: startedBy,
        updatedBy: startedBy,
        formConfigId,
        formVersion: config.version,
        status: 'draft',
        responses: [],
        customData: {},
        validationState: {
          isValid: false,
          fieldErrors: {},
          crossFieldErrors: []
        },
        progress: {
          completedSections: [],
          totalSections: config.sections.filter(s => !this.isSectionHidden(s, {})).length,
          percentComplete: 0,
          lastSectionVisited: config.sections[0]?.id || ''
        },
        startedAt: now,
        submissionMetadata: metadata || {}
      };

      const saved = await this.submissionRepo.save(tenantId, submission);

      await this.publishEvent('scholarly.enrollment.submission_started', tenantId, {
        submissionId: saved.id,
        formConfigId
      });

      return success(saved);
    });
  }

  /**
   * Save responses to a submission (auto-save or manual save)
   */
  async saveResponses(
    tenantId: string,
    submissionId: string,
    responses: { fieldId: string; value: any }[],
    savedBy: string
  ): Promise<Result<FormSubmission>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!submissionId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'submissionId is required' });
    }

    return this.withTiming('saveResponses', async () => {
      const submission = await this.submissionRepo.findById(tenantId, submissionId);
      if (!submission) {
        throw new NotFoundError('FormSubmission', submissionId);
      }

      if (submission.status === 'completed') {
        throw new ValidationError('Cannot modify completed submission');
      }

      const config = await this.configRepo.findById(tenantId, submission.formConfigId);
      if (!config) {
        throw new NotFoundError('EnrollmentFormConfig', submission.formConfigId);
      }

      // Merge new responses with existing
      const now = new Date();
      const responseMap = new Map(submission.responses.map(r => [r.fieldId, r]));

      for (const newResponse of responses) {
        responseMap.set(newResponse.fieldId, {
          fieldId: newResponse.fieldId,
          value: newResponse.value,
          displayValue: this.getDisplayValue(config, newResponse.fieldId, newResponse.value),
          updatedAt: now
        });
      }

      const updatedResponses = Array.from(responseMap.values());

      // Extract custom data from non-mapped fields
      const customData = this.extractCustomData(config, updatedResponses);

      // Validate responses
      const validationState = this.validateResponses(config, updatedResponses);

      // Calculate progress
      const progress = this.calculateProgress(config, updatedResponses);

      const updated = await this.submissionRepo.update(tenantId, submissionId, {
        responses: updatedResponses,
        customData,
        validationState,
        progress,
        lastSavedAt: now,
        updatedAt: now,
        updatedBy: savedBy
      });

      return success(updated);
    });
  }

  /**
   * Submit the form (final submission)
   */
  async submitForm(
    tenantId: string,
    submissionId: string,
    submittedBy: string
  ): Promise<Result<{ submission: FormSubmission; application: Partial<EnrollmentApplication> }>> {
    if (!tenantId || typeof tenantId !== 'string') {
      return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
    }
    if (!submissionId) {
      return failure({ code: 'VALIDATION_ERROR', message: 'submissionId is required' });
    }

    return this.withTiming('submitForm', async () => {
      const submission = await this.submissionRepo.findById(tenantId, submissionId);
      if (!submission) {
        throw new NotFoundError('FormSubmission', submissionId);
      }

      if (submission.status === 'completed') {
        throw new ValidationError('Form already submitted');
      }

      const config = await this.configRepo.findById(tenantId, submission.formConfigId);
      if (!config) {
        throw new NotFoundError('EnrollmentFormConfig', submission.formConfigId);
      }

      // Final validation
      const validationState = this.validateResponses(config, submission.responses, true);
      if (!validationState.isValid) {
        throw new ValidationError('Form validation failed. Please check all required fields.');
      }

      // Map responses to EnrollmentApplication
      const application = this.mapToEnrollmentApplication(config, submission.responses, submission.customData);

      const now = new Date();
      const updatedSubmission = await this.submissionRepo.update(tenantId, submissionId, {
        status: 'submitted',
        validationState,
        submittedAt: now,
        updatedAt: now,
        updatedBy: submittedBy
      });

      await this.publishEvent('scholarly.enrollment.form_submitted', tenantId, {
        submissionId: updatedSubmission.id,
        formConfigId: config.id
      });

      return success({
        submission: updatedSubmission,
        application
      });
    });
  }

  // ==========================================================================
  // FIELD MAPPING & TRANSFORMATION
  // ==========================================================================

  /**
   * Map form responses to the standard EnrollmentApplication model
   */
  mapToEnrollmentApplication(
    config: EnrollmentFormConfig,
    responses: FormResponse[],
    customData: Record<string, any>
  ): Partial<EnrollmentApplication> {
    const responseMap = new Map(responses.map(r => [r.fieldId, r.value]));
    const allFields = config.sections.flatMap(s => s.fields);

    const application: Partial<EnrollmentApplication> = {
      student: {} as any,
      guardians: [],
      previousSchooling: {} as any,
      customData
    };

    // Process mapped fields
    for (const field of allFields) {
      if (field.mappedField) {
        const value = responseMap.get(field.id);
        if (value !== undefined && value !== null && value !== '') {
          this.setNestedValue(application, field.mappedField, value);
        }
      }
    }

    // Handle repeatable sections (guardians)
    const guardianSections = config.sections.filter(s =>
      s.repeatable && s.fields.some(f => f.mappedField?.includes('guardians'))
    );

    for (const section of guardianSections) {
      // Find responses for this repeatable section
      const guardianResponses = this.extractRepeatableResponses(section, responses);
      for (let i = 0; i < guardianResponses.length; i++) {
        const guardian: any = {};
        for (const [fieldId, value] of Object.entries(guardianResponses[i])) {
          const field = section.fields.find(f => f.id === fieldId);
          if (field?.mappedField) {
            const propertyName = field.mappedField.replace('guardians[].', '');
            guardian[propertyName] = value;
          }
        }
        if (Object.keys(guardian).length > 0) {
          (application.guardians as any[]).push(guardian);
        }
      }
    }

    return application;
  }

  private setNestedValue(obj: any, path: string, value: any): void {
    const parts = path.split('.');
    let current = obj;

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const arrayMatch = part.match(/(\w+)\[(\d*)\]/);

      if (arrayMatch) {
        const [, arrayName, indexStr] = arrayMatch;
        if (!current[arrayName]) {
          current[arrayName] = [];
        }
        const index = indexStr ? parseInt(indexStr) : 0;
        if (!current[arrayName][index]) {
          current[arrayName][index] = {};
        }
        current = current[arrayName][index];
      } else {
        if (!current[part]) {
          current[part] = {};
        }
        current = current[part];
      }
    }

    const lastPart = parts[parts.length - 1];
    current[lastPart] = value;
  }

  private extractRepeatableResponses(
    section: FormSection,
    responses: FormResponse[]
  ): Record<string, any>[] {
    // Responses for repeatable sections are stored with indexed field IDs
    // e.g., "guardian_0_firstName", "guardian_1_firstName"
    const instances: Record<string, any>[] = [];
    const fieldIds = section.fields.map(f => f.id);

    for (const response of responses) {
      // Check if this response belongs to this repeatable section
      const match = response.fieldId.match(/^(.+)_(\d+)_(.+)$/);
      if (match) {
        const [, prefix, indexStr, fieldSuffix] = match;
        const index = parseInt(indexStr);
        const baseFieldId = `${prefix}_${fieldSuffix}`;

        if (fieldIds.includes(baseFieldId) || fieldIds.includes(response.fieldId)) {
          if (!instances[index]) {
            instances[index] = {};
          }
          instances[index][baseFieldId] = response.value;
        }
      }
    }

    return instances.filter(Boolean);
  }

  // ==========================================================================
  // VALIDATION
  // ==========================================================================

  validateResponses(
    config: EnrollmentFormConfig,
    responses: FormResponse[],
    isFinalSubmission: boolean = false
  ): FormSubmission['validationState'] {
    const fieldErrors: Record<string, string[]> = {};
    const crossFieldErrors: { ruleId: string; message: string }[] = [];
    const responseMap = new Map(responses.map(r => [r.fieldId, r.value]));
    const allFields = config.sections.flatMap(s => s.fields);

    // Field-level validation
    for (const field of allFields) {
      // Skip hidden fields
      if (field.showCondition && !this.evaluateCondition(field.showCondition, responseMap)) {
        continue;
      }

      const value = responseMap.get(field.id);
      const errors = this.validateField(field, value, isFinalSubmission, responseMap);
      if (errors.length > 0) {
        fieldErrors[field.id] = errors;
      }
    }

    // Cross-field validation
    for (const rule of config.validationRules) {
      try {
        const isValid = this.evaluateCrossFieldRule(rule, responseMap);
        if (!isValid) {
          crossFieldErrors.push({ ruleId: rule.id, message: rule.errorMessage });
          // Add error to affected fields
          for (const fieldId of rule.affectedFields) {
            if (!fieldErrors[fieldId]) {
              fieldErrors[fieldId] = [];
            }
            fieldErrors[fieldId].push(rule.errorMessage);
          }
        }
      } catch (e) {
        log.warn('Cross-field validation rule failed to evaluate', { ruleId: rule.id, error: String(e) });
      }
    }

    return {
      isValid: Object.keys(fieldErrors).length === 0 && crossFieldErrors.length === 0,
      fieldErrors,
      crossFieldErrors
    };
  }

  private validateField(
    field: FormField,
    value: any,
    isFinalSubmission: boolean,
    allValues: Map<string, any>
  ): string[] {
    const errors: string[] = [];

    // Check required
    const isRequired = field.required ||
      (field.requiredCondition && this.evaluateCondition(field.requiredCondition, allValues));

    if (isRequired && isFinalSubmission && this.isEmpty(value)) {
      errors.push(`${field.label} is required`);
      return errors; // Skip other validations if required field is empty
    }

    if (this.isEmpty(value)) {
      return errors; // Skip validation for empty optional fields
    }

    // Apply validation rules
    for (const rule of field.validation.rules) {
      const error = this.applyValidationRule(rule, value, field.label);
      if (error) {
        errors.push(error);
      }
    }

    // Custom validation
    if (field.validation.customValidation) {
      try {
        const isValid = this.evaluateExpression(
          field.validation.customValidation.expression,
          { value, allValues: Object.fromEntries(allValues) }
        );
        if (!isValid) {
          errors.push(field.validation.customValidation.errorMessage);
        }
      } catch (e) {
        log.warn('Custom validation failed', { fieldId: field.id, error: String(e) });
      }
    }

    return errors;
  }

  private applyValidationRule(rule: ValidationRule, value: any, fieldLabel: string): string | null {
    switch (rule.type) {
      case 'minLength':
        if (typeof value === 'string' && value.length < rule.value) {
          return rule.message || `${fieldLabel} must be at least ${rule.value} characters`;
        }
        break;
      case 'maxLength':
        if (typeof value === 'string' && value.length > rule.value) {
          return rule.message || `${fieldLabel} must be no more than ${rule.value} characters`;
        }
        break;
      case 'min':
        if (typeof value === 'number' && value < rule.value) {
          return rule.message || `${fieldLabel} must be at least ${rule.value}`;
        }
        break;
      case 'max':
        if (typeof value === 'number' && value > rule.value) {
          return rule.message || `${fieldLabel} must be no more than ${rule.value}`;
        }
        break;
      case 'pattern':
        if (typeof value === 'string' && !new RegExp(rule.value).test(value)) {
          return rule.message || `${fieldLabel} format is invalid`;
        }
        break;
      case 'email':
        if (typeof value === 'string' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
          return rule.message || 'Please enter a valid email address';
        }
        break;
      case 'phone':
        if (typeof value === 'string' && !/^[\d\s\-\+\(\)]{8,20}$/.test(value)) {
          return rule.message || 'Please enter a valid phone number';
        }
        break;
      case 'age_min':
        if (value instanceof Date || typeof value === 'string') {
          const dob = new Date(value);
          const age = this.calculateAge(dob);
          if (age < rule.value) {
            return rule.message || `Must be at least ${rule.value} years old`;
          }
        }
        break;
      case 'age_max':
        if (value instanceof Date || typeof value === 'string') {
          const dob = new Date(value);
          const age = this.calculateAge(dob);
          if (age > rule.value) {
            return rule.message || `Must be no more than ${rule.value} years old`;
          }
        }
        break;
    }
    return null;
  }

  private calculateAge(dob: Date): number {
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  }

  private isEmpty(value: any): boolean {
    if (value === undefined || value === null) return true;
    if (typeof value === 'string' && value.trim() === '') return true;
    if (Array.isArray(value) && value.length === 0) return true;
    return false;
  }

  // ==========================================================================
  // CONDITIONAL LOGIC
  // ==========================================================================

  evaluateCondition(condition: ConditionExpression, values: Map<string, any>): boolean {
    if (condition.type === 'simple') {
      return this.evaluateSimpleCondition(condition, values);
    }

    const results = condition.conditions.map(c => this.evaluateCondition(c, values));
    return condition.operator === 'and'
      ? results.every(r => r)
      : results.some(r => r);
  }

  private evaluateSimpleCondition(condition: SimpleCondition, values: Map<string, any>): boolean {
    const fieldValue = values.get(condition.fieldId);
    const compareValue = condition.value;

    switch (condition.operator) {
      case 'equals':
        return fieldValue === compareValue;
      case 'not_equals':
        return fieldValue !== compareValue;
      case 'contains':
        return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'not_contains':
        return !String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
      case 'starts_with':
        return String(fieldValue).toLowerCase().startsWith(String(compareValue).toLowerCase());
      case 'ends_with':
        return String(fieldValue).toLowerCase().endsWith(String(compareValue).toLowerCase());
      case 'greater_than':
        return Number(fieldValue) > Number(compareValue);
      case 'less_than':
        return Number(fieldValue) < Number(compareValue);
      case 'greater_or_equal':
        return Number(fieldValue) >= Number(compareValue);
      case 'less_or_equal':
        return Number(fieldValue) <= Number(compareValue);
      case 'is_empty':
        return this.isEmpty(fieldValue);
      case 'is_not_empty':
        return !this.isEmpty(fieldValue);
      case 'in':
        return Array.isArray(compareValue) && compareValue.includes(fieldValue);
      case 'not_in':
        return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
      default:
        return false;
    }
  }

  private evaluateCrossFieldRule(rule: CrossFieldValidationRule, values: Map<string, any>): boolean {
    return this.evaluateExpression(rule.expression, { values: Object.fromEntries(values) });
  }

  private evaluateExpression(expression: string, context: Record<string, any>): boolean {
    // Safe expression evaluator — no dynamic code execution.
    // Supports: property access, comparison operators, logical operators,
    // string/number/boolean literals. Rejects anything else.
    return this.safeEvaluate(expression, context);
  }

  private safeEvaluate(expression: string, context: Record<string, any>): boolean {
    // Reject dangerous patterns: function calls, assignments, semicolons,
    // template literals, bracket notation, comments, keywords, etc.
    const dangerousPatterns = /[;{}[\]`\\]|=>|\.\.|\bfunction\b|\bclass\b|\beval\b|\bnew\b|\bimport\b|\brequire\b|\breturn\b|\bthrow\b|\bdelete\b|\btypeof\b|\binstanceof\b|\bvoid\b|\bin\b|\bof\b|\byield\b|\bawait\b|\basync\b|\bwhile\b|\bfor\b|\bdo\b|\bif\b|\belse\b|\bswitch\b|\btry\b|\bcatch\b|\bfinally\b|\bwith\b|\bvar\b|\blet\b|\bconst\b|\bthis\b|\bsuper\b|\bconstructor\b|\bprototype\b|\b__proto__\b/;
    if (dangerousPatterns.test(expression)) {
      return false;
    }

    // Only allow: identifiers, dots, comparison/logical operators,
    // numbers, quoted strings, booleans, null, undefined, whitespace, parens
    const safePattern = /^[\s()*/%+\-0-9.a-zA-Z_'"!<>=&|,]+$/;
    if (!safePattern.test(expression)) {
      return false;
    }

    // Reject anything that looks like a function call: identifier followed by (
    if (/[a-zA-Z_$]\s*\(/.test(expression)) {
      return false;
    }

    // Reject assignment operators (but allow == === != !==)
    if (/(?<![=!<>])=(?!=)/.test(expression)) {
      return false;
    }

    try {
      const result = this.evalExpression(expression.trim(), context);
      return Boolean(result);
    } catch {
      return false;
    }
  }

  /**
   * Minimal recursive-descent expression parser.
   * Grammar (simplified):
   *   expr     → or
   *   or       → and ( '||' and )*
   *   and      → not ( '&&' not )*
   *   not      → '!' not | compare
   *   compare  → add ( ( '===' | '==' | '!==' | '!=' | '<=' | '>=' | '<' | '>' ) add )?
   *   add      → atom ( ('+' | '-') atom )*
   *   atom     → number | string | boolean | null | undefined | property | '(' expr ')'
   *   property → identifier ( '.' identifier )*
   */
  private evalExpression(expr: string, ctx: Record<string, any>): any {
    let pos = 0;

    const skipWhitespace = () => {
      while (pos < expr.length && /\s/.test(expr[pos])) pos++;
    };

    const peek = (s: string): boolean => {
      skipWhitespace();
      return expr.startsWith(s, pos);
    };

    const consume = (s: string): boolean => {
      skipWhitespace();
      if (expr.startsWith(s, pos)) {
        pos += s.length;
        return true;
      }
      return false;
    };

    const parseOr = (): any => {
      let left = parseAnd();
      while (consume('||')) {
        const right = parseAnd();
        left = left || right;
      }
      return left;
    };

    const parseAnd = (): any => {
      let left = parseNot();
      while (consume('&&')) {
        const right = parseNot();
        left = left && right;
      }
      return left;
    };

    const parseNot = (): any => {
      if (consume('!')) {
        // Make sure it's not != or !==
        if (peek('=')) {
          // Backtrack — this was part of a comparison, not a unary !
          pos--;
          return parseCompare();
        }
        return !parseNot();
      }
      return parseCompare();
    };

    const parseCompare = (): any => {
      let left = parseAdd();
      skipWhitespace();
      for (const op of ['===', '!==', '==', '!=', '<=', '>=', '<', '>']) {
        if (consume(op)) {
          const right = parseAdd();
          switch (op) {
            case '===': return left === right;
            case '!==': return left !== right;
            case '==': return left == right;
            case '!=': return left != right;
            case '<=': return left <= right;
            case '>=': return left >= right;
            case '<': return left < right;
            case '>': return left > right;
          }
        }
      }
      return left;
    };

    const parseAdd = (): any => {
      let left = parseAtom();
      skipWhitespace();
      while (pos < expr.length && (expr[pos] === '+' || expr[pos] === '-') && expr[pos + 1] !== '=') {
        const op = expr[pos];
        pos++;
        const right = parseAtom();
        if (op === '+') left = left + right;
        else left = left - right;
      }
      return left;
    };

    const parseAtom = (): any => {
      skipWhitespace();

      // Parenthesized expression
      if (consume('(')) {
        const val = parseOr();
        consume(')');
        return val;
      }

      // String literal (single or double quoted)
      if (pos < expr.length && (expr[pos] === '"' || expr[pos] === "'")) {
        const quote = expr[pos];
        pos++;
        let str = '';
        while (pos < expr.length && expr[pos] !== quote) {
          str += expr[pos];
          pos++;
        }
        pos++; // skip closing quote
        return str;
      }

      // Number literal
      if (/[0-9]/.test(expr[pos]) || (expr[pos] === '-' && pos + 1 < expr.length && /[0-9]/.test(expr[pos + 1]))) {
        const start = pos;
        if (expr[pos] === '-') pos++;
        while (pos < expr.length && /[0-9.]/.test(expr[pos])) pos++;
        return Number(expr.slice(start, pos));
      }

      // Identifier / keyword / property access
      if (/[a-zA-Z_]/.test(expr[pos])) {
        const start = pos;
        while (pos < expr.length && /[a-zA-Z0-9_]/.test(expr[pos])) pos++;
        let name = expr.slice(start, pos);

        // Boolean / null / undefined literals
        if (name === 'true') return true;
        if (name === 'false') return false;
        if (name === 'null') return null;
        if (name === 'undefined') return undefined;

        // Resolve from context, with dot-access
        let value: any = ctx[name];
        while (consume('.')) {
          const propStart = pos;
          while (pos < expr.length && /[a-zA-Z0-9_]/.test(expr[pos])) pos++;
          const prop = expr.slice(propStart, pos);
          if (prop === '' || prop === '__proto__' || prop === 'constructor' || prop === 'prototype') {
            throw new Error('Unsafe property access');
          }
          value = value != null ? value[prop] : undefined;
        }
        return value;
      }

      throw new Error(`Unexpected token at position ${pos}`);
    };

    const result = parseOr();
    return result;
  }

  private isSectionHidden(section: FormSection, values: Record<string, any>): boolean {
    if (!section.showCondition) return false;
    const valueMap = new Map(Object.entries(values));
    return !this.evaluateCondition(section.showCondition, valueMap);
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  private extractCustomData(config: EnrollmentFormConfig, responses: FormResponse[]): Record<string, any> {
    const customData: Record<string, any> = {};
    const allFields = config.sections.flatMap(s => s.fields);
    const responseMap = new Map(responses.map(r => [r.fieldId, r.value]));

    for (const field of allFields) {
      if (field.customDataKey && !field.mappedField) {
        const value = responseMap.get(field.id);
        if (value !== undefined && value !== null) {
          this.setNestedValue(customData, field.customDataKey, value);
        }
      }
    }

    return customData;
  }

  private getDisplayValue(config: EnrollmentFormConfig, fieldId: string, value: any): string {
    const allFields = config.sections.flatMap(s => s.fields);
    const field = allFields.find(f => f.id === fieldId);

    if (!field) return String(value);

    // For select fields, return the label instead of value
    if (['select', 'radio', 'multi_select', 'checkbox_group'].includes(field.type)) {
      const selectConfig = field.config as SelectFieldConfig;
      if (Array.isArray(value)) {
        return value.map(v => selectConfig.options.find(o => o.value === v)?.label || v).join(', ');
      }
      return selectConfig.options.find(o => o.value === value)?.label || String(value);
    }

    // For dates, format nicely
    if (['date', 'datetime'].includes(field.type) && value) {
      return new Date(value).toLocaleDateString();
    }

    return String(value);
  }

  private calculateProgress(config: EnrollmentFormConfig, responses: FormResponse[]): FormSubmission['progress'] {
    const responseMap = new Map(responses.map(r => [r.fieldId, r.value]));
    const completedSections: string[] = [];

    for (const section of config.sections) {
      // Skip hidden sections
      if (section.showCondition && !this.evaluateCondition(section.showCondition, responseMap)) {
        continue;
      }

      const requiredFields = section.fields.filter(f => {
        if (f.showCondition && !this.evaluateCondition(f.showCondition, responseMap)) {
          return false;
        }
        return f.required || (f.requiredCondition && this.evaluateCondition(f.requiredCondition, responseMap));
      });

      const allRequiredFilled = requiredFields.every(f => !this.isEmpty(responseMap.get(f.id)));
      if (allRequiredFilled) {
        completedSections.push(section.id);
      }
    }

    const visibleSections = config.sections.filter(s =>
      !s.showCondition || this.evaluateCondition(s.showCondition, responseMap)
    );

    return {
      completedSections,
      totalSections: visibleSections.length,
      percentComplete: visibleSections.length > 0
        ? Math.round((completedSections.length / visibleSections.length) * 100)
        : 0,
      lastSectionVisited: completedSections[completedSections.length - 1] || config.sections[0]?.id || ''
    };
  }

  private createDefaultSections(): FormSection[] {
    return [
      {
        id: 'student_details',
        title: 'Student Details',
        description: 'Basic information about the student',
        order: 0,
        collapsible: true,
        defaultCollapsed: false,
        repeatable: false,
        fields: [
          this.createMappedField('student_firstName', 'text', 'First Name', 'student.firstName', true, 6),
          this.createMappedField('student_lastName', 'text', 'Last Name', 'student.lastName', true, 6),
          this.createMappedField('student_preferredName', 'text', 'Preferred Name', 'student.preferredName', false, 6),
          this.createMappedField('student_dob', 'date', 'Date of Birth', 'student.dateOfBirth', true, 6),
          this.createSelectField('student_gender', 'Gender', 'student.gender', false, 6, [
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'non_binary', label: 'Non-binary' },
            { value: 'prefer_not_to_say', label: 'Prefer not to say' }
          ])
        ]
      },
      {
        id: 'guardians',
        title: 'Parent/Guardian Information',
        description: 'Contact details for parents or guardians',
        order: 1,
        collapsible: true,
        defaultCollapsed: false,
        repeatable: true,
        repeatableConfig: {
          minInstances: 1,
          maxInstances: 4,
          addButtonLabel: 'Add Another Guardian',
          removeButtonLabel: 'Remove Guardian',
          instanceLabel: 'Guardian {{index}}'
        },
        fields: [
          this.createMappedField('guardian_firstName', 'text', 'First Name', 'guardians[].firstName', true, 6),
          this.createMappedField('guardian_lastName', 'text', 'Last Name', 'guardians[].lastName', true, 6),
          this.createMappedField('guardian_email', 'email', 'Email Address', 'guardians[].email', true, 6),
          this.createMappedField('guardian_phone', 'phone', 'Phone Number', 'guardians[].phone', true, 6),
          this.createSelectField('guardian_relationship', 'Relationship', 'guardians[].relationship', true, 6, [
            { value: 'mother', label: 'Mother' },
            { value: 'father', label: 'Father' },
            { value: 'step_mother', label: 'Step Mother' },
            { value: 'step_father', label: 'Step Father' },
            { value: 'guardian', label: 'Guardian' },
            { value: 'grandparent', label: 'Grandparent' },
            { value: 'other', label: 'Other' }
          ]),
          this.createCheckboxField('guardian_isPrimary', 'Primary Contact', 'guardians[].isPrimaryContact', false, 6)
        ]
      },
      {
        id: 'enrollment_details',
        title: 'Enrollment Details',
        description: 'Requested enrollment information',
        order: 2,
        collapsible: true,
        defaultCollapsed: false,
        repeatable: false,
        fields: [
          this.createMappedField('requestedStartDate', 'date', 'Requested Start Date', 'requestedStartDate', true, 6),
          this.createMappedField('requestedYearLevel', 'text', 'Requested Year Level', 'requestedYearLevel', true, 6)
        ]
      }
    ];
  }

  private createMappedField(
    id: string,
    type: FieldType,
    label: string,
    mappedField: string,
    required: boolean,
    width: number = 12
  ): FormField {
    return {
      id,
      type,
      label,
      required,
      order: 0,
      width,
      config: { type } as any,
      validation: { rules: [] },
      readOnly: false,
      mappedField
    };
  }

  private createSelectField(
    id: string,
    label: string,
    mappedField: string,
    required: boolean,
    width: number,
    options: SelectOption[]
  ): FormField {
    return {
      id,
      type: 'select',
      label,
      required,
      order: 0,
      width,
      config: {
        type: 'select',
        options,
        allowOther: false
      } as SelectFieldConfig,
      validation: { rules: [] },
      readOnly: false,
      mappedField
    };
  }

  private createCheckboxField(
    id: string,
    label: string,
    mappedField: string,
    required: boolean,
    width: number
  ): FormField {
    return {
      id,
      type: 'checkbox',
      label,
      required,
      order: 0,
      width,
      config: { type: 'checkbox' } as any,
      validation: { rules: [] },
      readOnly: false,
      mappedField
    };
  }

  private getDefaultSubmissionSettings(): SubmissionSettings {
    return {
      allowDraft: true,
      autoSaveInterval: 30,
      showProgress: true,
      progressStyle: 'steps',
      confirmationMessage: 'Thank you for your enrollment application. We will review it and be in touch soon.',
      notifications: {
        sendToApplicant: true,
        sendToAdmins: true
      }
    };
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let formBuilderServiceInstance: FormBuilderService | null = null;

export function initializeFormBuilderService(deps: {
  configRepo: FormConfigRepository;
  submissionRepo: FormSubmissionRepository;
  templateRepo: FormTemplateRepository;
}): FormBuilderService {
  formBuilderServiceInstance = new FormBuilderService(deps);
  return formBuilderServiceInstance;
}

export function getFormBuilderService(): FormBuilderService {
  if (!formBuilderServiceInstance) {
    throw new Error('FormBuilderService has not been initialized. Call initializeFormBuilderService first.');
  }
  return formBuilderServiceInstance;
}
