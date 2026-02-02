'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  School,
  Search,
  Plus,
  Users,
  MapPin,
  Star,
  CheckCircle2,
  Clock,
  Calendar,
  TrendingUp,
  GraduationCap,
} from 'lucide-react';

const microSchools = [
  {
    id: 1,
    name: 'Montessori Learning Pod - Sydney',
    location: 'Bondi, NSW',
    students: 12,
    capacity: 15,
    status: 'active',
    rating: 4.9,
    curriculum: 'Montessori + ACARA',
    coordinator: 'Sarah Chen',
  },
  {
    id: 2,
    name: 'STEM Academy Melbourne',
    location: 'Richmond, VIC',
    students: 18,
    capacity: 20,
    status: 'active',
    rating: 4.7,
    curriculum: 'STEM-focused',
    coordinator: 'James Wilson',
  },
  {
    id: 3,
    name: 'Nature School Brisbane',
    location: 'Paddington, QLD',
    students: 8,
    capacity: 12,
    status: 'active',
    rating: 4.8,
    curriculum: 'Forest School + EYLF',
    coordinator: 'Emma Taylor',
  },
  {
    id: 4,
    name: 'Classical Education Perth',
    location: 'Subiaco, WA',
    students: 0,
    capacity: 15,
    status: 'pending',
    rating: 0,
    curriculum: 'Classical Trivium',
    coordinator: 'Michael Brown',
  },
];

export default function MicroSchoolsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <School className="h-8 w-8" />
            Micro-Schools Management
          </h1>
          <p className="text-muted-foreground">
            Manage learning pods and micro-school networks
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Register Micro-School
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <School className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Active Schools</span>
            </div>
            <div className="mt-2 text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground mt-1">1 pending approval</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Total Students</span>
            </div>
            <div className="mt-2 text-2xl font-bold">38</div>
            <p className="text-xs text-emerald-600 mt-1">+5 this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Coordinators</span>
            </div>
            <div className="mt-2 text-2xl font-bold">4</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Avg. Rating</span>
            </div>
            <div className="mt-2 text-2xl font-bold">4.8</div>
            <div className="flex mt-1">
              {[1,2,3,4,5].map(i => (
                <Star key={i} className={`h-3 w-3 ${i <= 4 ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`} />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search micro-schools..." className="pl-10" />
      </div>

      {/* Schools List */}
      <div className="grid gap-4">
        {microSchools.map((school) => (
          <Card key={school.id}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <School className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{school.name}</h3>
                      <Badge variant={school.status === 'active' ? 'default' : 'secondary'}>
                        {school.status === 'active' ? (
                          <><CheckCircle2 className="mr-1 h-3 w-3" /> Active</>
                        ) : (
                          <><Clock className="mr-1 h-3 w-3" /> Pending</>
                        )}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {school.location}
                      </span>
                      <span className="flex items-center gap-1">
                        <GraduationCap className="h-4 w-4" />
                        {school.coordinator}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="outline">{school.curriculum}</Badge>
                      {school.rating > 0 && (
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{school.rating}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="mb-2">
                    <span className="text-2xl font-bold">{school.students}</span>
                    <span className="text-muted-foreground">/{school.capacity}</span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">students enrolled</p>
                  <Progress value={(school.students / school.capacity) * 100} className="h-2 w-32" />
                </div>
              </div>

              <div className="flex gap-2 mt-4 pt-4 border-t">
                <Button variant="outline" size="sm">View Details</Button>
                <Button variant="outline" size="sm">Students</Button>
                <Button variant="outline" size="sm">Schedule</Button>
                <Button variant="outline" size="sm">Reports</Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
