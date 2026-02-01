'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  GraduationCap,
  Star,
  Clock,
  Video,
  MapPin,
  Calendar,
  Globe,
  ShieldCheck,
  CheckCircle2,
  ArrowLeft,
  MessageSquare,
  Award,
  BookOpen,
  Users,
  Play,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  BadgeCheck,
  User,
} from 'lucide-react';

// Mock tutor data
const TUTORS_DB: Record<string, {
  id: string;
  name: string;
  headline: string;
  bio: string;
  aiBio: string;
  subjects: { name: string; level: string }[];
  yearLevels: string[];
  rating: number;
  reviewCount: number;
  hourlyRate: number;
  sessionsCompleted: number;
  responseTime: string;
  languages: string[];
  qualifications: { name: string; verified: boolean; year?: string }[];
  teachingStyle: string;
  expertise: string[];
  location: string;
  memberSince: string;
  kycVerified: boolean;
  wwccVerified: boolean;
  wwccState: string;
  wwccExpiry: string;
}> = {
  tutor_1: {
    id: 'tutor_1',
    name: 'Sarah Chen',
    headline: 'Mathematics & Physics Specialist | 10+ Years Experience',
    bio: 'Passionate about making complex mathematical concepts accessible to all students. I believe every student can excel in mathematics with the right guidance and approach.',
    aiBio: 'Sarah is a highly experienced mathematics and physics tutor with over 10 years of teaching experience. She specialises in HSC and IB preparation, with a particular focus on helping students build strong foundational understanding. Her teaching style emphasises structured problem-solving approaches and real-world applications. Students consistently praise her patience and ability to explain difficult concepts in accessible ways.',
    subjects: [
      { name: 'Mathematics', level: 'Year 7-12, HSC, IB' },
      { name: 'Physics', level: 'Year 11-12, HSC' },
      { name: 'Advanced Mathematics', level: 'Year 11-12, HSC Extension 1 & 2' },
    ],
    yearLevels: ['Year 7-10', 'Year 11-12'],
    rating: 4.9,
    reviewCount: 127,
    hourlyRate: 75,
    sessionsCompleted: 342,
    responseTime: '< 1 hour',
    languages: ['English', 'Mandarin'],
    qualifications: [
      { name: 'B.Sc Mathematics (Honours) - University of Sydney', verified: true, year: '2012' },
      { name: 'Graduate Certificate in Education - UNSW', verified: true, year: '2014' },
      { name: 'Working With Children Check (WWCC)', verified: true },
    ],
    teachingStyle: 'Structured',
    expertise: ['HSC Preparation', 'IB Mathematics', 'Exam Technique', 'Mathematical Foundations'],
    location: 'Sydney, NSW',
    memberSince: 'March 2020',
    kycVerified: true,
    wwccVerified: true,
    wwccState: 'NSW',
    wwccExpiry: 'December 2027',
  },
  tutor_5: {
    id: 'tutor_5',
    name: 'Priya Sharma',
    headline: 'Primary School Specialist | All Subjects',
    bio: 'Making learning magical for young minds. I believe that early education should be joyful, engaging, and tailored to each child\'s unique needs and interests.',
    aiBio: 'Priya is an exceptional primary school educator with a gift for connecting with young learners. Her play-based approach incorporates games, stories, and hands-on activities to make learning engaging and memorable. She has extensive experience supporting children with learning difficulties and is particularly skilled at building confidence in reluctant learners.',
    subjects: [
      { name: 'Primary Mathematics', level: 'Foundation to Year 6' },
      { name: 'Primary English', level: 'Foundation to Year 6' },
      { name: 'Science', level: 'Primary (Year 1-6)' },
      { name: 'NAPLAN Preparation', level: 'Year 3 & 5' },
    ],
    yearLevels: ['Year 1-3', 'Year 4-6'],
    rating: 5.0,
    reviewCount: 203,
    hourlyRate: 55,
    sessionsCompleted: 567,
    responseTime: '< 1 hour',
    languages: ['English', 'Hindi'],
    qualifications: [
      { name: 'B.Ed Primary Education - University of Melbourne', verified: true, year: '2015' },
      { name: 'Certificate in Special Education Needs', verified: true, year: '2018' },
      { name: 'Registered Teacher - VIT', verified: true },
      { name: 'Working With Children Check (WWCC)', verified: true },
    ],
    teachingStyle: 'Play-Based',
    expertise: ['Early Literacy', 'Numeracy Foundations', 'Learning Difficulties Support', 'NAPLAN Preparation'],
    location: 'Adelaide, SA',
    memberSince: 'January 2019',
    kycVerified: true,
    wwccVerified: true,
    wwccState: 'SA',
    wwccExpiry: 'June 2028',
  },
};

