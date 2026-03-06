'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, Loader2, Mail, Lock, AlertCircle, Sparkles, Shield, ArrowLeft } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { api } from '@/lib/api';

function getDashboardPath(user?: { role?: string; roles?: string[] } | null): string {
  const role = user?.role || user?.roles?.[0];
  switch (role) {
    case 'teacher':
    case 'educator':
      return '/teacher/dashboard';
    case 'parent':
    case 'guardian':
      return '/parent/dashboard';
    case 'admin':
    case 'platform_admin':
      return '/admin/dashboard';
    case 'tutor':
      return '/tutoring';
    default:
      return '/dashboard';
  }
}

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [twoFAUserId, setTwoFAUserId] = useState('');
  const [twoFACode, setTwoFACode] = useState('');
  const [useBackupCode, setUseBackupCode] = useState(false);

  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const result = await login(email, password);

      if (result.success) {
        const user = useAuthStore.getState().user;
        const dashboardPath = getDashboardPath(user);
        toast({ title: 'Welcome back!', description: 'You have successfully logged in.' });
        router.push(dashboardPath);
      } else if (result.requires2FA && result.userId) {
        setRequires2FA(true);
        setTwoFAUserId(result.userId);
      } else {
        setError(result.error || 'Invalid credentials');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handle2FAVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.auth.verify2FA(twoFAUserId, twoFACode, useBackupCode);

      if (response.success) {
        const { user, accessToken } = response.data;
        api.setAccessToken(accessToken);
        useAuthStore.setState({
          user,
          accessToken,
          isAuthenticated: true,
          isLoading: false,
        });

        const dashboardPath = getDashboardPath(user);
        toast({ title: 'Welcome back!', description: 'Two-factor authentication verified.' });
        router.push(dashboardPath);
      } else {
        setError(response.error || 'Invalid verification code');
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (requires2FA) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 gap-4">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 p-3">
                <Shield className="h-8 w-8 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
            <CardDescription>
              {useBackupCode
                ? 'Enter one of your backup codes'
                : 'Enter the 6-digit code from your authenticator app'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handle2FAVerify}>
            <CardContent className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="twoFACode">
                  {useBackupCode ? 'Backup Code' : 'Verification Code'}
                </Label>
                <Input
                  id="twoFACode"
                  type="text"
                  placeholder={useBackupCode ? 'Enter backup code' : '000000'}
                  value={twoFACode}
                  onChange={(e) => setTwoFACode(e.target.value.replace(useBackupCode ? /[^A-Za-z0-9]/g : /\D/g, '').slice(0, useBackupCode ? 8 : 6))}
                  className={useBackupCode ? 'font-mono text-center tracking-widest' : 'text-center text-2xl tracking-[0.5em] font-mono'}
                  maxLength={useBackupCode ? 8 : 6}
                  autoFocus
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  setUseBackupCode(!useBackupCode);
                  setTwoFACode('');
                  setError('');
                }}
                className="text-sm text-primary hover:underline"
              >
                {useBackupCode ? 'Use authenticator app instead' : 'Use a backup code instead'}
              </button>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading || twoFACode.length < (useBackupCode ? 8 : 6)}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify'
                )}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setRequires2FA(false);
                  setTwoFACode('');
                  setTwoFAUserId('');
                  setError('');
                  setUseBackupCode(false);
                }}
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to login
              </button>
            </CardFooter>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 gap-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome back</CardTitle>
          <CardDescription>
            Sign in to your Scholarly account to continue your learning journey
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftIcon={<Mail className="h-4 w-4" />}
                required
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="/forgot-password"
                  className="text-sm text-primary hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="h-4 w-4" />}
                required
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link href="/register" className="text-primary hover:underline">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>

      {/* Early Years Launch Pad */}
      <Link
        href="/early-years"
        className="w-full max-w-md group"
      >
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-purple-500 via-pink-500 to-orange-400 p-4 text-white shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
              <Sparkles className="h-7 w-7 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">Little Explorers</h3>
              <p className="text-sm text-white/80">Ages 3-7 — Tap here for picture login!</p>
            </div>
            <span className="text-3xl">🌟</span>
          </div>
        </div>
      </Link>
    </div>
  );
}
