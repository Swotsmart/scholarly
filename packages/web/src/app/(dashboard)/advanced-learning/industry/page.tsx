'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Building2,
  ArrowLeft,
  MapPin,
  Clock,
  Calendar,
  Briefcase,
  GraduationCap,
  Send,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Star,
  Users,
  Target,
  BookOpen,
  Globe,
  HeartHandshake,
} from 'lucide-react';

const MOCK_OPPORTUNITIES = [
  {
    id: 'opp_001',
    company: 'CSIRO',
    role: 'Research Intern',
    sector: 'Science & Research',
    location: 'Canberra, ACT',
    duration: '12 weeks',
    educationLevel: 'Year 11-12',
    skills: ['Data Analysis', 'Scientific Method', 'Python', 'Lab Safety'],
    applicationDeadline: '2025-04-15',
    description: 'Join a CSIRO research team investigating climate change impacts on Australian ecosystems. Work alongside leading scientists using real-world data collection and analysis techniques.',
    companyLogo: 'bg-blue-500/10',
  },
  {
    id: 'opp_002',
    company: 'BHP',
    role: 'Engineering Shadow',
    sector: 'Mining & Resources',
    location: 'Perth, WA',
    duration: '4 weeks',
    educationLevel: 'Year 10-12',
    skills: ['Engineering Principles', 'Problem Solving', 'Mathematics', 'Safety Awareness'],
    applicationDeadline: '2025-04-20',
    description: 'Shadow experienced mining engineers across BHP operations. Gain exposure to sustainable mining practices, automation technology, and environmental rehabilitation programs.',
    companyLogo: 'bg-orange-500/10',
  },
  {
    id: 'opp_003',
    company: 'ABC',
    role: 'Media Production Assistant',
    sector: 'Media & Communications',
    location: 'Sydney, NSW',
    duration: '8 weeks',
    educationLevel: 'Year 10-12',
    skills: ['Video Production', 'Storytelling', 'Digital Media', 'Communication'],
    applicationDeadline: '2025-04-10',
    description: 'Assist in producing content for ABC Education. Learn broadcast journalism, digital storytelling, podcast production, and multimedia content creation from experienced producers.',
    companyLogo: 'bg-emerald-500/10',
  },
  {
    id: 'opp_004',
    company: 'NAB',
    role: 'FinTech Explorer',
    sector: 'Financial Services',
    location: 'Melbourne, VIC',
    duration: '6 weeks',
    educationLevel: 'Year 11-12',
    skills: ['Financial Literacy', 'Data Analytics', 'Problem Solving', 'Teamwork'],
    applicationDeadline: '2025-05-01',
    description: 'Explore the intersection of finance and technology at NAB\'s Innovation Lab. Work on real FinTech challenges including digital payments, AI-driven customer insights, and cybersecurity.',
    companyLogo: 'bg-red-500/10',
  },
  {
    id: 'opp_005',
    company: 'Royal Melbourne Hospital',
    role: 'Health Sciences Placement',
    sector: 'Healthcare',
    location: 'Melbourne, VIC',
    duration: '10 weeks',
    educationLevel: 'Year 11-12',
    skills: ['Biology', 'Patient Care', 'Communication', 'Empathy'],
    applicationDeadline: '2025-04-25',
    description: 'Rotate through clinical and research departments including pathology, physiotherapy, and biomedical engineering. Experience healthcare delivery and medical research first-hand.',
    companyLogo: 'bg-violet-500/10',
  },
  {
    id: 'opp_006',
    company: 'Atlassian',
    role: 'Software Apprentice',
    sector: 'Technology',
    location: 'Sydney, NSW',
    duration: '8 weeks',
    educationLevel: 'Year 10-12',
    skills: ['Programming', 'Agile Methodology', 'Collaboration Tools', 'Problem Solving'],
    applicationDeadline: '2025-04-30',
    description: 'Join an Atlassian product team as an apprentice software developer. Contribute to real product features, participate in agile ceremonies, and learn modern software development practices.',
    companyLogo: 'bg-blue-600/10',
  },
];

