/**
 * JWT Key Management
 *
 * Handles RS256 asymmetric key pairs for JWT signing and verification.
 * Supports key rotation via key IDs (kid).
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { log } from '../lib/logger';

export interface KeyPair {
  kid: string;
  publicKey: string;
  privateKey: string;
  algorithm: 'RS256';
  createdAt: Date;
  expiresAt?: Date;
}

// In-memory key store (in production, use a secure key vault)
const keyStore: Map<string, KeyPair> = new Map();
let currentKeyId: string | null = null;

/**
 * Generate a new RS256 key pair
 */
export function generateKeyPair(): KeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  const kid = crypto.randomUUID();
  const keyPair: KeyPair = {
    kid,
    publicKey,
    privateKey,
    algorithm: 'RS256',
    createdAt: new Date(),
  };

  return keyPair;
}

/**
 * Load keys from environment or generate new ones
 */
export async function initializeKeys(): Promise<void> {
  // Try to load from environment variables first
  const privateKeyPath = process.env.JWT_PRIVATE_KEY_PATH;
  const publicKeyPath = process.env.JWT_PUBLIC_KEY_PATH;

  if (privateKeyPath && publicKeyPath) {
    try {
      const privateKey = fs.readFileSync(privateKeyPath, 'utf-8');
      const publicKey = fs.readFileSync(publicKeyPath, 'utf-8');
      const kid = process.env.JWT_KEY_ID || 'default';

      const keyPair: KeyPair = {
        kid,
        publicKey,
        privateKey,
        algorithm: 'RS256',
        createdAt: new Date(),
      };

      keyStore.set(kid, keyPair);
      currentKeyId = kid;

      log.info('Loaded JWT keys from files', { kid });
      return;
    } catch (error) {
      log.error('Failed to load JWT keys from files', error as Error);
    }
  }

  // Try to load from environment variables directly
  const privateKeyEnv = process.env.JWT_PRIVATE_KEY;
  const publicKeyEnv = process.env.JWT_PUBLIC_KEY;

  if (privateKeyEnv && publicKeyEnv) {
    const kid = process.env.JWT_KEY_ID || 'default';
    const keyPair: KeyPair = {
      kid,
      // Replace escaped newlines with actual newlines
      publicKey: publicKeyEnv.replace(/\\n/g, '\n'),
      privateKey: privateKeyEnv.replace(/\\n/g, '\n'),
      algorithm: 'RS256',
      createdAt: new Date(),
    };

    keyStore.set(kid, keyPair);
    currentKeyId = kid;

    log.info('Loaded JWT keys from environment', { kid });
    return;
  }

  // Generate new keys for development
  if (process.env.NODE_ENV !== 'production') {
    log.warn('No JWT keys configured - generating ephemeral keys for development');
    const keyPair = generateKeyPair();
    keyStore.set(keyPair.kid, keyPair);
    currentKeyId = keyPair.kid;

    // Save to keys directory for persistence across restarts
    const keysDir = path.join(process.cwd(), '.keys');
    if (!fs.existsSync(keysDir)) {
      fs.mkdirSync(keysDir, { recursive: true });
    }

    fs.writeFileSync(path.join(keysDir, 'private.pem'), keyPair.privateKey);
    fs.writeFileSync(path.join(keysDir, 'public.pem'), keyPair.publicKey);
    fs.writeFileSync(path.join(keysDir, 'kid.txt'), keyPair.kid);

    log.info('Generated and saved development JWT keys', { kid: keyPair.kid, dir: keysDir });
    return;
  }

  throw new Error('JWT keys not configured for production');
}

/**
 * Get the current signing key
 */
export function getSigningKey(): KeyPair {
  if (!currentKeyId) {
    throw new Error('JWT keys not initialized');
  }

  const keyPair = keyStore.get(currentKeyId);
  if (!keyPair) {
    throw new Error('Current signing key not found');
  }

  return keyPair;
}

/**
 * Get a key by ID (for token verification)
 */
export function getKeyById(kid: string): KeyPair | undefined {
  return keyStore.get(kid);
}

/**
 * Get all public keys (for JWKS endpoint)
 */
export function getPublicKeys(): Array<{ kid: string; publicKey: string; algorithm: string }> {
  return Array.from(keyStore.values()).map((kp) => ({
    kid: kp.kid,
    publicKey: kp.publicKey,
    algorithm: kp.algorithm,
  }));
}

/**
 * Rotate to a new key (old key kept for verification)
 */
export function rotateKeys(): KeyPair {
  const newKeyPair = generateKeyPair();
  keyStore.set(newKeyPair.kid, newKeyPair);

  // Mark old key as expiring
  if (currentKeyId) {
    const oldKey = keyStore.get(currentKeyId);
    if (oldKey) {
      oldKey.expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    }
  }

  currentKeyId = newKeyPair.kid;
  log.info('JWT keys rotated', { newKid: newKeyPair.kid, oldKid: currentKeyId });

  return newKeyPair;
}

/**
 * Clean up expired keys
 */
export function cleanupExpiredKeys(): void {
  const now = new Date();
  for (const [kid, keyPair] of keyStore.entries()) {
    if (keyPair.expiresAt && keyPair.expiresAt < now && kid !== currentKeyId) {
      keyStore.delete(kid);
      log.info('Removed expired JWT key', { kid });
    }
  }
}

/**
 * Get JWKS (JSON Web Key Set) for public key distribution
 */
export function getJWKS(): { keys: any[] } {
  const keys = Array.from(keyStore.values()).map((keyPair) => {
    // Convert PEM to JWK format
    const publicKey = crypto.createPublicKey(keyPair.publicKey);
    const jwk = publicKey.export({ format: 'jwk' });

    return {
      ...jwk,
      kid: keyPair.kid,
      alg: keyPair.algorithm,
      use: 'sig',
    };
  });

  return { keys };
}
