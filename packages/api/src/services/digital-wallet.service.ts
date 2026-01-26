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

import { ScholarlyBaseService, Result, success, failure, type ServiceDependencies } from './base.service';
import { log } from '../lib/logger';

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

import { DIDService, CryptoProvider } from './did.service';
import { VerifiableCredentialsService } from './verifiable-credentials.service';

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

  constructor(deps?: {
    walletRepo: WalletRepository;
    backupRepo: WalletBackupRepository;
    didService: DIDService;
    vcService: VerifiableCredentialsService;
    crypto: CryptoProvider;
    walletConfig: WalletServiceConfig;
  } & ServiceDependencies) {
    super('DigitalWalletService', deps);
    this.walletRepo = deps!.walletRepo;
    this.backupRepo = deps!.backupRepo;
    this.didService = deps!.didService;
    this.vcService = deps!.vcService;
    this.crypto = deps!.crypto;
    this.walletConfig = deps!.walletConfig;
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
    return this.withTiming('createWallet', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }
      if (!passphrase) {
        return failure({ code: 'VALIDATION_ERROR', message: 'passphrase is required' });
      }
      if (passphrase.length < this.walletConfig.minPassphraseLength) {
        return failure({
          code: 'VALIDATION_ERROR',
          message: `Passphrase must be at least ${this.walletConfig.minPassphraseLength} characters`
        });
      }

      try {
        // Check if user already has a wallet
        const existingWallet = await this.walletRepo.findByUser(tenantId, userId);
        if (existingWallet) {
          return failure({ code: 'VALIDATION_ERROR', message: 'User already has a wallet' });
        }

        // Create DID
        const didMethod = options?.didMethod || this.walletConfig.defaultDIDMethod;
        const didResult = await this.didService.createDID(tenantId, userId, didMethod, passphrase, {
          setAsPrimary: true,
          keyPurposes: ['authentication', 'assertion', 'keyAgreement']
        });

        if (!didResult.success) {
          const failedResult = didResult as { success: false; error: { code: string; message: string } };
          return failure({ code: failedResult.error.code, message: failedResult.error.message });
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

        log.info('Wallet created successfully', {
          tenantId,
          userId,
          walletId: savedWallet.id,
          primaryDid: did.did
        });

        return success({ wallet: savedWallet, did });
      } catch (error) {
        log.error('Failed to create wallet', error as Error, { tenantId, userId });
        return failure({
          code: 'WALLET_ERROR',
          message: (error as Error).message,
          details: { tenantId, userId }
        });
      }
    });
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
    return this.withTiming('unlockWallet', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }
      if (!passphrase) {
        return failure({ code: 'VALIDATION_ERROR', message: 'passphrase is required' });
      }

      try {
        const wallet = await this.walletRepo.findByUser(tenantId, userId);
        if (!wallet) {
          return failure({ code: 'NOT_FOUND', message: `Wallet not found for user: ${userId}` });
        }

        // Check lockout
        if (this.isLockedOut(wallet.id)) {
          const lockoutInfo = this.failedAttempts.get(wallet.id)!;
          const unlockTime = new Date(
            lockoutInfo.lastAttempt.getTime() + this.walletConfig.lockoutDurationMinutes * 60 * 1000
          );
          return failure(new WalletError('Wallet is locked due to too many failed attempts', {
            unlockTime: unlockTime.toISOString()
          }));
        }

        if (wallet.status === 'deactivated') {
          return failure(new WalletError('Wallet has been deactivated'));
        }

        if (wallet.status === 'locked') {
          return failure(new WalletError('Wallet is locked and requires recovery'));
        }

        // Verify passphrase
        const primaryKey = wallet.keyPairs.find(k => k.isPrimary);
        if (!primaryKey) {
          return failure(new WalletError('No primary key found in wallet'));
        }

        const isValid = await this.verifyPassphrase(primaryKey, passphrase);
        if (!isValid) {
          this.recordFailedAttempt(wallet.id);
          return failure(new WalletError('Invalid passphrase'));
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

        return success({ wallet, sessionExpires: expiresAt });
      } catch (error) {
        log.error('Failed to unlock wallet', error as Error, { tenantId, userId });
        return failure({ code: 'WALLET_ERROR', message: (error as Error).message });
      }
    });
  }

  /**
   * Lock a wallet (end session)
   */
  async lockWallet(tenantId: string, userId: string): Promise<Result<void>> {
    return this.withTiming('lockWallet', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }

      try {
        const wallet = await this.walletRepo.findByUser(tenantId, userId);
        if (!wallet) {
          return failure({ code: 'NOT_FOUND', message: `Wallet not found for user: ${userId}` });
        }

        this.sessions.delete(wallet.id);

        await this.publishEvent('ssi.wallet.locked', tenantId, {
          walletId: wallet.id,
          userId
        });

        return success(undefined);
      } catch (error) {
        log.error('Failed to lock wallet', error as Error, { tenantId, userId });
        return failure({ code: 'WALLET_ERROR', message: (error as Error).message });
      }
    });
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
    return this.withTiming('addCredential', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }
      if (!credential) {
        return failure({ code: 'VALIDATION_ERROR', message: 'credential is required' });
      }

      try {
        const wallet = await this.getUnlockedWallet(tenantId, userId);

        if (credential.credentialSubject.id !== wallet.primaryDid) {
          return failure({ code: 'VALIDATION_ERROR', message: 'Credential subject does not match wallet DID' });
        }

        if (wallet.credentials.some(c => c.id === credential.id)) {
          return failure({ code: 'VALIDATION_ERROR', message: 'Credential already exists in wallet' });
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

        return success(updated);
      } catch (error) {
        if (error instanceof WalletError) {
          return failure(error);
        }
        log.error('Failed to add credential', error as Error, { tenantId, userId });
        return failure({ code: 'WALLET_ERROR', message: (error as Error).message });
      }
    });
  }

  /**
   * Remove a credential from the wallet
   */
  async removeCredential(
    tenantId: string,
    userId: string,
    credentialId: string
  ): Promise<Result<DigitalWallet>> {
    return this.withTiming('removeCredential', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }
      if (!credentialId || credentialId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'credentialId is required' });
      }

      try {
        const wallet = await this.getUnlockedWallet(tenantId, userId);

        const index = wallet.credentials.findIndex(c => c.id === credentialId);
        if (index === -1) {
          return failure({ code: 'NOT_FOUND', message: `Credential not found: ${credentialId}` });
        }

        wallet.credentials.splice(index, 1);

        const updated = await this.walletRepo.update(tenantId, wallet.id, {
          credentials: wallet.credentials
        });

        return success(updated);
      } catch (error) {
        if (error instanceof WalletError) {
          return failure(error);
        }
        log.error('Failed to remove credential', error as Error, { tenantId, userId });
        return failure({ code: 'WALLET_ERROR', message: (error as Error).message });
      }
    });
  }

  /**
   * Get credentials from wallet
   */
  async getCredentials(
    tenantId: string,
    userId: string,
    filter?: { type?: string }
  ): Promise<Result<VerifiableCredential[]>> {
    return this.withTiming('getCredentials', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }

      try {
        const wallet = await this.getUnlockedWallet(tenantId, userId);

        let credentials = wallet.credentials;

        if (filter?.type) {
          credentials = credentials.filter(c => c.type.includes(filter.type!));
        }

        return success(credentials);
      } catch (error) {
        if (error instanceof WalletError) {
          return failure(error);
        }
        log.error('Failed to get credentials', error as Error, { tenantId, userId });
        return failure({ code: 'WALLET_ERROR', message: (error as Error).message });
      }
    });
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
    return this.withTiming('createBackup', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }
      if (!passphrase) {
        return failure({ code: 'VALIDATION_ERROR', message: 'passphrase is required' });
      }

      try {
        const wallet = await this.walletRepo.findByUser(tenantId, userId);
        if (!wallet) {
          return failure({ code: 'NOT_FOUND', message: `Wallet not found for user: ${userId}` });
        }

        // Verify passphrase
        const primaryKey = wallet.keyPairs.find(k => k.isPrimary);
        if (!primaryKey || !(await this.verifyPassphrase(primaryKey, passphrase))) {
          return failure(new WalletError('Invalid passphrase'));
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

        log.info('Wallet backup created', { tenantId, userId, backupId });

        return success({ backupId, created: backup.created });
      } catch (error) {
        if (error instanceof WalletError) {
          return failure(error);
        }
        log.error('Failed to create backup', error as Error, { tenantId, userId });
        return failure({ code: 'WALLET_ERROR', message: (error as Error).message });
      }
    });
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
    return this.withTiming('restoreFromBackup', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }
      if (!backupId || backupId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'backupId is required' });
      }
      if (!passphrase) {
        return failure({ code: 'VALIDATION_ERROR', message: 'passphrase is required' });
      }

      try {
        const backup = await this.backupRepo.getBackup(tenantId, backupId);
        if (!backup) {
          return failure({ code: 'NOT_FOUND', message: `Backup not found: ${backupId}` });
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
          return failure(new WalletError('Invalid passphrase or corrupted backup'));
        }

        const walletData = JSON.parse(new TextDecoder().decode(decryptedData));

        // Verify checksum
        const checksumData = await this.crypto.sha256(decryptedData);
        const checksum = this.crypto.toBase64Url(checksumData);
        if (checksum !== backup.checksum) {
          return failure(new WalletError('Backup integrity check failed'));
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

        log.info('Wallet restored from backup', {
          tenantId,
          userId,
          walletId: restored.id,
          backupId
        });

        return success(restored);
      } catch (error) {
        if (error instanceof WalletError) {
          return failure(error);
        }
        log.error('Failed to restore from backup', error as Error, { tenantId, userId, backupId });
        return failure({ code: 'WALLET_ERROR', message: (error as Error).message });
      }
    });
  }

  /**
   * List available backups
   */
  async listBackups(
    tenantId: string,
    userId: string
  ): Promise<Result<{ id: string; created: Date }[]>> {
    return this.withTiming('listBackups', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }

      try {
        const backups = await this.backupRepo.listBackups(tenantId, userId);
        return success(backups);
      } catch (error) {
        log.error('Failed to list backups', error as Error, { tenantId, userId });
        return failure({ code: 'WALLET_ERROR', message: (error as Error).message });
      }
    });
  }

  // --------------------------------------------------------------------------
  // HELPER METHODS
  // --------------------------------------------------------------------------

  private async getUnlockedWallet(tenantId: string, userId: string): Promise<DigitalWallet> {
    const wallet = await this.walletRepo.findByUser(tenantId, userId);
    if (!wallet) {
      throw new WalletError(`Wallet not found for user: ${userId}`);
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
    return this.withTiming('getWalletInfo', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }

      try {
        const wallet = await this.walletRepo.findByUser(tenantId, userId);
        if (!wallet) {
          return failure({ code: 'NOT_FOUND', message: `Wallet not found for user: ${userId}` });
        }

        return success({
          id: wallet.id,
          primaryDid: wallet.primaryDid,
          didCount: wallet.dids.length,
          credentialCount: wallet.credentials.length,
          created: wallet.created,
          lastAccessed: wallet.lastAccessed,
          status: wallet.status
        });
      } catch (error) {
        log.error('Failed to get wallet info', error as Error, { tenantId, userId });
        return failure({ code: 'WALLET_ERROR', message: (error as Error).message });
      }
    });
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
    return this.withTiming('changePassphrase', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }
      if (!currentPassphrase) {
        return failure({ code: 'VALIDATION_ERROR', message: 'currentPassphrase is required' });
      }
      if (!newPassphrase) {
        return failure({ code: 'VALIDATION_ERROR', message: 'newPassphrase is required' });
      }
      if (newPassphrase.length < this.walletConfig.minPassphraseLength) {
        return failure({
          code: 'VALIDATION_ERROR',
          message: `New passphrase must be at least ${this.walletConfig.minPassphraseLength} characters`
        });
      }

      try {
        const wallet = await this.walletRepo.findByUser(tenantId, userId);
        if (!wallet) {
          return failure({ code: 'NOT_FOUND', message: `Wallet not found for user: ${userId}` });
        }

        // Verify current passphrase
        const primaryKey = wallet.keyPairs.find(k => k.isPrimary);
        if (!primaryKey || !(await this.verifyPassphrase(primaryKey, currentPassphrase))) {
          return failure(new WalletError('Invalid current passphrase'));
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

        log.info('Wallet passphrase changed', {
          tenantId,
          userId,
          walletId: wallet.id
        });

        return success(undefined);
      } catch (error) {
        if (error instanceof WalletError) {
          return failure(error);
        }
        log.error('Failed to change passphrase', error as Error, { tenantId, userId });
        return failure({ code: 'WALLET_ERROR', message: (error as Error).message });
      }
    });
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
    return this.withTiming('deactivateWallet', async () => {
      if (!tenantId || tenantId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'tenantId is required' });
      }
      if (!userId || userId.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'userId is required' });
      }
      if (!passphrase) {
        return failure({ code: 'VALIDATION_ERROR', message: 'passphrase is required' });
      }
      if (!reason || reason.trim() === '') {
        return failure({ code: 'VALIDATION_ERROR', message: 'reason is required' });
      }

      try {
        const wallet = await this.walletRepo.findByUser(tenantId, userId);
        if (!wallet) {
          return failure({ code: 'NOT_FOUND', message: `Wallet not found for user: ${userId}` });
        }

        // Verify passphrase
        const primaryKey = wallet.keyPairs.find(k => k.isPrimary);
        if (!primaryKey || !(await this.verifyPassphrase(primaryKey, passphrase))) {
          return failure(new WalletError('Invalid passphrase'));
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

        log.info('Wallet deactivated', {
          tenantId,
          userId,
          walletId: wallet.id,
          reason
        });

        return success(undefined);
      } catch (error) {
        if (error instanceof WalletError) {
          return failure(error);
        }
        log.error('Failed to deactivate wallet', error as Error, { tenantId, userId });
        return failure({ code: 'WALLET_ERROR', message: (error as Error).message });
      }
    });
  }
}

// ============================================================================
// SINGLETON PATTERN
// ============================================================================

let instance: DigitalWalletService | null = null;

export function initializeDigitalWalletService(deps?: any): DigitalWalletService {
  if (!instance) {
    instance = new DigitalWalletService(deps);
    log.info('DigitalWalletService initialized');
  }
  return instance;
}

export function getDigitalWalletService(): DigitalWalletService {
  if (!instance) {
    throw new Error('DigitalWalletService not initialized. Call initializeDigitalWalletService() first.');
  }
  return instance;
}

// ============================================================================
// MODULE EXPORTS
// ============================================================================

export const WALLET_SERVICE_VERSION = '1.0.0';
