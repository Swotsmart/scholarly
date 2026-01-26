'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  Users,
  Calendar,
  Languages,
  Clock,
  Search,
  Video,
  Headphones,
  Star,
  MapPin,
  Sun,
  Sunset,
  Moon,
  MessageSquare,
  CheckCircle2,
  Circle,
  Edit3,
  Plus,
  ChevronRight,
  Globe,
  Award,
  UserPlus,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Partner = {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
  country: string;
  timezone: string;
  nativeLanguage: string;
  nativeFlag: string;
  learningLanguage: string;
  learningFlag: string;
  cefrLevel: string;
  availability: ('morning' | 'afternoon' | 'evening')[];
  interests: string[];
  rating: number;
  totalSessions: number;
  bio: string;
};

type ExchangeSession = {
  id: string;
  partnerName: string;
  partnerInitials: string;
  partnerColor: string;
  nativeLanguage: string;
  learningLanguage: string;
  dateTime: string;
  duration: '30min' | '60min';
  tier: 'video' | 'VR';
  status: 'confirmed' | 'pending';
};

type PastSession = {
  id: string;
  partnerName: string;
  partnerInitials: string;
  partnerColor: string;
  languages: string;
  date: string;
  duration: string;
  feedbackGiven: boolean;
  feedbackReceived: boolean;
  rating: number;
};

const MOCK_PARTNERS: Partner[] = [
  {
    id: 'partner-1',
    name: 'Liam O\'Sullivan',
    initials: 'LO',
    avatarColor: 'bg-blue-500',
    country: 'Australia',
    timezone: 'AEST (UTC+10)',
    nativeLanguage: 'English',
    nativeFlag: '\ud83c\udde6\ud83c\uddfa',
    learningLanguage: 'Japanese',
    learningFlag: '\ud83c\uddef\ud83c\uddf5',
    cefrLevel: 'B1',
    availability: ['morning', 'evening'],
    interests: ['Anime', 'Cooking', 'Travel', 'Photography'],
    rating: 4.8,
    totalSessions: 34,
    bio: 'Year 11 student from Melbourne. Passionate about Japanese culture and hoping to study abroad in Osaka next year.',
  },
  {
    id: 'partner-2',
    name: 'Yuki Tanaka',
    initials: 'YT',
    avatarColor: 'bg-rose-500',
    country: 'Japan',
    timezone: 'JST (UTC+9)',
    nativeLanguage: 'Japanese',
    nativeFlag: '\ud83c\uddef\ud83c\uddf5',
    learningLanguage: 'English',
    learningFlag: '\ud83c\udde6\ud83c\uddfa',
    cefrLevel: 'B2',
    availability: ['afternoon', 'evening'],
    interests: ['Music', 'K-Drama', 'Swimming', 'Science'],
    rating: 4.9,
    totalSessions: 52,
    bio: 'University student in Tokyo studying marine biology. Loves chatting about Australian wildlife and ocean conservation.',
  },
  {
    id: 'partner-3',
    name: 'Camille Dubois',
    initials: 'CD',
    avatarColor: 'bg-indigo-500',
    country: 'France',
    timezone: 'CET (UTC+1)',
    nativeLanguage: 'French',
    nativeFlag: '\ud83c\uddeb\ud83c\uddf7',
    learningLanguage: 'English',
    learningFlag: '\ud83c\udde6\ud83c\uddfa',
    cefrLevel: 'B1',
    availability: ['morning', 'afternoon'],
    interests: ['Literature', 'Art History', 'Cycling', 'Cinema'],
    rating: 4.7,
    totalSessions: 28,
    bio: 'Lyc\u00e9e student from Lyon. Preparing for Cambridge English exam and interested in studying at an Australian university.',
  },
  {
    id: 'partner-4',
    name: 'Lucas Ferreira',
    initials: 'LF',
    avatarColor: 'bg-green-500',
    country: 'Brazil',
    timezone: 'BRT (UTC-3)',
    nativeLanguage: 'Portuguese',
    nativeFlag: '\ud83c\udde7\ud83c\uddf7',
    learningLanguage: 'English',
    learningFlag: '\ud83c\udde6\ud83c\uddfa',
    cefrLevel: 'A2',
    availability: ['evening'],
    interests: ['Football', 'Gaming', 'Music Production', 'Surfing'],
    rating: 4.5,
    totalSessions: 16,
    bio: 'High school student from Rio de Janeiro. Wants to improve English to pursue game development and connect with the global surf community.',
  },
  {
    id: 'partner-5',
    name: 'Anna Schmidt',
    initials: 'AS',
    avatarColor: 'bg-amber-500',
    country: 'Germany',
    timezone: 'CET (UTC+1)',
    nativeLanguage: 'German',
    nativeFlag: '\ud83c\udde9\ud83c\uddea',
    learningLanguage: 'French',
    learningFlag: '\ud83c\uddeb\ud83c\uddf7',
    cefrLevel: 'B2',
    availability: ['morning', 'afternoon', 'evening'],
    interests: ['Philosophy', 'Hiking', 'Board Games', 'Classical Music'],
    rating: 4.9,
    totalSessions: 67,
    bio: 'Gymnasium student in Munich, bilingual in German and English. Working towards C1 French for the AbiBac diploma programme.',
  },
  {
    id: 'partner-6',
    name: 'Ji-eun Park',
    initials: 'JP',
    avatarColor: 'bg-purple-500',
    country: 'South Korea',
    timezone: 'KST (UTC+9)',
    nativeLanguage: 'Korean',
    nativeFlag: '\ud83c\uddf0\ud83c\uddf7',
    learningLanguage: 'English',
    learningFlag: '\ud83c\udde6\ud83c\uddfa',
    cefrLevel: 'B1',
    availability: ['afternoon', 'evening'],
    interests: ['K-Pop Dance', 'Creative Writing', 'Robotics', 'Cooking'],
    rating: 4.6,
    totalSessions: 41,
    bio: 'Year 10 student from Seoul. Member of the school robotics club and keen to practise conversational English for international competitions.',
  },
];

