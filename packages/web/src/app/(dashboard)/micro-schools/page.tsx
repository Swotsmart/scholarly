'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader, StatsCard } from '@/components/shared';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  MapPin,
  Users,
  ArrowRight,
  CheckCircle2,
  Clock,
  XCircle,
  GraduationCap,
  DollarSign,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  Calendar,
  FileText,
  BarChart3,
  Brain,
  Star,
  ChevronRight,
  UserPlus,
  ClipboardList,
  AlertTriangle,
  BookOpen,
  Building2,
  Sparkles,
  Target,
} from 'lucide-react';
import { microSchools, applications } from '@/lib/micro-schools-api';

// Application pipeline data
const applicationPipeline = {
  new: 12,
  documentsVerified: 8,
  interviewScheduled: 5,
  decisionPending: 3,
  accepted: 28,
  waitlisted: 15,
};

// Compliance framework status
const complianceStatus = [
  {
    id: 'eylf',
    framework: 'EYLF',
    label: 'Early Years Learning Framework',
    status: 'compliant',
    lastAudit: '15 Dec 2025',
    nextReview: '15 Jun 2026',
    coverage: 95,
  },
  {
    id: 'acara',
    framework: 'ACARA',
    label: 'Australian Curriculum',
    status: 'compliant',
    lastAudit: '20 Jan 2026',
    nextReview: '20 Jul 2026',
    coverage: 92,
  },
  {
    id: 'nqs',
    framework: 'NQS',
    label: 'National Quality Standard',
    status: 'exceeding',
    lastAudit: '10 Nov 2025',
    nextReview: '10 Nov 2026',
    coverage: 98,
  },
  {
    id: 'nesa',
    framework: 'NESA',
    label: 'NSW Education Standards',
    status: 'review_pending',
    lastAudit: '5 Aug 2025',
    nextReview: '5 Feb 2026',
    coverage: 88,
  },
];

// Staff data
const staffMembers = [
  {
    id: 's1',
    name: 'Dr. Sarah Chen',
    role: 'Principal & Lead Educator',
    specialization: 'Physics & Robotics',
    avatar: null,
    status: 'active',
    schedule: 'Mon-Fri, 8:30 AM - 4:30 PM',
    yearsExperience: 12,
  },
  {
    id: 's2',
    name: 'James Woolley',
    role: 'Senior Teacher',
    specialization: 'Mathematics & Data Science',
    avatar: null,
    status: 'active',
    schedule: 'Mon-Thu, 9:00 AM - 3:30 PM',
    yearsExperience: 8,
  },
  {
    id: 's3',
    name: 'Priya Mehta',
    role: 'Teacher',
    specialization: 'Environmental Science',
    avatar: null,
    status: 'on_leave',
    schedule: 'Tue-Fri, 9:00 AM - 3:00 PM',
    yearsExperience: 10,
  },
  {
    id: 's4',
    name: 'Tom Wilson',
    role: 'Teaching Assistant',
    specialization: 'Learning Support',
    avatar: null,
    status: 'active',
    schedule: 'Mon-Fri, 8:00 AM - 2:00 PM',
    yearsExperience: 4,
  },
];

// Financial data
const financialData = {
  revenue: {
    current: 425000,
    projected: 480000,
    change: 12.9,
  },
  expenses: {
    current: 385000,
    projected: 410000,
    change: 6.5,
  },
  enrollmentRevenue: 380000,
  grantRevenue: 45000,
  staffCosts: 280000,
  facilityCosts: 65000,
  materialsCosts: 40000,
};

// Curriculum coverage
const curriculumCoverage = [
  { subject: 'Mathematics', coverage: 94, target: 95, color: 'bg-blue-500' },
  { subject: 'English', coverage: 91, target: 90, color: 'bg-green-500' },
  { subject: 'Science', coverage: 88, target: 90, color: 'bg-purple-500' },
  { subject: 'HASS', coverage: 85, target: 85, color: 'bg-amber-500' },
  { subject: 'Technologies', coverage: 96, target: 90, color: 'bg-cyan-500' },
  { subject: 'Arts', coverage: 82, target: 85, color: 'bg-pink-500' },
];

