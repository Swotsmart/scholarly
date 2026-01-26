/**
 * Decentralized Identifier (DID) Service
 *
 * Phase 1 Foundation: Self-Sovereign Identity Layer
 *
 * ## The Granny Explanation
 *
 * A DID is like a unique, permanent address for your digital identity - but one that
 * YOU control, not Facebook or Google. It's like owning your own phone number that
 * works forever, across all services, and no company can take it away.
 *
 * In Scholarly:
 * - Every teacher, student, parent, and school gets a DID
 * - The DID is theirs forever, even if they leave Scholarly
 * - Credentials are linked to their DID, so they're portable
 * - Others can verify who they are without calling Scholarly
 *
 * ## Architecture
 *
 * This service implements:
 * - DID creation using multiple methods (did:web, did:key, did:ethr)
 * - DID document management
 * - DID resolution (lookup)
 * - Key pair management linked to DIDs
 *
 * ## Standards
 *
 * - W3C DID Core 1.0: https://www.w3.org/TR/did-core/
 * - did:web Method: https://w3c-ccg.github.io/did-method-web/
 * - did:key Method: https://w3c-ccg.github.io/did-method-key/
 *
 * @module DIDService
 */

import { ScholarlyBaseService, Result, success, failure, type ServiceDependencies } from './base.service';
import { log } from '../lib/logger';

import {
  DecentralizedIdentifier,
  DIDDocument,
  DIDMethod,
  VerificationMethod,
  ServiceEndpoint,
  KeyPair,
  KeyPurpose,
  JsonWebKey,
  DIDResolutionError,
  KeyManagementError,
  SSIError,
  SSIEvent,
  DID_CONTEXTS
} from './ssi-vc-types';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface DIDRepository {
  /** Find a DID by its full string */
  findByDID(tenantId: string, did: string): Promise<DecentralizedIdentifier | null>;

  /** Find all DIDs for a user */
  findByUser(tenantId: string, userId: string): Promise<DecentralizedIdentifier[]>;

  /** Find primary DID for a user */
  findPrimaryByUser(tenantId: string, userId: string): Promise<DecentralizedIdentifier | null>;

  /** Save a new DID */
  save(tenantId: string, userId: string, did: DecentralizedIdentifier): Promise<DecentralizedIdentifier>;

  /** Update a DID */
  update(tenantId: string, did: string, updates: Partial<DecentralizedIdentifier>): Promise<DecentralizedIdentifier>;

  /** Deactivate a DID */
  deactivate(tenantId: string, did: string): Promise<void>;
}

export interface DIDDocumentRepository {
  /** Find DID document by DID */
  findByDID(did: string): Promise<DIDDocument | null>;

  /** Save/update DID document */
  save(did: string, document: DIDDocument): Promise<DIDDocument>;

  /** Delete DID document */
  delete(did: string): Promise<void>;
}

export interface KeyPairRepository {
  /** Find key pair by ID */
  findById(tenantId: string, keyId: string): Promise<KeyPair | null>;

  /** Find all key pairs for a DID */
  findByDID(tenantId: string, did: string): Promise<KeyPair[]>;

  /** Find primary key for a DID */
  findPrimaryByDID(tenantId: string, did: string): Promise<KeyPair | null>;

  /** Save a key pair */
  save(tenantId: string, keyPair: KeyPair): Promise<KeyPair>;

  /** Update a key pair */
  update(tenantId: string, keyId: string, updates: Partial<KeyPair>): Promise<KeyPair>;

  /** Revoke a key pair */
  revoke(tenantId: string, keyId: string): Promise<void>;
}

// ============================================================================
// CRYPTO INTERFACE (Abstraction for crypto operations)
// ============================================================================

