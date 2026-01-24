/**
 * Booking Test Factory
 *
 * Creates test booking and session data.
 */

import { faker } from '@faker-js/faker';

export interface TestBooking {
  id: string;
  tenantId: string;
  tutorId: string;
  bookedByUserId: string;
  learnerIds: string[];
  scheduledStart: Date;
  scheduledEnd: Date;
  timezone: string;
  sessionType: string;
  subjectId: string;
  subjectName: string;
  topicsNeedingHelp: string[];
  curriculumCodes: string[];
  learnerNotes: string | null;
  isGroupSession: boolean;
  openToOthers: boolean;
  maxGroupSize: number;
  pricing: {
    hourlyRate: number;
    currency: string;
    totalAmount: number;
    platformFee: number;
    tutorEarnings: number;
  };
  status: string;
  cancellationReason: string | null;
  cancelledBy: string | null;
  cancelledAt: Date | null;
  paymentStatus: string;
  paymentId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestTutoringSession {
  id: string;
  tenantId: string;
  bookingId: string;
  tutorProfileId: string;
  tutorUserId: string;
  scheduledStart: Date;
  scheduledEnd: Date;
  actualStart: Date | null;
  actualEnd: Date | null;
  timezone: string;
  sessionType: string;
  isGroupSession: boolean;
  location: Record<string, unknown> | null;
  videoRoomUrl: string | null;
  subjectId: string;
  subjectName: string;
  topicsFocus: string[];
  curriculumCodes: string[];
  status: string;
  preworkAssigned: string | null;
  sessionNotes: string | null;
  homeworkAssigned: string | null;
  resourcesShared: string[];
  tutorFeedback: Record<string, unknown> | null;
  learnerFeedback: Record<string, unknown> | null;
  billingStatus: string;
  amountCharged: number;
  tutorEarnings: number;
  platformCommission: number;
  tokenRewards: number;
  createdAt: Date;
  updatedAt: Date;
}

let bookingCounter = 0;
let sessionCounter = 0;

const SUBJECTS = [
  { id: 'math', name: 'Mathematics' },
  { id: 'english', name: 'English' },
  { id: 'science', name: 'Science' },
  { id: 'history', name: 'History' },
  { id: 'physics', name: 'Physics' },
  { id: 'chemistry', name: 'Chemistry' },
  { id: 'biology', name: 'Biology' },
];

const SESSION_TYPES = ['one_on_one', 'small_group', 'online', 'in_person'];
const BOOKING_STATUSES = ['pending', 'confirmed', 'completed', 'cancelled'];

/**
 * Create a test booking
 */
export function createTestBooking(overrides: Partial<TestBooking> = {}): TestBooking {
  bookingCounter++;
  const subject = faker.helpers.arrayElement(SUBJECTS);
  const startDate = faker.date.future();
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000); // 1 hour later
  const hourlyRate = faker.number.int({ min: 40, max: 150 });
  const platformFee = hourlyRate * 0.15; // 15% fee

