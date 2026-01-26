/**
 * Jest Configuration
 * 
 * Separate configurations for unit and integration tests
 */

import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  
  // Root directory
  rootDir: '.',
  
  // Module resolution
  moduleNameMapper: {
    '^@scholarly/shared$': '<rootDir>/packages/shared/src/index.ts',
    '^@scholarly/database$': '<rootDir>/packages/database/src/index.ts',
    '^@scholarly/validation$': '<rootDir>/packages/validation/src/index.ts',
    '^@scholarly/early-years$': '<rootDir>/services/early-years/src/index.ts',
    '^@scholarly/linguaflow$': '<rootDir>/services/linguaflow/src/index.ts',
  },
  
  // Transform
  transform: {
    '^.+\\.tsx?$': ['ts-jest', {
      useESM: true,
      tsconfig: 'tsconfig.json',
    }],
  },
  
  // File extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // Test patterns
  testMatch: [
    '<rootDir>/tests/**/*.test.ts',
    '<rootDir>/tests/**/*.spec.ts',
  ],
  
  // Coverage
  collectCoverageFrom: [
    'packages/*/src/**/*.ts',
    'services/*/src/**/*.ts',
    'apps/*/src/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  
  // Setup
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Timeouts
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Force exit after tests complete
  forceExit: true,
  
  // Detect open handles
  detectOpenHandles: true,
};

export default config;
