'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Users,
  ArrowLeft,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Send,
  Star,
  Brain,
  BarChart3,
  MessageSquare,
  ClipboardList,
  Calendar,
} from 'lucide-react';

const MOCK_SESSIONS = [
  {
    id: 'sess_001',
    name: 'Year 11 Research Essay Review',
    subject: 'English',
    teacher: 'Ms. Rebecca Liu',
    submissionDeadline: '2025-03-15',
    reviewDeadline: '2025-03-22',
    rubricType: 'Analytical',
    participantCount: 28,
    submissionsReceived: 22,
    totalExpected: 28,
    status: 'active' as const,
    description: 'Critical analysis essay on Australian identity in contemporary literature. Students review two peer essays using a structured analytical rubric covering thesis clarity, evidence use, and argumentation.',
  },
  {
    id: 'sess_002',
    name: 'Year 9 Science Fair Poster',
    subject: 'Science',
    teacher: 'Dr. Andrew Park',
    submissionDeadline: '2025-03-18',
    reviewDeadline: '2025-03-25',
    rubricType: 'Holistic',
    participantCount: 32,
    submissionsReceived: 18,
    totalExpected: 32,
    status: 'active' as const,
    description: 'Science fair poster presentations on environmental sustainability. Peer review focuses on scientific method, data presentation, visual design, and communication effectiveness.',
  },
  {
    id: 'sess_003',
    name: 'Year 7 Creative Writing',
    subject: 'English',
    teacher: 'Mr. Tom Richards',
    submissionDeadline: '2025-03-12',
    reviewDeadline: '2025-03-19',
    rubricType: 'Single-Point',
    participantCount: 26,
    submissionsReceived: 26,
    totalExpected: 26,
    status: 'active' as const,
    description: 'Short story writing with a focus on narrative voice and character development. Peer reviewers use a single-point rubric to provide targeted, constructive feedback.',
  },
  {
    id: 'sess_004',
    name: 'Year 12 Design Portfolio',
    subject: 'Design & Technology',
    teacher: 'Ms. Jade O\'Connor',
    submissionDeadline: '2025-03-20',
    reviewDeadline: '2025-03-27',
    rubricType: 'Multi-Trait',
    participantCount: 18,
    submissionsReceived: 6,
    totalExpected: 18,
    status: 'active' as const,
    description: 'VCE Design & Technology portfolio showcasing the design process from ideation to prototype. Multi-trait rubric assesses creativity, technical execution, documentation, and user consideration.',
  },
];

const MOCK_SUBMISSIONS = [
  {
    id: 'sub_001',
    sessionName: 'Year 11 Research Essay Review',
    title: 'The Shifting Lens: Australian Identity in Tim Winton\'s Breath',
    submittedAt: '2025-03-13',
    reviewStatus: 'reviewed' as const,
    feedbackCount: 2,
    averageScore: 85,
    aiSuggestions: 3,
  },
  {
    id: 'sub_002',
    sessionName: 'Year 9 Science Fair Poster',
    title: 'Impact of Microplastics on Port Phillip Bay Marine Life',
    submittedAt: '2025-03-16',
    reviewStatus: 'pending' as const,
    feedbackCount: 0,
    averageScore: null,
    aiSuggestions: 2,
  },
  {
    id: 'sub_003',
    sessionName: 'Year 7 Creative Writing',
    title: 'The Last Platypus of Daintree Creek',
    submittedAt: '2025-03-10',
    reviewStatus: 'reviewed' as const,
    feedbackCount: 3,
    averageScore: 78,
    aiSuggestions: 4,
  },
];

