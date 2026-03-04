/**
 * useIdentity Hook
 *
 * Fetches identity and auth data for the current user:
 *   - Auth user (role, permissions)
 *   - Identity profile (KYC level, contacts, address)
 *   - KYC status and level requirements
 *   - Verifiable credentials
 *   - Trust score
 *
 * Usage:
 *   const { user, identity, kycStatus, trustScore, isLoading } = useIdentity();
 *   const isKYCComplete = kycStatus?.currentLevel >= 2;
 */

import { useState, useEffect, useCallback } from 'react';
import { identityApi } from '@/lib/identity-api';
import type {
  AuthUser,
  Identity,
  KYCStatus,
  KYCLevelInfo,
  VerifiableCredential,
  TrustScore,
} from '@/types/identity';

export interface IdentityState {
  user: AuthUser | null;
  identity: Identity | null;
  kycStatus: KYCStatus | null;
  kycLevels: KYCLevelInfo | null;
  credentials: VerifiableCredential[] | null;
  trustScore: TrustScore | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useIdentity(options?: {
  fetchCredentials?: boolean;
  fetchTrust?: boolean;
  fetchKYCLevels?: boolean;
}): IdentityState {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [kycLevels, setKycLevels] = useState<KYCLevelInfo | null>(null);
  const [credentials, setCredentials] = useState<VerifiableCredential[] | null>(null);
  const [trustScore, setTrustScore] = useState<TrustScore | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    fetchCredentials = true,
    fetchTrust = true,
    fetchKYCLevels = true,
  } = options ?? {};

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const fetches: Array<Promise<{ key: string; data: unknown }>> = [
        identityApi.getMe().then(d => ({ key: 'user', data: d })),
        identityApi.getMyIdentity().then(d => ({ key: 'identity', data: d })),
        identityApi.getKYCStatus().then(d => ({ key: 'kyc', data: d })),
      ];

      if (fetchKYCLevels) fetches.push(identityApi.getKYCLevels().then(d => ({ key: 'kycLevels', data: d })));
      if (fetchCredentials) fetches.push(identityApi.getCredentials().then(d => ({ key: 'creds', data: d })));
      if (fetchTrust) fetches.push(identityApi.getTrustScore().then(d => ({ key: 'trust', data: d })));

      const results = await Promise.allSettled(fetches);
      const errors: string[] = [];

      for (const result of results) {
        if (result.status === 'fulfilled') {
          const { key, data } = result.value;
          switch (key) {
            case 'user': setUser(data as AuthUser); break;
            case 'identity': setIdentity(data as Identity); break;
            case 'kyc': setKycStatus(data as KYCStatus); break;
            case 'kycLevels': setKycLevels(data as KYCLevelInfo); break;
            case 'creds': setCredentials(data as VerifiableCredential[]); break;
            case 'trust': setTrustScore(data as TrustScore); break;
          }
        } else {
          errors.push(String(result.reason));
        }
      }

      if (errors.length > 0) setError(errors.join('; '));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load identity data');
    } finally {
      setIsLoading(false);
    }
  }, [fetchCredentials, fetchTrust, fetchKYCLevels]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return { user, identity, kycStatus, kycLevels, credentials, trustScore, isLoading, error, refresh: fetchData };
}
