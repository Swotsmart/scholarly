'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Video,
  Users,
  Building2,
  GraduationCap,
  FolderKanban,
  ArrowRight,
  TrendingUp,
  Clock,
  Star,
  MessageSquare,
  CheckCircle2,
  Briefcase,
  Award,
  FileText,
} from 'lucide-react';

const stats = [
  { label: 'Active Sessions', value: '12', icon: Video, color: 'blue' },
  { label: 'Completed Reviews', value: '47', icon: CheckCircle2, color: 'emerald' },
  { label: 'Industry Placements', value: '3', icon: Building2, color: 'violet' },
  { label: 'PD Courses Enrolled', value: '5', icon: GraduationCap, color: 'amber' },
];

const modules = [
  {
    title: 'Video Coaching',
    description: 'Record, review, and receive AI-powered feedback on classroom teaching practice through Edthena-style lesson analysis.',
    icon: Video,
    color: 'blue',
    href: '/advanced-learning/video-coaching',
    badge: 'Active',
    badgeVariant: 'default' as const,
    stats: [
      { label: 'Recordings', value: '8' },
      { label: 'Reviews Pending', value: '3' },
      { label: 'AI Insights', value: '24' },
    ],
  },
  {
    title: 'Peer Review',
    description: 'Engage in structured peer review sessions with AI-enhanced rubrics, anonymous feedback, and calibration scoring.',
    icon: Users,
    color: 'emerald',
    href: '/advanced-learning/peer-review',
    badge: '4 Active',
    badgeVariant: 'default' as const,
    stats: [
      { label: 'Active Sessions', value: '4' },
      { label: 'Submissions', value: '12' },
      { label: 'Avg. Score', value: '82%' },
    ],
  },
  {
    title: 'Industry Experience',
    description: 'Connect with Australian industry partners for work-based learning placements, internships, and real-world project experiences.',
    icon: Building2,
    color: 'violet',
    href: '/advanced-learning/industry',
    badge: '6 Open',
    badgeVariant: 'default' as const,
    stats: [
      { label: 'Opportunities', value: '6' },
      { label: 'Applications', value: '2' },
      { label: 'Hours Logged', value: '120' },
    ],
  },
  {
    title: 'Professional Development Hub',
    description: 'Access AITSL-aligned professional development courses, earn micro-credentials, and track your teaching standards compliance.',
    icon: GraduationCap,
    color: 'amber',
    href: '/advanced-learning/pd-hub',
    badge: '6 Courses',
    badgeVariant: 'default' as const,
    stats: [
      { label: 'Enrolled', value: '5' },
      { label: 'Completed', value: '3' },
      { label: 'Credit Hours', value: '42' },
    ],
  },
  {
    title: 'Project-Based Learning',
    description: 'Design and facilitate Gold Standard PBL experiences with driving questions, milestones, exhibitions, and cross-curricular integration.',
    icon: FolderKanban,
    color: 'rose',
    href: '/advanced-learning/pbl',
    badge: '4 Active',
    badgeVariant: 'default' as const,
    stats: [
      { label: 'Active Projects', value: '4' },
      { label: 'Challenges', value: '8' },
      { label: 'Completed', value: '6' },
    ],
  },
];

const recentActivity = [
  {
    action: 'New AI insight generated for "Year 8 Algebra Introduction" recording',
    module: 'Video Coaching',
    time: '25 minutes ago',
    icon: Video,
  },
  {
    action: 'Peer review submission graded for "Year 11 Research Essay Review"',
    module: 'Peer Review',
    time: '1 hour ago',
    icon: MessageSquare,
  },
  {
    action: 'Application shortlisted for CSIRO Research Intern placement',
    module: 'Industry Experience',
    time: '3 hours ago',
    icon: Briefcase,
  },
  {
    action: 'Module 4 of "Digital Pedagogy in Practice" completed',
    module: 'PD Hub',
    time: '5 hours ago',
    icon: Award,
  },
  {
    action: 'Milestone reached: Research phase completed for "Sustainable Water Management"',
    module: 'PBL',
    time: '1 day ago',
    icon: FolderKanban,
  },
  {
    action: 'Certificate issued for "Cultural Responsiveness Training"',
    module: 'PD Hub',
    time: '2 days ago',
    icon: FileText,
  },
  {
    action: 'Year 10 Chemistry Lab recording reviewed by Dr. Sarah Chen',
    module: 'Video Coaching',
    time: '2 days ago',
    icon: Star,
  },
];

export default function AdvancedLearningPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Advanced Learning</h1>
          <p className="text-muted-foreground">
            Professional growth tools for educators and experiential learning for students
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          <TrendingUp className="mr-1 h-3 w-3" />
          5 Modules
        </Badge>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
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

      {/* Module Cards */}
      <div>
        <h2 className="heading-3 mb-4">Learning Modules</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((module) => {
            const Icon = module.icon;
            return (
              <Card key={module.title} className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg bg-${module.color}-500/10 p-3`}>
                      <Icon className={`h-6 w-6 text-${module.color}-500`} />
                    </div>
                    <Badge>{module.badge}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{module.title}</CardTitle>
                  <CardDescription>{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {module.stats.map((stat) => (
                      <div key={stat.label} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{stat.label}</span>
                        <span className="font-semibold">{stat.value}</span>
                      </div>
                    ))}
                  </div>
                  <Button asChild className="w-full" variant="outline">
                    <Link href={module.href}>
                      Open
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="h-5 w-5 text-muted-foreground" />
            Recent Activity
          </CardTitle>
          <CardDescription>Latest updates across all learning modules</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivity.map((activity, index) => {
              const Icon = activity.icon;
              return (
                <div key={index} className="flex items-start gap-4">
                  <div className="rounded-lg bg-muted p-2 mt-0.5">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{activity.action}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">
                        {activity.module}
                      </Badge>
                      <span className="text-xs text-muted-foreground">{activity.time}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
