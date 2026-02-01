'use client';

/**
 * Grading Interface Page
 * Review and grade student submissions with AI assistance
 */

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  MessageSquare,
  Mic,
  MicOff,
  Play,
  Pause,
  SkipForward,
  Check,
  X,
  Loader2,
  Send,
  Users,
  TrendingUp,
  Filter,
  Search,
  SlidersHorizontal,
  Presentation,
  FolderOpen,
  Star,
  ThumbsUp,
  ThumbsDown,
  Copy,
  Undo,
  MoreHorizontal,
  Eye,
  Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock submission queue data
const submissionQueue = [
  {
    id: 'sub_1',
    student: 'Emma Smith',
    avatar: 'ES',
    assessment: 'Year 9 Mathematics - Algebra Test',
    type: 'Test',
    submittedAt: '2024-01-22T10:30:00',
    dueDate: '2024-01-22T23:59:00',
    status: 'pending',
    questions: 25,
    answered: 25,
    score: null,
  },
  {
    id: 'sub_2',
    student: 'James Miller',
    avatar: 'JM',
    assessment: 'English Essay - Climate Change',
    type: 'Assignment',
    submittedAt: '2024-01-22T09:15:00',
    dueDate: '2024-01-22T23:59:00',
    status: 'pending',
    questions: 1,
    answered: 1,
    score: null,
  },
  {
    id: 'sub_3',
    student: 'Ava Davis',
    avatar: 'AD',
    assessment: 'Science Quiz - Chemical Reactions',
    type: 'Quiz',
    submittedAt: '2024-01-22T08:45:00',
    dueDate: '2024-01-21T23:59:00',
    status: 'late',
    questions: 15,
    answered: 14,
    score: null,
  },
  {
    id: 'sub_4',
    student: 'Noah Williams',
    avatar: 'NW',
    assessment: 'History Project - Ancient Rome',
    type: 'Project',
    submittedAt: '2024-01-21T16:20:00',
    dueDate: '2024-01-22T23:59:00',
    status: 'pending',
    questions: 5,
    answered: 5,
    score: null,
  },
  {
    id: 'sub_5',
    student: 'Olivia Brown',
    avatar: 'OB',
    assessment: 'Physics Lab Report',
    type: 'Assignment',
    submittedAt: '2024-01-21T14:00:00',
    dueDate: '2024-01-22T23:59:00',
    status: 'in_progress',
    questions: 3,
    answered: 3,
    score: 78,
  },
];

// Mock rubric criteria
const rubricCriteria = [
  {
    id: 'c1',
    name: 'Understanding of Concepts',
    description: 'Demonstrates clear understanding of mathematical concepts',
    maxPoints: 4,
    levels: [
      { points: 4, description: 'Excellent - Complete understanding with insightful connections' },
      { points: 3, description: 'Good - Solid understanding with minor gaps' },
      { points: 2, description: 'Satisfactory - Basic understanding with some misconceptions' },
      { points: 1, description: 'Needs Improvement - Limited understanding' },
      { points: 0, description: 'Not Demonstrated' },
    ],
  },
  {
    id: 'c2',
    name: 'Problem-Solving Process',
    description: 'Shows logical steps and mathematical reasoning',
    maxPoints: 4,
    levels: [
      { points: 4, description: 'Excellent - Clear, efficient, and well-organized solution' },
      { points: 3, description: 'Good - Logical approach with minor errors' },
      { points: 2, description: 'Satisfactory - Reasonable attempt with some errors' },
      { points: 1, description: 'Needs Improvement - Disorganized or incomplete' },
      { points: 0, description: 'Not Demonstrated' },
    ],
  },
  {
    id: 'c3',
    name: 'Communication',
    description: 'Uses appropriate mathematical notation and explains thinking',
    maxPoints: 2,
    levels: [
      { points: 2, description: 'Excellent - Clear explanations with proper notation' },
      { points: 1, description: 'Satisfactory - Some explanation with minor notation errors' },
      { points: 0, description: 'Needs Improvement - Little or no explanation' },
    ],
  },
];

// AI suggested feedback
const aiSuggestions = {
  score: 8,
  maxScore: 10,
  confidence: 0.85,
  feedback: `Good work on this problem! You've demonstrated a solid understanding of algebraic manipulation and correctly identified the key steps needed to solve the equation.

Your approach to isolating the variable was logical, though there's a small arithmetic error in step 3 where you wrote 15-5=9 instead of 15-5=10. This carried through to your final answer.

To improve:
- Double-check arithmetic calculations
- Consider showing verification by substituting your answer back into the original equation`,
  criteriaScores: [
    { criterionId: 'c1', score: 3, reason: 'Solid understanding with minor calculation error' },
    { criterionId: 'c2', score: 3, reason: 'Logical steps shown but arithmetic error in step 3' },
    { criterionId: 'c3', score: 2, reason: 'Clear notation and explanation throughout' },
  ],
};

