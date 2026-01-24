/**
 * User Test Factory
 *
 * Creates test user data with sensible defaults.
 */

import { faker } from '@faker-js/faker';

export interface TestUser {
  id: string;
  tenantId: string;
  email: string;
  passwordHash: string;
  displayName: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  bio: string | null;
  roles: string[];
  jurisdiction: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  trustScore: number;
  tokenBalance: number;
  walletAddress: string | null;
  walletVerifiedAt: Date | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  lastActiveAt: Date | null;
  lastLoginAt: Date | null;
}

export interface TestTenant {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  settings: Record<string, unknown>;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

let tenantCounter = 0;
let userCounter = 0;

/**
 * Create a test tenant
 */
export function createTestTenant(overrides: Partial<TestTenant> = {}): TestTenant {
  tenantCounter++;
  return {
    id: `tenant_${tenantCounter}_${faker.string.alphanumeric(8)}`,
    name: faker.company.name(),
    slug: `test-tenant-${tenantCounter}`,
    domain: faker.internet.domainName(),
    settings: {},
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a test user
 */
export function createTestUser(overrides: Partial<TestUser> = {}): TestUser {
  userCounter++;
  const firstName = faker.person.firstName();
  const lastName = faker.person.lastName();

  return {
    id: `user_${userCounter}_${faker.string.alphanumeric(8)}`,
    tenantId: overrides.tenantId || `tenant_default`,
    email: faker.internet.email({ firstName, lastName }),
    passwordHash: '$2b$12$abcdefghijklmnopqrstuv', // Fake bcrypt hash
    displayName: `${firstName} ${lastName}`,
    firstName,
    lastName,
    avatarUrl: faker.image.avatar(),
    bio: faker.lorem.paragraph(),
    roles: ['learner'],
    jurisdiction: 'AU_NSW',
    emailVerified: true,
    phoneVerified: false,
    identityVerified: false,
    trustScore: faker.number.float({ min: 30, max: 100 }),
    tokenBalance: faker.number.float({ min: 0, max: 1000 }),
    walletAddress: null,
    walletVerifiedAt: null,
    status: 'active',
    createdAt: faker.date.past(),
    updatedAt: new Date(),
    lastActiveAt: faker.date.recent(),
    lastLoginAt: faker.date.recent(),
    ...overrides,
  };
}

/**
 * Create a test tutor user
 */
export function createTestTutor(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    roles: ['tutor'],
    identityVerified: true,
    trustScore: faker.number.float({ min: 70, max: 100 }),
    ...overrides,
  });
}

/**
 * Create a test admin user
 */
export function createTestAdmin(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    roles: ['platform_admin'],
    identityVerified: true,
    emailVerified: true,
    phoneVerified: true,
    trustScore: 100,
    ...overrides,
  });
}

/**
 * Create a test parent user
 */
export function createTestParent(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    roles: ['parent'],
    ...overrides,
  });
}

/**
 * Create a user with wallet connected
 */
export function createTestUserWithWallet(overrides: Partial<TestUser> = {}): TestUser {
  return createTestUser({
    walletAddress: `0x${faker.string.hexadecimal({ length: 40, casing: 'lower' }).slice(2)}`,
    walletVerifiedAt: new Date(),
    ...overrides,
  });
}

/**
 * Reset counters (call between test files if needed)
 */
export function resetFactoryCounters(): void {
  tenantCounter = 0;
  userCounter = 0;
}
