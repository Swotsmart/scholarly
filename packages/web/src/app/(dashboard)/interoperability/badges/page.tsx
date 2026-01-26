'use client';

/**
 * Open Badges 3.0 & CLR Management
 * Issue, verify, and manage badges and Comprehensive Learner Records
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Award,
  ArrowLeft,
  Plus,
  CheckCircle2,
  XCircle,
  Shield,
  Link2,
  Edit,
  Archive,
  User,
  Clock,
  FileCheck,
  Layers,
  Sparkles,
  BookOpen,
  Brain,
  Globe,
  Palette,
  FlaskConical,
  Search,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import type { BadgeDefinition, BadgeAssertion } from '@/types/interoperability';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockBadgeDefinitions: BadgeDefinition[] = [
  {
    id: 'badge-1',
    name: 'Critical Thinker',
    description: 'Demonstrated excellence in critical analysis and evaluation across multiple assessments',
    criteria: 'Score 85%+ on 3 consecutive critical thinking assessments',
    image: 'blue',
    category: 'Academic',
    issuedCount: 78,
    status: 'active',
  },
  {
    id: 'badge-2',
    name: 'STEM Innovator',
    description: 'Completed an original STEM project with measurable community impact',
    criteria: 'Submit and present an original STEM project judged by panel',
    image: 'green',
    category: 'STEM',
    issuedCount: 34,
    status: 'active',
  },
  {
    id: 'badge-3',
    name: 'Digital Literacy',
    description: 'Mastered digital tools and responsible online practices',
    criteria: 'Complete all 5 digital literacy modules with 80%+ score',
    image: 'purple',
    category: 'Technology',
    issuedCount: 112,
    status: 'active',
  },
  {
    id: 'badge-4',
    name: 'Global Citizen',
    description: 'Engaged in cross-cultural learning and community service projects',
    criteria: 'Complete 20 hours of community service and cultural exchange program',
    image: 'amber',
    category: 'Service',
    issuedCount: 45,
    status: 'active',
  },
  {
    id: 'badge-5',
    name: 'Creative Writer',
    description: 'Published original creative writing showcasing narrative and poetic skills',
    criteria: 'Submit 3 approved creative works to the school publication',
    image: 'pink',
    category: 'Arts',
    issuedCount: 29,
    status: 'active',
  },
  {
    id: 'badge-6',
    name: 'Research Scholar',
    description: 'Conducted independent research with proper methodology and citations',
    criteria: 'Complete a research paper graded A or above with proper citations',
    image: 'indigo',
    category: 'Academic',
    issuedCount: 14,
    status: 'draft',
  },
];

const mockAssertions: BadgeAssertion[] = [
  {
    id: 'ba-1',
    badgeId: 'badge-1',
    badgeName: 'Critical Thinker',
    recipientName: 'Emma Wilson',
    issuedAt: '2026-01-20T10:00:00Z',
    verified: true,
    onChain: true,
  },
  {
    id: 'ba-2',
    badgeId: 'badge-3',
    badgeName: 'Digital Literacy',
    recipientName: 'Liam Chen',
    issuedAt: '2026-01-19T14:30:00Z',
    verified: true,
    onChain: false,
  },
  {
    id: 'ba-3',
    badgeId: 'badge-2',
    badgeName: 'STEM Innovator',
    recipientName: 'Aria Patel',
    issuedAt: '2026-01-18T09:15:00Z',
    verified: true,
    onChain: true,
  },
  {
    id: 'ba-4',
    badgeId: 'badge-4',
    badgeName: 'Global Citizen',
    recipientName: 'Noah Kim',
    issuedAt: '2026-01-17T16:00:00Z',
    verified: true,
    onChain: false,
  },
  {
    id: 'ba-5',
    badgeId: 'badge-1',
    badgeName: 'Critical Thinker',
    recipientName: 'Sophie Tremblay',
    issuedAt: '2026-01-16T11:45:00Z',
    verified: false,
    onChain: false,
  },
  {
    id: 'ba-6',
    badgeId: 'badge-5',
    badgeName: 'Creative Writer',
    recipientName: 'James Okafor',
    issuedAt: '2026-01-15T13:20:00Z',
    verified: true,
    onChain: true,
  },
];

const mockCLRs = [
  {
    id: 'clr-1',
    learnerName: 'Emma Wilson',
    badgeCount: 5,
    assembledAt: '2026-01-22T09:00:00Z',
    status: 'published',
  },
  {
    id: 'clr-2',
    learnerName: 'Liam Chen',
    badgeCount: 3,
    assembledAt: '2026-01-21T15:30:00Z',
    status: 'published',
  },
  {
    id: 'clr-3',
    learnerName: 'Aria Patel',
    badgeCount: 4,
    assembledAt: '2026-01-20T11:00:00Z',
    status: 'draft',
  },
];

const stats = [
  { label: 'Definitions', value: '45', icon: Award, color: 'amber' },
  { label: 'Issued', value: '312', icon: FileCheck, color: 'green' },
  { label: 'Verified', value: '298', icon: Shield, color: 'blue' },
  { label: 'On-Chain', value: '24', icon: Link2, color: 'purple' },
];

const colorMap: Record<string, { bg: string; text: string }> = {
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
};

const badgeIconMap: Record<string, { icon: typeof Award; bgClass: string; iconClass: string }> = {
  blue: { icon: Brain, bgClass: 'bg-blue-500', iconClass: 'text-white' },
  green: { icon: FlaskConical, bgClass: 'bg-green-500', iconClass: 'text-white' },
  purple: { icon: Sparkles, bgClass: 'bg-purple-500', iconClass: 'text-white' },
  amber: { icon: Globe, bgClass: 'bg-amber-500', iconClass: 'text-white' },
  pink: { icon: Palette, bgClass: 'bg-pink-500', iconClass: 'text-white' },
  indigo: { icon: BookOpen, bgClass: 'bg-indigo-500', iconClass: 'text-white' },
};

function getBadgeStatusBadge(status: string) {
  switch (status) {
    case 'active':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Active
        </Badge>
      );
    case 'draft':
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Draft
        </Badge>
      );
    case 'archived':
      return (
        <Badge variant="outline">
          <Archive className="h-3 w-3 mr-1" />
          Archived
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function BadgesPage() {
  const [activeTab, setActiveTab] = useState('definitions');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/interoperability">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="heading-2">Open Badges & CLR</h1>
          <p className="text-muted-foreground">
            Issue, verify, and manage Open Badges 3.0 and Comprehensive Learner Records
          </p>
        </div>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Create Badge Definition
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colors = colorMap[stat.color];
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg ${colors.bg} p-3`}>
                  <Icon className={`h-6 w-6 ${colors.text}`} />
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="definitions">Badge Definitions</TabsTrigger>
          <TabsTrigger value="issued">Issued Badges</TabsTrigger>
          <TabsTrigger value="clr">CLR</TabsTrigger>
        </TabsList>

        {/* Badge Definitions Tab */}
        <TabsContent value="definitions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockBadgeDefinitions.map((badge) => {
              const badgeStyle = badgeIconMap[badge.image] ?? badgeIconMap['blue'];
              const BadgeIcon = badgeStyle.icon;
              return (
                <Card key={badge.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <div
                        className={`rounded-full ${badgeStyle.bgClass} p-4 flex items-center justify-center flex-shrink-0`}
                      >
                        <BadgeIcon className={`h-6 w-6 ${badgeStyle.iconClass}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h3 className="font-semibold truncate">{badge.name}</h3>
                          {getBadgeStatusBadge(badge.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {badge.description}
                        </p>
                        <div className="flex items-center gap-2 mt-3">
                          <Badge variant="outline">{badge.category}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {badge.issuedCount} issued
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-3">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Archive className="h-4 w-4 mr-1" />
                            Archive
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* Issued Badges Tab */}
        <TabsContent value="issued" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Badge</th>
                      <th className="px-4 py-3 text-left font-medium">Recipient</th>
                      <th className="px-4 py-3 text-left font-medium">Issued Date</th>
                      <th className="px-4 py-3 text-left font-medium">Verified</th>
                      <th className="px-4 py-3 text-left font-medium">On-Chain</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {mockAssertions.map((assertion) => (
                      <tr key={assertion.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-amber-500" />
                            <span className="font-medium">{assertion.badgeName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {assertion.recipientName}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(assertion.issuedAt).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          {assertion.verified ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Verified
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />
                              Unverified
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {assertion.onChain ? (
                            <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                              <Link2 className="h-3 w-3 mr-1" />
                              On-Chain
                            </Badge>
                          ) : (
                            <Badge variant="outline">Off-Chain</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CLR Tab */}
        <TabsContent value="clr" className="space-y-6">
          {/* Assemble CLR Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Assemble CLR
              </CardTitle>
              <CardDescription>
                Create a Comprehensive Learner Record by selecting a learner and their achievements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-end gap-4">
                <div className="flex-1">
                  <label className="text-sm font-medium mb-2 block">Select Learner</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search learner by name or ID..." className="pl-10" />
                  </div>
                </div>
                <Button>
                  <Layers className="h-4 w-4 mr-2" />
                  Assemble CLR
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Assembled CLRs */}
          <Card>
            <CardHeader>
              <CardTitle>Assembled CLRs</CardTitle>
              <CardDescription>Previously assembled Comprehensive Learner Records</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Learner</th>
                      <th className="px-4 py-3 text-left font-medium">Badges Included</th>
                      <th className="px-4 py-3 text-left font-medium">Assembled Date</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {mockCLRs.map((clr) => (
                      <tr key={clr.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{clr.learnerName}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">
                            {clr.badgeCount} badges
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(clr.assembledAt).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3">
                          {clr.status === 'published' ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Published
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <Clock className="h-3 w-3 mr-1" />
                              Draft
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm">
                              View
                            </Button>
                            <Button variant="ghost" size="sm">
                              Export
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
