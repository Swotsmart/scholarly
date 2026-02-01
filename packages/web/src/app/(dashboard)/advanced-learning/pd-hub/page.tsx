'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
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
  Target,
  TrendingUp,
  Zap,
  ArrowRight,
  ExternalLink,
  Trophy,
  Medal,
  Route,
  Building2,
  Briefcase,
  ChevronRight,
} from 'lucide-react';

// Course library
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
    level: 'Intermediate',
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
    level: 'Advanced',
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
    level: 'Beginner',
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
    level: 'Intermediate',
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
    level: 'Beginner',
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
    level: 'Intermediate',
  },
];

// AITSL Standards mapping
const AITSL_STANDARDS = [
  {
    domain: 1,
    title: 'Know students and how they learn',
    descriptors: [
      { code: '1.1', name: 'Physical, social and intellectual development', hours: 15, required: 20 },
      { code: '1.2', name: 'Understand how students learn', hours: 12, required: 15 },
      { code: '1.3', name: 'Diverse backgrounds', hours: 25, required: 20 },
      { code: '1.4', name: 'Aboriginal and Torres Strait Islander', hours: 12, required: 15 },
      { code: '1.5', name: 'Differentiate teaching', hours: 10, required: 20 },
      { code: '1.6', name: 'Students with disability', hours: 8, required: 15 },
    ],
  },
  {
    domain: 2,
    title: 'Know the content and how to teach it',
    descriptors: [
      { code: '2.1', name: 'Content and teaching strategies', hours: 20, required: 25 },
      { code: '2.2', name: 'Content selection and organisation', hours: 18, required: 20 },
      { code: '2.3', name: 'Curriculum, assessment and reporting', hours: 14, required: 20 },
      { code: '2.4', name: 'Literacy and numeracy strategies', hours: 10, required: 15 },
      { code: '2.5', name: 'ICT', hours: 20, required: 20 },
      { code: '2.6', name: 'Information and Communication Technology', hours: 15, required: 15 },
    ],
  },
  {
    domain: 3,
    title: 'Plan for and implement effective teaching',
    descriptors: [
      { code: '3.1', name: 'Learning goals and content', hours: 12, required: 15 },
      { code: '3.2', name: 'Plan and structure learning', hours: 18, required: 20 },
      { code: '3.3', name: 'Teaching strategies', hours: 16, required: 20 },
      { code: '3.4', name: 'Select and use resources', hours: 20, required: 20 },
      { code: '3.5', name: 'ICT strategies', hours: 14, required: 15 },
      { code: '3.6', name: 'Evaluation and reflection', hours: 10, required: 15 },
      { code: '3.7', name: 'Parent/carer engagement', hours: 8, required: 10 },
    ],
  },
  {
    domain: 5,
    title: 'Assess, provide feedback and report',
    descriptors: [
      { code: '5.1', name: 'Assess student learning', hours: 16, required: 20 },
      { code: '5.2', name: 'Provide feedback', hours: 12, required: 15 },
      { code: '5.3', name: 'Make consistent judgements', hours: 8, required: 10 },
      { code: '5.4', name: 'Interpret student data', hours: 10, required: 15 },
      { code: '5.5', name: 'Report on student achievement', hours: 6, required: 10 },
    ],
  },
];

// Hours tracking
const ACCREDITATION_TRACKING = {
  currentCycle: {
    startDate: '2024-01-01',
    endDate: '2028-12-31',
    totalRequired: 100,
    totalCompleted: 72,
    elective: { required: 60, completed: 42 },
    mandatory: { required: 20, completed: 20 },
    teacherIdentified: { required: 20, completed: 10 },
  },
  recentActivity: [
    { date: '2025-03-15', course: 'Digital Pedagogy in Practice', hours: 4, type: 'elective' },
    { date: '2025-03-10', course: 'Inclusive Classroom Strategies', hours: 5, type: 'elective' },
    { date: '2025-03-05', course: 'Child Safety Fundamentals', hours: 2, type: 'mandatory' },
    { date: '2025-02-28', course: 'Cultural Responsiveness Training', hours: 6, type: 'teacher_identified' },
  ],
};

