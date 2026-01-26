/**
 * Scholarly Phase 1: Trust & Identity Foundation
 * 
 * Self-Sovereign Identity and Verifiable Credentials Module
 * 
 * ## Overview
 * 
 * This module implements the foundational trust and identity layer for the
 * Scholarly platform, enabling:
 * 
 * - Decentralized Identifiers (DIDs) for user-controlled identity
 * - Verifiable Credentials (VCs) for portable, cryptographically signed credentials
 * - Digital Wallets for secure credential storage
 * - Presentation Exchange for selective disclosure
 * 
 * ## Architecture
 * 
 * ```
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                        API Layer                                 │
 * │  ┌─────────────────────────────────────────────────────────┐   │
 * │  │                    SSI Routes                            │   │
 * │  │  /wallet  /dids  /credentials  /presentations           │   │
 * │  └─────────────────────────────────────────────────────────┘   │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                      Service Layer                              │
 * │  ┌───────────────┐ ┌────────────────────┐ ┌────────────────┐  │
 * │  │  DID Service  │ │  VC Service        │ │ Wallet Service │  │
 * │  │               │ │                    │ │                │  │
 * │  │ - Create DID  │ │ - Issue Credential │ │ - Create       │  │
 * │  │ - Resolve DID │ │ - Verify           │ │ - Unlock/Lock  │  │
 * │  │ - Rotate Keys │ │ - Present          │ │ - Backup       │  │
 * │  └───────────────┘ └────────────────────┘ └────────────────┘  │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                      Repository Layer                           │
 * │  ┌─────────┐ ┌─────────────┐ ┌──────────┐ ┌───────────────┐   │
 * │  │   DID   │ │ DIDDocument │ │ KeyPair  │ │  Credential   │   │
 * │  │  Repo   │ │    Repo     │ │   Repo   │ │     Repo      │   │
 * │  └─────────┘ └─────────────┘ └──────────┘ └───────────────┘   │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                      Crypto Provider                            │
 * │  ┌─────────────────────────────────────────────────────────┐   │
 * │  │  Ed25519 | secp256k1 | AES-256-GCM | Argon2id          │   │
 * │  └─────────────────────────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────────────────┘
 * ```
 * 
 * ## Standards Compliance
 * 
 * - W3C DID Core 1.0
 * - W3C Verifiable Credentials Data Model v2.0
 * - W3C DID Resolution
 * - DIF Presentation Exchange v2.0
 * - Status List 2021 for revocation
 * 
 * ## Usage
 * 
 * ```typescript
 * import { 
 *   DIDService, 
 *   VerifiableCredentialsService, 
 *   DigitalWalletService,
 *   createSSIRoutes 
 * } from './phase1';
 * 
 * // Create services
 * const didService = new DIDService({ ...deps });
 * const vcService = new VerifiableCredentialsService({ ...deps, didService });
 * const walletService = new DigitalWalletService({ ...deps, didService, vcService });
 * 
 * // Mount routes
 * app.use('/api/v1/ssi', createSSIRoutes({ didService, vcService, walletService }));
 * ```
 * 
 * @module Phase1-SSI-VC
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

export * from './ssi-vc-types';

// ============================================================================
// SERVICES
// ============================================================================

export { 
  DIDService,
  DIDRepository,
  DIDDocumentRepository,
  KeyPairRepository,
  CryptoProvider,
  DIDServiceConfig,
  DID_SERVICE_VERSION
} from './did-service';

export {
  VerifiableCredentialsService,
  CredentialRepository,
  RevocationRepository,
  SchemaRepository,
  PresentationRepository,
  VCServiceConfig,
  IssueCredentialRequest,
  IssueSafeguardingCredentialRequest,
  IssueQualificationCredentialRequest,
  IssueAchievementCredentialRequest,
  VerificationResult,
  VerificationCheck,
  VC_SERVICE_VERSION
} from './verifiable-credentials-service';

export {
  DigitalWalletService,
  WalletRepository,
  WalletBackupRepository,
  WalletServiceConfig,
  WALLET_SERVICE_VERSION
} from './digital-wallet-service';

// ============================================================================
// API ROUTES
// ============================================================================

export {
  createSSIRoutes,
  createOpenAPIRoute,
  ssiOpenAPISpec,
  SSIRoutesDeps,
  requireAuth,
  rateLimit
} from './ssi-routes';

// ============================================================================
// CONSTANTS
// ============================================================================

export const PHASE1_VERSION = '1.0.0';
export const PHASE1_NAME = 'Trust & Identity Foundation';
export const PHASE1_COMPONENTS = [
  'DIDService',
  'VerifiableCredentialsService',
  'DigitalWalletService',
  'SSIRoutes',
  'OpenAPISpec'
];

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Default DID Service configuration
 */
export const DEFAULT_DID_CONFIG: import('./did-service').DIDServiceConfig = {
  webDomain: 'scholarly.edu.au',
  ethereumNetwork: 'polygon',
  defaultKeyType: 'Ed25519',
  keyRotationDays: 365,
  blockchainAnchoring: false,
  keyVaultUrl: undefined
};