type Submission = (typeof submissionQueue)[number];

export default function GradingInterfacePage() {
  const [activeTab, setActiveTab] = useState('queue');
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [showAISuggestions, setShowAISuggestions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [criteriaScores, setCriteriaScores] = useState<Record<string, number>>({});
  const [inlineComments, setInlineComments] = useState<Array<{ position: number; text: string }>>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [bulkSelected, setBulkSelected] = useState<string[]>([]);
  const [showBulkDialog, setShowBulkDialog] = useState(false);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const pendingCount = submissionQueue.filter(s => s.status === 'pending').length;
  const lateCount = submissionQueue.filter(s => s.status === 'late').length;
  const gradedCount = submissionQueue.filter(s => s.score !== null).length;

  const filteredSubmissions = submissionQueue.filter(sub => {
    const matchesStatus = filterStatus === 'all' || sub.status === filterStatus;
    const matchesSearch = sub.student.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.assessment.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleStartGrading = (submission: Submission) => {
    setSelectedSubmission(submission);
    setActiveTab('grading');
    setCriteriaScores({});
    setFeedback('');
    setInlineComments([]);
  };

  const handleApplyAISuggestions = () => {
    setFeedback(aiSuggestions.feedback);
    const scores: Record<string, number> = {};
    aiSuggestions.criteriaScores.forEach(cs => {
      scores[cs.criterionId] = cs.score;
    });
    setCriteriaScores(scores);
    setShowAISuggestions(false);
  };

  const handleGetAISuggestions = async () => {
    setIsLoadingAI(true);
    // Simulate AI processing
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoadingAI(false);
    setShowAISuggestions(true);
  };

  const calculateTotalScore = () => {
    return Object.values(criteriaScores).reduce((sum, score) => sum + score, 0);
  };

  const maxTotalScore = rubricCriteria.reduce((sum, c) => sum + c.maxPoints, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grading & Evaluation"
        description="Review and grade student submissions"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/teacher/gradebook">
                <FileText className="mr-2 h-4 w-4" />
                Gradebook
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          label="Pending Review"
          value={pendingCount}
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          label="Late Submissions"
          value={lateCount}
          icon={AlertCircle}
          variant="error"
        />
        <StatsCard
          label="Graded Today"
          value={gradedCount}
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          label="Average Score"
          value="74%"
          icon={TrendingUp}
          variant="primary"
          change={5}
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="queue" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Submission Queue
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingCount}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="grading" className="flex items-center gap-2" disabled={!selectedSubmission}>
            <Presentation className="h-4 w-4" />
            Grading View
          </TabsTrigger>
          <TabsTrigger value="pitches" className="flex items-center gap-2">
            <Presentation className="h-4 w-4" />
            Pitch Evaluations
          </TabsTrigger>
          <TabsTrigger value="portfolios" className="flex items-center gap-2">
            <FolderOpen className="h-4 w-4" />
            Portfolio Reviews
          </TabsTrigger>
        </TabsList>

        {/* Submission Queue Tab */}
        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle>Submissions</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 w-[200px]"
                    />
                  </div>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-[140px]">
                      <Filter className="mr-2 h-4 w-4" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="late">Late</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                    </SelectContent>
                  </Select>
                  {bulkSelected.length > 0 && (
                    <Button variant="outline" onClick={() => setShowBulkDialog(true)}>
                      <SlidersHorizontal className="mr-2 h-4 w-4" />
                      Bulk Actions ({bulkSelected.length})
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {filteredSubmissions.map((submission) => (
                  <div
                    key={submission.id}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-lg border transition-colors',
                      submission.status === 'late' && 'border-red-200 bg-red-50 dark:border-red-900/50 dark:bg-red-900/10',
                      submission.status === 'pending' && 'hover:bg-muted/50',
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={bulkSelected.includes(submission.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setBulkSelected([...bulkSelected, submission.id]);
                        } else {
                          setBulkSelected(bulkSelected.filter(id => id !== submission.id));
                        }
                      }}
                      className="h-4 w-4"
                    />
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {submission.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{submission.student}</p>
                        <Badge variant={
                          submission.status === 'late' ? 'destructive' :
                          submission.status === 'in_progress' ? 'secondary' :
                          'outline'
                        }>
                          {submission.status === 'late' ? 'Late' :
                           submission.status === 'in_progress' ? 'In Progress' :
                           'Pending'}
                        </Badge>
                        {submission.score !== null && (
                          <Badge variant="success">{submission.score}%</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{submission.assessment}</p>
                      <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Submitted {new Date(submission.submittedAt).toLocaleString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {submission.answered}/{submission.questions} answered
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" onClick={() => handleStartGrading(submission)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Review
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon-sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Download className="mr-2 h-4 w-4" />
                            Download Submission
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <MessageSquare className="mr-2 h-4 w-4" />
                            Contact Student
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            <X className="mr-2 h-4 w-4" />
                            Mark as Incomplete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grading View Tab - Split View */}
        <TabsContent value="grading" className="mt-4">
          {selectedSubmission ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {/* Left Panel - Student Work */}
              <Card className="lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto">
                <CardHeader className="sticky top-0 bg-card z-10 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">{selectedSubmission.student}</CardTitle>
                      <CardDescription>{selectedSubmission.assessment}</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm">
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">1 of 5</span>
                      <Button variant="outline" size="sm">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-6">
                  {/* Sample student response */}
                  <div className="space-y-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Question 1</span>
                        <Badge variant="outline">2 pts</Badge>
                      </div>
                      <p className="text-sm mb-4">Solve for x: 2x + 5 = 15</p>
                      <div className="p-4 bg-background rounded border">
                        <p className="text-sm font-medium mb-2">Student Response:</p>
                        <div className="text-sm space-y-1">
                          <p>2x + 5 = 15</p>
                          <p>2x = 15 - 5</p>
                          <p className="text-red-500 cursor-pointer hover:bg-red-50 rounded px-1" title="Click to add inline comment">
                            2x = 9 {/* Error highlighted */}
                          </p>
                          <p>x = 4.5</p>
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Question 2</span>
                        <Badge variant="outline">3 pts</Badge>
                      </div>
                      <p className="text-sm mb-4">Define the term &quot;coefficient&quot; in algebraic expressions.</p>
                      <div className="p-4 bg-background rounded border">
                        <p className="text-sm font-medium mb-2">Student Response:</p>
                        <p className="text-sm">
                          A coefficient is the number that multiplies a variable in an algebraic term.
                          For example, in 3x, the coefficient is 3.
                        </p>
                      </div>
                    </div>

                    <div className="p-4 bg-muted rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">Question 3</span>
                        <Badge variant="outline">10 pts</Badge>
                      </div>
                      <p className="text-sm mb-4">
                        Explain the process of solving a system of linear equations using the substitution method.
                      </p>
                      <div className="p-4 bg-background rounded border">
                        <p className="text-sm font-medium mb-2">Student Response:</p>
                        <p className="text-sm">
                          The substitution method involves solving one equation for one variable and then
                          substituting that expression into the other equation. First, isolate one variable
                          in one of the equations. Then substitute that expression into the other equation
                          to find the value of the remaining variable. Finally, substitute back to find
                          the first variable&apos;s value.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Inline Comments Section */}
                  {inlineComments.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="font-medium">Inline Comments</h4>
                      {inlineComments.map((comment, index) => (
                        <div key={index} className="flex items-start gap-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded text-sm">
                          <MessageSquare className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <p>{comment.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Right Panel - Rubric and Feedback */}
              <Card className="lg:max-h-[calc(100vh-280px)] lg:overflow-y-auto">
                <CardHeader className="sticky top-0 bg-card z-10 border-b">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Grading</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleGetAISuggestions}
                      disabled={isLoadingAI}
                    >
                      {isLoadingAI ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
                          AI Assist
                        </>
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4 space-y-6">
                  {/* AI Suggestions Banner */}
                  {showAISuggestions && (
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-purple-500" />
                          <span className="font-medium">AI Suggested Score</span>
                        </div>
                        <Badge variant="secondary">
                          {Math.round(aiSuggestions.confidence * 100)}% confidence
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mb-3">
                        <div className="text-3xl font-bold">{aiSuggestions.score}/{aiSuggestions.maxScore}</div>
                        <Progress value={(aiSuggestions.score / aiSuggestions.maxScore) * 100} className="flex-1" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-3">{aiSuggestions.feedback}</p>
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={handleApplyAISuggestions}>
                          <Check className="mr-2 h-4 w-4" />
                          Apply Suggestions
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setShowAISuggestions(false)}>
                          Dismiss
                        </Button>
                        <div className="flex-1" />
                        <Button size="sm" variant="ghost">
                          <ThumbsUp className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost">
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Rubric Criteria */}
                  <div className="space-y-4">
                    <h4 className="font-medium">Rubric</h4>
                    {rubricCriteria.map((criterion) => (
                      <div key={criterion.id} className="p-4 border rounded-lg space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-medium">{criterion.name}</p>
                            <p className="text-sm text-muted-foreground">{criterion.description}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-lg font-bold">
                              {criteriaScores[criterion.id] ?? '-'}/{criterion.maxPoints}
                            </span>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {criterion.levels.map((level) => (
                            <Button
                              key={level.points}
                              variant={criteriaScores[criterion.id] === level.points ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => setCriteriaScores({ ...criteriaScores, [criterion.id]: level.points })}
                              title={level.description}
                            >
                              {level.points}
                            </Button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Total Score */}
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Total Score</span>
                      <span className="text-2xl font-bold">{calculateTotalScore()}/{maxTotalScore}</span>
                    </div>
                    <Progress value={(calculateTotalScore() / maxTotalScore) * 100} className="h-2" />
                  </div>

                  {/* Feedback */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">Feedback</h4>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setIsRecording(!isRecording)}
                          className={cn(isRecording && 'text-red-500')}
                        >
                          {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Enter feedback for the student..."
                      className="min-h-[120px]"
                    />
                    {isRecording && (
                      <div className="flex items-center gap-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm">
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span>Recording audio feedback...</span>
                        <Button size="sm" variant="ghost" onClick={() => setIsRecording(false)}>
                          Stop
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-4 border-t">
                    <Button className="flex-1">
                      <Check className="mr-2 h-4 w-4" />
                      Submit Grade
                    </Button>
                    <Button variant="outline">
                      <SkipForward className="mr-2 h-4 w-4" />
                      Next
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Select a submission from the queue to start grading</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Pitch Evaluations Tab */}
        <TabsContent value="pitches" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/teacher/grading/pitches">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-orange-500/10 p-3">
                    <Presentation className="h-6 w-6 text-orange-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Pitch Evaluations</h3>
                    <p className="text-sm text-muted-foreground">
                      Grade student pitch presentations using the 10/20/30 rubric
                    </p>
                  </div>
                  <Badge>2 pending</Badge>
                </CardContent>
              </Card>
            </Link>
            <Card>
              <CardContent className="p-6">
                <h4 className="font-medium mb-4">Recent Pitch Evaluations</h4>
                <div className="space-y-3">
                  {[
                    { student: 'Noah Williams', title: 'WellnessHub', score: 85, date: '2024-01-20' },
                    { student: 'Liam Johnson', title: 'GreenCampus', score: 92, date: '2024-01-18' },
                  ].map((evaluation, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{evaluation.title}</p>
                        <p className="text-sm text-muted-foreground">{evaluation.student}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{evaluation.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Portfolio Reviews Tab */}
        <TabsContent value="portfolios" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Link href="/teacher/grading/portfolios">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-blue-500/10 p-3">
                    <FolderOpen className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Portfolio Reviews</h3>
                    <p className="text-sm text-muted-foreground">
                      Review and assess student showcase portfolios
                    </p>
                  </div>
                  <Badge>1 pending</Badge>
                </CardContent>
              </Card>
            </Link>
            <Card>
              <CardContent className="p-6">
                <h4 className="font-medium mb-4">Recent Portfolio Reviews</h4>
                <div className="space-y-3">
                  {[
                    { student: 'Olivia Brown', title: 'Design Journey', score: 78, date: '2024-01-19' },
                  ].map((evaluation, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{evaluation.title}</p>
                        <p className="text-sm text-muted-foreground">{evaluation.student}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{evaluation.score}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Bulk Actions Dialog */}
      <Dialog open={showBulkDialog} onOpenChange={setShowBulkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bulk Actions</DialogTitle>
            <DialogDescription>
              Apply actions to {bulkSelected.length} selected submissions
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button variant="outline" className="w-full justify-start">
              <Check className="mr-2 h-4 w-4" />
              Mark as Reviewed
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Send className="mr-2 h-4 w-4" />
              Send Feedback Reminder
            </Button>
            <Button variant="outline" className="w-full justify-start">
              <Download className="mr-2 h-4 w-4" />
              Export Selected
            </Button>
            <Button variant="outline" className="w-full justify-start text-destructive">
              <X className="mr-2 h-4 w-4" />
              Mark as Incomplete
            </Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowBulkDialog(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
