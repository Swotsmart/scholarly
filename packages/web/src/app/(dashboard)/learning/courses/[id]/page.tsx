'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  BookOpen,
  Clock,
  Users,
  Star,
  Play,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronRight,
  ArrowLeft,
  Heart,
  Share2,
  Download,
  FileText,
  Link2,
  Video,
  Award,
  GraduationCap,
  BarChart3,
  MessageSquare,
  ThumbsUp,
  Flag,
  PlayCircle,
  Lock,
  Calendar,
  Target,
  Sparkles,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';

// Course module types
interface Lesson {
  id: string;
  title: string;
  duration: string;
  type: 'video' | 'reading' | 'quiz' | 'interactive' | 'assignment';
  completed: boolean;
  locked: boolean;
}

interface Module {
  id: string;
  title: string;
  description: string;
  lessons: Lesson[];
  duration: string;
}

interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  date: string;
  comment: string;
  helpful: number;
}

interface Resource {
  id: string;
  title: string;
  type: 'pdf' | 'video' | 'link' | 'download';
  url: string;
  size?: string;
}

interface CourseDetail {
  id: string;
  title: string;
  description: string;
  longDescription: string;
  subject: string;
  yearLevel: string;
  curriculum: string;
  instructor: {
    name: string;
    title: string;
    bio: string;
    courses: number;
    students: number;
    rating: number;
  };
  duration: string;
  difficulty: string;
  rating: number;
  reviewCount: number;
  enrolledCount: number;
  thumbnailGradient: string;
  progress?: number;
  completedLessons?: number;
  totalLessons: number;
  lastUpdated: string;
  language: string;
  certificateOffered: boolean;
  modules: Module[];
  resources: Resource[];
  reviews: Review[];
  learningOutcomes: string[];
  requirements: string[];
  relatedCourses: {
    id: string;
    title: string;
    rating: number;
    thumbnail: string;
  }[];
  prerequisiteCourses: {
    id: string;
    title: string;
    completed: boolean;
  }[];
  tags: string[];
}

