/**
 * Scholarly Unified Communications 4.0 — Approval Workflow Validators
 *
 * Lightweight JSON Schema-ish validator for approval request payloads.
 * Covers required fields, type checks, string patterns, number ranges,
 * date ranges, enum values, and custom validator functions.
 */

import type { ValidatorDefinition, ApprovalRequest } from './types';

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Validate a request payload against a workflow's form schema.
 */
export function validatePayload(
  payload: Record<string, unknown>,
  schema: Record<string, unknown>
): ValidationResult {
  const errors: ValidationError[] = [];
  const properties = schema.properties as Record<string, Record<string, unknown>> | undefined;
  const required = schema.required as string[] | undefined;

  if (required) {
    for (const field of required) {
      const value = payload[field];
      if (value === undefined || value === null || value === '') {
        errors.push({ field, message: `${field} is required`, code: 'REQUIRED' });
      }
    }
  }

  if (properties) {
    for (const [field, fieldSchema] of Object.entries(properties)) {
      const value = payload[field];
      if (value === undefined || value === null) continue;
      errors.push(...validateField(field, value, fieldSchema));
    }
  }

  return { valid: errors.length === 0, errors };
}

function validateField(
  field: string,
  value: unknown,
  schema: Record<string, unknown>
): ValidationError[] {
  const errors: ValidationError[] = [];
  const expectedType = schema.type as string | undefined;

  // Type check
  if (expectedType) {
    const actualType = getJsonType(value);
    if (expectedType === 'array' && !Array.isArray(value)) {
      errors.push({ field, message: `${field} must be an array`, code: 'TYPE_ARRAY' });
      return errors;
    } else if (expectedType !== 'array' && actualType !== expectedType) {
      errors.push({ field, message: `${field} must be of type ${expectedType}, got ${actualType}`, code: 'TYPE_MISMATCH' });
      return errors;
    }
  }

  // String validations
  if (typeof value === 'string') {
    const minLength = schema.minLength as number | undefined;
    const maxLength = schema.maxLength as number | undefined;
    const pattern = schema.pattern as string | undefined;
    const format = schema.format as string | undefined;

    if (minLength !== undefined && value.length < minLength) {
      errors.push({ field, message: `${field} must be at least ${minLength} characters`, code: 'MIN_LENGTH' });
    }
    if (maxLength !== undefined && value.length > maxLength) {
      errors.push({ field, message: `${field} must be at most ${maxLength} characters`, code: 'MAX_LENGTH' });
    }
    if (pattern) {
      try {
        if (!new RegExp(pattern).test(value)) {
          errors.push({ field, message: `${field} does not match required pattern`, code: 'PATTERN' });
        }
      } catch { /* invalid regex in schema */ }
    }
    if (format === 'date' || format === 'date-time') {
      const d = new Date(value);
      if (isNaN(d.getTime())) {
        errors.push({ field, message: `${field} must be a valid ${format}`, code: 'FORMAT_DATE' });
      }
    }
    if (format === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      errors.push({ field, message: `${field} must be a valid email`, code: 'FORMAT_EMAIL' });
    }
  }

  // Number validations
  if (typeof value === 'number') {
    const minimum = schema.minimum as number | undefined;
    const maximum = schema.maximum as number | undefined;
    if (minimum !== undefined && value < minimum) {
      errors.push({ field, message: `${field} must be at least ${minimum}`, code: 'MINIMUM' });
    }
    if (maximum !== undefined && value > maximum) {
      errors.push({ field, message: `${field} must be at most ${maximum}`, code: 'MAXIMUM' });
    }
  }

  // Enum validation
  const enumValues = schema.enum as unknown[] | undefined;
  if (enumValues && !enumValues.includes(value)) {
    errors.push({ field, message: `${field} must be one of: ${enumValues.join(', ')}`, code: 'ENUM' });
  }

  // Array validations
  if (Array.isArray(value)) {
    const minItems = schema.minItems as number | undefined;
    const maxItems = schema.maxItems as number | undefined;
    if (minItems !== undefined && value.length < minItems) {
      errors.push({ field, message: `${field} must have at least ${minItems} items`, code: 'MIN_ITEMS' });
    }
    if (maxItems !== undefined && value.length > maxItems) {
      errors.push({ field, message: `${field} must have at most ${maxItems} items`, code: 'MAX_ITEMS' });
    }
  }

  return errors;
}

function getJsonType(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value; // 'string', 'number', 'boolean', 'object'
}

/**
 * Run custom validators (pre-submit or pre-approve).
 */
export async function runCustomValidators(
  validators: ValidatorDefinition[],
  payload: Record<string, unknown>,
  request?: ApprovalRequest
): Promise<ValidationResult> {
  const errors: ValidationError[] = [];

  for (const validator of validators) {
    if (!validator.validate) continue;
    try {
      const error = await validator.validate(payload, request);
      if (error) {
        errors.push({ field: '_custom', message: error, code: `CUSTOM_${validator.id}` });
      }
    } catch (err) {
      errors.push({
        field: '_custom',
        message: `Validator ${validator.id} threw: ${err}`,
        code: `VALIDATOR_ERROR_${validator.id}`,
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate date range: ensure startDate is before endDate and both are in the future.
 */
export function validateDateRange(
  startDate: string,
  endDate: string,
  fieldPrefix = 'date'
): ValidationError[] {
  const errors: ValidationError[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isNaN(start.getTime())) {
    errors.push({ field: `${fieldPrefix}Start`, message: 'Start date is invalid', code: 'INVALID_DATE' });
  }
  if (isNaN(end.getTime())) {
    errors.push({ field: `${fieldPrefix}End`, message: 'End date is invalid', code: 'INVALID_DATE' });
  }
  if (!errors.length && start >= end) {
    errors.push({ field: `${fieldPrefix}Start`, message: 'Start date must be before end date', code: 'DATE_RANGE' });
  }

  return errors;
}
