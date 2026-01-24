/**
 * ID Generation Utilities
 */

import { randomBytes } from 'crypto';

/**
 * Generate a unique ID with a prefix
 * Format: prefix_timestamp_random
 */
export function generateId(prefix: string): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 11);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Generate a cryptographically secure random ID
 */
export function generateSecureId(length: number = 32): string {
  return randomBytes(length).toString('hex');
}

/**
 * Generate a short ID (8 characters)
 */
export function generateShortId(): string {
  return Math.random().toString(36).substring(2, 10);
}

/**
 * Generate a UUID v4
 */
export function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * ID Prefixes for different entity types
 */
export const IdPrefix = {
  // Users
  USER: 'usr',
  LEARNER: 'lrn',
  PARENT: 'par',
  TUTOR: 'tut',
  CREATOR: 'crt',

  // Booking & Sessions
  BOOKING: 'bkg',
  SESSION: 'ses',

  // Content
  CONTENT: 'cnt',
  REVIEW: 'rev',
  PURCHASE: 'pur',
  REQUEST: 'req',

  // Curriculum
  STANDARD: 'std',
  LESSON_PLAN: 'lsn',
  ALIGNMENT: 'aln',

  // Homeschool
  FAMILY: 'fam',
  CHILD: 'chl',
  COOP: 'cop',
  EXCURSION: 'exc',

  // Micro-School
  SCHOOL: 'sch',
  STUDENT: 'stu',
  STAFF: 'stf',
  ENROLLMENT: 'enr',

  // Scheduling
  SCHEDULE: 'scd',
  TEAM: 'tem',
  SPRINT: 'spr',
  BACKLOG_ITEM: 'bli',

  // Relief
  ABSENCE: 'abs',
  RELIEF_TEACHER: 'rlt',
  RELIEF_BOOKING: 'rlb',
  POOL: 'pol',

  // Events
  EVENT: 'evt',

  // Misc
  TOKEN: 'tok',
  NOTIFICATION: 'ntf',
  DOCUMENT: 'doc',
} as const;

export type IdPrefixType = (typeof IdPrefix)[keyof typeof IdPrefix];

/**
 * Generate an ID with a specific entity prefix
 */
export function generateEntityId(entityType: keyof typeof IdPrefix): string {
  return generateId(IdPrefix[entityType]);
}
