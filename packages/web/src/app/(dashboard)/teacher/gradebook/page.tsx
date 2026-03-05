'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { AIInsight } from '@/types/teacher';
import { BookOpen, Brain, Shield, TrendingUp, AlertTriangle, Users, Download, Sparkles } from 'lucide-react';

interface StudentUser { id: string; displayName: string; email: string; trustScore: number; status: string; }

export default function TeacherGradebookPage() {
  const { data: teacherData, isLoading: insightsLoading } = useTeacher({ page: 'gradebook' });
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState('');

  const classBreakdown = teacherData?.analytics?.data?.classBreakdown ?? [];
  const insights = teacherData?.insights ?? [];

  useEffect(() => {
    if (classBreakdown.length > 0 && !selectedClass) setSelectedClass(classBreakdown[0].classId);
  }, [classBreakdown, selectedClass]);

  useEffect(() => {
    if (!selectedClass) return;
    setStudentsLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/users?role=learner&pageSize=50`, { credentials: 'include' })
      .then(r => r.json()).then(d => setStudents(d.users)).catch(() => {}).finally(() => setStudentsLoading(false));
  }, [selectedClass]);

  const selectedClassData = classBreakdown.find(c => c.classId === selectedClass);
  const atRiskIds = new Set(insights.filter(i => i.source === 'ml-at-risk').flatMap(i => i.relatedStudentIds ?? []));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="heading-2">Gradebook</h1><p className="text-muted-foreground">Student performance overview with AI-powered insights</p></div>
        <Button variant="outline"><Download className="mr-2 h-4 w-4" />Export</Button>
      </div>

      {insights.length > 0 && (
        <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
          <CardContent className="py-4"><div className="flex items-center gap-3"><Sparkles className="h-5 w-5 text-purple-500 shrink-0" /><p className="text-sm text-muted-foreground">{insights[0].description}</p><Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge></div></CardContent>
        </Card>
      )}

      <Select value={selectedClass} onValueChange={setSelectedClass}>
        <SelectTrigger className="w-64"><SelectValue placeholder="Select class" /></SelectTrigger>
        <SelectContent>{classBreakdown.map(c => <SelectItem key={c.classId} value={c.classId}>{c.className}</SelectItem>)}{classBreakdown.length === 0 && <SelectItem value="none" disabled>Loading...</SelectItem>}</SelectContent>
      </Select>

      {selectedClassData && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{selectedClassData.studentCount}</p><p className="text-xs text-muted-foreground">Students</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{selectedClassData.averageScore}%</p><p className="text-xs text-muted-foreground">Average Score</p></CardContent></Card>
          <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold text-orange-600">{[...atRiskIds].length}</p><p className="text-xs text-muted-foreground">At-Risk</p></CardContent></Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle>Student Grades</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full">
            <thead><tr className="border-b"><th className="p-3 text-left font-medium">Student</th><th className="p-3 text-left font-medium">Status</th><th className="p-3 text-left font-medium">Trust Score</th><th className="p-3 text-left font-medium">AI Flag</th></tr></thead>
            <tbody>
              {studentsLoading ? [1,2,3,4,5].map(i => <tr key={i} className="border-b"><td className="p-3" colSpan={4}><Skeleton className="h-8 w-full" /></td></tr>) : students.length > 0 ? students.map(s => (
                <tr key={s.id} className="border-b hover:bg-muted/50">
                  <td className="p-3 font-medium">{s.displayName}</td>
                  <td className="p-3"><Badge variant="secondary" className="capitalize text-xs">{s.status}</Badge></td>
                  <td className="p-3">{s.trustScore}</td>
                  <td className="p-3">{atRiskIds.has(s.id) ? <Badge variant="outline" className="border-orange-200 text-orange-700 text-xs"><AlertTriangle className="h-3 w-3 mr-1" />At Risk</Badge> : <span className="text-xs text-muted-foreground">—</span>}</td>
                </tr>
              )) : <tr><td colSpan={4} className="p-8 text-center text-muted-foreground">No students found.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
