'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  User,
  School,
  Clock,
  Plus,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Shield,
} from 'lucide-react';

const teacherPreferences = [
  { id: 'sc1', name: 'No Period 1 for Senior Staff', description: 'Head of Department and coordinators should not have Period 1 classes to allow for morning meetings', priority: 'medium' as const, enabled: true },
  { id: 'sc6', name: 'Part-Time Teacher Days', description: 'Part-time staff teaching days must align with contracted days', priority: 'high' as const, enabled: true },
  { id: 'sc10', name: 'Senior Teacher Preference', description: 'Teachers with 15+ years experience may request preferred teaching periods', priority: 'low' as const, enabled: true },
  { id: 'sc13', name: 'Maximum Consecutive Periods', description: 'No teacher should be scheduled for more than 3 consecutive periods without a break', priority: 'high' as const, enabled: true },
  { id: 'sc14', name: 'Yard Duty Distribution', description: 'Yard duty assignments should be distributed evenly across all teaching staff', priority: 'medium' as const, enabled: false },
];

const roomRequirements = [
  { id: 'sc2', name: 'Double Periods for Science Labs', description: 'All science practical sessions require consecutive double periods in lab facilities', priority: 'high' as const, enabled: true },
  { id: 'sc4', name: 'PE Outdoor Availability', description: 'Physical Education classes require access to the oval or gymnasium', priority: 'medium' as const, enabled: true },
  { id: 'sc7', name: 'Art Room Ventilation', description: 'Ceramics and painting classes must be in rooms with proper ventilation', priority: 'low' as const, enabled: false },
  { id: 'sc9', name: 'Music Noise Buffer', description: 'Music practice rooms should not be adjacent to exam rooms during assessment periods', priority: 'medium' as const, enabled: true },
  { id: 'sc12', name: 'Computer Lab Maintenance', description: 'Computer Lab 2 unavailable on Monday mornings for IT maintenance', priority: 'medium' as const, enabled: true },
];

const timeBlocks = [
  { id: 'sc3', name: 'Year 12 Morning Block', description: 'Year 12 ATAR subjects must be scheduled in Periods 1-4 for optimal focus', priority: 'high' as const, enabled: true },
  { id: 'sc5', name: 'Staff Meeting Wednesday P5', description: 'No classes scheduled for Period 5 on Wednesdays to allow weekly staff meetings', priority: 'high' as const, enabled: true },
  { id: 'sc8', name: 'Lunch Break Coverage', description: 'No Year 7-8 classes in the period immediately after lunch (transition buffer)', priority: 'low' as const, enabled: false },
  { id: 'sc11', name: 'Assembly Block Friday P6', description: 'Friday Period 6 reserved for whole-school or year-level assemblies', priority: 'medium' as const, enabled: true },
  { id: 'sc15', name: 'Exam Block Periods', description: 'Assessment weeks reserve Periods 1-4 for formal examinations only', priority: 'high' as const, enabled: true },
];

function getPriorityBadge(priority: string) {
  switch (priority) {
    case 'high':
      return <Badge variant="destructive">High</Badge>;
    case 'medium':
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Medium</Badge>;
    case 'low':
      return <Badge variant="secondary">Low</Badge>;
    default:
      return <Badge variant="secondary">{priority}</Badge>;
  }
}

