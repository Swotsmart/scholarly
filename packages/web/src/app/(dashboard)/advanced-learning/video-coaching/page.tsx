'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Video,
  Upload,
  Play,
  MessageSquare,
  Clock,
  Star,
  Brain,
  ArrowLeft,
  Eye,
  CheckCircle2,
  Loader2,
  AlertCircle,
  ThumbsUp,
  Lightbulb,
  Target,
  BarChart3,
} from 'lucide-react';

const MOCK_RECORDINGS = [
  {
    id: 'rec_001',
    title: 'Year 8 Algebra Introduction',
    subject: 'Mathematics',
    dateRecorded: '2025-03-12',
    duration: '42:15',
    reviewsReceived: 3,
    status: 'reviewed' as const,
    thumbnailColor: 'from-blue-500/20 to-blue-600/10',
    comments: [
      { timestamp: '03:24', author: 'Dr. Sarah Chen', text: 'Excellent use of concrete manipulatives to introduce variables. Students are clearly engaged.', type: 'positive' },
      { timestamp: '12:08', author: 'AI Coach', text: 'Consider pausing after posing the question to allow more think time. Average wait time was 2.1 seconds.', type: 'suggestion' },
      { timestamp: '28:45', author: 'Mark Thompson', text: 'The transition from guided practice to independent work was smooth. Good scaffolding.', type: 'positive' },
      { timestamp: '35:12', author: 'AI Coach', text: 'Student engagement dipped slightly here. Consider incorporating a brief pair-share activity to re-energise learners.', type: 'suggestion' },
    ],
    aiInsights: {
      engagementScore: 84,
      questioningTechnique: 72,
      pacing: 88,
      studentParticipation: 76,
      summary: 'Strong lesson structure with effective use of manipulatives. Wait time after questioning could be extended to 3-5 seconds for deeper thinking. Student engagement was highest during the collaborative problem-solving segment (18:00-25:00).',
    },
  },
  {
    id: 'rec_002',
    title: 'Year 10 Chemistry Lab',
    subject: 'Science',
    dateRecorded: '2025-03-10',
    duration: '55:30',
    reviewsReceived: 2,
    status: 'reviewed' as const,
    thumbnailColor: 'from-emerald-500/20 to-emerald-600/10',
    comments: [],
    aiInsights: {
      engagementScore: 91,
      questioningTechnique: 85,
      pacing: 79,
      studentParticipation: 88,
      summary: 'Highly engaging practical lesson. Safety protocols were clearly communicated. Consider slowing the pace during the hypothesis discussion to allow all students to contribute.',
    },
  },
  {
    id: 'rec_003',
    title: 'Year 3 Reading Comprehension',
    subject: 'English',
    dateRecorded: '2025-03-08',
    duration: '35:20',
    reviewsReceived: 1,
    status: 'ready' as const,
    thumbnailColor: 'from-amber-500/20 to-amber-600/10',
    comments: [],
    aiInsights: {
      engagementScore: 78,
      questioningTechnique: 80,
      pacing: 82,
      studentParticipation: 70,
      summary: 'Good use of the gradual release model. Consider using more open-ended questions to deepen comprehension beyond literal recall.',
    },
  },
  {
    id: 'rec_004',
    title: 'Year 12 Essay Writing Workshop',
    subject: 'English',
    dateRecorded: '2025-03-05',
    duration: '48:45',
    reviewsReceived: 0,
    status: 'processing' as const,
    thumbnailColor: 'from-violet-500/20 to-violet-600/10',
    comments: [],
    aiInsights: null,
  },
  {
    id: 'rec_005',
    title: 'Year 5 Indigenous Art Lesson',
    subject: 'The Arts',
    dateRecorded: '2025-03-03',
    duration: '40:10',
    reviewsReceived: 4,
    status: 'reviewed' as const,
    thumbnailColor: 'from-rose-500/20 to-rose-600/10',
    comments: [],
    aiInsights: {
      engagementScore: 95,
      questioningTechnique: 90,
      pacing: 87,
      studentParticipation: 92,
      summary: 'Outstanding cultural responsiveness and student engagement. The integration of community Elder perspectives was particularly powerful. This recording is recommended as a model lesson.',
    },
  },
];

