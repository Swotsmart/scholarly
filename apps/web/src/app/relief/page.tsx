'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Calendar,
  Clock,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Users,
  TrendingUp,
  Bell,
  Search,
  Filter,
  Plus,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { api } from '@/lib/api';
import { formatDate, formatDateTime, getInitials } from '@/lib/utils';

interface TeacherAbsence {
  id: string;
  date: string;
  reason: string;
  status: 'pending' | 'assigned' | 'filled' | 'unfilled';
  school: {
    name: string;
    location: string;
  };
  subject: string;
  yearLevel: string;
  reliefTeacher?: {
    name: string;
    avatarUrl?: string;
  };
}

interface ReliefPrediction {
  date: string;
  probability: number;
  predictedAbsences: number;
  factors: string[];
}

export default function ReliefPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('absences');
  const [search, setSearch] = useState('');

  const { data: absencesData, isLoading: absencesLoading } = useQuery({
    queryKey: ['relief-absences'],
    queryFn: () => api.get<{ data: TeacherAbsence[] }>('/relief/absences'),
  });

  const { data: predictionsData, isLoading: predictionsLoading } = useQuery({
    queryKey: ['relief-predictions'],
    queryFn: () => api.get<{ predictions: ReliefPrediction[] }>('/relief/predictions'),
  });

  const absences = absencesData?.data ?? [];
  const predictions = predictionsData?.predictions ?? [];

  const isSchoolAdmin = user?.roles?.includes('school_admin');

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Relief Teacher Marketplace</h1>
            <p className="text-muted-foreground">
              AI-powered absence prediction and instant relief teacher booking
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Bell className="mr-2 h-4 w-4" />
              Alerts
            </Button>
            {isSchoolAdmin && (
              <Button className="bg-scholarly-600 hover:bg-scholarly-700">
                <Plus className="mr-2 h-4 w-4" />
                Report Absence
              </Button>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today&apos;s Absences</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <div className="p-3 rounded-full bg-red-100">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Filled Positions</p>
                  <p className="text-2xl font-bold">9</p>
                </div>
                <div className="p-3 rounded-full bg-green-100">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Available Relief</p>
                  <p className="text-2xl font-bold">45</p>
                </div>
                <div className="p-3 rounded-full bg-blue-100">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Fill Rate</p>
                  <p className="text-2xl font-bold">94%</p>
                </div>
                <div className="p-3 rounded-full bg-purple-100">
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="absences" className="gap-2">
              <Calendar className="h-4 w-4" />
              Absences
            </TabsTrigger>
            <TabsTrigger value="predictions" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              AI Predictions
            </TabsTrigger>
            <TabsTrigger value="pool" className="gap-2">
              <Users className="h-4 w-4" />
              Relief Pool
            </TabsTrigger>
          </TabsList>

          <TabsContent value="absences" className="space-y-4 mt-4">
            {/* Search and Filters */}
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by school, subject, or teacher..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="assigned">Assigned</SelectItem>
                  <SelectItem value="filled">Filled</SelectItem>
                  <SelectItem value="unfilled">Unfilled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Absences List */}
            {absencesLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <AbsenceCardSkeleton key={i} />
                ))}
              </div>
            ) : absences.length > 0 ? (
              <div className="space-y-4">
                {absences.map((absence) => (
                  <AbsenceCard key={absence.id} absence={absence} />
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No absences reported</h3>
                  <p className="text-muted-foreground">
                    All teachers are present today
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="predictions" className="space-y-4 mt-4">
            <Card className="border-scholarly-200 bg-gradient-to-r from-scholarly-50 to-white">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-scholarly-600" />
                  AI Absence Predictions
                </CardTitle>
                <CardDescription>
                  Machine learning predictions based on historical patterns, weather, events, and more
                </CardDescription>
              </CardHeader>
              <CardContent>
                {predictionsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-20 w-full" />
                    ))}
                  </div>
                ) : predictions.length > 0 ? (
                  <div className="space-y-4">
                    {predictions.map((prediction) => (
                      <PredictionCard key={prediction.date} prediction={prediction} />
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-8">
                    No predictions available. More data needed for accurate forecasting.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pool" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle>Relief Teacher Pool</CardTitle>
                <CardDescription>
                  Verified relief teachers available for bookings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4" />
                  <p>Relief teacher pool management coming soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function AbsenceCard({ absence }: { absence: TeacherAbsence }) {
  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    assigned: 'bg-blue-100 text-blue-800',
    filled: 'bg-green-100 text-green-800',
    unfilled: 'bg-red-100 text-red-800',
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold">{absence.school.name}</h3>
              <Badge className={statusColors[absence.status]}>
                {absence.status.charAt(0).toUpperCase() + absence.status.slice(1)}
              </Badge>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {formatDate(absence.date)}
              </span>
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {absence.school.location}
              </span>
              <span>{absence.subject} - {absence.yearLevel}</span>
            </div>
          </div>

          {absence.reliefTeacher ? (
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={absence.reliefTeacher.avatarUrl} />
                <AvatarFallback>
                  {getInitials(absence.reliefTeacher.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{absence.reliefTeacher.name}</p>
                <p className="text-xs text-muted-foreground">Relief Teacher</p>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="outline">
              Find Relief
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function PredictionCard({ prediction }: { prediction: ReliefPrediction }) {
  const probabilityColor =
    prediction.probability >= 70
      ? 'text-red-600'
      : prediction.probability >= 40
      ? 'text-yellow-600'
      : 'text-green-600';

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-lg border">
      <div>
        <p className="font-medium">{formatDate(prediction.date)}</p>
        <p className="text-sm text-muted-foreground">
          Predicted: {prediction.predictedAbsences} absences
        </p>
        {prediction.factors.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {prediction.factors.map((factor) => (
              <Badge key={factor} variant="outline" className="text-xs">
                {factor}
              </Badge>
            ))}
          </div>
        )}
      </div>
      <div className="text-right">
        <p className={`text-2xl font-bold ${probabilityColor}`}>
          {prediction.probability}%
        </p>
        <p className="text-xs text-muted-foreground">probability</p>
      </div>
    </div>
  );
}

function AbsenceCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-10 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
