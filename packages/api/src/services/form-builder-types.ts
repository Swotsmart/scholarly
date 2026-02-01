/**
 * Enrollment Form Builder - Configurable Form System
 *
 * Enables schools to design custom enrollment forms while maintaining
 * data consistency for the Intelligence Mesh. Think of it as a form
 * designer that lets each school ask the questions that matter to them,
 * while ensuring the core data needed for cross-module intelligence
 * still flows properly.
 *
 * ## The Granny Explanation
 *
 * Imagine you're helping three different schools set up their enrollment:
 *
 * - **Sunny Hills Primary** wants to know about dietary requirements,
 *   swimming ability, and whether parents can volunteer for reading groups.
 *
 * - **St. Mary's College** needs to ask about religious education preferences,
 *   house selection, and music instrument experience.
 *
 * - **Innovation Academy** asks about learning style preferences, passion
 *   projects, and technology access at home.
 *
 * With a fixed form, you'd have to include EVERY question for EVERY school,
 * creating a 47-page nightmare. Or worse, you'd leave out questions that
 * matter deeply to specific schools.
 *
 * The Form Builder lets each school design their own enrollment form:
 * - Drag sections around: "Student Details", "Medical Information", "Our Special Questions"
 * - Add custom fields: "What excites your child about learning?"
 * - Set up smart logic: "If 'Has Medical Condition' is Yes, show the Medical Plan upload"
 * - Define validation: "Emergency contact phone must be Australian mobile format"
 *
 * Behind the scenes, the system ensures that regardless of custom questions,
 * the core data (name, DOB, guardians, etc.) still maps correctly to the
 * student record that feeds the Intelligence Mesh.
 *
 * ## Architecture
 *
 * ```
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    FORM CONFIGURATION                           │
 * │  (School designs their form - sections, fields, logic)          │
 * └─────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    FORM RENDERER                                │
 * │  (Generates dynamic UI based on configuration)                  │
 * └─────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    FORM SUBMISSION                              │
 * │  (Validates against rules, stores responses)                    │
 * └─────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    FIELD MAPPING                                │
 * │  (Maps custom fields to standard EnrollmentApplication)         │
 * └─────────────────────────────────────────────────────────────────┘
 *                              │
 *                              ▼
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    INTELLIGENCE MESH                            │
 * │  (Core data flows to student record, LIS, etc.)                 │
 * └─────────────────────────────────────────────────────────────────┘
 * ```
 *
 * @module IntelligenceMesh/Enrollment/FormBuilder
 * @version 1.4.1
 */

import { MeshBaseEntity } from './mesh-types';

// ============================================================================
// FORM CONFIGURATION TYPES
// ============================================================================

/**
 * Complete form configuration for a tenant's enrollment form
 */
export interface EnrollmentFormConfig extends MeshBaseEntity {
  /** Human-readable name for this form configuration */
  name: string;

  /** Description of this form's purpose */
  description?: string;

  /** Version number - incremented on each publish */
  version: number;

  /** Which year levels this form applies to (empty = all) */
  applicableYearLevels: string[];

  /** Which enrollment types this form applies to */
  applicableEnrollmentTypes: ('new_student' | 'transfer' | 'returning' | 'international')[];

  /** The sections that make up this form */
  sections: FormSection[];

  /** Conditional logic rules */
  conditionalRules: ConditionalRule[];

  /** Cross-field validation rules */
  validationRules: CrossFieldValidationRule[];

  /** Submission settings */
  submissionSettings: SubmissionSettings;

  /** Lifecycle status */
  status: 'draft' | 'active' | 'archived';

  /** When this version was published */
  publishedAt?: Date;

  /** Who published this version */
  publishedBy?: string;

  /** Previous version ID for history tracking */
  previousVersionId?: string;
}

/**
 * A section groups related fields together
 */
export interface FormSection {
  /** Unique identifier within the form */
  id: string;

  /** Section title shown to user */
  title: string;

  /** Optional description/instructions */
  description?: string;

  /** Display order (lower = earlier) */
  order: number;

  /** Fields in this section */
  fields: FormField[];

  /** Whether this section can be collapsed */
  collapsible: boolean;