// Micro-credentials / badges
const CREDENTIALS = [
  {
    id: 'cred_001',
    name: 'Digital Learning Designer',
    issuer: 'AITSL',
    earnedDate: '2025-02-28',
    credentialId: 'DLD-2025-AU-48291',
    skills: ['LMS Administration', 'Digital Assessment', 'Blended Learning'],
    level: 'Gold',
    verificationUrl: 'https://credentials.aitsl.edu.au/verify/DLD-2025-AU-48291',
  },
  {
    id: 'cred_002',
    name: 'Inclusive Education Practitioner',
    issuer: 'Inclusive Education Victoria',
    earnedDate: '2024-11-15',
    credentialId: 'IEP-2024-VIC-33847',
    skills: ['UDL', 'Differentiation', 'NCCD Compliance'],
    level: 'Silver',
    verificationUrl: 'https://credentials.iev.edu.au/verify/IEP-2024-VIC-33847',
  },
  {
    id: 'cred_003',
    name: 'STEM Integration Specialist',
    issuer: 'STEM Education Research Centre',
    earnedDate: '2024-08-20',
    credentialId: 'SIS-2024-SERC-19274',
    skills: ['Engineering Design', 'Computational Thinking', 'Inquiry-Based Learning'],
    level: 'Bronze',
    verificationUrl: 'https://credentials.serc.edu.au/verify/SIS-2024-SERC-19274',
  },
  {
    id: 'cred_004',
    name: 'Assessment & Feedback Expert',
    issuer: 'ACER',
    earnedDate: '2024-06-10',
    credentialId: 'AFE-2024-ACER-22156',
    skills: ['Formative Assessment', 'Feedback Strategies', 'Moderation'],
    level: 'Silver',
    verificationUrl: 'https://credentials.acer.edu.au/verify/AFE-2024-ACER-22156',
  },
];

// Career pathways
const CAREER_PATHWAYS = [
  {
    id: 'path_001',
    title: 'Highly Accomplished Teacher',
    currentStage: 'Proficient',
    targetStage: 'Highly Accomplished',
    progress: 65,
    requirements: [
      { name: '100 PD hours in current cycle', completed: true },
      { name: 'Leadership evidence portfolio', completed: false },
      { name: 'External assessment application', completed: false },
      { name: 'Peer observation & feedback', completed: true },
      { name: 'Student outcome data', completed: true },
    ],
    timeline: '12-18 months',
    nextStep: 'Submit leadership evidence portfolio',
  },
  {
    id: 'path_002',
    title: 'Curriculum Coordinator',
    currentStage: 'Classroom Teacher',
    targetStage: 'Curriculum Coordinator',
    progress: 45,
    requirements: [
      { name: 'Graduate Certificate in Curriculum', completed: false },
      { name: 'Curriculum leadership experience', completed: true },
      { name: 'Data analysis certification', completed: true },
      { name: 'Peer mentoring experience', completed: false },
      { name: 'Whole-school planning involvement', completed: false },
    ],
    timeline: '2-3 years',
    nextStep: 'Enrol in Graduate Certificate program',
  },
  {
    id: 'path_003',
    title: 'Head of Department',
    currentStage: 'Senior Teacher',
    targetStage: 'Head of Department',
    progress: 30,
    requirements: [
      { name: 'Masters in Educational Leadership', completed: false },
      { name: 'Budget management experience', completed: false },
      { name: 'Staff supervision & mentoring', completed: true },
      { name: 'Strategic planning capability', completed: false },
      { name: 'School improvement involvement', completed: true },
    ],
    timeline: '3-5 years',
    nextStep: 'Apply for Masters program',
  },
];

