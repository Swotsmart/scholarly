'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  School,
  Plus,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  X,
} from 'lucide-react';

const rooms = [
  { id: 'r1', name: 'Lab 3', type: 'Computer Lab', capacity: 30, facilities: ['Computers', 'Projector', 'Whiteboard'] },
  { id: 'r2', name: 'Makerspace', type: 'Workshop', capacity: 20, facilities: ['3D Printers', 'Tools', 'Workbenches'] },
  { id: 'r3', name: 'Innovation Hub', type: 'Collaboration', capacity: 40, facilities: ['Projector', 'Video Conf', 'Whiteboards'] },
  { id: 'r4', name: 'Presentation Room', type: 'Meeting', capacity: 50, facilities: ['Projector', 'Sound System', 'Recording'] },
];

const myBookings = [
  { id: 'b1', room: 'Lab 3', date: 'Today', time: '10:35 AM - 12:20 PM', purpose: 'Design prototyping session' },
  { id: 'b2', room: 'Makerspace', date: 'Thursday', time: '2:15 PM - 3:05 PM', purpose: 'Student pitch practice' },
  { id: 'b3', room: 'Presentation Room', date: 'Friday', time: '1:20 PM - 2:10 PM', purpose: 'Year 12 pitch presentations' },
];

export default function RoomBookingPage() {
  const [isBookingOpen, setIsBookingOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Room Booking</h1>
          <p className="text-muted-foreground">
            Book labs, makerspaces, and special facilities for your classes
          </p>
        </div>
        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Booking
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Book a Room</DialogTitle>
              <DialogDescription>
                Reserve a room or facility for your class
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Room</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select a room...</option>
                  {rooms.map((room) => (
                    <option key={room.id} value={room.id}>
                      {room.name} ({room.type} - {room.capacity} capacity)
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Period(s)</Label>
                  <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                    <option value="">Select periods...</option>
                    <option value="1-2">Periods 1-2</option>
                    <option value="3-4">Periods 3-4</option>
                    <option value="5-6">Periods 5-6</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Purpose</Label>
                <Input placeholder="e.g., Design prototyping session" />
              </div>
              <div className="space-y-2">
                <Label>Class</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Select class...</option>
                  <option value="10dt">Year 10 Design & Tech</option>
                  <option value="11inn">Year 11 Innovation</option>
                  <option value="12mp">Year 12 Project</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBookingOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsBookingOpen(false)}>
                Book Room
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* My Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>My Bookings</CardTitle>
          <CardDescription>Your upcoming room reservations</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {myBookings.map((booking) => (
            <div
              key={booking.id}
              className="flex items-center justify-between rounded-lg border p-4"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <School className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{booking.room}</p>
                  <p className="text-sm text-muted-foreground">{booking.purpose}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <Badge variant="outline">{booking.date}</Badge>
                  <p className="text-sm text-muted-foreground mt-1">{booking.time}</p>
                </div>
                <Button size="sm" variant="ghost">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Available Rooms */}
      <div>
        <h2 className="heading-3 mb-4">Available Rooms</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {rooms.map((room) => (
            <Card key={room.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <School className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{room.name}</h3>
                      <p className="text-sm text-muted-foreground">{room.type}</p>
                      <div className="flex items-center gap-1 mt-1 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        Capacity: {room.capacity}
                      </div>
                    </div>
                  </div>
                  <Badge variant="success">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Available
                  </Badge>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {room.facilities.map((facility) => (
                    <Badge key={facility} variant="secondary">
                      {facility}
                    </Badge>
                  ))}
                </div>
                <Button className="w-full mt-4" variant="outline">
                  Check Availability
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
