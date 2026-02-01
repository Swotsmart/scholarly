'use client';

/**
 * Assessment Library Page
 * Browse, create, and manage assessment templates
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { type ColumnDef } from '@tanstack/react-table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
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
  DialogTrigger,
} from '@/components/ui/dialog';
import { DataTable } from '@/components/shared/data-table';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';
import { EmptyState } from '@/components/shared/empty-state';
import {
  FileText,
  Plus,
  Search,
  Upload,
  Eye,
  BarChart3,
  Grid3X3,
  List,
  Clock,
  Users,
  BookOpen,
  GraduationCap,
  Filter,
  Download,
  Copy,
  MoreHorizontal,
  Pencil,
  Trash2,
  Star,
  TrendingUp,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

// Mock data
const assessmentTemplates = [
  {
    id: 'assess_1',
    title: 'Year 9 Mathematics - Algebra Fundamentals',
    type: 'Test',
    subject: 'Mathematics',
    yearLevel: 'Year 9',
    curriculum: 'Australian Curriculum',
    questions: 25,
    duration: 45,
    avgScore: 72,
    timesUsed: 156,
    lastUsed: '2024-01-18',
    status: 'published',
    createdBy: 'Dr. Sarah Chen',
    standards: ['ACMNA208', 'ACMNA209'],
  },
  {
    id: 'assess_2',
    title: 'Year 10 English - Essay Writing Assessment',
    type: 'Assignment',
    subject: 'English',
    yearLevel: 'Year 10',
    curriculum: 'Australian Curriculum',
    questions: 3,
    duration: 90,
    avgScore: 68,
    timesUsed: 89,
    lastUsed: '2024-01-20',
    status: 'published',
    createdBy: 'Prof. Michael Torres',
    standards: ['ACELA1553', 'ACELA1557'],
  },
  {
    id: 'assess_3',
    title: 'Year 8 Science - Chemical Reactions Quiz',
    type: 'Quiz',
    subject: 'Science',
    yearLevel: 'Year 8',
    curriculum: 'Australian Curriculum',
    questions: 15,
    duration: 20,
    avgScore: 78,
    timesUsed: 234,
    lastUsed: '2024-01-21',
    status: 'published',
    createdBy: 'Dr. Emily Watson',
    standards: ['ACSSU152', 'ACSSU153'],
  },
  {
    id: 'assess_4',
    title: 'Year 11 Physics - Forces and Motion',
    type: 'Test',
    subject: 'Physics',
    yearLevel: 'Year 11',
    curriculum: 'Australian Curriculum',
    questions: 30,
    duration: 60,
    avgScore: 65,
    timesUsed: 45,
    lastUsed: '2024-01-15',
    status: 'draft',
    createdBy: 'James Liu',
    standards: ['ACSPH060', 'ACSPH061'],
  },
  {
    id: 'assess_5',
    title: 'Year 7 History - Ancient Civilizations',
    type: 'Project',
    subject: 'History',
    yearLevel: 'Year 7',
    curriculum: 'Australian Curriculum',
    questions: 5,
    duration: 180,
    avgScore: 74,
    timesUsed: 67,
    lastUsed: '2024-01-19',
    status: 'published',
    createdBy: 'Dr. Sarah Chen',
    standards: ['ACDSEH002', 'ACDSEH003'],
  },
  {
    id: 'assess_6',
    title: 'Year 12 Chemistry - Organic Compounds',
    type: 'Test',
    subject: 'Chemistry',
    yearLevel: 'Year 12',
    curriculum: 'Australian Curriculum',
    questions: 40,
    duration: 90,
    avgScore: 62,
    timesUsed: 23,
    lastUsed: '2024-01-22',
    status: 'published',
    createdBy: 'Prof. Michael Torres',
    standards: ['ACSCH136', 'ACSCH137'],
  },
];

const historicalPerformance = [
  { month: 'Sep', avgScore: 68, submissions: 1234 },
  { month: 'Oct', avgScore: 71, submissions: 1456 },
  { month: 'Nov', avgScore: 69, submissions: 1567 },
  { month: 'Dec', avgScore: 73, submissions: 1123 },
  { month: 'Jan', avgScore: 72, submissions: 1678 },
];

type Assessment = (typeof assessmentTemplates)[number];

export default function AssessmentLibraryPage() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [curriculumFilter, setCurriculumFilter] = useState<string>('all');
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedAssessment, setSelectedAssessment] = useState<Assessment | null>(null);

  const filteredAssessments = useMemo(() => {
    return assessmentTemplates.filter((assessment) => {
      const matchesSearch = assessment.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesType = typeFilter === 'all' || assessment.type === typeFilter;
      const matchesSubject = subjectFilter === 'all' || assessment.subject === subjectFilter;
      const matchesYear = yearFilter === 'all' || assessment.yearLevel === yearFilter;
      const matchesCurriculum = curriculumFilter === 'all' || assessment.curriculum === curriculumFilter;
      return matchesSearch && matchesType && matchesSubject && matchesYear && matchesCurriculum;
    });
  }, [searchQuery, typeFilter, subjectFilter, yearFilter, curriculumFilter]);

  const columns: ColumnDef<Assessment>[] = [
    {
      accessorKey: 'title',
      header: 'Assessment',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.title}</p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="secondary" className="text-xs">{row.original.type}</Badge>
            <span className="text-xs text-muted-foreground">{row.original.questions} questions</span>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'subject',
      header: 'Subject',
    },
    {
      accessorKey: 'yearLevel',
      header: 'Year Level',
    },
    {
      accessorKey: 'avgScore',
      header: 'Avg. Score',
      cell: ({ row }) => (
        <div className="flex items-center gap-1">
          <span className={cn(
            'font-medium',
            row.original.avgScore >= 70 ? 'text-green-600' : row.original.avgScore >= 50 ? 'text-amber-600' : 'text-red-600'
          )}>
            {row.original.avgScore}%
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'timesUsed',
      header: 'Times Used',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.status === 'published' ? 'success' : 'secondary'}>
          {row.original.status}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => {
              setSelectedAssessment(row.original);
              setPreviewDialogOpen(true);
            }}>
              <Eye className="mr-2 h-4 w-4" />
              Preview
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={`/assessment/builder?edit=${row.original.id}`}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuItem>
              <BarChart3 className="mr-2 h-4 w-4" />
              Analytics
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const uniqueSubjects = Array.from(new Set(assessmentTemplates.map(a => a.subject)));
  const uniqueYears = Array.from(new Set(assessmentTemplates.map(a => a.yearLevel)));
  const uniqueTypes = Array.from(new Set(assessmentTemplates.map(a => a.type)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Assessment Library"
        description="Browse, create, and manage your assessment templates"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => setImportDialogOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import
            </Button>
            <Button asChild>
              <Link href="/assessment/builder">
                <Plus className="mr-2 h-4 w-4" />
                Create Assessment
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          label="Total Assessments"
          value={assessmentTemplates.length}
          icon={FileText}
          variant="primary"
          change={12}
        />
        <StatsCard
          label="Published"
          value={assessmentTemplates.filter(a => a.status === 'published').length}
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          label="Total Submissions"
          value="5,892"
          icon={Users}
          variant="primary"
          subtitle="This semester"
        />
        <StatsCard
          label="Avg. Performance"
          value="71%"
          icon={TrendingUp}
          variant="success"
          change={3}
        />
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search assessments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {uniqueSubjects.map(subject => (
                    <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Year Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {uniqueYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={curriculumFilter} onValueChange={setCurriculumFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Curriculum" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Curricula</SelectItem>
                  <SelectItem value="Australian Curriculum">Australian Curriculum</SelectItem>
                  <SelectItem value="IB">IB</SelectItem>
                  <SelectItem value="Cambridge">Cambridge</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center border rounded-md">
                <Button
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon-sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessment Grid/List View */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredAssessments.length === 0 ? (
            <div className="col-span-full">
              <EmptyState
                icon={FileText}
                title="No assessments found"
                description="Try adjusting your filters or create a new assessment"
                actionLabel="Create Assessment"
                onAction={() => window.location.href = '/assessment/builder'}
              />
            </div>
          ) : (
            filteredAssessments.map((assessment) => (
              <Card key={assessment.id} hover className="overflow-hidden">
                <div className={cn(
                  'h-2',
                  assessment.subject === 'Mathematics' && 'bg-blue-500',
                  assessment.subject === 'English' && 'bg-purple-500',
                  assessment.subject === 'Science' && 'bg-green-500',
                  assessment.subject === 'Physics' && 'bg-amber-500',
                  assessment.subject === 'History' && 'bg-rose-500',
                  assessment.subject === 'Chemistry' && 'bg-cyan-500',
                )} />
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <CardTitle className="text-base line-clamp-2">{assessment.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{assessment.type}</Badge>
                        <Badge variant={assessment.status === 'published' ? 'success' : 'outline'} className="text-xs">
                          {assessment.status}
                        </Badge>
                      </CardDescription>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon-sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => {
                          setSelectedAssessment(assessment);
                          setPreviewDialogOpen(true);
                        }}>
                          <Eye className="mr-2 h-4 w-4" />
                          Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/assessment/builder?edit=${assessment.id}`}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Copy className="mr-2 h-4 w-4" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {assessment.subject}
                    </span>
                    <span className="flex items-center gap-1">
                      <GraduationCap className="h-3 w-3" />
                      {assessment.yearLevel}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {assessment.duration} min
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="flex items-center gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Questions: </span>
                        <span className="font-medium">{assessment.questions}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg: </span>
                        <span className={cn(
                          'font-medium',
                          assessment.avgScore >= 70 ? 'text-green-600' : 'text-amber-600'
                        )}>{assessment.avgScore}%</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Users className="h-3 w-3" />
                      {assessment.timesUsed}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                      setSelectedAssessment(assessment);
                      setPreviewDialogOpen(true);
                    }}>
                      <Eye className="mr-1 h-3 w-3" />
                      Preview
                    </Button>
                    <Button size="sm" className="flex-1" asChild>
                      <Link href={`/assessment/builder?edit=${assessment.id}`}>
                        <Pencil className="mr-1 h-3 w-3" />
                        Edit
                      </Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <DataTable
              columns={columns}
              data={filteredAssessments}
              searchPlaceholder="Search assessments..."
              searchColumn="title"
            />
          </CardContent>
        </Card>
      )}

      {/* Analytics Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Historical Performance
          </CardTitle>
          <CardDescription>Assessment performance trends over the past months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            {historicalPerformance.map((data) => (
              <div key={data.month} className="text-center p-4 rounded-lg bg-muted/50">
                <p className="text-sm text-muted-foreground">{data.month}</p>
                <p className="text-2xl font-bold mt-1">{data.avgScore}%</p>
                <p className="text-xs text-muted-foreground mt-1">{data.submissions} submissions</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Import Dialog */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Assessments</DialogTitle>
            <DialogDescription>
              Import assessments from QTI files or upload in bulk
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="border-2 border-dashed rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports QTI, CSV, and ZIP formats
              </p>
              <Button variant="outline" className="mt-4">
                Browse Files
              </Button>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Supported formats:</p>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>- QTI 2.1/2.2 packages (.zip)</li>
                <li>- CSV with question data</li>
                <li>- Moodle XML exports</li>
              </ul>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportDialogOpen(false)}>
              Cancel
            </Button>
            <Button>Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Student Preview</DialogTitle>
            <DialogDescription>
              This is how the assessment will appear to students
            </DialogDescription>
          </DialogHeader>
          {selectedAssessment && (
            <div className="space-y-4 py-4">
              <div className="border rounded-lg p-6 space-y-4">
                <div className="text-center pb-4 border-b">
                  <h2 className="text-xl font-semibold">{selectedAssessment.title}</h2>
                  <div className="flex items-center justify-center gap-4 mt-2 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {selectedAssessment.duration} minutes
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      {selectedAssessment.questions} questions
                    </span>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="font-medium mb-2">Question 1 of {selectedAssessment.questions}</p>
                    <p className="text-muted-foreground">
                      Sample question content would appear here...
                    </p>
                    <div className="mt-4 space-y-2">
                      <label className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                        <input type="radio" name="q1" className="text-primary" />
                        <span>Option A</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                        <input type="radio" name="q1" className="text-primary" />
                        <span>Option B</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                        <input type="radio" name="q1" className="text-primary" />
                        <span>Option C</span>
                      </label>
                      <label className="flex items-center gap-2 p-2 rounded border cursor-pointer hover:bg-muted/50">
                        <input type="radio" name="q1" className="text-primary" />
                        <span>Option D</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPreviewDialogOpen(false)}>
              Close
            </Button>
            <Button asChild>
              <Link href={`/assessment/builder?edit=${selectedAssessment?.id}`}>
                Edit Assessment
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
