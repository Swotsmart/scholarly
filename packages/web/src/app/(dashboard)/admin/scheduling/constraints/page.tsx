'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { SchedulingConstraintItem } from '@/lib/api';

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
  constraint: SchedulingConstraintItem;
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
  const [constraints, setConstraints] = useState<SchedulingConstraintItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchConstraints = useCallback(async () => {
    try {
      const res = await api.scheduling.getConstraints();
      if (res.success && res.data) {
        setConstraints(res.data.constraints);
      }
    } catch (err) {
      console.error('Failed to load constraints:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConstraints();
  }, [fetchConstraints]);

  const handleToggle = async (id: string) => {
    const constraint = constraints.find(c => c.id === id);
    if (!constraint) return;

    // Optimistic update
    setConstraints(prev => prev.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));

    try {
      await api.scheduling.updateConstraint(id, { enabled: !constraint.enabled });
    } catch (err) {
      // Revert on failure
      setConstraints(prev => prev.map(c => c.id === id ? { ...c, enabled: constraint.enabled } : c));
      console.error('Failed to toggle constraint:', err);
    }
  };

  const teacherConstraints = constraints.filter(c => c.category === 'teacher');
  const roomConstraints = constraints.filter(c => c.category === 'room');
  const timeConstraints = constraints.filter(c => c.category === 'time');

  const totalEnabled = constraints.filter(c => c.enabled).length;
  const totalConstraints = constraints.length;
  const highPriorityActive = constraints.filter(c => c.priority === 'high' && c.enabled).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                <p className="text-2xl font-bold">{highPriorityActive}</p>
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
              {teacherConstraints.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No teacher constraints configured</p>
              ) : teacherConstraints.map((constraint) => (
                <ConstraintCard
                  key={constraint.id}
                  constraint={constraint}
                  onToggle={handleToggle}
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
              {roomConstraints.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No room constraints configured</p>
              ) : roomConstraints.map((constraint) => (
                <ConstraintCard
                  key={constraint.id}
                  constraint={constraint}
                  onToggle={handleToggle}
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
              {timeConstraints.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No time block constraints configured</p>
              ) : timeConstraints.map((constraint) => (
                <ConstraintCard
                  key={constraint.id}
                  constraint={constraint}
                  onToggle={handleToggle}
                />
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
