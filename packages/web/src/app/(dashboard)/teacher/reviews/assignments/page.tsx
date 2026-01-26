'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Users,
  UserCheck,
  UserX,
  BarChart3,
  Shuffle,
  Hand,
  CheckCircle2,
  Clock,
  AlertCircle,
} from 'lucide-react';

const stats = [
  { label: 'Total Students', value: '32', icon: Users, color: 'blue' },
  { label: 'Assigned', value: '24', icon: UserCheck, color: 'green' },
  { label: 'Unassigned', value: '8', icon: UserX, color: 'orange' },
  { label: 'Avg Reviews/Student', value: '3.2', icon: BarChart3, color: 'purple' },
];

const peerAssignments = [
  {
    id: 'pa-1',
    student: 'Lachlan O\'Brien',
    challenge: 'Sustainable Campus',
    reviewers: 'Emma Watson, Jack Nguyen, Sophie Walsh',
    reviewCount: 3,
    status: 'complete' as const,
  },
  {
    id: 'pa-2',
    student: 'Matilda Cooper',
    challenge: 'Community Connect',
    reviewers: 'Noah Henderson, Chloe Murray',
    reviewCount: 2,
    status: 'partial' as const,
  },
  {
    id: 'pa-3',
    student: 'Angus Fletcher',
    challenge: 'Sustainable Campus',
    reviewers: 'Charlotte Webb, Oliver Bennett, Isla Campbell',
    reviewCount: 3,
    status: 'complete' as const,
  },
  {
    id: 'pa-4',
    student: 'Sienna Whitfield',
    challenge: 'EcoTrack App',
    reviewers: 'Liam Foster, Amelia Stewart, Tyler Morrison',
    reviewCount: 3,
    status: 'complete' as const,
  },
  {
    id: 'pa-5',
    student: 'Hamish Gallagher',
    challenge: 'Community Connect',
    reviewers: '',
    reviewCount: 0,
    status: 'pending' as const,
  },
  {
    id: 'pa-6',
    student: 'Eliza Pemberton',
    challenge: 'EcoTrack App',
    reviewers: 'Bella Thompson',
    reviewCount: 1,
    status: 'partial' as const,
  },
  {
    id: 'pa-7',
    student: 'Archie Drummond',
    challenge: 'Sustainable Campus',
    reviewers: 'Jake Reynolds, Mia Patterson, Ethan Clarke',
    reviewCount: 3,
    status: 'complete' as const,
  },
  {
    id: 'pa-8',
    student: 'Poppy Ainsworth',
    challenge: 'Community Connect',
    reviewers: '',
    reviewCount: 0,
    status: 'pending' as const,
  },
];

const statusConfig = {
  complete: { label: 'Complete', variant: 'default' as const, icon: CheckCircle2, className: 'bg-green-500/10 text-green-700 border-green-200' },
  partial: { label: 'Partial', variant: 'secondary' as const, icon: Clock, className: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
  pending: { label: 'Pending', variant: 'outline' as const, icon: AlertCircle, className: 'bg-red-500/10 text-red-700 border-red-200' },
};

export default function PeerReviewAssignmentsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Peer Review Assignments</h1>
          <p className="text-muted-foreground">
            Manage peer review assignments for design challenges
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button>
            <Shuffle className="mr-2 h-4 w-4" />
            Auto-Assign
          </Button>
          <Button variant="outline">
            <Hand className="mr-2 h-4 w-4" />
            Manual Assign
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-500`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Bulk Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Bulk Actions</CardTitle>
              <CardDescription>
                Quickly manage reviewer assignments across students
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                Select All Unassigned
              </Button>
              <Button variant="outline" size="sm">
                Redistribute Reviews
              </Button>
              <Button variant="outline" size="sm">
                Export Assignments
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Assignment Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Assignments</CardTitle>
          <CardDescription>
            {peerAssignments.length} students across active challenges
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Student Name</th>
                  <th className="pb-3 pr-4 font-medium">Challenge</th>
                  <th className="pb-3 pr-4 font-medium">Assigned Reviewers</th>
                  <th className="pb-3 pr-4 font-medium text-center">Reviews</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {peerAssignments.map((assignment) => {
                  const config = statusConfig[assignment.status];
                  const StatusIcon = config.icon;
                  return (
                    <tr key={assignment.id} className="text-sm">
                      <td className="py-4 pr-4">
                        <p className="font-medium">{assignment.student}</p>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge variant="outline">{assignment.challenge}</Badge>
                      </td>
                      <td className="py-4 pr-4">
                        <p className="text-muted-foreground">
                          {assignment.reviewers || 'No reviewers assigned'}
                        </p>
                      </td>
                      <td className="py-4 pr-4 text-center">
                        <span className="font-medium">{assignment.reviewCount}</span>
                      </td>
                      <td className="py-4 pr-4">
                        <Badge className={config.className}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {config.label}
                        </Badge>
                      </td>
                      <td className="py-4">
                        <Button variant="outline" size="sm">
                          {assignment.status === 'pending' ? 'Assign' : 'Edit'}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