const MOCK_APPLICATIONS = [
  {
    id: 'app_001',
    company: 'CSIRO',
    role: 'Research Intern',
    appliedDate: '2025-03-01',
    status: 'shortlisted' as const,
  },
  {
    id: 'app_002',
    company: 'Atlassian',
    role: 'Software Apprentice',
    appliedDate: '2025-03-05',
    status: 'submitted' as const,
  },
  {
    id: 'app_003',
    company: 'ABC',
    role: 'Media Production Assistant',
    appliedDate: '2025-02-20',
    status: 'accepted' as const,
  },
  {
    id: 'app_004',
    company: 'NAB',
    role: 'FinTech Explorer',
    appliedDate: '2025-02-15',
    status: 'declined' as const,
  },
];

const MOCK_ACTIVE_PLACEMENT = {
  id: 'plc_001',
  company: 'ABC',
  role: 'Media Production Assistant',
  supervisor: 'Michelle Tan',
  supervisorRole: 'Senior Producer, ABC Education',
  startDate: '2025-02-24',
  endDate: '2025-04-18',
  hoursLogged: 120,
  totalHours: 240,
  location: 'Ultimo, Sydney, NSW',
  learningObjectives: [
    { name: 'Video Production Fundamentals', progress: 90, status: 'on_track' },
    { name: 'Digital Storytelling Techniques', progress: 75, status: 'on_track' },
    { name: 'Podcast Production Workflow', progress: 60, status: 'on_track' },
    { name: 'Broadcast Journalism Ethics', progress: 45, status: 'on_track' },
    { name: 'Multimedia Content Strategy', progress: 30, status: 'on_track' },
  ],
  weeklyReflections: 5,
  supervisorRating: 4.5,
};

const PARTNER_COMPANIES = [
  { name: 'CSIRO', sector: 'Research' },
  { name: 'BHP', sector: 'Resources' },
  { name: 'ABC', sector: 'Media' },
  { name: 'NAB', sector: 'Finance' },
  { name: 'Royal Melbourne Hospital', sector: 'Healthcare' },
  { name: 'Atlassian', sector: 'Technology' },
  { name: 'Telstra', sector: 'Telecommunications' },
  { name: 'Qantas', sector: 'Aviation' },
];

const pageStats = [
  { label: 'Open Opportunities', value: '6', icon: Briefcase, color: 'blue' },
  { label: 'My Applications', value: '4', icon: Send, color: 'emerald' },
  { label: 'Hours Logged', value: '120', icon: Clock, color: 'violet' },
  { label: 'Partner Companies', value: '8', icon: Building2, color: 'amber' },
];

