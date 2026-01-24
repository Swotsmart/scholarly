'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  ClipboardCheck,
  Users,
  Clock,
  CheckCircle2,
  AlertCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';

const pendingReviews = [
  {
    id: 'r1',
    artifact: 'User Interview Analysis',
    student: 'Emma Smith',
    reviewer: 'Liam Johnson',
    phase: 'empathize',
    submittedAt: '2 hours ago',
    type: 'peer',
  },
  {
    id: 'r2',
    artifact: 'Problem Statement Draft',
    student: 'Noah Williams',
    reviewer: 'Olivia Brown',
    phase: 'define',
    submittedAt: '5 hours ago',
    type: 'peer',
  },
  {
    id: 'r3',
    artifact: 'Prototype v2',
    student: 'Emma Smith',
    reviewer: null,
    phase: 'prototype',
    submittedAt: '1 day ago',
    type: 'teacher',
  },
];

const moderationQueue = [
  {
    id: 'm1',
    artifact: 'Brainstorming Results',
    student: 'Ava Davis',
    reviewer: 'James Miller',
    rating: 4,
    flagged: false,
    submittedAt: '1 hour ago',
  },
  {
    id: 'm2',
    artifact: 'Empathy Map',
    student: 'Lucas Taylor',
    reviewer: 'Sophia Wilson',
    rating: 2,
    flagged: true,
    submittedAt: '3 hours ago',
  },
];

export default function TeacherReviewsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Peer Review Management</h1>
          <p className="text-muted-foreground">
            Manage peer review assignments and moderate feedback
          </p>
        </div>
        <Button asChild>
          <Link href="/teacher/reviews/assignments">
            <Users className="mr-2 h-4 w-4" />
            Manage Assignments
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-orange-500/10 p-3">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingReviews.length}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-yellow-500/10 p-3">
                <AlertCircle className="h-6 w-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{moderationQueue.filter(m => m.flagged).length}</p>
                <p className="text-sm text-muted-foreground">Flagged</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-500/10 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">47</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">4.2</p>
                <p className="text-sm text-muted-foreground">Avg. Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending Reviews ({pendingReviews.length})</TabsTrigger>
          <TabsTrigger value="moderation">Moderation Queue ({moderationQueue.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {pendingReviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <ClipboardCheck className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{review.artifact}</p>
                    <p className="text-sm text-muted-foreground">
                      By {review.student} • {review.submittedAt}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={review.type === 'teacher' ? 'default' : 'secondary'}>
                    {review.type === 'teacher' ? 'Teacher Review' : `Reviewer: ${review.reviewer}`}
                  </Badge>
                  <Badge variant="outline" className="capitalize">{review.phase}</Badge>
                  <Button size="sm" asChild>
                    <Link href={`/teacher/reviews/${review.id}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      Review
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="moderation" className="mt-4 space-y-4">
          {moderationQueue.map((item) => (
            <Card key={item.id} className={item.flagged ? 'border-yellow-500' : ''}>
              <CardContent className="flex items-center justify-between p-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{item.artifact}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.student} ← reviewed by {item.reviewer}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {item.flagged && (
                    <Badge variant="destructive">
                      <AlertCircle className="mr-1 h-3 w-3" />
                      Flagged
                    </Badge>
                  )}
                  <Badge variant="outline">Rating: {item.rating}/5</Badge>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline">
                      <ThumbsUp className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="outline">
                      <ThumbsDown className="h-4 w-4" />
                    </Button>
                    <Button size="sm">View</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
