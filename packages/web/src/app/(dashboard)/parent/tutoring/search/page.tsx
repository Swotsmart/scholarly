'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Star, MapPin, Clock, GraduationCap, Loader2 } from 'lucide-react';
import { tutoringApi } from '@/lib/tutoring-api';
import type { TutorSearchResult } from '@/types/tutoring';

// ---------------------------------------------------------------------------
// Bridge
// ---------------------------------------------------------------------------

interface TutorDisplay {
  id: string; name: string; avatar: string; subjects: string[];
  rating: number; reviews: number; hourlyRate: number;
  location: string; availability: string; bio: string; verified: boolean;
}

function bridgeResults(results: TutorSearchResult[]): TutorDisplay[] {
  return results.map(t => ({
    id: t.tutorId, name: t.name, avatar: t.avatarUrl || '',
    subjects: t.subjects.map(s => s.subjectName),
    rating: t.metrics.averageRating, reviews: t.metrics.totalReviews,
    hourlyRate: t.pricing.hourlyRate1to1,
    location: 'Australia',
    availability: t.sessionTypes.includes('video') ? 'Online available' : 'In-person only',
    bio: t.bio || '', verified: t.trustScore >= 80,
  }));
}

const FALLBACK: TutorDisplay[] = [
  { id: 't1', name: 'Dr. Sarah Chen', avatar: '', subjects: ['Mathematics', 'Physics'], rating: 4.9, reviews: 127, hourlyRate: 75, location: 'Sydney, NSW', availability: 'Mon-Fri, 4PM-8PM', bio: 'PhD in Mathematics with 10+ years of tutoring experience.', verified: true },
  { id: 't2', name: 'James Wilson', avatar: '', subjects: ['English Literature', 'Essay Writing'], rating: 4.8, reviews: 89, hourlyRate: 65, location: 'Melbourne, VIC', availability: 'Tue-Sat, 3PM-7PM', bio: 'Published author and former English teacher.', verified: true },
  { id: 't3', name: 'Maria Garcia', avatar: '', subjects: ['Spanish', 'French'], rating: 5.0, reviews: 64, hourlyRate: 55, location: 'Brisbane, QLD', availability: 'Mon-Thu, 2PM-6PM', bio: 'Native Spanish speaker with DELE certification.', verified: true },
  { id: 't4', name: 'David Park', avatar: '', subjects: ['Chemistry', 'Biology'], rating: 4.7, reviews: 52, hourlyRate: 70, location: 'Perth, WA', availability: 'Wed-Sun, 5PM-9PM', bio: 'Science enthusiast making complex concepts simple.', verified: false },
  { id: 't5', name: 'Emily Thompson', avatar: '', subjects: ['Piano', 'Music Theory'], rating: 4.9, reviews: 98, hourlyRate: 60, location: 'Adelaide, SA', availability: 'Mon-Sat, 3PM-8PM', bio: 'Conservatory graduate with 15 years of teaching experience.', verified: true },
];

const SUBJECTS = ['All Subjects', 'Mathematics', 'English', 'Science', 'Languages', 'Music', 'Arts'];

export default function ParentTutoringSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');
  const [tutors, setTutors] = useState<TutorDisplay[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchTutors() {
      setIsLoading(true);
      try {
        const subjectParam = selectedSubject !== 'All Subjects' ? selectedSubject : undefined;
        const result = await tutoringApi.searchTutors({ subject: subjectParam });
        setTutors(bridgeResults(result.tutors));
      } catch {
        setTutors(null);
      } finally {
        setIsLoading(false);
      }
    }
    fetchTutors();
  }, [selectedSubject]);

  const displayTutors = tutors || FALLBACK;
  const filtered = displayTutors.filter(t =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Find a Tutor</h1>
        <p className="text-muted-foreground">Browse and book qualified tutors for your children</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Search by name or subject..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {SUBJECTS.map((s) => (
                <Button key={s} variant={selectedSubject === s ? 'default' : 'outline'} size="sm" onClick={() => setSelectedSubject(s)}>{s}</Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{filtered.length} tutors found</p>
        {filtered.map((t) => (
          <Card key={t.id}>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={t.avatar} />
                  <AvatarFallback className="text-xl">{t.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{t.name}</h3>
                        {t.verified && <Badge className="bg-blue-100 text-blue-700">Verified</Badge>}
                      </div>
                      <div className="flex items-center gap-1 mt-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span className="font-medium">{t.rating}</span>
                        <span className="text-muted-foreground">({t.reviews} reviews)</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">${t.hourlyRate}</p>
                      <p className="text-sm text-muted-foreground">per hour</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {t.subjects.map((sub) => <Badge key={sub} variant="secondary"><GraduationCap className="h-3 w-3 mr-1" />{sub}</Badge>)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-3">{t.bio}</p>
                  <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{t.location}</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{t.availability}</span>
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
        ))}
      </div>
    </div>
  );
}