const MOCK_ASSIGNMENTS = [
  {
    id: 'asgn_001',
    sessionName: 'Year 11 Research Essay Review',
    authorPseudonym: 'Reviewer A',
    title: 'Masculinity and Landscape in Patrick White\'s Voss',
    criteria: [
      { name: 'Thesis Clarity', maxScore: 20, score: 16, description: 'Clear, arguable thesis that addresses the prompt directly' },
      { name: 'Evidence & Analysis', maxScore: 30, score: 24, description: 'Relevant textual evidence with insightful analysis that supports the thesis' },
      { name: 'Argumentation', maxScore: 25, score: 20, description: 'Logical structure with effective transitions and counterargument consideration' },
      { name: 'Academic Writing', maxScore: 15, score: 12, description: 'Formal register, appropriate vocabulary, and correct referencing' },
      { name: 'Originality', maxScore: 10, score: 8, description: 'Unique perspective or interpretation that goes beyond surface reading' },
    ],
    feedback: 'Strong thesis with effective use of close reading. The analysis of landscape symbolism is particularly compelling. Consider expanding the counterargument in paragraph 4 to strengthen your position.',
    status: 'completed' as const,
  },
  {
    id: 'asgn_002',
    sessionName: 'Year 7 Creative Writing',
    authorPseudonym: 'Reviewer B',
    title: 'Whispers in the Red Centre',
    criteria: [
      { name: 'Narrative Voice', maxScore: 25, score: null, description: 'Distinct, consistent narrator voice appropriate to the story' },
      { name: 'Character Development', maxScore: 25, score: null, description: 'Well-developed characters with clear motivations and growth' },
      { name: 'Setting & Atmosphere', maxScore: 20, score: null, description: 'Vivid, immersive setting that enhances the narrative' },
      { name: 'Plot Structure', maxScore: 20, score: null, description: 'Clear beginning, rising action, climax, and resolution' },
      { name: 'Language & Style', maxScore: 10, score: null, description: 'Creative use of language, imagery, and literary devices' },
    ],
    feedback: '',
    status: 'in_progress' as const,
  },
];

const pageStats = [
  { label: 'Active Sessions', value: '4', icon: ClipboardList, color: 'blue' },
  { label: 'My Submissions', value: '3', icon: FileText, color: 'emerald' },
  { label: 'Reviews Due', value: '1', icon: Clock, color: 'amber' },
  { label: 'Avg. Score Received', value: '82%', icon: Star, color: 'violet' },
];