const MOCK_REVIEW_QUEUE = [
  {
    id: 'rev_001',
    title: 'Year 9 Physical Education - Fitness Unit',
    teacher: 'James Mitchell',
    subject: 'HPE',
    dateRecorded: '2025-03-11',
    duration: '38:20',
    commentCount: 0,
    deadline: '2025-03-18',
  },
  {
    id: 'rev_002',
    title: 'Year 7 Geography - Water Cycle',
    teacher: 'Priya Sharma',
    subject: 'Humanities',
    dateRecorded: '2025-03-09',
    duration: '44:15',
    commentCount: 2,
    deadline: '2025-03-16',
  },
  {
    id: 'rev_003',
    title: 'Year 11 Music Composition',
    teacher: 'David Nguyen',
    subject: 'The Arts',
    dateRecorded: '2025-03-07',
    duration: '50:05',
    commentCount: 1,
    deadline: '2025-03-14',
  },
];

const stats = [
  { label: 'Total Recordings', value: '8', icon: Video, color: 'blue' },
  { label: 'Reviews Completed', value: '10', icon: CheckCircle2, color: 'emerald' },
  { label: 'Avg. Engagement', value: '87%', icon: BarChart3, color: 'violet' },
  { label: 'AI Insights', value: '24', icon: Brain, color: 'amber' },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'reviewed':
      return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Reviewed</Badge>;
    case 'ready':
      return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">Ready for Review</Badge>;
    case 'processing':
      return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Processing</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'reviewed':
      return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
    case 'ready':
      return <Eye className="h-4 w-4 text-amber-500" />;
    case 'processing':
      return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
}

