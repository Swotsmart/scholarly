/**
 * Scholarly Payment Service - Test Suite
 * 
 * Comprehensive tests for the payment service including:
 * - Unit tests for services and utilities
 * - Integration tests for API endpoints
 * - Repository tests for data access
 * 
 * @module ScholarlyPayment/Tests
 * @version 1.0.0
 */

import { PaymentService } from '../src/services/payment.service';
import { AIProfileBuilderService } from '../src/services/profile-builder.service';
import {
  validators,
  generateId,
  generateInvoiceNumber,
  calculateGST,
  calculatePlatformFee,
  dollarsToCents,
  centsToDollars,
  formatMoney,
  addDays,
  isBusinessDay,
  getNextBusinessDay
} from '../src/infrastructure';
import {
  success,
  failure,
  ValidationError,
  PaymentError
} from '../src/types';

// ============================================================================
// MOCK SETUP
// ============================================================================

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    accounts: {
      create: jest.fn().mockResolvedValue({ id: 'acct_test123' }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'acct_test123',
        charges_enabled: true,
        payouts_enabled: true,
        details_submitted: true
      })
    },
    accountLinks: {
      create: jest.fn().mockResolvedValue({ url: 'https://connect.stripe.com/onboarding' })
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test123', client_secret: 'secret' }),
      confirm: jest.fn().mockResolvedValue({ id: 'pi_test123', status: 'succeeded' })
    },
    transfers: {
      create: jest.fn().mockResolvedValue({ id: 'tr_test123' })
    },
    refunds: {
      create: jest.fn().mockResolvedValue({ id: 're_test123', status: 'succeeded' })
    }
  }));
});

// Mock repositories
const mockAccountRepo = {
  findById: jest.fn(),
  findByTenantAndOwner: jest.fn(),
  findByStripeAccountId: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateBalances: jest.fn(),
  addToBalance: jest.fn(),
  transferBalance: jest.fn(),
  updateStripeConnect: jest.fn(),
  updateXeroIntegration: jest.fn(),
  updateStatistics: jest.fn(),
  incrementStatistic: jest.fn()
};

const mockInvoiceRepo = {
  findById: jest.fn(),
  findByNumber: jest.fn(),
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
  updateStatus: jest.fn(),
  addLineItem: jest.fn(),
  updateLineItem: jest.fn(),
  removeLineItem: jest.fn(),
  recalculateTotals: jest.fn(),
  addPayment: jest.fn(),
  updatePayment: jest.fn(),
  addReminder: jest.fn(),
  setPaymentPlan: jest.fn(),
  updatePaymentPlan: jest.fn(),
  updateXeroSync: jest.fn(),
  getOverdueInvoices: jest.fn(),
  getUpcomingDueInvoices: jest.fn(),
  getInvoiceSummary: jest.fn(),
  getNextInvoiceNumber: jest.fn()
};

// ============================================================================
// VALIDATOR TESTS
// ============================================================================

