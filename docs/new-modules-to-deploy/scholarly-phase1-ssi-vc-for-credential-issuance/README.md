# Scholarly Phase 1: Trust & Identity Foundation

## Self-Sovereign Identity and Verifiable Credentials Module

This module implements the foundational trust and identity layer for the Scholarly education platform, enabling user-controlled digital identity and portable, cryptographically verified credentials.

---

## Table of Contents

1. [Overview](#overview)
2. [The Granny Explanation](#the-granny-explanation)
3. [Architecture](#architecture)
4. [Standards Compliance](#standards-compliance)
5. [Getting Started](#getting-started)
6. [Services](#services)
7. [API Reference](#api-reference)
8. [Database Schema](#database-schema)
9. [Configuration](#configuration)
10. [Testing](#testing)
11. [Security Considerations](#security-considerations)
12. [Migration Guide](#migration-guide)

---

## Overview

Phase 1 delivers the **Trust & Identity Foundation** for Scholarly, comprising:

| Component | Purpose |
|-----------|---------|
| **DID Service** | Create, manage, and resolve Decentralized Identifiers |
| **VC Service** | Issue, verify, and manage Verifiable Credentials |
| **Wallet Service** | Secure, user-controlled credential storage |
| **SSI Routes** | RESTful API with OpenAPI 3.1 documentation |

### Key Capabilities

- **Decentralized Identifiers (DIDs)**: Users own their identity, not platforms
- **Verifiable Credentials**: Cryptographically signed, instantly verifiable credentials
- **Digital Wallets**: User-controlled credential storage with backup/recovery
- **Selective Disclosure**: Share only what's needed via Presentation Exchange
- **Revocation**: Real-time credential status checking via Status List 2021

---

## The Granny Explanation

Imagine your physical wallet: it holds your driver's license, library card, university degree, and professional certificates. **You** decide what to show to whom—the bouncer sees your age, the library sees your membership, your employer sees your degree.

**Self-Sovereign Identity (SSI)** is a digital version of that wallet:

- **You own your credentials**, not the companies that issued them
- **You decide what to share** and with whom
- **Credentials can't be faked**—they're cryptographically signed
- **They survive even if the issuer disappears**

### In Scholarly

| User | Credentials |
|------|-------------|
| **Teachers** | WWCC/DBS checks, qualifications, teaching registrations |
| **Students** | Course completions, skill badges, achievements |
| **Schools** | Accreditation, compliance records |

When a parent books a tutor, they can instantly verify:
- ✅ Working With Children Check is valid
- ✅ Teaching qualification is real
- ✅ Professional registration is current

No phone calls. No waiting. No faking.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           API Layer                                  │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                       SSI Routes                               │  │
│  │  POST /wallet          GET /dids          POST /credentials    │  │
│  │  POST /wallet/unlock   GET /dids/:did     POST /verify         │  │
│  │  POST /wallet/backup   POST /presentations                     │  │
│  └───────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────┤
│                        Service Layer                                 │
│  ┌─────────────────┐ ┌──────────────────┐ ┌───────────────────┐    │
│  │   DID Service   │ │    VC Service    │ │  Wallet Service   │    │
│  │                 │ │                  │ │                   │    │
│  │ • Create DID    │ │ • Issue VC       │ │ • Create Wallet   │    │
│  │ • Resolve DID   │ │ • Verify VC      │ │ • Unlock/Lock     │    │
│  │ • Rotate Keys   │ │ • Revoke VC      │ │ • Add Credential  │    │
│  │ • Deactivate    │ │ • Presentations  │ │ • Backup/Restore  │    │
│  └─────────────────┘ └──────────────────┘ └───────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│                       Repository Layer                               │
│  ┌────────┐ ┌────────────┐ ┌─────────┐ ┌────────────┐ ┌─────────┐ │
│  │  DID   │ │ DIDDocument│ │ KeyPair │ │ Credential │ │  Wallet │ │
│  │  Repo  │ │    Repo    │ │  Repo   │ │    Repo    │ │   Repo  │ │
│  └────────┘ └────────────┘ └─────────┘ └────────────┘ └─────────┘ │
├─────────────────────────────────────────────────────────────────────┤
│                       Crypto Provider                                │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  Ed25519 │ secp256k1 │ AES-256-GCM │ Argon2id │ SHA-256      │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Data Flow: Issuing a Credential

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│  Issuer  │────▶│ VC Svc   │────▶│ DID Svc  │────▶│  Wallet  │
│ (School) │     │          │     │ (Sign)   │     │ (Store)  │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │ 1. Request     │ 2. Build VC    │ 3. Sign with   │ 4. Store in
     │    issuance    │    structure   │    issuer key  │    holder's
     │                │                │                │    wallet
```

### Data Flow: Verifying a Credential

```
┌──────────┐     ┌──────────┐     ┌──────────┐     ┌──────────┐
│ Verifier │────▶│ VC Svc   │────▶│ DID Svc  │────▶│ Revoc.   │
│ (Parent) │     │          │     │ (Resolve)│     │ Check    │
└──────────┘     └──────────┘     └──────────┘     └──────────┘
     │                │                │                │
     │ 1. Submit VC   │ 2. Extract     │ 3. Resolve     │ 4. Check
     │    for verify  │    issuer DID  │    & verify    │    status
     │                │                │    signature   │    list
```

---

## Standards Compliance

| Standard | Version | Purpose |
|----------|---------|---------|
| [W3C DID Core](https://www.w3.org/TR/did-core/) | 1.0 | Decentralized Identifiers |
| [W3C VC Data Model](https://www.w3.org/TR/vc-data-model-2.0/) | 2.0 | Verifiable Credentials |
| [did:web](https://w3c-ccg.github.io/did-method-web/) | Latest | Web-based DIDs |
| [did:key](https://w3c-ccg.github.io/did-method-key/) | Latest | Self-contained DIDs |
| [Status List 2021](https://w3c.github.io/vc-status-list-2021/) | Latest | Revocation |
| [Presentation Exchange](https://identity.foundation/presentation-exchange/) | 2.0 | Selective Disclosure |

---

## Getting Started

### Installation

```bash
# From npm (when published)
npm install @scholarly/ssi-vc

# From source
cd packages/ssi-vc
npm install
npm run build
```

### Quick Start

```typescript
import { initializeSSIModule, createSSIRoutes } from '@scholarly/ssi-vc';
import express from 'express';

// Initialize services
const ssiModule = initializeSSIModule({
  eventBus,
  cache,
  config,
  crypto: cryptoProvider,
  repositories: {
    didRepo: new PrismaDIDRepository(prisma),
    documentRepo: new PrismaDIDDocumentRepository(prisma),
    keyRepo: new PrismaKeyPairRepository(prisma),
    credentialRepo: new PrismaCredentialRepository(prisma),
    revocationRepo: new PrismaRevocationRepository(prisma),
    schemaRepo: new PrismaSchemaRepository(prisma),
    presentationRepo: new PrismaPresentationRepository(prisma),
    walletRepo: new PrismaWalletRepository(prisma),
    backupRepo: new PrismaBackupRepository(prisma)
  }
});

// Mount API routes
const app = express();
app.use('/api/v1/ssi', createSSIRoutes(ssiModule));
```

### Create a Wallet and DID

```typescript
// Create wallet for new user
const walletResult = await ssiModule.walletService.createWallet(
  tenantId,
  userId,
  'secure-passphrase-at-least-12-chars'
);

if (walletResult.success) {
  console.log('Wallet created:', walletResult.data.wallet.id);
  console.log('Primary DID:', walletResult.data.did.did);
}
```

### Issue a Credential

```typescript
const credResult = await ssiModule.vcService.issueCredential(
  tenantId,
  issuerPassphrase,
  {
    credentialType: 'SafeguardingCredential',
    subjectDid: 'did:key:z6MkhaXgBZDvotDkL...',
    subjectData: {
      type: 'SafeguardingCheck',
      checkType: 'WWCC',
      jurisdiction: 'AU_NSW',
      checkNumber: 'WWC12345678',
      holderName: 'Jane Smith',
      issuedDate: '2024-01-15',
      expiryDate: '2029-01-15',
      checkStatus: 'cleared',
      clearedCategories: ['children']
    }
  }
);
```

### Verify a Credential

```typescript
const verifyResult = await ssiModule.vcService.verifyCredential(credential, {
  checkStatus: true,
  checkSchema: true,
  trustedIssuers: ['did:web:scholarly.edu.au']
});

if (verifyResult.success && verifyResult.data.valid) {
  console.log('Credential is valid!');
} else {
  console.log('Verification failed:', verifyResult.data.errors);
}
```

---

## Services

### DID Service

```typescript
interface DIDService {
  // Creation
  createDID(tenantId, userId, method, passphrase, options?): Promise<Result<{did, document, keyPair}>>
  
  // Resolution
  resolveDID(did): Promise<Result<DIDDocument>>
  
  // Management
  getUserDIDs(tenantId, userId): Promise<Result<DecentralizedIdentifier[]>>
  getPrimaryDID(tenantId, userId): Promise<Result<DecentralizedIdentifier | null>>
  setPrimaryDID(tenantId, userId, did): Promise<Result<void>>
  deactivateDID(tenantId, userId, did, reason): Promise<Result<void>>
  
  // Key Operations
  rotateKeys(tenantId, userId, did, currentPassphrase, newPassphrase?, reason?): Promise<Result<KeyPair>>
  signWithDID(tenantId, did, data, passphrase): Promise<Result<{signature, verificationMethod}>>
  verifySignature(did, data, signature, verificationMethodId?): Promise<Result<boolean>>
}
```

### VC Service

```typescript
interface VerifiableCredentialsService {
  // Issuance
  issueCredential(tenantId, issuerPassphrase, request): Promise<Result<VerifiableCredential>>
  issueSafeguardingCredential(tenantId, issuerPassphrase, request): Promise<Result<VerifiableCredential>>
  issueAchievementCredential(tenantId, issuerPassphrase, request): Promise<Result<VerifiableCredential>>
  
  // Verification
  verifyCredential(credential, options?): Promise<Result<VerificationResult>>
  
  // Management
  getCredentials(tenantId, holderDid, filter?): Promise<Result<VerifiableCredential[]>>
  revokeCredential(tenantId, credentialId, reason, revokedBy): Promise<Result<void>>
  
  // Presentations
  createPresentation(tenantId, holderDid, holderPassphrase, credentials, options?): Promise<Result<VerifiablePresentation>>
  verifyPresentation(presentation, options?): Promise<Result<VerificationResult>>
  processRequestForCredentials(tenantId, holderDid, request): Promise<Result<{matchingCredentials, canSatisfy, missingDescriptors}>>
}
```

### Wallet Service

```typescript
interface DigitalWalletService {
  // Lifecycle
  createWallet(tenantId, userId, passphrase, options?): Promise<Result<{wallet, did}>>
  unlockWallet(tenantId, userId, passphrase): Promise<Result<{wallet, sessionExpires}>>
  lockWallet(tenantId, userId): Promise<Result<void>>
  
  // Credentials
  addCredential(tenantId, userId, credential): Promise<Result<DigitalWallet>>
  removeCredential(tenantId, userId, credentialId): Promise<Result<DigitalWallet>>
  getCredentials(tenantId, userId, filter?): Promise<Result<VerifiableCredential[]>>
  
  // Backup
  createBackup(tenantId, userId, passphrase): Promise<Result<{backupId, created}>>
  restoreFromBackup(tenantId, userId, backupId, passphrase): Promise<Result<DigitalWallet>>
  listBackups(tenantId, userId): Promise<Result<{id, created}[]>>
  
  // Management
  getWalletInfo(tenantId, userId): Promise<Result<WalletInfo>>
  changePassphrase(tenantId, userId, currentPassphrase, newPassphrase): Promise<Result<void>>
  deactivateWallet(tenantId, userId, passphrase, reason): Promise<Result<void>>
}
```

---

## API Reference

See [OpenAPI Specification](./ssi-routes.ts) for complete API documentation.

### Key Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/wallet` | Create a new wallet |
| GET | `/wallet` | Get wallet info |
| POST | `/wallet/unlock` | Unlock wallet |
| POST | `/wallet/lock` | Lock wallet |
| POST | `/wallet/backup` | Create backup |
| GET | `/dids` | List user's DIDs |
| GET | `/dids/:did/resolve` | Resolve a DID |
| GET | `/credentials` | Get credentials |
| POST | `/credentials/issue` | Issue a credential |
| POST | `/credentials/verify` | Verify a credential |
| POST | `/presentations` | Create presentation |
| POST | `/presentations/verify` | Verify presentation |

---

## Database Schema

Add the models from `prisma-schema-additions.prisma` to your existing Prisma schema:

```prisma
// Key models:
model DecentralizedIdentifier { ... }
model DIDDocument { ... }
model KeyPair { ... }
model DigitalWallet { ... }
model WalletBackup { ... }
model VerifiableCredentialRecord { ... }
model CredentialSchema { ... }
model CredentialStatusList { ... }
model VerifiablePresentationRecord { ... }
model SSIEventLog { ... }
```

Run migrations:

```bash
npx prisma migrate dev --name add_ssi_tables
```

---

## Configuration

### DID Service Config

```typescript
const didConfig: DIDServiceConfig = {
  webDomain: 'scholarly.edu.au',        // Domain for did:web
  ethereumNetwork: 'polygon',            // Network for did:ethr
  defaultKeyType: 'Ed25519',             // Ed25519 or secp256k1
  keyRotationDays: 365,                  // Auto-rotation policy
  blockchainAnchoring: false,            // Anchor DIDs on-chain
  keyVaultUrl: 'https://...'             // Azure Key Vault (optional)
};
```

### VC Service Config

```typescript
const vcConfig: VCServiceConfig = {
  issuerDid: 'did:web:scholarly.edu.au',
  issuerName: 'Scholarly Education Platform',
  statusListBaseUrl: 'https://scholarly.edu.au/credentials/status',
  schemaBaseUrl: 'https://scholarly.edu.au/credentials/schemas',
  defaultValidityDays: 365,
  requireSchemaValidation: true,
  supportedProofTypes: ['Ed25519Signature2020', 'JsonWebSignature2020']
};
```

### Wallet Service Config

```typescript
const walletConfig: WalletServiceConfig = {
  minPassphraseLength: 12,
  defaultDIDMethod: 'did:key',
  autoBackupEnabled: true,
  backupVersion: '1.0.0',
  sessionTimeoutMinutes: 30,
  maxFailedUnlockAttempts: 5,
  lockoutDurationMinutes: 15
};
```

---

## Testing

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- --testPathPattern=did-service

# Run in watch mode
npm test -- --watch
```

### Test Coverage Targets

| Component | Target |
|-----------|--------|
| DID Service | ≥90% |
| VC Service | ≥90% |
| Wallet Service | ≥90% |
| API Routes | ≥85% |

---

## Security Considerations

### Key Management

- Private keys are **never stored in plain text**
- Keys encrypted with AES-256-GCM using Argon2id-derived keys
- Key rotation supported with full audit trail
- Azure Key Vault integration available for enterprise deployments

### Authentication

- All API endpoints require JWT authentication
- Wallet operations require wallet to be unlocked (session-based)
- Rate limiting prevents brute-force attacks
- CSRF protection on state-changing operations

### Passphrase Requirements

- Minimum 12 characters
- Validated server-side
- Used to derive encryption keys (never stored)

### Lockout Policy

- 5 failed unlock attempts triggers 15-minute lockout
- Lockout state tracked per-wallet
- Recovery requires backup or social recovery

---

## Migration Guide

### Migrating Existing Safeguarding Checks

```typescript
// 1. Create wallet for user if not exists
const walletResult = await walletService.createWallet(tenantId, userId, passphrase);

// 2. Convert existing check to credential
const credential = await vcService.issueSafeguardingCredential(tenantId, issuerPassphrase, {
  credentialType: 'SafeguardingCredential',
  subjectDid: walletResult.data.wallet.primaryDid,
  safeguardingCheck: existingSafeguardingCheck,
  subjectData: {
    holderName: user.fullName
  }
});

// 3. Add to wallet
await walletService.addCredential(tenantId, userId, credential.data);
```

### Migrating Qualifications

```typescript
const credential = await vcService.issueCredential(tenantId, issuerPassphrase, {
  credentialType: 'QualificationCredential',
  subjectDid: holderDid,
  subjectData: {
    type: 'Qualification',
    qualificationName: existingQual.name,
    fieldOfStudy: existingQual.field,
    level: existingQual.level,
    awardingInstitution: existingQual.institution,
    dateAwarded: existingQual.awardedDate
  }
});
```

---

## Roadmap

Phase 1 establishes the foundation. Upcoming phases will add:

- **Phase 2**: 1EdTech LTI Advantage, OneRoster, CASE integration
- **Phase 3**: Industry Experience Module, Video Coaching
- **Phase 4**: DAO Governance, Virtual Language Immersion

---

## License

Proprietary - Scholarly Education Platform

---

## Support

For questions or issues:
- Technical: engineering@scholarly.edu.au
- Security: security@scholarly.edu.au
