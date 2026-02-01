'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Briefcase,
  Building2,
  MapPin,
  Clock,
  Calendar,
  Search,
  Send,
  CheckCircle2,
  XCircle,
  Star,
  FileText,
  Upload,
  Download,
  BookOpen,
  PenLine,
  User,
  Mail,
  Phone,
  GraduationCap,
  Target,
  MessageSquare,
  ClipboardCheck,
  AlertCircle,
  Eye,
  Plus,
  Trash2,
} from 'lucide-react';

// Mock opportunities
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
    salary: 'Stipend provided',
    spots: 3,
    applicants: 28,
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
    salary: 'Unpaid',
    spots: 5,
    applicants: 42,
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
    salary: 'Stipend provided',
    spots: 2,
    applicants: 35,
  },
  {
    id: 'opp_004',
    company: 'Atlassian',
    role: 'Software Apprentice',
    sector: 'Technology',
    location: 'Sydney, NSW (Hybrid)',
    duration: '8 weeks',
    educationLevel: 'Year 10-12',
    skills: ['Programming', 'Agile Methodology', 'Collaboration Tools', 'Problem Solving'],
    applicationDeadline: '2025-04-30',
    description: 'Join an Atlassian product team as an apprentice software developer. Contribute to real product features, participate in agile ceremonies, and learn modern software development practices.',
    salary: 'Paid internship',
    spots: 4,
    applicants: 67,
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
    salary: 'Unpaid',
    spots: 6,
    applicants: 54,
  },
];

// Mock applications
const MOCK_APPLICATIONS = [
  {
    id: 'app_001',
    company: 'CSIRO',
    role: 'Research Intern',
    appliedDate: '2025-03-01',
    status: 'shortlisted',
    nextStep: 'Interview scheduled for March 25',
  },
  {
    id: 'app_002',
    company: 'Atlassian',
    role: 'Software Apprentice',
    appliedDate: '2025-03-05',
    status: 'submitted',
    nextStep: 'Under review',
  },
  {
    id: 'app_003',
    company: 'ABC',
    role: 'Media Production Assistant',
    appliedDate: '2025-02-20',
    status: 'accepted',
    nextStep: 'Start date: April 7, 2025',
  },
  {
    id: 'app_004',
    company: 'NAB',
    role: 'FinTech Explorer',
    appliedDate: '2025-02-15',
    status: 'declined',
    nextStep: 'Position filled',
  },
];

// Mock documents
const MOCK_DOCUMENTS = [
  {
    id: 'doc_001',
    name: 'Resume_2025.pdf',
    type: 'resume',
    uploadedDate: '2025-02-15',
    size: '245 KB',
    status: 'current',
  },
  {
    id: 'doc_002',
    name: 'Cover_Letter_CSIRO.pdf',
    type: 'cover_letter',
    uploadedDate: '2025-03-01',
    size: '128 KB',
    status: 'current',
  },
  {
    id: 'doc_003',
    name: 'Cover_Letter_Generic.pdf',
    type: 'cover_letter',
    uploadedDate: '2025-02-20',
    size: '115 KB',
    status: 'current',
  },
  {
    id: 'doc_004',
    name: 'Academic_Transcript.pdf',
    type: 'transcript',
    uploadedDate: '2025-01-10',
    size: '520 KB',
    status: 'current',
  },
  {
    id: 'doc_005',
    name: 'Reference_Letter_DrSmith.pdf',
    type: 'reference',
    uploadedDate: '2025-02-28',
    size: '89 KB',
    status: 'current',
  },
];

// Mock logbook entries
const MOCK_LOGBOOK = [
  {
    id: 'log_001',
    date: '2025-04-07',
    hours: 7.5,
    activities: 'Orientation and onboarding. Met the team, toured facilities, completed safety training.',
    skills: ['Communication', 'Safety'],
    supervisorSigned: true,
    reflection: 'Exciting first day! The team is very welcoming. Looking forward to starting real work tomorrow.',
  },
  {
    id: 'log_002',
    date: '2025-04-08',
    hours: 7.5,
    activities: 'Shadowed senior producer during morning news segment recording. Assisted with camera setup.',
    skills: ['Video Production', 'Technical Skills'],
    supervisorSigned: true,
    reflection: 'Learned a lot about the fast pace of live production. Need to be quicker with equipment setup.',
  },
  {
    id: 'log_003',
    date: '2025-04-09',
    hours: 7.5,
    activities: 'Participated in editorial meeting. Began working on podcast episode research.',
    skills: ['Research', 'Collaboration'],
    supervisorSigned: true,
    reflection: 'Editorial meetings are intense! Good to see how story ideas are developed and prioritized.',
  },
  {
    id: 'log_004',
    date: '2025-04-10',
    hours: 6,
    activities: 'Continued podcast research. Drafted interview questions for upcoming guest.',
    skills: ['Research', 'Writing'],
    supervisorSigned: false,
    reflection: 'Getting more comfortable with the research process. Mentor gave great feedback on my questions.',
  },
];

