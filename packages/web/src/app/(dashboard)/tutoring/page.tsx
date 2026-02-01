'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  GraduationCap,
  Users,
  Calendar,
  Clock,
  Star,
  Search,
  Filter,
  MapPin,
  Video,
  DollarSign,
  Sparkles,
  Scale,
  Globe,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  ChevronDown,
  X,
  Map,
  LayoutGrid,
} from 'lucide-react';

// Mock tutor data
const TUTORS = [
  {
    id: 'tutor_1',
    name: 'Sarah Chen',
    photo: null,
    headline: 'Mathematics & Physics Specialist | 10+ Years Experience',
    bio: 'Passionate about making complex mathematical concepts accessible to all students. Specialising in HSC and IB preparation.',
    subjects: ['Mathematics', 'Physics', 'Advanced Maths'],
    yearLevels: ['Year 7-10', 'Year 11-12'],
    rating: 4.9,
    reviewCount: 127,
    hourlyRate: 75,
    sessionsCompleted: 342,
    responseTime: '< 1 hour',
    availability: ['Mon PM', 'Wed PM', 'Sat AM'],
    isAvailableNow: true,
    languages: ['English', 'Mandarin'],
    qualifications: ['B.Sc Mathematics (Honours)', 'WWCC Verified', 'Graduate Certificate in Education'],
    teachingStyle: 'Structured',
    expertise: ['HSC Preparation', 'IB Mathematics', 'Exam Technique'],
    location: 'Sydney, NSW',
    distance: 5.2,
  },
  {
    id: 'tutor_2',
    name: 'Michael Torres',
    photo: null,
    headline: 'Science Teacher & STEM Educator',
    bio: 'Making science fun and engaging for students of all levels. Specialising in hands-on learning and real-world applications.',
    subjects: ['Physics', 'Chemistry', 'Biology'],
    yearLevels: ['Year 9-10', 'Year 11-12'],
    rating: 4.8,
    reviewCount: 89,
    hourlyRate: 70,
    sessionsCompleted: 234,
    responseTime: '< 2 hours',
    availability: ['Tue PM', 'Thu PM', 'Sun AM'],
    isAvailableNow: false,
    languages: ['English', 'Spanish'],
    qualifications: ['M.Ed Science Education', 'WWCC Verified', 'Registered Teacher'],
    teachingStyle: 'Interactive',
    expertise: ['Lab Skills', 'ATAR Preparation', 'Scientific Method'],
    location: 'Melbourne, VIC',
    distance: 12.8,
  },
  {
    id: 'tutor_3',
    name: 'Emily Watson',
    photo: null,
    headline: 'English Literature & Essay Writing Expert',
    bio: 'Published author and former HSC marker. Helping students find their voice and excel in written communication.',
    subjects: ['English', 'Literature', 'Essay Writing'],
    yearLevels: ['Year 7-10', 'Year 11-12'],
    rating: 4.9,
    reviewCount: 156,
    hourlyRate: 80,
    sessionsCompleted: 456,
    responseTime: '< 1 hour',
    availability: ['Mon PM', 'Wed PM', 'Fri PM', 'Sat'],
    isAvailableNow: true,
    languages: ['English'],
    qualifications: ['M.A. English Literature', 'WWCC Verified', 'Former HSC Marker'],
    teachingStyle: 'Socratic',
    expertise: ['HSC English', 'Creative Writing', 'Text Analysis'],
    location: 'Brisbane, QLD',
    distance: 8.4,
  },
  {
    id: 'tutor_4',
    name: 'David Kim',
    photo: null,
    headline: 'Economics & Business Studies Tutor',
    bio: 'CPA-qualified accountant turned educator. Real-world business insights combined with academic excellence.',
    subjects: ['Economics', 'Business Studies', 'Accounting'],
    yearLevels: ['Year 11-12'],
    rating: 4.7,
    reviewCount: 67,
    hourlyRate: 85,
    sessionsCompleted: 189,
    responseTime: '< 3 hours',
    availability: ['Sat', 'Sun'],
    isAvailableNow: false,
    languages: ['English', 'Korean'],
    qualifications: ['B.Com (Honours)', 'CPA', 'WWCC Verified'],
    teachingStyle: 'Case-Study Based',
    expertise: ['ATAR Economics', 'Financial Literacy', 'Business Planning'],
    location: 'Perth, WA',
    distance: 15.3,
  },
  {
    id: 'tutor_5',
    name: 'Priya Sharma',
    photo: null,
    headline: 'Primary School Specialist | All Subjects',
    bio: 'Making learning magical for young minds. Specialising in foundational literacy and numeracy with a play-based approach.',
    subjects: ['Primary Maths', 'Primary English', 'Science', 'NAPLAN Prep'],
    yearLevels: ['Year 1-3', 'Year 4-6'],
    rating: 5.0,
    reviewCount: 203,
    hourlyRate: 55,
    sessionsCompleted: 567,
    responseTime: '< 1 hour',
    availability: ['Mon PM', 'Tue PM', 'Wed PM', 'Thu PM', 'Fri PM'],
    isAvailableNow: true,
    languages: ['English', 'Hindi'],
    qualifications: ['B.Ed Primary', 'WWCC Verified', 'Registered Teacher'],
    teachingStyle: 'Play-Based',
    expertise: ['Early Literacy', 'Numeracy', 'Learning Difficulties Support'],
    location: 'Adelaide, SA',
    distance: 3.1,
  },
];

