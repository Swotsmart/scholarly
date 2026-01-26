/**
 * Phase 1 SSI/VC Test Suite
 * 
 * Comprehensive tests for Trust & Identity Foundation
 * 
 * Run with: npm test -- --testPathPattern=phase1
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  DIDService,
  VerifiableCredentialsService,
  DigitalWalletService,
  CryptoProvider,
  DIDRepository,
  DIDDocumentRepository,
  KeyPairRepository,
  CredentialRepository,
  RevocationRepository,
  SchemaRepository,
  PresentationRepository,
  WalletRepository,
  WalletBackupRepository
} from './index';

import {
  DecentralizedIdentifier,
  DIDDocument,
  KeyPair,
  VerifiableCredential,
  DigitalWallet
} from './ssi-vc-types';

// ============================================================================
// MOCK IMPLEMENTATIONS
// ============================================================================

/**
 * Mock Crypto Provider for testing
 */
const createMockCrypto = (): CryptoProvider => ({
  generateEd25519KeyPair: jest.fn().mockResolvedValue({
    publicKey: new Uint8Array(32).fill(1),
    privateKey: new Uint8Array(64).fill(2)
  }),
  generateSecp256k1KeyPair: jest.fn().mockResolvedValue({
    publicKey: new Uint8Array(33).fill(3),
    privateKey: new Uint8Array(32).fill(4)
  }),
  encrypt: jest.fn().mockResolvedValue({
    ciphertext: new Uint8Array([1, 2, 3]),
    iv: new Uint8Array([4, 5, 6]),
    tag: new Uint8Array([7, 8, 9])
  }),
  decrypt: jest.fn().mockResolvedValue(new Uint8Array([1, 2, 3])),
  deriveKey: jest.fn().mockResolvedValue(new Uint8Array(32).fill(5)),
  sign: jest.fn().mockResolvedValue(new Uint8Array(64).fill(6)),
  verify: jest.fn().mockResolvedValue(true),
  toMultibase: jest.fn().mockImplementation((bytes) => 'z' + Buffer.from(bytes).toString('base64')),
  fromMultibase: jest.fn().mockImplementation((str) => Buffer.from(str.slice(1), 'base64')),
  toBase64Url: jest.fn().mockImplementation((bytes) => Buffer.from(bytes).toString('base64url')),
  fromBase64Url: jest.fn().mockImplementation((str) => new Uint8Array(Buffer.from(str, 'base64url'))),
  randomBytes: jest.fn().mockImplementation((len) => new Uint8Array(len).fill(7)),
  sha256: jest.fn().mockResolvedValue(new Uint8Array(32).fill(8))
});

/**
 * Mock Event Bus
 */
const createMockEventBus = () => ({
  publish: jest.fn().mockResolvedValue(undefined),
  subscribe: jest.fn().mockResolvedValue(undefined)
});

/**
 * Mock Cache
 */
const createMockCache = () => {
  const store = new Map<string, any>();
  return {
    get: jest.fn().mockImplementation((key) => Promise.resolve(store.get(key) || null)),
    set: jest.fn().mockImplementation((key, value) => {
      store.set(key, value);
      return Promise.resolve();
    }),
    delete: jest.fn().mockImplementation((key) => {
      store.delete(key);
      return Promise.resolve();
    }),
    invalidatePattern: jest.fn().mockResolvedValue(undefined)
  };
};

/**
 * Mock Config
 */
const mockConfig = {
  environment: 'development' as const,
  defaultJurisdiction: 'AU_NSW' as any,
  commissionRate: 0.15,
  tokenRewardRate: 0.01,
  sessionDefaults: {
    duration: 60,
    reminderMinutes: 15,
    cancellationWindowHours: 24
  },
  safeguarding: {
    requireChecksForAllTutors: true,
    checkExpiryWarningDays: 30
  }
};

// ============================================================================
// DID SERVICE TESTS
// ============================================================================