const MOCK_UPCOMING_SESSIONS: ExchangeSession[] = [
  {
    id: 'session-1',
    partnerName: 'Yuki Tanaka',
    partnerInitials: 'YT',
    partnerColor: 'bg-rose-500',
    nativeLanguage: 'Japanese',
    learningLanguage: 'English',
    dateTime: '2026-01-28T16:00:00+10:00',
    duration: '60min',
    tier: 'video',
    status: 'confirmed',
  },
  {
    id: 'session-2',
    partnerName: 'Camille Dubois',
    partnerInitials: 'CD',
    partnerColor: 'bg-indigo-500',
    nativeLanguage: 'French',
    learningLanguage: 'English',
    dateTime: '2026-01-29T10:30:00+10:00',
    duration: '30min',
    tier: 'video',
    status: 'confirmed',
  },
  {
    id: 'session-3',
    partnerName: 'Ji-eun Park',
    partnerInitials: 'JP',
    partnerColor: 'bg-purple-500',
    nativeLanguage: 'Korean',
    learningLanguage: 'English',
    dateTime: '2026-01-30T15:00:00+10:00',
    duration: '60min',
    tier: 'VR',
    status: 'pending',
  },
  {
    id: 'session-4',
    partnerName: 'Anna Schmidt',
    partnerInitials: 'AS',
    partnerColor: 'bg-amber-500',
    nativeLanguage: 'German',
    learningLanguage: 'French',
    dateTime: '2026-02-01T09:00:00+10:00',
    duration: '30min',
    tier: 'video',
    status: 'pending',
  },
];

const MOCK_PAST_SESSIONS: PastSession[] = [
  {
    id: 'past-1',
    partnerName: 'Yuki Tanaka',
    partnerInitials: 'YT',
    partnerColor: 'bg-rose-500',
    languages: 'Japanese \u2194 English',
    date: '2026-01-25',
    duration: '60 min',
    feedbackGiven: true,
    feedbackReceived: true,
    rating: 5,
  },
  {
    id: 'past-2',
    partnerName: 'Camille Dubois',
    partnerInitials: 'CD',
    partnerColor: 'bg-indigo-500',
    languages: 'French \u2194 English',
    date: '2026-01-22',
    duration: '30 min',
    feedbackGiven: true,
    feedbackReceived: false,
    rating: 4,
  },
  {
    id: 'past-3',
    partnerName: 'Liam O\'Sullivan',
    partnerInitials: 'LO',
    partnerColor: 'bg-blue-500',
    languages: 'English \u2194 Japanese',
    date: '2026-01-20',
    duration: '60 min',
    feedbackGiven: false,
    feedbackReceived: true,
    rating: 5,
  },
  {
    id: 'past-4',
    partnerName: 'Anna Schmidt',
    partnerInitials: 'AS',
    partnerColor: 'bg-amber-500',
    languages: 'German \u2194 French',
    date: '2026-01-18',
    duration: '30 min',
    feedbackGiven: true,
    feedbackReceived: true,
    rating: 4,
  },
];