const DEFAULT_TUTOR = TUTORS_DB['tutor_1'];

// Mock reviews
const REVIEWS = [
  {
    id: 'r1',
    author: 'Parent of Year 10 Student',
    rating: 5,
    date: '15 Jan 2026',
    text: 'Sarah has been absolutely wonderful with my daughter. Her maths marks have improved from a C to an A- in just one term. She makes complex concepts easy to understand and is incredibly patient.',
    subject: 'Mathematics',
    helpful: 23,
  },
  {
    id: 'r2',
    author: 'Year 12 Student',
    rating: 5,
    date: '8 Jan 2026',
    text: 'Best physics tutor I\'ve ever had! Sarah explains everything so clearly and her exam preparation tips were invaluable. Highly recommend for anyone doing HSC Physics.',
    subject: 'Physics',
    helpful: 18,
  },
  {
    id: 'r3',
    author: 'Parent of Year 8 Student',
    rating: 5,
    date: '28 Dec 2025',
    text: 'My son used to dread maths homework, but now he actually looks forward to his sessions with Sarah. She has a gift for making learning engaging.',
    subject: 'Mathematics',
    helpful: 15,
  },
  {
    id: 'r4',
    author: 'Year 11 Student',
    rating: 4,
    date: '15 Dec 2025',
    text: 'Really helpful for Extension 1 Maths. Sarah goes at a good pace and always makes sure I understand before moving on. Would give 5 stars but sometimes hard to book popular time slots.',
    subject: 'Advanced Mathematics',
    helpful: 11,
  },
];

const RATING_BREAKDOWN = [
  { stars: 5, count: 98, percentage: 77 },
  { stars: 4, count: 21, percentage: 17 },
  { stars: 3, count: 5, percentage: 4 },
  { stars: 2, count: 2, percentage: 1 },
  { stars: 1, count: 1, percentage: 1 },
];

// Mock availability - next 7 days
const AVAILABILITY = [
  {
    date: '2026-01-30',
    dayName: 'Thu',
    slots: ['3:00 PM', '4:00 PM', '5:00 PM'],
  },
  {
    date: '2026-01-31',
    dayName: 'Fri',
    slots: [],
  },
  {
    date: '2026-02-01',
    dayName: 'Sat',
    slots: ['9:00 AM', '10:00 AM', '11:00 AM', '2:00 PM', '3:00 PM'],
  },
  {
    date: '2026-02-02',
    dayName: 'Sun',
    slots: [],
  },
  {
    date: '2026-02-03',
    dayName: 'Mon',
    slots: ['4:00 PM', '5:00 PM', '6:00 PM'],
  },
  {
    date: '2026-02-04',
    dayName: 'Tue',
    slots: [],
  },
  {
    date: '2026-02-05',
    dayName: 'Wed',
    slots: ['4:00 PM', '5:00 PM'],
  },
];

function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={`${iconSize} ${
            i < Math.floor(rating)
              ? 'fill-yellow-400 text-yellow-400'
              : i < rating
              ? 'fill-yellow-400/50 text-yellow-400'
              : 'text-muted-foreground/30'
          }`}
        />
      ))}
    </div>
  );
}

