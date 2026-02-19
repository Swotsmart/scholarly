'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserCheck,
  ClipboardCheck,
  TrendingUp,
  Search,
  Star,
  Plus,
  Loader2,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { ReliefTeacherItem, ReliefStats } from '@/lib/api';

function getStatusBadge(status: string) {
  switch (status) {
    case 'available':
      return <Badge className="bg-green-100 text-green-800 border-green-300">Available</Badge>;
    case 'assigned':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Assigned</Badge>;
    case 'unavailable':
    case 'pending_verification':
      return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Unavailable</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function renderStars(rating: number) {
  const fullStars = Math.floor(rating);
  const hasHalf = rating % 1 >= 0.5;
  const stars = [];
  for (let i = 0; i < fullStars; i++) {
    stars.push(
      <Star key={`full-${i}`} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
    );
  }
  if (hasHalf) {
    stars.push(
      <Star key="half" className="h-4 w-4 text-yellow-400" />
    );
  }
  return stars;
}

export default function AdminReliefPage() {
  const [teachers, setTeachers] = useState<ReliefTeacherItem[]>([]);
  const [stats, setStats] = useState<ReliefStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    async function fetchData() {
      try {
        const [teachersRes, statsRes] = await Promise.all([
          api.relief.getTeachers(),
          api.relief.getStats(),
        ]);
        if (teachersRes.success && teachersRes.data) {
          setTeachers(teachersRes.data.teachers);
        }
        if (statsRes.success && statsRes.data) {
          setStats(statsRes.data.stats);
        }
      } catch (err) {
        console.error('Failed to load relief data:', err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, []);

  const filteredTeachers = searchQuery
    ? teachers.filter(t =>
        t.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    : teachers;

  const statCards = [
    { label: 'Total Relief Teachers', value: String(stats?.availableTeachers ?? teachers.length), icon: Users, color: 'blue' },
    { label: 'Available Today', value: String(stats?.availableTeachers ?? 0), icon: UserCheck, color: 'green' },
    { label: 'Pending Requests', value: String(stats?.pendingRequests ?? 0), icon: ClipboardCheck, color: 'purple' },
    { label: 'Coverage Rate', value: `${stats?.fillRate ?? 100}%`, icon: TrendingUp, color: 'orange' },
  ];

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
          <h1 className="heading-2">Relief Teacher Pool</h1>
          <p className="text-muted-foreground">
            Manage relief and casual teaching staff across the school
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Relief Teacher
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
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
              placeholder="Search relief teachers by name or qualification..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Relief Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Relief Teacher Pool</CardTitle>
          <CardDescription>All registered relief and casual teachers</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {filteredTeachers.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              {searchQuery ? 'No teachers match your search.' : 'No relief teachers registered yet.'}
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-4 text-left font-medium">Name</th>
                  <th className="p-4 text-left font-medium">Qualifications</th>
                  <th className="p-4 text-left font-medium">Year Levels</th>
                  <th className="p-4 text-left font-medium">Rating</th>
                  <th className="p-4 text-left font-medium">Completed</th>
                  <th className="p-4 text-left font-medium">Status</th>
                  <th className="p-4 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTeachers.map((teacher) => {
                  const metrics = teacher.metrics || {};
                  const rating = metrics.averageRating ?? 0;
                  const completed = metrics.completedAssignments ?? metrics.totalAssignments ?? 0;

                  return (
                    <tr key={teacher.id} className="border-b">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                            <span className="text-xs font-medium text-primary">
                              {teacher.displayName.split(' ').map((n) => n[0]).join('')}
                            </span>
                          </div>
                          <span className="font-medium">{teacher.displayName}</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects.map((subj) => (
                            <Badge key={subj} variant="secondary" className="text-xs">
                              {subj}
                            </Badge>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {teacher.yearLevels.length > 3
                          ? `${teacher.yearLevels[0]} - ${teacher.yearLevels[teacher.yearLevels.length - 1]}`
                          : teacher.yearLevels.join(', ')}
                      </td>
                      <td className="p-4">
                        {rating > 0 ? (
                          <div className="flex items-center gap-1">
                            {renderStars(rating)}
                            <span className="ml-1 text-sm text-muted-foreground">{rating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No rating</span>
                        )}
                      </td>
                      <td className="p-4 text-sm">{completed}</td>
                      <td className="p-4">{getStatusBadge(teacher.status)}</td>
                      <td className="p-4">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            View Profile
                          </Button>
                          {teacher.status === 'available' && (
                            <Button size="sm">
                              Assign
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