export default function VideoCoachingPage() {
  const [selectedRecording, setSelectedRecording] = useState(MOCK_RECORDINGS[0]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/advanced-learning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="heading-2">Video Coaching</h1>
            <p className="text-muted-foreground">
              Record, review, and improve your teaching practice with AI-powered insights
            </p>
          </div>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Recording
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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

      <Tabs defaultValue="recordings">
        <TabsList>
          <TabsTrigger value="recordings">My Recordings</TabsTrigger>
          <TabsTrigger value="review-queue">Review Queue</TabsTrigger>
        </TabsList>

        <TabsContent value="recordings" className="space-y-6">
          {/* Recordings Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Recordings</CardTitle>
              <CardDescription>Manage and review your teaching recordings</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Video Title</th>
                    <th className="text-left p-3 font-medium">Subject</th>
                    <th className="text-left p-3 font-medium">Date Recorded</th>
                    <th className="text-left p-3 font-medium">Duration</th>
                    <th className="text-left p-3 font-medium">Reviews</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {MOCK_RECORDINGS.map((recording) => (
                    <tr
                      key={recording.id}
                      className={`hover:bg-muted/50 cursor-pointer ${
                        selectedRecording.id === recording.id ? 'bg-muted/30' : ''
                      }`}
                      onClick={() => setSelectedRecording(recording)}
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getStatusIcon(recording.status)}
                          <span className="font-medium">{recording.title}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{recording.subject}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(recording.dateRecorded).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3 text-muted-foreground">{recording.duration}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span>{recording.reviewsReceived}</span>
                        </div>
                      </td>
                      <td className="p-3">{getStatusBadge(recording.status)}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setSelectedRecording(recording); }}>
                          <Play className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Recording Detail */}
          {selectedRecording && (
            <div className="grid gap-6 lg:grid-cols-3">
              {/* Video Player Placeholder + Comments */}
              <div className="lg:col-span-2 space-y-4">
                {/* Video Thumbnail */}
                <Card>
                  <CardContent className="p-0">
                    <div className={`relative aspect-video bg-gradient-to-br ${selectedRecording.thumbnailColor} rounded-t-lg flex items-center justify-center`}>
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-background/80 p-4 backdrop-blur-sm">
                          <Play className="h-8 w-8 text-foreground" />
                        </div>
                        <div className="text-center">
                          <p className="font-semibold">{selectedRecording.title}</p>
                          <p className="text-sm text-muted-foreground">{selectedRecording.duration}</p>
                        </div>
                      </div>
                    </div>
                    <div className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{selectedRecording.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {selectedRecording.subject} | Recorded{' '}
                            {new Date(selectedRecording.dateRecorded).toLocaleDateString('en-AU', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                        {getStatusBadge(selectedRecording.status)}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Timestamped Comments */}
                {selectedRecording.comments.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MessageSquare className="h-5 w-5 text-muted-foreground" />
                        Timestamped Comments ({selectedRecording.comments.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {selectedRecording.comments.map((comment, index) => (
                          <div key={index} className="flex gap-4">
                            <div className="flex-shrink-0">
                              <Badge variant="outline" className="font-mono text-xs">
                                {comment.timestamp}
                              </Badge>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium">{comment.author}</span>
                                {comment.type === 'positive' ? (
                                  <ThumbsUp className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <Lightbulb className="h-3 w-3 text-amber-500" />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">{comment.text}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Feedback Summary */}
                {selectedRecording.aiInsights && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Star className="h-5 w-5 text-amber-500" />
                        Overall Feedback Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {selectedRecording.aiInsights.summary}
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* AI Insights Sidebar */}
              <div className="space-y-4">
                {selectedRecording.aiInsights ? (
                  <Card className="bg-gradient-to-br from-violet-500/5 to-blue-500/5">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Brain className="h-5 w-5 text-violet-500" />
                        AI-Generated Insights
                      </CardTitle>
                      <CardDescription>Automated analysis of your teaching practice</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Engagement Score</span>
                            <span className="font-semibold">{selectedRecording.aiInsights.engagementScore}%</span>
                          </div>
                          <Progress value={selectedRecording.aiInsights.engagementScore} className="h-2" indicatorClassName="bg-emerald-500" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Questioning Technique</span>
                            <span className="font-semibold">{selectedRecording.aiInsights.questioningTechnique}%</span>
                          </div>
                          <Progress value={selectedRecording.aiInsights.questioningTechnique} className="h-2" indicatorClassName="bg-blue-500" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Pacing</span>
                            <span className="font-semibold">{selectedRecording.aiInsights.pacing}%</span>
                          </div>
                          <Progress value={selectedRecording.aiInsights.pacing} className="h-2" indicatorClassName="bg-amber-500" />
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Student Participation</span>
                            <span className="font-semibold">{selectedRecording.aiInsights.studentParticipation}%</span>
                          </div>
                          <Progress value={selectedRecording.aiInsights.studentParticipation} className="h-2" indicatorClassName="bg-violet-500" />
                        </div>
                      </div>

                      <div className="rounded-lg bg-muted/50 p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-violet-500" />
                          <span className="text-sm font-medium">Recommended Focus</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Increase wait time after questioning from 2.1s to 3-5s. This allows deeper cognitive processing and encourages more students to participate.
                        </p>
                      </div>

                      <Button variant="outline" className="w-full">
                        <Brain className="h-4 w-4 mr-2" />
                        Generate Detailed Report
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center p-8 text-center">
                      <Loader2 className="h-8 w-8 text-muted-foreground animate-spin mb-4" />
                      <p className="font-medium">Processing Recording</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        AI insights will be available once processing is complete. This typically takes 10-15 minutes.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="review-queue" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Videos Assigned for Review</CardTitle>
              <CardDescription>Provide timestamped feedback to support your colleagues</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Video Title</th>
                    <th className="text-left p-3 font-medium">Teacher</th>
                    <th className="text-left p-3 font-medium">Subject</th>
                    <th className="text-left p-3 font-medium">Duration</th>
                    <th className="text-left p-3 font-medium">Your Comments</th>
                    <th className="text-left p-3 font-medium">Deadline</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {MOCK_REVIEW_QUEUE.map((review) => (
                    <tr key={review.id} className="hover:bg-muted/50">
                      <td className="p-3 font-medium">{review.title}</td>
                      <td className="p-3 text-muted-foreground">{review.teacher}</td>
                      <td className="p-3 text-muted-foreground">{review.subject}</td>
                      <td className="p-3 text-muted-foreground">{review.duration}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span>{review.commentCount}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span className="text-muted-foreground">
                          {new Date(review.deadline).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                          })}
                        </span>
                      </td>
                      <td className="p-3">
                        <Button size="sm">
                          <Play className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
