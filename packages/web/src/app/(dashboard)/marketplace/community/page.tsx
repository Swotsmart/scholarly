'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  ArrowLeft,
  Coins,
  Users,
  Calendar,
  Target,
  Plus,
  ThumbsUp,
  Clock,
  CheckCircle2,
  Code,
  Zap,
  TrendingUp,
  Lightbulb,
  Award,
} from 'lucide-react';

interface FeatureRequest {
  id: string;
  title: string;
  requester: string;
  requesterRole: string;
  description: string;
  currentFunding: number;
  goalFunding: number;
  pledgeCount: number;
  deadline: string;
  category: string;
  status: 'active' | 'funded' | 'in_development';
  upvotes: number;
}

interface Bounty {
  id: string;
  title: string;
  sponsor: string;
  sponsorType: string;
  description: string;
  amount: number;
  requiredSkills: string[];
  deadline: string;
  claimCount: number;
  claimed: boolean;
  milestones: { name: string; reward: number; completed: boolean }[];
  status: 'open' | 'claimed' | 'completed';
}

const FEATURE_REQUESTS: FeatureRequest[] = [
  {
    id: 'fr-1',
    title: 'Real-time Collaboration Whiteboard',
    requester: 'Emily Watson',
    requesterRole: 'Year 6 Teacher, Canberra Grammar',
    description: 'A shared digital whiteboard where students and teachers can collaborate in real-time during lessons. Should support drawing, text, images, and sticky notes with infinite canvas. Essential for hybrid classrooms and group brainstorming activities.',
    currentFunding: 3200,
    goalFunding: 5000,
    pledgeCount: 47,
    deadline: '28 Feb 2026',
    category: 'Classroom Management',
    status: 'active',
    upvotes: 156,
  },
  {
    id: 'fr-2',
    title: 'Parent-Teacher Conference Scheduler',
    requester: 'Michael Torres',
    requesterRole: 'Deputy Principal, Adelaide Hills PS',
    description: 'An intelligent scheduling tool that coordinates parent-teacher conferences with availability matching, automatic reminders, video conferencing integration, and multilingual support for diverse communities.',
    currentFunding: 4800,
    goalFunding: 4800,
    pledgeCount: 62,
    deadline: '15 Mar 2026',
    category: 'Management',
    status: 'funded',
    upvotes: 203,
  },
  {
    id: 'fr-3',
    title: 'Indigenous Language Dictionary',
    requester: 'Aunty Rose Campbell',
    requesterRole: 'Cultural Advisor, NT Education',
    description: 'A comprehensive digital dictionary supporting Australian Indigenous languages including Pitjantjatjara, Yolngu Matha, Warlpiri, and Kriol. Features audio pronunciations by Elders, cultural context notes, and curriculum integration for language revitalisation programs.',
    currentFunding: 7500,
    goalFunding: 12000,
    pledgeCount: 134,
    deadline: '30 Apr 2026',
    category: 'Language Learning',
    status: 'active',
    upvotes: 412,
  },
  {
    id: 'fr-4',
    title: 'Special Needs Adaptive Testing',
    requester: 'Dr. Lisa Pham',
    requesterRole: 'SENCO, Melbourne Metro Schools',
    description: 'An assessment tool that dynamically adapts to students with additional learning needs. Supports text-to-speech, simplified language, extended time, visual scaffolding, and alternative response modes. Generates ILP-aligned progress reports.',
    currentFunding: 2100,
    goalFunding: 8000,
    pledgeCount: 38,
    deadline: '31 Mar 2026',
    category: 'Accessibility',
    status: 'active',
    upvotes: 289,
  },
  {
    id: 'fr-5',
    title: 'Offline Mode for Rural Schools',
    requester: 'Tom Bradley',
    requesterRole: 'Principal, Outback Distance Ed',
    description: 'Full offline functionality for Scholarly platform features including content delivery, assessment completion, progress tracking, and data sync when connectivity is restored. Critical for schools in remote and regional Australia with unreliable internet access.',
    currentFunding: 6000,
    goalFunding: 6000,
    pledgeCount: 89,
    deadline: '28 Feb 2026',
    category: 'Infrastructure',
    status: 'funded',
    upvotes: 367,
  },
];

const BOUNTIES: Bounty[] = [
  {
    id: 'b-1',
    title: 'SCORM 2004 Content Import Plugin',
    sponsor: 'NSW Department of Education',
    sponsorType: 'Government',
    description: 'Build a plugin that imports SCORM 2004 compliant learning packages into the Scholarly content library. Must support all SCORM data model elements, sequencing rules, and generate progress tracking events compatible with the Scholarly analytics pipeline.',
    amount: 15000,
    requiredSkills: ['TypeScript', 'SCORM 2004', 'React', 'Node.js'],
    deadline: '15 Mar 2026',
    claimCount: 4,
    claimed: true,
    milestones: [
      { name: 'SCORM parser and manifest reader', reward: 4000, completed: true },
      { name: 'Content rendering engine', reward: 5000, completed: true },
      { name: 'Progress tracking integration', reward: 3000, completed: false },
      { name: 'Testing and documentation', reward: 3000, completed: false },
    ],
    status: 'claimed',
  },
  {
    id: 'b-2',
    title: 'Auslan Sign Language Recognition Module',
    sponsor: 'Deaf Australia Foundation',
    sponsorType: 'Non-profit',
    description: 'Develop a computer vision module that recognises Australian Sign Language (Auslan) gestures via webcam. The module should support fingerspelling, common signs, and integrate with the Scholarly accessibility toolkit to provide real-time sign language feedback.',
    amount: 25000,
    requiredSkills: ['Python', 'TensorFlow', 'Computer Vision', 'WebRTC', 'TypeScript'],
    deadline: '30 Apr 2026',
    claimCount: 2,
    claimed: false,
    milestones: [
      { name: 'Auslan gesture dataset curation', reward: 5000, completed: false },
      { name: 'ML model training and validation', reward: 8000, completed: false },
      { name: 'WebRTC integration and browser SDK', reward: 7000, completed: false },
      { name: 'Scholarly platform integration', reward: 5000, completed: false },
    ],
    status: 'open',
  },
  {
    id: 'b-3',
    title: 'Aboriginal Astronomy Interactive Sky Map',
    sponsor: 'CSIRO Education',
    sponsorType: 'Research',
    description: 'Create an interactive sky map that overlays Aboriginal astronomical knowledge onto a real-time star chart. Include Dreamtime stories associated with constellations, seasonal calendars, and navigation knowledge from multiple Aboriginal nations.',
    amount: 18000,
    requiredSkills: ['Three.js', 'WebGL', 'TypeScript', 'React', 'GIS'],
    deadline: '31 May 2026',
    claimCount: 1,
    claimed: false,
    milestones: [
      { name: 'Star chart rendering engine', reward: 5000, completed: false },
      { name: 'Aboriginal knowledge overlay system', reward: 6000, completed: false },
      { name: 'Interactive storytelling features', reward: 4000, completed: false },
      { name: 'Curriculum integration and testing', reward: 3000, completed: false },
    ],
    status: 'open',
  },
];

