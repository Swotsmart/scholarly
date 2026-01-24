/**
 * Blockchain Test Factory
 *
 * Creates test blockchain data (credentials, escrows, transactions).
 */

import { faker } from '@faker-js/faker';

export interface TestCredentialNFT {
  id: string;
  tenantId: string;
  userId: string;
  tokenId: bigint;
  contractAddress: string;
  credentialType: string;
  metadata: {
    title: string;
    description: string;
    issuer: string;
    issuedAt: string;
    expiresAt?: string;
  };
  dataHash: string;
  issuedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revocationReason: string | null;
  mintTxHash: string;
  revokeTxHash: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestEscrowTransaction {
  id: string;
  tenantId: string;
  escrowId: string;
  bookingId: string;
  learnerId: string;
  tutorId: string;
  learnerWallet: string;
  tutorWallet: string;
  amount: string;
  platformFeeBps: number;
  platformFee: string;
  tutorAmount: string;
  status: string;
  createTxHash: string | null;
  fundTxHash: string | null;
  releaseTxHash: string | null;
  refundTxHash: string | null;
  disputeReason: string | null;
  disputeRaisedAt: Date | null;
  disputeResolvedAt: Date | null;
  disputeResolution: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TestTokenTransaction {
  id: string;
  tenantId: string;
  userId: string;
  type: string;
  amount: string;
  fromAddress: string | null;
  toAddress: string;
  referenceType: string | null;
  referenceId: string | null;
  txHash: string;
  blockNumber: number | null;
  gasUsed: string | null;
  status: string;
  createdAt: Date;
  confirmedAt: Date | null;
}

let credentialCounter = 0;
let escrowCounter = 0;
let txCounter = 0;

const CREDENTIAL_TYPES = [
  'tutor_qualification',
  'course_completion',
  'achievement',
  'safeguarding',
  'background_check',
];

const ESCROW_STATUSES = ['created', 'funded', 'released', 'refunded', 'disputed', 'resolved'];
const TX_TYPES = ['mint', 'transfer', 'burn', 'reward', 'purchase', 'payout'];
const TX_STATUSES = ['pending', 'confirmed', 'failed'];

/**
 * Generate a fake Ethereum address
 */
function generateAddress(): string {
  return `0x${faker.string.hexadecimal({ length: 40, casing: 'lower' }).slice(2)}`;
}

/**
 * Generate a fake transaction hash
 */
function generateTxHash(): string {
  return `0x${faker.string.hexadecimal({ length: 64, casing: 'lower' }).slice(2)}`;
}

/**
 * Create a test credential NFT
 */
export function createTestCredential(overrides: Partial<TestCredentialNFT> = {}): TestCredentialNFT {
  credentialCounter++;
  const credentialType = faker.helpers.arrayElement(CREDENTIAL_TYPES);

  return {
    id: `cred_${credentialCounter}_${faker.string.alphanumeric(8)}`,
    tenantId: `tenant_default`,
    userId: `user_${faker.string.alphanumeric(8)}`,
    tokenId: BigInt(credentialCounter),
    contractAddress: generateAddress(),
    credentialType,
    metadata: {
      title: `${credentialType.replace('_', ' ').toUpperCase()} Certificate`,
      description: faker.lorem.sentence(),
      issuer: 'Scholarly Platform',
      issuedAt: new Date().toISOString(),
    },
    dataHash: generateTxHash(),
    issuedAt: new Date(),
    expiresAt: credentialType === 'safeguarding' ? faker.date.future({ years: 3 }) : null,
    revokedAt: null,
    revocationReason: null,
    mintTxHash: generateTxHash(),
    revokeTxHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a revoked credential
 */
export function createRevokedCredential(overrides: Partial<TestCredentialNFT> = {}): TestCredentialNFT {
  return createTestCredential({
    revokedAt: new Date(),
    revocationReason: faker.lorem.sentence(),
    revokeTxHash: generateTxHash(),
    ...overrides,
  });
}

/**
 * Create an expired credential
 */
export function createExpiredCredential(overrides: Partial<TestCredentialNFT> = {}): TestCredentialNFT {
  return createTestCredential({
    credentialType: 'safeguarding',
    expiresAt: faker.date.past(),
    ...overrides,
  });
}

/**
 * Create a test escrow transaction
 */
export function createTestEscrow(overrides: Partial<TestEscrowTransaction> = {}): TestEscrowTransaction {
  escrowCounter++;
  const amount = faker.number.int({ min: 50, max: 200 });
  const platformFeeBps = 500; // 5%
  const platformFee = (amount * platformFeeBps) / 10000;
  const tutorAmount = amount - platformFee;

  return {
    id: `escrow_${escrowCounter}_${faker.string.alphanumeric(8)}`,
    tenantId: `tenant_default`,
    escrowId: generateTxHash().slice(0, 66), // bytes32
    bookingId: `booking_${faker.string.alphanumeric(8)}`,
    learnerId: `user_${faker.string.alphanumeric(8)}`,
    tutorId: `user_${faker.string.alphanumeric(8)}`,
    learnerWallet: generateAddress(),
    tutorWallet: generateAddress(),
    amount: amount.toString(),
    platformFeeBps,
    platformFee: platformFee.toString(),
    tutorAmount: tutorAmount.toString(),
    status: 'created',
    createTxHash: null,
    fundTxHash: null,
    releaseTxHash: null,
    refundTxHash: null,
    disputeReason: null,
    disputeRaisedAt: null,
    disputeResolvedAt: null,
    disputeResolution: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a funded escrow
 */
export function createFundedEscrow(overrides: Partial<TestEscrowTransaction> = {}): TestEscrowTransaction {
  return createTestEscrow({
    status: 'funded',
    createTxHash: generateTxHash(),
    fundTxHash: generateTxHash(),
    ...overrides,
  });
}

/**
 * Create a released escrow
 */
export function createReleasedEscrow(overrides: Partial<TestEscrowTransaction> = {}): TestEscrowTransaction {
  return createTestEscrow({
    status: 'released',
    createTxHash: generateTxHash(),
    fundTxHash: generateTxHash(),
    releaseTxHash: generateTxHash(),
    ...overrides,
  });
}

/**
 * Create a disputed escrow
 */
export function createDisputedEscrow(overrides: Partial<TestEscrowTransaction> = {}): TestEscrowTransaction {
  return createTestEscrow({
    status: 'disputed',
    createTxHash: generateTxHash(),
    fundTxHash: generateTxHash(),
    disputeReason: faker.lorem.sentence(),
    disputeRaisedAt: new Date(),
    ...overrides,
  });
}

/**
 * Create a test token transaction
 */
export function createTestTokenTransaction(overrides: Partial<TestTokenTransaction> = {}): TestTokenTransaction {
  txCounter++;
  const type = faker.helpers.arrayElement(TX_TYPES);

  return {
    id: `tx_${txCounter}_${faker.string.alphanumeric(8)}`,
    tenantId: `tenant_default`,
    userId: `user_${faker.string.alphanumeric(8)}`,
    type,
    amount: faker.number.int({ min: 1, max: 1000 }).toString(),
    fromAddress: type === 'mint' ? null : generateAddress(),
    toAddress: generateAddress(),
    referenceType: null,
    referenceId: null,
    txHash: generateTxHash(),
    blockNumber: faker.number.int({ min: 1000000, max: 9999999 }),
    gasUsed: faker.number.int({ min: 21000, max: 100000 }).toString(),
    status: 'confirmed',
    createdAt: new Date(),
    confirmedAt: new Date(),
    ...overrides,
  };
}

/**
 * Create a pending token transaction
 */
export function createPendingTokenTransaction(overrides: Partial<TestTokenTransaction> = {}): TestTokenTransaction {
  return createTestTokenTransaction({
    status: 'pending',
    blockNumber: null,
    gasUsed: null,
    confirmedAt: null,
    ...overrides,
  });
}

/**
 * Create a reward transaction
 */
export function createRewardTransaction(
  userId: string,
  sessionId: string,
  amount: number,
  overrides: Partial<TestTokenTransaction> = {}
): TestTokenTransaction {
  return createTestTokenTransaction({
    userId,
    type: 'reward',
    amount: amount.toString(),
    referenceType: 'session',
    referenceId: sessionId,
    ...overrides,
  });
}

/**
 * Reset counters
 */
export function resetBlockchainFactoryCounters(): void {
  credentialCounter = 0;
  escrowCounter = 0;
  txCounter = 0;
}
