'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Calendar,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react';

// Mock data
const classes = [
  { id: 'c1', name: 'Year 10 Design & Tech', time: '9:00 AM', room: 'Room 204', students: 28 },
  { id: 'c2', name: 'Year 11 Innovation Lab', time: '10:30 AM', room: 'Lab 3', students: 24 },
  { id: 'c3', name: 'Year 12 PBL', time: '1:00 PM', room: 'Room 312', students: 18 },
];

const students = [
  { id: 's1', name: 'Emma Thompson', avatar: null, status: 'present' },
  { id: 's2', name: 'James Chen', avatar: null, status: 'present' },
  { id: 's3', name: 'Sophie Williams', avatar: null, status: 'absent' },
  { id: 's4', name: 'Michael Brown', avatar: null, status: 'present' },
  { id: 's5', name: 'Olivia Martinez', avatar: null, status: 'late' },
  { id: 's6', name: 'Liam Davis', avatar: null, status: 'present' },
  { id: 's7', name: 'Ava Wilson', avatar: null, status: 'present' },
  { id: 's8', name: 'Noah Garcia', avatar: null, status: null },
];

type AttendanceStatus = 'present' | 'absent' | 'late' | null;

export default function TeacherAttendancePage() {
  const [selectedClass, setSelectedClass] = useState(classes[0].id);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>(
    Object.fromEntries(students.map(s => [s.id, s.status as AttendanceStatus]))
  );

  const currentClass = classes.find(c => c.id === selectedClass);
  const presentCount = Object.values(attendance).filter(s => s === 'present').length;
  const absentCount = Object.values(attendance).filter(s => s === 'absent').length;
  const lateCount = Object.values(attendance).filter(s => s === 'late').length;
  const unmarkedCount = Object.values(attendance).filter(s => s === null).length;

  const markAttendance = (studentId: string, status: AttendanceStatus) => {
    setAttendance(prev => ({ ...prev, [studentId]: status }));
  };

  const markAllPresent = () => {
    setAttendance(prev =>
      Object.fromEntries(Object.keys(prev).map(id => [id, 'present']))
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Attendance</h1>
          <p className="text-muted-foreground">
            Take roll call for your classes
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{presentCount}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
                <XCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{absentCount}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{lateCount}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-500/10">
                <AlertTriangle className="h-5 w-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unmarkedCount}</p>
                <p className="text-xs text-muted-foreground">Unmarked</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class Info */}
      {currentClass && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>{currentClass.name}</CardTitle>
                <CardDescription>
                  {currentClass.time} • {currentClass.room} • {currentClass.students} students
                </CardDescription>
              </div>
              <Button onClick={markAllPresent}>Mark All Present</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {students.map(student => (
                <div
                  key={student.id}
                  className="flex items-center gap-4 rounded-lg border p-3 transition-colors hover:bg-muted/50"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={student.avatar || undefined} />
                    <AvatarFallback>
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-medium">{student.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={attendance[student.id] === 'present' ? 'default' : 'outline'}
                      className={attendance[student.id] === 'present' ? 'bg-green-500 hover:bg-green-600' : ''}
                      onClick={() => markAttendance(student.id, 'present')}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={attendance[student.id] === 'late' ? 'default' : 'outline'}
                      className={attendance[student.id] === 'late' ? 'bg-orange-500 hover:bg-orange-600' : ''}
                      onClick={() => markAttendance(student.id, 'late')}
                    >
                      <Clock className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant={attendance[student.id] === 'absent' ? 'default' : 'outline'}
                      className={attendance[student.id] === 'absent' ? 'bg-red-500 hover:bg-red-600' : ''}
                      onClick={() => markAttendance(student.id, 'absent')}
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="outline">Save Draft</Button>
        <Button>Submit Attendance</Button>
      </div>
    </div>
  );
}