  /** Whether section starts collapsed */
  defaultCollapsed: boolean;

  /** Condition for showing this entire section */
  showCondition?: ConditionExpression;

  /** Icon to display (optional) */
  icon?: string;

  /** Whether this is a repeatable section (e.g., multiple guardians) */
  repeatable: boolean;

  /** For repeatable sections: min/max instances */
  repeatableConfig?: {
    minInstances: number;
    maxInstances: number;
    addButtonLabel: string;
    removeButtonLabel: string;
    instanceLabel: string; // e.g., "Guardian {{index}}"
  };
}

/**
 * Individual form field configuration
 */
export interface FormField {
  /** Unique identifier within the form */
  id: string;

  /** Field type determines rendering and validation */
  type: FieldType;

  /** Label shown to user */
  label: string;

  /** Placeholder text for input fields */
  placeholder?: string;

  /** Help text shown below the field */
  helpText?: string;

  /** Whether this field is required */
  required: boolean;

  /** Condition for when this field is required */
  requiredCondition?: ConditionExpression;

  /** Display order within section */
  order: number;

  /** Width in grid columns (1-12, default 12 = full width) */
  width: number;

  /** Field-specific configuration */
  config: FieldConfig;

  /** Validation rules for this field */
  validation: FieldValidation;

  /** Condition for showing this field */
  showCondition?: ConditionExpression;

  /** Whether field is read-only */
  readOnly: boolean;

  /** Default value */
  defaultValue?: any;

  /**
   * Maps this field to a standard EnrollmentApplication property.
   * This ensures custom forms still populate the core data model.
   *
   * Examples:
   * - "student.firstName"
   * - "student.dateOfBirth"
   * - "guardians[0].email"
   * - "previousSchooling.schoolName"
   * - null for custom fields that don't map to core model
   */
  mappedField?: string;

  /**
   * For custom fields: where to store in the flexible customData object
   * e.g., "dietaryRequirements", "swimmingAbility"
   */
  customDataKey?: string;

  /** Tags for categorization and reporting */
  tags?: string[];
}

/**
 * Supported field types
 */
export type FieldType =
  // Text inputs
  | 'text'              // Single line text
  | 'textarea'          // Multi-line text
  | 'email'             // Email with validation
  | 'phone'             // Phone number
  | 'url'               // URL with validation

  // Numeric
  | 'number'            // Numeric input
  | 'currency'          // Currency input with formatting

  // Date/Time
  | 'date'              // Date picker
  | 'datetime'          // Date and time picker
  | 'time'              // Time only picker
  | 'date_range'        // Date range picker

  // Selection
  | 'select'            // Single select dropdown
  | 'multi_select'      // Multiple selection
  | 'radio'             // Radio button group
  | 'checkbox'          // Single checkbox (boolean)
  | 'checkbox_group'    // Multiple checkboxes

  // File handling
  | 'file'              // Single file upload
  | 'file_multi'        // Multiple file upload
  | 'image'             // Image upload with preview
  | 'signature'         // Signature capture

  // Special
  | 'address'           // Structured address input
  | 'name'              // Structured name (first, middle, last)
  | 'consent'           // Consent checkbox with required text
  | 'rich_text'         // Rich text editor
  | 'hidden'            // Hidden field
  | 'calculated'        // Calculated from other fields
  | 'heading'           // Display heading (not an input)
  | 'paragraph'         // Display text (not an input)
  | 'divider';          // Visual divider

/**
 * Field-specific configuration based on type
 */
export type FieldConfig =
  | TextFieldConfig
  | NumberFieldConfig
  | DateFieldConfig
  | SelectFieldConfig
  | FileFieldConfig
  | AddressFieldConfig
  | ConsentFieldConfig
  | CalculatedFieldConfig
  | DisplayFieldConfig;

export interface TextFieldConfig {
  type: 'text' | 'textarea' | 'email' | 'phone' | 'url';
  minLength?: number;
  maxLength?: number;
  pattern?: string;        // Regex pattern
  patternMessage?: string; // Error message for pattern mismatch
  rows?: number;           // For textarea
  mask?: string;           // Input mask (e.g., "(999) 999-9999")
}