// Mock course data
const COURSE_DATA: CourseDetail = {
  id: 'course_1',
  title: 'Introduction to Design Thinking',
  description: 'Learn the fundamentals of human-centered design methodology',
  longDescription: `Design Thinking is a human-centered approach to innovation that draws from the designer's toolkit to integrate the needs of people, the possibilities of technology, and the requirements for business success.

In this comprehensive course, you'll learn the five-stage Design Thinking process: Empathize, Define, Ideate, Prototype, and Test. Through hands-on projects and real-world case studies, you'll develop the skills to tackle complex problems and create innovative solutions.

Whether you're a student looking to enhance your problem-solving abilities, a professional seeking to drive innovation in your organization, or simply curious about design thinking methodology, this course provides a solid foundation for your creative journey.`,
  subject: 'Design',
  yearLevel: 'Year 9-10',
  curriculum: 'ACARA',
  instructor: {
    name: 'Dr. Sarah Chen',
    title: 'Design Innovation Lead',
    bio: 'Dr. Sarah Chen is an award-winning design educator with over 15 years of experience in human-centered design. She has led innovation workshops for Fortune 500 companies and taught at leading universities worldwide.',
    courses: 8,
    students: 12500,
    rating: 4.9,
  },
  duration: '6 hours',
  difficulty: 'Beginner',
  rating: 4.8,
  reviewCount: 127,
  enrolledCount: 1234,
  thumbnailGradient: 'from-purple-500 to-pink-500',
  progress: 75,
  completedLessons: 9,
  totalLessons: 12,
  lastUpdated: 'January 2024',
  language: 'English',
  certificateOffered: true,
  modules: [
    {
      id: 'module_1',
      title: 'Introduction to Design Thinking',
      description: 'Understanding the foundations of human-centered design',
      duration: '45 min',
      lessons: [
        { id: 'lesson_1', title: 'What is Design Thinking?', duration: '10 min', type: 'video', completed: true, locked: false },
        { id: 'lesson_2', title: 'The History of Design Thinking', duration: '8 min', type: 'video', completed: true, locked: false },
        { id: 'lesson_3', title: 'Why Design Thinking Matters', duration: '12 min', type: 'reading', completed: true, locked: false },
        { id: 'lesson_4', title: 'Module Quiz', duration: '15 min', type: 'quiz', completed: true, locked: false },
      ],
    },
    {
      id: 'module_2',
      title: 'Empathize: Understanding Users',
      description: 'Learn techniques for understanding user needs and perspectives',
      duration: '1 hr 15 min',
      lessons: [
        { id: 'lesson_5', title: 'The Art of Empathy', duration: '15 min', type: 'video', completed: true, locked: false },
        { id: 'lesson_6', title: 'User Interview Techniques', duration: '20 min', type: 'video', completed: true, locked: false },
        { id: 'lesson_7', title: 'Observation Methods', duration: '15 min', type: 'reading', completed: true, locked: false },
        { id: 'lesson_8', title: 'Creating Empathy Maps', duration: '25 min', type: 'interactive', completed: true, locked: false },
      ],
    },
    {
      id: 'module_3',
      title: 'Define: Framing the Problem',
      description: 'Synthesize research into actionable problem statements',
      duration: '1 hr',
      lessons: [
        { id: 'lesson_9', title: 'Synthesizing User Research', duration: '18 min', type: 'video', completed: true, locked: false },
        { id: 'lesson_10', title: 'Creating Problem Statements', duration: '15 min', type: 'video', completed: false, locked: false },
        { id: 'lesson_11', title: 'Point of View Statements', duration: '12 min', type: 'reading', completed: false, locked: false },
        { id: 'lesson_12', title: 'Define Exercise', duration: '15 min', type: 'assignment', completed: false, locked: false },
      ],
    },
    {
      id: 'module_4',
      title: 'Ideate: Generating Solutions',
      description: 'Techniques for creative brainstorming and idea generation',
      duration: '1 hr 30 min',
      lessons: [
        { id: 'lesson_13', title: 'Brainstorming Techniques', duration: '20 min', type: 'video', completed: false, locked: true },
        { id: 'lesson_14', title: 'Crazy 8s Method', duration: '15 min', type: 'interactive', completed: false, locked: true },
        { id: 'lesson_15', title: 'How Might We Questions', duration: '15 min', type: 'video', completed: false, locked: true },
        { id: 'lesson_16', title: 'Ideation Workshop', duration: '40 min', type: 'assignment', completed: false, locked: true },
      ],
    },
  ],
  resources: [
    { id: 'res_1', title: 'Design Thinking Workbook', type: 'pdf', url: '#', size: '2.4 MB' },
    { id: 'res_2', title: 'Empathy Map Template', type: 'pdf', url: '#', size: '450 KB' },
    { id: 'res_3', title: 'Supplementary Reading List', type: 'link', url: '#' },
    { id: 'res_4', title: 'Case Study Videos', type: 'video', url: '#' },
  ],
  reviews: [
    {
      id: 'review_1',
      userId: 'user_1',
      userName: 'Alex Thompson',
      rating: 5,
      date: '2 weeks ago',
      comment: 'Excellent course! Dr. Chen explains complex concepts in a very accessible way. The hands-on exercises really helped cement my understanding of design thinking.',
      helpful: 24,
    },
    {
      id: 'review_2',
      userId: 'user_2',
      userName: 'Maria Garcia',
      rating: 5,
      date: '1 month ago',
      comment: 'This course changed how I approach problem-solving. The empathy mapping section was particularly valuable for my work.',
      helpful: 18,
    },
    {
      id: 'review_3',
      userId: 'user_3',
      userName: 'James Wilson',
      rating: 4,
      date: '1 month ago',
      comment: 'Great content overall. Would love to see more advanced examples in future updates. The interactive exercises are fantastic.',
      helpful: 12,
    },
  ],
  learningOutcomes: [
    'Understand the five stages of the Design Thinking process',
    'Conduct user research and create empathy maps',
    'Frame problems using Point of View statements',
    'Generate innovative solutions through structured brainstorming',
    'Create low-fidelity prototypes to test ideas',
    'Apply Design Thinking to real-world challenges',
  ],
  requirements: [
    'No prior experience required',
    'Basic computer skills',
    'Curiosity and willingness to learn',
    'Access to paper and markers for exercises',
  ],
  relatedCourses: [
    { id: 'course_3', title: 'User Research Methods', rating: 4.7, thumbnail: 'from-green-500 to-emerald-500' },
    { id: 'course_4', title: 'Prototyping for Innovation', rating: 4.6, thumbnail: 'from-orange-500 to-red-500' },
    { id: 'course_2', title: 'Effective Presentation Skills', rating: 4.9, thumbnail: 'from-blue-500 to-cyan-500' },
  ],
  prerequisiteCourses: [],
  tags: ['Design Thinking', 'Innovation', 'Problem Solving', 'Creativity', 'UX'],
};

