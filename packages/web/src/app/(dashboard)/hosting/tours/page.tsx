'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, User, MapPin, Plus } from 'lucide-react';

export default function HostingToursPage() {
  const tours = [
    { id: 1, family: 'Johnson Family', date: '2026-02-05', time: '10:00 AM', status: 'confirmed' },
    { id: 2, family: 'Chen Family', date: '2026-02-07', time: '2:00 PM', status: 'pending' },
    { id: 3, family: 'Williams Family', date: '2026-02-10', time: '11:00 AM', status: 'confirmed' },
  ];

  const availability = [
    { day: 'Monday', slots: ['10:00 AM', '2:00 PM'] },
    { day: 'Wednesday', slots: ['10:00 AM', '11:00 AM', '2:00 PM'] },
    { day: 'Friday', slots: ['10:00 AM'] },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">School Tours</h1>
          <p className="text-muted-foreground">Manage tour bookings and availability</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Availability
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Tours</CardTitle>
            <CardDescription>Scheduled visits from prospective families</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tours.map((tour) => (
                <div key={tour.id} className="flex items-center justify-between p-4 rounded-lg border">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{tour.family}</p>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {tour.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {tour.time}
                        </span>
                      </div>
                    </div>
                  </div>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    tour.status === 'confirmed'
                      ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                      : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                  }`}>
                    {tour.status}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tour Availability</CardTitle>
            <CardDescription>When families can book tours</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {availability.map((day) => (
                <div key={day.day} className="p-4 rounded-lg border">
                  <p className="font-medium mb-2">{day.day}</p>
                  <div className="flex flex-wrap gap-2">
                    {day.slots.map((slot) => (
                      <span
                        key={slot}
                        className="px-3 py-1 bg-primary/10 text-primary text-sm rounded-full"
                      >
                        {slot}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tour Settings</CardTitle>
          <CardDescription>Configure how tours work</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium">Tour Duration</label>
              <select className="w-full mt-1 px-3 py-2 border rounded-md bg-background">
                <option>30 minutes</option>
                <option>45 minutes</option>
                <option>1 hour</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Max Families per Tour</label>
              <select className="w-full mt-1 px-3 py-2 border rounded-md bg-background">
                <option>1 family</option>
                <option>2 families</option>
                <option>3 families</option>
              </select>
            </div>
          </div>
          <Button>Save Settings</Button>
        </CardContent>
      </Card>
    </div>
  );
}
