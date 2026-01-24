'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Users,
  Search,
  Star,
  Clock,
  Video,
  MapPin,
  Filter,
  GraduationCap,
} from 'lucide-react';

const tutors = [
  {
    id: 'tutor_1',
    name: 'Sarah Chen',
    bio: 'Experienced mathematics tutor specializing in making complex concepts simple and engaging.',
    subjects: ['Mathematics', 'Physics'],
    yearLevels: ['Year 7-12'],
    rating: 4.8,
    reviewCount: 89,
    hourlyRate: 65,
    sessionsCompleted: 234,
    responseTime: '< 1 hour',
    availability: 'Weekday afternoons, Saturdays',
    languages: ['English', 'Mandarin'],
  },
  {
    id: 'tutor_2',
    name: 'Michael Torres',
    bio: 'Physics teacher with 10+ years of experience. Passionate about helping students achieve their goals.',
    subjects: ['Physics', 'Chemistry'],
    yearLevels: ['Year 10-12'],
    rating: 4.9,
    reviewCount: 67,
    hourlyRate: 70,
    sessionsCompleted: 189,
    responseTime: '< 2 hours',
    availability: 'Evenings, Weekends',
    languages: ['English'],
  },
  {
    id: 'tutor_3',
    name: 'Emily Watson',
    bio: 'English literature specialist with a focus on essay writing and critical analysis skills.',
    subjects: ['English', 'Literature'],
    yearLevels: ['Year 9-12'],
    rating: 4.7,
    reviewCount: 54,
    hourlyRate: 60,
    sessionsCompleted: 156,
    responseTime: '< 3 hours',
    availability: 'Flexible',
    languages: ['English'],
  },
];

export default function TutorSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-2">Find a Tutor</h1>
        <p className="text-muted-foreground">
          Browse qualified tutors and book a session
        </p>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by subject, topic, or tutor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="mr-2 h-4 w-4" />
          Filters
        </Button>
      </div>

      {/* Tutor Cards */}
      <div className="space-y-4">
        {tutors.map((tutor) => (
          <Card key={tutor.id}>
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* Avatar */}
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <GraduationCap className="h-12 w-12 text-primary" />
                </div>

                {/* Info */}
                <div className="flex-1 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{tutor.name}</h3>
                      <p className="text-muted-foreground">{tutor.bio}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">${tutor.hourlyRate}</p>
                      <p className="text-sm text-muted-foreground">per hour</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {tutor.subjects.map((subject) => (
                      <Badge key={subject}>{subject}</Badge>
                    ))}
                    {tutor.yearLevels.map((level) => (
                      <Badge key={level} variant="secondary">{level}</Badge>
                    ))}
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="font-medium text-foreground">{tutor.rating}</span>
                      <span>({tutor.reviewCount} reviews)</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      {tutor.sessionsCompleted} sessions
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Responds {tutor.responseTime}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Available: {tutor.availability}
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline">View Profile</Button>
                      <Button>Book Session</Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
