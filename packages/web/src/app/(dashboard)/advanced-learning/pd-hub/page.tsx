'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  GraduationCap,
  ArrowLeft,
  Clock,
  Star,
  Award,
  BookOpen,
  Download,
  Search,
  Users,
  Monitor,
  MapPin,
  Layers,
  CheckCircle2,
  PlayCircle,
  FileText,
  Shield,
  CalendarDays,
} from 'lucide-react';

const MOCK_COURSES = [
  {
    id: 'course_001',
    title: 'Digital Pedagogy in Practice',
    provider: 'Australian Institute of Teaching',
    duration: '20 hours',
    format: 'Online',
    aitslDomain: 'AITSL 3.4',
    aitslDescription: 'Select and use resources',
    creditHours: 20,
    rating: 4.8,
    reviewCount: 142,
    enrolled: 856,
    description: 'Master the integration of digital tools into everyday teaching practice. Covers learning management systems, interactive whiteboards, student response systems, and AI-assisted learning platforms aligned with Australian curriculum frameworks.',
    modules: 8,
    color: 'blue',
  },
  {
    id: 'course_002',
    title: 'Data-Driven Differentiation',
    provider: 'Education Services Australia',
    duration: '15 hours',
    format: 'Blended',
    aitslDomain: 'AITSL 1.5',
    aitslDescription: 'Differentiate teaching',
    creditHours: 15,
    rating: 4.6,
    reviewCount: 98,
    enrolled: 634,
    description: 'Learn to use student data and learning analytics to differentiate instruction effectively. Explore formative assessment strategies, learning progressions, and adaptive teaching approaches using NAPLAN and school-based data.',
    modules: 6,
    color: 'emerald',
  },
  {
    id: 'course_003',
    title: 'Inclusive Classroom Strategies',
    provider: 'Inclusive Education Victoria',
    duration: '25 hours',
    format: 'Online',
    aitslDomain: 'AITSL 1.3',
    aitslDescription: 'Students with diverse linguistic, cultural, religious and socioeconomic backgrounds',
    creditHours: 25,
    rating: 4.9,
    reviewCount: 215,
    enrolled: 1203,
    description: 'Develop practical strategies for creating inclusive classrooms that support students with diverse needs. Covers Universal Design for Learning, culturally responsive pedagogy, trauma-informed practices, and NCCD compliance.',
    modules: 10,
    color: 'violet',
  },
  {
    id: 'course_004',
    title: 'STEM Integration Framework',
    provider: 'STEM Education Research Centre',
    duration: '18 hours',
    format: 'Blended',
    aitslDomain: 'AITSL 2.2',
    aitslDescription: 'Content selection and organisation',
    creditHours: 18,
    rating: 4.5,
    reviewCount: 76,
    enrolled: 489,
    description: 'Design and implement integrated STEM learning experiences aligned with the Australian Curriculum. Explore engineering design processes, computational thinking, mathematical modelling, and inquiry-based science across year levels.',
    modules: 7,
    color: 'amber',
  },
  {
    id: 'course_005',
    title: 'Cultural Responsiveness Training',
    provider: 'Reconciliation Australia',
    duration: '12 hours',
    format: 'In-person',
    aitslDomain: 'AITSL 1.4',
    aitslDescription: 'Strategies for teaching Aboriginal and Torres Strait Islander students',
    creditHours: 12,
    rating: 4.9,
    reviewCount: 187,
    enrolled: 945,
    description: 'Deepen your understanding of Aboriginal and Torres Strait Islander histories, cultures, and perspectives. Build capacity to embed Indigenous knowledges across curriculum areas and create culturally safe learning environments.',
    modules: 5,
    color: 'rose',
  },
  {
    id: 'course_006',
    title: 'Assessment for Learning',
    provider: 'ACER',
    duration: '16 hours',
    format: 'Online',
    aitslDomain: 'AITSL 5.1',
    aitslDescription: 'Assess student learning',
    creditHours: 16,
    rating: 4.7,
    reviewCount: 134,
    enrolled: 712,
    description: 'Transform your assessment practices with evidence-based approaches to formative and summative assessment. Master learning intentions, success criteria, effective feedback, and moderation processes aligned with ACARA standards.',
    modules: 6,
    color: 'teal',
  },
];