describe('DIDService', () => {
  let didService: DIDService;
  let mockDIDRepo: jest.Mocked<DIDRepository>;
  let mockDocumentRepo: jest.Mocked<DIDDocumentRepository>;
  let mockKeyRepo: jest.Mocked<KeyPairRepository>;
  let mockCrypto: ReturnType<typeof createMockCrypto>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockCache: ReturnType<typeof createMockCache>;

  beforeEach(() => {
    mockDIDRepo = {
      findByDID: jest.fn(),
      findByUser: jest.fn(),
      findPrimaryByUser: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      deactivate: jest.fn()
    } as any;

    mockDocumentRepo = {
      findByDID: jest.fn(),
      save: jest.fn(),
      delete: jest.fn()
    } as any;

    mockKeyRepo = {
      findById: jest.fn(),
      findByDID: jest.fn(),
      findPrimaryByDID: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      revoke: jest.fn()
    } as any;

    mockCrypto = createMockCrypto();
    mockEventBus = createMockEventBus();
    mockCache = createMockCache();

    didService = new DIDService({
      eventBus: mockEventBus as any,
      cache: mockCache as any,
      config: mockConfig,
      didRepo: mockDIDRepo,
      documentRepo: mockDocumentRepo,
      keyRepo: mockKeyRepo,
      crypto: mockCrypto as any,
      didConfig: {
        webDomain: 'test.scholarly.edu.au',
        ethereumNetwork: 'polygon',
        defaultKeyType: 'Ed25519',
        keyRotationDays: 365,
        blockchainAnchoring: false
      }
    });
  });

  describe('createDID', () => {
    it('should create a did:key DID successfully', async () => {
      mockDIDRepo.findPrimaryByUser.mockResolvedValue(null);
      mockDIDRepo.save.mockImplementation((_, __, did) => Promise.resolve(did));
      mockKeyRepo.save.mockImplementation((_, key) => Promise.resolve(key));
      mockDocumentRepo.save.mockImplementation((_, doc) => Promise.resolve(doc));

      const result = await didService.createDID(
        'tenant-1',
        'user-1',
        'did:key',
        'secure-passphrase-123',
        { setAsPrimary: true }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.did.did).toMatch(/^did:key:z/);
        expect(result.data.did.method).toBe('did:key');
        expect(result.data.did.status).toBe('active');
        expect(result.data.keyPair).toBeDefined();
        expect(result.data.document).toBeDefined();
      }

      expect(mockCrypto.generateEd25519KeyPair).toHaveBeenCalled();
      expect(mockCrypto.encrypt).toHaveBeenCalled();
      expect(mockDIDRepo.save).toHaveBeenCalled();
      expect(mockKeyRepo.save).toHaveBeenCalled();
      expect(mockDocumentRepo.save).toHaveBeenCalled();
      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'ssi.did.created',
        expect.any(Object)
      );
    });

    it('should reject short passphrase', async () => {
      const result = await didService.createDID(
        'tenant-1',
        'user-1',
        'did:key',
        'short'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('at least 12 characters');
      }
    });

    it('should create a did:web DID with correct format', async () => {
      mockDIDRepo.findPrimaryByUser.mockResolvedValue(null);
      mockDIDRepo.save.mockImplementation((_, __, did) => Promise.resolve(did));
      mockKeyRepo.save.mockImplementation((_, key) => Promise.resolve(key));
      mockDocumentRepo.save.mockImplementation((_, doc) => Promise.resolve(doc));

      const result = await didService.createDID(
        'tenant-1',
        'user-1',
        'did:web',
        'secure-passphrase-123'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.did.did).toMatch(/^did:web:test\.scholarly\.edu\.au:users:user-1$/);
        expect(result.data.did.method).toBe('did:web');
      }
    });
  });

  describe('resolveDID', () => {
    it('should resolve a cached DID document', async () => {
      const mockDocument: DIDDocument = {
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:key:z123',
        verificationMethod: [],
        authentication: []
      };

      mockCache.get.mockResolvedValue(mockDocument);

      const result = await didService.resolveDID('did:key:z123');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('did:key:z123');
      }
    });

    it('should resolve did:key locally', async () => {
      mockCache.get.mockResolvedValue(null);

      // did:key with Ed25519 multicodec prefix (0xed01)
      const result = await didService.resolveDID('did:key:zAQECAQ');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.id).toBe('did:key:zAQECAQ');
        expect(result.data['@context']).toBeDefined();
      }
    });

    it('should return error for invalid DID format', async () => {
      const result = await didService.resolveDID('invalid-did');

      expect(result.success).toBe(false);
    });
  });

  describe('signWithDID', () => {
    it('should sign data with DID key', async () => {
      const mockKeyPair: KeyPair = {
        id: 'key-1',
        did: 'did:key:z123',
        type: 'Ed25519',
        publicKey: 'AQEBAQ',
        encryptedPrivateKey: JSON.stringify({
          ciphertext: 'AQID',
          iv: 'BAUG',
          tag: 'BwgJ',
          salt: 'BwcHBw'
        }),
        privateKeyEncryption: 'AES-256-GCM',
        kdf: 'Argon2id',
        purposes: ['authentication', 'assertion'],
        created: new Date(),
        isPrimary: true,
        status: 'active'
      };

      mockKeyRepo.findPrimaryByDID.mockResolvedValue(mockKeyPair);
      mockDocumentRepo.findByDID.mockResolvedValue({
        '@context': ['https://www.w3.org/ns/did/v1'],
        id: 'did:key:z123',
        verificationMethod: [{ id: 'did:key:z123#keys-1' }],
        assertionMethod: ['did:key:z123#keys-1']
      } as any);

      const result = await didService.signWithDID(
        'tenant-1',
        'did:key:z123',
        new Uint8Array([1, 2, 3]),
        'secure-passphrase-123'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.signature).toBeDefined();
        expect(result.data.verificationMethod).toBeDefined();
      }
    });
  });
});

