'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  User,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Shield,
  Loader2,
  Camera,
  FileText,
  Smartphone,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  Info,
} from 'lucide-react';
import {
  verificationApi,
  type IdentityVerification,
  type StartKYCResponse,
} from '@/lib/verification-api';

type PageState = 'loading' | 'not_started' | 'in_progress' | 'verified' | 'failed' | 'expired';

export default function KYCVerificationPage() {
  const [pageState, setPageState] = useState<PageState>('loading');
  const [verification, setVerification] = useState<IdentityVerification | null>(null);
  const [sessionData, setSessionData] = useState<StartKYCResponse | null>(null);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVerification() {
      try {
        const { verification: v, canStartNew } = await verificationApi.kyc.getUserStatus();
        setVerification(v);

        if (!v) {
          setPageState('not_started');
        } else if (v.status === 'verified') {
          setPageState('verified');
        } else if (v.status === 'failed') {
          setPageState('failed');
        } else if (v.status === 'expired') {
          setPageState('expired');
        } else {
          setPageState('in_progress');
        }
      } catch (err) {
        console.error('Failed to load verification status:', err);
        setError('Failed to load verification status');
        setPageState('not_started');
      }
    }
    loadVerification();
  }, []);

  const handleStartVerification = async () => {
    setStarting(true);
    setError(null);

    try {
      const session = await verificationApi.kyc.start({
        verificationType: 'document_and_selfie',
        returnUrl: window.location.href,
      });
      setSessionData(session);

      // In a real implementation, this would redirect to Stripe Identity
      // or open the verification flow in a modal/iframe
      if (session.verificationUrl) {
        window.open(session.verificationUrl, '_blank');
      }

      setPageState('in_progress');
    } catch (err) {
      console.error('Failed to start verification:', err);
      setError(err instanceof Error ? err.message : 'Failed to start verification');
    } finally {
      setStarting(false);
    }
  };

  const handleRefreshStatus = async () => {
    if (!sessionData?.verificationId && !verification?.providerSessionId) return;

    try {
      const v = await verificationApi.kyc.getStatus(
        sessionData?.verificationId || verification?.providerSessionId || ''
      );
      setVerification(v);

      if (v.status === 'verified') {
        setPageState('verified');
      } else if (v.status === 'failed') {
        setPageState('failed');
      }
    } catch (err) {
      console.error('Failed to refresh status:', err);
    }
  };

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/settings?tab=verification">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Identity Verification (KYC)</h1>
          <p className="text-muted-foreground">
            Verify your identity to access all platform features
          </p>
        </div>
      </div>

      {/* Verified State */}
      {pageState === 'verified' && verification && (
        <Card className="border-green-200 dark:border-green-900/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-green-500/10 p-3">
                  <CheckCircle2 className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <CardTitle>Identity Verified</CardTitle>
                  <CardDescription>
                    Your identity has been successfully verified
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Verified Name</p>
                <p className="font-medium">{verification.firstName} {verification.lastName}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Verified On</p>
                <p className="font-medium">
                  {verification.verifiedAt
                    ? new Date(verification.verifiedAt).toLocaleDateString()
                    : '-'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Document Type</p>
                <p className="font-medium capitalize">
                  {verification.documentType?.replace('_', ' ') || '-'}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Verification Expires</p>
                <p className="font-medium">
                  {verification.expiresAt
                    ? new Date(verification.expiresAt).toLocaleDateString()
                    : 'No expiry'}
                </p>
              </div>
            </div>

            {verification.expiresAt && new Date(verification.expiresAt) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) && (
              <div className="mt-4 p-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/30">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <p className="text-sm font-medium text-amber-700 dark:text-amber-400">
                    Verification expiring soon
                  </p>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400/80 mt-1">
                  Your verification will expire on {new Date(verification.expiresAt).toLocaleDateString()}.
                  Please re-verify to maintain access.
                </p>
                <Button variant="outline" className="mt-3" onClick={handleStartVerification}>
                  Re-verify Now
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Failed State */}
      {pageState === 'failed' && (
        <Card className="border-red-200 dark:border-red-900/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-red-500/10 p-3">
                  <XCircle className="h-6 w-6 text-red-600" />
                </div>
                <div>
                  <CardTitle>Verification Failed</CardTitle>
                  <CardDescription>
                    We were unable to verify your identity
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                <XCircle className="h-3 w-3 mr-1" />
                Failed
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30">
              <p className="text-sm font-medium text-red-700 dark:text-red-400">
                Reason: {verification?.failureMessage || 'Verification could not be completed'}
              </p>
              {verification?.failureCode && (
                <p className="text-sm text-red-600 dark:text-red-400/80 mt-1">
                  Error code: {verification.failureCode}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="font-medium">Common reasons for failure:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Document is expired or damaged</li>
                <li>• Photo is blurry or has glare</li>
                <li>• Selfie doesn&apos;t match document photo</li>
                <li>• Information doesn&apos;t match your account</li>
              </ul>
            </div>

            <Button onClick={handleStartVerification} disabled={starting}>
              {starting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Try Again
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* In Progress State */}
      {pageState === 'in_progress' && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-amber-500/10 p-3">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <CardTitle>Verification In Progress</CardTitle>
                  <CardDescription>
                    Your identity verification is being processed
                  </CardDescription>
                </div>
              </div>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Processing
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Verification Progress</span>
                <span className="text-muted-foreground">
                  {verification?.status === 'processing' ? 'Reviewing documents...' : 'Waiting for submission...'}
                </span>
              </div>
              <Progress value={verification?.status === 'processing' ? 66 : 33} />
            </div>

            {sessionData?.verificationUrl && (
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/30">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-400">
                      Complete your verification
                    </p>
                    <p className="text-sm text-blue-600 dark:text-blue-400/80 mt-1">
                      If the verification window closed, click below to continue.
                    </p>
                    <Button variant="outline" className="mt-3" asChild>
                      <a href={sessionData.verificationUrl} target="_blank" rel="noopener noreferrer">
                        Continue Verification
                        <ExternalLink className="h-4 w-4 ml-2" />
                      </a>
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Verification typically takes a few minutes
              </p>
              <Button variant="outline" onClick={handleRefreshStatus}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Check Status
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Not Started State */}
      {pageState === 'not_started' && (
        <>
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle>Verify Your Identity</CardTitle>
                  <CardDescription>
                    Complete identity verification to unlock all platform features
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-muted-foreground">
                Identity verification helps us keep the platform safe and ensures you are who you say you are.
                This process is quick, secure, and only needs to be done once.
              </p>

              {/* What you'll need */}
              <div className="space-y-3">
                <h4 className="font-medium">What you&apos;ll need:</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="rounded-lg bg-muted p-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Government ID</p>
                      <p className="text-xs text-muted-foreground">Passport, Driver&apos;s License, or ID Card</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <div className="rounded-lg bg-muted p-2">
                      <Camera className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">Camera Access</p>
                      <p className="text-xs text-muted-foreground">For selfie verification</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Process steps */}
              <div className="space-y-3">
                <h4 className="font-medium">How it works:</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      1
                    </div>
                    <p className="text-sm">Take a photo of your government-issued ID</p>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      2
                    </div>
                    <p className="text-sm">Take a selfie to confirm your identity</p>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                      3
                    </div>
                    <p className="text-sm">Wait a few moments for automated verification</p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/30">
                  <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
                </div>
              )}

              {/* Privacy notice */}
              <div className="p-4 rounded-lg border">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-primary mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Your privacy is protected</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Your documents are encrypted and securely processed. We only store the minimum
                      information required for verification and comply with all applicable privacy laws.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleStartVerification} disabled={starting} className="w-full">
                {starting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting Verification...
                  </>
                ) : (
                  <>
                    Start Verification
                    <ChevronRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>

          {/* Mobile app suggestion */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Smartphone className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Easier on mobile?</p>
                    <p className="text-sm text-muted-foreground">
                      Verification is often easier with a phone camera
                    </p>
                  </div>
                </div>
                <Button variant="outline" disabled>
                  Send Link to Phone
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Need Help?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <a
              href="https://support.scholarly.app/verification/kyc"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <FileText className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Verification Guide</p>
                <p className="text-sm text-muted-foreground">Tips for successful verification</p>
              </div>
              <ExternalLink className="h-4 w-4 ml-auto text-muted-foreground" />
            </a>
            <a
              href="mailto:support@scholarly.app"
              className="flex items-center gap-3 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
            >
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">Contact Support</p>
                <p className="text-sm text-muted-foreground">Get help with verification</p>
              </div>
              <ChevronRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
