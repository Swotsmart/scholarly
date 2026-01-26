/**
 * Digital Wallet Service
 * 
 * Phase 1 Foundation: Trust & Identity Layer
 * 
 * ## The Granny Explanation
 * 
 * Your physical wallet holds your cards and cash. A digital wallet holds your
 * digital identity: your credentials, keys, and proof of who you are.
 * 
 * Unlike passwords stored by websites, YOUR wallet is YOURS:
 * - Only you can open it (with your passphrase)
 * - Only you decide what to share
 * - It travels with you between services
 * - It survives even if Scholarly disappears
 * 
 * @module DigitalWalletService
 */

import {
  ScholarlyBaseService,
  Result,
  success,
  failure,
  ValidationError,
  NotFoundError,
  EventBus,
  Cache,
  ScholarlyConfig,
  Validator
} from './types';

import {
  DigitalWallet,
  WalletBackup,
  KeyRecoveryConfig,
  DecentralizedIdentifier,
  KeyPair,
  VerifiableCredential,
  WalletError,
  DIDMethod
} from './ssi-vc-types';

import { DIDService, CryptoProvider } from './did-service';
import { VerifiableCredentialsService } from './verifiable-credentials-service';

// ============================================================================
// REPOSITORY INTERFACES
// ============================================================================

export interface WalletRepository {
  findById(tenantId: string, walletId: string): Promise<DigitalWallet | null>;
  findByUser(tenantId: string, userId: string): Promise<DigitalWallet | null>;
  findByDID(tenantId: string, did: string): Promise<DigitalWallet | null>;
  save(tenantId: string, wallet: DigitalWallet): Promise<DigitalWallet>;
  update(tenantId: string, walletId: string, updates: Partial<DigitalWallet>): Promise<DigitalWallet>;
  delete(tenantId: string, walletId: string): Promise<void>;
}

export interface WalletBackupRepository {
  saveBackup(tenantId: string, userId: string, backup: WalletBackup): Promise<string>;
  getLatestBackup(tenantId: string, userId: string): Promise<WalletBackup | null>;
  listBackups(tenantId: string, userId: string): Promise<{ id: string; created: Date }[]>;
  getBackup(tenantId: string, backupId: string): Promise<WalletBackup | null>;
}

// ============================================================================
// CONFIGURATION
// ============================================================================

export interface WalletServiceConfig {
  minPassphraseLength: number;
  defaultDIDMethod: DIDMethod;
  autoBackupEnabled: boolean;
  backupVersion: string;
  sessionTimeoutMinutes: number;
  maxFailedUnlockAttempts: number;
  lockoutDurationMinutes: number;
}

// ============================================================================
// WALLET SESSION
// ============================================================================

interface WalletSession {
  walletId: string;
  userId: string;
  derivedKey: Uint8Array;
  unlockedAt: Date;
  expiresAt: Date;
}

// ============================================================================
// SERVICE IMPLEMENTATION
// ============================================================================

export class DigitalWalletService extends ScholarlyBaseService {
  private readonly walletRepo: WalletRepository;
  private readonly backupRepo: WalletBackupRepository;
  private readonly didService: DIDService;
  private readonly vcService: VerifiableCredentialsService;
  private readonly crypto: CryptoProvider;
  private readonly walletConfig: WalletServiceConfig;
  
  private readonly sessions: Map<string, WalletSession> = new Map();
  private readonly failedAttempts: Map<string, { count: number; lastAttempt: Date }> = new Map();

  constructor(deps: {
    eventBus: EventBus;
    cache: Cache;
    config: ScholarlyConfig;
    walletRepo: WalletRepository;
    backupRepo: WalletBackupRepository;
    didService: DIDService;
    vcService: VerifiableCredentialsService;
    crypto: CryptoProvider;
    walletConfig: WalletServiceConfig;
  }) {
    super('DigitalWalletService', deps);
    this.walletRepo = deps.walletRepo;
    this.backupRepo = deps.backupRepo;
    this.didService = deps.didService;
    this.vcService = deps.vcService;
    this.crypto = deps.crypto;
    this.walletConfig = deps.walletConfig;
  }

  // --------------------------------------------------------------------------
  // WALLET CREATION
  // --------------------------------------------------------------------------

  /**
   * Create a new digital wallet for a user
   */
  async createWallet(
    tenantId: string,
    userId: string,
    passphrase: string,
    options?: {
      didMethod?: DIDMethod;
      recoveryConfig?: Partial<KeyRecoveryConfig>;
    }
  ): Promise<Result<{ wallet: DigitalWallet; did: DecentralizedIdentifier }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
      Validator.required(passphrase, 'passphrase');
      