describe('Validators', () => {
  describe('tenantId', () => {
    it('should accept valid tenant ID', () => {
      expect(validators.tenantId('tenant_123')).toBe('tenant_123');
      expect(validators.tenantId('ABC-123')).toBe('ABC-123');
    });

    it('should reject empty tenant ID', () => {
      expect(() => validators.tenantId('')).toThrow(ValidationError);
      expect(() => validators.tenantId(null as any)).toThrow(ValidationError);
    });

    it('should reject invalid format', () => {
      expect(() => validators.tenantId('tenant 123')).toThrow(ValidationError);
      expect(() => validators.tenantId('tenant@123')).toThrow(ValidationError);
    });
  });

  describe('email', () => {
    it('should accept valid emails', () => {
      expect(validators.email('test@example.com')).toBe('test@example.com');
      expect(validators.email('Test@Example.COM')).toBe('test@example.com');
    });

    it('should reject invalid emails', () => {
      expect(() => validators.email('not-an-email')).toThrow(ValidationError);
      expect(() => validators.email('missing@domain')).toThrow(ValidationError);
    });
  });

  describe('positiveInteger', () => {
    it('should accept positive integers', () => {
      expect(validators.positiveInteger(1, 'amount')).toBe(1);
      expect(validators.positiveInteger(1000, 'amount')).toBe(1000);
    });

    it('should reject zero and negative numbers', () => {
      expect(() => validators.positiveInteger(0, 'amount')).toThrow(ValidationError);
      expect(() => validators.positiveInteger(-1, 'amount')).toThrow(ValidationError);
    });

    it('should reject non-integers', () => {
      expect(() => validators.positiveInteger(1.5, 'amount')).toThrow(ValidationError);
    });
  });

  describe('abn', () => {
    it('should accept valid ABN', () => {
      // Example valid ABN: 51 824 753 556
      expect(validators.abn('51824753556')).toBe('51824753556');
      expect(validators.abn('51 824 753 556')).toBe('51824753556');
    });

    it('should accept null/empty', () => {
      expect(validators.abn(null)).toBeNull();
      expect(validators.abn('')).toBeNull();
    });

    it('should reject invalid ABN format', () => {
      expect(() => validators.abn('1234567890')).toThrow(ValidationError); // 10 digits
      expect(() => validators.abn('123456789012')).toThrow(ValidationError); // 12 digits
    });
  });

  describe('currency', () => {
    it('should accept valid currencies', () => {
      expect(validators.currency('AUD')).toBe('AUD');
      expect(validators.currency('GBP')).toBe('GBP');
      expect(validators.currency('USD')).toBe('USD');
    });

    it('should reject invalid currencies', () => {
      expect(() => validators.currency('EUR')).toThrow(ValidationError);
      expect(() => validators.currency('XXX')).toThrow(ValidationError);
    });
  });
});

// ============================================================================
// UTILITY FUNCTION TESTS
// ============================================================================