export default function TutorProfilePage() {
  const params = useParams();
  const tutorId = typeof params.id === 'string' ? params.id : 'tutor_1';
  const tutor = TUTORS_DB[tutorId] || DEFAULT_TUTOR;

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [weekOffset, setWeekOffset] = useState(0);

  const selectedDaySlots = AVAILABILITY.find((d) => d.date === selectedDate)?.slots || [];

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button variant="ghost" size="sm" asChild>
        <Link href="/tutoring">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tutors
        </Link>
      </Button>

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Profile Info */}
        <div className="flex-1">
          <Card>
            <CardContent className="p-6">
              <div className="flex gap-6">
                {/* Photo */}
                <div className="relative">
                  <div className="h-32 w-32 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <GraduationCap className="h-16 w-16 text-primary" />
                  </div>
                  <div className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full bg-green-500 border-4 border-background flex items-center justify-center">
                    <div className="h-3 w-3 rounded-full bg-white" />
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 space-y-4">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h1 className="text-2xl font-bold">{tutor.name}</h1>
                      {tutor.kycVerified && tutor.wwccVerified && (
                        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          Fully Verified
                        </Badge>
                      )}
                    </div>
                    <p className="text-muted-foreground">{tutor.headline}</p>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      {tutor.kycVerified && (
                        <span className="flex items-center gap-1">
                          <BadgeCheck className="h-3.5 w-3.5 text-green-600" />
                          Identity verified
                        </span>
                      )}
                      {tutor.wwccVerified && (
                        <span className="flex items-center gap-1">
                          <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                          WWCC ({tutor.wwccState})
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-6 flex-wrap">
                    <div className="flex items-center gap-2">
                      <StarRating rating={tutor.rating} size="lg" />
                      <span className="font-semibold text-lg">{tutor.rating}</span>
                      <span className="text-muted-foreground">({tutor.reviewCount} reviews)</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 text-sm text-muted-foreground flex-wrap">
                    <div className="flex items-center gap-1">
                      <Video className="h-4 w-4" />
                      {tutor.sessionsCompleted} sessions completed
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      Responds {tutor.responseTime}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {tutor.location}
                    </div>
                    <div className="flex items-center gap-1">
                      <Globe className="h-4 w-4" />
                      {tutor.languages.join(', ')}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Booking CTA Card */}
        <div className="lg:w-80">
          <Card className="sticky top-4">
            <CardContent className="p-6 space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold">${tutor.hourlyRate}</p>
                <p className="text-muted-foreground">per hour</p>
              </div>
              <Button className="w-full" size="lg" asChild>
                <Link href={`/tutoring/book?tutor=${tutor.id}`}>
                  <Calendar className="mr-2 h-5 w-5" />
                  Book a Session
                </Link>
              </Button>
              <Button variant="outline" className="w-full">
                <MessageSquare className="mr-2 h-4 w-4" />
                Send Message
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Instant booking - get confirmation within {tutor.responseTime}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs Content */}
      <Tabs defaultValue="about">
        <TabsList>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="qualifications">Qualifications</TabsTrigger>
          <TabsTrigger value="subjects">Subjects</TabsTrigger>
          <TabsTrigger value="availability">Availability</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({tutor.reviewCount})</TabsTrigger>
        </TabsList>

        {/* About Tab */}
        <TabsContent value="about" className="space-y-6">
          {/* AI Bio */}
          <Card className="bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-emerald-500/5 border-purple-200/50 dark:border-purple-800/50">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <CardTitle className="text-lg">AI-Generated Summary</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{tutor.aiBio}</p>
            </CardContent>
          </Card>

          {/* Personal Bio */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About {tutor.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{tutor.bio}</p>
            </CardContent>
          </Card>

          {/* Teaching Style & Expertise */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Teaching Style</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge variant="secondary" className="text-base px-4 py-2">
                  {tutor.teachingStyle}
                </Badge>
                <p className="text-sm text-muted-foreground mt-3">
                  {tutor.teachingStyle === 'Structured' &&
                    'Focus on systematic problem-solving with clear methodology and step-by-step approaches.'}
                  {tutor.teachingStyle === 'Play-Based' &&
                    'Learning through games, activities, and creative engagement that makes education fun.'}
                  {tutor.teachingStyle === 'Socratic' &&
                    'Guided discovery through questioning, encouraging critical thinking and deep understanding.'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Areas of Expertise</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {tutor.expertise.map((exp) => (
                    <Badge key={exp} variant="outline">
                      {exp}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Safety Badge */}
          <Card className="border-green-200 dark:border-green-800">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="rounded-full bg-green-500/10 p-3">
                  <ShieldCheck className="h-6 w-6 text-green-500" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-green-700 dark:text-green-400">
                    Fully Verified Tutor
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {tutor.name}&apos;s identity and credentials have been verified by Scholarly.
                  </p>
                  <div className="grid gap-2 mt-3">
                    {tutor.kycVerified && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-muted-foreground">Identity verified (KYC)</span>
                      </div>
                    )}
                    {tutor.wwccVerified && (
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        <span className="text-muted-foreground">
                          Working With Children Check ({tutor.wwccState})
                          {tutor.wwccExpiry && ` - Valid until ${tutor.wwccExpiry}`}
                        </span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Member since {tutor.memberSince}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Qualifications Tab */}
        <TabsContent value="qualifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Verified Credentials</CardTitle>
              <CardDescription>
                All qualifications have been verified by the Scholarly team
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tutor.qualifications.map((qual, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-4 rounded-lg border p-4"
                  >
                    <div className="rounded-lg bg-primary/10 p-2.5">
                      <Award className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{qual.name}</p>
                        {qual.verified && (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Verified
                          </Badge>
                        )}
                      </div>
                      {qual.year && (
                        <p className="text-sm text-muted-foreground mt-1">
                          Obtained {qual.year}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Subjects Tab */}
        <TabsContent value="subjects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Subjects & Expertise Levels</CardTitle>
              <CardDescription>
                Subjects {tutor.name} can tutor with their expertise levels
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {tutor.subjects.map((subject, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-primary/10 p-2.5">
                        <BookOpen className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{subject.name}</p>
                        <p className="text-sm text-muted-foreground">{subject.level}</p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/tutoring/book?tutor=${tutor.id}&subject=${encodeURIComponent(subject.name)}`}>
                        Book
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Availability Tab */}
        <TabsContent value="availability" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Available Time Slots</CardTitle>
                  <CardDescription>
                    Select a date to view available booking times
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setWeekOffset(Math.max(0, weekOffset - 1))}
                    disabled={weekOffset === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => setWeekOffset(weekOffset + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Calendar Strip */}
              <div className="grid grid-cols-7 gap-2 mb-6">
                {AVAILABILITY.map((day) => {
                  const isSelected = selectedDate === day.date;
                  const hasSlots = day.slots.length > 0;
                  return (
                    <button
                      key={day.date}
                      onClick={() => hasSlots && setSelectedDate(day.date)}
                      disabled={!hasSlots}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        isSelected
                          ? 'bg-primary text-primary-foreground border-primary'
                          : hasSlots
                          ? 'hover:bg-muted cursor-pointer'
                          : 'opacity-50 cursor-not-allowed'
                      }`}
                    >
                      <p className="text-xs font-medium">{day.dayName}</p>
                      <p className="text-lg font-bold">{day.date.split('-')[2]}</p>
                      <p className="text-xs">
                        {hasSlots ? `${day.slots.length} slots` : 'Full'}
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Time Slots */}
              {selectedDate ? (
                <div>
                  <h4 className="font-medium mb-3">
                    Available times for{' '}
                    {new Date(selectedDate).toLocaleDateString('en-AU', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                    })}
                  </h4>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2">
                    {selectedDaySlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={selectedSlot === slot ? 'default' : 'outline'}
                        onClick={() => setSelectedSlot(slot)}
                        className="justify-center"
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                  {selectedSlot && (
                    <div className="mt-6 p-4 rounded-lg bg-muted">
                      <p className="font-medium">Selected: {selectedSlot} on {new Date(selectedDate).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                      <Button className="mt-3" asChild>
                        <Link href={`/tutoring/book?tutor=${tutor.id}&date=${selectedDate}&time=${encodeURIComponent(selectedSlot)}`}>
                          Continue to Booking
                        </Link>
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a date above to see available time slots</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6">
          {/* Rating Summary */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-8">
                <div className="text-center space-y-2">
                  <p className="text-5xl font-bold">{tutor.rating}</p>
                  <StarRating rating={tutor.rating} size="lg" />
                  <p className="text-sm text-muted-foreground">{tutor.reviewCount} reviews</p>
                </div>
                <div className="flex-1 space-y-2">
                  {RATING_BREAKDOWN.map((item) => (
                    <div key={item.stars} className="flex items-center gap-3">
                      <span className="text-sm font-medium w-12">{item.stars} star</span>
                      <Progress value={item.percentage} className="h-2 flex-1" />
                      <span className="text-sm text-muted-foreground w-12 text-right">
                        {item.percentage}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reviews List */}
          <div className="space-y-4">
            {REVIEWS.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-6 space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{review.author}</p>
                        <p className="text-sm text-muted-foreground">{review.subject}</p>
                      </div>
                    </div>
                    <span className="text-sm text-muted-foreground">{review.date}</span>
                  </div>
                  <StarRating rating={review.rating} />
                  <p className="text-muted-foreground">{review.text}</p>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <button className="hover:text-foreground">
                      {review.helpful} people found this helpful
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Load More */}
          <div className="text-center">
            <Button variant="outline">Load More Reviews</Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
