/**
 * Event Bus Interface and Implementations
 */

import type { ScholarlyEvent } from './base-service';

export interface EventBus {
  publish(topic: string, event: ScholarlyEvent): Promise<void>;
  subscribe(topic: string, handler: (event: ScholarlyEvent) => Promise<void>): Promise<void>;
  unsubscribe(topic: string, handler: (event: ScholarlyEvent) => Promise<void>): Promise<void>;
}

export type EventHandler = (event: ScholarlyEvent) => Promise<void>;

/**
 * In-Memory Event Bus for development and testing
 */
export class InMemoryEventBus implements EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  async publish(topic: string, event: ScholarlyEvent): Promise<void> {
    const topicHandlers = this.handlers.get(topic);
    if (topicHandlers) {
      const promises = Array.from(topicHandlers).map((handler) => handler(event));
      await Promise.allSettled(promises);
    }

    // Also publish to wildcard subscribers
    const wildcardHandlers = this.handlers.get('*');
    if (wildcardHandlers) {
      const promises = Array.from(wildcardHandlers).map((handler) => handler(event));
      await Promise.allSettled(promises);
    }
  }

  async subscribe(topic: string, handler: EventHandler): Promise<void> {
    if (!this.handlers.has(topic)) {
      this.handlers.set(topic, new Set());
    }
    this.handlers.get(topic)!.add(handler);
  }

  async unsubscribe(topic: string, handler: EventHandler): Promise<void> {
    const topicHandlers = this.handlers.get(topic);
    if (topicHandlers) {
      topicHandlers.delete(handler);
    }
  }
}

/**
 * Event Topics for Scholarly Platform
 */
export const EventTopics = {
  // Tutor Booking
  TUTOR_SEARCH_COMPLETED: 'scholarly.tutor.search_completed',
  BOOKING_CREATED: 'scholarly.booking.created',
  BOOKING_CONFIRMED: 'scholarly.booking.confirmed',
  BOOKING_CANCELLED: 'scholarly.booking.cancelled',
  SESSION_STARTED: 'scholarly.session.started',
  SESSION_COMPLETED: 'scholarly.session.completed',
  SESSION_FEEDBACK: 'scholarly.session.feedback',

  // Content Marketplace
  CONTENT_PUBLISHED: 'scholarly.content.published',
  CONTENT_PURCHASED: 'scholarly.content.purchased',
  CONTENT_REVIEWED: 'scholarly.content.reviewed',
  CONTENT_REQUEST_CREATED: 'scholarly.content.request_created',
  CONTENT_REQUEST_FULFILLED: 'scholarly.content.request_fulfilled',

  // Curriculum
  CURRICULUM_IMPORTED: 'scholarly.curriculum.imported',
  CURRICULUM_ALIGNED: 'scholarly.curriculum.aligned',
  LESSON_PLAN_GENERATED: 'scholarly.curriculum.lesson_generated',

  // Homeschool
  FAMILY_REGISTERED: 'scholarly.homeschool.family_registered',
  COOP_CREATED: 'scholarly.homeschool.coop_created',
  COOP_JOINED: 'scholarly.homeschool.coop_joined',
  EXCURSION_CREATED: 'scholarly.homeschool.excursion_created',

  // Micro-School
  SCHOOL_CREATED: 'scholarly.microschool.school_created',
  STUDENT_ENROLLED: 'scholarly.microschool.student_enrolled',
  COMPLIANCE_UPDATED: 'scholarly.microschool.compliance_updated',

  // Relief
  ABSENCE_REPORTED: 'scholarly.relief.absence_reported',
  RELIEF_ASSIGNED: 'scholarly.relief.assigned',
  RELIEF_COMPLETED: 'scholarly.relief.completed',
  ABSENCE_PREDICTED: 'scholarly.relief.absence_predicted',

  // Scheduling
  SCHEDULE_GENERATED: 'scholarly.scheduling.generated',
  SCHEDULE_CONFLICT: 'scholarly.scheduling.conflict',

  // LIS Bridge
  LEARNING_INSIGHT: 'scholarly.lis.insight',
  INTERVENTION_RECOMMENDED: 'scholarly.lis.intervention',
} as const;

export type EventTopic = (typeof EventTopics)[keyof typeof EventTopics];
