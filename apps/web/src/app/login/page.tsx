'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GraduationCap, Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/hooks/use-toast';

const demoUsers = [
  { email: 'parent@scholarly.demo', role: 'Parent', description: 'Access learner profiles, book tutors' },
  { email: 'tutor@scholarly.demo', role: 'Tutor', description: 'Manage sessions, view earnings' },
  { email: 'admin@scholarly.demo', role: 'Admin', description: 'Full platform access' },
  { email: 'creator@scholarly.demo', role: 'Creator', description: 'Publish and sell content' },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState('');

  async function handleLogin(loginEmail: string) {
    try {
      await login(loginEmail);
      toast({
        title: 'Welcome back!',
        description: 'You have been logged in successfully.',
        variant: 'success',
      });
      router.push('/dashboard');
    } catch (error) {
      toast({
        title: 'Login failed',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (email) {
      handleLogin(email);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-scholarly-50 via-white to-scholarly-100 p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <GraduationCap className="h-10 w-10 text-scholarly-600" />
            <span className="text-2xl font-bold gradient-text">Scholarly</span>
          </Link>
          <h1 className="text-2xl font-bold">Welcome back</h1>
          <p className="text-muted-foreground mt-1">Sign in to continue learning</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
            <CardDescription>
              Enter your email to sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    className="pl-10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
              </div>
              <Button
                type="submit"
                className="w-full bg-scholarly-600 hover:bg-scholarly-700"
                disabled={isLoading || !email}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <div className="relative w-full">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">
                  Or try a demo account
                </span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 w-full">
              {demoUsers.map((user) => (
                <Button
                  key={user.email}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => handleLogin(user.email)}
                  disabled={isLoading}
                >
                  {user.role}
                </Button>
              ))}
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-4">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-scholarly-600 hover:underline">
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