// AI Health Score breakdown
const healthScoreBreakdown = {
  overall: 87,
  dimensions: [
    { name: 'Student Outcomes', score: 92, trend: 'up' },
    { name: 'Staff Wellbeing', score: 85, trend: 'stable' },
    { name: 'Financial Health', score: 88, trend: 'up' },
    { name: 'Compliance', score: 94, trend: 'stable' },
    { name: 'Parent Satisfaction', score: 89, trend: 'up' },
    { name: 'Curriculum Quality', score: 78, trend: 'down' },
  ],
};

const statusConfig: Record<string, { label: string; icon: React.ElementType; className: string }> = {
  accepting: { label: 'Accepting Applications', icon: CheckCircle2, className: 'bg-green-500/10 text-green-600' },
  waitlisted: { label: 'Waitlisted', icon: Clock, className: 'bg-amber-500/10 text-amber-600' },
  full: { label: 'Full', icon: XCircle, className: 'bg-red-500/10 text-red-600' },
};

const complianceStatusConfig: Record<string, { label: string; className: string }> = {
  compliant: { label: 'Compliant', className: 'bg-green-500/10 text-green-600' },
  exceeding: { label: 'Exceeding', className: 'bg-blue-500/10 text-blue-600' },
  review_pending: { label: 'Review Pending', className: 'bg-amber-500/10 text-amber-600' },
  non_compliant: { label: 'Non-Compliant', className: 'bg-red-500/10 text-red-600' },
};