const pageStats = [
  { label: 'Courses Enrolled', value: '5', icon: BookOpen, color: 'blue' },
  { label: 'Credit Hours', value: '72/100', icon: Clock, color: 'emerald' },
  { label: 'Credentials Earned', value: '4', icon: Award, color: 'violet' },
  { label: 'AITSL Domains', value: '4/7', icon: Shield, color: 'amber' },
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

function getLevelBadge(level: string) {
  switch (level) {
    case 'Gold':
      return <Badge className="bg-amber-500/10 text-amber-600"><Trophy className="h-3 w-3 mr-1" />Gold</Badge>;
    case 'Silver':
      return <Badge className="bg-slate-400/10 text-slate-600"><Medal className="h-3 w-3 mr-1" />Silver</Badge>;
    case 'Bronze':
      return <Badge className="bg-orange-500/10 text-orange-600"><Medal className="h-3 w-3 mr-1" />Bronze</Badge>;
    default:
      return <Badge variant="secondary">{level}</Badge>;
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

  const tracking = ACCREDITATION_TRACKING.currentCycle;

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
              AITSL-aligned courses, micro-credentials, and career pathways
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

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">
            <BookOpen className="mr-2 h-4 w-4" />
            Courses
          </TabsTrigger>
          <TabsTrigger value="aitsl">
            <Shield className="mr-2 h-4 w-4" />
            AITSL Mapping
          </TabsTrigger>
          <TabsTrigger value="hours">
            <Clock className="mr-2 h-4 w-4" />
            Hours
          </TabsTrigger>
          <TabsTrigger value="credentials">
            <Award className="mr-2 h-4 w-4" />
            Credentials
          </TabsTrigger>
          <TabsTrigger value="pathways">
            <Route className="mr-2 h-4 w-4" />
            Pathways
          </TabsTrigger>
        </TabsList>

        {/* Courses Tab */}
        <TabsContent value="courses" className="space-y-4">
          <div className="relative max-w-md">
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
                    <Badge className={`bg-${course.color}-500/10 text-${course.color}-600 hover:bg-${course.color}-500/20`}>
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
                      <span className="text-muted-foreground">Level</span>
                      <Badge variant="outline" className="text-xs">{course.level}</Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Rating</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                        <span className="font-medium">{course.rating}</span>
                        <span className="text-muted-foreground">({course.reviewCount})</span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-lg bg-muted/50 p-2">
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium">AITSL Standard:</span> {course.aitslDescription}
                    </p>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button className="w-full">
                    <GraduationCap className="h-4 w-4 mr-2" />
                    Enrol Now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* AITSL Mapping Tab */}
        <TabsContent value="aitsl" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-blue-500" />
                AITSL Standards Alignment
              </CardTitle>
              <CardDescription>
                Track your professional development against Australian Professional Standards for Teachers
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {AITSL_STANDARDS.map((standard) => {
                const totalHours = standard.descriptors.reduce((sum, d) => sum + d.hours, 0);
                const totalRequired = standard.descriptors.reduce((sum, d) => sum + d.required, 0);
                const percentage = Math.round((totalHours / totalRequired) * 100);

                return (
                  <div key={standard.domain} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Domain {standard.domain}
                        </Badge>
                        <h4 className="font-medium">{standard.title}</h4>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {totalHours}/{totalRequired} hours ({percentage}%)
                      </span>
                    </div>

                    <Progress value={percentage} className="h-2" />

                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {standard.descriptors.map((descriptor) => {
                        const descPercentage = Math.round((descriptor.hours / descriptor.required) * 100);
                        const isComplete = descriptor.hours >= descriptor.required;

                        return (
                          <div
                            key={descriptor.code}
                            className={`rounded-lg border p-3 ${isComplete ? 'bg-emerald-500/5 border-emerald-500/20' : ''}`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <Badge variant="outline" className="text-[10px] mb-1">
                                  {descriptor.code}
                                </Badge>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {descriptor.name}
                                </p>
                              </div>
                              {isComplete && (
                                <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                              )}
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium">{descriptor.hours}/{descriptor.required}h</span>
                              </div>
                              <Progress value={Math.min(descPercentage, 100)} className="h-1" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hours Tab */}
        <TabsContent value="hours" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-emerald-500" />
                Accreditation Hours Tracking
              </CardTitle>
              <CardDescription>
                Current accreditation cycle: {new Date(tracking.startDate).getFullYear()} - {new Date(tracking.endDate).getFullYear()}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Overall Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total PD Hours</span>
                  <span className="text-lg font-bold">
                    {tracking.totalCompleted}/{tracking.totalRequired} hours
                  </span>
                </div>
                <Progress
                  value={(tracking.totalCompleted / tracking.totalRequired) * 100}
                  className="h-4"
                />
                <p className="text-sm text-muted-foreground">
                  {tracking.totalRequired - tracking.totalCompleted} hours remaining to meet accreditation requirements
                </p>
              </div>

              {/* Category Breakdown */}
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Elective PD</span>
                    <Badge variant="outline">{tracking.elective.completed}/{tracking.elective.required}h</Badge>
                  </div>
                  <Progress
                    value={(tracking.elective.completed / tracking.elective.required) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Self-selected professional development activities
                  </p>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Mandatory</span>
                    <Badge className="bg-emerald-500/10 text-emerald-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      {tracking.mandatory.completed}/{tracking.mandatory.required}h
                    </Badge>
                  </div>
                  <Progress
                    value={(tracking.mandatory.completed / tracking.mandatory.required) * 100}
                    className="h-2"
                    indicatorClassName="bg-emerald-500"
                  />
                  <p className="text-xs text-muted-foreground">
                    Required compliance training (child safety, first aid)
                  </p>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm">Teacher Identified</span>
                    <Badge variant="outline">{tracking.teacherIdentified.completed}/{tracking.teacherIdentified.required}h</Badge>
                  </div>
                  <Progress
                    value={(tracking.teacherIdentified.completed / tracking.teacherIdentified.required) * 100}
                    className="h-2"
                  />
                  <p className="text-xs text-muted-foreground">
                    Based on your professional growth goals
                  </p>
                </div>
              </div>

              {/* Recent Activity */}
              <div>
                <h4 className="font-medium mb-3">Recent PD Activity</h4>
                <div className="space-y-2">
                  {ACCREDITATION_TRACKING.recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="rounded-lg bg-muted p-2">
                          <BookOpen className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{activity.course}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(activity.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="capitalize text-xs">
                          {activity.type.replace('_', ' ')}
                        </Badge>
                        <Badge className="bg-blue-500/10 text-blue-600">
                          +{activity.hours}h
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Credentials Tab */}
        <TabsContent value="credentials" className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Micro-Credential Gallery</h3>
            <Button variant="outline">
              <Search className="mr-2 h-4 w-4" />
              Browse Available Credentials
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {CREDENTIALS.map((credential) => (
              <Card key={credential.id} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-violet-500" />
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-blue-500/10 p-3">
                      <Award className="h-6 w-6 text-blue-500" />
                    </div>
                    {getLevelBadge(credential.level)}
                  </div>
                  <CardTitle className="text-lg mt-3">{credential.name}</CardTitle>
                  <CardDescription>{credential.issuer}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Credential ID</span>
                      <span className="font-mono text-xs">{credential.credentialId}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Earned</span>
                      <span className="font-medium">
                        {new Date(credential.earnedDate).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium mb-2">Skills Demonstrated</p>
                    <div className="flex flex-wrap gap-1.5">
                      {credential.skills.map((skill) => (
                        <Badge key={skill} variant="secondary" className="text-xs">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Download
                    </Button>
                    <Button variant="outline" className="flex-1" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Verify
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Pathways Tab */}
        <TabsContent value="pathways" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Route className="h-5 w-5 text-violet-500" />
                Career Progression Routes
              </CardTitle>
              <CardDescription>
                Explore pathways for professional advancement and plan your career growth
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {CAREER_PATHWAYS.map((pathway) => (
                <div key={pathway.id} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-lg">{pathway.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">{pathway.currentStage}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <Badge className="bg-violet-500/10 text-violet-600">{pathway.targetStage}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{pathway.progress}%</p>
                      <p className="text-xs text-muted-foreground">Complete</p>
                    </div>
                  </div>

                  <Progress value={pathway.progress} className="h-2" />

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-sm font-medium mb-2">Requirements</p>
                      <div className="space-y-1.5">
                        {pathway.requirements.map((req, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            {req.completed ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            ) : (
                              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 flex-shrink-0" />
                            )}
                            <span className={req.completed ? 'text-muted-foreground line-through' : ''}>
                              {req.name}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-lg bg-muted/50 p-3">
                        <p className="text-xs text-muted-foreground">Estimated Timeline</p>
                        <p className="text-sm font-medium mt-1">{pathway.timeline}</p>
                      </div>
                      <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                        <p className="text-xs text-blue-600 font-medium">Next Step</p>
                        <p className="text-sm mt-1">{pathway.nextStep}</p>
                      </div>
                    </div>
                  </div>

                  <Button variant="outline" className="w-full">
                    <Target className="mr-2 h-4 w-4" />
                    View Full Pathway Details
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
