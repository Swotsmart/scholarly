'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Printer,
  Download,
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

const timetableData: Record<string, Record<number, { class: string; room: string; type: string } | null>> = {
  Monday: {
    1: { class: 'Year 10 Design & Tech', room: 'Room 204', type: 'class' },
    2: { class: 'Year 10 Design & Tech', room: 'Room 204', type: 'class' },
    3: { class: 'Year 11 Innovation', room: 'Lab 3', type: 'class' },
    4: { class: 'Year 11 Innovation', room: 'Lab 3', type: 'class' },
    5: null,
    6: { class: 'Year 12 Project', room: 'Room 312', type: 'class' },
  },
  Tuesday: {
    1: { class: 'Staff Meeting', room: 'Staff Room', type: 'meeting' },
    2: null,
    3: { class: 'Year 10 Design & Tech', room: 'Room 204', type: 'class' },
    4: { class: 'Year 10 Design & Tech', room: 'Room 204', type: 'class' },
    5: { class: 'Year 12 Project', room: 'Room 312', type: 'class' },
    6: { class: 'Year 12 Project', room: 'Room 312', type: 'class' },
  },
  Wednesday: {
    1: { class: 'Year 11 Innovation', room: 'Lab 3', type: 'class' },
    2: { class: 'Year 11 Innovation', room: 'Lab 3', type: 'class' },
    3: null,
    4: null,
    5: { class: 'Year 10 Design & Tech', room: 'Makerspace', type: 'class' },
    6: { class: 'Year 10 Design & Tech', room: 'Makerspace', type: 'class' },
  },
  Thursday: {
    1: { class: 'Playground Duty', room: 'Quad', type: 'duty' },
    2: { class: 'Year 12 Project', room: 'Room 312', type: 'class' },
    3: { class: 'Year 12 Project', room: 'Room 312', type: 'class' },
    4: { class: 'Year 11 Innovation', room: 'Lab 3', type: 'class' },
    5: { class: 'Year 11 Innovation', room: 'Lab 3', type: 'class' },
    6: null,
  },
  Friday: {
    1: { class: 'Year 10 Design & Tech', room: 'Room 204', type: 'class' },
    2: { class: 'Year 10 Design & Tech', room: 'Room 204', type: 'class' },
    3: { class: 'Department Meeting', room: 'D&T Office', type: 'meeting' },
    4: null,
    5: null,
    6: { class: 'PD Session', room: 'Library', type: 'pd' },
  },
};

function getSlotColor(type: string) {
  switch (type) {
    case 'class':
      return 'bg-blue-100 border-blue-300 text-blue-800';
    case 'meeting':
      return 'bg-purple-100 border-purple-300 text-purple-800';
    case 'duty':
      return 'bg-orange-100 border-orange-300 text-orange-800';
    case 'pd':
      return 'bg-green-100 border-green-300 text-green-800';
    default:
      return 'bg-gray-100 border-gray-300 text-gray-800';
  }
}

export default function TimetablePage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekStart = new Date(currentWeek);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">My Timetable</h1>
          <p className="text-muted-foreground">
            View and manage your weekly schedule
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
                    return (
                      <td key={day} className="p-2">
                        {slot ? (
                          <div
                            className={`rounded-lg border p-3 ${getSlotColor(slot.type)}`}
                          >
                            <p className="font-medium text-sm">{slot.class}</p>
                            <p className="text-xs mt-1">{slot.room}</p>
                          </div>
                        ) : (
                          <div className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
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

      {/* Legend */}
      <Card>
        <CardContent className="flex items-center gap-6 p-4">
          <span className="text-sm font-medium">Legend:</span>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-blue-100 border border-blue-300" />
            <span className="text-sm">Class</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-purple-100 border border-purple-300" />
            <span className="text-sm">Meeting</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-orange-100 border border-orange-300" />
            <span className="text-sm">Duty</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded bg-green-100 border border-green-300" />
            <span className="text-sm">PD</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
