'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  BookOpen,
  Clock,
  Users,
  Star,
  Search,
  Play,
} from 'lucide-react';

const courses = [
  {
    id: 'course_1',
    title: 'Introduction to Design Thinking',
    description: 'Learn the fundamentals of human-centered design methodology',
    instructor: 'Dr. Sarah Chen',
    duration: '6 hours',
    lessons: 12,
    rating: 4.8,
    students: 1234,
    level: 'Beginner',
    enrolled: true,
  },
  {
    id: 'course_2',
    title: 'Effective Presentation Skills',
    description: 'Master the art of pitching your ideas with confidence',
    instructor: 'Prof. Michael Torres',
    duration: '4 hours',
    lessons: 8,
    rating: 4.9,
    students: 892,
    level: 'Intermediate',
    enrolled: true,
  },
  {
    id: 'course_3',
    title: 'User Research Methods',
    description: 'Deep dive into qualitative and quantitative research techniques',
    instructor: 'Dr. Emily Watson',
    duration: '8 hours',
    lessons: 15,
    rating: 4.7,
    students: 567,
    level: 'Intermediate',
    enrolled: false,
  },
  {
    id: 'course_4',
    title: 'Prototyping for Innovation',
    description: 'From paper sketches to interactive digital prototypes',
    instructor: 'James Liu',
    duration: '5 hours',
    lessons: 10,
    rating: 4.6,
    students: 432,
    level: 'Beginner',
    enrolled: false,
  },
];

export default function CoursesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Courses</h1>
          <p className="text-muted-foreground">
            Expand your skills with expert-led courses
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search courses..." className="pl-10" />
      </div>

      {/* Course Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {courses.map((course) => (
          <Card key={course.id} className="overflow-hidden">
            <div className="h-32 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <BookOpen className="h-12 w-12 text-primary/30" />
            </div>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle>{course.title}</CardTitle>
                  <CardDescription>{course.description}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>By {course.instructor}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary">{course.level}</Badge>
                <Badge variant="outline" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {course.duration}
                </Badge>
                <Badge variant="outline" className="gap-1">
                  <BookOpen className="h-3 w-3" />
                  {course.lessons} lessons
                </Badge>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                  <span className="font-medium">{course.rating}</span>
                </div>
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Users className="h-4 w-4" />
                  {course.students} students
                </div>
              </div>

              <Button className="w-full" variant={course.enrolled ? 'default' : 'outline'} asChild>
                <Link href={`/learning/courses/${course.id}`}>
                  {course.enrolled ? (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Continue
                    </>
                  ) : (
                    'Enroll Now'
                  )}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
