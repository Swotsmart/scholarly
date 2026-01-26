'use client';

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
} from 'lucide-react';

const stats = [
  { label: 'Total Relief Teachers', value: '32', icon: Users, color: 'blue' },
  { label: 'Available Today', value: '8', icon: UserCheck, color: 'green' },
  { label: 'Active Assignments', value: '5', icon: ClipboardCheck, color: 'purple' },
  { label: 'Coverage Rate', value: '94%', icon: TrendingUp, color: 'orange' },
];

const reliefTeachers = [
  {
    id: 'rt1',
    name: 'Sarah Mitchell',
    qualifications: ['Mathematics', 'Physics'],
    availability: 'Monday to Friday',
    rating: 4.8,
    status: 'available' as const,
    completedAssignments: 42,
  },
  {
    id: 'rt2',
    name: 'David Park',
    qualifications: ['English', 'History'],
    availability: 'Mon, Wed, Fri',
    rating: 4.6,
    status: 'assigned' as const,
    completedAssignments: 28,
  },
  {
    id: 'rt3',
    name: 'Emma Kowalski',
    qualifications: ['Science', 'Biology', 'Chemistry'],
    availability: 'Tuesday to Thursday',
    rating: 4.9,
    status: 'available' as const,
    completedAssignments: 56,
  },
  {
    id: 'rt4',
    name: 'James Okafor',
    qualifications: ['PE', 'Health', 'Outdoor Ed'],
    availability: 'Monday to Friday',
    rating: 4.5,
    status: 'available' as const,
    completedAssignments: 35,
  },
  {
    id: 'rt5',
    name: 'Priya Sharma',
    qualifications: ['Art', 'Design & Technology'],
    availability: 'Monday to Thursday',
    rating: 4.7,
    status: 'unavailable' as const,
    completedAssignments: 19,
  },
  {
    id: 'rt6',
    name: 'Michael Torres',
    qualifications: ['Music', 'Drama'],
    availability: 'Wednesday to Friday',
    rating: 4.4,
    status: 'available' as const,
    completedAssignments: 22,
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case 'available':
      return <Badge className="bg-green-100 text-green-800 border-green-300">Available</Badge>;
    case 'assigned':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Assigned</Badge>;
    case 'unavailable':
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
              placeholder="Search relief teachers by name or qualification..."
              className="pl-10"
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
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left font-medium">Name</th>
                <th className="p-4 text-left font-medium">Qualifications</th>
                <th className="p-4 text-left font-medium">Availability</th>
                <th className="p-4 text-left font-medium">Rating</th>
                <th className="p-4 text-left font-medium">Completed</th>
                <th className="p-4 text-left font-medium">Status</th>
                <th className="p-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reliefTeachers.map((teacher) => (
                <tr key={teacher.id} className="border-b">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-xs font-medium text-primary">
                          {teacher.name.split(' ').map((n) => n[0]).join('')}
                        </span>
                      </div>
                      <span className="font-medium">{teacher.name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1">
                      {teacher.qualifications.map((qual) => (
                        <Badge key={qual} variant="secondary" className="text-xs">
                          {qual}
                        </Badge>
                      ))}
                    </div>
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{teacher.availability}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-1">
                      {renderStars(teacher.rating)}
                      <span className="ml-1 text-sm text-muted-foreground">{teacher.rating}</span>
                    </div>
                  </td>
                  <td className="p-4 text-sm">{teacher.completedAssignments}</td>
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
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
