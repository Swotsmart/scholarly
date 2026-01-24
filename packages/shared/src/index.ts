/**
 * Scholarly - Shared Types & Infrastructure
 *
 * The Unified Learning Nexus: A comprehensive platform connecting
 * learners with tutors, enabling homeschool communities, supporting micro-schools,
 * and creating a marketplace for educational content.
 *
 * @module @scholarly/shared
 */

// Core Types
export * from './types/result';
export * from './types/errors';
export * from './types/jurisdiction';
export * from './types/users';
export * from './types/sessions';
export * from './types/curriculum';
export * from './types/content';
export * from './types/booking';
export * from './types/homeschool';
export * from './types/micro-school';
export * from './types/scheduling';
export * from './types/relief';

// Infrastructure
export * from './infrastructure/base-service';
export * from './infrastructure/event-bus';
export * from './infrastructure/cache';
export * from './infrastructure/config';

// Utilities
export * from './utils/validator';
export * from './utils/id-generator';
export * from './utils/date-utils';

// Note: scholarly-types is exported separately via package.json exports
// Import from '@scholarly/shared/types/scholarly-types' to use it

// Constants
export const SCHOLARLY_VERSION = '1.0.0';
export const SCHOLARLY_MODULES = [
  'tutor-booking',
  'content-marketplace',
  'curriculum-curator',
  'homeschool-hub',
  'micro-school',
  'scheduling-engine',
  'relief-marketplace',
  'capacity-planning',
  'lis-bridge'
] as const;
