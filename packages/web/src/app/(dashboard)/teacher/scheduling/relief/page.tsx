'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { PageHeader, StatsCard, StatusBadge } from '@/components/shared';
import { Progress } from '@/components/ui/progress';
import {
  Clock,
  Calendar,
  CheckCircle2,
  MapPin,
  BookOpen,
  Users,
  Bell,
  Sparkles,
  FileText,
  TrendingUp,
  DollarSign,
  AlertCircle,
  Send,
  Star,
  UserCheck,
  Plus,
  Search,
  ClipboardList,
} from 'lucide-react';

// Types
interface ReliefSlot {
  id: string;
  date: string;
  dateFormatted: string;
  teacher: string;
  subject: string;
  yearLevel: string;
  periods: string;
  time: string;
  room: string;
  notes?: string;
  status: 'open' | 'pending' | 'filled' | 'confirmed';
  aiMatches?: AIMatch[];
}

interface AIMatch {
  id: string;
  name: string;
  matchScore: number;
  qualifications: string[];
  availability: string;
  rating: number;
}

interface HandoverNote {
  classInfo: string;
  lessonPlan: string;
  specialNeeds: string;
  materials: string;
  additionalNotes: string;
}

// Mock data
const openSlots: ReliefSlot[] = [
  {
    id: 'r1',
    date: '2025-01-30',
    dateFormatted: 'Tomorrow (Jan 30)',
    teacher: 'Ms. Sarah Chen',
    subject: 'Mathematics',
    yearLevel: 'Year 10',
    periods: '3-4',
    time: '10:35 AM - 12:20 PM',
    room: 'Room 204',
    notes: 'Covering quadratic equations unit. Worksheet pack is on desk.',
    status: 'open',
    aiMatches: [
      { id: 'am1', name: 'David Park', matchScore: 95, qualifications: ['Mathematics', 'Physics'], availability: 'Available', rating: 4.8 },
      { id: 'am2', name: 'Emma Kowalski', matchScore: 87, qualifications: ['Science', 'Mathematics'], availability: 'Available', rating: 4.6 },
      { id: 'am3', name: 'James Okafor', matchScore: 72, qualifications: ['General', 'PE'], availability: 'Available', rating: 4.5 },
    ],
  },
  {
    id: 'r2',
    date: '2025-01-31',
    dateFormatted: 'Friday (Jan 31)',
    teacher: 'Mr. Michael Torres',
    subject: 'Physics',
    yearLevel: 'Year 11',
    periods: '1-2',
    time: '8:30 AM - 10:15 AM',
    room: 'Lab 2',
    notes: 'Practical session - motion experiments. Lab prep done.',
    status: 'pending',
    aiMatches: [
      { id: 'am4', name: 'Emma Kowalski', matchScore: 92, qualifications: ['Science', 'Biology', 'Chemistry'], availability: 'Available', rating: 4.9 },
    ],
  },
  {
    id: 'r3',
    date: '2025-02-03',
    dateFormatted: 'Monday (Feb 3)',
    teacher: 'Dr. Amanda Lee',
    subject: 'English',
    yearLevel: 'Year 9',
    periods: '5-6',
    time: '1:20 PM - 3:05 PM',
    room: 'Room 108',
    status: 'filled',
  },
];

const myAcceptedSlots: ReliefSlot[] = [
  {
    id: 'a1',
    date: '2025-02-05',
    dateFormatted: 'Wednesday (Feb 5)',
    teacher: 'Ms. Emily Watson',
    subject: 'English',
    yearLevel: 'Year 9',
    periods: '5-6',
    time: '1:20 PM - 3:05 PM',
    room: 'Room 108',
    status: 'confirmed',
  },
];

const myRequests: ReliefSlot[] = [
  {
    id: 'req1',
    date: '2025-02-10',
    dateFormatted: 'Monday (Feb 10)',
    teacher: 'Me',
    subject: 'Design & Tech',
    yearLevel: 'Year 10',
    periods: '1-2',
    time: '8:30 AM - 10:15 AM',
    room: 'Room 204',
    notes: 'Medical appointment',
    status: 'pending',
  },
];

const history = [
  { id: 'h1', date: '2025-01-15', subject: 'Art', yearLevel: 'Year 8', periods: '3-4', status: 'completed' as const },
  { id: 'h2', date: '2025-01-10', subject: 'Music', yearLevel: 'Year 7', periods: '1-2', status: 'completed' as const },
  { id: 'h3', date: '2025-01-05', subject: 'Drama', yearLevel: 'Year 9', periods: '5-6', status: 'completed' as const },
  { id: 'h4', date: '2024-12-15', subject: 'Mathematics', yearLevel: 'Year 10', periods: '3-4', status: 'completed' as const },
];