const MOCK_ENROLLMENTS = [
  {
    id: 'enr_001',
    courseTitle: 'Digital Pedagogy in Practice',
    provider: 'Australian Institute of Teaching',
    progress: 62,
    modulesCompleted: 5,
    totalModules: 8,
    nextModule: 'Module 6: AI-Assisted Assessment Tools',
    enrolledDate: '2025-01-15',
    creditHours: 20,
    estimatedCompletion: '2025-04-01',
    lastAccessed: '2 hours ago',
  },
  {
    id: 'enr_002',
    courseTitle: 'Inclusive Classroom Strategies',
    provider: 'Inclusive Education Victoria',
    progress: 40,
    modulesCompleted: 4,
    totalModules: 10,
    nextModule: 'Module 5: Trauma-Informed Classroom Practices',
    enrolledDate: '2025-02-01',
    creditHours: 25,
    estimatedCompletion: '2025-05-15',
    lastAccessed: '1 day ago',
  },
  {
    id: 'enr_003',
    courseTitle: 'STEM Integration Framework',
    provider: 'STEM Education Research Centre',
    progress: 85,
    modulesCompleted: 6,
    totalModules: 7,
    nextModule: 'Module 7: Capstone STEM Unit Design',
    enrolledDate: '2024-11-20',
    creditHours: 18,
    estimatedCompletion: '2025-03-20',
    lastAccessed: '3 days ago',
  },
  {
    id: 'enr_004',
    courseTitle: 'Data-Driven Differentiation',
    provider: 'Education Services Australia',
    progress: 17,
    modulesCompleted: 1,
    totalModules: 6,
    nextModule: 'Module 2: Learning Analytics Fundamentals',
    enrolledDate: '2025-03-01',
    creditHours: 15,
    estimatedCompletion: '2025-06-15',
    lastAccessed: '5 days ago',
  },
  {
    id: 'enr_005',
    courseTitle: 'Assessment for Learning',
    provider: 'ACER',
    progress: 33,
    modulesCompleted: 2,
    totalModules: 6,
    nextModule: 'Module 3: Success Criteria and Learning Intentions',
    enrolledDate: '2025-02-10',
    creditHours: 16,
    estimatedCompletion: '2025-05-30',
    lastAccessed: '1 week ago',
  },
];

const MOCK_CERTIFICATES = [
  {
    id: 'cert_001',
    courseTitle: 'Cultural Responsiveness Training',
    provider: 'Reconciliation Australia',
    issuedDate: '2025-02-28',
    credentialId: 'CRT-2025-AU-48291',
    creditHours: 12,
    aitslDomain: 'AITSL 1.4',
    expiryDate: '2028-02-28',
  },
  {
    id: 'cert_002',
    courseTitle: 'Foundations of Inquiry-Based Learning',
    provider: 'University of Melbourne',
    issuedDate: '2024-11-15',
    credentialId: 'FIBL-2024-UM-33847',
    creditHours: 10,
    aitslDomain: 'AITSL 3.3',
    expiryDate: '2027-11-15',
  },
  {
    id: 'cert_003',
    courseTitle: 'Classroom Management for Early Career Teachers',
    provider: 'NSW Department of Education',
    issuedDate: '2024-08-20',
    credentialId: 'CMECT-2024-NSW-19274',
    creditHours: 8,
    aitslDomain: 'AITSL 4.3',
    expiryDate: '2027-08-20',
  },
];

const pageStats = [
  { label: 'Courses Enrolled', value: '5', icon: BookOpen, color: 'blue' },
  { label: 'Credit Hours Earned', value: '42', icon: Clock, color: 'emerald' },
  { label: 'Certificates Issued', value: '3', icon: Award, color: 'violet' },
  { label: 'AITSL Domains Covered', value: '5', icon: Shield, color: 'amber' },
];

function getFormatBadge(format: string) {
  switch (format) {
    case 'Online':
      return <Badge variant="outline" className="gap-1"><Monitor className="h-3 w-3" />Online</Badge>;
    case 'Blended':
      return <Badge variant="outline" className="gap-1"><Layers className="h-3 w-3" />Blended</Badge>;
    case 'In-person':
      return <Badge variant="outline" className="gap-1"><MapPin className="h-3 w-3" />In-person</Badge>;
    default:
      return <Badge variant="outline">{format}</Badge>;
  }
}