// Lesson type icons
function getLessonIcon(type: Lesson['type']) {
  switch (type) {
    case 'video':
      return <PlayCircle className="h-4 w-4" />;
    case 'reading':
      return <FileText className="h-4 w-4" />;
    case 'quiz':
      return <Target className="h-4 w-4" />;
    case 'interactive':
      return <Sparkles className="h-4 w-4" />;
    case 'assignment':
      return <FileText className="h-4 w-4" />;
    default:
      return <BookOpen className="h-4 w-4" />;
  }
}

// Resource type icons
function getResourceIcon(type: Resource['type']) {
  switch (type) {
    case 'pdf':
      return <FileText className="h-4 w-4" />;
    case 'video':
      return <Video className="h-4 w-4" />;
    case 'link':
      return <Link2 className="h-4 w-4" />;
    case 'download':
      return <Download className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

// Star rating component
function StarRating({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  const iconSize = size === 'lg' ? 'h-5 w-5' : 'h-4 w-4';

  return (
    <div className="flex items-center gap-0.5">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`${iconSize} ${
            i < fullStars
              ? 'fill-yellow-400 text-yellow-400'
              : i === fullStars && hasHalfStar
              ? 'fill-yellow-400/50 text-yellow-400'
              : 'text-muted-foreground'
          }`}
        />
      ))}
    </div>
  );
}

