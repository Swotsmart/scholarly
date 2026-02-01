'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader, StatsCard } from '@/components/shared';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Users,
  BookOpen,
  Clock,
  Bookmark,
  ArrowRight,
  CalendarDays,
  ClipboardList,
  Library,
  TrendingUp,
  ShieldCheck,
  FileText,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  MapPin,
  Heart,
  MessageCircle,
  Calendar,
  GraduationCap,
  Video,
  FileSpreadsheet,
  Gamepad2,
  ChevronRight,
  Sparkles,
  Bell,
} from 'lucide-react';
import { children, weeklySchedule, subjects, resources } from '@/lib/homeschool-api';

// Compliance data
const complianceItems = [
  {
    id: 'comp_1',
    label: 'Registration Status',
    status: 'active',
    dueDate: null,
    icon: ShieldCheck,
  },
  {
    id: 'comp_2',
    label: 'Annual Learning Plan',
    status: 'submitted',
    dueDate: null,
    icon: FileText,
  },
  {
    id: 'comp_3',
    label: 'Progress Report',
    status: 'due_soon',
    dueDate: '15 Feb 2026',
    icon: ClipboardList,
  },
  {
    id: 'comp_4',
    label: 'Curriculum Review',
    status: 'upcoming',
    dueDate: '30 Jun 2026',
    icon: BookOpen,
  },
];

// Community data
const communityInvitations = [
  {
    id: 'inv_1',
    familyName: 'The Thompson Family',
    location: 'North Sydney',
    philosophy: 'Charlotte Mason',
    childrenAges: [8, 11],
    message: 'Would love to connect for nature study group!',
    avatar: 'TF',
  },
  {
    id: 'inv_2',
    familyName: 'Chen Homeschool',
    location: 'Chatswood',
    philosophy: 'Classical',
    childrenAges: [10, 13],
    message: 'Looking for co-op partners for science experiments.',
    avatar: 'CH',
  },
];

const localFamilies = [
  {
    id: 'fam_1',
    name: 'The Nguyen Family',
    location: 'Willoughby',
    childrenCount: 3,
    philosophy: 'Eclectic',
    interests: ['STEM', 'Music', 'Sports'],
  },
  {
    id: 'fam_2',
    name: 'Wilson Homeschool',
    location: 'Lane Cove',
    childrenCount: 2,
    philosophy: 'Montessori',
    interests: ['Arts', 'Nature', 'Languages'],
  },
  {
    id: 'fam_3',
    name: 'The Garcia Family',
    location: 'Neutral Bay',
    childrenCount: 4,
    philosophy: 'Unschooling',
    interests: ['Project-Based', 'Outdoor', 'Coding'],
  },
];

// Resource type icons
const resourceTypeIcons: Record<string, React.ElementType> = {
  Video: Video,
  Worksheet: FileSpreadsheet,
  Interactive: Sparkles,
  Game: Gamepad2,
  Textbook: BookOpen,
};

const statusStyles: Record<string, { bg: string; text: string; label: string }> = {
  active: { bg: 'bg-green-500/10', text: 'text-green-600', label: 'Active' },
  submitted: { bg: 'bg-blue-500/10', text: 'text-blue-600', label: 'Submitted' },
  due_soon: { bg: 'bg-amber-500/10', text: 'text-amber-600', label: 'Due Soon' },
  upcoming: { bg: 'bg-gray-500/10', text: 'text-gray-600', label: 'Upcoming' },
};