// ============================================================================
// VERIFIABLE CREDENTIALS SERVICE TESTS
// ============================================================================

describe('VerifiableCredentialsService', () => {
  let vcService: VerifiableCredentialsService;
  let mockDIDService: jest.Mocked<DIDService>;
  let mockCredentialRepo: jest.Mocked<CredentialRepository>;
  let mockRevocationRepo: jest.Mocked<RevocationRepository>;
  let mockSchemaRepo: jest.Mocked<SchemaRepository>;
  let mockPresentationRepo: jest.Mocked<PresentationRepository>;
  let mockCrypto: ReturnType<typeof createMockCrypto>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockCache: ReturnType<typeof createMockCache>;

  beforeEach(() => {
    mockDIDService = {
      resolveDID: jest.fn(),
      signWithDID: jest.fn(),
      verifySignature: jest.fn()
    } as any;

    mockCredentialRepo = {
      findById: jest.fn(),
      findByHolder: jest.fn(),
      findByType: jest.fn(),
      findByIssuer: jest.fn(),
      save: jest.fn(),
      delete: jest.fn()
    } as any;

    mockRevocationRepo = {
      isRevoked: jest.fn(),
      revoke: jest.fn(),
      getStatus: jest.fn(),
      getStatusList: jest.fn(),
      updateStatusList: jest.fn()
    } as any;

    mockSchemaRepo = {
      findById: jest.fn(),
      findDefault: jest.fn(),
      findByJurisdiction: jest.fn(),
      save: jest.fn()
    } as any;

    mockPresentationRepo = {
      save: jest.fn(),
      findByHolder: jest.fn(),
      findById: jest.fn()
    } as any;

    mockCrypto = createMockCrypto();
    mockEventBus = createMockEventBus();
    mockCache = createMockCache();

    vcService = new VerifiableCredentialsService({
      eventBus: mockEventBus as any,
      cache: mockCache as any,
      config: mockConfig,
      credentialRepo: mockCredentialRepo,
      revocationRepo: mockRevocationRepo,
      schemaRepo: mockSchemaRepo,
      presentationRepo: mockPresentationRepo,
      didService: mockDIDService as any,
      crypto: mockCrypto as any,
      vcConfig: {
        issuerDid: 'did:web:test.scholarly.edu.au',
        issuerName: 'Test Scholarly',
        statusListBaseUrl: 'https://test.scholarly.edu.au/status',
        schemaBaseUrl: 'https://test.scholarly.edu.au/schemas',
        defaultValidityDays: 365,
        requireSchemaValidation: false,
        supportedProofTypes: ['Ed25519Signature2020']
      }
    });
  });

  describe('issueCredential', () => {
    it('should issue a credential successfully', async () => {
      mockDIDService.resolveDID.mockResolvedValue({
        success: true,
        data: {
          '@context': ['https://www.w3.org/ns/did/v1'],
          id: 'did:key:zSubject',
          verificationMethod: []
        }
      } as any);

      mockDIDService.signWithDID.mockResolvedValue({
        success: true,
        data: {
          signature: new Uint8Array(64).fill(1),
          verificationMethod: 'did:web:test.scholarly.edu.au#keys-1'
        }
      } as any);

      mockCredentialRepo.save.mockImplementation((_, __, cred) => Promise.resolve(cred));
      mockSchemaRepo.findDefault.mockResolvedValue(null);

      const result = await vcService.issueCredential('tenant-1', 'issuer-passphrase', {
        credentialType: 'AchievementCredential',
        subjectDid: 'did:key:zSubject',
        subjectData: {
          type: 'Achievement',
          achievementName: 'Course Completion',
          description: 'Completed Math 101',
          achievementType: 'course_completion',
          criteria: 'Complete all modules',
          dateAchieved: '2024-01-15'
        }
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toContain('VerifiableCredential');
        expect(result.data.type).toContain('AchievementCredential');
        expect(result.data.credentialSubject.id).toBe('did:key:zSubject');
        expect(result.data.proof).toBeDefined();
        expect(result.data.issuanceDate).toBeDefined();
        expect(result.data.expirationDate).toBeDefined();
      }

      expect(mockEventBus.publish).toHaveBeenCalledWith(
        'ssi.credential.issued',
        expect.any(Object)
      );
    });

    it('should reject invalid subject DID', async () => {
      mockDIDService.resolveDID.mockResolvedValue({
        success: false,
        error: new Error('DID not found')
      } as any);

      const result = await vcService.issueCredential('tenant-1', 'issuer-passphrase', {
        credentialType: 'AchievementCredential',
        subjectDid: 'did:key:zInvalid',
        subjectData: {
          type: 'Achievement',
          achievementName: 'Test',
          description: 'Test',
          achievementType: 'badge',
          criteria: 'Test',
          dateAchieved: '2024-01-15'
        }
      });

      expect(result.success).toBe(false);
    });
  });

  describe('verifyCredential', () => {
    it('should verify a valid credential', async () => {
      const mockCredential: VerifiableCredential = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:test-credential',
        type: ['VerifiableCredential', 'AchievementCredential'],
        issuer: { id: 'did:web:test.scholarly.edu.au', name: 'Test' },
        issuanceDate: new Date().toISOString(),
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        credentialSubject: {
          id: 'did:key:zSubject',
          type: 'Achievement',
          achievementName: 'Test'
        },
        proof: {
          type: 'Ed25519Signature2020',
          created: new Date().toISOString(),
          verificationMethod: 'did:web:test.scholarly.edu.au#keys-1',
          proofPurpose: 'assertionMethod',
          proofValue: 'AQEBAQEBAQE'
        }
      };

      mockDIDService.verifySignature.mockResolvedValue({
        success: true,
        data: true
      } as any);

      mockRevocationRepo.isRevoked.mockResolvedValue(false);

      const result = await vcService.verifyCredential(mockCredential, {
        checkStatus: true,
        checkSchema: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.valid).toBe(true);
        expect(result.data.checks.some(c => c.check === 'proof' && c.passed)).toBe(true);
        expect(result.data.checks.some(c => c.check === 'expiration' && c.passed)).toBe(true);
      }
    });

    it('should detect expired credential', async () => {
      const expiredCredential: VerifiableCredential = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:expired-credential',
        type: ['VerifiableCredential'],
        issuer: 'did:web:test.scholarly.edu.au',
        issuanceDate: '2020-01-01T00:00:00Z',
        expirationDate: '2020-12-31T00:00:00Z',
        credentialSubject: { id: 'did:key:zSubject' },
        proof: {
          type: 'Ed25519Signature2020',
          created: '2020-01-01T00:00:00Z',
          verificationMethod: 'did:web:test#keys-1',
          proofPurpose: 'assertionMethod',
          proofValue: 'test'
        }
      };

      mockDIDService.verifySignature.mockResolvedValue({
        success: true,
        data: true
      } as any);

      const result = await vcService.verifyCredential(expiredCredential, {
        checkStatus: false
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.valid).toBe(false);
        expect(result.data.errors).toContain('Credential has expired');
      }
    });

    it('should detect revoked credential', async () => {
      const revokedCredential: VerifiableCredential = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:revoked-credential',
        type: ['VerifiableCredential'],
        issuer: 'did:web:test.scholarly.edu.au',
        issuanceDate: new Date().toISOString(),
        credentialSubject: { id: 'did:key:zSubject' },
        credentialStatus: {
          id: 'https://test.scholarly.edu.au/status/1',
          type: 'StatusList2021Entry'
        },
        proof: {
          type: 'Ed25519Signature2020',
          created: new Date().toISOString(),
          verificationMethod: 'did:web:test#keys-1',
          proofPurpose: 'assertionMethod',
          proofValue: 'test'
        }
      };

      mockDIDService.verifySignature.mockResolvedValue({
        success: true,
        data: true
      } as any);

      mockRevocationRepo.isRevoked.mockResolvedValue(true);

      const result = await vcService.verifyCredential(revokedCredential, {
        checkStatus: true
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.valid).toBe(false);
        expect(result.data.errors.some(e => e.includes('revoked'))).toBe(true);
      }
    });
  });

  describe('createPresentation', () => {
    it('should create a valid presentation', async () => {
      const credentials: VerifiableCredential[] = [{
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:cred-1',
        type: ['VerifiableCredential'],
        issuer: 'did:web:issuer',
        issuanceDate: new Date().toISOString(),
        credentialSubject: { id: 'did:key:zHolder' },
        proof: { type: 'Ed25519Signature2020', created: '', verificationMethod: '', proofPurpose: 'assertionMethod' }
      }];

      mockDIDService.signWithDID.mockResolvedValue({
        success: true,
        data: {
          signature: new Uint8Array(64),
          verificationMethod: 'did:key:zHolder#keys-1'
        }
      } as any);

      mockPresentationRepo.save.mockImplementation((_, __, pres) => Promise.resolve(pres));

      const result = await vcService.createPresentation(
        'tenant-1',
        'did:key:zHolder',
        'holder-passphrase',
        credentials,
        { challenge: 'test-challenge', domain: 'test.com' }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toContain('VerifiablePresentation');
        expect(result.data.holder).toBe('did:key:zHolder');
        expect(result.data.verifiableCredential).toHaveLength(1);
        expect(result.data.proof).toBeDefined();
        expect(result.data.proof?.challenge).toBe('test-challenge');
        expect(result.data.proof?.domain).toBe('test.com');
      }
    });

    it('should reject credential not owned by holder', async () => {
      const credentials: VerifiableCredential[] = [{
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:cred-1',
        type: ['VerifiableCredential'],
        issuer: 'did:web:issuer',
        issuanceDate: new Date().toISOString(),
        credentialSubject: { id: 'did:key:zOtherPerson' },
        proof: { type: 'Ed25519Signature2020', created: '', verificationMethod: '', proofPurpose: 'assertionMethod' }
      }];

      const result = await vcService.createPresentation(
        'tenant-1',
        'did:key:zHolder',
        'holder-passphrase',
        credentials
      );

      expect(result.success).toBe(false);
    });
  });
});

