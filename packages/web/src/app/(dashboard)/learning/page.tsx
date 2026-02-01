'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { PageHeader } from '@/components/shared/page-header';
import { StatsCard } from '@/components/shared/stats-card';
import {
  BookOpen,
  Target,
  Trophy,
  Clock,
  ArrowRight,
  Play,
  Star,
  Users,
  Search,
  Filter,
  Grid3X3,
  List,
  ChevronRight,
  Sparkles,
  TrendingUp,
  Flame,
  GraduationCap,
  Calendar,
  Heart,
  ChevronLeft,
  X,
} from 'lucide-react';

// Course type
interface Course {
  id: string;
  title: string;
  description: string;
  subject: string;
  yearLevel: string;
  curriculum: string;
  instructor: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  rating: number;
  reviewCount: number;
  enrolledCount: number;
  thumbnailGradient: string;
  progress?: number;
  completedLessons?: number;
  totalLessons: number;
  nextLesson?: string;
  lastAccessed?: string;
  isNew?: boolean;
  isTrending?: boolean;
  tags: string[];
}

// Mock course data
const COURSES: Course[] = [
  {
    id: 'course_1',
    title: 'Introduction to Design Thinking',
    description: 'Learn the fundamentals of human-centered design methodology and innovation frameworks.',
    subject: 'Design',
    yearLevel: 'Year 9-10',
    curriculum: 'ACARA',
    instructor: 'Dr. Sarah Chen',
    duration: '6 hours',
    difficulty: 'Beginner',
    rating: 4.8,
    reviewCount: 127,
    enrolledCount: 1234,
    thumbnailGradient: 'from-purple-500 to-pink-500',
    progress: 75,
    completedLessons: 9,
    totalLessons: 12,
    nextLesson: 'Ideation Techniques',
    lastAccessed: '2 hours ago',
    tags: ['Innovation', 'Problem Solving', 'Creativity'],
  },
  {
    id: 'course_2',
    title: 'Effective Presentation Skills',
    description: 'Master the art of pitching your ideas with confidence and clarity.',
    subject: 'Communication',
    yearLevel: 'Year 9-10',
    curriculum: 'ACARA',
    instructor: 'Prof. Michael Torres',
    duration: '4 hours',
    difficulty: 'Intermediate',
    rating: 4.9,
    reviewCount: 89,
    enrolledCount: 892,
    thumbnailGradient: 'from-blue-500 to-cyan-500',
    progress: 40,
    completedLessons: 3,
    totalLessons: 8,
    nextLesson: 'Storytelling Fundamentals',
    lastAccessed: '1 day ago',
    tags: ['Public Speaking', 'Storytelling'],
  },
  {
    id: 'course_3',
    title: 'User Research Methods',
    description: 'Deep dive into qualitative and quantitative research techniques for better design.',
    subject: 'Design',
    yearLevel: 'Year 11-12',
    curriculum: 'IB',
    instructor: 'Dr. Emily Watson',
    duration: '8 hours',
    difficulty: 'Intermediate',
    rating: 4.7,
    reviewCount: 156,
    enrolledCount: 567,
    thumbnailGradient: 'from-green-500 to-emerald-500',
    totalLessons: 15,
    isNew: true,
    tags: ['Research', 'Data Analysis', 'UX'],
  },
  {
    id: 'course_4',
    title: 'Prototyping for Innovation',
    description: 'From paper sketches to interactive digital prototypes - learn rapid iteration.',
    subject: 'Design',
    yearLevel: 'Year 9-10',
    curriculum: 'ACARA',
    instructor: 'James Liu',
    duration: '5 hours',
    difficulty: 'Beginner',
    rating: 4.6,
    reviewCount: 432,
    enrolledCount: 678,
    thumbnailGradient: 'from-orange-500 to-red-500',
    totalLessons: 10,
    isTrending: true,
    tags: ['Prototyping', 'Tools', 'Hands-on'],
  },
  {
    id: 'course_5',
    title: 'Advanced Mathematics: Calculus',
    description: 'Master differential and integral calculus with real-world applications.',
    subject: 'Mathematics',
    yearLevel: 'Year 11-12',
    curriculum: 'ACARA',
    instructor: 'Dr. Amanda Zhao',
    duration: '12 hours',
    difficulty: 'Advanced',
    rating: 4.9,
    reviewCount: 234,
    enrolledCount: 1456,
    thumbnailGradient: 'from-indigo-500 to-purple-500',
    totalLessons: 24,
    isTrending: true,
    tags: ['Calculus', 'STEM', 'HSC Prep'],
  },
  {
    id: 'course_6',
    title: 'Creative Writing Essentials',
    description: 'Develop your narrative voice and explore different writing styles and genres.',
    subject: 'English',
    yearLevel: 'Year 7-8',
    curriculum: 'ACARA',
    instructor: 'Ms. Rachel Green',
    duration: '6 hours',
    difficulty: 'Beginner',
    rating: 4.5,
    reviewCount: 178,
    enrolledCount: 945,
    thumbnailGradient: 'from-teal-500 to-cyan-500',
    totalLessons: 12,
    isNew: true,
    tags: ['Writing', 'Creativity', 'Storytelling'],
  },
  {
    id: 'course_7',
    title: 'Introduction to Python Programming',
    description: 'Learn the fundamentals of programming with Python - no prior experience needed.',
    subject: 'Technology',
    yearLevel: 'Year 7-8',
    curriculum: 'ACARA',
    instructor: 'Mr. Alex Kim',
    duration: '10 hours',
    difficulty: 'Beginner',
    rating: 4.8,
    reviewCount: 567,
    enrolledCount: 2345,
    thumbnailGradient: 'from-yellow-500 to-orange-500',
    totalLessons: 20,
    isTrending: true,
    tags: ['Coding', 'Python', 'STEM'],
  },
  {
    id: 'course_8',
    title: 'Environmental Science',
    description: 'Explore ecosystems, climate change, and sustainable practices for our planet.',
    subject: 'Science',
    yearLevel: 'Year 9-10',
    curriculum: 'IB',
    instructor: 'Dr. Marcus Green',
    duration: '8 hours',
    difficulty: 'Intermediate',
    rating: 4.7,
    reviewCount: 123,
    enrolledCount: 678,
    thumbnailGradient: 'from-green-600 to-lime-500',
    totalLessons: 16,
    tags: ['Environment', 'Climate', 'Sustainability'],
  },
];

