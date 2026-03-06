'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
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
  Lightbulb,
  Award,
  Loader2,
} from 'lucide-react';
import { useCommunityRequests } from '@/hooks/use-marketplace';
import { marketplaceTelemetry } from '@/lib/marketplace-telemetry';

const COMMUNITY_STATS_CONFIG = [
  { label: 'Active Requests', icon: Lightbulb, color: 'purple' },
  { label: 'Total Pledged', icon: Coins, color: 'amber' },
  { label: 'Active Bounties', icon: Target, color: 'blue' },
  { label: 'Completed Apps', icon: Award, color: 'green' },
];

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState('requests');
  const { requests, bounties, isLoading, pledge, claimBounty } = useCommunityRequests();
  const [pledging, setPledging] = useState<string | null>(null);
  const [claiming, setClaiming] = useState<string | null>(null);

  // Track tab navigation
  const handleTabChange = useCallback((tab: string) => {
    marketplaceTelemetry.trackCommunityView(tab);
    setActiveTab(tab);
  }, []);

  const handlePledge = useCallback(async (requestId: string) => {
    setPledging(requestId);
    try {
      await pledge(requestId, 100); // Default pledge amount
    } finally {
      setPledging(null);
    }
  }, [pledge]);

  const handleClaimBounty = useCallback(async (bountyId: string) => {
    setClaiming(bountyId);
    try {
      await claimBounty(bountyId, 'I would like to claim this bounty.');
    } finally {
      setClaiming(null);
    }
  }, [claimBounty]);

  // Derive stats from data
  const activeRequests = requests.filter(r => r.status === 'active').length;
  const totalPledged = requests.reduce((sum, r) => sum + r.currentFunding, 0);
  const activeBounties = bounties.filter(b => b.status === 'open').length;
  const completedBounties = bounties.filter(b => b.status === 'completed').length;
  const statsValues = [
    String(activeRequests),
    `${totalPledged.toLocaleString()} EDU`,
    String(activeBounties),
    String(completedBounties),
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

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
        {COMMUNITY_STATS_CONFIG.map((stat, idx) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-500`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{statsValues[idx]}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="requests">Feature Requests</TabsTrigger>
          <TabsTrigger value="bounties">Active Bounties</TabsTrigger>
        </TabsList>

        {/* Feature Requests */}
        <TabsContent value="requests" className="space-y-4">
          {requests.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Lightbulb className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium">No feature requests yet</p>
                <p className="text-sm text-muted-foreground">Be the first to submit a request.</p>
              </CardContent>
            </Card>
          )}
          {requests.map((request) => {
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
                    <Progress value={fundingPercentage} className="h-2" />
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
                      disabled={request.status === 'funded' || pledging === request.id}
                      onClick={() => handlePledge(request.id)}
                    >
                      {pledging === request.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Coins className="mr-2 h-4 w-4" />
                      )}
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
          {bounties.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-12">
                <Target className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-lg font-medium">No bounties available</p>
                <p className="text-sm text-muted-foreground">Check back later for new opportunities.</p>
              </CardContent>
            </Card>
          )}
          {bounties.map((bounty) => {
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
                      disabled={bounty.status === 'claimed' || claiming === bounty.id}
                      onClick={() => handleClaimBounty(bounty.id)}
                    >
                      {claiming === bounty.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Zap className="mr-2 h-4 w-4" />
                      )}
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
