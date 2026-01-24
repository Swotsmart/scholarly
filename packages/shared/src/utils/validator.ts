/**
 * Validation Utilities
 */

import { ValidationError } from '../types/errors';
import { Jurisdiction } from '../types/jurisdiction';

export const Validator = {
  tenantId(tenantId: string): void {
    if (!tenantId || tenantId.trim() === '') {
      throw new ValidationError('tenantId is required');
    }
  },

  userId(userId: string): void {
    if (!userId || userId.trim() === '') {
      throw new ValidationError('userId is required');
    }
  },

  required<T>(value: T | null | undefined, fieldName: string): asserts value is T {
    if (value === undefined || value === null || value === '') {
      throw new ValidationError(`${fieldName} is required`);
    }
  },

  positiveNumber(value: number, fieldName: string): void {
    if (typeof value !== 'number' || value <= 0) {
      throw new ValidationError(`${fieldName} must be a positive number`);
    }
  },

  nonNegativeNumber(value: number, fieldName: string): void {
    if (typeof value !== 'number' || value < 0) {
      throw new ValidationError(`${fieldName} must be a non-negative number`);
    }
  },

  email(value: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new ValidationError('Invalid email format');
    }
  },

  phone(value: string): void {
    // Basic phone validation - at least 8 digits
    const phoneRegex = /^\+?[\d\s-]{8,}$/;
    if (!phoneRegex.test(value)) {
      throw new ValidationError('Invalid phone number format');
    }
  },

  jurisdiction(jurisdiction: string): asserts jurisdiction is Jurisdiction {
    if (!Object.values(Jurisdiction).includes(jurisdiction as Jurisdiction)) {
      throw new ValidationError(`Invalid jurisdiction: ${jurisdiction}`);
    }
  },

  dateInFuture(date: Date, fieldName: string): void {
    if (date <= new Date()) {
      throw new ValidationError(`${fieldName} must be in the future`);
    }
  },

  dateInPast(date: Date, fieldName: string): void {
    if (date >= new Date()) {
      throw new ValidationError(`${fieldName} must be in the past`);
    }
  },

  minLength(value: string, min: number, fieldName: string): void {
    if (value.length < min) {
      throw new ValidationError(`${fieldName} must be at least ${min} characters`);
    }
  },

  maxLength(value: string, max: number, fieldName: string): void {
    if (value.length > max) {
      throw new ValidationError(`${fieldName} must be at most ${max} characters`);
    }
  },

  range(value: number, min: number, max: number, fieldName: string): void {
    if (value < min || value > max) {
      throw new ValidationError(`${fieldName} must be between ${min} and ${max}`);
    }
  },

  arrayNotEmpty<T>(arr: T[], fieldName: string): void {
    if (!Array.isArray(arr) || arr.length === 0) {
      throw new ValidationError(`${fieldName} must not be empty`);
    }
  },

  arrayMaxLength<T>(arr: T[], max: number, fieldName: string): void {
    if (arr.length > max) {
      throw new ValidationError(`${fieldName} must have at most ${max} items`);
    }
  },

  oneOf<T>(value: T, allowed: T[], fieldName: string): void {
    if (!allowed.includes(value)) {
      throw new ValidationError(`${fieldName} must be one of: ${allowed.join(', ')}`);
    }
  },

  url(value: string, fieldName: string = 'URL'): void {
    try {
      new URL(value);
    } catch {
      throw new ValidationError(`${fieldName} must be a valid URL`);
    }
  },

  uuid(value: string, fieldName: string = 'ID'): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
      throw new ValidationError(`${fieldName} must be a valid UUID`);
    }
  },

  timeFormat(value: string, fieldName: string): void {
    const timeRegex = /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(value)) {
      throw new ValidationError(`${fieldName} must be in HH:MM format`);
    }
  },

  postcodeAU(value: string): void {
    const postcodeRegex = /^[0-9]{4}$/;
    if (!postcodeRegex.test(value)) {
      throw new ValidationError('Invalid Australian postcode format');
    }
  },

  postcodeUK(value: string): void {
    const postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;
    if (!postcodeRegex.test(value)) {
      throw new ValidationError('Invalid UK postcode format');
    }
  },
};

/**
 * Validation result builder for complex validations
 */
export class ValidationBuilder {
  private errors: { field: string; message: string }[] = [];

  check(condition: boolean, field: string, message: string): this {
    if (!condition) {
      this.errors.push({ field, message });
    }
    return this;
  }

  required(value: unknown, field: string): this {
    if (value === undefined || value === null || value === '') {
      this.errors.push({ field, message: `${field} is required` });
    }
    return this;
  }

  email(value: string, field: string): this {
    if (value) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        this.errors.push({ field, message: 'Invalid email format' });
      }
    }
    return this;
  }

  minLength(value: string, min: number, field: string): this {
    if (value && value.length < min) {
      this.errors.push({ field, message: `${field} must be at least ${min} characters` });
    }
    return this;
  }

  maxLength(value: string, max: number, field: string): this {
    if (value && value.length > max) {
      this.errors.push({ field, message: `${field} must be at most ${max} characters` });
    }
    return this;
  }

  hasErrors(): boolean {
    return this.errors.length > 0;
  }

  getErrors(): { field: string; message: string }[] {
    return this.errors;
  }

  throwIfErrors(): void {
    if (this.hasErrors()) {
      throw new ValidationError('Validation failed', {
        errors: this.errors,
      });
    }
  }
}

export function validate(): ValidationBuilder {
  return new ValidationBuilder();
}
