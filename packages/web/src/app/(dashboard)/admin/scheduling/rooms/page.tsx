'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  School,
  Users,
  CheckCircle2,
  AlertTriangle,
  Wrench,
  Search,
  Plus,
  Monitor,
  FlaskConical,
  BookOpen,
  Music,
  Palette,
  Dumbbell,
} from 'lucide-react';

const stats = [
  { label: 'Total Rooms', value: '48', icon: School, color: 'blue' },
  { label: 'Available Now', value: '12', icon: CheckCircle2, color: 'green' },
  { label: 'In Maintenance', value: '3', icon: Wrench, color: 'orange' },
];

const rooms = [
  {
    id: 'rm1',
    name: 'Room 101',
    type: 'classroom' as const,
    capacity: 30,
    equipment: ['Projector', 'Whiteboard', 'Air Conditioning'],
    status: 'available' as const,
    building: 'Block A',
  },
  {
    id: 'rm2',
    name: 'Science Lab A',
    type: 'lab' as const,
    capacity: 24,
    equipment: ['Fume Hood', 'Projector', 'Lab Benches', 'Safety Shower'],
    status: 'occupied' as const,
    building: 'Block B',
  },
  {
    id: 'rm3',
    name: 'Computer Lab 1',
    type: 'lab' as const,
    capacity: 28,
    equipment: ['28 Workstations', 'Projector', 'Printer'],
    status: 'available' as const,
    building: 'Block C',
  },
  {
    id: 'rm4',
    name: 'Assembly Hall',
    type: 'hall' as const,
    capacity: 400,
    equipment: ['Stage', 'Sound System', 'Lighting Rig', 'Projector'],
    status: 'available' as const,
    building: 'Main Building',
  },
  {
    id: 'rm5',
    name: 'Library',
    type: 'library' as const,
    capacity: 80,
    equipment: ['Study Desks', 'Computers', 'Projector', 'Quiet Zones'],
    status: 'occupied' as const,
    building: 'Main Building',
  },
  {
    id: 'rm6',
    name: 'Art Studio',
    type: 'studio' as const,
    capacity: 20,
    equipment: ['Easels', 'Kiln', 'Sink Stations', 'Natural Lighting'],
    status: 'available' as const,
    building: 'Block D',
  },
  {
    id: 'rm7',
    name: 'Room 204',
    type: 'classroom' as const,
    capacity: 32,
    equipment: ['Interactive Whiteboard', 'Projector', 'Air Conditioning'],
    status: 'maintenance' as const,
    building: 'Block A',
  },
  {
    id: 'rm8',
    name: 'Music Room',
    type: 'studio' as const,
    capacity: 25,
    equipment: ['Piano', 'Sound System', 'Recording Booth', 'Instruments'],
    status: 'available' as const,
    building: 'Block D',
  },
];

function getRoomIcon(type: string) {
  switch (type) {
    case 'classroom':
      return Monitor;
    case 'lab':
      return FlaskConical;
    case 'hall':
      return Users;
    case 'library':
      return BookOpen;
    case 'studio':
      return Palette;
    default:
      return School;
  }
}

function getStatusIndicator(status: string) {
  switch (status) {
    case 'available':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Available
        </Badge>
      );
    case 'occupied':
      return (
        <Badge className="bg-blue-100 text-blue-800 border-blue-300">
          <Users className="mr-1 h-3 w-3" />
          Occupied
        </Badge>
      );
    case 'maintenance':
      return (
        <Badge className="bg-orange-100 text-orange-800 border-orange-300">
          <Wrench className="mr-1 h-3 w-3" />
          Maintenance
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getTypeLabel(type: string) {
  switch (type) {
    case 'classroom':
      return 'Classroom';
    case 'lab':
      return 'Laboratory';
    case 'hall':
      return 'Assembly Hall';
    case 'library':
      return 'Library';
    case 'studio':
      return 'Studio';
    case 'office':
      return 'Office';
    default:
      return type;
  }
}

export default function AdminRoomsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Room Inventory</h1>
          <p className="text-muted-foreground">
            Manage all rooms, labs, and facilities across campus
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Room
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-500`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search rooms by name, type, or equipment..."
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Rooms Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {rooms.map((room) => {
          const RoomIcon = getRoomIcon(room.type);
          return (
            <Card key={room.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <RoomIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{room.name}</h3>
                      <p className="text-sm text-muted-foreground">{getTypeLabel(room.type)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{room.building}</p>
                    </div>
                  </div>
                  {getStatusIndicator(room.status)}
                </div>
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  Capacity: {room.capacity}
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {room.equipment.map((item) => (
                    <Badge key={item} variant="secondary" className="text-xs">
                      {item}
                    </Badge>
                  ))}
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" className="flex-1">
                    View Schedule
                  </Button>
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