export default function HomeschoolPage() {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate stats
  const totalSubjects = subjects.length;
  const totalWeeklyHours = subjects.reduce((sum, s) => sum + s.hoursPerWeek, 0);
  const bookmarkedResources = resources.filter((r) => r.bookmarked).length;
  const avgCoverage = Math.round(
    subjects.reduce((sum, s) => sum + s.standardsCoverage, 0) / subjects.length
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Homeschool Family Dashboard"
        description="Manage your family's learning journey"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/homeschool/co-op">
                <Users className="mr-2 h-4 w-4" />
                Find Co-ops
              </Link>
            </Button>
            <Button asChild>
              <Link href="/homeschool/curriculum">
                <CalendarDays className="mr-2 h-4 w-4" />
                Curriculum Planner
              </Link>
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Children Enrolled"
          value={children.length}
          icon={Users}
          variant="primary"
        />
        <StatsCard
          label="Subjects Active"
          value={totalSubjects}
          icon={BookOpen}
          variant="success"
        />
        <StatsCard
          label="Weekly Hours"
          value={totalWeeklyHours}
          icon={Clock}
          variant="warning"
          subtitle="Across all children"
        />
        <StatsCard
          label="ACARA Coverage"
          value={`${avgCoverage}%`}
          icon={ShieldCheck}
          variant="primary"
          change={5}
        />
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:grid-cols-none lg:inline-flex">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="curriculum">Curriculum</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="mt-6 space-y-6">
          {/* Children Cards */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your Children</h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/homeschool/children">
                  Manage <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-6 md:grid-cols-2">
              {children.map((child) => (
                <Card key={child.id} className="overflow-hidden">
                  <CardHeader className="border-b bg-muted/30 pb-4">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-3xl">
                        {child.avatar}
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">{child.name}</CardTitle>
                        <CardDescription className="flex items-center gap-2">
                          <GraduationCap className="h-3.5 w-3.5" />
                          Age {child.age} - Year {child.yearLevel}
                        </CardDescription>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {child.subjects.length} subjects
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-4">
                    <div className="flex flex-wrap gap-2">
                      {child.subjects.slice(0, 4).map((subject) => (
                        <Badge key={subject} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                      {child.subjects.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{child.subjects.length - 4} more
                        </Badge>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Overall Progress</span>
                        <span className="font-medium">{child.overallProgress}%</span>
                      </div>
                      <Progress value={child.overallProgress} className="h-2" />
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1" asChild>
                        <Link href={`/homeschool/children/${child.id}`}>View Profile</Link>
                      </Button>
                      <Button size="sm" className="flex-1" asChild>
                        <Link href={`/homeschool/children/${child.id}/progress`}>
                          Track Progress
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div>
            <h2 className="mb-4 text-lg font-semibold">Quick Actions</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <Link href="/homeschool/curriculum">
                <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="rounded-lg bg-blue-500/10 p-3">
                      <ClipboardList className="h-6 w-6 text-blue-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Plan Curriculum</h3>
                      <p className="text-sm text-muted-foreground">
                        Design and manage learning plans
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/homeschool/resources">
                <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="rounded-lg bg-green-500/10 p-3">
                      <Library className="h-6 w-6 text-green-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Browse Resources</h3>
                      <p className="text-sm text-muted-foreground">
                        Find worksheets, videos, and more
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>

              <Link href="/homeschool/progress">
                <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                  <CardContent className="flex items-center gap-4 p-6">
                    <div className="rounded-lg bg-purple-500/10 p-3">
                      <TrendingUp className="h-6 w-6 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">Record Progress</h3>
                      <p className="text-sm text-muted-foreground">
                        Track achievements and milestones
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            </div>
          </div>

          {/* Resources Library Preview */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Saved Resources
                <Badge variant="secondary" className="ml-2">{bookmarkedResources}</Badge>
              </h2>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/homeschool/resources">
                  View All <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {resources.filter(r => r.bookmarked).slice(0, 3).map((resource) => {
                const TypeIcon = resourceTypeIcons[resource.type] || BookOpen;
                return (
                  <Card key={resource.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-lg bg-primary/10 p-2">
                          <TypeIcon className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">{resource.title}</h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {resource.subject} - {resource.yearLevel}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="outline" className="text-xs">
                              {resource.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {resource.provider}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon-sm">
                          <Bookmark className="h-4 w-4 fill-primary text-primary" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </TabsContent>

        {/* Schedule Tab */}
        <TabsContent value="schedule" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Family Learning Calendar</CardTitle>
                  <CardDescription>Weekly schedule for all children</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <Calendar className="mr-2 h-4 w-4" />
                    Full Calendar
                  </Button>
                  <Button size="sm">
                    Edit Schedule
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="pb-3 pr-4 text-left font-semibold text-muted-foreground w-20">
                        Time
                      </th>
                      {weeklySchedule.map((day) => (
                        <th
                          key={day.day}
                          className="pb-3 text-left font-semibold text-muted-foreground min-w-[120px]"
                        >
                          {day.day}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="py-4 pr-4 text-muted-foreground">9:00 AM</td>
                      {weeklySchedule.map((day) => (
                        <td key={day.day} className="py-4 pr-4">
                          {day.subjects[0] && (
                            <div className="rounded-lg bg-blue-500/10 p-2">
                              <p className="font-medium text-blue-700 dark:text-blue-400">
                                {day.subjects[0]}
                              </p>
                              <p className="text-xs text-muted-foreground">Both children</p>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-4 pr-4 text-muted-foreground">10:30 AM</td>
                      {weeklySchedule.map((day) => (
                        <td key={day.day} className="py-4 pr-4">
                          {day.subjects[1] && (
                            <div className="rounded-lg bg-green-500/10 p-2">
                              <p className="font-medium text-green-700 dark:text-green-400">
                                {day.subjects[1]}
                              </p>
                              <p className="text-xs text-muted-foreground">Both children</p>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="py-4 pr-4 text-muted-foreground">1:00 PM</td>
                      {weeklySchedule.map((day) => (
                        <td key={day.day} className="py-4 pr-4">
                          {day.subjects[2] && (
                            <div className="rounded-lg bg-purple-500/10 p-2">
                              <p className="font-medium text-purple-700 dark:text-purple-400">
                                {day.subjects[2]}
                              </p>
                              <p className="text-xs text-muted-foreground">Both children</p>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-4 pr-4 text-muted-foreground">2:30 PM</td>
                      {weeklySchedule.map((day) => (
                        <td key={day.day} className="py-4 pr-4">
                          {day.subjects[3] && (
                            <div className="rounded-lg bg-amber-500/10 p-2">
                              <p className="font-medium text-amber-700 dark:text-amber-400">
                                {day.subjects[3]}
                              </p>
                              <p className="text-xs text-muted-foreground">Both children</p>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Upcoming Events */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Upcoming Events</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="rounded-lg bg-blue-500/10 p-2">
                  <Users className="h-4 w-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Co-op Science Day</p>
                  <p className="text-xs text-muted-foreground">Tomorrow, 10:00 AM</p>
                </div>
                <Badge variant="secondary">Co-op</Badge>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="rounded-lg bg-green-500/10 p-2">
                  <BookOpen className="h-4 w-4 text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Library Visit</p>
                  <p className="text-xs text-muted-foreground">Friday, 2:00 PM</p>
                </div>
                <Badge variant="secondary">Excursion</Badge>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="rounded-lg bg-purple-500/10 p-2">
                  <FileText className="h-4 w-4 text-purple-500" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-sm">Progress Report Due</p>
                  <p className="text-xs text-muted-foreground">15 Feb 2026</p>
                </div>
                <Badge variant="outline" className="border-amber-500 text-amber-600">Due Soon</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Curriculum Tab */}
        <TabsContent value="curriculum" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>ACARA Standards Coverage</CardTitle>
                  <CardDescription>Track your curriculum alignment across all subjects</CardDescription>
                </div>
                <Button asChild>
                  <Link href="/homeschool/curriculum">
                    Open Curriculum Planner
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-6 rounded-lg bg-primary/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-5 w-5 text-primary" />
                    <span className="font-semibold">Overall Coverage</span>
                  </div>
                  <span className="text-2xl font-bold">{avgCoverage}%</span>
                </div>
                <Progress value={avgCoverage} className="h-3" />
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {subjects.map((subject) => (
                  <div key={subject.id} className="rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-semibold">{subject.name}</h4>
                      <Badge variant="outline" className="text-xs">
                        {subject.acaraAlignment.split(' - ')[1]}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Standards Coverage</span>
                        <span className="font-medium">{subject.standardsCoverage}%</span>
                      </div>
                      <Progress value={subject.standardsCoverage} className="h-2" />
                    </div>
                    <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{subject.units.length} units</span>
                      <span>{subject.hoursPerWeek} hrs/week</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="mt-6 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Registration & Compliance</CardTitle>
                  <CardDescription>Track your homeschool registration status and document deadlines</CardDescription>
                </div>
                <Badge className="bg-green-500/10 text-green-600">
                  <CheckCircle2 className="mr-1 h-3 w-3" />
                  Registered
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {complianceItems.map((item) => {
                const Icon = item.icon;
                const style = statusStyles[item.status];
                return (
                  <div
                    key={item.id}
                    className="flex items-center gap-4 rounded-lg border p-4"
                  >
                    <div className={`rounded-lg p-3 ${style.bg}`}>
                      <Icon className={`h-5 w-5 ${style.text}`} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      {item.dueDate && (
                        <p className="text-sm text-muted-foreground">
                          Due: {item.dueDate}
                        </p>
                      )}
                    </div>
                    <Badge className={`${style.bg} ${style.text}`}>
                      {style.label}
                    </Badge>
                    {item.status === 'due_soon' && (
                      <Button size="sm">
                        Submit Now
                      </Button>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Compliance Reminders
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-amber-500/5 border border-amber-500/20 p-4">
                <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Progress Report Due in 17 Days</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Submit your Term 1 progress report to NESA by 15 Feb 2026
                  </p>
                  <Button size="sm" variant="outline" className="mt-2">
                    Start Report
                  </Button>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg border p-4">
                <Calendar className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-sm">Annual Review Scheduled</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Your curriculum review is scheduled for 30 Jun 2026
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Community Tab */}
        <TabsContent value="community" className="mt-6 space-y-6">
          {/* Co-op Invitations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Heart className="h-5 w-5 text-pink-500" />
                    Co-op Invitations
                  </CardTitle>
                  <CardDescription>Families who want to connect with you</CardDescription>
                </div>
                <Badge variant="secondary">{communityInvitations.length} pending</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {communityInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-start gap-4 rounded-lg border p-4"
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {invitation.avatar}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{invitation.familyName}</h4>
                      <Badge variant="outline" className="text-xs">
                        {invitation.philosophy}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3" />
                      {invitation.location}
                      <span className="mx-1">-</span>
                      Children ages: {invitation.childrenAges.join(', ')}
                    </p>
                    <p className="text-sm mt-2 italic text-muted-foreground">
                      &ldquo;{invitation.message}&rdquo;
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button size="sm">Accept</Button>
                    <Button size="sm" variant="outline">
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Local Families */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Local Homeschool Families</CardTitle>
                  <CardDescription>Connect with families in your area</CardDescription>
                </div>
                <Button variant="outline" asChild>
                  <Link href="/homeschool/co-op">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Find More
                  </Link>
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                {localFamilies.map((family) => (
                  <Card key={family.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-primary/10 text-primary text-sm">
                            {family.name.split(' ')[1]?.[0] || family.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{family.name}</h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {family.location}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <Users className="h-3 w-3" />
                        {family.childrenCount} children
                        <span className="mx-1">-</span>
                        {family.philosophy}
                      </div>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {family.interests.slice(0, 2).map((interest) => (
                          <Badge key={interest} variant="secondary" className="text-xs">
                            {interest}
                          </Badge>
                        ))}
                        {family.interests.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{family.interests.length - 2}
                          </Badge>
                        )}
                      </div>
                      <Button variant="outline" size="sm" className="w-full mt-3">
                        Connect
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
