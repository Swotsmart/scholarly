'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
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
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { TimetableSlot, SchedulingPeriod } from '@/lib/api';

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

function getDepartmentColor(learningArea?: string) {
  switch (learningArea?.toLowerCase()) {
    case 'humanities':
      return 'bg-amber-100 border-amber-300 text-amber-800 dark:bg-amber-900/30 dark:border-amber-700 dark:text-amber-300';
    case 'stem':
      return 'bg-green-100 border-green-300 text-green-800 dark:bg-green-900/30 dark:border-green-700 dark:text-green-300';
    case 'arts':
      return 'bg-pink-100 border-pink-300 text-pink-800 dark:bg-pink-900/30 dark:border-pink-700 dark:text-pink-300';
    case 'health & pe':
      return 'bg-orange-100 border-orange-300 text-orange-800 dark:bg-orange-900/30 dark:border-orange-700 dark:text-orange-300';
    case 'technology':
      return 'bg-cyan-100 border-cyan-300 text-cyan-800 dark:bg-cyan-900/30 dark:border-cyan-700 dark:text-cyan-300';
    default:
      return 'bg-blue-100 border-blue-300 text-blue-800 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300';
  }
}

export default function AdminTimetablePage() {
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [periods, setPeriods] = useState<SchedulingPeriod[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const [timetableRes, periodsRes] = await Promise.all([
          api.scheduling.getTimetable(),
          api.scheduling.getPeriods(),
        ]);
        if (timetableRes.success && timetableRes.data) {
          setSlots(timetableRes.data.slots);
        }
        if (periodsRes.success && periodsRes.data) {
          setPeriods(periodsRes.data.periods);
        }
      } catch (err) {
        console.error('Failed to load timetable:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const weekStart = new Date(currentWeek);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1);

  // Build slot lookup: slotMap[dayOfWeek][periodId]
  const slotMap: Record<number, Record<string, TimetableSlot>> = {};
  for (const slot of slots) {
    if (!slotMap[slot.dayOfWeek]) slotMap[slot.dayOfWeek] = {};
    slotMap[slot.dayOfWeek][slot.periodId] = slot;
  }

  // Collect unique learning areas for the legend
  const learningAreas = [...new Set(slots.map(s => s.subject?.learningArea).filter(Boolean))] as string[];

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
              {learningAreas.map(area => (
                <SelectItem key={area} value={area}>{area}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={yearFilter} onValueChange={setYearFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Year Level" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Year Levels</SelectItem>
              {['7', '8', '9', '10', '11', '12'].map(y => (
                <SelectItem key={y} value={y}>Year {y}</SelectItem>
              ))}
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
          {isLoading ? (
            <div className="flex items-center justify-center p-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : periods.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No periods configured. Set up school periods first.
            </div>
          ) : (
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
                {periods.filter(p => p.type === 'teaching').map((period) => (
                  <tr key={period.id} className="border-b">
                    <td className="p-3">
                      <div className="font-medium">{period.name}</div>
                      <div className="text-xs text-muted-foreground">{period.startTime} - {period.endTime}</div>
                    </td>
                    {[1, 2, 3, 4, 5].map((dayNum) => {
                      const slot = slotMap[dayNum]?.[period.id];
                      if (!slot) {
                        return (
                          <td key={dayNum} className="p-2">
                            <div className="rounded-lg border border-dashed p-3 text-center text-sm text-muted-foreground">
                              Free
                            </div>
                          </td>
                        );
                      }

                      const matchesDept = departmentFilter === 'all' || slot.subject?.learningArea === departmentFilter;
                      const matchesYear = yearFilter === 'all' || slot.yearLevel?.includes(yearFilter);
                      const isFiltered = matchesDept && matchesYear;

                      return (
                        <td key={dayNum} className="p-2">
                          <div
                            className={`rounded-lg border p-3 ${
                              isFiltered
                                ? getDepartmentColor(slot.subject?.learningArea)
                                : 'bg-gray-50 border-gray-200 text-gray-400 dark:bg-gray-800/50 dark:border-gray-700 dark:text-gray-500'
                            }`}
                          >
                            <p className="font-medium text-sm">{slot.classCode}</p>
                            <p className="text-xs mt-1">{slot.teacher?.displayName}</p>
                            <p className="text-xs mt-0.5">{slot.room?.name}</p>
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Legend */}
      {learningAreas.length > 0 && (
        <Card>
          <CardContent className="flex flex-wrap items-center gap-6 p-4">
            <span className="text-sm font-medium">Departments:</span>
            {learningAreas.map(area => (
              <div key={area} className="flex items-center gap-2">
                <div className={`h-4 w-4 rounded border ${getDepartmentColor(area)}`} />
                <span className="text-sm">{area}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
