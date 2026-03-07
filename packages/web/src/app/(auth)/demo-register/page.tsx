'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GraduationCap, Loader2, AlertCircle, User, Mail, Building2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

const ROLE_OPTIONS = [
  { value: 'learner', label: 'Learner / Student' },
  { value: 'teacher', label: 'Teacher / Educator' },
  { value: 'parent', label: 'Parent / Guardian' },
  { value: 'tutor', label: 'Tutor' },
  { value: 'admin', label: 'School Administrator' },
  { value: 'homeschool', label: 'Homeschool Educator' },
  { value: 'developer', label: 'Developer / Integrator' },
];

const REFERRAL_OPTIONS = [
  { value: 'search_engine', label: 'Search Engine' },
  { value: 'social_media', label: 'Social Media' },
  { value: 'colleague', label: 'Colleague / Friend' },
  { value: 'conference', label: 'Conference / Event' },
  { value: 'advertisement', label: 'Advertisement' },
  { value: 'other', label: 'Other' },
];

export default function DemoRegistrationPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [organization, setOrganization] = useState('');
  const [roleInterest, setRoleInterest] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [acceptedTos, setAcceptedTos] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const formStartTime = useRef<number | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleFirstInteraction = useCallback(() => {
    if (!formStartTime.current) {
      formStartTime.current = Date.now();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!acceptedTos) {
      setError('You must accept the Terms of Service to continue.');
      return;
    }

    setIsLoading(true);

    try {
      const formCompletionMs = formStartTime.current
        ? Date.now() - formStartTime.current
        : undefined;

      const metadata = {
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        browserLanguage: navigator.language,
        referrerUrl: document.referrer || undefined,
        utmSource: searchParams.get('utm_source') || undefined,
        utmMedium: searchParams.get('utm_medium') || undefined,
        utmCampaign: searchParams.get('utm_campaign') || undefined,
        formCompletionMs,
      };

      const response = await fetch(`${API_URL}/demo/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          organization: organization || undefined,
          roleInterest,
          referralSource: referralSource || undefined,
          ...metadata,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Registration failed');
      }

      const data = await response.json();

      // Store demo token and set auth state
      localStorage.setItem('demo_token', data.token);
      useAuthStore.setState({
        user: data.user,
        accessToken: data.token,
        isAuthenticated: true,
        isLoading: false,
      });

      toast({
        title: 'Welcome to Scholarly!',
        description: 'You now have 24-hour demo access to explore the platform.',
      });

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/5 via-background to-primary/10 p-4 gap-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Try Scholarly</CardTitle>
          <CardDescription>
            Explore the platform with a free demo account — no credit card required
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Jane Smith"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onFocus={handleFirstInteraction}
                leftIcon={<User className="h-4 w-4" />}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onFocus={handleFirstInteraction}
                leftIcon={<Mail className="h-4 w-4" />}
                required
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">
                Organization <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Input
                id="organization"
                type="text"
                placeholder="School or company name"
                value={organization}
                onChange={(e) => setOrganization(e.target.value)}
                onFocus={handleFirstInteraction}
                leftIcon={<Building2 className="h-4 w-4" />}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="roleInterest">I am a...</Label>
              <Select
                value={roleInterest}
                onValueChange={(value) => {
                  setRoleInterest(value);
                  handleFirstInteraction();
                }}
                required
                disabled={isLoading}
              >
                <SelectTrigger id="roleInterest">
                  <SelectValue placeholder="Select your role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="referralSource">
                How did you hear about us? <span className="text-muted-foreground">(optional)</span>
              </Label>
              <Select
                value={referralSource}
                onValueChange={(value) => {
                  setReferralSource(value);
                  handleFirstInteraction();
                }}
                disabled={isLoading}
              >
                <SelectTrigger id="referralSource">
                  <SelectValue placeholder="Select an option" />
                </SelectTrigger>
                <SelectContent>
                  {REFERRAL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="tos"
                checked={acceptedTos}
                onCheckedChange={(checked) => setAcceptedTos(checked === true)}
                disabled={isLoading}
              />
              <Label htmlFor="tos" className="text-sm leading-snug">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:underline">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="/privacy" className="text-primary hover:underline">
                  Privacy Policy
                </Link>
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || !roleInterest || !acceptedTos}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up your demo...
                </>
              ) : (
                'Start Demo'
              )}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