/**
 * Default VC Service configuration
 */
export const DEFAULT_VC_CONFIG: import('./verifiable-credentials-service').VCServiceConfig = {
  issuerDid: 'did:web:scholarly.edu.au',
  issuerName: 'Scholarly Education Platform',
  statusListBaseUrl: 'https://scholarly.edu.au/credentials/status',
  schemaBaseUrl: 'https://scholarly.edu.au/credentials/schemas',
  defaultValidityDays: 365,
  requireSchemaValidation: true,
  supportedProofTypes: ['Ed25519Signature2020', 'JsonWebSignature2020']
};

/**
 * Default Wallet Service configuration
 */
export const DEFAULT_WALLET_CONFIG: import('./digital-wallet-service').WalletServiceConfig = {
  minPassphraseLength: 12,
  defaultDIDMethod: 'did:key',
  autoBackupEnabled: true,
  backupVersion: '1.0.0',
  sessionTimeoutMinutes: 30,
  maxFailedUnlockAttempts: 5,
  lockoutDurationMinutes: 15
};

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

import { EventBus, Cache, ScholarlyConfig } from './types';
import { DIDService, DIDServiceConfig, DIDRepository, DIDDocumentRepository, KeyPairRepository, CryptoProvider } from './did-service';
import { VerifiableCredentialsService, VCServiceConfig, CredentialRepository, RevocationRepository, SchemaRepository, PresentationRepository } from './verifiable-credentials-service';
import { DigitalWalletService, WalletServiceConfig, WalletRepository, WalletBackupRepository } from './digital-wallet-service';

/**
 * All repository dependencies for SSI module
 */
export interface SSIRepositories {
  didRepo: DIDRepository;
  documentRepo: DIDDocumentRepository;
  keyRepo: KeyPairRepository;
  credentialRepo: CredentialRepository;
  revocationRepo: RevocationRepository;
  schemaRepo: SchemaRepository;
  presentationRepo: PresentationRepository;
  walletRepo: WalletRepository;
  backupRepo: WalletBackupRepository;
}

/**
 * SSI Module initialization options
 */
export interface SSIModuleOptions {
  eventBus: EventBus;
  cache: Cache;
  config: ScholarlyConfig;
  crypto: CryptoProvider;
  repositories: SSIRepositories;
  didConfig?: Partial<DIDServiceConfig>;
  vcConfig?: Partial<VCServiceConfig>;
  walletConfig?: Partial<WalletServiceConfig>;
}

/**
 * Initialized SSI Module
 */
export interface SSIModule {
  didService: DIDService;
  vcService: VerifiableCredentialsService;
  walletService: DigitalWalletService;
}

/**
 * Initialize the complete SSI module with all services
 * 
 * @param options - Module initialization options
 * @returns Initialized SSI module with all services
 * 
 * @example
 * ```typescript
 * const ssiModule = initializeSSIModule({
 *   eventBus,
 *   cache,
 *   config,
 *   crypto: cryptoProvider,
 *   repositories: {
 *     didRepo: new PrismaDIDRepository(prisma),
 *     // ... other repositories
 *   }
 * });
 * 
 * // Use services
 * const wallet = await ssiModule.walletService.createWallet(...);
 * ```
 */
export function initializeSSIModule(options: SSIModuleOptions): SSIModule {
  const {
    eventBus,
    cache,
    config,
    crypto,
    repositories,
    didConfig = {},
    vcConfig = {},
    walletConfig = {}
  } = options;

  // Merge configs with defaults
  const finalDIDConfig: DIDServiceConfig = {
    ...DEFAULT_DID_CONFIG,
    ...didConfig
  };

  const finalVCConfig: VCServiceConfig = {
    ...DEFAULT_VC_CONFIG,
    ...vcConfig
  };

  const finalWalletConfig: WalletServiceConfig = {
    ...DEFAULT_WALLET_CONFIG,
    ...walletConfig
  };

  // Create DID Service
  const didService = new DIDService({
    eventBus,
    cache,
    config,
    didRepo: repositories.didRepo,
    documentRepo: repositories.documentRepo,
    keyRepo: repositories.keyRepo,
    crypto,
    didConfig: finalDIDConfig
  });

  // Create VC Service (depends on DID Service)
  const vcService = new VerifiableCredentialsService({
    eventBus,
    cache,
    config,
    credentialRepo: repositories.credentialRepo,
    revocationRepo: repositories.revocationRepo,
    schemaRepo: repositories.schemaRepo,
    presentationRepo: repositories.presentationRepo,
    didService,
    crypto,
    vcConfig: finalVCConfig
  });

  // Create Wallet Service (depends on DID and VC Services)
  const walletService = new DigitalWalletService({
    eventBus,
    cache,
    config,
    walletRepo: repositories.walletRepo,
    backupRepo: repositories.backupRepo,
    didService,
    vcService,
    crypto,
    walletConfig: finalWalletConfig
  });

  return {
    didService,
    vcService,
    walletService
  };
}