const COMMUNITY_STATS = [
  { label: 'Active Requests', value: '89', icon: Lightbulb, color: 'purple' },
  { label: 'Total Pledged', value: '142,800 EDU', icon: Coins, color: 'amber' },
  { label: 'Active Bounties', value: '23', icon: Target, color: 'blue' },
  { label: 'Completed Apps', value: '34', icon: Award, color: 'green' },
];

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('requests');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/marketplace">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <h1 className="heading-2">Community Requests &amp; Bounties</h1>
          </div>
          <p className="text-muted-foreground ml-10">
            Shape the future of educational technology through community-driven development
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Request
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {COMMUNITY_STATS.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-500`} />
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
          <TabsTrigger value="requests">Feature Requests</TabsTrigger>
          <TabsTrigger value="bounties">Active Bounties</TabsTrigger>
        </TabsList>

        {/* Feature Requests */}
        <TabsContent value="requests" className="space-y-4">
          {FEATURE_REQUESTS.map((request) => {
            const fundingPercentage = Math.round(
              (request.currentFunding / request.goalFunding) * 100
            );
            return (
              <Card key={request.id}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{request.title}</h3>
                        {request.status === 'funded' && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Funded
                          </Badge>
                        )}
                        {request.status === 'in_development' && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            In Development
                          </Badge>
                        )}
                        {request.status === 'active' && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            Accepting Pledges
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Requested by <span className="font-medium">{request.requester}</span> &middot; {request.requesterRole}
                      </p>
                    </div>
                    <Badge variant="outline">{request.category}</Badge>
                  </div>

                  <p className="text-sm text-muted-foreground">{request.description}</p>

                  {/* Funding Progress */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">
                        {request.currentFunding.toLocaleString()} / {request.goalFunding.toLocaleString()} EDU
                      </span>
                      <span className="text-muted-foreground">{fundingPercentage}% funded</span>
                    </div>
                    <Progress
                      value={fundingPercentage}
                      className="h-2"
                      indicatorClassName={fundingPercentage >= 100 ? 'bg-green-500' : undefined}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {request.pledgeCount} pledges
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="h-4 w-4" />
                        {request.upvotes} upvotes
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {request.deadline}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      variant={request.status === 'funded' ? 'outline' : 'default'}
                      disabled={request.status === 'funded'}
                    >
                      <Coins className="mr-2 h-4 w-4" />
                      {request.status === 'funded' ? 'Fully Funded' : 'Pledge'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        {/* Bounties */}
        <TabsContent value="bounties" className="space-y-4">
          {BOUNTIES.map((bounty) => {
            const completedMilestones = bounty.milestones.filter((m) => m.completed).length;
            const milestoneProgress = Math.round(
              (completedMilestones / bounty.milestones.length) * 100
            );
            return (
              <Card key={bounty.id}>
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{bounty.title}</h3>
                        {bounty.status === 'open' && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Open
                          </Badge>
                        )}
                        {bounty.status === 'claimed' && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                            In Progress
                          </Badge>
                        )}
                        {bounty.status === 'completed' && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            Completed
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Sponsored by <span className="font-medium">{bounty.sponsor}</span> &middot; {bounty.sponsorType}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-primary">{bounty.amount.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground">EDU tokens</p>
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground">{bounty.description}</p>

                  {/* Required Skills */}
                  <div className="flex flex-wrap gap-2">
                    {bounty.requiredSkills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        <Code className="mr-1 h-3 w-3" />
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  {/* Milestones */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">Milestone Progress</span>
                      <span className="text-muted-foreground">
                        {completedMilestones}/{bounty.milestones.length} completed
                      </span>
                    </div>
                    <Progress value={milestoneProgress} className="h-2" />
                    <div className="space-y-2">
                      {bounty.milestones.map((milestone, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-2">
                            {milestone.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                            )}
                            <span className={`text-sm ${milestone.completed ? 'line-through text-muted-foreground' : ''}`}>
                              {milestone.name}
                            </span>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {milestone.reward.toLocaleString()} EDU
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {bounty.claimCount} {bounty.claimCount === 1 ? 'claim' : 'claims'}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Due {bounty.deadline}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      disabled={bounty.status === 'claimed'}
                    >
                      <Zap className="mr-2 h-4 w-4" />
                      {bounty.status === 'claimed' ? 'Already Claimed' : 'Claim Bounty'}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
