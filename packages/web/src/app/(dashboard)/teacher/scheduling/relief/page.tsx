'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Clock,
  Users,
  Calendar,
  CheckCircle2,
  MapPin,
  BookOpen,
} from 'lucide-react';

const openSlots = [
  {
    id: 'r1',
    date: 'Tomorrow (Jan 25)',
    teacher: 'Ms. Sarah Chen',
    subject: 'Mathematics',
    yearLevel: 'Year 10',
    periods: '3-4',
    time: '10:35 AM - 12:20 PM',
    room: 'Room 204',
    notes: 'Covering quadratic equations unit',
  },
  {
    id: 'r2',
    date: 'Friday (Jan 27)',
    teacher: 'Mr. Michael Torres',
    subject: 'Physics',
    yearLevel: 'Year 11',
    periods: '1-2',
    time: '8:30 AM - 10:15 AM',
    room: 'Lab 2',
    notes: 'Practical session - motion experiments',
  },
];

const myAcceptedSlots = [
  {
    id: 'a1',
    date: 'Monday (Jan 29)',
    originalTeacher: 'Ms. Emily Watson',
    subject: 'English',
    yearLevel: 'Year 9',
    periods: '5-6',
    time: '1:20 PM - 3:05 PM',
    room: 'Room 108',
  },
];

const history = [
  { id: 'h1', date: '2024-01-15', subject: 'Art', yearLevel: 'Year 8', periods: '3-4', status: 'completed' },
  { id: 'h2', date: '2024-01-10', subject: 'Music', yearLevel: 'Year 7', periods: '1-2', status: 'completed' },
  { id: 'h3', date: '2024-01-05', subject: 'Drama', yearLevel: 'Year 9', periods: '5-6', status: 'completed' },
];

export default function ReliefCoveragePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Relief Coverage</h1>
          <p className="text-muted-foreground">
            View and accept available relief teaching slots
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-orange-500/10 p-3">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{openSlots.length}</p>
                <p className="text-sm text-muted-foreground">Open Slots</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-500/10 p-3">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{myAcceptedSlots.length}</p>
                <p className="text-sm text-muted-foreground">Accepted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Calendar className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{history.length}</p>
                <p className="text-sm text-muted-foreground">Completed This Term</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="open">
        <TabsList>
          <TabsTrigger value="open">Open Slots ({openSlots.length})</TabsTrigger>
          <TabsTrigger value="accepted">My Accepted ({myAcceptedSlots.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="open" className="mt-4 space-y-4">
          {openSlots.map((slot) => (
            <Card key={slot.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div>
                      <Badge className="mb-2">{slot.date}</Badge>
                      <h3 className="text-lg font-semibold">{slot.subject} - {slot.yearLevel}</h3>
                      <p className="text-sm text-muted-foreground">
                        Covering for {slot.teacher}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Periods {slot.periods} ({slot.time})
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {slot.room}
                      </div>
                    </div>
                    {slot.notes && (
                      <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                        <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <p className="text-sm">{slot.notes}</p>
                      </div>
                    )}
                  </div>
                  <Button>Accept Slot</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="accepted" className="mt-4 space-y-4">
          {myAcceptedSlots.map((slot) => (
            <Card key={slot.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3">
                    <div>
                      <Badge variant="success" className="mb-2">{slot.date}</Badge>
                      <h3 className="text-lg font-semibold">{slot.subject} - {slot.yearLevel}</h3>
                      <p className="text-sm text-muted-foreground">
                        Covering for {slot.originalTeacher}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Periods {slot.periods} ({slot.time})
                      </div>
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="h-4 w-4" />
                        {slot.room}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">View Details</Button>
                    <Button variant="destructive">Cancel</Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="p-4 text-left font-medium">Date</th>
                    <th className="p-4 text-left font-medium">Subject</th>
                    <th className="p-4 text-left font-medium">Year Level</th>
                    <th className="p-4 text-left font-medium">Periods</th>
                    <th className="p-4 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b">
                      <td className="p-4">{new Date(item.date).toLocaleDateString()}</td>
                      <td className="p-4">{item.subject}</td>
                      <td className="p-4">{item.yearLevel}</td>
                      <td className="p-4">{item.periods}</td>
                      <td className="p-4">
                        <Badge variant="success">
                          <CheckCircle2 className="mr-1 h-3 w-3" />
                          Completed
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
