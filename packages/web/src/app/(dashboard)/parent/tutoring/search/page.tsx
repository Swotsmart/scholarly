'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Star, MapPin, Clock, GraduationCap } from 'lucide-react';
import { api, TutorSearchProfile } from '@/lib/api';

const SUBJECTS = [
  'All Subjects',
  'Mathematics',
  'English',
  'Science',
  'Languages',
  'Music',
  'Arts',
];

// Fallback data for when API returns no results
const FALLBACK_TUTORS: TutorSearchProfile[] = [
  {
    id: 't1',
    name: 'Dr. Sarah Chen',
    bio: 'PhD in Mathematics with 10+ years of tutoring experience. Specializing in high school and university level math.',
    subjects: ['Mathematics', 'Physics'],
    yearLevels: ['Year 7-12'],
    rating: 4.9,
    reviewCount: 127,
    hourlyRate: 75,
    sessionsCompleted: 340,
    responseTime: '< 1 hour',
    availability: 'Mon-Fri, 4PM-8PM',
    location: 'Sydney, NSW',
    languages: ['English', 'Mandarin'],
    verified: true,
  },
  {
    id: 't2',
    name: 'James Wilson',
    bio: 'Published author and former English teacher. Helping students excel in creative and academic writing.',
    subjects: ['English Literature', 'Essay Writing'],
    yearLevels: ['Year 9-12'],
    rating: 4.8,
    reviewCount: 89,
    hourlyRate: 65,
    sessionsCompleted: 210,
    responseTime: '< 2 hours',
    availability: 'Tue-Sat, 3PM-7PM',
    location: 'Melbourne, VIC',
    languages: ['English'],
    verified: true,
  },
  {
    id: 't3',
    name: 'Maria Garcia',
    bio: 'Native Spanish speaker with DELE certification. Making language learning fun and effective.',
    subjects: ['Spanish', 'French'],
    yearLevels: ['Year 5-12'],
    rating: 5.0,
    reviewCount: 64,
    hourlyRate: 55,
    sessionsCompleted: 180,
    responseTime: '< 1 hour',
    availability: 'Mon-Thu, 2PM-6PM',
    location: 'Brisbane, QLD',
    languages: ['English', 'Spanish', 'French'],
    verified: true,
  },
  {
    id: 't4',
    name: 'David Park',
    bio: 'Science enthusiast with a passion for making complex concepts simple. VCE and HSC specialist.',
    subjects: ['Chemistry', 'Biology'],
    yearLevels: ['Year 10-12'],
    rating: 4.7,
    reviewCount: 52,
    hourlyRate: 70,
    sessionsCompleted: 145,
    responseTime: '< 3 hours',
    availability: 'Wed-Sun, 5PM-9PM',
    location: 'Perth, WA',
    languages: ['English', 'Korean'],
    verified: false,
  },
  {
    id: 't5',
    name: 'Emily Thompson',
    bio: 'Conservatory graduate with 15 years of teaching experience. All ages and skill levels welcome.',
    subjects: ['Piano', 'Music Theory'],
    yearLevels: ['All levels'],
    rating: 4.9,
    reviewCount: 98,
    hourlyRate: 60,
    sessionsCompleted: 420,
    responseTime: '< 1 hour',
    availability: 'Mon-Sat, 3PM-8PM',
    location: 'Adelaide, SA',
    languages: ['English'],
    verified: true,
  },
];

export default function ParentTutoringSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [tutors, setTutors] = useState<TutorSearchProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTutors = useCallback(async (search?: string, subject?: string) => {
    setIsLoading(true);
    const filters: { search?: string; subject?: string } = {};
    if (search) filters.search = search;
    if (subject && subject !== 'All Subjects') filters.subject = subject;

    const response = await api.search.tutors(filters);

    if (response.success && response.data.tutors.length > 0) {
      setTutors(response.data.tutors);
    } else {
      // Apply client-side filtering to fallback data
      let filtered = FALLBACK_TUTORS;
      if (search) {
        const q = search.toLowerCase();
        filtered = filtered.filter(t =>
          t.name.toLowerCase().includes(q) ||
          t.subjects.some(s => s.toLowerCase().includes(q))
        );
      }
      if (subject && subject !== 'All Subjects') {
        filtered = filtered.filter(t =>
          t.subjects.some(s => s.toLowerCase().includes(subject.toLowerCase()))
        );
      }
      setTutors(filtered);
    }
    setIsLoading(false);
  }, []);

  // Initial load
  useEffect(() => {
    fetchTutors();
  }, [fetchTutors]);

  // Refetch when filters change (debounced for search, immediate for subject)
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTutors(searchQuery || undefined, selectedSubject);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedSubject, fetchTutors]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Find a Tutor</h1>
        <p className="text-muted-foreground">Browse and book qualified tutors for your children</p>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name or subject..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {SUBJECTS.map((subject) => (
                <Button
                  key={subject}
                  variant={selectedSubject === subject ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedSubject(subject)}
                >
                  {subject}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {isLoading ? 'Searching...' : `${tutors.length} tutors found`}
        </p>

        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Skeleton className="h-20 w-20 rounded-full" />
                  <div className="flex-1 space-y-3">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-24" />
                      <Skeleton className="h-6 w-24" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        ) : tutors.length === 0 ? (
          <div className="py-12 text-center">
            <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <p className="mt-4 text-lg font-medium">No tutors found</p>
            <p className="text-muted-foreground">Try adjusting your search or filters</p>
          </div>
        ) : (
          tutors.map((tutor) => (
            <Card key={tutor.id}>
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Avatar className="h-20 w-20">
                    <AvatarImage src={tutor.avatarUrl} />
                    <AvatarFallback className="text-xl">
                      {tutor.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{tutor.name}</h3>
                          {tutor.verified && (
                            <Badge className="bg-blue-100 text-blue-700">Verified</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium">{tutor.rating}</span>
                          <span className="text-muted-foreground">({tutor.reviewCount} reviews)</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">${tutor.hourlyRate}</p>
                        <p className="text-sm text-muted-foreground">per hour</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-3">
                      {tutor.subjects.map((subject) => (
                        <Badge key={subject} variant="secondary">
                          <GraduationCap className="h-3 w-3 mr-1" />
                          {subject}
                        </Badge>
                      ))}
                    </div>

                    <p className="text-sm text-muted-foreground mt-3">{tutor.bio}</p>

                    <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                      {tutor.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {tutor.location}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {tutor.availability}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-4">
                      <Button>Book Session</Button>
                      <Button variant="outline">View Profile</Button>
                      <Button variant="ghost">Message</Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