      if (passphrase.length < this.walletConfig.minPassphraseLength) {
        throw new ValidationError(
          `Passphrase must be at least ${this.walletConfig.minPassphraseLength} characters`
        );
      }
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createWallet', tenantId, async () => {
      // Check if user already has a wallet
      const existingWallet = await this.walletRepo.findByUser(tenantId, userId);
      if (existingWallet) {
        throw new ValidationError('User already has a wallet');
      }

      // Create DID
      const didMethod = options?.didMethod || this.walletConfig.defaultDIDMethod;
      const didResult = await this.didService.createDID(tenantId, userId, didMethod, passphrase, {
        setAsPrimary: true,
        keyPurposes: ['authentication', 'assertion', 'keyAgreement']
      });

      if (!didResult.success) {
        throw didResult.error;
      }

      const { did, keyPair } = didResult.data;

      // Build recovery config
      const recovery: KeyRecoveryConfig = {
        method: options?.recoveryConfig?.method || 'mnemonic',
        ...options?.recoveryConfig
      };

      // Create wallet
      const wallet: DigitalWallet = {
        id: this.generateId('wallet'),
        tenantId,
        userId,
        primaryDid: did.did,
        dids: [did],
        keyPairs: [keyPair],
        credentials: [],
        presentations: [],
        recovery,
        encryptionKeyId: this.generateId('wek'),
        created: new Date(),
        lastAccessed: new Date(),
        status: 'active'
      };

      const savedWallet = await this.walletRepo.save(tenantId, wallet);

      // Auto-backup if enabled
      if (this.walletConfig.autoBackupEnabled) {
        await this.createBackup(tenantId, userId, passphrase);
      }

      await this.publishEvent('ssi.wallet.created', tenantId, {
        walletId: savedWallet.id,
        userId,
        primaryDid: did.did
      });

      this.logger.info('Wallet created successfully', {
        tenantId,
        userId,
        walletId: savedWallet.id,
        primaryDid: did.did
      });

