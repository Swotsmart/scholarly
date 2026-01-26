'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  FileBarChart,
  Calendar,
  Clock,
  AlertCircle,
  Download,
  Plus,
  FileText,
  CheckCircle2,
  Loader2,
  XCircle,
  BarChart3,
  Users,
  Shield,
  DollarSign,
  ClipboardCheck,
} from 'lucide-react';

const stats = [
  { label: 'Reports Generated', value: '156', icon: FileBarChart, color: 'blue' },
  { label: 'Scheduled Reports', value: '8', icon: Calendar, color: 'green' },
  { label: 'Failed Reports', value: '2', icon: AlertCircle, color: 'orange' },
];

const reports = [
  {
    id: 'rp1',
    name: 'Term 1 Enrolment Summary',
    type: 'enrollment',
    generatedAt: '2026-01-26T08:30:00Z',
    status: 'ready' as const,
    size: '2.4 MB',
    generatedBy: 'Charlotte Nguyen',
  },
  {
    id: 'rp2',
    name: 'Weekly Attendance Report',
    type: 'attendance',
    generatedAt: '2026-01-25T17:00:00Z',
    status: 'ready' as const,
    size: '1.1 MB',
    generatedBy: 'System (Scheduled)',
  },
  {
    id: 'rp3',
    name: 'ACARA Compliance Audit',
    type: 'compliance',
    generatedAt: '2026-01-24T09:00:00Z',
    status: 'ready' as const,
    size: '5.8 MB',
    generatedBy: 'Jack Williams',
  },
  {
    id: 'rp4',
    name: 'Student Performance Analytics',
    type: 'performance',
    generatedAt: '2026-01-23T14:30:00Z',
    status: 'ready' as const,
    size: '3.2 MB',
    generatedBy: 'Amelia Chen',
  },
  {
    id: 'rp5',
    name: 'Financial Year Budget Report',
    type: 'financial',
    generatedAt: '2026-01-22T10:00:00Z',
    status: 'generating' as const,
    size: '--',
    generatedBy: 'Jack Williams',
  },
  {
    id: 'rp6',
    name: 'System Security Audit Log',
    type: 'audit',
    generatedAt: '2026-01-20T06:00:00Z',
    status: 'ready' as const,
    size: '890 KB',
    generatedBy: 'System (Scheduled)',
  },
];

function getTypeBadge(type: string) {
  switch (type) {
    case 'enrollment':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Enrolment</Badge>;
    case 'attendance':
      return <Badge className="bg-green-100 text-green-800 border-green-300">Attendance</Badge>;
    case 'compliance':
      return <Badge className="bg-purple-100 text-purple-800 border-purple-300">Compliance</Badge>;
    case 'performance':
      return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-300">Performance</Badge>;
    case 'financial':
      return <Badge className="bg-amber-100 text-amber-800 border-amber-300">Financial</Badge>;
    case 'audit':
      return <Badge className="bg-red-100 text-red-800 border-red-300">Audit</Badge>;
    default:
      return <Badge variant="secondary">{type}</Badge>;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'ready':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Ready
        </Badge>
      );
    case 'generating':
      return (
        <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Generating
        </Badge>
      );
    case 'failed':
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getTypeIcon(type: string) {
  switch (type) {
    case 'enrollment':
      return Users;
    case 'attendance':
      return ClipboardCheck;
    case 'compliance':
      return Shield;
    case 'performance':
      return BarChart3;
    case 'financial':
      return DollarSign;
    case 'audit':
      return FileText;
    default:
      return FileBarChart;
  }
}

export default function AdminReportsPage() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">System Reports</h1>
          <p className="text-muted-foreground">
            Generate, schedule, and download platform reports
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Generate Report
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New Report</DialogTitle>
              <DialogDescription>
                Select the report type and configure parameters
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Report Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select report type..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="enrollment">Enrolment Summary</SelectItem>
                    <SelectItem value="attendance">Attendance Report</SelectItem>
                    <SelectItem value="compliance">ACARA Compliance Audit</SelectItem>
                    <SelectItem value="performance">Student Performance</SelectItem>
                    <SelectItem value="financial">Financial Report</SelectItem>
                    <SelectItem value="audit">Security Audit Log</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Date</Label>
                  <Input type="date" defaultValue="2026-01-01" />
                </div>
                <div className="space-y-2">
                  <Label>End Date</Label>
                  <Input type="date" defaultValue="2026-01-26" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select defaultValue="pdf">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="xlsx">Excel (XLSX)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsDialogOpen(false)}>
                Generate Report
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className={`rounded-lg bg-${stat.color}-500/10 p-3`}>
                    <Icon className={`h-6 w-6 text-${stat.color}-500`} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Report Types Quick Access */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Generate</CardTitle>
          <CardDescription>Generate commonly used reports with a single click</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              { type: 'enrollment', label: 'Enrolment Summary', desc: 'Student enrolment numbers and demographics' },
              { type: 'attendance', label: 'Attendance Report', desc: 'Daily and weekly attendance tracking' },
              { type: 'compliance', label: 'ACARA Compliance', desc: 'Australian Curriculum compliance audit' },
              { type: 'performance', label: 'Performance Analytics', desc: 'Student achievement and progress data' },
              { type: 'financial', label: 'Budget Report', desc: 'Financial year budget and expenditure' },
              { type: 'audit', label: 'Security Audit', desc: 'System access and security event logs' },
            ].map((item) => {
              const Icon = getTypeIcon(item.type);
              return (
                <div key={item.type} className="flex items-start gap-3 rounded-lg border p-4 hover:bg-muted/50 transition-colors cursor-pointer">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">{item.label}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Reports Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Generated Reports</CardTitle>
              <CardDescription>Recent and scheduled report history</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-4 text-left font-medium">Report Name</th>
                <th className="p-4 text-left font-medium">Type</th>
                <th className="p-4 text-left font-medium">Generated At</th>
                <th className="p-4 text-left font-medium">Generated By</th>
                <th className="p-4 text-left font-medium">Status</th>
                <th className="p-4 text-left font-medium">Size</th>
                <th className="p-4 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((report) => (
                <tr key={report.id} className="border-b">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{report.name}</span>
                    </div>
                  </td>
                  <td className="p-4">{getTypeBadge(report.type)}</td>
                  <td className="p-4 text-sm text-muted-foreground">
                    {new Date(report.generatedAt).toLocaleDateString('en-AU', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="p-4 text-sm text-muted-foreground">{report.generatedBy}</td>
                  <td className="p-4">{getStatusBadge(report.status)}</td>
                  <td className="p-4 text-sm text-muted-foreground">{report.size}</td>
                  <td className="p-4">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={report.status !== 'ready'}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
