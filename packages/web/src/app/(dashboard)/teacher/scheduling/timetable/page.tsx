'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Printer,
  Download,
  AlertTriangle,
  Users,
  Clock,
  MapPin,
  GraduationCap,
  Filter,
  Eye,
  GripVertical,
  BookOpen,
  Building,
} from 'lucide-react';

// Types
interface TimetableSlot {
  id: string;
  subject: string;
  teacher: string;
  room: string;
  studentCount: number;
  type: 'class' | 'meeting' | 'duty' | 'pd' | 'free';
  yearLevel?: string;
  hasConflict?: boolean;
  conflictReason?: string;
}

interface ConflictInfo {
  type: 'room' | 'teacher' | 'time';
  description: string;
  affectedSlots: string[];
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

const teachers = [
  { id: 'all', name: 'All Teachers' },
  { id: 't1', name: 'Ms. Johnson' },
  { id: 't2', name: 'Mr. Smith' },
  { id: 't3', name: 'Dr. Chen' },
];

const classes = [
  { id: 'all', name: 'All Classes' },
  { id: 'y10dt', name: 'Year 10 Design & Tech' },
  { id: 'y11inn', name: 'Year 11 Innovation' },
  { id: 'y12prj', name: 'Year 12 Project' },
];

const rooms = [
  { id: 'all', name: 'All Rooms' },
  { id: 'r204', name: 'Room 204' },
  { id: 'lab3', name: 'Lab 3' },
  { id: 'r312', name: 'Room 312' },
  { id: 'maker', name: 'Makerspace' },
];

const yearLevels = [
  { id: 'all', name: 'All Year Levels' },
  { id: 'y7', name: 'Year 7' },
  { id: 'y8', name: 'Year 8' },
  { id: 'y9', name: 'Year 9' },
  { id: 'y10', name: 'Year 10' },
  { id: 'y11', name: 'Year 11' },
  { id: 'y12', name: 'Year 12' },
];

const timetableData: Record<string, Record<number, TimetableSlot | null>> = {
  Monday: {
    1: { id: 'm1', subject: 'Year 10 Design & Tech', teacher: 'Ms. Johnson', room: 'Room 204', studentCount: 24, type: 'class', yearLevel: 'Year 10' },
    2: { id: 'm2', subject: 'Year 10 Design & Tech', teacher: 'Ms. Johnson', room: 'Room 204', studentCount: 24, type: 'class', yearLevel: 'Year 10' },
    3: { id: 'm3', subject: 'Year 11 Innovation', teacher: 'Ms. Johnson', room: 'Lab 3', studentCount: 18, type: 'class', yearLevel: 'Year 11' },
    4: { id: 'm4', subject: 'Year 11 Innovation', teacher: 'Ms. Johnson', room: 'Lab 3', studentCount: 18, type: 'class', yearLevel: 'Year 11' },
    5: null,
    6: { id: 'm6', subject: 'Year 12 Project', teacher: 'Ms. Johnson', room: 'Room 312', studentCount: 12, type: 'class', yearLevel: 'Year 12' },
  },
  Tuesday: {
    1: { id: 't1', subject: 'Staff Meeting', teacher: 'All Staff', room: 'Staff Room', studentCount: 0, type: 'meeting' },
    2: null,
    3: { id: 't3', subject: 'Year 10 Design & Tech', teacher: 'Ms. Johnson', room: 'Room 204', studentCount: 24, type: 'class', yearLevel: 'Year 10', hasConflict: true, conflictReason: 'Room double-booked with Art class' },
    4: { id: 't4', subject: 'Year 10 Design & Tech', teacher: 'Ms. Johnson', room: 'Room 204', studentCount: 24, type: 'class', yearLevel: 'Year 10' },
    5: { id: 't5', subject: 'Year 12 Project', teacher: 'Ms. Johnson', room: 'Room 312', studentCount: 12, type: 'class', yearLevel: 'Year 12' },
    6: { id: 't6', subject: 'Year 12 Project', teacher: 'Ms. Johnson', room: 'Room 312', studentCount: 12, type: 'class', yearLevel: 'Year 12' },
  },
  Wednesday: {
    1: { id: 'w1', subject: 'Year 11 Innovation', teacher: 'Ms. Johnson', room: 'Lab 3', studentCount: 18, type: 'class', yearLevel: 'Year 11' },
    2: { id: 'w2', subject: 'Year 11 Innovation', teacher: 'Ms. Johnson', room: 'Lab 3', studentCount: 18, type: 'class', yearLevel: 'Year 11' },
    3: null,
    4: null,
    5: { id: 'w5', subject: 'Year 10 Design & Tech', teacher: 'Ms. Johnson', room: 'Makerspace', studentCount: 24, type: 'class', yearLevel: 'Year 10' },
    6: { id: 'w6', subject: 'Year 10 Design & Tech', teacher: 'Ms. Johnson', room: 'Makerspace', studentCount: 24, type: 'class', yearLevel: 'Year 10' },
  },
  Thursday: {
    1: { id: 'th1', subject: 'Playground Duty', teacher: 'Ms. Johnson', room: 'Quad', studentCount: 0, type: 'duty' },
    2: { id: 'th2', subject: 'Year 12 Project', teacher: 'Ms. Johnson', room: 'Room 312', studentCount: 12, type: 'class', yearLevel: 'Year 12' },
    3: { id: 'th3', subject: 'Year 12 Project', teacher: 'Ms. Johnson', room: 'Room 312', studentCount: 12, type: 'class', yearLevel: 'Year 12' },
    4: { id: 'th4', subject: 'Year 11 Innovation', teacher: 'Ms. Johnson', room: 'Lab 3', studentCount: 18, type: 'class', yearLevel: 'Year 11' },
    5: { id: 'th5', subject: 'Year 11 Innovation', teacher: 'Ms. Johnson', room: 'Lab 3', studentCount: 18, type: 'class', yearLevel: 'Year 11' },
    6: null,
  },
  Friday: {
    1: { id: 'f1', subject: 'Year 10 Design & Tech', teacher: 'Ms. Johnson', room: 'Room 204', studentCount: 24, type: 'class', yearLevel: 'Year 10' },
    2: { id: 'f2', subject: 'Year 10 Design & Tech', teacher: 'Ms. Johnson', room: 'Room 204', studentCount: 24, type: 'class', yearLevel: 'Year 10' },
    3: { id: 'f3', subject: 'Department Meeting', teacher: 'D&T Staff', room: 'D&T Office', studentCount: 0, type: 'meeting' },
    4: null,
    5: null,
    6: { id: 'f6', subject: 'PD Session', teacher: 'All Staff', room: 'Library', studentCount: 0, type: 'pd' },
  },
};

const termDates = [
  { week: 1, startDate: '2025-01-27', days: ['Mon 27', 'Tue 28', 'Wed 29', 'Thu 30', 'Fri 31'] },
  { week: 2, startDate: '2025-02-03', days: ['Mon 3', 'Tue 4', 'Wed 5', 'Thu 6', 'Fri 7'] },
  { week: 3, startDate: '2025-02-10', days: ['Mon 10', 'Tue 11', 'Wed 12', 'Thu 13', 'Fri 14'] },
  { week: 4, startDate: '2025-02-17', days: ['Mon 17', 'Tue 18', 'Wed 19', 'Thu 20', 'Fri 21'] },
];

const conflicts: ConflictInfo[] = [
  { type: 'room', description: 'Room 204 double-booked on Tuesday Period 3', affectedSlots: ['t3'] },
];

function getSlotColor(type: string, hasConflict?: boolean) {
  if (hasConflict) {
    return 'bg-red-100 border-red-400 text-red-800 dark:bg-red-900/30 dark:text-red-400';
  }
  switch (type) {
    case 'class':
      return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
    case 'meeting':
      return 'bg-purple-100 border-purple-300 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400';
    case 'duty':
      return 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    case 'pd':
      return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'bg-gray-100 border-gray-300 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

export default function TimetablePage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'term'>('week');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [selectedTeacher, setSelectedTeacher] = useState('all');
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedRoom, setSelectedRoom] = useState('all');
  const [selectedYearLevel, setSelectedYearLevel] = useState('all');
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);