export default function MicroSchoolsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [locationFilter, setLocationFilter] = useState('all');
  const [focusFilter, setFocusFilter] = useState('all');
  const [sizeFilter, setSizeFilter] = useState('all');

  const filteredSchools = microSchools.filter((school) => {
    const matchesSearch =
      searchQuery === '' ||
      school.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      school.description.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesLocation =
      locationFilter === 'all' ||
      school.location.toLowerCase() === locationFilter.toLowerCase();

    const matchesFocus =
      focusFilter === 'all' ||
      school.focusArea.toLowerCase() === focusFilter.toLowerCase();

    const matchesSize =
      sizeFilter === 'all' ||
      (sizeFilter === 'under20' && school.studentCount < 20) ||
      (sizeFilter === '20-50' && school.studentCount >= 20 && school.studentCount <= 50) ||
      (sizeFilter === '50plus' && school.studentCount > 50);

    return matchesSearch && matchesLocation && matchesFocus && matchesSize;
  });

  // Calculate totals
  const totalStudents = microSchools.reduce((sum, s) => sum + s.studentCount, 0);
  const totalTeachers = microSchools.reduce((sum, s) => sum + s.teacherCount, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Micro-School Dashboard"
        description="Manage your micro-school operations, enrollment, and compliance"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/micro-schools/applications">
                <ClipboardList className="mr-2 h-4 w-4" />
                Applications
              </Link>
            </Button>
            <Button asChild>
              <Link href="/micro-schools/new">
                <Building2 className="mr-2 h-4 w-4" />
                Register School
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Total Students"
          value={totalStudents}
          icon={Users}
          variant="primary"
          change={8}
        />
        <StatsCard
          label="Staff Members"
          value={totalTeachers}
          icon={GraduationCap}
          variant="success"
        />
        <StatsCard
          label="AI Health Score"
          value={`${healthScoreBreakdown.overall}/100`}
          icon={Brain}
          variant="primary"
          change={3}
        />
        <StatsCard
          label="Pending Applications"
          value={applicationPipeline.new}
          icon={UserPlus}
          variant="warning"
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:grid-cols-none lg:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="enrollment">Enrollment</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="staff">Staff</TabsTrigger>
          <TabsTrigger value="finances">Finances</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* AI Health Score */}
          <Card className="bg-gradient-to-r from-blue-500/5 via-blue-500/10 to-transparent">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-3">
                    <Brain className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <CardTitle>AI School Health Score</CardTitle>
                    <CardDescription>Comprehensive assessment of school performance</CardDescription>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold text-blue-600">{healthScoreBreakdown.overall}</p>
                  <p className="text-sm text-muted-foreground">out of 100</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {healthScoreBreakdown.dimensions.map((dim) => (
                  <div key={dim.name} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="font-medium text-sm">{dim.name}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        {dim.trend === 'up' && <TrendingUp className="h-3 w-3 text-green-500" />}
                        {dim.trend === 'down' && <TrendingDown className="h-3 w-3 text-red-500" />}
                        {dim.trend === 'stable' && <span className="text-xs text-muted-foreground">Stable</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Progress value={dim.score} className="w-16 h-2" />
                      <span className="font-semibold text-sm w-8">{dim.score}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm">
                  View Detailed Report
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* School Listings */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">My Micro-Schools</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/micro-schools/manage">
                  Manage All <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              {microSchools.slice(0, 2).map((school) => {
                const statusInfo = statusConfig[school.status];
                const StatusIcon = statusInfo.icon;
                return (
                  <Card key={school.id} className="flex flex-col">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle>{school.name}</CardTitle>
                          <CardDescription className="mt-1 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {school.location}, {school.state}
                          </CardDescription>
                        </div>
                        <Badge className={statusInfo.className}>
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {statusInfo.label}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="flex flex-1 flex-col justify-between space-y-4">
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {school.description}
                      </p>

                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-2xl font-bold">{school.studentCount}</p>
                          <p className="text-xs text-muted-foreground">Students</p>
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{school.teacherCount}</p>
                          <p className="text-xs text-muted-foreground">Teachers</p>
                        </div>
                        <div className="flex items-center justify-center gap-1">
                          <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                          <p className="text-2xl font-bold">{school.satisfaction}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {school.focusAreas.map((area) => (
                          <Badge key={area} variant="secondary">
                            {area}
                          </Badge>
                        ))}
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" className="flex-1" asChild>
                          <Link href={`/micro-schools/${school.id}`}>
                            View Details
                          </Link>
                        </Button>
                        <Button className="flex-1" asChild>
                          <Link href={`/micro-schools/${school.id}/dashboard`}>
                            Manage
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Quick Insights */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/10 p-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Enrollment Growth</p>
                    <p className="text-xl font-bold">+12%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <Star className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Avg Satisfaction</p>
                    <p className="text-xl font-bold">4.7/5.0</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-purple-500/10 p-2">
                    <ShieldCheck className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Compliance Rate</p>
                    <p className="text-xl font-bold">98%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Enrollment Tab */}
        <TabsContent value="enrollment" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Application Pipeline</CardTitle>
              <CardDescription>Track applications through each stage</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold text-blue-600">{applicationPipeline.new}</p>
                  <p className="text-sm text-muted-foreground">New</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold text-purple-600">{applicationPipeline.documentsVerified}</p>
                  <p className="text-sm text-muted-foreground">Docs Verified</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold text-cyan-600">{applicationPipeline.interviewScheduled}</p>
                  <p className="text-sm text-muted-foreground">Interview</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold text-amber-600">{applicationPipeline.decisionPending}</p>
                  <p className="text-sm text-muted-foreground">Decision</p>
                </div>
                <div className="rounded-lg border p-4 text-center bg-green-500/5">
                  <p className="text-3xl font-bold text-green-600">{applicationPipeline.accepted}</p>
                  <p className="text-sm text-muted-foreground">Accepted</p>
                </div>
                <div className="rounded-lg border p-4 text-center">
                  <p className="text-3xl font-bold text-gray-600">{applicationPipeline.waitlisted}</p>
                  <p className="text-sm text-muted-foreground">Waitlisted</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Applications</CardTitle>
                  <CardDescription>Applications requiring attention</CardDescription>
                </div>
                <Button asChild>
                  <Link href="/micro-schools/applications">
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {applications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between rounded-lg border p-4">
                    <div className="flex items-center gap-4">
                      <Avatar>
                        <AvatarFallback>{app.childName.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{app.childName}</p>
                        <p className="text-sm text-muted-foreground">{app.schoolName}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm">{app.appliedDate}</p>
                        {app.waitlistPosition && (
                          <p className="text-xs text-muted-foreground">
                            Position #{app.waitlistPosition}
                          </p>
                        )}
                      </div>
                      <Badge
                        className={
                          app.status === 'accepted'
                            ? 'bg-green-500/10 text-green-600'
                            : app.status === 'waitlisted'
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-blue-500/10 text-blue-600'
                        }
                      >
                        {app.status.replace('-', ' ')}
                      </Badge>
                      <Button variant="outline" size="sm">
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            {complianceStatus.map((item) => {
              const config = complianceStatusConfig[item.status];
              return (
                <Card key={item.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{item.framework}</CardTitle>
                        <CardDescription>{item.label}</CardDescription>
                      </div>
                      <Badge className={config.className}>{config.label}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Coverage</span>
                        <span className="font-medium">{item.coverage}%</span>
                      </div>
                      <Progress value={item.coverage} className="h-2" />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground">Last Audit</p>
                        <p className="font-medium">{item.lastAudit}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Next Review</p>
                        <p className="font-medium">{item.nextReview}</p>
                      </div>
                    </div>
                    <Button variant="outline" className="w-full" size="sm">
                      <FileText className="mr-2 h-4 w-4" />
                      View Report
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Upcoming Compliance Tasks
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between rounded-lg bg-amber-500/5 border border-amber-500/20 p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-amber-500" />
                  <div>
                    <p className="font-medium">NESA Review Due</p>
                    <p className="text-sm text-muted-foreground">Submit documentation by 5 Feb 2026</p>
                  </div>
                </div>
                <Button size="sm">Prepare Documents</Button>
              </div>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="font-medium">NQS Assessment</p>
                    <p className="text-sm text-muted-foreground">Scheduled for 10 Nov 2026</p>
                  </div>
                </div>
                <Badge variant="secondary">Scheduled</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Tab */}
        <TabsContent value="staff" className="mt-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Staff Directory</h2>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Staff Member
            </Button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {staffMembers.map((staff) => (
              <Card key={staff.id}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={staff.avatar || undefined} />
                      <AvatarFallback className="text-lg">
                        {staff.name.split(' ').map((n) => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{staff.name}</h4>
                        <Badge
                          className={
                            staff.status === 'active'
                              ? 'bg-green-500/10 text-green-600'
                              : 'bg-amber-500/10 text-amber-600'
                          }
                        >
                          {staff.status === 'active' ? 'Active' : 'On Leave'}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{staff.role}</p>
                      <p className="text-sm text-muted-foreground">{staff.specialization}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {staff.schedule}
                        </span>
                        <span>{staff.yearsExperience} years exp.</span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      View Profile
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Finances Tab */}
        <TabsContent value="finances" className="mt-6 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              label="Annual Revenue"
              value={`$${(financialData.revenue.current / 1000).toFixed(0)}k`}
              icon={DollarSign}
              variant="success"
              change={financialData.revenue.change}
            />
            <StatsCard
              label="Annual Expenses"
              value={`$${(financialData.expenses.current / 1000).toFixed(0)}k`}
              icon={TrendingDown}
              variant="warning"
              change={-financialData.expenses.change}
            />
            <StatsCard
              label="Net Position"
              value={`$${((financialData.revenue.current - financialData.expenses.current) / 1000).toFixed(0)}k`}
              icon={BarChart3}
              variant="primary"
            />
            <StatsCard
              label="Projected Revenue"
              value={`$${(financialData.revenue.projected / 1000).toFixed(0)}k`}
              icon={Target}
              variant="primary"
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Enrollment Fees</span>
                    <span className="font-medium">${(financialData.enrollmentRevenue / 1000).toFixed(0)}k</span>
                  </div>
                  <Progress value={(financialData.enrollmentRevenue / financialData.revenue.current) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Grants & Funding</span>
                    <span className="font-medium">${(financialData.grantRevenue / 1000).toFixed(0)}k</span>
                  </div>
                  <Progress value={(financialData.grantRevenue / financialData.revenue.current) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Staff Costs</span>
                    <span className="font-medium">${(financialData.staffCosts / 1000).toFixed(0)}k</span>
                  </div>
                  <Progress value={(financialData.staffCosts / financialData.expenses.current) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Facility Costs</span>
                    <span className="font-medium">${(financialData.facilityCosts / 1000).toFixed(0)}k</span>
                  </div>
                  <Progress value={(financialData.facilityCosts / financialData.expenses.current) * 100} className="h-2" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Materials & Resources</span>
                    <span className="font-medium">${(financialData.materialsCosts / 1000).toFixed(0)}k</span>
                  </div>
                  <Progress value={(financialData.materialsCosts / financialData.expenses.current) * 100} className="h-2" />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Curriculum Coverage</CardTitle>
                  <CardDescription>ACARA standards coverage across all subjects</CardDescription>
                </div>
                <Button variant="outline">
                  <FileText className="mr-2 h-4 w-4" />
                  Generate Report
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {curriculumCoverage.map((subject) => (
                  <div key={subject.subject} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{subject.subject}</h4>
                      <Badge
                        className={
                          subject.coverage >= subject.target
                            ? 'bg-green-500/10 text-green-600'
                            : 'bg-amber-500/10 text-amber-600'
                        }
                      >
                        {subject.coverage >= subject.target ? 'On Target' : 'Below Target'}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Coverage</span>
                        <span className="font-medium">{subject.coverage}%</span>
                      </div>
                      <div className="relative h-3 rounded-full bg-muted">
                        <div
                          className={`absolute h-3 rounded-full ${subject.color}`}
                          style={{ width: `${subject.coverage}%` }}
                        />
                        <div
                          className="absolute h-3 w-0.5 bg-foreground/50"
                          style={{ left: `${subject.target}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground text-right">
                        Target: {subject.target}%
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-purple-500" />
                AI Curriculum Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-lg bg-purple-500/5 border border-purple-500/20 p-4">
                <h4 className="font-medium">Arts coverage needs attention</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Consider adding more Drama and Media Arts activities to meet the 85% target.
                </p>
              </div>
              <div className="rounded-lg border p-4">
                <h4 className="font-medium">Technologies exceeding expectations</h4>
                <p className="text-sm text-muted-foreground mt-1">
                  Strong performance in Digital Technologies. Consider cross-curricular integration.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Browse Schools Section (outside tabs for discoverability) */}
      {activeTab === 'overview' && (
        <Card className="mt-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Discover Micro-Schools</CardTitle>
                <CardDescription>Browse and explore other micro-schools in your area</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search and Filters */}
            <div className="flex flex-col gap-4 mb-6 lg:flex-row">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search micro-schools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Select value={locationFilter} onValueChange={setLocationFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Locations</SelectItem>
                    <SelectItem value="sydney">Sydney</SelectItem>
                    <SelectItem value="melbourne">Melbourne</SelectItem>
                    <SelectItem value="brisbane">Brisbane</SelectItem>
                    <SelectItem value="perth">Perth</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={focusFilter} onValueChange={setFocusFilter}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Focus Area" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Focus Areas</SelectItem>
                    <SelectItem value="stem">STEM</SelectItem>
                    <SelectItem value="arts">Arts</SelectItem>
                    <SelectItem value="montessori">Montessori</SelectItem>
                    <SelectItem value="outdoor">Outdoor</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={sizeFilter} onValueChange={setSizeFilter}>
                  <SelectTrigger className="w-[130px]">
                    <SelectValue placeholder="Size" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Sizes</SelectItem>
                    <SelectItem value="under20">&lt; 20</SelectItem>
                    <SelectItem value="20-50">20 - 50</SelectItem>
                    <SelectItem value="50plus">50+</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* School Grid */}
            <div className="grid gap-4 md:grid-cols-2">
              {filteredSchools.slice(0, 4).map((school) => {
                const statusInfo = statusConfig[school.status];
                const StatusIcon = statusInfo.icon;
                return (
                  <div key={school.id} className="flex items-center gap-4 rounded-lg border p-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{school.name}</h4>
                        <Badge className={statusInfo.className} variant="outline">
                          <StatusIcon className="mr-1 h-3 w-3" />
                          {school.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3" />
                        {school.location}, {school.state}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {school.studentCount} students
                        </span>
                        <span className="flex items-center gap-1">
                          <Star className="h-3 w-3" />
                          {school.satisfaction}
                        </span>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link href={`/micro-schools/${school.id}`}>
                        View
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                );
              })}
            </div>

            {filteredSchools.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Search className="h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">No schools found</h3>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your search or filter criteria
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
