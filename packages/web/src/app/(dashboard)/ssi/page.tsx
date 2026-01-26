'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Fingerprint,
  ShieldCheck,
  Wallet,
  FileKey2,
  Presentation,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  RefreshCw,
  KeyRound,
  Send,
  Eye,
  XCircle,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const stats = [
  { label: 'Total DIDs', value: '6', icon: Fingerprint, bgClass: 'bg-blue-500/10', iconClass: 'text-blue-500' },
  { label: 'Active Credentials', value: '14', icon: FileKey2, bgClass: 'bg-emerald-500/10', iconClass: 'text-emerald-500' },
  { label: 'Presentations Created', value: '9', icon: Presentation, bgClass: 'bg-violet-500/10', iconClass: 'text-violet-500' },
  { label: 'Verification Success Rate', value: '97.3%', icon: ShieldCheck, bgClass: 'bg-amber-500/10', iconClass: 'text-amber-500' },
];

const featureCards = [
  {
    title: 'Digital Wallet',
    description: 'Manage your decentralised identifiers, keys, and wallet backup',
    href: '/ssi/wallet',
    icon: Wallet,
    bgClass: 'bg-blue-500/10',
    iconClass: 'text-blue-500',
    stats: [
      { label: 'DIDs', value: '6' },
      { label: 'Key Pairs', value: '8' },
    ],
    status: 'Unlocked',
    statusClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    title: 'Verifiable Credentials',
    description: 'Issue, hold, and verify W3C Verifiable Credentials for academic records',
    href: '/ssi/credentials',
    icon: FileKey2,
    bgClass: 'bg-emerald-500/10',
    iconClass: 'text-emerald-500',
    stats: [
      { label: 'Held', value: '14' },
      { label: 'Issued', value: '23' },
    ],
    status: 'All Valid',
    statusClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  {
    title: 'Verifiable Presentations',
    description: 'Create and share selective-disclosure presentations with verifiers',
    href: '/ssi/presentations',
    icon: Presentation,
    bgClass: 'bg-violet-500/10',
    iconClass: 'text-violet-500',
    stats: [
      { label: 'Created', value: '9' },
      { label: 'Verified', value: '31' },
    ],
    status: 'Active',
    statusClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
];

const recentActivity = [
  {
    id: 'act-1',
    type: 'credential_issued',
    icon: Plus,
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    title: 'Academic Transcript credential issued',
    description: 'Issued by Melbourne Grammar School to Olivia Harper',
    timestamp: '25 Jan 2026, 2:14 PM',
  },
  {
    id: 'act-2',
    type: 'presentation_verified',
    icon: CheckCircle2,
    iconBg: 'bg-blue-500/10',
    iconColor: 'text-blue-500',
    title: 'Presentation verified successfully',
    description: 'Teaching Certificate presentation verified by AITSL',
    timestamp: '24 Jan 2026, 11:30 AM',
  },
  {
    id: 'act-3',
    type: 'key_rotated',
    icon: RefreshCw,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500',
    title: 'Key rotation completed',
    description: 'Ed25519 signing key rotated for did:web:scholarly.edu.au',
    timestamp: '23 Jan 2026, 9:45 AM',
  },
  {
    id: 'act-4',
    type: 'credential_received',
    icon: KeyRound,
    iconBg: 'bg-violet-500/10',
    iconColor: 'text-violet-500',
    title: 'New credential received',
    description: 'Working with Children Check credential from NSW Government',
    timestamp: '22 Jan 2026, 4:18 PM',
  },
  {
    id: 'act-5',
    type: 'presentation_shared',
    icon: Send,
    iconBg: 'bg-pink-500/10',
    iconColor: 'text-pink-500',
    title: 'Presentation shared',
    description: 'Course Completion bundle shared with University of Sydney admissions',
    timestamp: '21 Jan 2026, 10:05 AM',
  },
  {
    id: 'act-6',
    type: 'credential_expired',
    icon: AlertCircle,
    iconBg: 'bg-red-500/10',
    iconColor: 'text-red-500',
    title: 'Credential nearing expiry',
    description: 'First Aid Certificate expires on 15 Feb 2026 — renewal recommended',
    timestamp: '20 Jan 2026, 8:30 AM',
  },
];

const identityHealth = {
  score: 92,
  checks: [
    { label: 'All DIDs resolvable', passed: true },
    { label: 'Credentials up to date', passed: true },
    { label: 'Wallet backup current', passed: true },
    { label: 'Key rotation schedule', passed: false },
  ],
};

export default function SSIHubPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Self-Sovereign Identity</h1>
          <p className="text-muted-foreground">
            Manage your decentralised identity, verifiable credentials, and presentations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/ssi/wallet">
              <Wallet className="mr-2 h-4 w-4" />
              Open Wallet
            </Link>
          </Button>
          <Button asChild>
            <Link href="/ssi/credentials">
              <Plus className="mr-2 h-4 w-4" />
              Issue Credential
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg ${stat.bgClass} p-3`}>
                  <Icon className={`h-6 w-6 ${stat.iconClass}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Feature Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {featureCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link key={card.title} href={card.href}>
              <Card className="cursor-pointer transition-shadow hover:shadow-lg h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg ${card.bgClass} p-3`}>
                      <Icon className={`h-6 w-6 ${card.iconClass}`} />
                    </div>
                    <Badge className={card.statusClass}>{card.status}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{card.title}</CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      {card.stats.map((s) => (
                        <div key={s.label} className="text-center">
                          <p className="text-lg font-bold">{s.value}</p>
                          <p className="text-xs text-muted-foreground">{s.label}</p>
                        </div>
                      ))}
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Recent Activity Timeline */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Recent Activity</CardTitle>
                <CardDescription>Latest credential and identity events</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {recentActivity.map((activity, index) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex gap-4 py-3">
                    <div className="flex flex-col items-center">
                      <div className={`rounded-full ${activity.iconBg} p-2`}>
                        <Icon className={`h-4 w-4 ${activity.iconColor}`} />
                      </div>
                      {index < recentActivity.length - 1 && (
                        <div className="w-px flex-1 bg-border mt-2" />
                      )}
                    </div>
                    <div className="flex-1 pb-2">
                      <p className="text-sm font-medium">{activity.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{activity.description}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <Clock className="inline h-3 w-3 mr-1" />
                        {activity.timestamp}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Identity Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Identity Health</CardTitle>
            <CardDescription>Overall status of your digital identity</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <p className="text-4xl font-bold">{identityHealth.score}%</p>
              <p className="text-sm text-muted-foreground mt-1">Health Score</p>
              <Progress value={identityHealth.score} className="mt-3" />
            </div>
            <div className="space-y-3">
              {identityHealth.checks.map((check) => (
                <div key={check.label} className="flex items-center gap-3">
                  {check.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-amber-500 flex-shrink-0" />
                  )}
                  <span className="text-sm">{check.label}</span>
                  {!check.passed && (
                    <Badge className="ml-auto bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                      Action Needed
                    </Badge>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full" size="sm">
              Run Full Check
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
