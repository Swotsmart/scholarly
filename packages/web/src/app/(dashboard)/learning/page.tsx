'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  BookOpen,
  Target,
  Trophy,
  Clock,
  ArrowRight,
  Play,
  CheckCircle2,
} from 'lucide-react';

const stats = [
  { label: 'Courses Enrolled', value: '4', icon: BookOpen },
  { label: 'Completed', value: '2', icon: Trophy },
  { label: 'In Progress', value: '2', icon: Target },
  { label: 'Hours Learned', value: '24', icon: Clock },
];

const currentCourses = [
  {
    id: 'course_1',
    title: 'Introduction to Design Thinking',
    description: 'Learn the fundamentals of human-centered design',
    progress: 75,
    totalLessons: 12,
    completedLessons: 9,
    nextLesson: 'Ideation Techniques',
    image: '/course-design.jpg',
  },
  {
    id: 'course_2',
    title: 'Effective Presentation Skills',
    description: 'Master the art of pitching your ideas',
    progress: 40,
    totalLessons: 8,
    completedLessons: 3,
    nextLesson: 'Storytelling Fundamentals',
    image: '/course-presentation.jpg',
  },
];

export default function LearningPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Learning</h1>
          <p className="text-muted-foreground">
            Continue your learning journey
          </p>
        </div>
        <Button asChild>
          <Link href="/learning/courses">
            Browse Courses
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Continue Learning */}
      <div>
        <h2 className="heading-3 mb-4">Continue Learning</h2>
        <div className="grid gap-6 md:grid-cols-2">
          {currentCourses.map((course) => (
            <Card key={course.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{course.title}</CardTitle>
                    <CardDescription>{course.description}</CardDescription>
                  </div>
                  <Badge variant="secondary">
                    {course.completedLessons}/{course.totalLessons} lessons
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-medium">{course.progress}%</span>
                  </div>
                  <Progress value={course.progress} />
                </div>

                <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                  <Play className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm font-medium">Next: {course.nextLesson}</p>
                  </div>
                </div>

                <Button className="w-full" asChild>
                  <Link href={`/learning/courses/${course.id}`}>
                    Continue Learning
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer transition-shadow hover:shadow-lg" asChild>
          <Link href="/learning/courses">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <BookOpen className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Browse All Courses</h3>
                <p className="text-sm text-muted-foreground">
                  Discover new learning opportunities
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg" asChild>
          <Link href="/learning/progress">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-green-500/10 p-3">
                <Target className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">View Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Track your learning achievements
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