const analytics = {
  coverageRate: 94,
  averageFillTime: '2.3 hours',
  totalCost: '$12,450',
  monthlySlots: 42,
  topSubjects: ['Mathematics', 'English', 'Science'],
};

const absenceReasons = [
  { id: 'sick', label: 'Sick Leave' },
  { id: 'personal', label: 'Personal Leave' },
  { id: 'pd', label: 'Professional Development' },
  { id: 'meeting', label: 'External Meeting' },
  { id: 'excursion', label: 'Excursion' },
  { id: 'other', label: 'Other' },
];

function getStatusColor(status: string) {
  switch (status) {
    case 'open':
      return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
    case 'pending':
      return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    case 'filled':
    case 'confirmed':
      return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    default:
      return 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400';
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'open':
      return 'Open';
    case 'pending':
      return 'Pending';
    case 'filled':
      return 'Filled';
    case 'confirmed':
      return 'Confirmed';
    default:
      return status;
  }
}

export default function ReliefMarketplacePage() {
  const [reportAbsenceOpen, setReportAbsenceOpen] = useState(false);
  const [handoverOpen, setHandoverOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ReliefSlot | null>(null);
  const [aiMatchesOpen, setAiMatchesOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [searchQuery, setSearchQuery] = useState('');

  const [absenceForm, setAbsenceForm] = useState({
    date: '',
    periods: '',
    reason: '',
    notes: '',
  });

  const [handoverForm, setHandoverForm] = useState<HandoverNote>({
    classInfo: '',
    lessonPlan: '',
    specialNeeds: '',
    materials: '',
    additionalNotes: '',
  });

  const handleAcceptSlot = (slot: ReliefSlot) => {
    setSelectedSlot(slot);
    setHandoverOpen(true);
  };

  const handleViewAIMatches = (slot: ReliefSlot) => {
    setSelectedSlot(slot);
    setAiMatchesOpen(true);
  };

  const renderSlotCard = (slot: ReliefSlot, showAcceptButton = false, showAIMatches = false) => (
    <Card key={slot.id}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 flex-1">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={getStatusColor(slot.status)}>
                  {getStatusLabel(slot.status)}
                </Badge>
                <Badge variant="outline">{slot.dateFormatted}</Badge>
              </div>
              <h3 className="text-lg font-semibold">{slot.subject} - {slot.yearLevel}</h3>
              <p className="text-sm text-muted-foreground">
                Covering for {slot.teacher}
              </p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-1 text-muted-foreground">
                <Clock className="h-4 w-4" />
                Periods {slot.periods} ({slot.time})
              </div>
              <div className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                {slot.room}
              </div>
            </div>
            {slot.notes && (
              <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                <BookOpen className="h-4 w-4 mt-0.5 text-muted-foreground flex-shrink-0" />
                <p className="text-sm">{slot.notes}</p>
              </div>
            )}
            {showAIMatches && slot.aiMatches && slot.aiMatches.length > 0 && (
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-violet-500" />
                <span className="text-sm text-muted-foreground">
                  {slot.aiMatches.length} AI-suggested relief teachers
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 h-auto text-violet-500"
                  onClick={() => handleViewAIMatches(slot)}
                >
                  View Matches
                </Button>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2 ml-4">
            {showAcceptButton && slot.status === 'open' && (
              <Button onClick={() => handleAcceptSlot(slot)}>Accept Slot</Button>
            )}
            {slot.status === 'confirmed' && (
              <Button variant="outline">View Details</Button>
            )}
            {slot.status === 'pending' && (
              <Button variant="outline" disabled>Awaiting Confirmation</Button>
            )}
            {slot.status === 'filled' && (
              <Badge className={getStatusColor(slot.status)}>
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Filled
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Relief Marketplace"
        description="Find relief coverage or report your absence"
        actions={
          <Button onClick={() => setReportAbsenceOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Report Absence
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Open Slots"
          value={openSlots.filter((s) => s.status === 'open').length}
          icon={Clock}
          variant="warning"
        />
        <StatsCard
          label="My Accepted"
          value={myAcceptedSlots.length}
          icon={CheckCircle2}
          variant="success"
        />
        <StatsCard
          label="Completed This Term"
          value={history.length}
          icon={Calendar}
          variant="primary"
        />
        <StatsCard
          label="Coverage Rate"
          value={`${analytics.coverageRate}%`}
          icon={TrendingUp}
          variant="success"
          change={2}
        />
      </div>

      {/* Real-time Notifications Banner */}
      <Card className="border-violet-200 bg-violet-50 dark:border-violet-900 dark:bg-violet-950">
        <CardContent className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-violet-500/20 p-2">
              <Bell className="h-5 w-5 text-violet-500" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-violet-800 dark:text-violet-200">Real-time Alerts Active</p>
              <p className="text-sm text-violet-700 dark:text-violet-300">
                You will receive instant notifications when new relief slots matching your qualifications become available.
              </p>
            </div>
            <Button variant="outline" size="sm" className="border-violet-300 text-violet-700 hover:bg-violet-100">
              Manage Alerts
            </Button>
          </div>
        </CardContent>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="browse">Browse Slots ({openSlots.length})</TabsTrigger>
          <TabsTrigger value="accepted">My Accepted ({myAcceptedSlots.length})</TabsTrigger>
          <TabsTrigger value="requests">My Requests ({myRequests.length})</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Browse Slots */}
        <TabsContent value="browse" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by subject, year level, or teacher..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Subjects</SelectItem>
                    <SelectItem value="maths">Mathematics</SelectItem>
                    <SelectItem value="english">English</SelectItem>
                    <SelectItem value="science">Science</SelectItem>
                  </SelectContent>
                </Select>
                <Select defaultValue="all">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Year Level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    <SelectItem value="7-8">Years 7-8</SelectItem>
                    <SelectItem value="9-10">Years 9-10</SelectItem>
                    <SelectItem value="11-12">Years 11-12</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-4">
            {openSlots.map((slot) => renderSlotCard(slot, true, true))}
          </div>
        </TabsContent>

        {/* My Accepted */}
        <TabsContent value="accepted" className="mt-4 space-y-4">
          {myAcceptedSlots.length > 0 ? (
            myAcceptedSlots.map((slot) => renderSlotCard(slot))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <UserCheck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Accepted Slots</h3>
                <p className="text-muted-foreground mb-4">
                  You haven&apos;t accepted any relief slots yet.
                </p>
                <Button variant="outline" onClick={() => setActiveTab('browse')}>
                  Browse Available Slots
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My Requests */}
        <TabsContent value="requests" className="mt-4 space-y-4">
          {myRequests.length > 0 ? (
            myRequests.map((request) => (
              <Card key={request.id}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={getStatusColor(request.status)}>
                            {getStatusLabel(request.status)}
                          </Badge>
                          <Badge variant="outline">{request.dateFormatted}</Badge>
                        </div>
                        <h3 className="text-lg font-semibold">{request.subject} - {request.yearLevel}</h3>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Periods {request.periods} ({request.time})
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {request.room}
                        </div>
                      </div>
                      {request.notes && (
                        <div className="flex items-start gap-2 rounded-lg bg-muted/50 p-3">
                          <AlertCircle className="h-4 w-4 mt-0.5 text-muted-foreground" />
                          <p className="text-sm">Reason: {request.notes}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <FileText className="mr-2 h-4 w-4" />
                        Add Handover
                      </Button>
                      <Button variant="destructive" size="sm">Cancel</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">No Pending Requests</h3>
                <p className="text-muted-foreground mb-4">
                  You don&apos;t have any absence requests.
                </p>
                <Button onClick={() => setReportAbsenceOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Report Absence
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* History */}
        <TabsContent value="history" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Relief History</CardTitle>
              <CardDescription>Your past relief teaching assignments</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-4 text-left font-medium">Date</th>
                    <th className="p-4 text-left font-medium">Subject</th>
                    <th className="p-4 text-left font-medium">Year Level</th>
                    <th className="p-4 text-left font-medium">Periods</th>
                    <th className="p-4 text-left font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">{new Date(item.date).toLocaleDateString('en-AU', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                      <td className="p-4">{item.subject}</td>
                      <td className="p-4">{item.yearLevel}</td>
                      <td className="p-4">{item.periods}</td>
                      <td className="p-4">
                        <StatusBadge status="completed" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="mt-4 space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatsCard
              label="Coverage Rate"
              value={`${analytics.coverageRate}%`}
              icon={TrendingUp}
              variant="success"
              change={2}
            />
            <StatsCard
              label="Avg Fill Time"
              value={analytics.averageFillTime}
              icon={Clock}
              variant="primary"
              change={-15}
            />
            <StatsCard
              label="Monthly Cost"
              value={analytics.totalCost}
              icon={DollarSign}
              variant="warning"
            />
            <StatsCard
              label="Slots This Month"
              value={analytics.monthlySlots}
              icon={Calendar}
              variant="primary"
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Coverage Rate Trend</CardTitle>
                <CardDescription>Last 4 weeks performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { week: 'Week 4', rate: 94 },
                    { week: 'Week 3', rate: 91 },
                    { week: 'Week 2', rate: 88 },
                    { week: 'Week 1', rate: 92 },
                  ].map((item) => (
                    <div key={item.week} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{item.week}</span>
                        <span className="font-medium">{item.rate}%</span>
                      </div>
                      <Progress value={item.rate} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Top Subjects Needing Coverage</CardTitle>
                <CardDescription>Most requested subject areas</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { subject: 'Mathematics', count: 12, color: 'bg-blue-500' },
                    { subject: 'English', count: 9, color: 'bg-green-500' },
                    { subject: 'Science', count: 8, color: 'bg-purple-500' },
                    { subject: 'HSIE', count: 6, color: 'bg-amber-500' },
                    { subject: 'PDHPE', count: 4, color: 'bg-red-500' },
                  ].map((item) => (
                    <div key={item.subject} className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${item.color}`} />
                      <span className="flex-1">{item.subject}</span>
                      <Badge variant="secondary">{item.count} slots</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Report Absence Dialog */}
      <Dialog open={reportAbsenceOpen} onOpenChange={setReportAbsenceOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Report Absence</DialogTitle>
            <DialogDescription>
              Submit a quick absence request to find relief coverage
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={absenceForm.date}
                onChange={(e) => setAbsenceForm({ ...absenceForm, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="periods">Periods</Label>
              <Select
                value={absenceForm.periods}
                onValueChange={(value) => setAbsenceForm({ ...absenceForm, periods: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select periods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1-2">Periods 1-2</SelectItem>
                  <SelectItem value="3-4">Periods 3-4</SelectItem>
                  <SelectItem value="5-6">Periods 5-6</SelectItem>
                  <SelectItem value="all">Full Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason</Label>
              <Select
                value={absenceForm.reason}
                onValueChange={(value) => setAbsenceForm({ ...absenceForm, reason: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  {absenceReasons.map((reason) => (
                    <SelectItem key={reason.id} value={reason.id}>
                      {reason.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Any additional information..."
                value={absenceForm.notes}
                onChange={(e) => setAbsenceForm({ ...absenceForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReportAbsenceOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setReportAbsenceOpen(false)}>
              <Send className="mr-2 h-4 w-4" />
              Submit Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Handover Notes Dialog */}
      <Dialog open={handoverOpen} onOpenChange={setHandoverOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Class Handover Notes</DialogTitle>
            <DialogDescription>
              Provide information for the relief teacher covering {selectedSlot?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="classInfo">Class Information</Label>
              <Textarea
                id="classInfo"
                placeholder="General class behavior, seating arrangements, etc."
                value={handoverForm.classInfo}
                onChange={(e) => setHandoverForm({ ...handoverForm, classInfo: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lessonPlan">Lesson Plan</Label>
              <Textarea
                id="lessonPlan"
                placeholder="What should be covered in this lesson?"
                value={handoverForm.lessonPlan}
                onChange={(e) => setHandoverForm({ ...handoverForm, lessonPlan: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="specialNeeds">Students with Special Needs</Label>
              <Textarea
                id="specialNeeds"
                placeholder="Any students requiring special attention or accommodations?"
                value={handoverForm.specialNeeds}
                onChange={(e) => setHandoverForm({ ...handoverForm, specialNeeds: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="materials">Materials & Resources</Label>
              <Textarea
                id="materials"
                placeholder="Where to find worksheets, equipment, etc."
                value={handoverForm.materials}
                onChange={(e) => setHandoverForm({ ...handoverForm, materials: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="additionalNotes">Additional Notes</Label>
              <Textarea
                id="additionalNotes"
                placeholder="Any other important information..."
                value={handoverForm.additionalNotes}
                onChange={(e) => setHandoverForm({ ...handoverForm, additionalNotes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setHandoverOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => setHandoverOpen(false)}>
              <ClipboardList className="mr-2 h-4 w-4" />
              Accept & Save Handover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* AI Matches Dialog */}
      <Dialog open={aiMatchesOpen} onOpenChange={setAiMatchesOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-500" />
              AI-Suggested Relief Teachers
            </DialogTitle>
            <DialogDescription>
              Based on qualifications, availability, and past performance
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedSlot?.aiMatches?.map((match) => (
              <Card key={match.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-medium text-primary">
                            {match.name.split(' ').map((n) => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <p className="font-semibold">{match.name}</p>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                            {match.rating}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {match.qualifications.map((qual) => (
                          <Badge key={qual} variant="secondary" className="text-xs">
                            {qual}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-sm text-muted-foreground">{match.availability}</p>
                    </div>
                    <div className="text-right">
                      <div className="inline-flex items-center gap-1 rounded-full bg-violet-100 px-2 py-1 text-sm font-medium text-violet-700 dark:bg-violet-900/30 dark:text-violet-400">
                        {match.matchScore}% match
                      </div>
                      <Button className="mt-2" size="sm">
                        Request
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAiMatchesOpen(false)}>
              Close
            </Button>
            <Button>
              <Bell className="mr-2 h-4 w-4" />
              Notify All Available
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
