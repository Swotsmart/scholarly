'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { AIInsight } from '@/types/teacher';
import {
  BookOpen, Brain, Shield, TrendingUp, AlertTriangle,
  Users, Download, Sparkles, Calculator,
} from 'lucide-react';

interface StudentUser {
  id: string;
  displayName: string;
  email: string;
  trustScore: number;
  status: string;
}

interface MathGradebookEntry {
  id:                  string;
  studentId:           string;
  studentName:         string;
  title:               string;
  purpose:             string;
  strand:              string;
  total:               number;
  visualisationScore:  number;
  constructionScore:   number;
  eleganceScore:       number;
  submittedAt:         string;
}

export default function TeacherGradebookPage() {
  const { data: teacherData, isLoading: insightsLoading } = useTeacher({ page: 'gradebook' });
  const [students, setStudents]           = useState<StudentUser[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');
  const [activeTab, setActiveTab]         = useState('students');
  const [mathEntries, setMathEntries]     = useState<MathGradebookEntry[]>([]);
  const [mathLoading, setMathLoading]     = useState(false);

  const classBreakdown = teacherData?.analytics?.data?.classBreakdown ?? [];
  const insights       = teacherData?.insights ?? [];

  useEffect(() => {
    if (classBreakdown.length > 0 && !selectedClass) setSelectedClass(classBreakdown[0].classId);
  }, [classBreakdown, selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    setStudentsLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/users?role=learner&pageSize=50`, { credentials: 'include' })
      .then(r => r.json()).then(d => setStudents(d.users ?? [])).catch(() => {}).finally(() => setStudentsLoading(false));
  }, [selectedClass]);

  // Fetch MathCanvas submissions when switching to that tab
  useEffect(() => {
    if (activeTab !== 'mathcanvas' || !selectedClass) return;
    setMathLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/gradebook/mathcanvas?classId=${selectedClass}`, { credentials: 'include' })
      .then(r => r.json()).then(d => setMathEntries(d.entries ?? [])).catch(() => {})
      .finally(() => setMathLoading(false));
  }, [activeTab, selectedClass]);

  const selectedClassData = classBreakdown.find(c => c.classId === selectedClass);
  const atRiskIds = new Set(insights.filter(i => i.source === 'ml-at-risk').flatMap(i => i.relatedStudentIds ?? []));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Gradebook</h1>
          <p className="text-muted-foreground">Student performance overview with AI-powered insights</p>
        </div>
        <Button variant="outline" onClick={() => {
          const headers = ['Student', 'Status', 'Trust Score', 'At Risk'];
          const rows = students.map(s => [
            s.displayName, s.status, String(s.trustScore), atRiskIds.has(s.id) ? 'Yes' : 'No',
          ]);
          const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a'); a.href = url; a.download = 'gradebook.csv'; a.click();
        }}>
          <Download className="h-4 w-4 mr-2" />Export CSV
        </Button>
      </div>

      {/* Class selector */}
      {classBreakdown.length > 0 && (
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select class" />
          </SelectTrigger>
          <SelectContent>
            {classBreakdown.map(c => (
              <SelectItem key={c.classId} value={c.classId}>{c.className}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card className="border-amber-200 bg-amber-50/40 dark:bg-amber-900/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-amber-500" />AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {insightsLoading
              ? <Skeleton className="h-10 w-full" />
              : insights.slice(0, 3).map((insight, i) => (
                  <div key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                    <Brain className="h-3.5 w-3.5 mt-0.5 text-amber-500 shrink-0" />
                    <span>{insight.description || insight.title}</span>
                  </div>
                ))
            }
          </CardContent>
        </Card>
      )}

      {/* Tabbed grade views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="students">
            <Users className="h-3.5 w-3.5 mr-1.5" />Students
          </TabsTrigger>
          <TabsTrigger value="mathcanvas">
            <Calculator className="h-3.5 w-3.5 mr-1.5" />MathCanvas
          </TabsTrigger>
        </TabsList>

        {/* ── Existing student list tab ── */}
        <TabsContent value="students">
          <Card>
            <CardHeader>
              <CardTitle>Student Grades</CardTitle>
              {selectedClassData && (
                <CardDescription>
                  {selectedClassData.studentCount} students · Avg score: {selectedClassData.averageScore?.toFixed(0) ?? '—'}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {studentsLoading ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : students.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No students found for this class.</p>
              ) : (
                <div className="space-y-2">
                  {students.map(s => (
                    <div key={s.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-semibold">
                          {s.displayName.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{s.displayName}</span>
                            {atRiskIds.has(s.id) && (
                              <Badge variant="destructive" className="text-xs gap-1">
                                <AlertTriangle className="h-3 w-3" />At Risk
                              </Badge>
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground">{s.email}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 text-right">
                        <div>
                          <div className="text-xs text-muted-foreground">Trust Score</div>
                          <div className="flex items-center gap-1">
                            <Shield className="h-3 w-3 text-blue-500" />
                            <span className="text-sm font-semibold">{s.trustScore}</span>
                          </div>
                        </div>
                        <Badge variant={s.status === 'active' ? 'default' : 'secondary'} className="text-xs">
                          {s.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── MathCanvas submissions tab ── */}
        <TabsContent value="mathcanvas">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calculator className="h-4 w-4 text-blue-500" />
                MathCanvas Submissions
              </CardTitle>
              <CardDescription>
                Formal assessment artifacts submitted by students from MathCanvas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {mathLoading ? (
                <div className="space-y-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="p-4 border rounded-lg">
                      <Skeleton className="h-16 w-full" />
                    </div>
                  ))}
                </div>
              ) : mathEntries.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Calculator className="h-10 w-10 mx-auto mb-3 opacity-30" />
                  <p className="text-sm font-medium">No MathCanvas submissions yet</p>
                  <p className="text-xs mt-1">
                    Students submit via the Assess button in MathCanvas. Results appear here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {mathEntries.map(entry => (
                    <div
                      key={entry.id}
                      className="p-4 border-l-4 border-blue-400 bg-blue-50/30 dark:bg-blue-900/10 rounded-r-lg"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-sm">{entry.studentName}</span>
                            <Badge variant="outline" className="text-xs">{entry.purpose}</Badge>
                            <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20">
                              {entry.strand}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{entry.title}</p>
                        </div>
                        <div className="text-right shrink-0 ml-4">
                          <div className="text-xl font-bold text-blue-600">{entry.total}/100</div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(entry.submittedAt).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { label: 'Visualisation', val: entry.visualisationScore },
                          { label: 'Construction',  val: entry.constructionScore  },
                          { label: 'Elegance',      val: entry.eleganceScore      },
                        ].map(({ label, val }) => (
                          <div
                            key={label}
                            className="text-center p-2 bg-white/70 dark:bg-gray-800/40 rounded border border-blue-100 dark:border-blue-900/30"
                          >
                            <div className="text-xs text-muted-foreground mb-1">{label}</div>
                            <div className="font-bold text-sm text-blue-600">{val}</div>
                            <Progress value={val} className="h-1 mt-1" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
