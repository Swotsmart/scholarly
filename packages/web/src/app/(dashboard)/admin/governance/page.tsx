'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Vote,
  Users,
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Coins,
  Scale,
  AlertTriangle,
} from 'lucide-react';

const activeProposals = [
  {
    id: 'PROP-001',
    title: 'Increase Teacher Token Rewards',
    description: 'Proposal to increase token rewards for teachers completing professional development',
    status: 'voting',
    votesFor: 1234,
    votesAgainst: 456,
    quorum: 70,
    endsIn: '2 days',
    category: 'Token Economy',
  },
  {
    id: 'PROP-002',
    title: 'New Curriculum Standards Integration',
    description: 'Add support for IB MYP curriculum framework',
    status: 'voting',
    votesFor: 890,
    votesAgainst: 234,
    quorum: 55,
    endsIn: '5 days',
    category: 'Features',
  },
  {
    id: 'PROP-003',
    title: 'Community Moderation Guidelines Update',
    description: 'Updated guidelines for forum and discussion moderation',
    status: 'pending',
    votesFor: 0,
    votesAgainst: 0,
    quorum: 0,
    endsIn: '7 days',
    category: 'Policy',
  },
];

const recentDecisions = [
  { id: 'PROP-098', title: 'API Rate Limit Increase', result: 'passed', date: '2 weeks ago' },
  { id: 'PROP-097', title: 'New Badge Categories', result: 'passed', date: '3 weeks ago' },
  { id: 'PROP-096', title: 'Remove Legacy Features', result: 'rejected', date: '1 month ago' },
];

export default function GovernancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8" />
            DAO Governance
          </h1>
          <p className="text-muted-foreground">
            Decentralized governance for platform decisions
          </p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Create Proposal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Vote className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Active Proposals</span>
            </div>
            <div className="mt-2 text-2xl font-bold">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Total Voters</span>
            </div>
            <div className="mt-2 text-2xl font-bold">2,847</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Voting Power</span>
            </div>
            <div className="mt-2 text-2xl font-bold">1.2M</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Participation Rate</span>
            </div>
            <div className="mt-2 text-2xl font-bold">68%</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="active" className="space-y-4">
        <TabsList>
          <TabsTrigger value="active">Active Proposals</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="delegates">Delegates</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-4">
          {activeProposals.map((proposal) => {
            const totalVotes = proposal.votesFor + proposal.votesAgainst;
            const forPercentage = totalVotes > 0 ? (proposal.votesFor / totalVotes) * 100 : 0;

            return (
              <Card key={proposal.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{proposal.id}</Badge>
                        <Badge variant="secondary">{proposal.category}</Badge>
                        <Badge className={proposal.status === 'voting' ? 'bg-green-500' : 'bg-yellow-500'}>
                          {proposal.status === 'voting' ? 'Voting Open' : 'Pending'}
                        </Badge>
                      </div>
                      <CardTitle className="mt-2">{proposal.title}</CardTitle>
                      <CardDescription className="mt-1">{proposal.description}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Ends in {proposal.endsIn}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {proposal.status === 'voting' && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle2 className="h-4 w-4" />
                          For: {proposal.votesFor.toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1 text-red-600">
                          <XCircle className="h-4 w-4" />
                          Against: {proposal.votesAgainst.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-3 rounded-full bg-red-200 overflow-hidden">
                        <div
                          className="h-full bg-green-500 transition-all"
                          style={{ width: `${forPercentage}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Quorum: {proposal.quorum}% reached
                        </span>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">View Details</Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700">Vote For</Button>
                          <Button size="sm" variant="destructive">Vote Against</Button>
                        </div>
                      </div>
                    </div>
                  )}
                  {proposal.status === 'pending' && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4 text-yellow-500" />
                        Voting will begin soon
                      </span>
                      <Button variant="outline" size="sm">View Details</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent Decisions</CardTitle>
              <CardDescription>Past proposals and their outcomes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentDecisions.map((decision) => (
                  <div key={decision.id} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {decision.result === 'passed' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{decision.id}</Badge>
                          <span className="font-medium">{decision.title}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{decision.date}</span>
                      </div>
                    </div>
                    <Badge variant={decision.result === 'passed' ? 'default' : 'destructive'}>
                      {decision.result}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="delegates">
          <Card>
            <CardHeader>
              <CardTitle>Top Delegates</CardTitle>
              <CardDescription>Most active governance participants</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { name: 'Dr. Sarah Chen', votes: 125000, proposals: 12 },
                  { name: 'Prof. James Wilson', votes: 98000, proposals: 8 },
                  { name: 'Maria Garcia', votes: 76000, proposals: 15 },
                ].map((delegate, i) => (
                  <div key={delegate.name} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground font-bold">
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-medium">{delegate.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {delegate.proposals} proposals created
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{delegate.votes.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">voting power</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