function getReviewStatusBadge(status: string) {
  switch (status) {
    case 'reviewed':
      return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Reviewed</Badge>;
    case 'pending':
      return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">Pending Review</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function PeerReviewPage() {
  const [assignmentScores, setAssignmentScores] = useState<Record<string, number | null>>({});
  const [assignmentFeedback, setAssignmentFeedback] = useState('');

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
            <h1 className="heading-2">Peer Review Sessions</h1>
            <p className="text-muted-foreground">
              AI-enhanced peer review with structured rubrics and calibrated feedback
            </p>
          </div>
        </div>
        <Button>
          <Users className="mr-2 h-4 w-4" />
          Create Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {pageStats.map((stat) => {
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

      <Tabs defaultValue="active">
        <TabsList>
          <TabsTrigger value="active">Active Sessions</TabsTrigger>
          <TabsTrigger value="submissions">My Submissions</TabsTrigger>
          <TabsTrigger value="assignments">Review Assignments</TabsTrigger>
        </TabsList>

        {/* Active Sessions */}
        <TabsContent value="active" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {MOCK_SESSIONS.map((session) => {
              const progress = Math.round((session.submissionsReceived / session.totalExpected) * 100);
              return (
                <Card key={session.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{session.name}</CardTitle>
                        <CardDescription className="mt-1">{session.subject} | {session.teacher}</CardDescription>
                      </div>
                      <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Active</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">{session.description}</p>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Submit by:</span>
                        <span className="font-medium">
                          {new Date(session.submissionDeadline).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Review by:</span>
                        <span className="font-medium">
                          {new Date(session.reviewDeadline).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rubric Type</span>
                      <Badge variant="outline">{session.rubricType}</Badge>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Participants</span>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{session.participantCount}</span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Submissions</span>
                        <span className="font-medium">{session.submissionsReceived}/{session.totalExpected}</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>

                    <Button variant="outline" className="w-full">
                      <FileText className="h-4 w-4 mr-2" />
                      View Session
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        {/* My Submissions */}
        <TabsContent value="submissions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Submissions</CardTitle>
              <CardDescription>Track the review status and feedback on your submitted work</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Title</th>
                    <th className="text-left p-3 font-medium">Session</th>
                    <th className="text-left p-3 font-medium">Submitted</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Feedback</th>
                    <th className="text-left p-3 font-medium">Score</th>
                    <th className="text-left p-3 font-medium">AI Tips</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {MOCK_SUBMISSIONS.map((submission) => (
                    <tr key={submission.id} className="hover:bg-muted/50">
                      <td className="p-3 font-medium max-w-[200px]">
                        <span className="truncate block">{submission.title}</span>
                      </td>
                      <td className="p-3 text-muted-foreground">{submission.sessionName}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(submission.submittedAt).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td className="p-3">{getReviewStatusBadge(submission.reviewStatus)}</td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <MessageSquare className="h-3 w-3 text-muted-foreground" />
                          <span>{submission.feedbackCount}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        {submission.averageScore !== null ? (
                          <span className="font-semibold">{submission.averageScore}%</span>
                        ) : (
                          <span className="text-muted-foreground">--</span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <Brain className="h-3 w-3 text-violet-500" />
                          <span>{submission.aiSuggestions}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm">View</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Review Assignments */}
        <TabsContent value="assignments" className="space-y-6">
          {MOCK_ASSIGNMENTS.map((assignment) => (
            <Card key={assignment.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{assignment.title}</CardTitle>
                    <CardDescription>
                      {assignment.sessionName} | Assigned as {assignment.authorPseudonym}
                    </CardDescription>
                  </div>
                  {assignment.status === 'completed' ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Completed
                    </Badge>
                  ) : (
                    <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20">
                      <AlertCircle className="h-3 w-3 mr-1" />
                      In Progress
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Rubric Criteria */}
                <div>
                  <h4 className="text-sm font-medium mb-3">Rubric Criteria</h4>
                  <div className="space-y-3">
                    {assignment.criteria.map((criterion) => (
                      <div key={criterion.name} className="rounded-lg border p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium">{criterion.name}</span>
                          <div className="flex items-center gap-2">
                            {criterion.score !== null ? (
                              <span className="text-sm font-semibold">{criterion.score}/{criterion.maxScore}</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                {Array.from({ length: Math.ceil(criterion.maxScore / 5) }, (_, i) => (
                                  <button
                                    key={i}
                                    className="h-6 w-6 rounded border text-xs hover:bg-muted flex items-center justify-center"
                                    onClick={() => {
                                      setAssignmentScores(prev => ({
                                        ...prev,
                                        [`${assignment.id}_${criterion.name}`]: (i + 1) * 5 > criterion.maxScore ? criterion.maxScore : (i + 1) * 5,
                                      }));
                                    }}
                                  >
                                    {(i + 1) * 5 > criterion.maxScore ? criterion.maxScore : (i + 1) * 5}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">{criterion.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total Score */}
                {assignment.status === 'completed' && (
                  <div className="rounded-lg bg-muted/50 p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Total Score</span>
                      </div>
                      <span className="text-lg font-bold">
                        {assignment.criteria.reduce((sum, c) => sum + (c.score || 0), 0)}/
                        {assignment.criteria.reduce((sum, c) => sum + c.maxScore, 0)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Feedback */}
                <div>
                  <h4 className="text-sm font-medium mb-2">Written Feedback</h4>
                  {assignment.status === 'completed' ? (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">{assignment.feedback}</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Textarea
                        placeholder="Provide constructive feedback on this submission. Focus on strengths and specific areas for improvement..."
                        rows={4}
                        value={assignmentFeedback}
                        onChange={(e) => setAssignmentFeedback(e.target.value)}
                      />
                      <div className="flex items-center justify-between">
                        <Button variant="outline" size="sm">
                          <Brain className="h-3 w-3 mr-1" />
                          AI Feedback Suggestions
                        </Button>
                        <Button size="sm">
                          <Send className="h-3 w-3 mr-1" />
                          Submit Review
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
