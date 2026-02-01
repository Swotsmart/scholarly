'use client';

/**
 * Assessment Builder Page
 * Create and edit assessments with various question types
 */

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { Progress } from '@/components/ui/progress';
import {
  ArrowLeft,
  Save,
  Eye,
  Plus,
  Trash2,
  GripVertical,
  Settings,
  Sparkles,
  Clock,
  FileText,
  CheckSquare,
  AlignLeft,
  FileUp,
  Link2,
  Image,
  Mic,
  Calculator,
  MoreHorizontal,
  Copy,
  ChevronUp,
  ChevronDown,
  Wand2,
  Loader2,
  BookOpen,
  Target,
  ListChecks,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Question types configuration
const questionTypes = [
  { id: 'mcq', label: 'Multiple Choice', icon: CheckSquare, description: 'Single or multiple correct answers' },
  { id: 'short', label: 'Short Answer', icon: AlignLeft, description: 'Brief text response' },
  { id: 'extended', label: 'Extended Response', icon: FileText, description: 'Essay or long-form answer' },
  { id: 'file', label: 'File Upload', icon: FileUp, description: 'Document, image, or media submission' },
  { id: 'matching', label: 'Matching', icon: Link2, description: 'Match items from two columns' },
];

// Question type definition
interface RubricCriterion {
  name: string;
  points: number;
  description: string;
}

interface Question {
  id: string;
  type: string;
  content: string;
  points: number;
  options: string[];
  correctAnswer: number | null;
  rubric: { criteria: RubricCriterion[] } | null;
}

// Mock questions data
const initialQuestions: Question[] = [
  {
    id: 'q1',
    type: 'mcq',
    content: 'What is the value of x in the equation 2x + 5 = 15?',
    points: 2,
    options: ['x = 3', 'x = 5', 'x = 7', 'x = 10'],
    correctAnswer: 1,
    rubric: null,
  },
  {
    id: 'q2',
    type: 'short',
    content: 'Define the term "coefficient" in algebraic expressions.',
    points: 3,
    options: [],
    correctAnswer: null,
    rubric: {
      criteria: [
        { name: 'Definition', points: 2, description: 'Correctly defines coefficient as a numerical factor' },
        { name: 'Example', points: 1, description: 'Provides a valid example' },
      ],
    },
  },
  {
    id: 'q3',
    type: 'extended',
    content: 'Explain the process of solving a system of linear equations using the substitution method. Include an example in your response.',
    points: 10,
    options: [],
    correctAnswer: null,
    rubric: {
      criteria: [
        { name: 'Understanding', points: 3, description: 'Demonstrates understanding of substitution method' },
        { name: 'Process', points: 4, description: 'Correctly describes the step-by-step process' },
        { name: 'Example', points: 2, description: 'Provides a valid worked example' },
        { name: 'Communication', points: 1, description: 'Clear and organized response' },
      ],
    },
  },
];

// Mock curriculum standards
const curriculumStandards = [
  { code: 'ACMNA208', description: 'Solve problems involving linear equations' },
  { code: 'ACMNA209', description: 'Graph simple non-linear relations' },
  { code: 'ACMNA210', description: 'Solve problems involving gradients of parallel and perpendicular lines' },
  { code: 'ACMNA211', description: 'Apply index laws to numerical expressions' },
];

type QuestionType = 'mcq' | 'short' | 'extended' | 'file' | 'matching';

export default function AssessmentBuilderPage() {
  const [assessmentTitle, setAssessmentTitle] = useState('Year 9 Mathematics - Algebra Fundamentals');
  const [questions, setQuestions] = useState(initialQuestions);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(questions[0]);
  const [activeTab, setActiveTab] = useState('questions');
  const [showAIDialog, setShowAIDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showAddQuestionDialog, setShowAddQuestionDialog] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [selectedStandards, setSelectedStandards] = useState<string[]>(['ACMNA208']);

  // Assessment settings
  const [settings, setSettings] = useState({
    timeLimit: 45,
    attempts: 1,
    shuffleQuestions: false,
    shuffleOptions: true,
    startDate: '',
    endDate: '',
    showResults: 'after_submission',
    passingScore: 50,
  });

  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  const handleAddQuestion = (type: QuestionType) => {
    const newQuestion: Question = {
      id: `q${questions.length + 1}`,
      type,
      content: '',
      points: type === 'extended' ? 10 : type === 'short' ? 3 : 2,
      options: type === 'mcq' ? ['', '', '', ''] : [],
      correctAnswer: type === 'mcq' ? 0 : null,
      rubric: type !== 'mcq' ? { criteria: [] } : null,
    };
    setQuestions([...questions, newQuestion]);
    setSelectedQuestion(newQuestion);
    setShowAddQuestionDialog(false);
  };

  const handleDeleteQuestion = (questionId: string) => {
    const filtered = questions.filter(q => q.id !== questionId);
    setQuestions(filtered);
    if (selectedQuestion?.id === questionId) {
      setSelectedQuestion(filtered[0] || null);
    }
  };

  const handleMoveQuestion = (questionId: string, direction: 'up' | 'down') => {
    const index = questions.findIndex(q => q.id === questionId);
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === questions.length - 1)) return;

    const newQuestions = [...questions];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    [newQuestions[index], newQuestions[swapIndex]] = [newQuestions[swapIndex], newQuestions[index]];
    setQuestions(newQuestions);
  };

  const handleGenerateQuestions = async () => {
    setIsGenerating(true);
    // Simulate AI generation
    await new Promise(resolve => setTimeout(resolve, 2000));

    const generatedQuestions: Question[] = [
      {
        id: `q${questions.length + 1}`,
        type: 'mcq',
        content: 'Which of the following is equivalent to 3(x + 4)?',
        points: 2,
        options: ['3x + 4', '3x + 12', 'x + 12', '3x + 7'],
        correctAnswer: 1,
        rubric: null,
      },
      {
        id: `q${questions.length + 2}`,
        type: 'short',
        content: 'Simplify the expression: 5x + 3x - 2x',
        points: 2,
        options: [],
        correctAnswer: null,
        rubric: {
          criteria: [
            { name: 'Correct Answer', points: 1, description: 'States 6x as the answer' },
            { name: 'Working', points: 1, description: 'Shows combining like terms' },
          ],
        },
      },
    ];

    setQuestions([...questions, ...generatedQuestions]);
    setIsGenerating(false);
    setShowAIDialog(false);
  };

  const getQuestionIcon = (type: string) => {
    const found = questionTypes.find(qt => qt.id === type);
    return found ? found.icon : FileText;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/assessment">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <Input
              value={assessmentTitle}
              onChange={(e) => setAssessmentTitle(e.target.value)}
              className="text-xl font-semibold border-none shadow-none px-0 focus-visible:ring-0 h-auto"
            />
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <Badge variant="secondary">{questions.length} questions</Badge>
              <span>-</span>
              <span>{totalPoints} points total</span>
              <span>-</span>
              <Badge variant="outline">Draft</Badge>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreviewDialog(true)}>
            <Eye className="mr-2 h-4 w-4" />
            Preview
          </Button>
          <Button variant="outline">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button>
            Publish
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Question List - Left Panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Questions</CardTitle>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon-sm" onClick={() => setShowAIDialog(true)}>
                  <Sparkles className="h-4 w-4 text-purple-500" />
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setShowAddQuestionDialog(true)}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 max-h-[500px] overflow-y-auto">
            {questions.map((question, index) => {
              const QuestionIcon = getQuestionIcon(question.type);
              return (
                <div
                  key={question.id}
                  className={cn(
                    'flex items-start gap-2 p-3 rounded-lg border cursor-pointer transition-colors',
                    selectedQuestion?.id === question.id
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-muted/50'
                  )}
                  onClick={() => setSelectedQuestion(question)}
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground mt-0.5 cursor-grab" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <QuestionIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Q{index + 1}</span>
                      <Badge variant="outline" className="text-xs">{question.points} pts</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {question.content || 'No content yet'}
                    </p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm" className="opacity-0 group-hover:opacity-100">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleMoveQuestion(question.id, 'up')}>
                        <ChevronUp className="mr-2 h-4 w-4" />
                        Move Up
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleMoveQuestion(question.id, 'down')}>
                        <ChevronDown className="mr-2 h-4 w-4" />
                        Move Down
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicate
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-destructive"
                        onClick={() => handleDeleteQuestion(question.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              );
            })}
            <Button
              variant="outline"
              className="w-full mt-2"
              onClick={() => setShowAddQuestionDialog(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </CardContent>
        </Card>

        {/* Question Editor - Middle Panel */}
        <Card className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <CardHeader className="pb-0">
              <TabsList>
                <TabsTrigger value="questions">Edit Question</TabsTrigger>
                <TabsTrigger value="rubric">Rubric</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
            </CardHeader>
            <CardContent className="pt-4">
              <TabsContent value="questions" className="mt-0">
                {selectedQuestion ? (
                  <div className="space-y-6">
                    {/* Question Content */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Question Content</Label>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon-sm" title="Insert Math">
                            <Calculator className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" title="Insert Image">
                            <Image className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" title="Insert Audio">
                            <Mic className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={selectedQuestion.content}
                        onChange={(e) => {
                          const updated = questions.map(q =>
                            q.id === selectedQuestion.id ? { ...q, content: e.target.value } : q
                          );
                          setQuestions(updated);
                          setSelectedQuestion({ ...selectedQuestion, content: e.target.value });
                        }}
                        placeholder="Enter your question here..."
                        className="min-h-[120px]"
                      />
                      <p className="text-xs text-muted-foreground">
                        Supports Markdown, LaTeX math ($x^2$), and rich media
                      </p>
                    </div>

                    {/* Points */}
                    <div className="flex items-center gap-4">
                      <div className="space-y-2">
                        <Label>Points</Label>
                        <Input
                          type="number"
                          min={1}
                          value={selectedQuestion.points}
                          onChange={(e) => {
                            const points = parseInt(e.target.value) || 1;
                            const updated = questions.map(q =>
                              q.id === selectedQuestion.id ? { ...q, points } : q
                            );
                            setQuestions(updated);
                            setSelectedQuestion({ ...selectedQuestion, points });
                          }}
                          className="w-24"
                        />
                      </div>
                      <div className="space-y-2 flex-1">
                        <Label>Question Type</Label>
                        <Select value={selectedQuestion.type} disabled>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {questionTypes.map(qt => (
                              <SelectItem key={qt.id} value={qt.id}>
                                {qt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* MCQ Options */}
                    {selectedQuestion.type === 'mcq' && (
                      <div className="space-y-3">
                        <Label>Answer Options</Label>
                        {selectedQuestion.options.map((option, index) => (
                          <div key={index} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="correct"
                              checked={selectedQuestion.correctAnswer === index}
                              onChange={() => {
                                const updated = questions.map(q =>
                                  q.id === selectedQuestion.id ? { ...q, correctAnswer: index } : q
                                );
                                setQuestions(updated);
                                setSelectedQuestion({ ...selectedQuestion, correctAnswer: index });
                              }}
                              className="text-primary"
                            />
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...selectedQuestion.options];
                                newOptions[index] = e.target.value;
                                const updated = questions.map(q =>
                                  q.id === selectedQuestion.id ? { ...q, options: newOptions } : q
                                );
                                setQuestions(updated);
                                setSelectedQuestion({ ...selectedQuestion, options: newOptions });
                              }}
                              placeholder={`Option ${String.fromCharCode(65 + index)}`}
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                if (selectedQuestion.options.length > 2) {
                                  const newOptions = selectedQuestion.options.filter((_, i) => i !== index);
                                  const updated = questions.map(q =>
                                    q.id === selectedQuestion.id ? { ...q, options: newOptions } : q
                                  );
                                  setQuestions(updated);
                                  setSelectedQuestion({ ...selectedQuestion, options: newOptions });
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            const newOptions = [...selectedQuestion.options, ''];
                            const updated = questions.map(q =>
                              q.id === selectedQuestion.id ? { ...q, options: newOptions } : q
                            );
                            setQuestions(updated);
                            setSelectedQuestion({ ...selectedQuestion, options: newOptions });
                          }}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Add Option
                        </Button>
                      </div>
                    )}

                    {/* Curriculum Standards */}
                    <div className="space-y-2">
                      <Label>Curriculum Standards</Label>
                      <div className="flex flex-wrap gap-2">
                        {curriculumStandards.map(standard => (
                          <Badge
                            key={standard.code}
                            variant={selectedStandards.includes(standard.code) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => {
                              setSelectedStandards(prev =>
                                prev.includes(standard.code)
                                  ? prev.filter(s => s !== standard.code)
                                  : [...prev, standard.code]
                              );
                            }}
                          >
                            {standard.code}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Select a question to edit or add a new one</p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="rubric" className="mt-0">
                {selectedQuestion && selectedQuestion.type !== 'mcq' ? (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-medium">Rubric Criteria</h3>
                        <p className="text-sm text-muted-foreground">
                          Define scoring criteria for this question
                        </p>
                      </div>
                      <Button variant="outline" size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Criterion
                      </Button>
                    </div>
                    <div className="space-y-3">
                      {selectedQuestion.rubric?.criteria.map((criterion, index) => (
                        <Card key={index}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-2">
                                  <Input
                                    value={criterion.name}
                                    placeholder="Criterion name"
                                    className="font-medium"
                                  />
                                  <Input
                                    type="number"
                                    value={criterion.points}
                                    className="w-20"
                                    min={1}
                                  />
                                  <span className="text-sm text-muted-foreground">pts</span>
                                </div>
                                <Textarea
                                  value={criterion.description}
                                  placeholder="Description of this criterion..."
                                  className="min-h-[60px]"
                                />
                              </div>
                              <Button variant="ghost" size="icon-sm">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                      <span className="font-medium">Total Points</span>
                      <span className="text-lg font-bold">
                        {selectedQuestion.rubric?.criteria.reduce((sum, c) => sum + c.points, 0) || 0}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <ListChecks className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {selectedQuestion?.type === 'mcq'
                        ? 'MCQ questions are auto-graded and do not require a rubric'
                        : 'Select a question to edit its rubric'}
                    </p>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="settings" className="mt-0">
                <div className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Time Limit (minutes)</Label>
                      <Input
                        type="number"
                        min={0}
                        value={settings.timeLimit}
                        onChange={(e) => setSettings({ ...settings, timeLimit: parseInt(e.target.value) || 0 })}
                      />
                      <p className="text-xs text-muted-foreground">Set to 0 for no time limit</p>
                    </div>
                    <div className="space-y-2">
                      <Label>Allowed Attempts</Label>
                      <Input
                        type="number"
                        min={1}
                        value={settings.attempts}
                        onChange={(e) => setSettings({ ...settings, attempts: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Start Date</Label>
                      <Input
                        type="datetime-local"
                        value={settings.startDate}
                        onChange={(e) => setSettings({ ...settings, startDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>End Date</Label>
                      <Input
                        type="datetime-local"
                        value={settings.endDate}
                        onChange={(e) => setSettings({ ...settings, endDate: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Shuffle Questions</Label>
                        <p className="text-sm text-muted-foreground">Randomize question order for each student</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.shuffleQuestions}
                        onChange={(e) => setSettings({ ...settings, shuffleQuestions: e.target.checked })}
                        className="h-4 w-4"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <Label>Shuffle Answer Options</Label>
                        <p className="text-sm text-muted-foreground">Randomize MCQ options for each student</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.shuffleOptions}
                        onChange={(e) => setSettings({ ...settings, shuffleOptions: e.target.checked })}
                        className="h-4 w-4"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>When to Show Results</Label>
                    <Select
                      value={settings.showResults}
                      onValueChange={(value) => setSettings({ ...settings, showResults: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="after_submission">After Submission</SelectItem>
                        <SelectItem value="after_due_date">After Due Date</SelectItem>
                        <SelectItem value="after_grading">After Grading</SelectItem>
                        <SelectItem value="never">Never</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Passing Score (%)</Label>
                    <div className="flex items-center gap-4">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={settings.passingScore}
                        onChange={(e) => setSettings({ ...settings, passingScore: parseInt(e.target.value) || 0 })}
                        className="w-24"
                      />
                      <Progress value={settings.passingScore} className="flex-1" />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </CardContent>
          </Tabs>
        </Card>
      </div>

      {/* Add Question Dialog */}
      <Dialog open={showAddQuestionDialog} onOpenChange={setShowAddQuestionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
            <DialogDescription>Choose a question type to add to your assessment</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-4">
            {questionTypes.map((type) => {
              const Icon = type.icon;
              return (
                <Card
                  key={type.id}
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleAddQuestion(type.id as QuestionType)}
                >
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{type.label}</p>
                      <p className="text-sm text-muted-foreground">{type.description}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* AI Generation Dialog */}
      <Dialog open={showAIDialog} onOpenChange={setShowAIDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Question Generator
            </DialogTitle>
            <DialogDescription>
              Generate questions automatically from curriculum standards
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Curriculum Standards</Label>
              <div className="flex flex-wrap gap-2">
                {curriculumStandards.map(standard => (
                  <Badge
                    key={standard.code}
                    variant={selectedStandards.includes(standard.code) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setSelectedStandards(prev =>
                        prev.includes(standard.code)
                          ? prev.filter(s => s !== standard.code)
                          : [...prev, standard.code]
                      );
                    }}
                  >
                    {standard.code}
                  </Badge>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Additional Instructions (optional)</Label>
              <Textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder="E.g., Focus on real-world applications, include diagrams..."
                className="min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <Label>Number of Questions</Label>
              <Select defaultValue="3">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 question</SelectItem>
                  <SelectItem value="3">3 questions</SelectItem>
                  <SelectItem value="5">5 questions</SelectItem>
                  <SelectItem value="10">10 questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateQuestions} disabled={isGenerating || selectedStandards.length === 0}>
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate Questions
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Student Preview</DialogTitle>
            <DialogDescription>
              This is how the assessment will appear to students
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border rounded-lg p-6 space-y-6">
              <div className="text-center pb-4 border-b">
                <h2 className="text-xl font-semibold">{assessmentTitle}</h2>
                <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {settings.timeLimit} minutes
                  </span>
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {questions.length} questions
                  </span>
                  <span className="flex items-center gap-1">
                    <Target className="h-4 w-4" />
                    {totalPoints} points
                  </span>
                </div>
              </div>
              {questions.slice(0, 2).map((question, index) => (
                <div key={question.id} className="p-4 bg-muted rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Question {index + 1}</span>
                    <Badge variant="outline">{question.points} pts</Badge>
                  </div>
                  <p>{question.content}</p>
                  {question.type === 'mcq' && (
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <label
                          key={optIndex}
                          className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-background"
                        >
                          <input type="radio" name={`preview-${question.id}`} />
                          <span>{option || `Option ${String.fromCharCode(65 + optIndex)}`}</span>
                        </label>
                      ))}
                    </div>
                  )}
                  {question.type === 'short' && (
                    <Input placeholder="Enter your answer..." />
                  )}
                  {question.type === 'extended' && (
                    <Textarea placeholder="Enter your response..." className="min-h-[100px]" />
                  )}
                </div>
              ))}
              {questions.length > 2 && (
                <p className="text-center text-muted-foreground">
                  + {questions.length - 2} more questions...
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPreviewDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