const MY_PROFILE = {
  name: 'Alex Chen',
  initials: 'AC',
  nativeLanguage: 'English',
  nativeFlag: '\ud83c\udde6\ud83c\uddfa',
  languagesLearning: [
    { language: 'French', flag: '\ud83c\uddeb\ud83c\uddf7', level: 'B1' },
    { language: 'Japanese', flag: '\ud83c\uddef\ud83c\uddf5', level: 'A2' },
    { language: 'Mandarin', flag: '\ud83c\udde8\ud83c\uddf3', level: 'A1' },
  ],
  availability: ['morning', 'afternoon', 'evening'] as const,
  interests: ['Technology', 'Sustainability', 'Cricket', 'Bushwalking', 'Indigenous Art'],
  bio: 'Year 12 student from Sydney. Studying for the HSC and passionate about languages. Hoping to work in international development after university.',
  totalSessions: 47,
  hoursExchanged: 38.5,
  partnerRating: 4.8,
  languagesPractised: 3,
};

const availabilityIcon = (period: string) => {
  switch (period) {
    case 'morning':
      return <Sun className="h-3.5 w-3.5" />;
    case 'afternoon':
      return <Sunset className="h-3.5 w-3.5" />;
    case 'evening':
      return <Moon className="h-3.5 w-3.5" />;
    default:
      return null;
  }
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return {
    date: date.toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' }),
    time: date.toLocaleTimeString('en-AU', { hour: '2-digit', minute: '2-digit' }),
  };
};

