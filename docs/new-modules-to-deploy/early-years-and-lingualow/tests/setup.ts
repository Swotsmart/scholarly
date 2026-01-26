/**
 * Jest Test Setup
 * 
 * Runs before all tests to configure the test environment
 */

import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-minimum-32-characters-long';
process.env.LOG_LEVEL = 'silent';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Global test utilities
declare global {
  namespace NodeJS {
    interface Global {
      testTenantId: string;
      testUserId: string;
    }
  }
}

// Mock console methods in tests to reduce noise
if (process.env.SUPPRESS_LOGS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  };
}
