'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Printer,
  Download,
  Filter,
} from 'lucide-react';

const periods = [
  { num: 1, time: '8:30 - 9:20' },
  { num: 2, time: '9:25 - 10:15' },
  { num: 3, time: '10:35 - 11:25' },
  { num: 4, time: '11:30 - 12:20' },
  { num: 5, time: '1:20 - 2:10' },
  { num: 6, time: '2:15 - 3:05' },
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

const timetableData: Record<string, Record<number, { classCode: string; teacher: string; room: string; department: string } | null>> = {
  Monday: {
    1: { classCode: '10ENG-A', teacher: 'Ms. Nguyen', room: 'Room 101', department: 'english' },
    2: { classCode: '11MAT-B', teacher: 'Mr. Patel', room: 'Room 203', department: 'maths' },
    3: { classCode: '12PHY-A', teacher: 'Dr. Chen', room: 'Science Lab A', department: 'science' },
    4: { classCode: '9ART-C', teacher: 'Ms. Kowalski', room: 'Art Studio', department: 'arts' },
    5: { classCode: '10HIS-A', teacher: 'Mr. O\'Connor', room: 'Room 108', department: 'humanities' },
    6: { classCode: '11PE-B', teacher: 'Mr. Okafor', room: 'Gymnasium', department: 'pe' },
  },
  Tuesday: {
    1: { classCode: '12MAT-A', teacher: 'Mr. Patel', room: 'Room 203', department: 'maths' },
    2: { classCode: '10SCI-B', teacher: 'Dr. Chen', room: 'Science Lab A', department: 'science' },
    3: { classCode: '11ENG-A', teacher: 'Ms. Nguyen', room: 'Room 101', department: 'english' },
    4: { classCode: '9MUS-A', teacher: 'Mr. Torres', room: 'Music Room', department: 'arts' },
    5: null,
    6: { classCode: '10DT-A', teacher: 'Ms. Mitchell', room: 'Room 204', department: 'technology' },
  },
  Wednesday: {
    1: { classCode: '11SCI-A', teacher: 'Dr. Chen', room: 'Science Lab A', department: 'science' },
    2: { classCode: '10ENG-A', teacher: 'Ms. Nguyen', room: 'Room 101', department: 'english' },
    3: { classCode: '12HIS-A', teacher: 'Mr. O\'Connor', room: 'Room 108', department: 'humanities' },
    4: { classCode: '9MAT-C', teacher: 'Mr. Patel', room: 'Room 203', department: 'maths' },
    5: null,
    6: { classCode: '10ART-B', teacher: 'Ms. Kowalski', room: 'Art Studio', department: 'arts' },
  },
  Thursday: {
    1: { classCode: '12ENG-A', teacher: 'Ms. Nguyen', room: 'Room 101', department: 'english' },
    2: { classCode: '11PE-B', teacher: 'Mr. Okafor', room: 'Oval', department: 'pe' },
    3: { classCode: '10MAT-A', teacher: 'Mr. Patel', room: 'Room 203', department: 'maths' },
    4: { classCode: '9SCI-B', teacher: 'Dr. Chen', room: 'Science Lab A', department: 'science' },
    5: { classCode: '11DT-A', teacher: 'Ms. Mitchell', room: 'Computer Lab 1', department: 'technology' },
    6: { classCode: '10MUS-A', teacher: 'Mr. Torres', room: 'Music Room', department: 'arts' },
  },
  Friday: {
    1: { classCode: '11MAT-B', teacher: 'Mr. Patel', room: 'Room 203', department: 'maths' },
    2: { classCode: '10SCI-B', teacher: 'Dr. Chen', room: 'Science Lab A', department: 'science' },
    3: { classCode: '12ART-A', teacher: 'Ms. Kowalski', room: 'Art Studio', department: 'arts' },
    4: { classCode: '9ENG-C', teacher: 'Ms. Nguyen', room: 'Room 101', department: 'english' },
    5: { classCode: '10PE-A', teacher: 'Mr. Okafor', room: 'Gymnasium', department: 'pe' },
    6: null,
  },
};

function getDepartmentColor(department: string) {
  switch (department) {
    case 'english':
      return 'bg-blue-100 border-blue-300 text-blue-800';
    case 'maths':
      return 'bg-green-100 border-green-300 text-green-800';
    case 'science':
      return 'bg-purple-100 border-purple-300 text-purple-800';
    case 'humanities':
      return 'bg-amber-100 border-amber-300 text-amber-800';
    case 'arts':
      return 'bg-pink-100 border-pink-300 text-pink-800';
    case 'pe':
      return 'bg-orange-100 border-orange-300 text-orange-800';
    case 'technology':
      return 'bg-cyan-100 border-cyan-300 text-cyan-800';
    default:
      return 'bg-gray-100 border-gray-300 text-gray-800';
  }
}

export default function AdminTimetablePage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');

  const weekStart = new Date(currentWeek);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">School Timetable</h1>
          <p className="text-muted-foreground">
            School-wide class schedule overview and management
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Printer className="mr-2 h-4 w-4" />
            Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="flex items-center gap-4 p-4">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              <SelectItem value="english">English</SelectItem>
              <SelectItem value="maths">Mathematics</SelectItem>
              <SelectItem value="science">Science</SelectItem>
              <SelectItem value="humanities">Humanities</SelectItem>
              <SelectItem value="arts">Arts</SelectItem>
              <SelectItem value="pe">Physical Education</SelectItem>
              <SelectItem value="technology">Technology</SelectItem>
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Year Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Year Levels</SelectItem>
              <SelectItem value="7">Year 7</SelectItem>
              <SelectItem value="8">Year 8</SelectItem>
              <SelectItem value="9">Year 9</SelectItem>
              <SelectItem value="10">Year 10</SelectItem>
              <SelectItem value="11">Year 11</SelectItem>
              <SelectItem value="12">Year 12</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

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

      {/* Timetable Grid */}
      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left font-medium text-muted-foreground w-24">Period</th>
                {days.map((day) => (
                  <th key={day} className="p-3 text-left font-medium min-w-[180px]">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((period) => (
                <tr key={period.num} className="border-b">
                  <td className="p-3">
                    <div className="font-medium">Period {period.num}</div>
                    <div className="text-xs text-muted-foreground">{period.time}</div>
                  </td>
                  {days.map((day) => {
                    const slot = timetableData[day]?.[period.num];
                    if (!slot) {
                      return (
                        <td key={day} className="p-2">
                          <div className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                            Free
                          </div>
                        </td>
                      );
                    }

                    const matchesDept = departmentFilter === 'all' || slot.department === departmentFilter;
                    const matchesYear = yearFilter === 'all' || slot.classCode.startsWith(yearFilter);
                    const isFiltered = matchesDept && matchesYear;

                    return (
                      <td key={day} className="p-2">
                        <div
                          className={`rounded-lg border p-3 ${
                            isFiltered
                              ? getDepartmentColor(slot.department)
                              : 'bg-gray-50 border-gray-200 text-gray-400'
                          }`}
                        >
                          <p className="font-medium text-sm">{slot.classCode}</p>
                          <p className="text-xs mt-1">{slot.teacher}</p>
                          <p className="text-xs mt-0.5">{slot.room}</p>
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Legend */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-4">
          <span className="text-sm font-medium">Departments:</span>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-blue-100 border border-blue-300" />
            <span className="text-sm">English</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-green-100 border border-green-300" />
            <span className="text-sm">Maths</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-purple-100 border border-purple-300" />
            <span className="text-sm">Science</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-amber-100 border border-amber-300" />
            <span className="text-sm">Humanities</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-pink-100 border border-pink-300" />
            <span className="text-sm">Arts</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-orange-100 border border-orange-300" />
            <span className="text-sm">PE</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-cyan-100 border border-cyan-300" />
            <span className="text-sm">Technology</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