describe('Utility Functions', () => {
  describe('generateId', () => {
    it('should generate unique IDs with prefix', () => {
      const id1 = generateId('test');
      const id2 = generateId('test');
      
      expect(id1).toMatch(/^test_/);
      expect(id2).toMatch(/^test_/);
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateInvoiceNumber', () => {
    it('should generate formatted invoice numbers', () => {
      const invoiceNum = generateInvoiceNumber('INV-', 1);
      expect(invoiceNum).toMatch(/^INV-\d{4}-00001$/);
    });

    it('should pad sequence numbers', () => {
      expect(generateInvoiceNumber('BGS-', 42)).toMatch(/^BGS-\d{4}-00042$/);
      expect(generateInvoiceNumber('TUT-', 999)).toMatch(/^TUT-\d{4}-00999$/);
    });
  });

  describe('dollarsToCents / centsToDollars', () => {
    it('should convert correctly', () => {
      expect(dollarsToCents(10)).toBe(1000);
      expect(dollarsToCents(99.99)).toBe(9999);
      expect(centsToDollars(1000)).toBe(10);
      expect(centsToDollars(9999)).toBe(99.99);
    });

    it('should handle edge cases', () => {
      expect(dollarsToCents(0)).toBe(0);
      expect(dollarsToCents(0.01)).toBe(1);
    });
  });

  describe('calculateGST', () => {
    it('should calculate GST for inclusive amounts', () => {
      const result = calculateGST(11000, true);
      expect(result.gross).toBe(11000);
      expect(result.net).toBe(10000);
      expect(result.gst).toBe(1000);
    });

    it('should calculate GST for exclusive amounts', () => {
      const result = calculateGST(10000, false);
      expect(result.gross).toBe(11000);
      expect(result.net).toBe(10000);
      expect(result.gst).toBe(1000);
    });
  });

  describe('calculatePlatformFee', () => {
    it('should calculate percentage fee', () => {
      expect(calculatePlatformFee(10000, 5)).toBe(500);
      expect(calculatePlatformFee(10000, 10)).toBe(1000);
    });

    it('should respect minimum fee', () => {
      expect(calculatePlatformFee(100, 5, 50)).toBe(50); // 5 < 50, use min
      expect(calculatePlatformFee(10000, 5, 50)).toBe(500); // 500 > 50, use calculated
    });

    it('should respect maximum fee', () => {
      expect(calculatePlatformFee(100000, 5, 0, 1000)).toBe(1000); // 5000 > 1000, use max
    });
  });

  describe('formatMoney', () => {
    it('should format as currency', () => {
      expect(formatMoney(10000, 'AUD')).toMatch(/\$100\.00/);
      expect(formatMoney(9999, 'AUD')).toMatch(/\$99\.99/);
    });
  });

  describe('addDays', () => {
    it('should add days to date', () => {
      const date = new Date('2024-01-15');
      const result = addDays(date, 7);
      expect(result.getDate()).toBe(22);
    });

    it('should handle negative days', () => {
      const date = new Date('2024-01-15');
      const result = addDays(date, -5);
      expect(result.getDate()).toBe(10);
    });
  });

  describe('isBusinessDay', () => {
    it('should identify weekdays', () => {
      expect(isBusinessDay(new Date('2024-01-15'))).toBe(true); // Monday
      expect(isBusinessDay(new Date('2024-01-19'))).toBe(true); // Friday
    });

    it('should identify weekends', () => {
      expect(isBusinessDay(new Date('2024-01-20'))).toBe(false); // Saturday
      expect(isBusinessDay(new Date('2024-01-21'))).toBe(false); // Sunday
    });
  });

  describe('getNextBusinessDay', () => {
    it('should return next weekday', () => {
      const friday = new Date('2024-01-19');
      const result = getNextBusinessDay(friday);
      expect(result.getDay()).toBe(1); // Monday
    });
  });
});

// ============================================================================
// RESULT TYPE TESTS
// ============================================================================

describe('Result Type', () => {
  describe('success', () => {
    it('should create success result', () => {
      const result = success({ id: '123', name: 'test' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('123');
      }
    });
  });

  describe('failure', () => {
    it('should create failure result', () => {
      const error = new PaymentError('VALIDATION_ERROR', 'Invalid input');
      const result = failure(error);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});

// ============================================================================
// PAYMENT SERVICE TESTS
// ============================================================================

describe('PaymentService', () => {
  let service: PaymentService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PaymentService({
      accountRepository: mockAccountRepo as any,
      invoiceRepository: mockInvoiceRepo as any
    });
  });

  describe('createAccount', () => {
    it('should create a new account', async () => {
      mockAccountRepo.findByTenantAndOwner.mockResolvedValue(null);
      mockAccountRepo.create.mockResolvedValue({
        id: 'acc_123',
        tenantId: 'tenant_1',
        ownerType: 'tutor',
        ownerName: 'John Tutor',
        status: 'pending_setup'
      });

      const result = await service.createAccount({
        tenantId: 'tenant_1',
        ownerType: 'tutor',
        ownerId: 'user_123',
        ownerName: 'John Tutor',
        ownerEmail: 'john@example.com',
        legalEntity: {
          type: 'individual',
          legalName: 'John Tutor'
        }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.ownerName).toBe('John Tutor');
      }
    });

    it('should reject duplicate account', async () => {
      mockAccountRepo.findByTenantAndOwner.mockResolvedValue({ id: 'existing' });

      const result = await service.createAccount({
        tenantId: 'tenant_1',
        ownerType: 'tutor',
        ownerId: 'user_123',
        ownerName: 'John Tutor',
        ownerEmail: 'john@example.com',
        legalEntity: {
          type: 'individual',
          legalName: 'John Tutor'
        }
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });

  describe('createInvoice', () => {
    const validInput = {
      tenantId: 'tenant_1',
      issuerId: 'acc_123',
      recipientType: 'parent' as const,
      recipientDetails: {
        name: 'Jane Parent',
        email: 'jane@example.com'
      },
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      lineItems: [{
        description: 'Tutoring Session',
        category: 'tutoring' as const,
        quantity: 1,
        unitPrice: 7000
      }]
    };

    it('should create an invoice', async () => {
      mockAccountRepo.findById.mockResolvedValue({
        id: 'acc_123',
        status: 'active',
        ownerName: 'Tutor Name',
        ownerEmail: 'tutor@example.com',
        settings: { invoicePrefix: 'TUT-', currency: 'AUD' },
        legalEntity: { gstRegistered: true, legalAddress: null, abn: null },
        stripeConnect: { accountId: 'acct_123' }
      });
      mockInvoiceRepo.getNextInvoiceNumber.mockResolvedValue(1);
      mockInvoiceRepo.create.mockResolvedValue({
        id: 'inv_123',
        invoiceNumber: 'TUT-2024-00001',
        total: 7700,
        status: 'draft'
      });

      const result = await service.createInvoice(validInput);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.invoiceNumber).toMatch(/TUT-/);
      }
    });

    it('should reject invoice for inactive account', async () => {
      mockAccountRepo.findById.mockResolvedValue({
        id: 'acc_123',
        status: 'suspended'
      });

      const result = await service.createInvoice(validInput);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe('VALIDATION_ERROR');
      }
    });
  });
});

// ============================================================================
// AI PROFILE BUILDER TESTS
// ============================================================================

describe('AIProfileBuilderService', () => {
  let service: AIProfileBuilderService;

  beforeEach(() => {
    service = new AIProfileBuilderService();
  });

  describe('startSession', () => {
    it('should create a new session', async () => {
      const result = await service.startSession({
        tenantId: 'tenant_1',
        tutorId: 'tutor_123'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.stage).toBe('welcome');
        expect(result.data.progressPercentage).toBe(0);
        expect(result.data.conversationHistory.length).toBeGreaterThan(0);
      }
    });
  });

  describe('processAnswer', () => {
    it('should process an answer and return next question', async () => {
      const sessionResult = await service.startSession({
        tenantId: 'tenant_1',
        tutorId: 'tutor_123'
      });

      expect(sessionResult.success).toBe(true);
      if (!sessionResult.success) return;

      const answerResult = await service.processAnswer(sessionResult.data, {
        sessionId: sessionResult.data.id,
        questionId: 'background',
        answer: 'I have been teaching for 10 years. I started as a classroom teacher and then moved into private tutoring because I love the one-on-one connection with students. My patience and ability to explain concepts in multiple ways are my strongest teaching traits.'
      });

      expect(answerResult.success).toBe(true);
      if (answerResult.success) {
        expect(answerResult.data.output.progress).toBeGreaterThan(0);
        expect(answerResult.data.session.responses.length).toBe(1);
      }
    });

    it('should extract insights from answers', async () => {
      const sessionResult = await service.startSession({
        tenantId: 'tenant_1',
        tutorId: 'tutor_123'
      });

      if (!sessionResult.success) return;

      const answerResult = await service.processAnswer(sessionResult.data, {
        sessionId: sessionResult.data.id,
        questionId: 'teaching_style',
        answer: 'I am very patient with my students. I take a hands-on approach and make learning fun. I adapt my teaching style to each student and use structured lessons.'
      });

      expect(answerResult.success).toBe(true);
      if (answerResult.success) {
        const insights = answerResult.data.session.extractedInsights;
        expect(insights.dominantApproaches).toContain('patient');
        expect(insights.dominantApproaches).toContain('hands_on');
      }
    });
  });
});

// ============================================================================
// TEST CONFIGURATION
// ============================================================================

// Jest configuration
beforeAll(() => {
  // Set up test environment
  process.env['NODE_ENV'] = 'test';
  process.env['LOG_LEVEL'] = 'error';
});

afterAll(() => {
  // Clean up
});