      return { wallet: savedWallet, did };
    }, { userId });
  }

  // --------------------------------------------------------------------------
  // WALLET ACCESS
  // --------------------------------------------------------------------------

  /**
   * Unlock a wallet for use
   */
  async unlockWallet(
    tenantId: string,
    userId: string,
    passphrase: string
  ): Promise<Result<{ wallet: DigitalWallet; sessionExpires: Date }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
      Validator.required(passphrase, 'passphrase');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('unlockWallet', tenantId, async () => {
      const wallet = await this.walletRepo.findByUser(tenantId, userId);
      if (!wallet) {
        throw new NotFoundError('Wallet', userId);
      }

      // Check lockout
      if (this.isLockedOut(wallet.id)) {
        const lockoutInfo = this.failedAttempts.get(wallet.id)!;
        const unlockTime = new Date(
          lockoutInfo.lastAttempt.getTime() + this.walletConfig.lockoutDurationMinutes * 60 * 1000
        );
        throw new WalletError('Wallet is locked due to too many failed attempts', {
          unlockTime: unlockTime.toISOString()
        });
      }

      if (wallet.status === 'deactivated') {
        throw new WalletError('Wallet has been deactivated');
      }

      if (wallet.status === 'locked') {
        throw new WalletError('Wallet is locked and requires recovery');
      }

      // Verify passphrase
      const primaryKey = wallet.keyPairs.find(k => k.isPrimary);
      if (!primaryKey) {
        throw new WalletError('No primary key found in wallet');
      }

      const isValid = await this.verifyPassphrase(primaryKey, passphrase);
      if (!isValid) {
        this.recordFailedAttempt(wallet.id);
        throw new WalletError('Invalid passphrase');
      }

      // Clear failed attempts
      this.failedAttempts.delete(wallet.id);

      // Create session
      const salt = this.crypto.randomBytes(32);
      const derivedKey = await this.crypto.deriveKey(passphrase, salt);
      
      const expiresAt = new Date(
        Date.now() + this.walletConfig.sessionTimeoutMinutes * 60 * 1000
      );

      const session: WalletSession = {
        walletId: wallet.id,
        userId,
        derivedKey,
        unlockedAt: new Date(),
        expiresAt
      };

      this.sessions.set(wallet.id, session);

      await this.walletRepo.update(tenantId, wallet.id, {
        lastAccessed: new Date()
      });

      await this.publishEvent('ssi.wallet.unlocked', tenantId, {
        walletId: wallet.id,
        userId
      });

      return { wallet, sessionExpires: expiresAt };
    }, { userId });
  }

  /**
   * Lock a wallet (end session)
   */
  async lockWallet(tenantId: string, userId: string): Promise<Result<void>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('lockWallet', tenantId, async () => {
      const wallet = await this.walletRepo.findByUser(tenantId, userId);
      if (!wallet) {
        throw new NotFoundError('Wallet', userId);
      }

      this.sessions.delete(wallet.id);

      await this.publishEvent('ssi.wallet.locked', tenantId, {
        walletId: wallet.id,
        userId
      });
    }, { userId });
  }

  /**
   * Check if wallet is unlocked
   */
  isWalletUnlocked(walletId: string): boolean {
    const session = this.sessions.get(walletId);
    if (!session) return false;
    
    if (new Date() > session.expiresAt) {
      this.sessions.delete(walletId);
      return false;
    }
    
    return true;
  }

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

  private recordFailedAttempt(walletId: string): void {
    const existing = this.failedAttempts.get(walletId);
    this.failedAttempts.set(walletId, {
      count: (existing?.count || 0) + 1,
      lastAttempt: new Date()
    });
  }

  private isLockedOut(walletId: string): boolean {
    const attempts = this.failedAttempts.get(walletId);
    if (!attempts) return false;

    if (attempts.count < this.walletConfig.maxFailedUnlockAttempts) {
      return false;
    }

    const lockoutExpires = new Date(
      attempts.lastAttempt.getTime() + this.walletConfig.lockoutDurationMinutes * 60 * 1000
    );

    if (new Date() > lockoutExpires) {
      this.failedAttempts.delete(walletId);
      return false;
    }

    return true;
  }

  // --------------------------------------------------------------------------
  // CREDENTIAL MANAGEMENT
  // --------------------------------------------------------------------------

  /**
   * Add a credential to the wallet
   */
  async addCredential(
    tenantId: string,
    userId: string,
    credential: VerifiableCredential
  ): Promise<Result<DigitalWallet>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
      Validator.required(credential, 'credential');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('addCredential', tenantId, async () => {
      const wallet = await this.getUnlockedWallet(tenantId, userId);

      if (credential.credentialSubject.id !== wallet.primaryDid) {
        throw new ValidationError('Credential subject does not match wallet DID');
      }

      if (wallet.credentials.some(c => c.id === credential.id)) {
        throw new ValidationError('Credential already exists in wallet');
      }

      wallet.credentials.push(credential);

      const updated = await this.walletRepo.update(tenantId, wallet.id, {
        credentials: wallet.credentials
      });

      await this.publishEvent('ssi.credential.received', tenantId, {
        walletId: wallet.id,
        credentialId: credential.id,
        credentialType: credential.type
      });

      return updated;
    }, { userId, credentialId: credential.id });
  }

  /**
   * Remove a credential from the wallet
   */
  async removeCredential(
    tenantId: string,
    userId: string,
    credentialId: string
  ): Promise<Result<DigitalWallet>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
      Validator.required(credentialId, 'credentialId');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('removeCredential', tenantId, async () => {
      const wallet = await this.getUnlockedWallet(tenantId, userId);

      const index = wallet.credentials.findIndex(c => c.id === credentialId);
      if (index === -1) {
        throw new NotFoundError('Credential', credentialId);
      }

      wallet.credentials.splice(index, 1);

      return await this.walletRepo.update(tenantId, wallet.id, {
        credentials: wallet.credentials
      });
    }, { userId, credentialId });
  }

  /**
   * Get credentials from wallet
   */
  async getCredentials(
    tenantId: string,
    userId: string,
    filter?: { type?: string }
  ): Promise<Result<VerifiableCredential[]>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getCredentials', tenantId, async () => {
      const wallet = await this.getUnlockedWallet(tenantId, userId);

      let credentials = wallet.credentials;

      if (filter?.type) {
        credentials = credentials.filter(c => c.type.includes(filter.type!));
      }

      return credentials;
    }, { userId });
  }

  // --------------------------------------------------------------------------
  // BACKUP AND RECOVERY
  // --------------------------------------------------------------------------

  /**
   * Create an encrypted backup
   */
  async createBackup(
    tenantId: string,
    userId: string,
    passphrase: string
  ): Promise<Result<{ backupId: string; created: Date }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
      Validator.required(passphrase, 'passphrase');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('createBackup', tenantId, async () => {
      const wallet = await this.walletRepo.findByUser(tenantId, userId);
      if (!wallet) {
        throw new NotFoundError('Wallet', userId);
      }

      // Verify passphrase
      const primaryKey = wallet.keyPairs.find(k => k.isPrimary);
      if (!primaryKey || !(await this.verifyPassphrase(primaryKey, passphrase))) {
        throw new WalletError('Invalid passphrase');
      }

      // Serialize wallet
      const walletData = JSON.stringify({
        id: wallet.id,
        tenantId: wallet.tenantId,
        userId: wallet.userId,
        primaryDid: wallet.primaryDid,
        dids: wallet.dids,
        keyPairs: wallet.keyPairs,
        credentials: wallet.credentials,
        recovery: wallet.recovery,
        created: wallet.created
      });

      // Encrypt
      const salt = this.crypto.randomBytes(32);
      const derivedKey = await this.crypto.deriveKey(passphrase, salt);
      const encrypted = await this.crypto.encrypt(
        new TextEncoder().encode(walletData),
        derivedKey
      );

      // Checksum
      const checksumData = await this.crypto.sha256(new TextEncoder().encode(walletData));
      const checksum = this.crypto.toBase64Url(checksumData);

      const backup: WalletBackup = {
        version: this.walletConfig.backupVersion,
        encryptedPayload: JSON.stringify({
          ciphertext: this.crypto.toBase64Url(encrypted.ciphertext),
          iv: this.crypto.toBase64Url(encrypted.iv),
          tag: this.crypto.toBase64Url(encrypted.tag)
        }),
        encryption: {
          algorithm: 'AES-256-GCM',
          kdf: 'Argon2id',
          salt: this.crypto.toBase64Url(salt),
          iterations: 3,
          memory: 65536,
          parallelism: 4
        },
        created: new Date(),
        checksum
      };

      const backupId = await this.backupRepo.saveBackup(tenantId, userId, backup);

      this.logger.info('Wallet backup created', { tenantId, userId, backupId });

      return { backupId, created: backup.created };
    }, { userId });
  }

  /**
   * Restore wallet from backup
   */
  async restoreFromBackup(
    tenantId: string,
    userId: string,
    backupId: string,
    passphrase: string
  ): Promise<Result<DigitalWallet>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
      Validator.required(backupId, 'backupId');
      Validator.required(passphrase, 'passphrase');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('restoreFromBackup', tenantId, async () => {
      const backup = await this.backupRepo.getBackup(tenantId, backupId);
      if (!backup) {
        throw new NotFoundError('Backup', backupId);
      }

      // Decrypt
      const encryptedData = JSON.parse(backup.encryptedPayload);
      const salt = this.crypto.fromBase64Url(backup.encryption.salt);
      const derivedKey = await this.crypto.deriveKey(passphrase, salt);

      let decryptedData: Uint8Array;
      try {
        decryptedData = await this.crypto.decrypt(
          this.crypto.fromBase64Url(encryptedData.ciphertext),
          derivedKey,
          this.crypto.fromBase64Url(encryptedData.iv),
          this.crypto.fromBase64Url(encryptedData.tag)
        );
      } catch {
        throw new WalletError('Invalid passphrase or corrupted backup');
      }

      const walletData = JSON.parse(new TextDecoder().decode(decryptedData));

      // Verify checksum
      const checksumData = await this.crypto.sha256(decryptedData);
      const checksum = this.crypto.toBase64Url(checksumData);
      if (checksum !== backup.checksum) {
        throw new WalletError('Backup integrity check failed');
      }

      // Delete existing wallet if present
      const existingWallet = await this.walletRepo.findByUser(tenantId, userId);
      if (existingWallet) {
        await this.walletRepo.delete(tenantId, existingWallet.id);
      }

      // Restore
      const wallet: DigitalWallet = {
        ...walletData,
        lastAccessed: new Date(),
        status: 'active'
      };

      const restored = await this.walletRepo.save(tenantId, wallet);

      await this.publishEvent('ssi.wallet.recovered', tenantId, {
        walletId: restored.id,
        userId,
        backupId
      });

      this.logger.info('Wallet restored from backup', {
        tenantId,
        userId,
        walletId: restored.id,
        backupId
      });

      return restored;
    }, { userId, backupId });
  }

  /**
   * List available backups
   */
  async listBackups(
    tenantId: string,
    userId: string
  ): Promise<Result<{ id: string; created: Date }[]>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('listBackups', tenantId, async () => {
      return this.backupRepo.listBackups(tenantId, userId);
    }, { userId });
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  private async getUnlockedWallet(tenantId: string, userId: string): Promise<DigitalWallet> {
    const wallet = await this.walletRepo.findByUser(tenantId, userId);
    if (!wallet) {
      throw new NotFoundError('Wallet', userId);
    }

    if (!this.isWalletUnlocked(wallet.id)) {
      throw new WalletError('Wallet is locked. Please unlock first.');
    }

    return wallet;
  }

  /**
   * Get wallet info (without requiring unlock)
   */
  async getWalletInfo(
    tenantId: string,
    userId: string
  ): Promise<Result<{
    id: string;
    primaryDid: string;
    didCount: number;
    credentialCount: number;
    created: Date;
    lastAccessed: Date;
    status: string;
  }>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('getWalletInfo', tenantId, async () => {
      const wallet = await this.walletRepo.findByUser(tenantId, userId);
      if (!wallet) {
        throw new NotFoundError('Wallet', userId);
      }

      return {
        id: wallet.id,
        primaryDid: wallet.primaryDid,
        didCount: wallet.dids.length,
        credentialCount: wallet.credentials.length,
        created: wallet.created,
        lastAccessed: wallet.lastAccessed,
        status: wallet.status
      };
    }, { userId });
  }

  /**
   * Change wallet passphrase
   */
  async changePassphrase(
    tenantId: string,
    userId: string,
    currentPassphrase: string,
    newPassphrase: string
  ): Promise<Result<void>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
      Validator.required(currentPassphrase, 'currentPassphrase');
      Validator.required(newPassphrase, 'newPassphrase');
      
      if (newPassphrase.length < this.walletConfig.minPassphraseLength) {
        throw new ValidationError(
          `New passphrase must be at least ${this.walletConfig.minPassphraseLength} characters`
        );
      }
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('changePassphrase', tenantId, async () => {
      const wallet = await this.walletRepo.findByUser(tenantId, userId);
      if (!wallet) {
        throw new NotFoundError('Wallet', userId);
      }

      // Verify current passphrase
      const primaryKey = wallet.keyPairs.find(k => k.isPrimary);
      if (!primaryKey || !(await this.verifyPassphrase(primaryKey, currentPassphrase))) {
        throw new WalletError('Invalid current passphrase');
      }

      // Rotate keys with new passphrase
      for (const did of wallet.dids) {
        await this.didService.rotateKeys(
          tenantId,
          userId,
          did.did,
          currentPassphrase,
          newPassphrase,
          'user_requested'
        );
      }

      // Lock wallet if unlocked
      if (this.isWalletUnlocked(wallet.id)) {
        await this.lockWallet(tenantId, userId);
      }

      this.logger.info('Wallet passphrase changed', {
        tenantId,
        userId,
        walletId: wallet.id
      });
    }, { userId });
  }

  /**
   * Deactivate wallet
   */
  async deactivateWallet(
    tenantId: string,
    userId: string,
    passphrase: string,
    reason: string
  ): Promise<Result<void>> {
    try {
      Validator.tenantId(tenantId);
      Validator.userId(userId);
      Validator.required(passphrase, 'passphrase');
      Validator.required(reason, 'reason');
    } catch (e) {
      return failure(e as ValidationError);
    }

    return this.withTiming('deactivateWallet', tenantId, async () => {
      const wallet = await this.walletRepo.findByUser(tenantId, userId);
      if (!wallet) {
        throw new NotFoundError('Wallet', userId);
      }

      // Verify passphrase
      const primaryKey = wallet.keyPairs.find(k => k.isPrimary);
      if (!primaryKey || !(await this.verifyPassphrase(primaryKey, passphrase))) {
        throw new WalletError('Invalid passphrase');
      }

      // Remove session
      this.sessions.delete(wallet.id);

      // Deactivate all DIDs
      for (const did of wallet.dids) {
        await this.didService.deactivateDID(tenantId, userId, did.did, reason);
      }

      // Update wallet status
      await this.walletRepo.update(tenantId, wallet.id, {
        status: 'deactivated'
      });

      this.logger.info('Wallet deactivated', {
        tenantId,
        userId,
        walletId: wallet.id,
        reason
      });
    }, { userId, reason });
  }
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export const WALLET_SERVICE_VERSION = '1.0.0';