export interface NumberFieldConfig {
  type: 'number' | 'currency';
  min?: number;
  max?: number;
  step?: number;
  currency?: string;       // For currency type (e.g., "AUD")
  decimalPlaces?: number;
}

export interface DateFieldConfig {
  type: 'date' | 'datetime' | 'time' | 'date_range';
  minDate?: string;        // ISO date or relative (e.g., "today", "-18years")
  maxDate?: string;
  disabledDates?: string[];
  disabledDaysOfWeek?: number[];
  format?: string;         // Display format
}

export interface SelectFieldConfig {
  type: 'select' | 'multi_select' | 'radio' | 'checkbox_group';
  options: SelectOption[];
  allowOther: boolean;     // Allow "Other" with text input
  otherLabel?: string;
  minSelections?: number;  // For multi-select
  maxSelections?: number;
  displayAs?: 'dropdown' | 'buttons' | 'chips';
  searchable?: boolean;    // For large option lists
  optionsSource?: {
    type: 'static' | 'api' | 'dependent';
    apiEndpoint?: string;
    dependsOnField?: string;  // For cascading selects
  };
}

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
  icon?: string;
  children?: SelectOption[]; // For hierarchical options
}

export interface FileFieldConfig {
  type: 'file' | 'file_multi' | 'image' | 'signature';
  acceptedTypes: string[];    // MIME types or extensions
  maxSizeBytes: number;
  maxFiles?: number;          // For file_multi
  imageMaxWidth?: number;     // For image type
  imageMaxHeight?: number;
  requireDescription?: boolean;
  documentType?: string;      // Maps to DocumentType for enrollment docs
}

export interface AddressFieldConfig {
  type: 'address';
  requiredComponents: ('street' | 'city' | 'state' | 'postcode' | 'country')[];
  defaultCountry?: string;
  allowedCountries?: string[];
  useAutocomplete: boolean;
  autocompleteProvider?: 'google' | 'here' | 'mapbox';
}

export interface ConsentFieldConfig {
  type: 'consent';
  consentText: string;        // The consent statement
  consentVersion: string;     // For tracking consent versions
  requireInitials: boolean;
  linkToFullPolicy?: string;
}

export interface CalculatedFieldConfig {
  type: 'calculated';
  formula: string;            // Expression using other field IDs
  displayFormat?: string;
  recalculateOn: 'change' | 'blur' | 'submit';
}

export interface DisplayFieldConfig {
  type: 'heading' | 'paragraph' | 'divider';
  content?: string;           // For heading/paragraph
  level?: 1 | 2 | 3 | 4;      // For heading
  style?: 'info' | 'warning' | 'success' | 'error';
}

// ============================================================================
// VALIDATION TYPES
// ============================================================================

/**
 * Field-level validation rules
 */
export interface FieldValidation {
  /** Built-in validation rules */
  rules: ValidationRule[];

  /** Custom validation function (JavaScript expression) */
  customValidation?: {
    expression: string;       // e.g., "value.length > 3 && value !== 'test'"
    errorMessage: string;
  };

  /** Async validation (API call) */
  asyncValidation?: {
    endpoint: string;
    debounceMs: number;
    errorMessage: string;
  };
}

export interface ValidationRule {
  type: ValidationType;
  value?: any;
  message: string;
}

export type ValidationType =
  | 'required'
  | 'minLength'
  | 'maxLength'
  | 'min'
  | 'max'
  | 'pattern'
  | 'email'
  | 'url'
  | 'phone'
  | 'date_before'
  | 'date_after'
  | 'age_min'
  | 'age_max'
  | 'file_type'
  | 'file_size'
  | 'unique';        // Check uniqueness via API

/**
 * Cross-field validation rules
 */
export interface CrossFieldValidationRule {
  id: string;
  name: string;
  expression: string;  // JavaScript expression referencing field IDs
  errorMessage: string;
  affectedFields: string[];  // Which fields show the error
  severity: 'error' | 'warning';
}

// ============================================================================
// CONDITIONAL LOGIC TYPES
// ============================================================================

/**
 * Conditional rule for showing/hiding or enabling/disabling
 */
export interface ConditionalRule {
  id: string;
  name: string;
  condition: ConditionExpression;
  actions: ConditionalAction[];
}