function ConstraintCard({
  constraint,
  onToggle,
}: {
  constraint: { id: string; name: string; description: string; priority: 'high' | 'medium' | 'low'; enabled: boolean };
  onToggle: (id: string) => void;
}) {
  return (
    <div className="flex items-start justify-between rounded-lg border p-4">
      <div className="flex items-start gap-4 flex-1">
        <div className={`mt-0.5 rounded-lg p-2 ${constraint.enabled ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
          {constraint.enabled ? (
            <CheckCircle2 className={`h-5 w-5 ${constraint.enabled ? 'text-green-500' : 'text-gray-400'}`} />
          ) : (
            <AlertTriangle className="h-5 w-5 text-gray-400" />
          )}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-medium">{constraint.name}</h3>
            {getPriorityBadge(constraint.priority)}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{constraint.description}</p>
        </div>
      </div>
      <div className="flex items-center gap-2 ml-4">
        <Button
          size="sm"
          variant={constraint.enabled ? 'default' : 'outline'}
          onClick={() => onToggle(constraint.id)}
        >
          {constraint.enabled ? 'Enabled' : 'Disabled'}
        </Button>
        <Button size="sm" variant="ghost">
          <Edit className="h-4 w-4" />
        </Button>
        <Button size="sm" variant="ghost" className="text-destructive">
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function AdminConstraintsPage() {
  const [teacherConstraints, setTeacherConstraints] = useState(teacherPreferences);
  const [roomConstraints, setRoomConstraints] = useState(roomRequirements);
  const [timeConstraints, setTimeConstraints] = useState(timeBlocks);

  const toggleTeacher = (id: string) => {
    setTeacherConstraints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const toggleRoom = (id: string) => {
    setRoomConstraints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const toggleTime = (id: string) => {
    setTimeConstraints((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c))
    );
  };

  const totalEnabled =
    teacherConstraints.filter((c) => c.enabled).length +
    roomConstraints.filter((c) => c.enabled).length +
    timeConstraints.filter((c) => c.enabled).length;

  const totalConstraints =
    teacherConstraints.length + roomConstraints.length + timeConstraints.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Scheduling Constraints</h1>
          <p className="text-muted-foreground">
            Configure rules and preferences that govern timetable generation
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Constraint
        </Button>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <Shield className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalConstraints}</p>
                <p className="text-sm text-muted-foreground">Total Constraints</p>
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
                <p className="text-2xl font-bold">{totalEnabled}</p>
                <p className="text-sm text-muted-foreground">Active Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-orange-500/10 p-3">
                <AlertTriangle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalConstraints - totalEnabled}</p>
                <p className="text-sm text-muted-foreground">Disabled Rules</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-purple-500/10 p-3">
                <AlertTriangle className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {teacherConstraints.filter((c) => c.priority === 'high' && c.enabled).length +
                    roomConstraints.filter((c) => c.priority === 'high' && c.enabled).length +
                    timeConstraints.filter((c) => c.priority === 'high' && c.enabled).length}
                </p>
                <p className="text-sm text-muted-foreground">High Priority Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Constraint Tabs */}
      <Tabs defaultValue="teacher" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teacher" className="gap-2">
            <User className="h-4 w-4" />
            Teacher Preferences ({teacherConstraints.length})
          </TabsTrigger>
          <TabsTrigger value="room" className="gap-2">
            <School className="h-4 w-4" />
            Room Requirements ({roomConstraints.length})
          </TabsTrigger>
          <TabsTrigger value="time" className="gap-2">
            <Clock className="h-4 w-4" />
            Time Blocks ({timeConstraints.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teacher" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Teacher Preferences</CardTitle>
              <CardDescription>
                Constraints related to teacher availability, workload, and scheduling preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {teacherConstraints.map((constraint) => (
                <ConstraintCard
                  key={constraint.id}
                  constraint={constraint}
                  onToggle={toggleTeacher}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="room" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Room Requirements</CardTitle>
              <CardDescription>
                Constraints related to room availability, facilities, and physical space requirements
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {roomConstraints.map((constraint) => (
                <ConstraintCard
                  key={constraint.id}
                  constraint={constraint}
                  onToggle={toggleRoom}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="time" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle>Time Block Constraints</CardTitle>
              <CardDescription>
                Constraints related to specific time periods, blocked slots, and scheduling windows
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {timeConstraints.map((constraint) => (
                <ConstraintCard
                  key={constraint.id}
                  constraint={constraint}
                  onToggle={toggleTime}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
