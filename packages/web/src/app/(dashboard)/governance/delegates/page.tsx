'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Users,
  Vote,
  Shield,
  Search,
  UserCheck,
  UserMinus,
  TrendingUp,
  Award,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

const CURRENT_DELEGATION = {
  delegatedTo: 'Dr. Emily Watson',
  delegatedPower: 24500,
  delegateVotingPower: 312000,
  delegateSince: '15 Dec 2025',
  delegateParticipation: 96,
};

const YOUR_DELEGATE_PROFILE = {
  isDelegate: true,
  delegators: 18,
  receivedPower: 8200,
  ownPower: 24500,
  totalPower: 32700,
  proposalsVoted: 21,
  participation: 91,
  statement: 'I advocate for equitable access to quality education technology across rural and metropolitan Australia. My priorities include culturally inclusive curriculum development and transparent governance of community funds.',
};

const DELEGATES = [
  {
    id: 'del-001',
    name: 'Dr. Emily Watson',
    role: 'Education Policy Researcher',
    votingPower: 312000,
    proposalsVoted: 28,
    participation: 96,
    delegators: 47,
    statement: 'Committed to evidence-based education policy and equitable resource distribution. I prioritise proposals that strengthen ACARA alignment and support teachers in underserved communities across Australia.',
    avatar: 'EW',
  },
  {
    id: 'del-002',
    name: 'Prof. Sarah Chen',
    role: 'Curriculum Design Lead',
    votingPower: 287000,
    proposalsVoted: 25,
    participation: 92,
    delegators: 39,
    statement: 'My focus is on building culturally responsive curricula that honour Indigenous knowledge systems. I believe governance decisions should centre student outcomes and community voice above all else.',
    avatar: 'SC',
  },
  {
    id: 'del-003',
    name: 'Dr. James Nguyen',
    role: 'Multilingual Education Specialist',
    votingPower: 198000,
    proposalsVoted: 22,
    participation: 88,
    delegators: 31,
    statement: 'I champion multilingual education and language preservation. As a delegate, I evaluate proposals through the lens of linguistic diversity and the needs of LOTE (Languages Other Than English) programmes.',
    avatar: 'JN',
  },
  {
    id: 'del-004',
    name: 'Rachel O\'Brien',
    role: 'Rural Education Advocate',
    votingPower: 156000,
    proposalsVoted: 19,
    participation: 94,
    delegators: 24,
    statement: 'Representing the interests of rural and remote educators. I focus on proposals that address connectivity challenges, resource equity, and professional development opportunities for regional schools.',
    avatar: 'RO',
  },
  {
    id: 'del-005',
    name: 'Michael Torres',
    role: 'EdTech Infrastructure Engineer',
    votingPower: 134000,
    proposalsVoted: 23,
    participation: 100,
    delegators: 19,
    statement: 'I bring a technical perspective to governance, evaluating protocol upgrades and infrastructure proposals for security, scalability, and long-term sustainability of the Scholarly platform.',
    avatar: 'MT',
  },
  {
    id: 'del-006',
    name: 'Dr. Priya Sharma',
    role: 'Inclusive Education Researcher',
    votingPower: 112000,
    proposalsVoted: 17,
    participation: 85,
    delegators: 16,
    statement: 'I advocate for accessibility and inclusive design in all platform decisions. Every proposal should be assessed for its impact on learners with disabilities, neurodivergent students, and non-English speaking families.',
    avatar: 'PS',
  },
];