/**
 * Condition expression - can be simple or compound
 */
export type ConditionExpression =
  | SimpleCondition
  | CompoundCondition;

export interface SimpleCondition {
  type: 'simple';
  fieldId: string;
  operator: ConditionOperator;
  value: any;
}

export interface CompoundCondition {
  type: 'compound';
  operator: 'and' | 'or';
  conditions: ConditionExpression[];
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'contains'
  | 'not_contains'
  | 'starts_with'
  | 'ends_with'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'is_empty'
  | 'is_not_empty'
  | 'in'
  | 'not_in'
  | 'between'
  | 'matches_pattern';

/**
 * Action to take when condition is met
 */
export interface ConditionalAction {
  type: 'show' | 'hide' | 'enable' | 'disable' | 'require' | 'unrequire' | 'set_value';
  targetType: 'field' | 'section';
  targetId: string;
  value?: any;  // For set_value action
}

// ============================================================================
// SUBMISSION SETTINGS
// ============================================================================

export interface SubmissionSettings {
  /** Allow saving draft submissions */
  allowDraft: boolean;

  /** Auto-save interval in seconds (0 = disabled) */
  autoSaveInterval: number;

  /** Show progress indicator */
  showProgress: boolean;

  /** Progress style */
  progressStyle: 'bar' | 'steps' | 'percentage';

  /** Confirmation message after submission */
  confirmationMessage: string;

  /** Redirect URL after submission (optional) */
  redirectUrl?: string;

  /** Email notifications */
  notifications: {
    sendToApplicant: boolean;
    applicantEmailTemplate?: string;
    sendToAdmins: boolean;
    adminEmails?: string[];
    adminEmailTemplate?: string;
  };

  /** Submission deadlines */
  deadlines?: {
    openDate?: Date;
    closeDate?: Date;
    closedMessage?: string;
  };

  /** Capacity limits */
  capacity?: {
    maxSubmissions?: number;
    perYearLevel?: Record<string, number>;
    capacityReachedMessage?: string;
    enableWaitlist: boolean;
  };
}

// ============================================================================
// FORM SUBMISSION TYPES
// ============================================================================

/**
 * A submitted form instance
 */
export interface FormSubmission extends MeshBaseEntity {
  /** Reference to the form configuration */
  formConfigId: string;

  /** Version of the form when submitted */
  formVersion: number;

  /** The application this submission belongs to */
  applicationId?: string;

  /** Submission status */
  status: 'draft' | 'submitted' | 'processing' | 'completed' | 'error';

  /** All field responses */
  responses: FormResponse[];

  /** Custom data from non-mapped fields */
  customData: Record<string, any>;

  /** Validation state */
  validationState: {
    isValid: boolean;
    fieldErrors: Record<string, string[]>;
    crossFieldErrors: { ruleId: string; message: string }[];
  };

  /** Progress tracking */
  progress: {
    completedSections: string[];
    totalSections: number;
    percentComplete: number;
    lastSectionVisited: string;
  };

  /** Timestamps */
  startedAt: Date;
  lastSavedAt?: Date;
  submittedAt?: Date;

  /** Device/browser info for audit */
  submissionMetadata: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
  };
}

/**
 * Individual field response
 */
export interface FormResponse {
  fieldId: string;
  value: any;
  displayValue?: string;  // Human-readable version
  updatedAt: Date;
  validationErrors?: string[];
}

// ============================================================================
// FORM TEMPLATE TYPES
// ============================================================================

/**
 * Pre-built form templates that schools can use as starting points
 */
export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  category: 'primary' | 'secondary' | 'early_years' | 'special_education' | 'international';
  jurisdiction?: string;  // e.g., "AU_NSW" for state-specific requirements
  previewImageUrl?: string;
  sections: FormSection[];
  tags: string[];
  popularity: number;  // Usage count
}

// ============================================================================
// STANDARD FIELD DEFINITIONS
// ============================================================================

/**
 * Core fields that map to the EnrollmentApplication model.
 * These should be included (or mapped) in every enrollment form.
 */
