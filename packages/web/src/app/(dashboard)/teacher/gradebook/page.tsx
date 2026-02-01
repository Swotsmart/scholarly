'use client';

/**
 * Gradebook Page
 * Spreadsheet-style view of student grades with weights and calculations
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';
import {
  FileText,
  Download,
  Upload,
  Settings,
  Search,
  Filter,
  BarChart3,
  Users,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Loader2,
  FileSpreadsheet,
  Printer,
  Mail,
  Target,
  BookOpen,
  Calculator,
  Eye,
  EyeOff,
  Columns,
  MoreHorizontal,
  ArrowLeft,
  Plus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from '@/components/ui/dropdown-menu';

// Mock students data
const students = [
  { id: 's1', name: 'Emma Smith', avatar: 'ES', email: 'emma.s@school.edu' },
  { id: 's2', name: 'James Miller', avatar: 'JM', email: 'james.m@school.edu' },
  { id: 's3', name: 'Ava Davis', avatar: 'AD', email: 'ava.d@school.edu' },
  { id: 's4', name: 'Noah Williams', avatar: 'NW', email: 'noah.w@school.edu' },
  { id: 's5', name: 'Olivia Brown', avatar: 'OB', email: 'olivia.b@school.edu' },
  { id: 's6', name: 'Liam Johnson', avatar: 'LJ', email: 'liam.j@school.edu' },
  { id: 's7', name: 'Sophia Martinez', avatar: 'SM', email: 'sophia.m@school.edu' },
  { id: 's8', name: 'Mason Garcia', avatar: 'MG', email: 'mason.g@school.edu' },
];

// Mock assessments data
const assessments = [
  { id: 'a1', title: 'Algebra Quiz 1', category: 'quiz', maxScore: 20, dueDate: '2024-01-10', weight: 1 },
  { id: 'a2', title: 'Homework Set 1', category: 'homework', maxScore: 10, dueDate: '2024-01-12', weight: 1 },
  { id: 'a3', title: 'Midterm Exam', category: 'test', maxScore: 100, dueDate: '2024-01-15', weight: 2 },
  { id: 'a4', title: 'Project: Data Analysis', category: 'project', maxScore: 50, dueDate: '2024-01-18', weight: 1.5 },
  { id: 'a5', title: 'Class Participation', category: 'participation', maxScore: 10, dueDate: '2024-01-20', weight: 0.5 },
  { id: 'a6', title: 'Homework Set 2', category: 'homework', maxScore: 10, dueDate: '2024-01-22', weight: 1 },
  { id: 'a7', title: 'Algebra Quiz 2', category: 'quiz', maxScore: 20, dueDate: '2024-01-25', weight: 1 },
];

// Mock grades data
const gradesData: Record<string, Record<string, number | null>> = {
  's1': { 'a1': 18, 'a2': 9, 'a3': 85, 'a4': 45, 'a5': 9, 'a6': 10, 'a7': 17 },
  's2': { 'a1': 15, 'a2': 8, 'a3': 72, 'a4': 38, 'a5': 8, 'a6': 7, 'a7': null },
  's3': { 'a1': 20, 'a2': 10, 'a3': 92, 'a4': 48, 'a5': 10, 'a6': 9, 'a7': 19 },
  's4': { 'a1': 12, 'a2': 6, 'a3': 65, 'a4': null, 'a5': 7, 'a6': 8, 'a7': 14 },
  's5': { 'a1': 16, 'a2': 9, 'a3': 78, 'a4': 42, 'a5': 9, 'a6': null, 'a7': 16 },
  's6': { 'a1': 19, 'a2': 10, 'a3': 88, 'a4': 46, 'a5': 10, 'a6': 10, 'a7': 18 },
  's7': { 'a1': 14, 'a2': 7, 'a3': 70, 'a4': 35, 'a5': 6, 'a6': 8, 'a7': 15 },
  's8': { 'a1': 17, 'a2': 8, 'a3': 82, 'a4': 44, 'a5': 8, 'a6': 9, 'a7': null },
};

// Category weights
const categoryWeights = {
  quiz: { name: 'Quizzes', weight: 20, color: 'bg-blue-500' },
  homework: { name: 'Homework', weight: 15, color: 'bg-green-500' },
  test: { name: 'Tests', weight: 40, color: 'bg-purple-500' },
  project: { name: 'Projects', weight: 20, color: 'bg-amber-500' },
  participation: { name: 'Participation', weight: 5, color: 'bg-cyan-500' },
};

// Curriculum standards for standards-based view
const standards = [
  { code: 'ACMNA208', description: 'Linear equations', mastery: 75 },
  { code: 'ACMNA209', description: 'Graphing', mastery: 82 },
  { code: 'ACMNA210', description: 'Gradients', mastery: 68 },
  { code: 'ACMNA211', description: 'Index laws', mastery: 71 },
];

type ViewMode = 'traditional' | 'standards';
type Category = keyof typeof categoryWeights;

export default function GradebookPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('traditional');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClass, setSelectedClass] = useState('year9-math-a');
  const [showWeightsDialog, setShowWeightsDialog] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showAIReportDialog, setShowAIReportDialog] = useState(false);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>(assessments.map(a => a.id));
  const [editingCell, setEditingCell] = useState<{ studentId: string; assessmentId: string } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [grades, setGrades] = useState(gradesData);
  const [weights, setWeights] = useState(categoryWeights);

  // Filter students by search
  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate weighted average for a student
  const calculateWeightedAverage = (studentId: string) => {
    const studentGrades = grades[studentId];
    if (!studentGrades) return null;

    let totalWeightedScore = 0;
    let totalWeight = 0;

    assessments.forEach(assessment => {
      const score = studentGrades[assessment.id];
      if (score !== null && score !== undefined) {
        const percentage = (score / assessment.maxScore) * 100;
        const categoryWeight = weights[assessment.category as Category].weight;
        totalWeightedScore += percentage * categoryWeight * assessment.weight;
        totalWeight += categoryWeight * assessment.weight;
      }
    });

    return totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : null;
  };

  // Calculate class average for an assessment
  const calculateAssessmentAverage = (assessmentId: string) => {
    const assessment = assessments.find(a => a.id === assessmentId);
    if (!assessment) return null;

    let total = 0;
    let count = 0;

    Object.values(grades).forEach(studentGrades => {
      const score = studentGrades[assessmentId];
      if (score !== null && score !== undefined) {
        total += (score / assessment.maxScore) * 100;
        count++;
      }
    });

    return count > 0 ? Math.round(total / count) : null;
  };

  // Get letter grade
  const getLetterGrade = (percentage: number | null) => {
    if (percentage === null) return '-';
    if (percentage >= 90) return 'A';
    if (percentage >= 80) return 'B';
    if (percentage >= 70) return 'C';
    if (percentage >= 60) return 'D';
    return 'F';
  };

  // Get grade color
  const getGradeColor = (percentage: number | null) => {
    if (percentage === null) return 'text-muted-foreground';
    if (percentage >= 80) return 'text-green-600';
    if (percentage >= 60) return 'text-amber-600';
    return 'text-red-600';
  };

  // Handle grade edit
  const handleGradeEdit = (studentId: string, assessmentId: string) => {
    const currentGrade = grades[studentId]?.[assessmentId];
    setEditingCell({ studentId, assessmentId });
    setEditValue(currentGrade !== null && currentGrade !== undefined ? String(currentGrade) : '');
  };

  // Save grade edit
  const handleGradeSave = () => {
    if (!editingCell) return;

    const { studentId, assessmentId } = editingCell;
    const newValue = editValue === '' ? null : parseFloat(editValue);

    setGrades(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        [assessmentId]: newValue,
      },
    }));

    setEditingCell(null);
    setEditValue('');
  };

  // Generate AI report
  const handleGenerateReport = async () => {
    setIsGeneratingReport(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsGeneratingReport(false);
  };

  // Class statistics
  const classStats = useMemo(() => {
    const averages = students.map(s => calculateWeightedAverage(s.id)).filter(a => a !== null) as number[];
    const avg = averages.length > 0 ? Math.round(averages.reduce((a, b) => a + b, 0) / averages.length) : 0;
    const passing = averages.filter(a => a >= 60).length;
    const atRisk = averages.filter(a => a < 60).length;
    return { avg, passing, atRisk, total: students.length };
  }, [grades]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gradebook"
        description="Manage and track student grades"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/teacher/grading">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Grading Queue
              </Link>
            </Button>
            <Button variant="outline" onClick={() => setShowExportDialog(true)}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
            <Button variant="outline" onClick={() => setShowAIReportDialog(true)}>
              <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
              AI Reports
            </Button>
          </div>
        }
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          label="Class Average"
          value={`${classStats.avg}%`}
          icon={BarChart3}
          variant="primary"
          change={3}
        />
        <StatsCard
          label="Students Passing"
          value={classStats.passing}
          icon={CheckCircle2}
          variant="success"
          subtitle={`of ${classStats.total} students`}
        />
        <StatsCard
          label="At Risk"
          value={classStats.atRisk}
          icon={AlertCircle}
          variant="error"
          subtitle="below 60%"
        />
        <StatsCard
          label="Assessments"
          value={assessments.length}
          icon={FileText}
          variant="primary"
        />
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-2">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="year9-math-a">Year 9 Mathematics A</SelectItem>
                  <SelectItem value="year9-math-b">Year 9 Mathematics B</SelectItem>
                  <SelectItem value="year10-math-a">Year 10 Mathematics A</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 w-[200px]"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
                <TabsList>
                  <TabsTrigger value="traditional">
                    <Calculator className="mr-2 h-4 w-4" />
                    Traditional
                  </TabsTrigger>
                  <TabsTrigger value="standards">
                    <Target className="mr-2 h-4 w-4" />
                    Standards
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" onClick={() => setShowWeightsDialog(true)}>
                <Settings className="mr-2 h-4 w-4" />
                Weights
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Columns className="mr-2 h-4 w-4" />
                    Columns
                    <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  {assessments.map(assessment => (
                    <DropdownMenuCheckboxItem
                      key={assessment.id}
                      checked={visibleColumns.includes(assessment.id)}
                      onCheckedChange={(checked) => {
                        setVisibleColumns(prev =>
                          checked
                            ? [...prev, assessment.id]
                            : prev.filter(id => id !== assessment.id)
                        );
                      }}
                    >
                      {assessment.title}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Weights Summary */}
      <div className="grid gap-2 md:grid-cols-5">
        {Object.entries(weights).map(([key, category]) => (
          <Card key={key}>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <div className={cn('w-3 h-3 rounded-full', category.color)} />
                <span className="text-sm font-medium">{category.name}</span>
                <Badge variant="outline" className="ml-auto">{category.weight}%</Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Gradebook Table */}
      {viewMode === 'traditional' ? (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="sticky left-0 z-20 bg-muted/50 px-4 py-3 text-left text-sm font-medium min-w-[200px]">
                      Student
                    </th>
                    {assessments
                      .filter(a => visibleColumns.includes(a.id))
                      .map(assessment => (
                        <th
                          key={assessment.id}
                          className="px-3 py-2 text-center text-sm font-medium min-w-[100px]"
                        >
                          <div className="flex flex-col items-center gap-1">
                            <span className="truncate max-w-[90px]" title={assessment.title}>
                              {assessment.title}
                            </span>
                            <div className="flex items-center gap-1">
                              <div className={cn('w-2 h-2 rounded-full', weights[assessment.category as Category].color)} />
                              <span className="text-xs text-muted-foreground">/{assessment.maxScore}</span>
                            </div>
                          </div>
                        </th>
                      ))}
                    <th className="sticky right-0 z-20 bg-muted/50 px-4 py-3 text-center text-sm font-medium min-w-[100px]">
                      Average
                    </th>
                    <th className="sticky right-0 z-20 bg-muted/50 px-4 py-3 text-center text-sm font-medium min-w-[80px]">
                      Grade
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => {
                    const average = calculateWeightedAverage(student.id);
                    return (
                      <tr key={student.id} className="border-b hover:bg-muted/30">
                        <td className="sticky left-0 z-10 bg-background px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                              {student.avatar}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{student.name}</p>
                              <p className="text-xs text-muted-foreground">{student.email}</p>
                            </div>
                          </div>
                        </td>
                        {assessments
                          .filter(a => visibleColumns.includes(a.id))
                          .map(assessment => {
                            const score = grades[student.id]?.[assessment.id];
                            const percentage = score !== null && score !== undefined
                              ? Math.round((score / assessment.maxScore) * 100)
                              : null;
                            const isEditing = editingCell?.studentId === student.id &&
                              editingCell?.assessmentId === assessment.id;

                            return (
                              <td
                                key={assessment.id}
                                className="px-3 py-2 text-center text-sm cursor-pointer hover:bg-muted/50"
                                onClick={() => !isEditing && handleGradeEdit(student.id, assessment.id)}
                              >
                                {isEditing ? (
                                  <Input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onBlur={handleGradeSave}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleGradeSave();
                                      if (e.key === 'Escape') {
                                        setEditingCell(null);
                                        setEditValue('');
                                      }
                                    }}
                                    className="w-16 h-8 text-center mx-auto"
                                    autoFocus
                                    min={0}
                                    max={assessment.maxScore}
                                  />
                                ) : score !== null && score !== undefined ? (
                                  <div className="flex flex-col items-center">
                                    <span className={getGradeColor(percentage)}>{score}</span>
                                    <span className="text-xs text-muted-foreground">{percentage}%</span>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </td>
                            );
                          })}
                        <td className="sticky right-0 z-10 bg-background px-4 py-3 text-center">
                          <div className="flex flex-col items-center">
                            <span className={cn('font-bold', getGradeColor(average))}>
                              {average !== null ? `${average}%` : '-'}
                            </span>
                            <Progress
                              value={average || 0}
                              className="h-1 w-16 mt-1"
                              indicatorClassName={cn(
                                average !== null && average >= 80 ? 'bg-green-500' :
                                average !== null && average >= 60 ? 'bg-amber-500' :
                                'bg-red-500'
                              )}
                            />
                          </div>
                        </td>
                        <td className="sticky right-0 z-10 bg-background px-4 py-3 text-center">
                          <Badge
                            variant={
                              average !== null && average >= 80 ? 'success' :
                              average !== null && average >= 60 ? 'warning' :
                              'destructive'
                            }
                          >
                            {getLetterGrade(average)}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/30 font-medium">
                    <td className="sticky left-0 z-10 bg-muted/30 px-4 py-3">
                      Class Average
                    </td>
                    {assessments
                      .filter(a => visibleColumns.includes(a.id))
                      .map(assessment => {
                        const avg = calculateAssessmentAverage(assessment.id);
                        return (
                          <td key={assessment.id} className="px-3 py-2 text-center text-sm">
                            <span className={getGradeColor(avg)}>
                              {avg !== null ? `${avg}%` : '-'}
                            </span>
                          </td>
                        );
                      })}
                    <td className="sticky right-0 z-10 bg-muted/30 px-4 py-3 text-center">
                      <span className={cn('font-bold', getGradeColor(classStats.avg))}>
                        {classStats.avg}%
                      </span>
                    </td>
                    <td className="sticky right-0 z-10 bg-muted/30 px-4 py-3 text-center">
                      <Badge variant="secondary">{getLetterGrade(classStats.avg)}</Badge>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Standards-Based View */
        <Card>
          <CardHeader>
            <CardTitle>Standards-Based Grading</CardTitle>
            <CardDescription>Track student mastery of curriculum standards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="sticky left-0 z-20 bg-muted/50 px-4 py-3 text-left text-sm font-medium min-w-[200px]">
                      Student
                    </th>
                    {standards.map(standard => (
                      <th key={standard.code} className="px-3 py-2 text-center text-sm font-medium min-w-[120px]">
                        <div className="flex flex-col items-center gap-1">
                          <span className="font-mono">{standard.code}</span>
                          <span className="text-xs text-muted-foreground">{standard.description}</span>
                        </div>
                      </th>
                    ))}
                    <th className="px-4 py-3 text-center text-sm font-medium">Overall Mastery</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student) => (
                    <tr key={student.id} className="border-b hover:bg-muted/30">
                      <td className="sticky left-0 z-10 bg-background px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium">
                            {student.avatar}
                          </div>
                          <span className="font-medium text-sm">{student.name}</span>
                        </div>
                      </td>
                      {standards.map(standard => {
                        // Mock mastery levels per student
                        const mastery = Math.round(standard.mastery + (Math.random() * 20 - 10));
                        return (
                          <td key={standard.code} className="px-3 py-2 text-center">
                            <div className="flex flex-col items-center gap-1">
                              <Badge
                                variant={
                                  mastery >= 80 ? 'success' :
                                  mastery >= 60 ? 'warning' :
                                  'destructive'
                                }
                              >
                                {mastery >= 80 ? 'Proficient' :
                                 mastery >= 60 ? 'Developing' :
                                 'Beginning'}
                              </Badge>
                              <span className="text-xs text-muted-foreground">{mastery}%</span>
                            </div>
                          </td>
                        );
                      })}
                      <td className="px-4 py-3 text-center">
                        <Progress value={75} className="h-2 w-24 mx-auto" />
                        <span className="text-xs text-muted-foreground">75%</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Weights Configuration Dialog */}
      <Dialog open={showWeightsDialog} onOpenChange={setShowWeightsDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Category Weights</DialogTitle>
            <DialogDescription>
              Configure how each category contributes to the final grade
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {Object.entries(weights).map(([key, category]) => (
              <div key={key} className="flex items-center gap-4">
                <div className={cn('w-4 h-4 rounded-full', category.color)} />
                <Label className="flex-1">{category.name}</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={category.weight}
                    onChange={(e) => setWeights(prev => ({
                      ...prev,
                      [key]: { ...prev[key as Category], weight: parseInt(e.target.value) || 0 }
                    }))}
                    className="w-20"
                    min={0}
                    max={100}
                  />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </div>
            ))}
            <div className="pt-4 border-t">
              <div className="flex items-center justify-between">
                <span className="font-medium">Total</span>
                <span className={cn(
                  'font-bold',
                  Object.values(weights).reduce((sum, c) => sum + c.weight, 0) === 100
                    ? 'text-green-600'
                    : 'text-red-600'
                )}>
                  {Object.values(weights).reduce((sum, c) => sum + c.weight, 0)}%
                </span>
              </div>
              {Object.values(weights).reduce((sum, c) => sum + c.weight, 0) !== 100 && (
                <p className="text-sm text-red-600 mt-1">Weights must total 100%</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWeightsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowWeightsDialog(false)}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExportDialog} onOpenChange={setShowExportDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Gradebook</DialogTitle>
            <DialogDescription>
              Choose your export format and options
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="h-24 flex-col gap-2">
                <FileSpreadsheet className="h-8 w-8" />
                <span>Export to CSV</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2">
                <FileText className="h-8 w-8" />
                <span>Export to PDF</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2">
                <Printer className="h-8 w-8" />
                <span>Print Report Cards</span>
              </Button>
              <Button variant="outline" className="h-24 flex-col gap-2">
                <Mail className="h-8 w-8" />
                <span>Email to Parents</span>
              </Button>
            </div>
            <div className="space-y-2">
              <Label>Include in export:</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                  <span className="text-sm">Student names and IDs</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                  <span className="text-sm">Individual assignment scores</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                  <span className="text-sm">Weighted averages</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4" />
                  <span className="text-sm">Comments and feedback</span>
                </label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowExportDialog(false)}>
              Cancel
            </Button>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Report Generation Dialog */}
      <Dialog open={showAIReportDialog} onOpenChange={setShowAIReportDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              AI Report Generator
            </DialogTitle>
            <DialogDescription>
              Generate personalized narrative comments for report cards
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select students</Label>
              <Select defaultValue="all">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Students</SelectItem>
                  <SelectItem value="selected">Selected Students Only</SelectItem>
                  <SelectItem value="at-risk">At-Risk Students</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Report style</Label>
              <Select defaultValue="balanced">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balanced">Balanced (strengths & areas for growth)</SelectItem>
                  <SelectItem value="encouraging">Encouraging & positive</SelectItem>
                  <SelectItem value="detailed">Detailed academic analysis</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Include</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                  <span className="text-sm">Academic performance summary</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                  <span className="text-sm">Participation and effort</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked className="h-4 w-4" />
                  <span className="text-sm">Areas for improvement</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="h-4 w-4" />
                  <span className="text-sm">Specific assignment feedback</span>
                </label>
              </div>
            </div>
            {isGeneratingReport && (
              <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                <div className="flex items-center gap-3">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                  <div>
                    <p className="font-medium">Generating reports...</p>
                    <p className="text-sm text-muted-foreground">Analyzing grades and creating personalized comments</p>
                  </div>
                </div>
                <Progress value={65} className="mt-3" />
              </div>
            )}
            {!isGeneratingReport && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm font-medium mb-2">Sample Output:</p>
                <p className="text-sm text-muted-foreground italic">
                  &quot;Emma has demonstrated excellent understanding of algebraic concepts this term,
                  consistently achieving above-average scores on assessments. Her problem-solving
                  skills are particularly strong, as evidenced by her 90% on the midterm exam.
                  To continue growing, Emma might focus on showing more detailed working in
                  her solutions to strengthen her mathematical communication skills.&quot;
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAIReportDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGenerateReport} disabled={isGeneratingReport}>
              {isGeneratingReport ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Reports
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
