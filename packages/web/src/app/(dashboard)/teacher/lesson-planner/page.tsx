'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PageHeader, StatsCard } from '@/components/shared';
import { Progress } from '@/components/ui/progress';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Plus,
  BookOpen,
  Sparkles,
  FileText,
  Users,
  Share2,
  Copy,
  Layers,
  Download,
  Folder,
  Search,
  Clock,
  Target,
  Lightbulb,
  GraduationCap,
  Link2,
  Upload,
  Star,
  Edit3,
  Trash2,
  MoreHorizontal,
  Check,
  GitBranch,
} from 'lucide-react';

// Types
interface LessonPlan {
  id: string;
  title: string;
  subject: string;
  yearLevel: string;
  curriculumCode: string;
  duration: string;
  date?: string;
  period?: number;
  objectives: string[];
  activities: LessonActivity[];
  resources: Resource[];
  differentiation: DifferentiationBranch[];
  status: 'draft' | 'scheduled' | 'completed';
  sharedWith?: string[];
}

interface LessonActivity {
  id: string;
  title: string;
  duration: string;
  description: string;
  type: 'intro' | 'direct' | 'guided' | 'independent' | 'assessment' | 'closure';
}

interface Resource {
  id: string;
  name: string;
  type: 'document' | 'video' | 'link' | 'file';
  url?: string;
}

interface DifferentiationBranch {
  id: string;
  level: 'extension' | 'core' | 'support';
  description: string;
  activities: string[];
}

interface LessonTemplate {
  id: string;
  name: string;
  subject: string;
  description: string;
  usageCount: number;
  isFavorite: boolean;
}

