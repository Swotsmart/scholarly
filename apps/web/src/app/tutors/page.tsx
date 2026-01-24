'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Filter,
  Star,
  MapPin,
  Clock,
  Award,
  Video,
  Users,
  ChevronDown,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { api, Tutor, PaginatedResponse } from '@/lib/api';
import { formatCurrency, getInitials } from '@/lib/utils';

const subjects = [
  'All Subjects',
  'Mathematics',
  'English',
  'Science',
  'History',
  'Geography',
  'Languages',
  'Arts',
  'Music',
  'Physical Education',
];

const yearLevels = [
  'All Year Levels',
  'Foundation',
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
  'Year 6',
  'Year 7',
  'Year 8',
  'Year 9',
  'Year 10',
  'Year 11',
  'Year 12',
];

const sessionTypes = ['All Types', '1:1 Online', '1:1 In-Person', 'Group Session'];

export default function TutorsPage() {
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('All Subjects');
  const [yearLevel, setYearLevel] = useState('All Year Levels');
  const [sessionType, setSessionType] = useState('All Types');

  const { data, isLoading } = useQuery({
    queryKey: ['tutors', search, subject, yearLevel, sessionType],
    queryFn: () =>
      api.get<PaginatedResponse<Tutor>>('/tutors', {
        search: search || undefined,
        subject: subject !== 'All Subjects' ? subject : undefined,
        yearLevel: yearLevel !== 'All Year Levels' ? yearLevel : undefined,
        sessionType: sessionType !== 'All Types' ? sessionType : undefined,
      }),
  });

  const tutors = data?.data ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Find Your Perfect Tutor</h1>
          <p className="text-muted-foreground">
            AI-powered matching to connect you with verified tutors
          </p>
        </div>

        {/* Search and Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tutors by name, subject, or expertise..."
                  className="pl-10"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={yearLevel} onValueChange={setYearLevel}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Year Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearLevels.map((y) => (
                      <SelectItem key={y} value={y}>
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={sessionType} onValueChange={setSessionType}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue placeholder="Session Type" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessionTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <TutorCardSkeleton key={i} />
            ))}
          </div>
        ) : tutors.length > 0 ? (
          <>
            <p className="text-sm text-muted-foreground">
              Showing {tutors.length} tutors
              {data?.pagination?.total && ` of ${data.pagination.total}`}
            </p>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tutors.map((tutor) => (
                <TutorCard key={tutor.tutorId} tutor={tutor} />
              ))}
            </div>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No tutors found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search criteria or filters
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

function TutorCard({ tutor }: { tutor: Tutor }) {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow">
      <CardContent className="p-0">
        <div className="p-4">
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage src={tutor.avatarUrl} alt={tutor.name} />
              <AvatarFallback className="bg-scholarly-100 text-scholarly-700 text-lg">
                {getInitials(tutor.name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold truncate">{tutor.name}</h3>
                {tutor.trustScore >= 90 && (
                  <Badge variant="success" className="text-xs">
                    <Award className="h-3 w-3 mr-1" />
                    Top Rated
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                <span>{tutor.metrics.averageRating.toFixed(1)}</span>
                <span>({tutor.metrics.ratingCount} reviews)</span>
              </div>
            </div>
          </div>

          {tutor.bio && (
            <p className="text-sm text-muted-foreground mt-3 line-clamp-2">
              {tutor.bio}
            </p>
          )}

          <div className="flex flex-wrap gap-1 mt-3">
            {tutor.subjects.slice(0, 3).map((subject) => (
              <Badge key={subject.subjectId} variant="secondary" className="text-xs">
                {subject.subjectName}
              </Badge>
            ))}
            {tutor.subjects.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tutor.subjects.length - 3} more
              </Badge>
            )}
          </div>

          {tutor.matchScore > 0 && (
            <div className="mt-3 p-2 bg-green-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-green-700 font-medium">
                  {tutor.matchScore}% Match
                </span>
              </div>
              {tutor.matchReasons.length > 0 && (
                <p className="text-xs text-green-600 mt-1">
                  {tutor.matchReasons[0]}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3 bg-gray-50 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">From</p>
            <p className="font-semibold text-scholarly-600">
              {formatCurrency(tutor.pricing.hourlyRate1to1, tutor.pricing.currency)}
              <span className="text-sm font-normal text-muted-foreground">/hr</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {tutor.sessionTypes.includes('online') && (
              <Badge variant="outline" className="text-xs">
                <Video className="h-3 w-3 mr-1" />
                Online
              </Badge>
            )}
            <Button size="sm" className="bg-scholarly-600 hover:bg-scholarly-700">
              View Profile
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TutorCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-2/3" />
            <Skeleton className="h-4 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-12 w-full mt-3" />
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-6 w-20" />
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-6 w-24" />
        </div>
      </CardContent>
    </Card>
  );
}
