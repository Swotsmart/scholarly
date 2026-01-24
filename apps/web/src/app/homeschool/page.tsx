'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users,
  MapPin,
  Calendar,
  Plus,
  Search,
  Star,
  Home,
  Bus,
  BookOpen,
  UserPlus,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { formatDate, getInitials } from '@/lib/utils';

interface HomeschoolCoop {
  id: string;
  name: string;
  description: string;
  location: {
    suburb: string;
    state: string;
  };
  memberCount: number;
  meetingSchedule: string;
  focusAreas: string[];
  isAcceptingMembers: boolean;
}

interface Excursion {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  venueType: string;
  ageRange: {
    minAge: number;
    maxAge: number;
  };
  maxParticipants: number;
  currentParticipants: number;
  pricing: {
    childPrice: number;
    adultPrice: number;
    currency: string;
  };
  organizer: {
    displayName: string;
    avatarUrl?: string;
  };
}

export default function HomeschoolPage() {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('coops');

  const { data: coopsData, isLoading: coopsLoading } = useQuery({
    queryKey: ['homeschool-coops', search],
    queryFn: () =>
      api.get<{ data: HomeschoolCoop[] }>('/homeschool/coops', {
        search: search || undefined,
      }),
  });

  const { data: excursionsData, isLoading: excursionsLoading } = useQuery({
    queryKey: ['homeschool-excursions'],
    queryFn: () => api.get<{ data: Excursion[] }>('/homeschool/excursions'),
  });

  const coops = coopsData?.data ?? [];
  const excursions = excursionsData?.data ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Homeschool Hub</h1>
            <p className="text-muted-foreground">
              Connect with homeschool families, co-ops, and plan excursions
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <UserPlus className="mr-2 h-4 w-4" />
              Join a Co-op
            </Button>
            <Button className="bg-scholarly-600 hover:bg-scholarly-700">
              <Plus className="mr-2 h-4 w-4" />
              Plan Excursion
            </Button>
          </div>
        </div>

        {/* Family Profile Card */}
        <Card className="border-scholarly-200 bg-gradient-to-r from-scholarly-50 to-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-scholarly-100">
                  <Home className="h-6 w-6 text-scholarly-600" />
                </div>
                <div>
                  <CardTitle>Your Homeschool Profile</CardTitle>
                  <CardDescription>Manage your family&apos;s learning journey</CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm">
                Edit Profile
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="text-center p-4 bg-white rounded-lg border">
                <p className="text-2xl font-bold text-scholarly-600">3</p>
                <p className="text-sm text-muted-foreground">Children</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <p className="text-2xl font-bold text-scholarly-600">2</p>
                <p className="text-sm text-muted-foreground">Co-ops Joined</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <p className="text-2xl font-bold text-scholarly-600">5</p>
                <p className="text-sm text-muted-foreground">Upcoming Events</p>
              </div>
              <div className="text-center p-4 bg-white rounded-lg border">
                <p className="text-2xl font-bold text-scholarly-600">12</p>
                <p className="text-sm text-muted-foreground">Connections</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="coops" className="gap-2">
              <Users className="h-4 w-4" />
              Co-ops
            </TabsTrigger>
            <TabsTrigger value="excursions" className="gap-2">
              <Bus className="h-4 w-4" />
              Excursions
            </TabsTrigger>
            <TabsTrigger value="resources" className="gap-2">
              <BookOpen className="h-4 w-4" />
              Resources
            </TabsTrigger>
          </TabsList>

          <TabsContent value="coops" className="space-y-4 mt-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search co-ops by name, location, or focus area..."
                className="pl-10"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Co-ops List */}
            {coopsLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {[1, 2, 3, 4].map((i) => (
                  <CoopCardSkeleton key={i} />
                ))}
              </div>
            ) : coops.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                {coops.map((coop) => (
                  <CoopCard key={coop.id} coop={coop} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No co-ops found</h3>
                  <p className="text-muted-foreground mb-4">
                    Be the first to start a homeschool co-op in your area
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Co-op
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="excursions" className="space-y-4 mt-4">
            {/* Upcoming Excursions */}
            {excursionsLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <ExcursionCardSkeleton key={i} />
                ))}
              </div>
            ) : excursions.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {excursions.map((excursion) => (
                  <ExcursionCard key={excursion.id} excursion={excursion} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Bus className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No excursions planned</h3>
                  <p className="text-muted-foreground mb-4">
                    Plan an educational excursion for homeschool families
                  </p>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Plan Excursion
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="resources" className="mt-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Curriculum Planning</CardTitle>
                  <CardDescription>
                    Tools and templates for planning your homeschool curriculum
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Explore Tools
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Registration Guide</CardTitle>
                  <CardDescription>
                    State-by-state homeschool registration requirements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    View Guide
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle className="text-lg">Assessment Resources</CardTitle>
                  <CardDescription>
                    Tools for tracking progress and creating portfolios
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" className="w-full">
                    Get Started
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function CoopCard({ coop }: { coop: HomeschoolCoop }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{coop.name}</CardTitle>
            <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
              <MapPin className="h-4 w-4" />
              {coop.location.suburb}, {coop.location.state}
            </div>
          </div>
          {coop.isAcceptingMembers && (
            <Badge variant="success" className="text-xs">
              Accepting Members
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
          {coop.description}
        </p>
        <div className="flex flex-wrap gap-1 mb-4">
          {coop.focusAreas.map((area) => (
            <Badge key={area} variant="secondary" className="text-xs">
              {area}
            </Badge>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {coop.memberCount} families
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {coop.meetingSchedule}
            </span>
          </div>
          <Button size="sm" variant="outline">
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ExcursionCard({ excursion }: { excursion: Excursion }) {
  const spotsLeft = excursion.maxParticipants - excursion.currentParticipants;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <Badge variant="outline" className="text-xs">
            {excursion.venueType}
          </Badge>
          <Badge
            variant={spotsLeft > 5 ? 'success' : spotsLeft > 0 ? 'warning' : 'destructive'}
            className="text-xs"
          >
            {spotsLeft > 0 ? `${spotsLeft} spots left` : 'Full'}
          </Badge>
        </div>
        <CardTitle className="text-lg mt-2">{excursion.title}</CardTitle>
        <CardDescription className="line-clamp-2">{excursion.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 text-sm text-muted-foreground mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            {formatDate(excursion.date)}
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            {excursion.location}
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Ages {excursion.ageRange.minAge}-{excursion.ageRange.maxAge}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={excursion.organizer.avatarUrl} />
              <AvatarFallback className="text-xs">
                {getInitials(excursion.organizer.displayName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-xs text-muted-foreground">
              {excursion.organizer.displayName}
            </span>
          </div>
          <Button size="sm" disabled={spotsLeft === 0}>
            {spotsLeft > 0 ? 'Register' : 'Join Waitlist'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function CoopCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-2/3" />
        <Skeleton className="h-4 w-1/3 mt-2" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-12 w-full mb-4" />
        <div className="flex gap-2 mb-4">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}

function ExcursionCardSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-24" />
        </div>
        <Skeleton className="h-6 w-3/4 mt-2" />
        <Skeleton className="h-10 w-full mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/3" />
        </div>
        <Skeleton className="h-8 w-full" />
      </CardContent>
    </Card>
  );
}