export default function DelegatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [delegatedTo, setDelegatedTo] = useState<string | null>(CURRENT_DELEGATION.delegatedTo);

  const filteredDelegates = DELEGATES.filter(
    (d) =>
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.statement.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDelegate = (delegateName: string) => {
    setDelegatedTo((prev) => (prev === delegateName ? null : delegateName));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link href="/governance" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <h1 className="heading-2">Delegates</h1>
          </div>
          <p className="text-muted-foreground">
            Delegate your voting power or become a delegate through liquid democracy
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <Users className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">142</p>
              <p className="text-sm text-muted-foreground">Total Delegates</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Vote className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">1.8M</p>
              <p className="text-sm text-muted-foreground">Delegated Power</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-500/10 p-3">
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">89%</p>
              <p className="text-sm text-muted-foreground">Avg Participation</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <Award className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">23</p>
              <p className="text-sm text-muted-foreground">Proposals This Month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Delegation */}
          <Card className={delegatedTo ? 'border-purple-500/30' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Current Delegation
              </CardTitle>
              <CardDescription>
                Your voting power delegation status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {delegatedTo ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                      <span className="text-lg font-bold text-purple-500">
                        {DELEGATES.find((d) => d.name === delegatedTo)?.avatar || delegatedTo.split(' ').map((w) => w[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold">{delegatedTo}</p>
                      <p className="text-sm text-muted-foreground">
                        Delegated {CURRENT_DELEGATION.delegatedPower.toLocaleString()} EDU voting power
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Since {CURRENT_DELEGATION.delegateSince} - {CURRENT_DELEGATION.delegateParticipation}% participation rate
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setDelegatedTo(null)}>
                    <UserMinus className="h-4 w-4 mr-2" />
                    Undelegate
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <UserMinus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium">No active delegation</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Choose a delegate below to delegate your voting power
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delegate Directory */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Delegate Directory</CardTitle>
                  <CardDescription>Browse and select a delegate to represent you</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search delegates..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Delegate</th>
                      <th className="px-4 py-3 text-left font-medium">Voting Power</th>
                      <th className="px-4 py-3 text-left font-medium">Voted</th>
                      <th className="px-4 py-3 text-left font-medium">Participation</th>
                      <th className="px-4 py-3 text-left font-medium">Statement</th>
                      <th className="px-4 py-3 text-right font-medium">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredDelegates.map((delegate) => (
                      <tr key={delegate.id} className="hover:bg-muted/50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-bold text-primary">
                                {delegate.avatar}
                              </span>
                            </div>
                            <div>
                              <p className="font-medium">{delegate.name}</p>
                              <p className="text-xs text-muted-foreground">{delegate.role}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-medium">{(delegate.votingPower / 1000).toFixed(0)}K</p>
                          <p className="text-xs text-muted-foreground">{delegate.delegators} delegators</p>
                        </td>
                        <td className="px-4 py-4 font-medium">{delegate.proposalsVoted}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 rounded-full overflow-hidden bg-muted">
                              <div
                                className="h-full bg-green-500 rounded-full"
                                style={{ width: `${delegate.participation}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{delegate.participation}%</span>
                          </div>
                        </td>
                        <td className="px-4 py-4 max-w-[200px]">
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {delegate.statement}
                          </p>
                        </td>
                        <td className="px-4 py-4 text-right">
                          {delegatedTo === delegate.name ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Delegated
                            </Badge>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDelegate(delegate.name)}
                            >
                              Delegate
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Your Delegate Profile */}
          {YOUR_DELEGATE_PROFILE.isDelegate && (
            <Card className="border-blue-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="h-4 w-4 text-blue-500" />
                  Your Delegate Profile
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                    <span className="text-lg font-bold text-blue-500">YO</span>
                  </div>
                  <div>
                    <p className="font-semibold">Your Profile</p>
                    <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs">
                      Active Delegate
                    </Badge>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Own Power</span>
                    <span className="font-medium">{YOUR_DELEGATE_PROFILE.ownPower.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Received Power</span>
                    <span className="font-medium">{YOUR_DELEGATE_PROFILE.receivedPower.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm border-t pt-2">
                    <span className="font-medium">Total Power</span>
                    <span className="font-bold">{YOUR_DELEGATE_PROFILE.totalPower.toLocaleString()}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Delegators</span>
                    <span className="font-medium">{YOUR_DELEGATE_PROFILE.delegators}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Proposals Voted</span>
                    <span className="font-medium">{YOUR_DELEGATE_PROFILE.proposalsVoted}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Participation</span>
                    <span className="font-medium">{YOUR_DELEGATE_PROFILE.participation}%</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">Your Statement</p>
                  <p className="text-xs">{YOUR_DELEGATE_PROFILE.statement}</p>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Edit Statement
                </Button>
              </CardContent>
            </Card>
          )}

          {/* How Delegation Works */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">How Delegation Works</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">1</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Choose a Delegate</p>
                  <p className="text-xs text-muted-foreground">
                    Browse the directory and select someone whose values align with yours
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">2</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Delegate Power</p>
                  <p className="text-xs text-muted-foreground">
                    Your voting power transfers to your delegate for all proposals
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">3</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Override Anytime</p>
                  <p className="text-xs text-muted-foreground">
                    You can vote directly on any proposal to override your delegate
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="rounded-full bg-primary/10 h-6 w-6 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-bold text-primary">4</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Revoke Freely</p>
                  <p className="text-xs text-muted-foreground">
                    Undelegate at any time to reclaim your voting power instantly
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