const AI_RECOMMENDED = ['tutor_1', 'tutor_5'];

const SUBJECTS = [
  'All Subjects',
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'English',
  'Literature',
  'Economics',
  'Business Studies',
  'Primary Maths',
  'Primary English',
];

const YEAR_LEVELS = [
  'All Levels',
  'Year 1-3',
  'Year 4-6',
  'Year 7-10',
  'Year 11-12',
];

const PRICE_RANGES = [
  { label: 'Any Price', min: 0, max: Infinity },
  { label: 'Under $50/hr', min: 0, max: 50 },
  { label: '$50-70/hr', min: 50, max: 70 },
  { label: '$70-90/hr', min: 70, max: 90 },
  { label: '$90+/hr', min: 90, max: Infinity },
];

const TEACHING_STYLES = ['All Styles', 'Structured', 'Interactive', 'Socratic', 'Play-Based', 'Case-Study Based'];

const LANGUAGES = ['All Languages', 'English', 'Mandarin', 'Spanish', 'Hindi', 'Korean'];

function TutorCard({
  tutor,
  isRecommended,
  isCompareMode,
  isSelected,
  onToggleCompare,
}: {
  tutor: typeof TUTORS[0];
  isRecommended?: boolean;
  isCompareMode?: boolean;
  isSelected?: boolean;
  onToggleCompare?: () => void;
}) {
  return (
    <Card hover className={isSelected ? 'ring-2 ring-primary' : ''}>
      <CardContent className="p-6">
        <div className="flex gap-6">
          {/* Photo */}
          <div className="relative">
            <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="h-12 w-12 text-primary" />
            </div>
            {tutor.isAvailableNow && (
              <div className="absolute -bottom-1 -right-1 h-6 w-6 rounded-full bg-green-500 border-2 border-background flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-white" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-semibold">{tutor.name}</h3>
                  {isRecommended && (
                    <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">
                      <Sparkles className="mr-1 h-3 w-3" />
                      Best Match
                    </Badge>
                  )}
                  <Badge variant="outline" className="text-green-600 border-green-200 dark:border-green-800">
                    <ShieldCheck className="mr-1 h-3 w-3" />
                    WWCC
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{tutor.headline}</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">${tutor.hourlyRate}</p>
                <p className="text-sm text-muted-foreground">per hour</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {tutor.subjects.slice(0, 3).map((subject) => (
                <Badge key={subject}>{subject}</Badge>
              ))}
              {tutor.subjects.length > 3 && (
                <Badge variant="secondary">+{tutor.subjects.length - 3}</Badge>
              )}
            </div>

            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                <span className="font-medium text-foreground">{tutor.rating}</span>
                <span>({tutor.reviewCount})</span>
              </div>
              <div className="flex items-center gap-1">
                <Video className="h-4 w-4" />
                {tutor.sessionsCompleted} sessions
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {tutor.responseTime}
              </div>
              <div className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {tutor.distance} km
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 text-sm ${
                    tutor.isAvailableNow
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-muted-foreground'
                  }`}
                >
                  <div
                    className={`h-2 w-2 rounded-full ${
                      tutor.isAvailableNow ? 'bg-green-500 animate-pulse' : 'bg-gray-400'
                    }`}
                  />
                  {tutor.isAvailableNow ? 'Available now' : 'Next: ' + tutor.availability[0]}
                </span>
              </div>
              <div className="flex gap-2">
                {isCompareMode && (
                  <Button
                    variant={isSelected ? 'default' : 'outline'}
                    size="sm"
                    onClick={onToggleCompare}
                  >
                    {isSelected ? 'Selected' : 'Compare'}
                  </Button>
                )}
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/tutoring/${tutor.id}`}>View Profile</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href={`/tutoring/book?tutor=${tutor.id}`}>Book Session</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ComparePanel({
  tutors,
  onRemove,
  onClear,
}: {
  tutors: typeof TUTORS;
  onRemove: (id: string) => void;
  onClear: () => void;
}) {
  if (tutors.length === 0) return null;

  return (
    <Card className="sticky bottom-4 border-2 border-primary shadow-lg">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            <h3 className="font-semibold">Compare Tutors ({tutors.length}/3)</h3>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClear}>
              Clear All
            </Button>
            <Button size="sm" disabled={tutors.length < 2}>
              Compare Now
            </Button>
          </div>
        </div>
        <div className="flex gap-4">
          {tutors.map((tutor) => (
            <div
              key={tutor.id}
              className="flex items-center gap-3 rounded-lg border p-3 flex-1"
            >
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <GraduationCap className="h-5 w-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{tutor.name}</p>
                <p className="text-sm text-muted-foreground">
                  ${tutor.hourlyRate}/hr - {tutor.rating} stars
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => onRemove(tutor.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {Array.from({ length: 3 - tutors.length }).map((_, i) => (
            <div
              key={`empty-${i}`}
              className="flex items-center justify-center rounded-lg border border-dashed p-3 flex-1 text-muted-foreground"
            >
              <span className="text-sm">Select a tutor</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function FiltersPanel({
  isOpen,
  onClose,
  filters,
  onFilterChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  filters: {
    style: string;
    language: string;
    qualifications: string[];
  };
  onFilterChange: (key: string, value: string | string[]) => void;
}) {
  if (!isOpen) return null;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Advanced Filters</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Teaching Style</label>
            <Select
              value={filters.style}
              onValueChange={(value) => onFilterChange('style', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select style" />
              </SelectTrigger>
              <SelectContent>
                {TEACHING_STYLES.map((style) => (
                  <SelectItem key={style} value={style}>
                    {style}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Language</label>
            <Select
              value={filters.language}
              onValueChange={(value) => onFilterChange('language', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select language" />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang} value={lang}>
                    {lang}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Qualifications</label>
            <Select defaultValue="any">
              <SelectTrigger>
                <SelectValue placeholder="Select qualification" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Qualification</SelectItem>
                <SelectItem value="registered">Registered Teacher</SelectItem>
                <SelectItem value="masters">Masters Degree+</SelectItem>
                <SelectItem value="hsc-marker">HSC Marker</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Expertise</label>
            <Select defaultValue="any">
              <SelectTrigger>
                <SelectValue placeholder="Select expertise" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Expertise</SelectItem>
                <SelectItem value="hsc">HSC Preparation</SelectItem>
                <SelectItem value="ib">IB Curriculum</SelectItem>
                <SelectItem value="naplan">NAPLAN Prep</SelectItem>
                <SelectItem value="learning-diff">Learning Difficulties</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function TutoringPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [subject, setSubject] = useState('All Subjects');
  const [yearLevel, setYearLevel] = useState('All Levels');
  const [priceRange, setPriceRange] = useState('Any Price');
  const [showFilters, setShowFilters] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);
  const [advancedFilters, setAdvancedFilters] = useState({
    style: 'All Styles',
    language: 'All Languages',
    qualifications: [] as string[],
  });

  const selectedPrice = PRICE_RANGES.find((p) => p.label === priceRange) || PRICE_RANGES[0];

  const filteredTutors = TUTORS.filter((tutor) => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        tutor.name.toLowerCase().includes(query) ||
        tutor.subjects.some((s) => s.toLowerCase().includes(query)) ||
        tutor.headline.toLowerCase().includes(query);
      if (!matchesSearch) return false;
    }

    if (subject !== 'All Subjects' && !tutor.subjects.includes(subject)) {
      return false;
    }

    if (yearLevel !== 'All Levels' && !tutor.yearLevels.includes(yearLevel)) {
      return false;
    }

    if (tutor.hourlyRate < selectedPrice.min || tutor.hourlyRate > selectedPrice.max) {
      return false;
    }

    if (advancedFilters.style !== 'All Styles' && tutor.teachingStyle !== advancedFilters.style) {
      return false;
    }

    if (
      advancedFilters.language !== 'All Languages' &&
      !tutor.languages.includes(advancedFilters.language)
    ) {
      return false;
    }

    return true;
  });

  const recommendedTutors = filteredTutors.filter((t) => AI_RECOMMENDED.includes(t.id));
  const otherTutors = filteredTutors.filter((t) => !AI_RECOMMENDED.includes(t.id));

  const compareTutors = TUTORS.filter((t) => selectedForCompare.includes(t.id));

  const toggleCompare = (tutorId: string) => {
    if (selectedForCompare.includes(tutorId)) {
      setSelectedForCompare(selectedForCompare.filter((id) => id !== tutorId));
    } else if (selectedForCompare.length < 3) {
      setSelectedForCompare([...selectedForCompare, tutorId]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Find a Tutor</h1>
          <p className="text-muted-foreground">
            Discover qualified tutors matched to your learning needs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={compareMode ? 'default' : 'outline'}
            onClick={() => {
              setCompareMode(!compareMode);
              if (compareMode) setSelectedForCompare([]);
            }}
          >
            <Scale className="mr-2 h-4 w-4" />
            {compareMode ? 'Exit Compare' : 'Compare'}
          </Button>
        </div>
      </div>

      {/* Search and Primary Filters */}
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by subject, topic, or tutor name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Subject" />
          </SelectTrigger>
          <SelectContent>
            {SUBJECTS.map((s) => (
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
            {YEAR_LEVELS.map((level) => (
              <SelectItem key={level} value={level}>
                {level}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={priceRange} onValueChange={setPriceRange}>
          <SelectTrigger className="w-[160px]">
            <DollarSign className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Price" />
          </SelectTrigger>
          <SelectContent>
            {PRICE_RANGES.map((range) => (
              <SelectItem key={range.label} value={range.label}>
                {range.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={() => setShowFilters(!showFilters)}>
          <Filter className="mr-2 h-4 w-4" />
          Filters
          {showFilters && <ChevronDown className="ml-2 h-4 w-4" />}
        </Button>
        <div className="flex border rounded-md">
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('list')}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'map' ? 'secondary' : 'ghost'}
            size="icon"
            onClick={() => setViewMode('map')}
          >
            <Map className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Advanced Filters */}
      <FiltersPanel
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={advancedFilters}
        onFilterChange={(key, value) =>
          setAdvancedFilters((prev) => ({ ...prev, [key]: value }))
        }
      />

      {/* View Content */}
      {viewMode === 'list' ? (
        <>
          {/* AI Recommendations Section */}
          {recommendedTutors.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                <h2 className="text-lg font-semibold">Best Matches for You</h2>
                <Badge variant="secondary" className="ml-2">
                  AI Recommended
                </Badge>
              </div>
              <div className="space-y-4">
                {recommendedTutors.map((tutor) => (
                  <TutorCard
                    key={tutor.id}
                    tutor={tutor}
                    isRecommended
                    isCompareMode={compareMode}
                    isSelected={selectedForCompare.includes(tutor.id)}
                    onToggleCompare={() => toggleCompare(tutor.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* All Tutors */}
          <div className="space-y-4">
            {recommendedTutors.length > 0 && (
              <h2 className="text-lg font-semibold">All Tutors</h2>
            )}
            <div className="space-y-4">
              {otherTutors.map((tutor) => (
                <TutorCard
                  key={tutor.id}
                  tutor={tutor}
                  isCompareMode={compareMode}
                  isSelected={selectedForCompare.includes(tutor.id)}
                  onToggleCompare={() => toggleCompare(tutor.id)}
                />
              ))}
            </div>
            {filteredTutors.length === 0 && (
              <Card className="p-12 text-center">
                <Users className="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 className="mt-4 text-lg font-medium">No tutors found</h3>
                <p className="mt-2 text-muted-foreground">
                  Try adjusting your search filters to find more tutors
                </p>
                <Button
                  className="mt-4"
                  variant="outline"
                  onClick={() => {
                    setSearchQuery('');
                    setSubject('All Subjects');
                    setYearLevel('All Levels');
                    setPriceRange('Any Price');
                  }}
                >
                  Clear Filters
                </Button>
              </Card>
            )}
          </div>
        </>
      ) : (
        /* Map View Placeholder */
        <Card className="h-[600px] flex items-center justify-center">
          <div className="text-center space-y-4">
            <Map className="mx-auto h-16 w-16 text-muted-foreground" />
            <h3 className="text-lg font-semibold">Map View</h3>
            <p className="text-muted-foreground max-w-md">
              Geographic tutor discovery showing {filteredTutors.length} tutors in your area.
              Map integration coming soon.
            </p>
            <div className="flex flex-wrap justify-center gap-2 mt-4">
              {filteredTutors.map((tutor) => (
                <Badge key={tutor.id} variant="outline">
                  <MapPin className="mr-1 h-3 w-3" />
                  {tutor.name} - {tutor.distance} km
                </Badge>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* Compare Panel */}
      {compareMode && (
        <ComparePanel
          tutors={compareTutors}
          onRemove={(id) => setSelectedForCompare(selectedForCompare.filter((i) => i !== id))}
          onClear={() => setSelectedForCompare([])}
        />
      )}
    </div>
  );
}