  const weekStart = new Date(currentWeek);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  const totalClasses = Object.values(timetableData).flatMap((day) =>
    Object.values(day).filter((slot) => slot?.type === 'class')
  ).length;

  const conflictCount = conflicts.length;

  const handleSlotClick = (slot: TimetableSlot | null) => {
    if (slot) {
      setSelectedSlot(slot);
      setDetailsOpen(true);
    }
  };

  const renderDayView = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          {selectedDay}
        </CardTitle>
        <CardDescription>
          {weekStart.toLocaleDateString('en-AU', { month: 'long', day: 'numeric', year: 'numeric' })}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {periods.map((period) => {
          const slot = timetableData[selectedDay]?.[period.num];
          return (
            <div
              key={period.num}
              className={`flex items-center gap-4 rounded-lg border p-4 cursor-pointer transition-all hover:shadow-md ${
                slot ? getSlotColor(slot.type, slot.hasConflict) : 'bg-muted/30 border-dashed'
              }`}
              onClick={() => handleSlotClick(slot)}
              draggable={!!slot}
            >
              <div className="w-24 flex-shrink-0">
                <Badge variant={slot ? 'default' : 'secondary'}>Period {period.num}</Badge>
                <p className="text-xs text-muted-foreground mt-1">{period.time}</p>
              </div>
              {slot ? (
                <div className="flex-1 flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{slot.subject}</p>
                      {slot.hasConflict && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-3 w-3" />
                        {slot.teacher}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {slot.room}
                      </span>
                      {slot.studentCount > 0 && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {slot.studentCount} students
                        </span>
                      )}
                    </div>
                  </div>
                  <GripVertical className="h-5 w-5 text-muted-foreground cursor-grab" />
                </div>
              ) : (
                <p className="text-muted-foreground">Free Period</p>
              )}
            </div>
          );
        })}
      </CardContent>
    </Card>
  );

  const renderWeekView = () => (
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
                  const slot = timetableData[day]?.[period.num];
                  return (
                    <td key={day} className="p-2">
                      {slot ? (
                        <div
                          className={`rounded-lg border p-3 cursor-pointer transition-all hover:shadow-md ${getSlotColor(slot.type, slot.hasConflict)}`}
                          onClick={() => handleSlotClick(slot)}
                          draggable
                        >
                          <div className="flex items-start justify-between">
                            <p className="font-medium text-sm">{slot.subject}</p>
                            {slot.hasConflict && (
                              <AlertTriangle className="h-4 w-4 text-red-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-xs mt-1 opacity-80">{slot.teacher}</p>
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs opacity-70">{slot.room}</p>
                            {slot.studentCount > 0 && (
                              <span className="text-xs opacity-70">{slot.studentCount}</span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground min-h-[80px] flex items-center justify-center">
                          Free
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

  const renderTermView = () => (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="p-3 text-left font-medium text-muted-foreground w-20">Week</th>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri'].map((day) => (
                <th key={day} className="p-3 text-center font-medium min-w-[120px]">
                  {day}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {termDates.map((week) => (
              <tr key={week.week} className="border-b">
                <td className="p-3 bg-muted/20 text-center">
                  <Badge variant="outline">Week {week.week}</Badge>
                </td>
                {week.days.map((day, idx) => (
                  <td key={day} className="p-2 text-center">
                    <div className="text-xs text-muted-foreground mb-1">{day}</div>
                    <div className="flex flex-col gap-1">
                      {periods.slice(0, 3).map((period) => {
                        const dayName = days[idx];
                        const slot = timetableData[dayName]?.[period.num];
                        return slot ? (
                          <div
                            key={period.num}
                            className={`rounded px-2 py-1 text-xs cursor-pointer ${getSlotColor(slot.type, slot.hasConflict)}`}
                            onClick={() => handleSlotClick(slot)}
                            title={`${slot.subject} - ${slot.room}`}
                          >
                            P{period.num}
                          </div>
                        ) : null;
                      })}
                      <div className="text-xs text-muted-foreground">...</div>
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Timetable"
        description="View and manage your teaching schedule"
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setPrintDialogOpen(true)}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          label="Teaching Periods"
          value={totalClasses}
          icon={BookOpen}
          variant="primary"
        />
        <StatsCard
          label="Free Periods"
          value={6}
          icon={Clock}
          variant="success"
        />
        <StatsCard
          label="Rooms Used"
          value={4}
          icon={Building}
          variant="warning"
        />
        <StatsCard
          label="Conflicts"
          value={conflictCount}
          icon={AlertTriangle}
          variant={conflictCount > 0 ? 'error' : 'success'}
        />
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
              <div>
                <h4 className="font-semibold text-red-800 dark:text-red-200">Scheduling Conflicts Detected</h4>
                <ul className="mt-2 space-y-1">
                  {conflicts.map((conflict, idx) => (
                    <li key={idx} className="text-sm text-red-700 dark:text-red-300">
                      {conflict.description}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View Tabs and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as 'day' | 'week' | 'term')}>
          <TabsList>
            <TabsTrigger value="day">Day View</TabsTrigger>
            <TabsTrigger value="week">Week View</TabsTrigger>
            <TabsTrigger value="term">Term View</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex flex-wrap gap-2">
          <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
            <SelectTrigger className="w-[160px]">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Teacher" />
            </SelectTrigger>
            <SelectContent>
              {teachers.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedRoom} onValueChange={setSelectedRoom}>
            <SelectTrigger className="w-[150px]">
              <SelectValue placeholder="Room" />
            </SelectTrigger>
            <SelectContent>
              {rooms.map((r) => (
                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYearLevel} onValueChange={setSelectedYearLevel}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Year Level" />
            </SelectTrigger>
            <SelectContent>
              {yearLevels.map((y) => (
                <SelectItem key={y.id} value={y.id}>{y.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Week Navigation */}
      {viewMode !== 'term' && (
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
      )}

      {/* Day Selector for Day View */}
      {viewMode === 'day' && (
        <div className="flex gap-2">
          {days.map((day) => (
            <Button
              key={day}
              variant={selectedDay === day ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedDay(day)}
            >
              {day}
            </Button>
          ))}
        </div>
      )}

      {/* Timetable Grid */}
      {viewMode === 'day' && renderDayView()}
      {viewMode === 'week' && renderWeekView()}
      {viewMode === 'term' && renderTermView()}

      {/* Legend */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-4">
          <span className="text-sm font-medium">Legend:</span>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-blue-100 border border-blue-300 dark:bg-blue-900/30" />
            <span className="text-sm">Class</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-purple-100 border border-purple-300 dark:bg-purple-900/30" />
            <span className="text-sm">Meeting</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-orange-100 border border-orange-300 dark:bg-orange-900/30" />
            <span className="text-sm">Duty</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-green-100 border border-green-300 dark:bg-green-900/30" />
            <span className="text-sm">PD</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-red-100 border border-red-400 dark:bg-red-900/30" />
            <span className="text-sm">Conflict</span>
          </div>
        </CardContent>
      </Card>

      {/* Slot Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{selectedSlot?.subject}</DialogTitle>
            <DialogDescription>
              Period details and information
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <div className="space-y-4">
              {selectedSlot.hasConflict && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 dark:bg-red-950 dark:border-red-900">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">Conflict</span>
                  </div>
                  <p className="text-sm text-red-700 mt-1 dark:text-red-300">{selectedSlot.conflictReason}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Teacher</p>
                  <p className="font-medium">{selectedSlot.teacher}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Room</p>
                  <p className="font-medium">{selectedSlot.room}</p>
                </div>
                {selectedSlot.yearLevel && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Year Level</p>
                    <p className="font-medium">{selectedSlot.yearLevel}</p>
                  </div>
                )}
                {selectedSlot.studentCount > 0 && (
                  <div className="space-y-1">
                    <p className="text-sm text-muted-foreground">Students</p>
                    <p className="font-medium">{selectedSlot.studentCount}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            <Button>
              <Eye className="mr-2 h-4 w-4" />
              View Class
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Print Dialog */}
      <Dialog open={printDialogOpen} onOpenChange={setPrintDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Print Timetable</DialogTitle>
            <DialogDescription>
              Customize your print layout
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">View</label>
              <Select defaultValue="week">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Single Day</SelectItem>
                  <SelectItem value="week">Full Week</SelectItem>
                  <SelectItem value="term">Term Overview</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Include</label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Room numbers
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" defaultChecked className="rounded" />
                  Student counts
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded" />
                  Teacher names
                </label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Page Size</label>
              <Select defaultValue="a4">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="a3">A3</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPrintDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => window.print()}>
              <Printer className="mr-2 h-4 w-4" />
              Print
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
