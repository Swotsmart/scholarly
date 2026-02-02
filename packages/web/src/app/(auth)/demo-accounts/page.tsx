'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Shield,
  GraduationCap,
  BookOpen,
  Users,
  Baby,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Server,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

// Helper function to get role-based dashboard path
function getDashboardPath(role?: string): string {
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

const DEMO_PASSWORD = 'demo123';

const demoAccounts = [
  {
    role: 'Platform Admin',
    email: 'admin@scholarly.app',
    name: 'Admin User',
    icon: Shield,
    color: 'bg-red-500',
    description: 'Full platform access, user management, system settings',
    features: ['User Management', 'System Settings', 'Analytics Dashboard', 'All Features'],
  },
  {
    role: 'Teacher',
    email: 'teacher@scholarly.app',
    name: 'Dr. James Wilson',
    icon: GraduationCap,
    color: 'bg-blue-500',
    description: 'Design & Technology teacher with 15 years experience',
    features: ['Class Management', 'Grading', 'Lesson Planning', 'Student Progress', 'Assessment Builder'],
  },
  {
    role: 'Tutor',
    email: 'tutor@scholarly.app',
    name: 'Sarah Chen',
    icon: BookOpen,
    color: 'bg-purple-500',
    description: 'Professional mathematics tutor, Mandarin speaker',
    features: ['Session Management', 'Student Bookings', 'Earnings Dashboard', 'Availability Calendar'],
  },
  {
    role: 'Parent',
    email: 'parent@scholarly.app',
    name: 'David Smith',
    icon: Users,
    color: 'bg-green-500',
    description: 'Homeschool parent with one child enrolled',
    features: ['Child Progress', 'Tutor Booking', 'Payment History', 'Communication Portal'],
  },
  {
    role: 'Learner',
    email: 'learner@scholarly.app',
    name: 'Emma Smith',
    icon: Baby,
    color: 'bg-orange-500',
    description: 'Year 8 student, interested in design and French',
    features: ['Learning Dashboard', 'AI Buddy', 'Design Challenges', 'LinguaFlow', 'Portfolio'],
  },
];

const accessUrls = {
  web: {
    local: 'http://localhost:3000',
    description: 'Web Frontend (Next.js)',
  },
  api: {
    local: 'http://localhost:3002',
    description: 'API Server (Express)',
  },
};

export default function DemoCredentialsPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [copiedEmail, setCopiedEmail] = useState<string | null>(null);
  const [loggingIn, setLoggingIn] = useState<string | null>(null);

  const copyToClipboard = async (text: string, email: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedEmail(email);
    setTimeout(() => setCopiedEmail(null), 2000);
  };

  const handleQuickLogin = async (email: string) => {
    setLoggingIn(email);
    const result = await login(email, DEMO_PASSWORD);
    if (result.success) {
      // Get the user from the store after login to determine the correct dashboard
      const user = useAuthStore.getState().user;
      const dashboardPath = getDashboardPath(user?.role);
      router.push(dashboardPath);
    }
    setLoggingIn(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-12 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            Scholarly Demo Accounts
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore the platform with pre-configured demo accounts for each user role
          </p>
          <div className="flex items-center justify-center gap-2 text-sm">
            <Badge variant="secondary" className="text-base px-4 py-1">
              Password: <code className="font-mono ml-1">{DEMO_PASSWORD}</code>
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard(DEMO_PASSWORD, 'password')}
            >
              {copiedEmail === 'password' ? (
                <Check className="h-4 w-4 text-green-500" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Access URLs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Access URLs
            </CardTitle>
            <CardDescription>Local development endpoints</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                  <Globe className="h-5 w-5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{accessUrls.web.description}</p>
                  <code className="text-sm text-muted-foreground">{accessUrls.web.local}</code>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={accessUrls.web.local} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
              <div className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                  <Server className="h-5 w-5 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">{accessUrls.api.description}</p>
                  <code className="text-sm text-muted-foreground">{accessUrls.api.local}</code>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <a href={`${accessUrls.api.local}/api/v1`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Demo Accounts */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {demoAccounts.map((account) => {
            const Icon = account.icon;
            return (
              <Card key={account.email} className="relative overflow-hidden">
                <div className={`absolute top-0 left-0 right-0 h-1 ${account.color}`} />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${account.color}/10`}>
                      <Icon className={`h-6 w-6 ${account.color.replace('bg-', 'text-')}`} />
                    </div>
                    <Badge variant="outline">{account.role}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{account.name}</CardTitle>
                  <CardDescription>{account.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                      <code className="text-sm">{account.email}</code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => copyToClipboard(account.email, account.email)}
                      >
                        {copiedEmail === account.email ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {account.features.slice(0, 3).map((feature) => (
                      <Badge key={feature} variant="secondary" className="text-xs">
                        {feature}
                      </Badge>
                    ))}
                    {account.features.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{account.features.length - 3} more
                      </Badge>
                    )}
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => handleQuickLogin(account.email)}
                    disabled={loggingIn === account.email}
                  >
                    {loggingIn === account.email ? 'Logging in...' : `Login as ${account.role}`}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Additional Info */}
        <Card>
          <CardHeader>
            <CardTitle>Sample Data Included</CardTitle>
            <CardDescription>The demo database is pre-populated with sample content</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1">
                <p className="font-medium">Curriculum</p>
                <ul className="text-sm text-muted-foreground space-y-0.5">
                  <li>2 Subjects (Mathematics, Physics)</li>
                  <li>3 ACARA Curriculum Standards</li>
                  <li>1 Content Resource (Fractions)</li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Design Thinking</p>
                <ul className="text-sm text-muted-foreground space-y-0.5">
                  <li>2 Design Challenges</li>
                  <li>1 Active Design Journey</li>
                  <li>4 Design Artifacts</li>
                  <li>1 Published Portfolio</li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-medium">LinguaFlow</p>
                <ul className="text-sm text-muted-foreground space-y-0.5">
                  <li>French language profile (CEFR A2)</li>
                  <li>10 Vocabulary items with SRS data</li>
                  <li>1 Conversation roleplay session</li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Tutoring</p>
                <ul className="text-sm text-muted-foreground space-y-0.5">
                  <li>1 Verified tutor profile</li>
                  <li>Availability slots configured</li>
                  <li>Pricing tiers set up</li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Homeschool</p>
                <ul className="text-sm text-muted-foreground space-y-0.5">
                  <li>1 Registered family</li>
                  <li>Child profile linked</li>
                  <li>Address configured</li>
                </ul>
              </div>
              <div className="space-y-1">
                <p className="font-medium">Little Explorers (Early Years)</p>
                <ul className="text-sm text-muted-foreground space-y-0.5">
                  <li>1 Child profile (Lily, age 5)</li>
                  <li>Picture password configured</li>
                  <li>Phonics Phase 2 progress</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>
            Need help?{' '}
            <Link href="/login" className="text-primary hover:underline">
              Go to Login Page
            </Link>
            {' '}or{' '}
            <Link href="/" className="text-primary hover:underline">
              Return to Home
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
