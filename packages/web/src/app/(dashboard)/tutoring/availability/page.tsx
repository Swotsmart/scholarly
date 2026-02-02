'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Clock,
  Plus,
  Save,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from 'lucide-react';

const weekDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

const defaultSchedule = {
  Monday: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
  Tuesday: [{ start: '10:00', end: '15:00' }],
  Wednesday: [{ start: '09:00', end: '12:00' }, { start: '14:00', end: '18:00' }],
  Thursday: [{ start: '10:00', end: '15:00' }],
  Friday: [{ start: '09:00', end: '13:00' }],
  Saturday: [],
  Sunday: [],
};

export default function AvailabilityPage() {
  const [schedule, setSchedule] = useState(defaultSchedule);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Calendar className="h-8 w-8" />
            Availability
          </h1>
          <p className="text-muted-foreground">
            Set your weekly tutoring schedule
          </p>
        </div>
        <Button>
          <Save className="mr-2 h-4 w-4" />
          Save Changes
        </Button>
      </div>

      {/* Quick Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Accept Same-Day Bookings</Label>
              <p className="text-sm text-muted-foreground">Allow students to book sessions for today</p>
            </div>
            <Switch />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Minimum Notice</Label>
              <p className="text-sm text-muted-foreground">How much notice you need before a session</p>
            </div>
            <select className="p-2 rounded border">
              <option>2 hours</option>
              <option>4 hours</option>
              <option>12 hours</option>
              <option>24 hours</option>
              <option>48 hours</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Session Duration</Label>
              <p className="text-sm text-muted-foreground">Default length of tutoring sessions</p>
            </div>
            <select className="p-2 rounded border">
              <option>30 minutes</option>
              <option>45 minutes</option>
              <option>60 minutes</option>
              <option>90 minutes</option>
            </select>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Buffer Between Sessions</Label>
              <p className="text-sm text-muted-foreground">Break time between consecutive sessions</p>
            </div>
            <select className="p-2 rounded border">
              <option>No buffer</option>
              <option>15 minutes</option>
              <option>30 minutes</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Weekly Schedule</CardTitle>
          <CardDescription>Set your recurring availability for each day</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {weekDays.map((day) => (
              <div key={day} className="flex items-start gap-4 p-4 rounded-lg border">
                <div className="w-28">
                  <p className="font-medium">{day}</p>
                  <Badge variant={schedule[day as keyof typeof schedule].length > 0 ? 'default' : 'secondary'} className="mt-1">
                    {schedule[day as keyof typeof schedule].length > 0 ? 'Available' : 'Unavailable'}
                  </Badge>
                </div>
                <div className="flex-1 space-y-2">
                  {schedule[day as keyof typeof schedule].length === 0 ? (
                    <p className="text-sm text-muted-foreground py-2">No availability set</p>
                  ) : (
                    schedule[day as keyof typeof schedule].map((slot, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <input
                            type="time"
                            defaultValue={slot.start}
                            className="p-1 rounded border text-sm"
                          />
                          <span>to</span>
                          <input
                            type="time"
                            defaultValue={slot.end}
                            className="p-1 rounded border text-sm"
                          />
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Slot
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Date Overrides */}
      <Card>
        <CardHeader>
          <CardTitle>Date Overrides</CardTitle>
          <CardDescription>Block specific dates or add extra availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">25 Feb 2026</p>
                <p className="text-sm text-muted-foreground">Public Holiday - Unavailable</p>
              </div>
              <Badge variant="destructive">Blocked</Badge>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg border">
              <div>
                <p className="font-medium">1 Mar 2026</p>
                <p className="text-sm text-muted-foreground">Extra availability - 8:00 AM - 8:00 PM</p>
              </div>
              <Badge className="bg-green-500">Extended</Badge>
            </div>
            <Button variant="outline" className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Date Override
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
