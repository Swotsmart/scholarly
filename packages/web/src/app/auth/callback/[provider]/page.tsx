'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { exchangeOAuthCode, type OAuthProvider } from '@/lib/oauth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, XCircle, GraduationCap } from 'lucide-react';
import Link from 'next/link';

type CallbackState = 'processing' | 'success' | 'error';

export default function OAuthCallbackPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { setUser, setAccessToken } = useAuthStore();

  const [state, setState] = useState<CallbackState>('processing');
  const [error, setError] = useState<string | null>(null);

  const provider = params.provider as OAuthProvider;
  const code = searchParams.get('code');
  const oauthState = searchParams.get('state');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  useEffect(() => {
    async function handleCallback() {
      // Check for OAuth error
      if (errorParam) {
        setError(errorDescription || errorParam);
        setState('error');
        return;
      }

      // Validate required params
      if (!code || !oauthState) {
        setError('Missing authorization code or state');
        setState('error');
        return;
      }

      // Validate provider
      if (!['google', 'microsoft', 'apple'].includes(provider)) {
        setError('Invalid OAuth provider');
        setState('error');
        return;
      }

      try {
        const result = await exchangeOAuthCode(provider, code, oauthState);

        if (result.success && result.user && result.accessToken) {
          // Update auth store
          setUser(result.user);
          setAccessToken(result.accessToken);

          setState('success');

          // Redirect to dashboard after a brief delay
          setTimeout(() => {
            router.push('/dashboard');
          }, 1500);
        } else {
          setError(result.error || 'Authentication failed');
          setState('error');
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unexpected error occurred');
        setState('error');
      }
    }

    handleCallback();
  }, [code, oauthState, provider, errorParam, errorDescription, router, setUser, setAccessToken]);

  const getProviderName = () => {
    switch (provider) {
      case 'google':
        return 'Google';
      case 'microsoft':
        return 'Microsoft';
      case 'apple':
        return 'Apple';
      default:
        return 'OAuth';
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-primary/10 p-3">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">
            {state === 'processing' && `Signing in with ${getProviderName()}...`}
            {state === 'success' && 'Welcome to Scholarly!'}
            {state === 'error' && 'Sign-in Failed'}
          </CardTitle>
          <CardDescription>
            {state === 'processing' && 'Please wait while we complete your authentication'}
            {state === 'success' && 'Redirecting you to the dashboard...'}
            {state === 'error' && 'There was a problem signing you in'}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          {state === 'processing' && (
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
          )}

          {state === 'success' && (
            <div className="text-center">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-muted-foreground">
                Authentication successful! Taking you to your dashboard...
              </p>
            </div>
          )}

          {state === 'error' && (
            <div className="text-center space-y-4">
              <XCircle className="h-12 w-12 text-destructive mx-auto" />
              <p className="text-sm text-muted-foreground">
                {error || 'An unknown error occurred'}
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" asChild>
                  <Link href="/login">Back to Login</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Create Account</Link>
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