  return {
    id: `booking_${bookingCounter}_${faker.string.alphanumeric(8)}`,
    tenantId: `tenant_default`,
    tutorId: `tutor_profile_${faker.string.alphanumeric(8)}`,
    bookedByUserId: `user_${faker.string.alphanumeric(8)}`,
    learnerIds: [`learner_${faker.string.alphanumeric(8)}`],
    scheduledStart: startDate,
    scheduledEnd: endDate,
    timezone: 'Australia/Sydney',
    sessionType: faker.helpers.arrayElement(SESSION_TYPES),
    subjectId: subject.id,
    subjectName: subject.name,
    topicsNeedingHelp: [faker.lorem.words(3)],
    curriculumCodes: [`ACARA.${subject.id.toUpperCase()}.Y7.001`],
    learnerNotes: faker.lorem.sentence(),
    isGroupSession: false,
    openToOthers: false,
    maxGroupSize: 1,
    pricing: {
      hourlyRate,
      currency: 'AUD',
      totalAmount: hourlyRate,
      platformFee,
      tutorEarnings: hourlyRate - platformFee,
    },
    status: 'pending',
    cancellationReason: null,
    cancelledBy: null,
    cancelledAt: null,
    paymentStatus: 'pending',
    paymentId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a confirmed booking
 */
export function createConfirmedBooking(overrides: Partial<TestBooking> = {}): TestBooking {
  return createTestBooking({
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentId: `pay_${faker.string.alphanumeric(12)}`,
    ...overrides,
  });
}

/**
 * Create a completed booking
 */
export function createCompletedBooking(overrides: Partial<TestBooking> = {}): TestBooking {
  const past = faker.date.past();
  return createTestBooking({
    scheduledStart: past,
    scheduledEnd: new Date(past.getTime() + 60 * 60 * 1000),
    status: 'completed',
    paymentStatus: 'paid',
    paymentId: `pay_${faker.string.alphanumeric(12)}`,
    ...overrides,
  });
}

/**
 * Create a cancelled booking
 */
export function createCancelledBooking(overrides: Partial<TestBooking> = {}): TestBooking {
  return createTestBooking({
    status: 'cancelled',
    cancellationReason: faker.lorem.sentence(),
    cancelledBy: 'learner',
    cancelledAt: new Date(),
    paymentStatus: 'refunded',
    ...overrides,
  });
}

/**
 * Create a test tutoring session
 */
export function createTestSession(overrides: Partial<TestTutoringSession> = {}): TestTutoringSession {
  sessionCounter++;
  const subject = faker.helpers.arrayElement(SUBJECTS);
  const startDate = faker.date.future();
  const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

  return {
    id: `session_${sessionCounter}_${faker.string.alphanumeric(8)}`,
    tenantId: `tenant_default`,
    bookingId: `booking_${faker.string.alphanumeric(8)}`,
    tutorProfileId: `tutor_profile_${faker.string.alphanumeric(8)}`,
    tutorUserId: `user_${faker.string.alphanumeric(8)}`,
    scheduledStart: startDate,
    scheduledEnd: endDate,
    actualStart: null,
    actualEnd: null,
    timezone: 'Australia/Sydney',
    sessionType: faker.helpers.arrayElement(SESSION_TYPES),
    isGroupSession: false,
    location: null,
    videoRoomUrl: `https://meet.scholarly.app/room/${faker.string.alphanumeric(12)}`,
    subjectId: subject.id,
    subjectName: subject.name,
    topicsFocus: [faker.lorem.words(3)],
    curriculumCodes: [`ACARA.${subject.id.toUpperCase()}.Y7.001`],
    status: 'scheduled',
    preworkAssigned: null,
    sessionNotes: null,
    homeworkAssigned: null,
    resourcesShared: [],
    tutorFeedback: null,
    learnerFeedback: null,
    billingStatus: 'pending',
    amountCharged: 0,
    tutorEarnings: 0,
    platformCommission: 0,
    tokenRewards: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a completed session with feedback
 */
export function createCompletedSession(overrides: Partial<TestTutoringSession> = {}): TestTutoringSession {
  const past = faker.date.past();
  const end = new Date(past.getTime() + 55 * 60 * 1000); // 55 minutes

  return createTestSession({
    scheduledStart: past,
    scheduledEnd: new Date(past.getTime() + 60 * 60 * 1000),
    actualStart: past,
    actualEnd: end,
    status: 'completed',
    billingStatus: 'completed',
    amountCharged: 80,
    tutorEarnings: 68,
    platformCommission: 12,
    tokenRewards: 5,
    tutorFeedback: {
      rating: 5,
      progressNotes: faker.lorem.paragraph(),
      areasForImprovement: [faker.lorem.sentence()],
      recommendedNextSteps: [faker.lorem.sentence()],
    },
    learnerFeedback: {
      rating: 5,
      comment: faker.lorem.sentence(),
      wouldRecommend: true,
    },
    ...overrides,
  });
}

/**
 * Reset counters
 */
export function resetBookingFactoryCounters(): void {
  bookingCounter = 0;
  sessionCounter = 0;
}
