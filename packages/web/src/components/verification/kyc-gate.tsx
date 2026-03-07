'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Shield, ShieldCheck, ShieldAlert, Clock, ExternalLink, AlertTriangle } from 'lucide-react';
import { verificationApi, type KYCStatus } from '@/lib/verification-api';
import { isDemoSession } from '@/lib/demo';

interface KycGateProps {
  children: React.ReactNode;
  /** What feature requires KYC — shown in the gate message */
  feature: string;
  /** Optional: also require WWCC (for tutors, teachers working with children) */
  requireWwcc?: boolean;
  /** Optional: render a custom fallback instead of the default gate UI */
  fallback?: React.ReactNode;
}

const STATUS_CONFIG: Record<KYCStatus, { label: string; color: string; icon: typeof Shield }> = {
  pending: { label: 'Pending', color: 'text-amber-500', icon: Clock },
  processing: { label: 'Processing', color: 'text-blue-500', icon: Clock },
  requires_input: { label: 'Action Required', color: 'text-amber-500', icon: AlertTriangle },
  verified: { label: 'Verified', color: 'text-green-500', icon: ShieldCheck },
  failed: { label: 'Failed', color: 'text-red-500', icon: ShieldAlert },
  expired: { label: 'Expired', color: 'text-red-500', icon: ShieldAlert },
};

export function KycGate({ children, feature, requireWwcc = false, fallback }: KycGateProps) {
  const [loading, setLoading] = useState(true);
  const [kycStatus, setKycStatus] = useState<KYCStatus | null>(null);
  const [wwccValid, setWwccValid] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkVerification() {
      try {
        const { verification } = await verificationApi.kyc.getUserStatus();
        setKycStatus(verification?.status ?? null);

        if (requireWwcc) {
          const { hasValidWWCC } = await verificationApi.wwcc.checkValid();
          setWwccValid(hasValidWWCC);
        }
      } catch (err) {
        console.error('KycGate: Failed to check verification status:', err);
        setKycStatus(null);
      } finally {
        setLoading(false);
      }
    }
    checkVerification();
  }, [requireWwcc]);

  // Demo mode: always pass through
  if (isDemoSession()) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-72" />
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isKycVerified = kycStatus === 'verified';
  const isWwccOk = !requireWwcc || wwccValid === true;
  const isFullyVerified = isKycVerified && isWwccOk;

  if (isFullyVerified) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  const statusInfo = kycStatus ? STATUS_CONFIG[kycStatus] : null;
  const StatusIcon = statusInfo?.icon ?? Shield;

  return (
    <Card className="border-amber-200 dark:border-amber-800">
      <CardContent className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-amber-100 dark:bg-amber-900/30 p-3 shrink-0">
            <StatusIcon className="h-6 w-6 text-amber-600 dark:text-amber-400" />
          </div>
          <div className="flex-1 space-y-3">
            <div>
              <h3 className="font-semibold text-lg">Identity Verification Required</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {feature} requires identity verification to ensure platform safety and compliance.
              </p>
            </div>

            {kycStatus && kycStatus !== 'verified' && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">KYC Status:</span>
                <Badge variant="outline" className={statusInfo?.color}>
                  {statusInfo?.label}
                </Badge>
              </div>
            )}

            {!isKycVerified && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Identity (KYC):</span>
                <Badge variant="outline" className="text-amber-500">
                  {kycStatus ? statusInfo?.label : 'Not Started'}
                </Badge>
              </div>
            )}

            {requireWwcc && !wwccValid && (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Working With Children Check:</span>
                <Badge variant="outline" className="text-amber-500">
                  {wwccValid === false ? 'Not Verified' : 'Not Started'}
                </Badge>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              {!isKycVerified && (
                <Button asChild>
                  <Link href="/verification/kyc">
                    <Shield className="mr-2 h-4 w-4" />
                    {kycStatus === 'failed' || kycStatus === 'expired' ? 'Retry Verification' : 'Start Verification'}
                  </Link>
                </Button>
              )}
              {requireWwcc && !wwccValid && isKycVerified && (
                <Button asChild>
                  <Link href="/verification/wwcc">
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Submit WWCC
                  </Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