// Module Accordion Component
function ModuleAccordion({ module, index }: { module: Module; index: number }) {
  const [isOpen, setIsOpen] = useState(index === 0);
  const completedLessons = module.lessons.filter((l) => l.completed).length;
  const progress = (completedLessons / module.lessons.length) * 100;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="overflow-hidden">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center gap-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary">
                {index + 1}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{module.title}</CardTitle>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">{module.duration}</span>
                    {isOpen ? (
                      <ChevronDown className="h-5 w-5 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-muted-foreground">
                    {completedLessons}/{module.lessons.length} lessons
                  </span>
                  <Progress value={progress} className="h-1.5 w-24" />
                </div>
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="pt-0">
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-4">{module.description}</p>
              <div className="space-y-2">
                {module.lessons.map((lesson) => (
                  <Link
                    key={lesson.id}
                    href={lesson.locked ? '#' : `/learning/lesson/${lesson.id}`}
                    className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                      lesson.locked
                        ? 'opacity-50 cursor-not-allowed bg-muted/30'
                        : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                    onClick={(e) => lesson.locked && e.preventDefault()}
                  >
                    <div className="flex-shrink-0">
                      {lesson.completed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                      ) : lesson.locked ? (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Circle className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      {getLessonIcon(lesson.type)}
                      <span className={lesson.completed ? 'text-muted-foreground' : ''}>
                        {lesson.title}
                      </span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {lesson.duration}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// Review Card Component
function ReviewCard({ review }: { review: Review }) {
  const [helpful, setHelpful] = useState(review.helpful);
  const [hasVoted, setHasVoted] = useState(false);

  return (
    <div className="border-b pb-6 last:border-0">
      <div className="flex items-start gap-4">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center font-semibold text-primary flex-shrink-0">
          {review.userName[0]}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">{review.userName}</span>
            <StarRating rating={review.rating} />
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">{review.date}</p>
          <p className="mt-3">{review.comment}</p>
          <div className="flex items-center gap-4 mt-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              disabled={hasVoted}
              onClick={() => {
                setHelpful(helpful + 1);
                setHasVoted(true);
              }}
            >
              <ThumbsUp className="h-4 w-4 mr-1" />
              Helpful ({helpful})
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              <Flag className="h-4 w-4 mr-1" />
              Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CourseDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState('curriculum');
  const [isWishlisted, setIsWishlisted] = useState(false);

  // In a real app, fetch course data based on params.id
  const course = COURSE_DATA;
  const enrolled = course.progress !== undefined;

  // Calculate next lesson
  const allLessons = course.modules.flatMap((m) => m.lessons);
  const nextLesson = allLessons.find((l) => !l.completed && !l.locked);
  const timeRemaining = enrolled
    ? `${Math.ceil((course.totalLessons - (course.completedLessons || 0)) * 30 / 60)} hours remaining`
    : null;

  return (
    <div className="space-y-8">
      {/* Back navigation */}
      <Link
        href="/learning"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Course Library
      </Link>

      {/* Hero Section */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Course Header */}
          <div>
            <div className="flex flex-wrap gap-2 mb-3">
              <Badge>{course.subject}</Badge>
              <Badge variant="outline">{course.yearLevel}</Badge>
              <Badge variant="outline">{course.curriculum}</Badge>
              <Badge variant="secondary">{course.difficulty}</Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">{course.title}</h1>
            <p className="text-lg text-muted-foreground mt-2">{course.description}</p>
          </div>

          {/* Stats Row */}
          <div className="flex flex-wrap items-center gap-6">
            <div className="flex items-center gap-1">
              <StarRating rating={course.rating} size="lg" />
              <span className="font-medium ml-1">{course.rating}</span>
              <span className="text-muted-foreground">({course.reviewCount} reviews)</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Users className="h-5 w-5" />
              <span>{course.enrolledCount.toLocaleString()} students</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Clock className="h-5 w-5" />
              <span>{course.duration}</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <Calendar className="h-5 w-5" />
              <span>Updated {course.lastUpdated}</span>
            </div>
          </div>

          {/* Instructor */}
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{course.instructor.name}</p>
              <p className="text-sm text-muted-foreground">{course.instructor.title}</p>
            </div>
          </div>

          {/* Progress (if enrolled) */}
          {enrolled && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">Your Progress</h3>
                    <p className="text-sm text-muted-foreground">{timeRemaining}</p>
                  </div>
                  <span className="text-2xl font-bold text-primary">{course.progress}%</span>
                </div>
                <Progress value={course.progress} className="h-2" />
                <div className="flex items-center justify-between mt-3 text-sm">
                  <span className="text-muted-foreground">
                    {course.completedLessons}/{course.totalLessons} lessons completed
                  </span>
                  {nextLesson && (
                    <Link
                      href={`/learning/lesson/${nextLesson.id}`}
                      className="text-primary hover:underline flex items-center gap-1"
                    >
                      Continue: {nextLesson.title}
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar Card */}
        <div>
          <Card className="sticky top-4">
            <div
              className={`h-40 bg-gradient-to-br ${course.thumbnailGradient} flex items-center justify-center`}
            >
              <BookOpen className="h-16 w-16 text-white/50" />
            </div>
            <CardContent className="p-6 space-y-4">
              {/* Action Buttons */}
              <div className="space-y-3">
                {enrolled ? (
                  <>
                    <Button className="w-full" size="lg" asChild>
                      <Link href={nextLesson ? `/learning/lesson/${nextLesson.id}` : '#'}>
                        <Play className="mr-2 h-5 w-5" />
                        Continue Learning
                      </Link>
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant={isWishlisted ? 'secondary' : 'outline'}
                        className="flex-1"
                        onClick={() => setIsWishlisted(!isWishlisted)}
                      >
                        <Heart className={`h-4 w-4 mr-2 ${isWishlisted ? 'fill-current' : ''}`} />
                        {isWishlisted ? 'Saved' : 'Save'}
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <Button className="w-full" size="lg">
                      <Play className="mr-2 h-5 w-5" />
                      Enroll Now
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        variant={isWishlisted ? 'secondary' : 'outline'}
                        className="flex-1"
                        onClick={() => setIsWishlisted(!isWishlisted)}
                      >
                        <Heart className={`h-4 w-4 mr-2 ${isWishlisted ? 'fill-current' : ''}`} />
                        Wishlist
                      </Button>
                      <Button variant="outline" className="flex-1">
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </Button>
                    </div>
                  </>
                )}
              </div>

              {/* Course includes */}
              <div className="space-y-3 pt-4 border-t">
                <h4 className="font-medium">This course includes:</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    {course.duration} of video content
                  </li>
                  <li className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {course.totalLessons} lessons
                  </li>
                  <li className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-muted-foreground" />
                    {course.resources.length} downloadable resources
                  </li>
                  {course.certificateOffered && (
                    <li className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-muted-foreground" />
                      Certificate of completion
                    </li>
                  )}
                  <li className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-muted-foreground" />
                    Full lifetime access
                  </li>
                </ul>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 pt-4 border-t">
                {course.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({course.reviewCount})</TabsTrigger>
        </TabsList>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Course Curriculum</h2>
                <p className="text-muted-foreground">
                  {course.modules.length} modules - {course.totalLessons} lessons - {course.duration}
                </p>
              </div>
              {enrolled && (
                <p className="text-sm text-muted-foreground">
                  {course.completedLessons}/{course.totalLessons} completed
                </p>
              )}
            </div>
            <div className="space-y-3">
              {course.modules.map((module, index) => (
                <ModuleAccordion key={module.id} module={module} index={index} />
              ))}
            </div>
          </div>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6">
          <div className="grid gap-8 lg:grid-cols-2">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4">About This Course</h2>
                <div className="prose prose-sm dark:prose-invert">
                  {course.longDescription.split('\n\n').map((paragraph, i) => (
                    <p key={i}>{paragraph}</p>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-4">What You'll Learn</h3>
                <ul className="space-y-3">
                  {course.learningOutcomes.map((outcome, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                      <span>{outcome}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">Requirements</h3>
                <ul className="space-y-2">
                  {course.requirements.map((req, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <Circle className="h-2 w-2 mt-2 flex-shrink-0" />
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructor Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">About the Instructor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                      <GraduationCap className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-lg">{course.instructor.name}</p>
                      <p className="text-muted-foreground">{course.instructor.title}</p>
                    </div>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span>{course.instructor.rating} rating</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{course.instructor.students.toLocaleString()} students</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.instructor.courses} courses</span>
                    </div>
                  </div>
                  <p className="text-sm">{course.instructor.bio}</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Resources Tab */}
        <TabsContent value="resources" className="mt-6">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Course Resources</h2>
            <div className="grid gap-3 md:grid-cols-2">
              {course.resources.map((resource) => (
                <Card key={resource.id} hover>
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      {getResourceIcon(resource.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{resource.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {resource.size || resource.type.toUpperCase()}
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
            {!enrolled && (
              <p className="text-sm text-muted-foreground">
                Enroll in this course to access all resources.
              </p>
            )}
          </div>
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="mt-6">
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Rating Summary */}
            <div className="lg:col-span-1">
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-5xl font-bold">{course.rating}</p>
                  <StarRating rating={course.rating} size="lg" />
                  <p className="text-muted-foreground mt-2">
                    {course.reviewCount} reviews
                  </p>
                  {enrolled && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button className="mt-4 w-full" variant="outline">
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Write a Review
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Write a Review</DialogTitle>
                          <DialogDescription>
                            Share your experience with this course
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                          <div>
                            <label className="text-sm font-medium">Your Rating</label>
                            <div className="flex items-center gap-1 mt-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  className="h-8 w-8 cursor-pointer text-muted-foreground hover:fill-yellow-400 hover:text-yellow-400"
                                />
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Your Review</label>
                            <Textarea
                              placeholder="What did you think about this course?"
                              className="mt-2"
                              rows={4}
                            />
                          </div>
                          <Button className="w-full">Submit Review</Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Reviews List */}
            <div className="lg:col-span-2 space-y-6">
              {course.reviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
              <Button variant="outline" className="w-full">
                Load More Reviews
              </Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Related Courses */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Related Courses</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {course.relatedCourses.map((related) => (
            <Link key={related.id} href={`/learning/courses/${related.id}`}>
              <Card hover className="overflow-hidden">
                <div
                  className={`h-24 bg-gradient-to-br ${related.thumbnail} flex items-center justify-center`}
                >
                  <BookOpen className="h-8 w-8 text-white/50" />
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium line-clamp-1">{related.title}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{related.rating}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
