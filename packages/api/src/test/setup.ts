/**
 * Vitest Test Setup
 *
 * Runs before all tests to set up the test environment.
 */

import { beforeAll, afterAll, beforeEach, afterEach, vi } from 'vitest';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://localhost:5432/scholarly_test';
process.env.JWT_PRIVATE_KEY = 'test-private-key';
process.env.JWT_PUBLIC_KEY = 'test-public-key';
process.env.CORS_ORIGIN = 'http://localhost:3000';

// Mock external services
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    auth: {
      loginSuccess: vi.fn(),
      loginFailed: vi.fn(),
      tokenRefreshed: vi.fn(),
      tokenRevoked: vi.fn(),
      logout: vi.fn(),
    },
    booking: {
      created: vi.fn(),
      confirmed: vi.fn(),
      cancelled: vi.fn(),
      completed: vi.fn(),
    },
    blockchain: {
      txSubmitted: vi.fn(),
      txConfirmed: vi.fn(),
      txFailed: vi.fn(),
      escrowCreated: vi.fn(),
      escrowReleased: vi.fn(),
      credentialIssued: vi.fn(),
    },
    security: {
      rateLimitExceeded: vi.fn(),
      suspiciousActivity: vi.fn(),
      csrfFailed: vi.fn(),
    },
    performance: {
      slowQuery: vi.fn(),
      slowRequest: vi.fn(),
      cacheHit: vi.fn(),
      cacheMiss: vi.fn(),
    },
  },
  requestLogger: vi.fn((req: any, res: any, next: any) => next()),
  createServiceLogger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  })),
}));

// Mock Prisma client
vi.mock('@scholarly/database', () => ({
  prisma: {
    $connect: vi.fn(),
    $disconnect: vi.fn(),
    $queryRaw: vi.fn(),
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    tenant: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    booking: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    tutorProfile: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    tutoringSession: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    refreshToken: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    content: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    credentialNFT: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    escrowTransaction: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    onChainReputation: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    tokenTransaction: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Global test lifecycle hooks
beforeAll(async () => {
  // Setup that runs once before all tests
  console.log('Test suite starting...');
});

afterAll(async () => {
  // Cleanup that runs once after all tests
  console.log('Test suite complete.');
});

beforeEach(() => {
  // Reset mocks before each test
  vi.clearAllMocks();
});

afterEach(() => {
  // Cleanup after each test
});

// Global test utilities
export const testUtils = {
  // Wait for async operations
  wait: (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),

  // Generate random IDs
  generateId: () => Math.random().toString(36).substring(2, 15),

  // Create mock request
  mockRequest: (overrides: Record<string, any> = {}) => ({
    headers: {},
    body: {},
    params: {},
    query: {},
    user: undefined,
    tenantId: undefined,
    id: 'test-request-id',
    ...overrides,
  }),

  // Create mock response
  mockResponse: () => {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn().mockReturnValue(res);
    res.cookie = vi.fn().mockReturnValue(res);
    return res;
  },

  // Create mock next function
  mockNext: () => vi.fn(),
};