// Mock data
const periods = [
  { num: 1, time: '8:30 - 9:20' },
  { num: 2, time: '9:25 - 10:15' },
  { num: 3, time: '10:35 - 11:25' },
  { num: 4, time: '11:30 - 12:20' },
  { num: 5, time: '1:20 - 2:10' },
  { num: 6, time: '2:15 - 3:05' },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const lessonPlans: Record<string, Record<number, LessonPlan | null>> = {
  Monday: {
    1: {
      id: 'lp1',
      title: 'Introduction to Quadratic Functions',
      subject: 'Year 10 Design & Tech',
      yearLevel: 'Year 10',
      curriculumCode: 'ACTDEK040',
      duration: '50 min',
      date: '2025-01-27',
      period: 1,
      objectives: ['Understand the basic form of quadratic equations', 'Plot simple parabolas'],
      activities: [
        { id: 'a1', title: 'Hook: Real-world parabolas', duration: '5 min', description: 'Show examples of parabolas in architecture', type: 'intro' },
        { id: 'a2', title: 'Direct instruction', duration: '15 min', description: 'Explain y = ax^2 + bx + c form', type: 'direct' },
        { id: 'a3', title: 'Guided practice', duration: '20 min', description: 'Work through examples together', type: 'guided' },
        { id: 'a4', title: 'Exit ticket', duration: '10 min', description: 'Quick check understanding', type: 'assessment' },
      ],
      resources: [
        { id: 'r1', name: 'Quadratics Worksheet', type: 'document' },
        { id: 'r2', name: 'Desmos Graphing', type: 'link', url: 'https://desmos.com' },
      ],
      differentiation: [
        { id: 'd1', level: 'extension', description: 'Advanced problems', activities: ['Solve word problems', 'Find axis of symmetry'] },
        { id: 'd2', level: 'core', description: 'Standard curriculum', activities: ['Complete worksheet', 'Graph parabolas'] },
        { id: 'd3', level: 'support', description: 'Additional scaffolding', activities: ['Use graphing calculator', 'Worked examples'] },
      ],
      status: 'scheduled',
    },
    2: {
      id: 'lp2',
      title: 'Quadratic Functions Practice',
      subject: 'Year 10 Design & Tech',
      yearLevel: 'Year 10',
      curriculumCode: 'ACTDEK040',
      duration: '50 min',
      objectives: ['Practice plotting parabolas', 'Identify key features'],
      activities: [],
      resources: [],
      differentiation: [],
      status: 'scheduled',
    },
    3: null,
    4: null,
    5: null,
    6: null,
  },
  Tuesday: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
  Wednesday: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
  Thursday: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
  Friday: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
};

const templates: LessonTemplate[] = [
  { id: 't1', name: '5E Lesson Plan', subject: 'General', description: 'Engage, Explore, Explain, Elaborate, Evaluate', usageCount: 45, isFavorite: true },
  { id: 't2', name: 'Project Introduction', subject: 'Design & Tech', description: 'Template for introducing new projects', usageCount: 23, isFavorite: true },
  { id: 't3', name: 'Lab Practical', subject: 'Science', description: 'Safety briefing, method, results, conclusion', usageCount: 18, isFavorite: false },
  { id: 't4', name: 'Writing Workshop', subject: 'English', description: 'Mini-lesson, writing time, share', usageCount: 31, isFavorite: false },
  { id: 't5', name: 'Problem-Based Learning', subject: 'Mathematics', description: 'Present problem, explore, discuss, apply', usageCount: 27, isFavorite: true },
  { id: 't6', name: 'Assessment Review', subject: 'General', description: 'Review criteria, practice, feedback', usageCount: 15, isFavorite: false },
];

const curriculumCodes = [
  { code: 'ACTDEK040', description: 'Investigate and make judgements on how the characteristics and properties of materials are combined with force, motion and energy to create engineered solutions' },
  { code: 'ACTDEK041', description: 'Investigate and make judgements on how the characteristics and properties of materials, systems, components, tools and equipment affect their properties' },
  { code: 'ACTDEP049', description: 'Develop project plans using digital technologies to plan and manage projects' },
  { code: 'ACMNA239', description: 'Solve problems involving quadratic equations' },
];

const collaborators = [
  { id: 'c1', name: 'Ms. Sarah Chen', department: 'Mathematics', avatar: 'SC' },
  { id: 'c2', name: 'Mr. James Wong', department: 'Science', avatar: 'JW' },
  { id: 'c3', name: 'Dr. Emily Park', department: 'Design & Tech', avatar: 'EP' },
];

function getActivityColor(type: string) {
  switch (type) {
    case 'intro':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'direct':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'guided':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    case 'independent':
      return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
    case 'assessment':
      return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
    case 'closure':
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function getDifferentiationColor(level: string) {
  switch (level) {
    case 'extension':
      return 'bg-violet-100 text-violet-700 border-violet-300 dark:bg-violet-900/30 dark:text-violet-400 dark:border-violet-700';
    case 'core':
      return 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-700';
    case 'support':
      return 'bg-green-100 text-green-700 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

export default function LessonPlannerPage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [selectedLesson, setSelectedLesson] = useState<LessonPlan | null>(null);
  const [lessonDetailOpen, setLessonDetailOpen] = useState(false);
  const [aiGeneratorOpen, setAiGeneratorOpen] = useState(false);
  const [newLessonOpen, setNewLessonOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('calendar');

  const [aiForm, setAiForm] = useState({
    curriculumCode: '',
    yearLevel: '',
    duration: '50',
    focusArea: '',
  });

  const weekStart = new Date(currentWeek);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  const totalPlanned = Object.values(lessonPlans).flatMap((day) =>
    Object.values(day).filter((plan) => plan !== null)
  ).length;

  const handleLessonClick = (lesson: LessonPlan | null, day: string, period: number) => {
    if (lesson) {
      setSelectedLesson(lesson);
      setLessonDetailOpen(true);
    } else {
      setNewLessonOpen(true);
    }
  };

  const renderCalendarView = () => (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left font-medium text-muted-foreground w-24">Period</th>
              {days.map((day) => (
                <th key={day} className="p-3 text-left font-medium min-w-[160px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period.num} className="border-b">
                <td className="p-3 bg-muted/20">
                  <div className="font-medium">Period {period.num}</div>
                  <div className="text-xs text-muted-foreground">{period.time}</div>
                </td>
                {days.map((day) => {
                  const lesson = lessonPlans[day]?.[period.num];
                  return (
                    <td key={day} className="p-2">
                      {lesson ? (
                        <div
                          className="rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800"
                          onClick={() => handleLessonClick(lesson, day, period.num)}
                        >
                          <p className="font-medium text-sm line-clamp-1">{lesson.title}</p>
                          <p className="text-xs text-muted-foreground mt-1">{lesson.subject}</p>
                          <div className="flex items-center gap-1 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {lesson.curriculumCode}
                            </Badge>
                          </div>
                        </div>
                      ) : (
                        <div
                          className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground min-h-[80px] flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => handleLessonClick(null, day, period.num)}
                        >
                          <Plus className="h-4 w-4 mb-1" />
                          Add Lesson
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  const renderTemplatesView = () => (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                <SelectItem value="general">General</SelectItem>
                <SelectItem value="maths">Mathematics</SelectItem>
                <SelectItem value="science">Science</SelectItem>
                <SelectItem value="english">English</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Template
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {templates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <FileText className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-base">{template.name}</CardTitle>
                    <CardDescription className="text-xs">{template.subject}</CardDescription>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className={template.isFavorite ? 'text-amber-500' : 'text-muted-foreground'}
                >
                  <Star className={`h-4 w-4 ${template.isFavorite ? 'fill-amber-500' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">{template.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Used {template.usageCount} times
                </span>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="mr-2 h-3 w-3" />
                    Use
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderResourcesView = () => (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search resources..."
                className="pl-10"
              />
            </div>
            <Select defaultValue="all">
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="document">Documents</SelectItem>
                <SelectItem value="video">Videos</SelectItem>
                <SelectItem value="link">Links</SelectItem>
              </SelectContent>
            </Select>
            <Button>
              <Upload className="mr-2 h-4 w-4" />
              Upload
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[
          { name: 'Quadratics Worksheet', type: 'document', size: '245 KB', modified: '2 days ago' },
          { name: 'Parabola Video', type: 'video', size: '12 MB', modified: '1 week ago' },
          { name: 'Desmos Link', type: 'link', size: '-', modified: '3 days ago' },
          { name: 'Assessment Rubric', type: 'document', size: '128 KB', modified: '5 days ago' },
          { name: 'Project Brief', type: 'document', size: '512 KB', modified: '1 day ago' },
          { name: 'Tutorial Video', type: 'video', size: '45 MB', modified: '2 weeks ago' },
        ].map((resource, idx) => (
          <Card key={idx} className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className={`rounded-lg p-2 ${
                  resource.type === 'document' ? 'bg-blue-100 text-blue-600' :
                  resource.type === 'video' ? 'bg-red-100 text-red-600' :
                  'bg-green-100 text-green-600'
                }`}>
                  {resource.type === 'document' ? <FileText className="h-4 w-4" /> :
                   resource.type === 'video' ? <FileText className="h-4 w-4" /> :
                   <Link2 className="h-4 w-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{resource.name}</p>
                  <p className="text-xs text-muted-foreground">{resource.size}</p>
                  <p className="text-xs text-muted-foreground">{resource.modified}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderSharingView = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Collaboration</CardTitle>
          <CardDescription>Share lesson plans with colleagues</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {collaborators.map((collab) => (
            <div key={collab.id} className="flex items-center justify-between p-3 rounded-lg border">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-medium text-primary">{collab.avatar}</span>
                </div>
                <div>
                  <p className="font-medium">{collab.name}</p>
                  <p className="text-sm text-muted-foreground">{collab.department}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">3 shared</Badge>
                <Button variant="outline" size="sm">View Shared</Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Shared With Me</CardTitle>
          <CardDescription>Lesson plans from your colleagues</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { title: 'Ecosystem Investigation', from: 'Mr. James Wong', subject: 'Science Year 9', date: '2 days ago' },
              { title: 'Persuasive Writing Unit', from: 'Ms. Sarah Chen', subject: 'English Year 10', date: '1 week ago' },
            ].map((shared, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                <div>
                  <p className="font-medium">{shared.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {shared.subject} - from {shared.from}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{shared.date}</span>
                  <Button variant="outline" size="sm">
                    <Copy className="mr-2 h-3 w-3" />
                    Duplicate
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lesson Planner"
        description="Plan, create, and share your lessons"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setAiGeneratorOpen(true)}>
              <Sparkles className="mr-2 h-4 w-4" />
              AI Generate
            </Button>
            <Button onClick={() => setNewLessonOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Lesson
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          label="Lessons Planned"
          value={totalPlanned}
          icon={BookOpen}
          variant="primary"
        />
        <StatsCard
          label="Templates"
          value={templates.length}
          icon={Folder}
          variant="success"
        />
        <StatsCard
          label="Resources"
          value={12}
          icon={FileText}
          variant="warning"
        />
        <StatsCard
          label="Shared Plans"
          value={5}
          icon={Share2}
          variant="primary"
        />
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="calendar">
            <Calendar className="mr-2 h-4 w-4" />
            Calendar
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Layers className="mr-2 h-4 w-4" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="resources">
            <FileText className="mr-2 h-4 w-4" />
            Resources
          </TabsTrigger>
          <TabsTrigger value="sharing">
            <Share2 className="mr-2 h-4 w-4" />
            Sharing
          </TabsTrigger>
        </TabsList>

        {/* Calendar View */}
        <TabsContent value="calendar" className="mt-4 space-y-4">
          {/* Week Navigation */}
          <Card>
            <CardContent className="flex items-center justify-between p-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const prev = new Date(currentWeek);
                  prev.setDate(prev.getDate() - 7);
                  setCurrentWeek(prev);
                }}
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Previous Week
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <span className="font-medium">
                  Week of {weekStart.toLocaleDateString('en-AU', { month: 'long', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const next = new Date(currentWeek);
                  next.setDate(next.getDate() + 7);
                  setCurrentWeek(next);
                }}
              >
                Next Week
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {renderCalendarView()}
        </TabsContent>

        {/* Templates View */}
        <TabsContent value="templates" className="mt-4">
          {renderTemplatesView()}
        </TabsContent>

        {/* Resources View */}
        <TabsContent value="resources" className="mt-4">
          {renderResourcesView()}
        </TabsContent>

        {/* Sharing View */}
        <TabsContent value="sharing" className="mt-4">
          {renderSharingView()}
        </TabsContent>
      </Tabs>

      {/* Lesson Detail Dialog */}
      <Dialog open={lessonDetailOpen} onOpenChange={setLessonDetailOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-start justify-between">
              <div>
                <DialogTitle>{selectedLesson?.title}</DialogTitle>
                <DialogDescription>
                  {selectedLesson?.subject} - {selectedLesson?.curriculumCode}
                </DialogDescription>
              </div>
              <Badge variant="outline">{selectedLesson?.status}</Badge>
            </div>
          </DialogHeader>

          {selectedLesson && (
            <div className="space-y-6">
              {/* Objectives */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Learning Objectives
                </h4>
                <ul className="space-y-1">
                  {selectedLesson.objectives.map((obj, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                      {obj}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Activities */}
              <div>
                <h4 className="font-medium mb-2 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  Lesson Flow
                </h4>
                <div className="space-y-2">
                  {selectedLesson.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-3 p-3 rounded-lg border"
                    >
                      <Badge className={getActivityColor(activity.type)}>
                        {activity.duration}
                      </Badge>
                      <div className="flex-1">
                        <p className="font-medium text-sm">{activity.title}</p>
                        <p className="text-sm text-muted-foreground">{activity.description}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Differentiation */}
              {selectedLesson.differentiation.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-muted-foreground" />
                    Differentiation Branches
                  </h4>
                  <div className="grid gap-3 md:grid-cols-3">
                    {selectedLesson.differentiation.map((branch) => (
                      <div
                        key={branch.id}
                        className={`rounded-lg border p-3 ${getDifferentiationColor(branch.level)}`}
                      >
                        <p className="font-medium text-sm capitalize mb-1">{branch.level}</p>
                        <p className="text-xs opacity-80 mb-2">{branch.description}</p>
                        <ul className="space-y-1">
                          {branch.activities.map((act, idx) => (
                            <li key={idx} className="text-xs flex items-center gap-1">
                              <span className="w-1 h-1 rounded-full bg-current" />
                              {act}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Resources */}
              {selectedLesson.resources.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2 flex items-center gap-2">
                    <Link2 className="h-4 w-4 text-muted-foreground" />
                    Resources
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedLesson.resources.map((resource) => (
                      <Badge key={resource.id} variant="secondary" className="cursor-pointer">
                        {resource.type === 'link' ? <Link2 className="mr-1 h-3 w-3" /> : <FileText className="mr-1 h-3 w-3" />}
                        {resource.name}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setShareDialogOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button>
              <Edit3 className="mr-2 h-4 w-4" />
              Edit Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Generator Dialog */}
      <Dialog open={aiGeneratorOpen} onOpenChange={setAiGeneratorOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              AI Lesson Generator
            </DialogTitle>
            <DialogDescription>
              Generate a lesson plan from curriculum codes
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Curriculum Code</Label>
              <Select
                value={aiForm.curriculumCode}
                onValueChange={(value) => setAiForm({ ...aiForm, curriculumCode: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select curriculum code" />
                </SelectTrigger>
                <SelectContent>
                  {curriculumCodes.map((code) => (
                    <SelectItem key={code.code} value={code.code}>
                      <div>
                        <span className="font-medium">{code.code}</span>
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {code.description}
                        </p>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Year Level</Label>
                <Select
                  value={aiForm.yearLevel}
                  onValueChange={(value) => setAiForm({ ...aiForm, yearLevel: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12'].map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={aiForm.duration}
                  onChange={(e) => setAiForm({ ...aiForm, duration: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Focus Area (Optional)</Label>
              <Textarea
                placeholder="Describe specific focus areas or learning goals..."
                value={aiForm.focusArea}
                onChange={(e) => setAiForm({ ...aiForm, focusArea: e.target.value })}
              />
            </div>

            <div className="rounded-lg bg-violet-50 border border-violet-200 p-4 dark:bg-violet-950 dark:border-violet-900">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-violet-500 mt-0.5" />
                <div>
                  <p className="font-medium text-violet-800 dark:text-violet-200">AI will generate:</p>
                  <ul className="text-sm text-violet-700 dark:text-violet-300 mt-1 space-y-1">
                    <li>Learning objectives aligned to curriculum</li>
                    <li>Structured lesson activities with timing</li>
                    <li>Differentiation scaffolding branches</li>
                    <li>Suggested resources and materials</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAiGeneratorOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setAiGeneratorOpen(false)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generate Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Lesson Dialog */}
      <Dialog open={newLessonOpen} onOpenChange={setNewLessonOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Lesson</DialogTitle>
            <DialogDescription>
              Start from scratch or use a template
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Lesson Title</Label>
              <Input placeholder="Enter lesson title..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Subject</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="dt">Design & Technology</SelectItem>
                    <SelectItem value="maths">Mathematics</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Year Level</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {['Year 7', 'Year 8', 'Year 9', 'Year 10', 'Year 11', 'Year 12'].map((year) => (
                      <SelectItem key={year} value={year}>{year}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Template (Optional)</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Start from template" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blank">Blank Lesson</SelectItem>
                  {templates.filter((t) => t.isFavorite).map((template) => (
                    <SelectItem key={template.id} value={template.id}>
                      <Star className="h-3 w-3 inline mr-1 text-amber-500 fill-amber-500" />
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setNewLessonOpen(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={() => {
              setNewLessonOpen(false);
              setAiGeneratorOpen(true);
            }}>
              <Sparkles className="mr-2 h-4 w-4" />
              Use AI
            </Button>
            <Button onClick={() => setNewLessonOpen(false)}>
              Create Lesson
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Lesson Plan</DialogTitle>
            <DialogDescription>
              Collaborate with colleagues on this lesson
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Share with</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select colleague" />
                </SelectTrigger>
                <SelectContent>
                  {collaborators.map((collab) => (
                    <SelectItem key={collab.id} value={collab.id}>
                      {collab.name} - {collab.department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Permission</Label>
              <Select defaultValue="view">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="view">Can view</SelectItem>
                  <SelectItem value="edit">Can edit</SelectItem>
                  <SelectItem value="duplicate">Can duplicate</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Message (Optional)</Label>
              <Textarea placeholder="Add a note for your colleague..." />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShareDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShareDialogOpen(false)}>
              <Share2 className="mr-2 h-4 w-4" />
              Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