export default function PDHubPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = MOCK_COURSES.filter(
    (course) =>
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.provider.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.aitslDomain.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/advanced-learning">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="heading-2">Professional Development Hub</h1>
            <p className="text-muted-foreground">
              AITSL-aligned courses, micro-credentials, and professional learning for educators
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-sm">
          <Shield className="mr-1 h-3 w-3" />
          AITSL Aligned
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {pageStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                  <Icon className={`h-6 w-6 text-${stat.color}-500`} />
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

      <Tabs defaultValue="browse">
        <TabsList>
          <TabsTrigger value="browse">Browse Courses</TabsTrigger>
          <TabsTrigger value="enrollments">My Enrollments</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        {/* Browse Courses */}
        <TabsContent value="browse" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search courses, providers, AITSL standards..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredCourses.map((course) => (
              <Card key={course.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <Badge className={`bg-${course.color}-500/10 text-${course.color}-500 hover:bg-${course.color}-500/20`}>
                      {course.aitslDomain}
                    </Badge>
                    {getFormatBadge(course.format)}
                  </div>
                  <CardTitle className="text-lg mt-3">{course.title}</CardTitle>
                  <CardDescription>{course.provider}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">{course.description}</p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Duration</span>
                      <span className="font-medium">{course.duration}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Credit Hours</span>
                      <span className="font-medium">{course.creditHours}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Modules</span>
                      <span className="font-medium">{course.modules}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rating</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-medium">{course.rating}</span>
                        <span className="text-muted-foreground">({course.reviewCount})</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Enrolled</span>
                      <div className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="font-medium">{course.enrolled.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">AITSL Standard:</span> {course.aitslDescription}
                    </p>
                  </div>

                  <Button className="w-full">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Enrol Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* My Enrollments */}
        <TabsContent value="enrollments" className="space-y-4">
          {MOCK_ENROLLMENTS.map((enrollment) => (
            <Card key={enrollment.id}>
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row md:items-start gap-6">
                  <div className="flex-1 space-y-4">
                    <div>
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{enrollment.courseTitle}</h3>
                          <p className="text-sm text-muted-foreground">{enrollment.provider}</p>
                        </div>
                        <Badge className={enrollment.progress >= 80 ? 'bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20' : 'bg-blue-500/10 text-blue-500 hover:bg-blue-500/20'}>
                          {enrollment.progress >= 80 ? 'Nearly Complete' : 'In Progress'}
                        </Badge>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Overall Progress</span>
                        <span className="font-medium">{enrollment.progress}%</span>
                      </div>
                      <Progress value={enrollment.progress} className="h-2" />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <p className="text-xs text-muted-foreground">Modules</p>
                        <p className="text-sm font-medium">{enrollment.modulesCompleted}/{enrollment.totalModules}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <p className="text-xs text-muted-foreground">Credit Hours</p>
                        <p className="text-sm font-medium">{enrollment.creditHours}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <p className="text-xs text-muted-foreground">Est. Completion</p>
                        <p className="text-sm font-medium">
                          {new Date(enrollment.estimatedCompletion).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-2.5">
                        <p className="text-xs text-muted-foreground">Last Accessed</p>
                        <p className="text-sm font-medium">{enrollment.lastAccessed}</p>
                      </div>
                    </div>

                    <div className="rounded-lg border p-3 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlayCircle className="h-4 w-4 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">Next Up</p>
                          <p className="text-xs text-muted-foreground">{enrollment.nextModule}</p>
                        </div>
                      </div>
                      <Button size="sm">
                        Continue
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Certificates */}
        <TabsContent value="certificates" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MOCK_CERTIFICATES.map((cert) => (
              <Card key={cert.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-blue-500" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-emerald-500/10 p-3">
                      <Award className="h-6 w-6 text-emerald-500" />
                    </div>
                    <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Verified
                    </Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{cert.courseTitle}</CardTitle>
                  <CardDescription>{cert.provider}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Credential ID</span>
                      <span className="font-mono text-xs">{cert.credentialId}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Issued</span>
                      <span className="font-medium">
                        {new Date(cert.issuedDate).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Valid Until</span>
                      <span className="font-medium">
                        {new Date(cert.expiryDate).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Credit Hours</span>
                      <span className="font-medium">{cert.creditHours}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">AITSL Domain</span>
                      <Badge variant="outline" className="text-xs">{cert.aitslDomain}</Badge>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <FileText className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
