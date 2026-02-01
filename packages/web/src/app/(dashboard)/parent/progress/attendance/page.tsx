'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, XCircle, Clock, Calendar, AlertCircle } from 'lucide-react';

const CHILDREN = [
  {
    id: 'c1',
    name: 'Emma',
    attendance: {
      present: 42,
      absent: 2,
      late: 3,
      total: 47,
      rate: 95.7,
    },
    recentDays: [
      { date: 'Jan 31', status: 'present' },
      { date: 'Jan 30', status: 'present' },
      { date: 'Jan 29', status: 'late', note: 'Doctor appointment' },
      { date: 'Jan 28', status: 'present' },
      { date: 'Jan 27', status: 'present' },
      { date: 'Jan 24', status: 'absent', note: 'Sick' },
      { date: 'Jan 23', status: 'present' },
    ],
  },
  {
    id: 'c2',
    name: 'Oliver',
    attendance: {
      present: 45,
      absent: 1,
      late: 1,
      total: 47,
      rate: 97.9,
    },
    recentDays: [
      { date: 'Jan 31', status: 'present' },
      { date: 'Jan 30', status: 'present' },
      { date: 'Jan 29', status: 'present' },
      { date: 'Jan 28', status: 'present' },
      { date: 'Jan 27', status: 'late', note: 'Traffic' },
      { date: 'Jan 24', status: 'present' },
      { date: 'Jan 23', status: 'present' },
    ],
  },
];

function getStatusIcon(status: string) {
  switch (status) {
    case 'present':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'absent':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'late':
      return <Clock className="h-5 w-5 text-amber-500" />;
    default:
      return null;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'present':
      return <Badge className="bg-green-100 text-green-700">Present</Badge>;
    case 'absent':
      return <Badge className="bg-red-100 text-red-700">Absent</Badge>;
    case 'late':
      return <Badge className="bg-amber-100 text-amber-700">Late</Badge>;
    default:
      return null;
  }
}

export default function ParentAttendancePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Attendance</h1>
        <p className="text-muted-foreground">Monitor your children's school attendance</p>
      </div>

      {CHILDREN.map((child) => (
        <Card key={child.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {child.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Attendance Rate</span>
                <span className={`text-2xl font-bold ${child.attendance.rate >= 95 ? 'text-green-600' : child.attendance.rate >= 90 ? 'text-amber-600' : 'text-red-600'}`}>
                  {child.attendance.rate}%
                </span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4 mb-6">
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-green-600">{child.attendance.present}</p>
                <p className="text-xs text-muted-foreground">Present</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-red-600">{child.attendance.absent}</p>
                <p className="text-xs text-muted-foreground">Absent</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold text-amber-600">{child.attendance.late}</p>
                <p className="text-xs text-muted-foreground">Late</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted">
                <p className="text-2xl font-bold">{child.attendance.total}</p>
                <p className="text-xs text-muted-foreground">Total Days</p>
              </div>
            </div>

            {/* Recent Days */}
            <h4 className="font-medium mb-3">Recent Days</h4>
            <div className="space-y-2">
              {child.recentDays.map((day) => (
                <div key={day.date} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    {getStatusIcon(day.status)}
                    <span>{day.date}</span>
                    {day.note && (
                      <span className="text-sm text-muted-foreground">({day.note})</span>
                    )}
                  </div>
                  {getStatusBadge(day.status)}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