export default function LanguageExchangePage() {
  const [activeTab, setActiveTab] = useState('find-partners');
  const [partnerSearch, setPartnerSearch] = useState('');
  const [languageFilter, setLanguageFilter] = useState('all');
  const [timezoneFilter, setTimezoneFilter] = useState('all');
  const [levelFilter, setLevelFilter] = useState('all');
  const [isEditing, setIsEditing] = useState(false);

  const filteredPartners = MOCK_PARTNERS.filter((partner) => {
    if (partnerSearch && !partner.name.toLowerCase().includes(partnerSearch.toLowerCase())) return false;
    if (languageFilter !== 'all' && partner.nativeLanguage.toLowerCase() !== languageFilter.toLowerCase() && partner.learningLanguage.toLowerCase() !== languageFilter.toLowerCase()) return false;
    if (levelFilter !== 'all' && partner.cefrLevel !== levelFilter) return false;
    return true;
  });

  const confirmedSessions = MOCK_UPCOMING_SESSIONS.filter((s) => s.status === 'confirmed').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Language Exchange</h1>
          <p className="text-muted-foreground">
            Find language partners, schedule exchange sessions and practise together
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/linguaflow">
            <Button variant="outline">Back to LinguaFlow</Button>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Users className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{MOCK_PARTNERS.length}</p>
              <p className="text-sm text-muted-foreground">Available Partners</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-500/10 p-3">
              <Calendar className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{MOCK_UPCOMING_SESSIONS.length}</p>
              <p className="text-sm text-muted-foreground">Upcoming Sessions</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <Languages className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">8</p>
              <p className="text-sm text-muted-foreground">Languages Offered</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-amber-500/10 p-3">
              <Clock className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{MY_PROFILE.hoursExchanged}</p>
              <p className="text-sm text-muted-foreground">Hours Exchanged</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="find-partners">Find Partners</TabsTrigger>
          <TabsTrigger value="my-sessions">My Sessions</TabsTrigger>
          <TabsTrigger value="my-profile">My Profile</TabsTrigger>
        </TabsList>

        {/* Find Partners Tab */}
        <TabsContent value="find-partners" className="space-y-4">
          {/* Filter Bar */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search partners by name..."
                    value={partnerSearch}
                    onChange={(e) => setPartnerSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={languageFilter} onValueChange={setLanguageFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Language Pair" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Languages</SelectItem>
                    <SelectItem value="japanese">Japanese</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="german">German</SelectItem>
                    <SelectItem value="korean">Korean</SelectItem>
                    <SelectItem value="portuguese">Portuguese</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={levelFilter} onValueChange={setLevelFilter}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Skill Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="A1">A1</SelectItem>
                    <SelectItem value="A2">A2</SelectItem>
                    <SelectItem value="B1">B1</SelectItem>
                    <SelectItem value="B2">B2</SelectItem>
                    <SelectItem value="C1">C1</SelectItem>
                    <SelectItem value="C2">C2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Partner Cards Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredPartners.map((partner) => (
              <Card key={partner.id} className="relative overflow-hidden hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-12 w-12 rounded-full ${partner.avatarColor} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}
                    >
                      {partner.initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base">{partner.name}</CardTitle>
                      <div className="flex items-center gap-1.5 mt-1">
                        <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {partner.country} - {partner.timezone}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                      <span className="text-sm font-medium">{partner.rating}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Language Pair */}
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3">
                    <div className="text-center">
                      <p className="text-lg">{partner.nativeFlag}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Native</p>
                      <p className="text-sm font-medium">{partner.nativeLanguage}</p>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <ChevronRight className="h-4 w-4" />
                      <ChevronRight className="h-4 w-4 -ml-2" />
                    </div>
                    <div className="text-center">
                      <p className="text-lg">{partner.learningFlag}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">Learning</p>
                      <p className="text-sm font-medium">{partner.learningLanguage}</p>
                    </div>
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20">
                      {partner.cefrLevel}
                    </Badge>
                  </div>

                  {/* Availability */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Availability</p>
                    <div className="flex items-center gap-2">
                      {partner.availability.map((period) => (
                        <Badge key={period} variant="secondary" className="text-xs capitalize">
                          {availabilityIcon(period)}
                          <span className="ml-1">{period}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">Interests</p>
                    <div className="flex flex-wrap gap-1.5">
                      {partner.interests.map((interest) => (
                        <Badge key={interest} variant="outline" className="text-xs">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Bio */}
                  <p className="text-sm text-muted-foreground line-clamp-2">{partner.bio}</p>

                  {/* Footer Stats + Action */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-xs text-muted-foreground">
                      {partner.totalSessions} sessions completed
                    </span>
                    <Button size="sm">
                      <UserPlus className="h-4 w-4 mr-1" />
                      Request Exchange
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* My Sessions Tab */}
        <TabsContent value="my-sessions" className="space-y-6">
          {/* Schedule Button */}
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Upcoming Sessions</h3>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Schedule New Session
            </Button>
          </div>

          {/* Upcoming Sessions */}
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {MOCK_UPCOMING_SESSIONS.map((session) => {
                  const { date, time } = formatDateTime(session.dateTime);
                  return (
                    <div key={session.id} className="flex items-center gap-4 p-4">
                      <div
                        className={`h-10 w-10 rounded-full ${session.partnerColor} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}
                      >
                        {session.partnerInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{session.partnerName}</p>
                        <p className="text-sm text-muted-foreground">
                          {session.nativeLanguage} \u2194 {session.learningLanguage}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{date}</p>
                        <p className="text-sm text-muted-foreground">{time}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {session.duration}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={
                          session.tier === 'VR'
                            ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20'
                            : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20'
                        }
                      >
                        {session.tier === 'VR' ? (
                          <Headphones className="h-3.5 w-3.5 mr-1" />
                        ) : (
                          <Video className="h-3.5 w-3.5 mr-1" />
                        )}
                        {session.tier === 'VR' ? 'VR' : 'Video'}
                      </Badge>
                      <Badge
                        className={
                          session.status === 'confirmed'
                            ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                            : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                        }
                        variant="outline"
                      >
                        {session.status === 'confirmed' ? 'Confirmed' : 'Pending'}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Join
                      </Button>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Past Sessions */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Past Sessions</h3>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y">
                  {MOCK_PAST_SESSIONS.map((session) => (
                    <div key={session.id} className="flex items-center gap-4 p-4">
                      <div
                        className={`h-10 w-10 rounded-full ${session.partnerColor} flex items-center justify-center text-white font-semibold text-sm flex-shrink-0`}
                      >
                        {session.partnerInitials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{session.partnerName}</p>
                        <p className="text-sm text-muted-foreground">{session.languages}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(session.date).toLocaleDateString('en-AU', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">{session.duration}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < session.rating
                                ? 'text-amber-500 fill-amber-500'
                                : 'text-muted-foreground'
                            }`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-sm">
                          {session.feedbackGiven ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-muted-foreground">Given</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-sm">
                          {session.feedbackReceived ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground" />
                          )}
                          <span className="text-muted-foreground">Received</span>
                        </div>
                      </div>
                      {!session.feedbackGiven && (
                        <Button variant="outline" size="sm">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Give Feedback
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* My Profile Tab */}
        <TabsContent value="my-profile" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
            {/* Profile Card */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Your Exchange Profile</CardTitle>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setIsEditing(!isEditing)}
                    >
                      <Edit3 className="h-4 w-4 mr-2" />
                      {isEditing ? 'Save Changes' : 'Edit Profile'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Name and Native Language */}
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl flex-shrink-0">
                      {MY_PROFILE.initials}
                    </div>
                    <div>
                      <p className="text-xl font-semibold">{MY_PROFILE.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-lg">{MY_PROFILE.nativeFlag}</span>
                        <span className="text-sm text-muted-foreground">
                          Native {MY_PROFILE.nativeLanguage} speaker
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Languages Learning */}
                  <div>
                    <Label className="text-sm font-medium">Languages Learning</Label>
                    <div className="mt-2 space-y-2">
                      {MY_PROFILE.languagesLearning.map((lang) => (
                        <div
                          key={lang.language}
                          className="flex items-center justify-between rounded-lg border p-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{lang.flag}</span>
                            <span className="font-medium">{lang.language}</span>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              lang.level.startsWith('A')
                                ? 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
                                : 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20'
                            }
                          >
                            {lang.level}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Availability */}
                  <div>
                    <Label className="text-sm font-medium">Availability</Label>
                    <div className="mt-2 flex items-center gap-2">
                      {(['morning', 'afternoon', 'evening'] as const).map((period) => {
                        const isActive = MY_PROFILE.availability.includes(period);
                        return (
                          <Badge
                            key={period}
                            variant={isActive ? 'default' : 'outline'}
                            className={`capitalize cursor-pointer ${
                              isActive ? '' : 'text-muted-foreground'
                            }`}
                          >
                            {availabilityIcon(period)}
                            <span className="ml-1">{period}</span>
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {/* Interests */}
                  <div>
                    <Label className="text-sm font-medium">Interests</Label>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {MY_PROFILE.interests.map((interest) => (
                        <Badge key={interest} variant="secondary">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Bio */}
                  <div>
                    <Label className="text-sm font-medium">Bio</Label>
                    {isEditing ? (
                      <textarea
                        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[100px]"
                        defaultValue={MY_PROFILE.bio}
                      />
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                        {MY_PROFILE.bio}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stats Sidebar */}
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Award className="h-4 w-4 text-amber-500" />
                    Exchange Statistics
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center rounded-lg bg-muted/50 p-3">
                      <p className="text-2xl font-bold text-primary">{MY_PROFILE.totalSessions}</p>
                      <p className="text-xs text-muted-foreground">Total Sessions</p>
                    </div>
                    <div className="text-center rounded-lg bg-muted/50 p-3">
                      <p className="text-2xl font-bold text-primary">{MY_PROFILE.hoursExchanged}</p>
                      <p className="text-xs text-muted-foreground">Hours Exchanged</p>
                    </div>
                    <div className="text-center rounded-lg bg-muted/50 p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                        <p className="text-2xl font-bold text-primary">{MY_PROFILE.partnerRating}</p>
                      </div>
                      <p className="text-xs text-muted-foreground">Partner Rating</p>
                    </div>
                    <div className="text-center rounded-lg bg-muted/50 p-3">
                      <p className="text-2xl font-bold text-primary">{MY_PROFILE.languagesPractised}</p>
                      <p className="text-xs text-muted-foreground">Languages Practised</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Globe className="h-4 w-4 text-blue-500" />
                    Language Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {MY_PROFILE.languagesLearning.map((lang) => {
                    const progressMap: Record<string, number> = { A1: 15, A2: 35, B1: 55, B2: 75, C1: 90, C2: 98 };
                    return (
                      <div key={lang.language}>
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span>{lang.flag}</span>
                            <span className="text-sm font-medium">{lang.language}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">{lang.level}</span>
                        </div>
                        <Progress value={progressMap[lang.level] || 50} className="h-2" />
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-green-500" />
                    Next Session
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {MOCK_UPCOMING_SESSIONS.filter((s) => s.status === 'confirmed').slice(0, 1).map((session) => {
                    const { date, time } = formatDateTime(session.dateTime);
                    return (
                      <div key={session.id} className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-full ${session.partnerColor} flex items-center justify-center text-white font-semibold text-sm`}
                          >
                            {session.partnerInitials}
                          </div>
                          <div>
                            <p className="font-medium text-sm">{session.partnerName}</p>
                            <p className="text-xs text-muted-foreground">
                              {session.nativeLanguage} \u2194 {session.learningLanguage}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{date}</span>
                          <span className="font-medium">{time}</span>
                        </div>
                        <Button className="w-full" size="sm">
                          <Video className="h-4 w-4 mr-2" />
                          Join Session
                        </Button>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
