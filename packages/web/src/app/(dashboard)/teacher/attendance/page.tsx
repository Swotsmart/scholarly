'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useTeacher } from '@/hooks/use-teacher';
import {
  CheckCircle2, XCircle, Clock, Users, Calendar, AlertTriangle, Brain, Shield,
} from 'lucide-react';

interface StudentUser {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  status: string;
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'unmarked';

export default function TeacherAttendancePage() {
  const { data: teacherData, isLoading: analyticsLoading } = useTeacher({ page: 'attendance' });

  const [students, setStudents] = useState<StudentUser[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(true);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});

  const classBreakdown = teacherData?.analytics?.data?.classBreakdown ?? [];
  const overview = teacherData?.analytics?.data?.overview;

  // Auto-select first class
  useEffect(() => {
    if (classBreakdown.length > 0 && !selectedClass) {
      setSelectedClass(classBreakdown[0].classId);
    }
  }, [classBreakdown, selectedClass]);

  // Fetch students when class changes
  useEffect(() => {
    if (!selectedClass) return;
    setStudentsLoading(true);
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/v1/users?role=learner&pageSize=50`, { credentials: 'include' })
      .then(r => r.json())
      .then((data) => {
        setStudents(data.users);
        // Initialise attendance to unmarked
        const initial: Record<string, AttendanceStatus> = {};
        data.users.forEach((s: StudentUser) => { initial[s.id] = 'unmarked'; });
        setAttendance(initial);
      })
      .catch(() => {})
      .finally(() => setStudentsLoading(false));
  }, [selectedClass]);

  function markAttendance(studentId: string, status: AttendanceStatus) {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  }

  const totalStudents = students.length;
  const presentCount = Object.values(attendance).filter(s => s === 'present').length;
  const absentCount = Object.values(attendance).filter(s => s === 'absent').length;
  const lateCount = Object.values(attendance).filter(s => s === 'late').length;
  const unmarkedCount = Object.values(attendance).filter(s => s === 'unmarked').length;
  const selectedClassData = classBreakdown.find(c => c.classId === selectedClass);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Attendance</h1>
          <p className="text-muted-foreground">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
        </div>
        <Button disabled={unmarkedCount > 0}>
          <CheckCircle2 className="mr-2 h-4 w-4" />
          {unmarkedCount > 0 ? `${unmarkedCount} unmarked` : 'Submit Attendance'}
        </Button>
      </div>

      {/* AI attendance insight */}
      {overview && (
        <Card className="border-purple-200/50 dark:border-purple-800/30 bg-gradient-to-r from-purple-50/30 to-transparent dark:from-purple-900/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <Brain className="h-5 w-5 text-purple-500 shrink-0" />
              <p className="text-sm text-muted-foreground">
                Current attendance rate across your classes: {overview.attendanceRate}%.
                {overview.attendanceRate >= 95 ? ' Excellent attendance.' : overview.attendanceRate >= 85 ? ' Healthy attendance.' : ' Attendance could use attention — consider reaching out to frequently absent students.'}
              </p>
              <Badge variant="outline" className="text-xs shrink-0"><Shield className="h-2.5 w-2.5 mr-1" />LIS</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Class Selector */}
      <div className="flex items-center gap-4">
        <Select value={selectedClass} onValueChange={setSelectedClass}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Select a class" />
          </SelectTrigger>
          <SelectContent>
            {analyticsLoading ? (
              <SelectItem value="loading" disabled>Loading classes...</SelectItem>
            ) : classBreakdown.length > 0 ? (
              classBreakdown.map((cls) => (
                <SelectItem key={cls.classId} value={cls.classId}>{cls.className} ({cls.studentCount} students)</SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>No classes available</SelectItem>
            )}
          </SelectContent>
        </Select>

        {selectedClassData && (
          <span className="text-sm text-muted-foreground">{selectedClassData.studentCount} students</span>
        )}
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-green-500/10 p-2"><CheckCircle2 className="h-5 w-5 text-green-500" /></div><div><p className="text-xl font-bold">{presentCount}</p><p className="text-xs text-muted-foreground">Present</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-red-500/10 p-2"><XCircle className="h-5 w-5 text-red-500" /></div><div><p className="text-xl font-bold">{absentCount}</p><p className="text-xs text-muted-foreground">Absent</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-orange-500/10 p-2"><Clock className="h-5 w-5 text-orange-500" /></div><div><p className="text-xl font-bold">{lateCount}</p><p className="text-xs text-muted-foreground">Late</p></div></CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3"><div className="rounded-lg bg-gray-500/10 p-2"><Users className="h-5 w-5 text-gray-500" /></div><div><p className="text-xl font-bold">{unmarkedCount}</p><p className="text-xs text-muted-foreground">Unmarked</p></div></CardContent></Card>
      </div>

      {/* Student Roll */}
      <Card>
        <CardHeader>
          <CardTitle>Student Roll</CardTitle>
          <CardDescription>Mark attendance for each student</CardDescription>
        </CardHeader>
        <CardContent>
          {studentsLoading ? (
            <div className="space-y-3">{[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}</div>
          ) : students.length > 0 ? (
            <div className="space-y-2">
              {students.map((student) => {
                const status = attendance[student.id] || 'unmarked';
                return (
                  <div key={student.id} className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${status === 'present' ? 'bg-green-50/50 dark:bg-green-900/10' : status === 'absent' ? 'bg-red-50/50 dark:bg-red-900/10' : status === 'late' ? 'bg-orange-50/50 dark:bg-orange-900/10' : ''}`}>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{student.displayName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium">{student.displayName}</p>
                        <p className="text-xs text-muted-foreground">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant={status === 'present' ? 'default' : 'outline'} className={status === 'present' ? 'bg-green-600 hover:bg-green-700' : ''} onClick={() => markAttendance(student.id, 'present')}>
                        <CheckCircle2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant={status === 'late' ? 'default' : 'outline'} className={status === 'late' ? 'bg-orange-600 hover:bg-orange-700' : ''} onClick={() => markAttendance(student.id, 'late')}>
                        <Clock className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant={status === 'absent' ? 'default' : 'outline'} className={status === 'absent' ? 'bg-red-600 hover:bg-red-700' : ''} onClick={() => markAttendance(student.id, 'absent')}>
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">No students found for this class.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