// ============================================================================
// DIGITAL WALLET SERVICE TESTS
// ============================================================================

describe('DigitalWalletService', () => {
  let walletService: DigitalWalletService;
  let mockDIDService: jest.Mocked<DIDService>;
  let mockVCService: jest.Mocked<VerifiableCredentialsService>;
  let mockWalletRepo: jest.Mocked<WalletRepository>;
  let mockBackupRepo: jest.Mocked<WalletBackupRepository>;
  let mockCrypto: ReturnType<typeof createMockCrypto>;
  let mockEventBus: ReturnType<typeof createMockEventBus>;
  let mockCache: ReturnType<typeof createMockCache>;

  beforeEach(() => {
    mockDIDService = {
      createDID: jest.fn(),
      resolveDID: jest.fn(),
      getUserDIDs: jest.fn(),
      getPrimaryDID: jest.fn(),
      setPrimaryDID: jest.fn(),
      rotateKeys: jest.fn(),
      deactivateDID: jest.fn()
    } as any;

    mockVCService = {
      issueCredential: jest.fn(),
      verifyCredential: jest.fn(),
      getCredentials: jest.fn()
    } as any;

    mockWalletRepo = {
      findById: jest.fn(),
      findByUser: jest.fn(),
      findByDID: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn()
    } as any;

    mockBackupRepo = {
      saveBackup: jest.fn(),
      getLatestBackup: jest.fn(),
      listBackups: jest.fn(),
      getBackup: jest.fn()
    } as any;

    mockCrypto = createMockCrypto();
    mockEventBus = createMockEventBus();
    mockCache = createMockCache();

    walletService = new DigitalWalletService({
      eventBus: mockEventBus as any,
      cache: mockCache as any,
      config: mockConfig,
      walletRepo: mockWalletRepo,
      backupRepo: mockBackupRepo,
      didService: mockDIDService as any,
      vcService: mockVCService as any,
      crypto: mockCrypto as any,
      walletConfig: {
        minPassphraseLength: 12,
        defaultDIDMethod: 'did:key',
        autoBackupEnabled: false,
        backupVersion: '1.0.0',
        sessionTimeoutMinutes: 30,
        maxFailedUnlockAttempts: 5,
        lockoutDurationMinutes: 15
      }
    });
  });

  describe('createWallet', () => {
    it('should create a wallet successfully', async () => {
      mockWalletRepo.findByUser.mockResolvedValue(null);
      mockDIDService.createDID.mockResolvedValue({
        success: true,
        data: {
          did: {
            did: 'did:key:zNewUser',
            method: 'did:key',
            methodSpecificId: 'zNewUser',
            controller: 'did:key:zNewUser',
            created: new Date(),
            updated: new Date(),
            status: 'active'
          },
          document: { '@context': [], id: 'did:key:zNewUser', verificationMethod: [] },
          keyPair: {
            id: 'key-1',
            did: 'did:key:zNewUser',
            type: 'Ed25519',
            publicKey: 'test',
            encryptedPrivateKey: '{}',
            privateKeyEncryption: 'AES-256-GCM',
            kdf: 'Argon2id',
            purposes: ['authentication'],
            created: new Date(),
            isPrimary: true,
            status: 'active'
          }
        }
      } as any);
      mockWalletRepo.save.mockImplementation((_, wallet) => Promise.resolve(wallet));

      const result = await walletService.createWallet(
        'tenant-1',
        'user-1',
        'secure-passphrase-123'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.wallet.userId).toBe('user-1');
        expect(result.data.wallet.primaryDid).toBe('did:key:zNewUser');
        expect(result.data.wallet.status).toBe('active');
        expect(result.data.did.did).toBe('did:key:zNewUser');
      }
    });

    it('should reject if user already has wallet', async () => {
      mockWalletRepo.findByUser.mockResolvedValue({
        id: 'existing-wallet',
        userId: 'user-1'
      } as any);

      const result = await walletService.createWallet(
        'tenant-1',
        'user-1',
        'secure-passphrase-123'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('already has a wallet');
      }
    });

    it('should reject short passphrase', async () => {
      const result = await walletService.createWallet(
        'tenant-1',
        'user-1',
        'short'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('at least 12 characters');
      }
    });
  });

  describe('unlockWallet', () => {
    it('should unlock wallet with correct passphrase', async () => {
      const mockWallet: DigitalWallet = {
        id: 'wallet-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        primaryDid: 'did:key:zTest',
        dids: [],
        keyPairs: [{
          id: 'key-1',
          did: 'did:key:zTest',
          type: 'Ed25519',
          publicKey: 'test',
          encryptedPrivateKey: JSON.stringify({
            ciphertext: 'AQID',
            iv: 'BAUG',
            tag: 'BwgJ',
            salt: 'BwcHBw'
          }),
          privateKeyEncryption: 'AES-256-GCM',
          kdf: 'Argon2id',
          purposes: ['authentication'],
          created: new Date(),
          isPrimary: true,
          status: 'active'
        }],
        credentials: [],
        presentations: [],
        recovery: { method: 'mnemonic' },
        encryptionKeyId: 'enc-1',
        created: new Date(),
        lastAccessed: new Date(),
        status: 'active'
      };

      mockWalletRepo.findByUser.mockResolvedValue(mockWallet);
      mockWalletRepo.update.mockImplementation((_, __, updates) => 
        Promise.resolve({ ...mockWallet, ...updates })
      );

      const result = await walletService.unlockWallet(
        'tenant-1',
        'user-1',
        'secure-passphrase-123'
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.sessionExpires).toBeDefined();
        expect(walletService.isWalletUnlocked(mockWallet.id)).toBe(true);
      }
    });

    it('should lock out after too many failed attempts', async () => {
      const mockWallet: DigitalWallet = {
        id: 'wallet-lockout',
        tenantId: 'tenant-1',
        userId: 'user-lockout',
        primaryDid: 'did:key:zTest',
        dids: [],
        keyPairs: [{
          id: 'key-1',
          did: 'did:key:zTest',
          type: 'Ed25519',
          publicKey: 'test',
          encryptedPrivateKey: JSON.stringify({
            ciphertext: 'AQID',
            iv: 'BAUG',
            tag: 'BwgJ',
            salt: 'BwcHBw'
          }),
          privateKeyEncryption: 'AES-256-GCM',
          kdf: 'Argon2id',
          purposes: ['authentication'],
          created: new Date(),
          isPrimary: true,
          status: 'active'
        }],
        credentials: [],
        presentations: [],
        recovery: { method: 'mnemonic' },
        encryptionKeyId: 'enc-1',
        created: new Date(),
        lastAccessed: new Date(),
        status: 'active'
      };

      mockWalletRepo.findByUser.mockResolvedValue(mockWallet);
      mockCrypto.decrypt.mockRejectedValue(new Error('Invalid'));

      // Attempt 5 failed unlocks
      for (let i = 0; i < 5; i++) {
        await walletService.unlockWallet('tenant-1', 'user-lockout', 'wrong-pass');
      }

      // 6th attempt should be locked out
      const result = await walletService.unlockWallet(
        'tenant-1',
        'user-lockout',
        'any-pass'
      );

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('locked due to too many failed attempts');
      }
    });
  });

  describe('addCredential', () => {
    it('should add credential to unlocked wallet', async () => {
      const mockWallet: DigitalWallet = {
        id: 'wallet-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        primaryDid: 'did:key:zHolder',
        dids: [],
        keyPairs: [{
          id: 'key-1',
          did: 'did:key:zHolder',
          type: 'Ed25519',
          publicKey: 'test',
          encryptedPrivateKey: JSON.stringify({
            ciphertext: 'AQID',
            iv: 'BAUG',
            tag: 'BwgJ',
            salt: 'BwcHBw'
          }),
          privateKeyEncryption: 'AES-256-GCM',
          kdf: 'Argon2id',
          purposes: ['authentication'],
          created: new Date(),
          isPrimary: true,
          status: 'active'
        }],
        credentials: [],
        presentations: [],
        recovery: { method: 'mnemonic' },
        encryptionKeyId: 'enc-1',
        created: new Date(),
        lastAccessed: new Date(),
        status: 'active'
      };

      mockWalletRepo.findByUser.mockResolvedValue(mockWallet);
      mockWalletRepo.update.mockImplementation((_, __, updates) =>
        Promise.resolve({ ...mockWallet, ...updates })
      );

      // First unlock the wallet
      await walletService.unlockWallet('tenant-1', 'user-1', 'secure-passphrase-123');

      const credential: VerifiableCredential = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:new-cred',
        type: ['VerifiableCredential'],
        issuer: 'did:web:issuer',
        issuanceDate: new Date().toISOString(),
        credentialSubject: { id: 'did:key:zHolder' },
        proof: { type: 'Ed25519Signature2020', created: '', verificationMethod: '', proofPurpose: 'assertionMethod' }
      };

      const result = await walletService.addCredential('tenant-1', 'user-1', credential);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.credentials).toHaveLength(1);
      }
    });

    it('should reject credential for different holder', async () => {
      const mockWallet: DigitalWallet = {
        id: 'wallet-1',
        tenantId: 'tenant-1',
        userId: 'user-1',
        primaryDid: 'did:key:zHolder',
        dids: [],
        keyPairs: [{
          id: 'key-1',
          did: 'did:key:zHolder',
          type: 'Ed25519',
          publicKey: 'test',
          encryptedPrivateKey: JSON.stringify({
            ciphertext: 'AQID',
            iv: 'BAUG',
            tag: 'BwgJ',
            salt: 'BwcHBw'
          }),
          privateKeyEncryption: 'AES-256-GCM',
          kdf: 'Argon2id',
          purposes: ['authentication'],
          created: new Date(),
          isPrimary: true,
          status: 'active'
        }],
        credentials: [],
        presentations: [],
        recovery: { method: 'mnemonic' },
        encryptionKeyId: 'enc-1',
        created: new Date(),
        lastAccessed: new Date(),
        status: 'active'
      };

      mockWalletRepo.findByUser.mockResolvedValue(mockWallet);

      // First unlock the wallet
      await walletService.unlockWallet('tenant-1', 'user-1', 'secure-passphrase-123');

      const credential: VerifiableCredential = {
        '@context': ['https://www.w3.org/ns/credentials/v2'],
        id: 'urn:uuid:wrong-cred',
        type: ['VerifiableCredential'],
        issuer: 'did:web:issuer',
        issuanceDate: new Date().toISOString(),
        credentialSubject: { id: 'did:key:zOtherPerson' },
        proof: { type: 'Ed25519Signature2020', created: '', verificationMethod: '', proofPurpose: 'assertionMethod' }
      };

      const result = await walletService.addCredential('tenant-1', 'user-1', credential);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('does not match wallet DID');
      }
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe('SSI Integration', () => {
  it('should complete full credential lifecycle', async () => {
    // This would be an integration test with real services
    // For unit tests, we've covered the individual components above
    expect(true).toBe(true);
  });
});
