'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { AIInsight } from '@/types/teacher';
import {
  Users, Search, TrendingUp, ArrowRight, AlertCircle, CheckCircle2,
  Brain, Sparkles, Shield, AlertTriangle,
} from 'lucide-react';

interface StudentUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  roles: string[];
  trustScore: number;
  status: string;
  learnerProfile?: {
    id: string;
    subjects: { name: string }[];
  };
}

export default function TeacherStudentsPage() {
  const { data: teacherData, isLoading: insightsLoading } = useTeacher({ page: 'students' });

  const [students, setStudents] = useState<StudentUser[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);

  // Fetch student list from /users?role=learner
  useEffect(() => {
    setIsLoading(true);
    setError(null);
    const params = new URLSearchParams({ role: 'learner', page: String(page), pageSize: '20' });
    if (search.trim()) params.set('search', search.trim());

    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/users?${params}`, {
      credentials: 'include',
    })
      .then(r => { if (!r.ok) throw new Error(`Failed (${r.status})`); return r.json(); })
      .then((data) => {
        setStudents(data.users);
        setTotal(data.pagination.total);
      })
      .catch((err) => setError(err.message))
      .finally(() => setIsLoading(false));
  }, [search, page]);

  const insights = teacherData?.insights ?? [];
  const atRiskInsights = insights.filter(i => i.source === 'ml-at-risk');
  const atRiskStudentIds = new Set(atRiskInsights.flatMap(i => i.relatedStudentIds ?? []));

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Students</h1>
          <p className="text-muted-foreground">{total} students enrolled</p>
        </div>
        {atRiskInsights.length > 0 && (
          <Button variant="outline" className="border-orange-200 text-orange-700 dark:border-orange-800 dark:text-orange-400" asChild>
            <Link href="/teacher/students/at-risk">
              <AlertTriangle className="mr-2 h-4 w-4" />{atRiskInsights.length} At-Risk
            </Link>
          </Button>
        )}
      </div>

      {/* AI Summary */}
      {!insightsLoading && teacherData?.analytics?.data?.overview && (
        <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-purple-500 shrink-0" />
              <p className="text-sm">
                {teacherData.analytics.data.overview.totalStudents} students across your classes.
                Average performance at {teacherData.analytics.data.overview.averagePerformance}%.
                {atRiskInsights.length > 0
                  ? ` ${atRiskInsights.length} student${atRiskInsights.length > 1 ? 's' : ''} flagged by AI risk detection.`
                  : ' No at-risk students detected.'}
              </p>
              <Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search students by name or email..."
          className="pl-10"
          value={searchInput}
          onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
        />
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-4"><p className="text-sm text-red-600 dark:text-red-400">Unable to load students: {error}</p></CardContent>
        </Card>
      )}

      {/* Student List */}
      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3, 4, 5].map((i) => (
            <Card key={i}><CardContent className="p-4"><div className="flex items-center gap-4"><Skeleton className="h-10 w-10 rounded-full" /><div className="flex-1 space-y-2"><Skeleton className="h-4 w-48" /><Skeleton className="h-3 w-32" /></div></div></CardContent></Card>
          ))
        ) : students.length > 0 ? (
          students.map((student) => {
            const isAtRisk = atRiskStudentIds.has(student.id);
            const studentInsight = atRiskInsights.find(i => i.relatedStudentIds?.includes(student.id));

            return (
              <Card key={student.id} className={isAtRisk ? 'border-orange-200 dark:border-orange-800/50' : ''}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold">
                      {student.displayName?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Link href={`/teacher/students/${student.id}`} className="font-medium hover:underline">{student.displayName}</Link>
                        {isAtRisk && (
                          <Badge variant="outline" className="border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:text-orange-400 text-xs">
                            <AlertTriangle className="h-3 w-3 mr-1" />At Risk
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs capitalize">{student.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                      {studentInsight && (
                        <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                          <Brain className="inline h-3 w-3 mr-1" />{studentInsight.description}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right text-sm text-muted-foreground">
                        Trust: {student.trustScore}
                      </div>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/teacher/students/${student.id}`}>View Profile <ArrowRight className="ml-1 h-3 w-3" /></Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Card><CardContent className="p-8 text-center text-muted-foreground">No students found{search ? ` matching "${search}"` : ''}.</CardContent></Card>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