export const CORE_ENROLLMENT_FIELDS = {
  // Student fields
  STUDENT_FIRST_NAME: { mappedField: 'student.firstName', required: true },
  STUDENT_LAST_NAME: { mappedField: 'student.lastName', required: true },
  STUDENT_PREFERRED_NAME: { mappedField: 'student.preferredName', required: false },
  STUDENT_DOB: { mappedField: 'student.dateOfBirth', required: true },
  STUDENT_GENDER: { mappedField: 'student.gender', required: false },
  STUDENT_COUNTRY_OF_BIRTH: { mappedField: 'student.countryOfBirth', required: true },
  STUDENT_LANGUAGES: { mappedField: 'student.languagesSpoken', required: false },
  STUDENT_INDIGENOUS_STATUS: { mappedField: 'student.indigenousStatus', required: false },

  // Guardian fields (repeatable section)
  GUARDIAN_FIRST_NAME: { mappedField: 'guardians[].firstName', required: true },
  GUARDIAN_LAST_NAME: { mappedField: 'guardians[].lastName', required: true },
  GUARDIAN_RELATIONSHIP: { mappedField: 'guardians[].relationship', required: true },
  GUARDIAN_EMAIL: { mappedField: 'guardians[].email', required: true },
  GUARDIAN_PHONE: { mappedField: 'guardians[].phone', required: true },
  GUARDIAN_IS_PRIMARY: { mappedField: 'guardians[].isPrimaryContact', required: true },
  GUARDIAN_HAS_CUSTODY: { mappedField: 'guardians[].hasLegalCustody', required: true },

  // Previous schooling
  PREV_SCHOOL_NAME: { mappedField: 'previousSchooling.schoolName', required: false },
  PREV_SCHOOL_TYPE: { mappedField: 'previousSchooling.schoolType', required: false },
  PREV_YEAR_LEVEL: { mappedField: 'previousSchooling.yearLevel', required: false },
  PREV_LAST_DATE: { mappedField: 'previousSchooling.lastAttendanceDate', required: false },

  // Enrollment request
  REQUESTED_START_DATE: { mappedField: 'requestedStartDate', required: true },
  REQUESTED_YEAR_LEVEL: { mappedField: 'requestedYearLevel', required: true },
  PREFERRED_CLASS: { mappedField: 'preferredClassGroup', required: false }
} as const;

/**
 * Common custom fields that many schools want but aren't core model
 */
export const COMMON_CUSTOM_FIELDS = {
  // Medical
  MEDICAL_CONDITIONS: { customDataKey: 'medicalConditions', category: 'medical' },
  ALLERGIES: { customDataKey: 'allergies', category: 'medical' },
  MEDICATIONS: { customDataKey: 'medications', category: 'medical' },
  DIETARY_REQUIREMENTS: { customDataKey: 'dietaryRequirements', category: 'medical' },

  // Emergency
  EMERGENCY_CONTACT_NAME: { customDataKey: 'emergencyContact.name', category: 'emergency' },
  EMERGENCY_CONTACT_PHONE: { customDataKey: 'emergencyContact.phone', category: 'emergency' },
  EMERGENCY_CONTACT_RELATIONSHIP: { customDataKey: 'emergencyContact.relationship', category: 'emergency' },

  // Learning
  LEARNING_DIFFICULTIES: { customDataKey: 'learningDifficulties', category: 'learning' },
  GIFTED_AREAS: { customDataKey: 'giftedAreas', category: 'learning' },
  INTERESTS: { customDataKey: 'interests', category: 'learning' },
  LEARNING_STYLE: { customDataKey: 'learningStyle', category: 'learning' },

  // Permissions
  PHOTO_PERMISSION: { customDataKey: 'permissions.photo', category: 'permissions' },
  EXCURSION_PERMISSION: { customDataKey: 'permissions.excursion', category: 'permissions' },
  MEDIA_PERMISSION: { customDataKey: 'permissions.media', category: 'permissions' },

  // Transport
  TRAVEL_MODE: { customDataKey: 'transport.mode', category: 'transport' },
  BUS_ROUTE: { customDataKey: 'transport.busRoute', category: 'transport' },
  PICKUP_AUTHORISED: { customDataKey: 'transport.authorisedPickup', category: 'transport' }
} as const;