// Supervisor feedback
const SUPERVISOR_FEEDBACK = [
  {
    id: 'fb_001',
    date: '2025-04-14',
    supervisor: 'Michelle Tan',
    rating: 4.5,
    strengths: 'Excellent initiative and communication skills. Quick learner with strong attention to detail.',
    areas: 'Could work on time management during busy production periods.',
    recommendation: 'Continue to take on more independent tasks. Ready for solo segment research.',
  },
];

const pageStats = [
  { label: 'Open Opportunities', value: '12', icon: Briefcase, color: 'blue' },
  { label: 'My Applications', value: '4', icon: Send, color: 'emerald' },
  { label: 'Hours Logged', value: '28.5', icon: Clock, color: 'violet' },
  { label: 'Documents', value: '5', icon: FileText, color: 'amber' },
];

function getApplicationStatusBadge(status: string) {
  switch (status) {
    case 'accepted':
      return <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"><CheckCircle2 className="h-3 w-3 mr-1" />Accepted</Badge>;
    case 'shortlisted':
      return <Badge className="bg-amber-500/10 text-amber-600 hover:bg-amber-500/20"><Star className="h-3 w-3 mr-1" />Shortlisted</Badge>;
    case 'submitted':
      return <Badge className="bg-blue-500/10 text-blue-600 hover:bg-blue-500/20"><Send className="h-3 w-3 mr-1" />Submitted</Badge>;
    case 'declined':
      return <Badge className="bg-red-500/10 text-red-600 hover:bg-red-500/20"><XCircle className="h-3 w-3 mr-1" />Declined</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getDocumentIcon(type: string) {
  switch (type) {
    case 'resume':
      return <User className="h-4 w-4" />;
    case 'cover_letter':
      return <Mail className="h-4 w-4" />;
    case 'transcript':
      return <GraduationCap className="h-4 w-4" />;
    case 'reference':
      return <MessageSquare className="h-4 w-4" />;
    default:
      return <FileText className="h-4 w-4" />;
  }
}

export default function WorkExperiencePage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [newLogEntry, setNewLogEntry] = useState({
    date: '',
    hours: '',
    activities: '',
    reflection: '',
  });

  const filteredOpportunities = MOCK_OPPORTUNITIES.filter(
    (opp) =>
      opp.company.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      opp.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalHours = MOCK_LOGBOOK.reduce((sum, entry) => sum + entry.hours, 0);
  const requiredHours = 80;

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
            <h1 className="heading-2">Work Experience Portal</h1>
            <p className="text-muted-foreground">
              Find placements, track applications, and log your work experience journey
            </p>
          </div>
        </div>
        <Button>
          <Upload className="mr-2 h-4 w-4" />
          Upload Document
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
          <TabsTrigger value="opportunities">
            <Briefcase className="mr-2 h-4 w-4" />
            Opportunities
          </TabsTrigger>
          <TabsTrigger value="applications">
            <Send className="mr-2 h-4 w-4" />
            Applications
          </TabsTrigger>
          <TabsTrigger value="documents">
            <FileText className="mr-2 h-4 w-4" />
            Documents
          </TabsTrigger>
          <TabsTrigger value="logbook">
            <BookOpen className="mr-2 h-4 w-4" />
            Logbook
          </TabsTrigger>
          <TabsTrigger value="supervisor">
            <ClipboardCheck className="mr-2 h-4 w-4" />
            Supervisor
          </TabsTrigger>
        </TabsList>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-4">
          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by company, role, sector, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Opportunities Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredOpportunities.map((opp) => (
              <Card key={opp.id} className="flex flex-col">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="rounded-lg bg-blue-500/10 p-3">
                      <Building2 className="h-6 w-6 text-blue-500" />
                    </div>
                    <Badge variant="outline">{opp.sector}</Badge>
                  </div>
                  <CardTitle className="text-lg mt-3">{opp.company}</CardTitle>
                  <CardDescription className="font-medium text-foreground/80">{opp.role}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-3">{opp.description}</p>

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
                    {opp.skills.slice(0, 3).map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {opp.skills.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{opp.skills.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t">
                    <span>{opp.spots} positions</span>
                    <span>{opp.applicants} applicants</span>
                  </div>
                </CardContent>
                <CardFooter className="pt-0">
                  <Button className="w-full">
                    <Send className="h-4 w-4 mr-2" />
                    Apply Now
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Applications Tab */}
        <TabsContent value="applications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">My Applications</CardTitle>
              <CardDescription>Track the status of your placement applications</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {MOCK_APPLICATIONS.map((app) => (
                  <div
                    key={app.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-muted p-2">
                        <Building2 className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{app.company}</p>
                        <p className="text-sm text-muted-foreground">{app.role}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Applied: {new Date(app.appliedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        {getApplicationStatusBadge(app.status)}
                        <p className="text-xs text-muted-foreground mt-1">{app.nextStep}</p>
                      </div>
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Application Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-muted-foreground" />
                Application Tips
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                  <p className="text-sm font-medium text-blue-600">Tailor Your Resume</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Customize your resume for each application, highlighting relevant skills and experiences.
                  </p>
                </div>
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                  <p className="text-sm font-medium text-emerald-600">Research the Company</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Learn about the company's values, recent projects, and culture before applying.
                  </p>
                </div>
                <div className="rounded-lg bg-violet-500/5 border border-violet-500/20 p-3">
                  <p className="text-sm font-medium text-violet-600">Follow Up</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Send a polite follow-up email if you haven't heard back within 2 weeks.
                  </p>
                </div>
                <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                  <p className="text-sm font-medium text-amber-600">Prepare for Interviews</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Practice common interview questions and prepare thoughtful questions to ask.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">My Documents</CardTitle>
                  <CardDescription>Resume, cover letters, and supporting documents</CardDescription>
                </div>
                <Button>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {MOCK_DOCUMENTS.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-muted p-2">
                        {getDocumentIcon(doc.type)}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {doc.size} - Uploaded {new Date(doc.uploadedDate).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-xs">
                        {doc.type.replace('_', ' ')}
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Document Checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-muted-foreground" />
                Document Checklist
              </CardTitle>
              <CardDescription>Ensure you have all required documents ready</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {[
                  { label: 'Resume/CV', required: true, uploaded: true },
                  { label: 'Generic Cover Letter', required: true, uploaded: true },
                  { label: 'Academic Transcript', required: true, uploaded: true },
                  { label: 'Reference Letter', required: false, uploaded: true },
                  { label: 'Working with Children Check', required: false, uploaded: false },
                  { label: 'First Aid Certificate', required: false, uploaded: false },
                ].map((item, index) => (
                  <div key={index} className="flex items-center justify-between py-2">
                    <div className="flex items-center gap-2">
                      {item.uploaded ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                      )}
                      <span className={`text-sm ${item.uploaded ? 'text-muted-foreground' : ''}`}>
                        {item.label}
                      </span>
                      {item.required && (
                        <Badge variant="outline" className="text-[10px] px-1">Required</Badge>
                      )}
                    </div>
                    {!item.uploaded && (
                      <Button variant="ghost" size="sm">
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logbook Tab */}
        <TabsContent value="logbook" className="space-y-6">
          {/* Hours Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-500" />
                Hours Progress
              </CardTitle>
              <CardDescription>Track your work experience hours</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Total Hours Logged</span>
                  <span className="text-muted-foreground">
                    {totalHours}/{requiredHours} hours ({Math.round((totalHours / requiredHours) * 100)}%)
                  </span>
                </div>
                <Progress value={Math.round((totalHours / requiredHours) * 100)} className="h-3" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold">{totalHours}</p>
                  <p className="text-xs text-muted-foreground">Hours Logged</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold">{requiredHours - totalHours}</p>
                  <p className="text-xs text-muted-foreground">Hours Remaining</p>
                </div>
                <div className="rounded-lg bg-muted/50 p-3 text-center">
                  <p className="text-2xl font-bold">{MOCK_LOGBOOK.filter(e => e.supervisorSigned).length}</p>
                  <p className="text-xs text-muted-foreground">Entries Signed</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* New Entry Form */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Plus className="h-5 w-5 text-muted-foreground" />
                New Logbook Entry
              </CardTitle>
              <CardDescription>Record your daily activities and reflections</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Date</label>
                  <Input
                    type="date"
                    value={newLogEntry.date}
                    onChange={(e) => setNewLogEntry({ ...newLogEntry, date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Hours Worked</label>
                  <Input
                    type="number"
                    placeholder="e.g., 7.5"
                    value={newLogEntry.hours}
                    onChange={(e) => setNewLogEntry({ ...newLogEntry, hours: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Activities & Tasks</label>
                <Textarea
                  placeholder="Describe what you worked on today..."
                  value={newLogEntry.activities}
                  onChange={(e) => setNewLogEntry({ ...newLogEntry, activities: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reflection Journal</label>
                <Textarea
                  placeholder="What did you learn? What challenges did you face? What would you do differently?"
                  value={newLogEntry.reflection}
                  onChange={(e) => setNewLogEntry({ ...newLogEntry, reflection: e.target.value })}
                  className="min-h-[80px]"
                />
              </div>
              <Button>
                <PenLine className="mr-2 h-4 w-4" />
                Save Entry
              </Button>
            </CardContent>
          </Card>

          {/* Previous Entries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Previous Entries</CardTitle>
              <CardDescription>Your work experience journal</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {MOCK_LOGBOOK.map((entry) => (
                <div key={entry.id} className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">
                        {new Date(entry.date).toLocaleDateString('en-AU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                      <p className="text-sm text-muted-foreground">{entry.hours} hours</p>
                    </div>
                    {entry.supervisorSigned ? (
                      <Badge className="bg-emerald-500/10 text-emerald-600">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Signed
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Pending Sign-off
                      </Badge>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium">Activities</p>
                    <p className="text-sm text-muted-foreground">{entry.activities}</p>
                  </div>

                  <div>
                    <p className="text-sm font-medium">Reflection</p>
                    <p className="text-sm text-muted-foreground italic">{entry.reflection}</p>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {entry.skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Supervisor Tab */}
        <TabsContent value="supervisor" className="space-y-6">
          {/* Current Supervisor */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-blue-500" />
                Supervisor Details
              </CardTitle>
              <CardDescription>Your workplace supervisor for this placement</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xl font-medium">MT</span>
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">Michelle Tan</p>
                  <p className="text-sm text-muted-foreground">Senior Producer, ABC Education</p>
                  <div className="flex items-center gap-4 mt-2">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      <span>michelle.tan@abc.net.au</span>
                    </div>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      <span>+61 2 8333 1234</span>
                    </div>
                  </div>
                </div>
                <Button variant="outline">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Message
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pending Sign-offs */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-amber-500" />
                Pending Sign-offs
              </CardTitle>
              <CardDescription>Logbook entries awaiting supervisor approval</CardDescription>
            </CardHeader>
            <CardContent>
              {MOCK_LOGBOOK.filter(e => !e.supervisorSigned).length > 0 ? (
                <div className="space-y-3">
                  {MOCK_LOGBOOK.filter(e => !e.supervisorSigned).map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <p className="font-medium text-sm">
                          {new Date(entry.date).toLocaleDateString('en-AU', { weekday: 'short', day: 'numeric', month: 'short' })}
                        </p>
                        <p className="text-xs text-muted-foreground">{entry.hours} hours logged</p>
                      </div>
                      <Badge variant="outline" className="text-amber-600">
                        <Clock className="h-3 w-3 mr-1" />
                        Awaiting Sign-off
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-emerald-500" />
                  <p>All entries have been signed off!</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Supervisor Feedback */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500" />
                Supervisor Feedback
              </CardTitle>
              <CardDescription>Performance reviews and recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {SUPERVISOR_FEEDBACK.map((feedback) => (
                <div key={feedback.id} className="rounded-lg border p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{feedback.supervisor}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(feedback.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`h-4 w-4 ${i < Math.floor(feedback.rating) ? 'text-amber-500 fill-amber-500' : 'text-muted'}`}
                        />
                      ))}
                      <span className="text-sm font-medium ml-1">{feedback.rating}</span>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/20 p-3">
                      <p className="text-sm font-medium text-emerald-600 mb-1">Strengths</p>
                      <p className="text-sm text-muted-foreground">{feedback.strengths}</p>
                    </div>
                    <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
                      <p className="text-sm font-medium text-amber-600 mb-1">Areas for Growth</p>
                      <p className="text-sm text-muted-foreground">{feedback.areas}</p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                    <p className="text-sm font-medium text-blue-600 mb-1">Recommendation</p>
                    <p className="text-sm text-muted-foreground">{feedback.recommendation}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