const SUBJECTS = [
  'All Subjects',
  'Design',
  'Mathematics',
  'English',
  'Science',
  'Technology',
  'Communication',
];

const YEAR_LEVELS = [
  'All Levels',
  'Year 7-8',
  'Year 9-10',
  'Year 11-12',
];

const CURRICULA = ['All Curricula', 'ACARA', 'IB', 'Common Core', 'CEFR'];

const DIFFICULTIES = ['All Difficulties', 'Beginner', 'Intermediate', 'Advanced'];

const DURATIONS = ['Any Duration', 'Under 5 hours', '5-10 hours', 'Over 10 hours'];

// Course Card Component with hover effects
function CourseCard({
  course,
  viewMode,
  showProgress = false,
}: {
  course: Course;
  viewMode: 'grid' | 'list';
  showProgress?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const enrolled = course.progress !== undefined;

  if (viewMode === 'list') {
    return (
      <Card hover className="overflow-hidden">
        <CardContent className="p-0">
          <div className="flex">
            <div
              className={`w-48 h-36 bg-gradient-to-br ${course.thumbnailGradient} flex items-center justify-center relative flex-shrink-0`}
            >
              <BookOpen className="h-12 w-12 text-white/50" />
              {course.isNew && (
                <Badge className="absolute top-2 left-2 bg-green-500">New</Badge>
              )}
              {course.isTrending && (
                <Badge className="absolute top-2 left-2 bg-orange-500">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Trending
                </Badge>
              )}
            </div>
            <div className="flex-1 p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{course.title}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-1 mt-1">
                    {course.description}
                  </p>
                </div>
                <Button variant="ghost" size="icon-sm">
                  <Heart className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="secondary">{course.subject}</Badge>
                <Badge variant="outline">{course.yearLevel}</Badge>
                <Badge variant="outline">{course.difficulty}</Badge>
              </div>
              <div className="flex items-center justify-between mt-3">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-medium text-foreground">{course.rating}</span>
                    <span>({course.reviewCount})</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {course.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {course.enrolledCount.toLocaleString()}
                  </div>
                </div>
                <Button asChild>
                  <Link href={`/learning/courses/${course.id}`}>
                    {enrolled ? 'Continue' : 'Start Learning'}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
              {showProgress && enrolled && (
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} className="h-1.5" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      hover
      className="overflow-hidden group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="relative">
        <div
          className={`h-36 bg-gradient-to-br ${course.thumbnailGradient} flex items-center justify-center transition-all duration-300`}
        >
          <BookOpen
            className={`h-12 w-12 text-white/50 transition-transform duration-300 ${
              isHovered ? 'scale-110' : ''
            }`}
          />
          {/* Badges */}
          <div className="absolute top-2 left-2 flex gap-1">
            {course.isNew && <Badge className="bg-green-500">New</Badge>}
            {course.isTrending && (
              <Badge className="bg-orange-500">
                <TrendingUp className="h-3 w-3 mr-1" />
                Trending
              </Badge>
            )}
          </div>
          {/* Wishlist button */}
          <Button
            variant="ghost"
            size="icon-sm"
            className="absolute top-2 right-2 bg-black/20 hover:bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Heart className="h-4 w-4" />
          </Button>
          {/* Play button overlay on hover */}
          <div
            className={`absolute inset-0 bg-black/40 flex items-center justify-center transition-opacity duration-300 ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <Button asChild size="lg" className="gap-2">
              <Link href={`/learning/courses/${course.id}`}>
                <Play className="h-5 w-5" />
                {enrolled ? 'Continue' : 'Start Learning'}
              </Link>
            </Button>
          </div>
        </div>
        {/* Progress bar for enrolled courses */}
        {showProgress && enrolled && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
            <div
              className="h-full bg-primary"
              style={{ width: `${course.progress}%` }}
            />
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="text-base line-clamp-1">{course.title}</CardTitle>
            <CardDescription className="line-clamp-2 mt-1">
              {course.description}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="text-xs">
            {course.subject}
          </Badge>
          <Badge variant="outline" className="text-xs">
            {course.yearLevel}
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
            <span className="font-medium text-foreground">{course.rating}</span>
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {course.duration}
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {course.enrolledCount >= 1000
              ? `${(course.enrolledCount / 1000).toFixed(1)}k`
              : course.enrolledCount}
          </div>
        </div>
        {showProgress && enrolled && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">
                {course.completedLessons}/{course.totalLessons} lessons
              </span>
              <span className="font-medium">{course.progress}%</span>
            </div>
            <Progress value={course.progress} className="h-1.5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Horizontal scrollable course row
function CourseRow({
  title,
  icon,
  courses,
  viewAll,
  showProgress = false,
}: {
  title: string;
  icon: React.ReactNode;
  courses: Course[];
  viewAll?: string;
  showProgress?: boolean;
}) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const canScrollLeft = scrollPosition > 0;
  const canScrollRight = true; // Simplified - in real app would calculate based on content width

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-xl font-semibold">{title}</h2>
        </div>
        {viewAll && (
          <Button variant="ghost" size="sm" asChild>
            <Link href={viewAll}>
              View All
              <ChevronRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
      <div className="relative group">
        {/* Scroll buttons */}
        {canScrollLeft && (
          <Button
            variant="outline"
            size="icon"
            className="absolute left-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-lg"
            onClick={() => setScrollPosition(Math.max(0, scrollPosition - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        )}
        {canScrollRight && (
          <Button
            variant="outline"
            size="icon"
            className="absolute right-0 top-1/2 -translate-y-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-lg"
            onClick={() => setScrollPosition(scrollPosition + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        )}
        {/* Scrollable container */}
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide -mx-2 px-2">
          {courses.map((course) => (
            <div key={course.id} className="flex-shrink-0 w-72">
              <CourseCard course={course} viewMode="grid" showProgress={showProgress} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function LearningPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [subject, setSubject] = useState('All Subjects');
  const [yearLevel, setYearLevel] = useState('All Levels');
  const [curriculum, setCurriculum] = useState('All Curricula');
  const [difficulty, setDifficulty] = useState('All Difficulties');
  const [duration, setDuration] = useState('Any Duration');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');

  // Filter courses
  const filteredCourses = useMemo(() => {
    return COURSES.filter((course) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matches =
          course.title.toLowerCase().includes(query) ||
          course.description.toLowerCase().includes(query) ||
          course.subject.toLowerCase().includes(query) ||
          course.tags.some((tag) => tag.toLowerCase().includes(query));
        if (!matches) return false;
      }
      if (subject !== 'All Subjects' && course.subject !== subject) return false;
      if (yearLevel !== 'All Levels' && course.yearLevel !== yearLevel) return false;
      if (curriculum !== 'All Curricula' && course.curriculum !== curriculum) return false;
      if (difficulty !== 'All Difficulties' && course.difficulty !== difficulty) return false;
      if (duration !== 'Any Duration') {
        const hours = parseInt(course.duration);
        if (duration === 'Under 5 hours' && hours >= 5) return false;
        if (duration === '5-10 hours' && (hours < 5 || hours > 10)) return false;
        if (duration === 'Over 10 hours' && hours <= 10) return false;
      }
      return true;
    });
  }, [searchQuery, subject, yearLevel, curriculum, difficulty, duration]);

  // Categorized courses
  const continueLearning = COURSES.filter((c) => c.progress !== undefined);
  const recommended = COURSES.filter((c) => c.rating >= 4.8);
  const newCourses = COURSES.filter((c) => c.isNew);
  const trending = COURSES.filter((c) => c.isTrending);

  // Course stats
  const enrolledCourses = continueLearning.length;
  const completedCourses = continueLearning.filter((c) => c.progress === 100).length;
  const totalHoursLearned = 24;
  const currentStreak = 5;

  const hasActiveFilters =
    subject !== 'All Subjects' ||
    yearLevel !== 'All Levels' ||
    curriculum !== 'All Curricula' ||
    difficulty !== 'All Difficulties' ||
    duration !== 'Any Duration';

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader
        title="Course Library"
        description="Discover and continue your learning journey"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/learning/curriculum">
              <Button variant="outline">
                <GraduationCap className="mr-2 h-4 w-4" />
                Curriculum Browser
              </Button>
            </Link>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <StatsCard
          label="Courses Enrolled"
          value={enrolledCourses}
          icon={BookOpen}
          variant="primary"
        />
        <StatsCard
          label="Completed"
          value={completedCourses}
          icon={Trophy}
          variant="success"
        />
        <StatsCard
          label="Hours Learned"
          value={`${totalHoursLearned}h`}
          icon={Clock}
          variant="primary"
        />
        <StatsCard
          label="Day Streak"
          value={currentStreak}
          icon={Flame}
          variant="warning"
          subtitle="Keep it going!"
        />
      </div>

      {/* Tabs and Search */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full md:w-auto">
            <TabsList>
              <TabsTrigger value="browse">Browse</TabsTrigger>
              <TabsTrigger value="my-courses">My Courses</TabsTrigger>
              <TabsTrigger value="wishlist">Wishlist</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search courses, subjects, or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="absolute right-2 top-1/2 -translate-y-1/2"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
            <Button
              variant={showFilters ? 'secondary' : 'outline'}
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="mr-2 h-4 w-4" />
              Filters
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  Active
                </Badge>
              )}
            </Button>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                onClick={() => setViewMode('list')}
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <Card className="p-4">
            <div className="grid gap-4 md:grid-cols-5">
              <div>
                <label className="text-sm font-medium mb-2 block">Subject</label>
                <Select value={subject} onValueChange={setSubject}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SUBJECTS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Year Level</label>
                <Select value={yearLevel} onValueChange={setYearLevel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Curriculum</label>
                <Select value={curriculum} onValueChange={setCurriculum}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRICULA.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Difficulty</label>
                <Select value={difficulty} onValueChange={setDifficulty}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIFFICULTIES.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Duration</label>
                <Select value={duration} onValueChange={setDuration}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATIONS.map((d) => (
                      <SelectItem key={d} value={d}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {hasActiveFilters && (
              <div className="flex justify-end mt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSubject('All Subjects');
                    setYearLevel('All Levels');
                    setCurriculum('All Curricula');
                    setDifficulty('All Difficulties');
                    setDuration('Any Duration');
                  }}
                >
                  Clear Filters
                </Button>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Course Content */}
      {activeTab === 'browse' && !searchQuery && !hasActiveFilters ? (
        /* Netflix-style category rows */
        <div className="space-y-10">
          {/* Continue Learning */}
          {continueLearning.length > 0 && (
            <CourseRow
              title="Continue Learning"
              icon={<Play className="h-5 w-5 text-primary" />}
              courses={continueLearning}
              viewAll="/learning/courses?filter=enrolled"
              showProgress
            />
          )}

          {/* AI Recommended */}
          <CourseRow
            title="Recommended for You"
            icon={<Sparkles className="h-5 w-5 text-purple-500" />}
            courses={recommended}
          />

          {/* New Courses */}
          {newCourses.length > 0 && (
            <CourseRow
              title="New Courses"
              icon={<Calendar className="h-5 w-5 text-green-500" />}
              courses={newCourses}
            />
          )}

          {/* Trending */}
          {trending.length > 0 && (
            <CourseRow
              title="Trending Now"
              icon={<TrendingUp className="h-5 w-5 text-orange-500" />}
              courses={trending}
            />
          )}

          {/* By Subject sections */}
          {SUBJECTS.filter((s) => s !== 'All Subjects').map((subj) => {
            const subjectCourses = COURSES.filter((c) => c.subject === subj);
            if (subjectCourses.length === 0) return null;
            return (
              <CourseRow
                key={subj}
                title={subj}
                icon={<BookOpen className="h-5 w-5 text-blue-500" />}
                courses={subjectCourses}
                viewAll={`/learning/courses?subject=${encodeURIComponent(subj)}`}
              />
            );
          })}
        </div>
      ) : activeTab === 'my-courses' ? (
        /* My Courses Grid */
        <div className="space-y-6">
          {continueLearning.length > 0 ? (
            <>
              <h2 className="text-xl font-semibold">In Progress</h2>
              <div
                className={
                  viewMode === 'grid'
                    ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                    : 'space-y-4'
                }
              >
                {continueLearning.map((course) => (
                  <CourseCard
                    key={course.id}
                    course={course}
                    viewMode={viewMode}
                    showProgress
                  />
                ))}
              </div>
            </>
          ) : (
            <Card className="p-12 text-center">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No enrolled courses yet</h3>
              <p className="mt-2 text-muted-foreground">
                Browse our course library and start your learning journey
              </p>
              <Button className="mt-4" onClick={() => setActiveTab('browse')}>
                Browse Courses
              </Button>
            </Card>
          )}
        </div>
      ) : activeTab === 'wishlist' ? (
        /* Wishlist */
        <Card className="p-12 text-center">
          <Heart className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">Your wishlist is empty</h3>
          <p className="mt-2 text-muted-foreground">
            Save courses you're interested in by clicking the heart icon
          </p>
          <Button className="mt-4" onClick={() => setActiveTab('browse')}>
            Browse Courses
          </Button>
        </Card>
      ) : (
        /* Search/Filter Results Grid */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              {filteredCourses.length} course{filteredCourses.length !== 1 ? 's' : ''} found
            </p>
          </div>
          {filteredCourses.length > 0 ? (
            <div
              className={
                viewMode === 'grid'
                  ? 'grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'space-y-4'
              }
            >
              {filteredCourses.map((course) => (
                <CourseCard key={course.id} course={course} viewMode={viewMode} />
              ))}
            </div>
          ) : (
            <Card className="p-12 text-center">
              <Search className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No courses found</h3>
              <p className="mt-2 text-muted-foreground">
                Try adjusting your search or filters
              </p>
              <Button
                className="mt-4"
                variant="outline"
                onClick={() => {
                  setSearchQuery('');
                  setSubject('All Subjects');
                  setYearLevel('All Levels');
                  setCurriculum('All Curricula');
                  setDifficulty('All Difficulties');
                  setDuration('Any Duration');
                }}
              >
                Clear All Filters
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
