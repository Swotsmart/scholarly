'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Search, Star, MapPin, Clock, GraduationCap, Filter } from 'lucide-react';

const TUTORS = [
  {
    id: 't1',
    name: 'Dr. Sarah Chen',
    avatar: '',
    subjects: ['Mathematics', 'Physics'],
    rating: 4.9,
    reviews: 127,
    hourlyRate: 75,
    location: 'Sydney, NSW',
    availability: 'Mon-Fri, 4PM-8PM',
    bio: 'PhD in Mathematics with 10+ years of tutoring experience. Specializing in high school and university level math.',
    verified: true,
  },
  {
    id: 't2',
    name: 'James Wilson',
    avatar: '',
    subjects: ['English Literature', 'Essay Writing'],
    rating: 4.8,
    reviews: 89,
    hourlyRate: 65,
    location: 'Melbourne, VIC',
    availability: 'Tue-Sat, 3PM-7PM',
    bio: 'Published author and former English teacher. Helping students excel in creative and academic writing.',
    verified: true,
  },
  {
    id: 't3',
    name: 'Maria Garcia',
    avatar: '',
    subjects: ['Spanish', 'French'],
    rating: 5.0,
    reviews: 64,
    hourlyRate: 55,
    location: 'Brisbane, QLD',
    availability: 'Mon-Thu, 2PM-6PM',
    bio: 'Native Spanish speaker with DELE certification. Making language learning fun and effective.',
    verified: true,
  },
  {
    id: 't4',
    name: 'David Park',
    avatar: '',
    subjects: ['Chemistry', 'Biology'],
    rating: 4.7,
    reviews: 52,
    hourlyRate: 70,
    location: 'Perth, WA',
    availability: 'Wed-Sun, 5PM-9PM',
    bio: 'Science enthusiast with a passion for making complex concepts simple. VCE and HSC specialist.',
    verified: false,
  },
  {
    id: 't5',
    name: 'Emily Thompson',
    avatar: '',
    subjects: ['Piano', 'Music Theory'],
    rating: 4.9,
    reviews: 98,
    hourlyRate: 60,
    location: 'Adelaide, SA',
    availability: 'Mon-Sat, 3PM-8PM',
    bio: 'Conservatory graduate with 15 years of teaching experience. All ages and skill levels welcome.',
    verified: true,
  },
];

const SUBJECTS = [
  'All Subjects',
  'Mathematics',
  'English',
  'Science',
  'Languages',
  'Music',
  'Arts',
];

export default function ParentTutoringSearchPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('All Subjects');

  const filteredTutors = TUTORS.filter(tutor => {
    const matchesSearch = tutor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tutor.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesSubject = selectedSubject === 'All Subjects' ||
      tutor.subjects.some(s => s.toLowerCase().includes(selectedSubject.toLowerCase()));
    return matchesSearch && matchesSubject;
  });

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
        <p className="text-sm text-muted-foreground">{filteredTutors.length} tutors found</p>

        {filteredTutors.map((tutor) => (
          <Card key={tutor.id}>
            <CardContent className="pt-6">
              <div className="flex flex-col gap-4 sm:flex-row">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={tutor.avatar} />
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
                        <span className="text-muted-foreground">({tutor.reviews} reviews)</span>
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
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {tutor.location}
                    </span>
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
        ))}
      </div>
    </div>
  );
}