function getApplicationStatusBadge(status: string) {
  switch (status) {
    case 'accepted':
      return <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Accepted</Badge>;
    case 'shortlisted':
      return <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20"><Star className="h-3 w-3 mr-1" />Shortlisted</Badge>;
    case 'submitted':
      return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20"><Send className="h-3 w-3 mr-1" />Submitted</Badge>;
    case 'declined':
      return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function IndustryExperiencePage() {
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
            <h1 className="heading-2">Industry Experience</h1>
            <p className="text-muted-foreground">
              Connect with Australian industry partners for real-world work-based learning
            </p>
          </div>
        </div>
        <Button variant="outline">
          <Globe className="mr-2 h-4 w-4" />
          Browse All Partners
        </Button>
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

      <Tabs defaultValue="opportunities">
        <TabsList>
          <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
          <TabsTrigger value="placements">My Placements</TabsTrigger>
        </TabsList>

        {/* Opportunities */}
        <TabsContent value="opportunities" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MOCK_OPPORTUNITIES.map((opp) => (
              <Card key={opp.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg ${opp.companyLogo} p-3`}>
                      <Building2 className="h-6 w-6 text-foreground/70" />
                    </div>
                    <Badge variant="outline">{opp.sector}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{opp.company}</CardTitle>
                  <CardDescription className="font-medium text-foreground/80">{opp.role}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p className="text-sm text-muted-foreground">{opp.description}</p>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{opp.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{opp.duration}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <GraduationCap className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">{opp.educationLevel}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-muted-foreground">
                        Apply by {new Date(opp.applicationDeadline).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {opp.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>

                  <Button className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Apply Now
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* My Applications */}
        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Applications</CardTitle>
              <CardDescription>Track the status of your placement applications</CardDescription>
            </CardHeader>
            <CardContent>
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-3 font-medium">Company</th>
                    <th className="text-left p-3 font-medium">Role</th>
                    <th className="text-left p-3 font-medium">Applied</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-left p-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {MOCK_APPLICATIONS.map((app) => (
                    <tr key={app.id} className="hover:bg-muted/50">
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{app.company}</span>
                        </div>
                      </td>
                      <td className="p-3 text-muted-foreground">{app.role}</td>
                      <td className="p-3 text-muted-foreground">
                        {new Date(app.appliedDate).toLocaleDateString('en-AU', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="p-3">{getApplicationStatusBadge(app.status)}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm">View Details</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* My Placements */}
        <TabsContent value="placements" className="space-y-6">
          {/* Active Placement */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Building2 className="h-5 w-5 text-blue-500" />
                    {MOCK_ACTIVE_PLACEMENT.company} - {MOCK_ACTIVE_PLACEMENT.role}
                  </CardTitle>
                  <CardDescription>Active Placement</CardDescription>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">Active</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Placement Info */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Supervisor</p>
                  <p className="text-sm font-medium mt-1">{MOCK_ACTIVE_PLACEMENT.supervisor}</p>
                  <p className="text-xs text-muted-foreground">{MOCK_ACTIVE_PLACEMENT.supervisorRole}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Location</p>
                  <p className="text-sm font-medium mt-1">{MOCK_ACTIVE_PLACEMENT.location}</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Duration</p>
                  <p className="text-sm font-medium mt-1">
                    {new Date(MOCK_ACTIVE_PLACEMENT.startDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short' })} -{' '}
                    {new Date(MOCK_ACTIVE_PLACEMENT.endDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Supervisor Rating</p>
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    <span className="text-sm font-medium">{MOCK_ACTIVE_PLACEMENT.supervisorRating}/5.0</span>
                  </div>
                </div>
              </div>

              {/* Hours Logged */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Hours Logged</span>
                  <span className="text-muted-foreground">
                    {MOCK_ACTIVE_PLACEMENT.hoursLogged}/{MOCK_ACTIVE_PLACEMENT.totalHours} hours
                  </span>
                </div>
                <Progress
                  value={Math.round((MOCK_ACTIVE_PLACEMENT.hoursLogged / MOCK_ACTIVE_PLACEMENT.totalHours) * 100)}
                  className="h-3"
                />
              </div>

              {/* Learning Objectives */}
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  Learning Objectives Progress
                </h4>
                <div className="space-y-3">
                  {MOCK_ACTIVE_PLACEMENT.learningObjectives.map((objective) => (
                    <div key={objective.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{objective.name}</span>
                        <span className="font-medium">{objective.progress}%</span>
                      </div>
                      <Progress value={objective.progress} className="h-1.5" />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button>
                  <BookOpen className="h-4 w-4 mr-2" />
                  Log Hours
                </Button>
                <Button variant="outline">
                  <Target className="h-4 w-4 mr-2" />
                  Update Objectives
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Partner Companies */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <HeartHandshake className="h-5 w-5 text-muted-foreground" />
                Partner Companies
              </CardTitle>
              <CardDescription>Industry partners offering work-based learning experiences</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                {PARTNER_COMPANIES.map((company) => (
                  <div key={company.name} className="flex items-center gap-3 rounded-lg border p-3">
                    <div className="rounded-lg bg-muted p-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{company.name}</p>
                      <p className="text-xs text-muted-foreground">{company.sector}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