export interface CryptoProvider {
  /** Generate an Ed25519 key pair */
  generateEd25519KeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }>;

  /** Generate a secp256k1 key pair */
  generateSecp256k1KeyPair(): Promise<{ publicKey: Uint8Array; privateKey: Uint8Array }>;

  /** Encrypt data with AES-256-GCM */
  encrypt(data: Uint8Array, key: Uint8Array): Promise<{ ciphertext: Uint8Array; iv: Uint8Array; tag: Uint8Array }>;

  /** Decrypt data with AES-256-GCM */
  decrypt(ciphertext: Uint8Array, key: Uint8Array, iv: Uint8Array, tag: Uint8Array): Promise<Uint8Array>;

  /** Derive key from passphrase using Argon2id */
  deriveKey(passphrase: string, salt: Uint8Array): Promise<Uint8Array>;

  /** Sign data */
  sign(data: Uint8Array, privateKey: Uint8Array, algorithm: 'Ed25519' | 'secp256k1'): Promise<Uint8Array>;

  /** Verify signature */
  verify(data: Uint8Array, signature: Uint8Array, publicKey: Uint8Array, algorithm: 'Ed25519' | 'secp256k1'): Promise<boolean>;

  /** Encode bytes to multibase (base58btc) */
  toMultibase(bytes: Uint8Array, prefix?: string): string;

  /** Decode multibase to bytes */
  fromMultibase(encoded: string): Uint8Array;

  /** Encode to base64url */
  toBase64Url(bytes: Uint8Array): string;

  /** Decode from base64url */
  fromBase64Url(encoded: string): Uint8Array;

  /** Generate random bytes */
  randomBytes(length: number): Uint8Array;

  /** Hash data with SHA-256 */
  sha256(data: Uint8Array): Promise<Uint8Array>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface DIDServiceConfig {
  /** Base domain for did:web DIDs */
  webDomain: string;

  /** Ethereum network for did:ethr */
  ethereumNetwork: 'mainnet' | 'polygon' | 'goerli';

  /** Ethereum RPC URL */
  ethereumRpcUrl?: string;

  /** Default key type */
  defaultKeyType: 'Ed25519' | 'secp256k1';

  /** Key rotation policy (days) */
  keyRotationDays: number;

  /** Whether to anchor DIDs on blockchain */
  blockchainAnchoring: boolean;

  /** Azure Key Vault URL for enterprise key management */
  keyVaultUrl?: string;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class DIDService extends ScholarlyBaseService {
  private readonly didRepo: DIDRepository;
  private readonly documentRepo: DIDDocumentRepository;
  private readonly keyRepo: KeyPairRepository;
  private readonly crypto: CryptoProvider;
  private readonly didConfig: DIDServiceConfig;

  constructor(deps?: {
    didRepo: DIDRepository;
    documentRepo: DIDDocumentRepository;
    keyRepo: KeyPairRepository;
    crypto: CryptoProvider;
    didConfig: DIDServiceConfig;
  } & ServiceDependencies) {
    super('DIDService', deps);
    this.didRepo = deps!.didRepo;
    this.documentRepo = deps!.documentRepo;
    this.keyRepo = deps!.keyRepo;
    this.crypto = deps!.crypto;
    this.didConfig = deps!.didConfig;
  }

  // --------------------------------------------------------------------------
  // DID CREATION
  // --------------------------------------------------------------------------

  /**
   * Create a new DID for a user
   *
   * @param tenantId - Tenant identifier
   * @param userId - User identifier
   * @param method - DID method to use
   * @param passphrase - User passphrase for key encryption
   * @param options - Additional options
   */
  async createDID(
    tenantId: string,
    userId: string,
    method: DIDMethod,
    passphrase: string,
    options?: {
      setAsPrimary?: boolean;
      keyPurposes?: KeyPurpose[];
      serviceEndpoints?: ServiceEndpoint[];
    }
  ): Promise<Result<{ did: DecentralizedIdentifier; document: DIDDocument; keyPair: KeyPair }>> {
    return this.withTiming('createDID', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }
      if (!passphrase) {
        return failure({ code: 'VALIDATION_ERROR', message: 'passphrase is required' });
      }
      if (passphrase.length < 12) {
        return failure({ code: 'VALIDATION_ERROR', message: 'Passphrase must be at least 12 characters' });
      }

      try {
        // Generate key pair
        const keyType = this.didConfig.defaultKeyType;
        const rawKeyPair = keyType === 'Ed25519'
          ? await this.crypto.generateEd25519KeyPair()
          : await this.crypto.generateSecp256k1KeyPair();

        // Encrypt private key
        const salt = this.crypto.randomBytes(32);
        const derivedKey = await this.crypto.deriveKey(passphrase, salt);
        const encrypted = await this.crypto.encrypt(rawKeyPair.privateKey, derivedKey);

        // Create DID based on method
        const did = await this.buildDID(method, rawKeyPair.publicKey, tenantId, userId);

        // Create key pair record
        const keyPair: KeyPair = {
          id: this.generateId('key'),
          did: did.did,
          type: keyType,
          publicKey: this.crypto.toBase64Url(rawKeyPair.publicKey),
          encryptedPrivateKey: JSON.stringify({
            ciphertext: this.crypto.toBase64Url(encrypted.ciphertext),
            iv: this.crypto.toBase64Url(encrypted.iv),
            tag: this.crypto.toBase64Url(encrypted.tag),
            salt: this.crypto.toBase64Url(salt)
          }),
          privateKeyEncryption: 'AES-256-GCM',
          kdf: 'Argon2id',
          purposes: options?.keyPurposes || ['authentication', 'assertion'],
          created: new Date(),
          isPrimary: true,
          status: 'active'
        };

        // Create DID document
        const document = this.buildDIDDocument(did, keyPair, options?.serviceEndpoints);

        // Check if this should be primary
        const existingPrimary = await this.didRepo.findPrimaryByUser(tenantId, userId);
        const setAsPrimary = options?.setAsPrimary ?? !existingPrimary;

        // Save everything
        const savedDID = await this.didRepo.save(tenantId, userId, did);
        await this.keyRepo.save(tenantId, keyPair);
        await this.documentRepo.save(did.did, document);

        // Publish event
        await this.publishSSIEvent('ssi.did.created', tenantId, userId, {
          did: did.did,
          method,
          isPrimary: setAsPrimary
        });

        log.info('DID created successfully', {
          tenantId,
          userId,
          did: did.did,
          method
        });

        return success({ did: savedDID, document, keyPair });
      } catch (error) {
        log.error('Failed to create DID', error as Error, { tenantId, userId, method });
        return failure({
          code: 'DID_CREATION_ERROR',
          message: (error as Error).message,
          details: { tenantId, userId, method }
        });
      }
    });
  }

  /**
   * Build a DID string based on method
   */
  private async buildDID(
    method: DIDMethod,
    publicKey: Uint8Array,
    tenantId: string,
    userId: string
  ): Promise<DecentralizedIdentifier> {
    let didString: string;
    let methodSpecificId: string;

    switch (method) {
      case 'did:web':
        // did:web:domain:path
        methodSpecificId = `${this.didConfig.webDomain}:users:${userId}`;
        didString = `did:web:${methodSpecificId}`;
        break;

      case 'did:key':
        // did:key uses the public key encoded in multibase
        // For Ed25519: prefix with 0xed01 (multicodec for ed25519-pub)
        const multicodecPrefix = new Uint8Array([0xed, 0x01]);
        const prefixedKey = new Uint8Array([...multicodecPrefix, ...publicKey]);
        methodSpecificId = this.crypto.toMultibase(prefixedKey, 'z'); // base58btc
        didString = `did:key:${methodSpecificId}`;
        break;

      case 'did:ethr':
        // did:ethr uses Ethereum address derived from secp256k1 key
        const addressHash = await this.crypto.sha256(publicKey);
        const address = '0x' + Buffer.from(addressHash.slice(-20)).toString('hex');
        methodSpecificId = address;
        didString = `did:ethr:${this.didConfig.ethereumNetwork}:${methodSpecificId}`;
        break;

      default:
        throw new SSIError('VALIDATION_ERROR', `Unsupported DID method: ${method}`);
    }

    return {
      did: didString,
      method,
      methodSpecificId,
      controller: didString,
      created: new Date(),
      updated: new Date(),
      status: 'active'
    };
  }

  /**
   * Build a DID document
   */
  private buildDIDDocument(
    did: DecentralizedIdentifier,
    keyPair: KeyPair,
    serviceEndpoints?: ServiceEndpoint[]
  ): DIDDocument {
    const verificationMethodId = `${did.did}#keys-1`;

    const verificationMethod: VerificationMethod = {
      id: verificationMethodId,
      type: keyPair.type === 'Ed25519' ? 'Ed25519VerificationKey2020' : 'EcdsaSecp256k1VerificationKey2019',
      controller: did.did,
      publicKeyMultibase: this.crypto.toMultibase(
        this.crypto.fromBase64Url(keyPair.publicKey),
        'z'
      )
    };

    const document: DIDDocument = {
      '@context': [DID_CONTEXTS.DID_V1, DID_CONTEXTS.SECURITY_V2],
      id: did.did,
      controller: did.controller,
      verificationMethod: [verificationMethod],
      authentication: [verificationMethodId],
      assertionMethod: [verificationMethodId]
    };

    // Add key agreement if key supports it
    if (keyPair.purposes.includes('keyAgreement')) {
      document.keyAgreement = [verificationMethodId];
    }

    // Add service endpoints
    if (serviceEndpoints && serviceEndpoints.length > 0) {
      document.service = serviceEndpoints;
    }

    return document;
  }

  // --------------------------------------------------------------------------
  // DID RESOLUTION
  // --------------------------------------------------------------------------

  /**
   * Resolve a DID to its document
   *
   * @param did - The DID to resolve
   */
  async resolveDID(did: string): Promise<Result<DIDDocument>> {
    if (!did || did.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'did is required' });
    }
    if (!did.startsWith('did:')) {
      return failure({ code: 'VALIDATION_ERROR', message: 'Invalid DID format' });
    }

    // Check cache first
    const cacheKey = `did:document:${did}`;
    const cached = await this.cacheGet<DIDDocument>(cacheKey);
    if (cached) {
      return success(cached);
    }

    try {
      const methodPart = did.split(':')[1];
      let document: DIDDocument | null = null;

      switch (methodPart) {
        case 'web':
          document = await this.resolveWebDID(did);
          break;
        case 'key':
          document = this.resolveKeyDID(did);
          break;
        case 'ethr':
          document = await this.resolveEthrDID(did);
          break;
        default:
          // Try local resolution
          document = await this.documentRepo.findByDID(did);
      }

      if (!document) {
        return failure(new DIDResolutionError(did, 'DID not found'));
      }

      // Cache for 5 minutes
      await this.cacheSet(cacheKey, document, 300);

      return success(document);
    } catch (error) {
      log.error('DID resolution failed', error as Error, { did });
      return failure(new DIDResolutionError(did, (error as Error).message));
    }
  }

  /**
   * Resolve a did:web DID
   */
  private async resolveWebDID(did: string): Promise<DIDDocument | null> {
    // Extract domain and path from did:web:domain:path
    const parts = did.replace('did:web:', '').split(':');
    const domain = parts[0].replace(/%3A/g, ':'); // URL decode port if present
    const path = parts.slice(1).join('/');

    // Check if it's our domain first
    if (domain === this.didConfig.webDomain) {
      return this.documentRepo.findByDID(did);
    }

    // Otherwise, fetch from the web
    const url = path
      ? `https://${domain}/${path}/did.json`
      : `https://${domain}/.well-known/did.json`;

    try {
      const response = await fetch(url, {
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json() as DIDDocument;
    } catch (error) {
      log.warn('Failed to resolve external did:web', { did, error: String(error) });
      return null;
    }
  }

  /**
   * Resolve a did:key DID (self-resolving)
   */
  private resolveKeyDID(did: string): DIDDocument {
    const methodSpecificId = did.replace('did:key:', '');
    const publicKeyBytes = this.crypto.fromMultibase(methodSpecificId);

    // Remove multicodec prefix (first 2 bytes)
    const keyBytes = publicKeyBytes.slice(2);

    // Determine key type from multicodec prefix
    const prefix = publicKeyBytes.slice(0, 2);
    const isEd25519 = prefix[0] === 0xed && prefix[1] === 0x01;

    const verificationMethodId = `${did}#${methodSpecificId}`;

    return {
      '@context': [DID_CONTEXTS.DID_V1, DID_CONTEXTS.SECURITY_V2],
      id: did,
      verificationMethod: [{
        id: verificationMethodId,
        type: isEd25519 ? 'Ed25519VerificationKey2020' : 'EcdsaSecp256k1VerificationKey2019',
        controller: did,
        publicKeyMultibase: methodSpecificId
      }],
      authentication: [verificationMethodId],
      assertionMethod: [verificationMethodId]
    };
  }

  /**
   * Resolve a did:ethr DID
   */
  private async resolveEthrDID(did: string): Promise<DIDDocument | null> {
    // For now, check local store
    // In production, this would query the Ethereum network
    return this.documentRepo.findByDID(did);
  }

  // --------------------------------------------------------------------------
  // DID MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Get all DIDs for a user
   */
  async getUserDIDs(tenantId: string, userId: string): Promise<Result<DecentralizedIdentifier[]>> {
    return this.withTiming('getUserDIDs', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }

      try {
        const dids = await this.didRepo.findByUser(tenantId, userId);
        return success(dids);
      } catch (error) {
        log.error('Failed to get user DIDs', error as Error, { tenantId, userId });
        return failure({ code: 'SERVICE_ERROR', message: (error as Error).message });
      }
    });
  }

  /**
   * Get primary DID for a user
   */
  async getPrimaryDID(tenantId: string, userId: string): Promise<Result<DecentralizedIdentifier | null>> {
    return this.withTiming('getPrimaryDID', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }

      try {
        const did = await this.didRepo.findPrimaryByUser(tenantId, userId);
        return success(did);
      } catch (error) {
        log.error('Failed to get primary DID', error as Error, { tenantId, userId });
        return failure({ code: 'SERVICE_ERROR', message: (error as Error).message });
      }
    });
  }

  /**
   * Set a DID as primary
   */
  async setPrimaryDID(tenantId: string, userId: string, did: string): Promise<Result<void>> {
    return this.withTiming('setPrimaryDID', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }
      if (!did || did.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'did is required' });
      }

      try {
        const targetDID = await this.didRepo.findByDID(tenantId, did);
        if (!targetDID) {
          return failure({ code: 'NOT_FOUND', message: `DID not found: ${did}` });
        }

        // Unset current primary
        const currentPrimary = await this.didRepo.findPrimaryByUser(tenantId, userId);
        if (currentPrimary) {
          // Update user record to point to new primary
        }

        await this.publishSSIEvent('ssi.did.updated', tenantId, userId, {
          did,
          change: 'set_as_primary'
        });

        return success(undefined);
      } catch (error) {
        log.error('Failed to set primary DID', error as Error, { tenantId, userId, did });
        return failure({ code: 'SERVICE_ERROR', message: (error as Error).message });
      }
    });
  }

  /**
   * Deactivate a DID
   */
  async deactivateDID(tenantId: string, userId: string, did: string, reason: string): Promise<Result<void>> {
    return this.withTiming('deactivateDID', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }
      if (!did || did.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'did is required' });
      }
      if (!reason || reason.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'reason is required' });
      }

      try {
        const existingDID = await this.didRepo.findByDID(tenantId, did);
        if (!existingDID) {
          return failure({ code: 'NOT_FOUND', message: `DID not found: ${did}` });
        }

        if (existingDID.status === 'deactivated') {
          return failure({ code: 'VALIDATION_ERROR', message: 'DID is already deactivated' });
        }

        // Revoke all keys associated with this DID
        const keys = await this.keyRepo.findByDID(tenantId, did);
        for (const key of keys) {
          await this.keyRepo.revoke(tenantId, key.id);
        }

        // Deactivate the DID
        await this.didRepo.deactivate(tenantId, did);

        // Remove the DID document
        await this.documentRepo.delete(did);

        // Clear cache
        await this.cacheInvalidate(`did:document:${did}`);

        await this.publishSSIEvent('ssi.did.deactivated', tenantId, userId, {
          did,
          reason
        });

        log.info('DID deactivated', { tenantId, userId, did, reason });

        return success(undefined);
      } catch (error) {
        log.error('Failed to deactivate DID', error as Error, { tenantId, userId, did });
        return failure({ code: 'SERVICE_ERROR', message: (error as Error).message });
      }
    });
  }

  // --------------------------------------------------------------------------
  // KEY MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Rotate keys for a DID
   */
  async rotateKeys(
    tenantId: string,
    userId: string,
    did: string,
    currentPassphrase: string,
    newPassphrase?: string,
    reason: 'scheduled' | 'compromise_suspected' | 'user_requested' | 'policy' = 'user_requested'
  ): Promise<Result<KeyPair>> {
    return this.withTiming('rotateKeys', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }
      if (!did || did.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'did is required' });
      }
      if (!currentPassphrase) {
        return failure({ code: 'VALIDATION_ERROR', message: 'currentPassphrase is required' });
      }

      try {
        // Get current primary key
        const currentKey = await this.keyRepo.findPrimaryByDID(tenantId, did);
        if (!currentKey) {
          return failure({ code: 'NOT_FOUND', message: `Primary key not found for DID: ${did}` });
        }

        // Verify current passphrase by attempting to decrypt
        const isValid = await this.verifyPassphrase(currentKey, currentPassphrase);
        if (!isValid) {
          return failure(new KeyManagementError('Invalid passphrase'));
        }

        // Generate new key pair
        const keyType = currentKey.type;
        const rawKeyPair = keyType === 'Ed25519'
          ? await this.crypto.generateEd25519KeyPair()
          : await this.crypto.generateSecp256k1KeyPair();

        // Encrypt with new or current passphrase
        const passphrase = newPassphrase || currentPassphrase;
        const salt = this.crypto.randomBytes(32);
        const derivedKey = await this.crypto.deriveKey(passphrase, salt);
        const encrypted = await this.crypto.encrypt(rawKeyPair.privateKey, derivedKey);

        // Create new key pair record
        const newKeyPair: KeyPair = {
          id: this.generateId('key'),
          did,
          type: keyType,
          publicKey: this.crypto.toBase64Url(rawKeyPair.publicKey),
          encryptedPrivateKey: JSON.stringify({
            ciphertext: this.crypto.toBase64Url(encrypted.ciphertext),
            iv: this.crypto.toBase64Url(encrypted.iv),
            tag: this.crypto.toBase64Url(encrypted.tag),
            salt: this.crypto.toBase64Url(salt)
          }),
          privateKeyEncryption: 'AES-256-GCM',
          kdf: 'Argon2id',
          purposes: currentKey.purposes,
          created: new Date(),
          isPrimary: true,
          status: 'active'
        };

        // Mark old key as rotated
        await this.keyRepo.update(tenantId, currentKey.id, {
          isPrimary: false,
          status: 'rotated'
        });

        // Save new key
        const savedKey = await this.keyRepo.save(tenantId, newKeyPair);

        // Update DID document
        await this.updateDIDDocumentKeys(did, savedKey);

        // Clear cache
        await this.cacheInvalidate(`did:document:${did}`);

        await this.publishSSIEvent('ssi.key.rotated', tenantId, userId, {
          did,
          previousKeyId: currentKey.id,
          newKeyId: savedKey.id,
          reason
        });

        log.info('Keys rotated successfully', { tenantId, userId, did, reason });

        return success(savedKey);
      } catch (error) {
        log.error('Failed to rotate keys', error as Error, { tenantId, userId, did });
        return failure({ code: 'KEY_MANAGEMENT_ERROR', message: (error as Error).message });
      }
    });
  }

  /**
   * Verify a passphrase can decrypt the key
   */
  private async verifyPassphrase(keyPair: KeyPair, passphrase: string): Promise<boolean> {
    try {
      const encryptedData = JSON.parse(keyPair.encryptedPrivateKey);
      const salt = this.crypto.fromBase64Url(encryptedData.salt);
      const derivedKey = await this.crypto.deriveKey(passphrase, salt);

      await this.crypto.decrypt(
        this.crypto.fromBase64Url(encryptedData.ciphertext),
        derivedKey,
        this.crypto.fromBase64Url(encryptedData.iv),
        this.crypto.fromBase64Url(encryptedData.tag)
      );

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Update DID document with new keys
   */
  private async updateDIDDocumentKeys(did: string, newKey: KeyPair): Promise<void> {
    const document = await this.documentRepo.findByDID(did);
    if (!document) {
      throw new SSIError('NOT_FOUND', `DIDDocument not found: ${did}`);
    }

    const verificationMethodId = `${did}#keys-${Date.now()}`;

    const verificationMethod: VerificationMethod = {
      id: verificationMethodId,
      type: newKey.type === 'Ed25519' ? 'Ed25519VerificationKey2020' : 'EcdsaSecp256k1VerificationKey2019',
      controller: did,
      publicKeyMultibase: this.crypto.toMultibase(
        this.crypto.fromBase64Url(newKey.publicKey),
        'z'
      )
    };

    // Add new verification method
    document.verificationMethod.push(verificationMethod);

    // Update references to use new key
    document.authentication = [verificationMethodId];
    document.assertionMethod = [verificationMethodId];

    await this.documentRepo.save(did, document);
  }

  /**
   * Sign data with a DID's key
   */
  async signWithDID(
    tenantId: string,
    did: string,
    data: Uint8Array,
    passphrase: string
  ): Promise<Result<{ signature: Uint8Array; verificationMethod: string }>> {
    return this.withTiming('signWithDID', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!did || did.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'did is required' });
      }
      if (!passphrase) {
        return failure({ code: 'VALIDATION_ERROR', message: 'passphrase is required' });
      }

      try {
        const keyPair = await this.keyRepo.findPrimaryByDID(tenantId, did);
        if (!keyPair) {
          return failure({ code: 'NOT_FOUND', message: `Primary key not found for DID: ${did}` });
        }

        // Decrypt private key
        const encryptedData = JSON.parse(keyPair.encryptedPrivateKey);
        const salt = this.crypto.fromBase64Url(encryptedData.salt);
        const derivedKey = await this.crypto.deriveKey(passphrase, salt);

        const privateKey = await this.crypto.decrypt(
          this.crypto.fromBase64Url(encryptedData.ciphertext),
          derivedKey,
          this.crypto.fromBase64Url(encryptedData.iv),
          this.crypto.fromBase64Url(encryptedData.tag)
        );

        // Sign
        const algorithm: 'Ed25519' | 'secp256k1' = keyPair.type === 'secp256k1' ? 'secp256k1' : 'Ed25519';
        const signature = await this.crypto.sign(data, privateKey, algorithm);

        // Get verification method ID
        const document = await this.documentRepo.findByDID(did);
        const verificationMethod = document?.assertionMethod?.[0] as string || `${did}#keys-1`;

        return success({ signature, verificationMethod });
      } catch (error) {
        log.error('Failed to sign with DID', error as Error, { tenantId, did });
        return failure({ code: 'KEY_MANAGEMENT_ERROR', message: (error as Error).message });
      }
    });
  }

  /**
   * Verify a signature from a DID
   */
  async verifySignature(
    did: string,
    data: Uint8Array,
    signature: Uint8Array,
    verificationMethodId?: string
  ): Promise<Result<boolean>> {
    if (!did || did.trim() === '') {
      return failure({ code: 'VALIDATION_ERROR', message: 'did is required' });
    }

    try {
      // Resolve DID document
      const resolution = await this.resolveDID(did);
      if (!resolution.success) {
        const failedResult = resolution as { success: false; error: { code: string; message: string } };
        return failure({ code: failedResult.error.code, message: failedResult.error.message });
      }

      const document = resolution.data;

      // Find the verification method
      let verificationMethod: VerificationMethod | undefined;

      if (verificationMethodId) {
        verificationMethod = document.verificationMethod.find(vm => vm.id === verificationMethodId);
      } else {
        // Use first assertion method
        const methodRef = document.assertionMethod?.[0];
        if (typeof methodRef === 'string') {
          verificationMethod = document.verificationMethod.find(vm => vm.id === methodRef);
        } else {
          verificationMethod = methodRef as VerificationMethod;
        }
      }

      if (!verificationMethod) {
        return failure({ code: 'VALIDATION_ERROR', message: 'No suitable verification method found' });
      }

      // Get public key
      let publicKey: Uint8Array;
      if (verificationMethod.publicKeyMultibase) {
        publicKey = this.crypto.fromMultibase(verificationMethod.publicKeyMultibase);
        // Remove multicodec prefix if present
        if (publicKey.length > 32) {
          publicKey = publicKey.slice(2);
        }
      } else if (verificationMethod.publicKeyJwk) {
        return failure({ code: 'VALIDATION_ERROR', message: 'JWK public keys not yet supported' });
      } else {
        return failure({ code: 'VALIDATION_ERROR', message: 'No public key found in verification method' });
      }

      // Determine algorithm
      const algorithm = verificationMethod.type.includes('Ed25519') ? 'Ed25519' : 'secp256k1';

      // Verify
      const isValid = await this.crypto.verify(data, signature, publicKey, algorithm);

      return success(isValid);
    } catch (error) {
      log.error('Signature verification failed', error as Error, { did });
      return failure(new KeyManagementError('Verification failed', { error: (error as Error).message }));
    }
  }

  // --------------------------------------------------------------------------
  // SERVICE ENDPOINTS
  // --------------------------------------------------------------------------

  /**
   * Add a service endpoint to a DID document
   */
  async addServiceEndpoint(
    tenantId: string,
    did: string,
    endpoint: ServiceEndpoint
  ): Promise<Result<DIDDocument>> {
    return this.withTiming('addServiceEndpoint', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!did || did.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'did is required' });
      }
      if (!endpoint.id) {
        return failure({ code: 'VALIDATION_ERROR', message: 'endpoint.id is required' });
      }
      if (!endpoint.type) {
        return failure({ code: 'VALIDATION_ERROR', message: 'endpoint.type is required' });
      }
      if (!endpoint.serviceEndpoint) {
        return failure({ code: 'VALIDATION_ERROR', message: 'endpoint.serviceEndpoint is required' });
      }

      try {
        const document = await this.documentRepo.findByDID(did);
        if (!document) {
          return failure({ code: 'NOT_FOUND', message: `DIDDocument not found: ${did}` });
        }

        // Initialize service array if needed
        if (!document.service) {
          document.service = [];
        }

        // Check for duplicate ID
        if (document.service.some(s => s.id === endpoint.id)) {
          return failure({ code: 'VALIDATION_ERROR', message: `Service endpoint with ID ${endpoint.id} already exists` });
        }

        document.service.push(endpoint);

        const updated = await this.documentRepo.save(did, document);

        // Clear cache
        await this.cacheInvalidate(`did:document:${did}`);

        return success(updated);
      } catch (error) {
        log.error('Failed to add service endpoint', error as Error, { tenantId, did });
        return failure({ code: 'SERVICE_ERROR', message: (error as Error).message });
      }
    });
  }

  /**
   * Remove a service endpoint from a DID document
   */
  async removeServiceEndpoint(
    tenantId: string,
    did: string,
    endpointId: string
  ): Promise<Result<DIDDocument>> {
    return this.withTiming('removeServiceEndpoint', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!did || did.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'did is required' });
      }
      if (!endpointId || endpointId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'endpointId is required' });
      }

      try {
        const document = await this.documentRepo.findByDID(did);
        if (!document) {
          return failure({ code: 'NOT_FOUND', message: `DIDDocument not found: ${did}` });
        }

        if (!document.service) {
          return failure({ code: 'NOT_FOUND', message: `ServiceEndpoint not found: ${endpointId}` });
        }

        const index = document.service.findIndex(s => s.id === endpointId);
        if (index === -1) {
          return failure({ code: 'NOT_FOUND', message: `ServiceEndpoint not found: ${endpointId}` });
        }

        document.service.splice(index, 1);

        const updated = await this.documentRepo.save(did, document);

        // Clear cache
        await this.cacheInvalidate(`did:document:${did}`);

        return success(updated);
      } catch (error) {
        log.error('Failed to remove service endpoint', error as Error, { tenantId, did });
        return failure({ code: 'SERVICE_ERROR', message: (error as Error).message });
      }
    });
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  /**
   * Publish SSI-specific event
   */
  private async publishSSIEvent(
    type: string,
    tenantId: string,
    userId: string,
    payload: Record<string, any>
  ): Promise<void> {
    await this.publishEvent(type, tenantId, {
      userId,
      ...payload
    });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let instance: DIDService | null = null;

export function initializeDIDService(deps?: any): DIDService {
  if (!instance) {
    instance = new DIDService(deps);
    log.info('DIDService initialized');
  }
  return instance;
}

export function getDIDService(): DIDService {
  if (!instance) {
    throw new Error('DIDService not initialized. Call initializeDIDService() first.');
  }
  return instance;
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export const DID_SERVICE_VERSION = '1.0.0';
