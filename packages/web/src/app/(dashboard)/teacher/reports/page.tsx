'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  Download,
  FileText,
  Users,
  TrendingUp,
  Calendar,
  Printer,
} from 'lucide-react';

const reportTypes = [
  {
    id: 'progress',
    title: 'Class Progress Report',
    description: 'Overview of student progress across all challenges',
    icon: TrendingUp,
    lastGenerated: '2024-01-20',
  },
  {
    id: 'engagement',
    title: 'Engagement Analytics',
    description: 'Student activity and participation metrics',
    icon: BarChart3,
    lastGenerated: '2024-01-19',
  },
  {
    id: 'peer-review',
    title: 'Peer Review Summary',
    description: 'Analysis of peer review quality and completion',
    icon: Users,
    lastGenerated: '2024-01-18',
  },
  {
    id: 'completion',
    title: 'Challenge Completion Report',
    description: 'Status of all student journeys per challenge',
    icon: FileText,
    lastGenerated: '2024-01-15',
  },
];

const classStats = [
  { class: 'Year 10 Design & Tech', students: 28, avgProgress: 45, completionRate: 14 },
  { class: 'Year 11 Innovation', students: 24, avgProgress: 32, completionRate: 8 },
  { class: 'Year 12 Project', students: 18, avgProgress: 68, completionRate: 44 },
];

export default function TeacherReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Reports & Analytics</h1>
          <p className="text-muted-foreground">
            Generate and view reports on student progress and engagement
          </p>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">70</p>
                <p className="text-sm text-muted-foreground">Total Students</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-green-500/10 p-3">
                <TrendingUp className="h-6 w-6 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">48%</p>
                <p className="text-sm text-muted-foreground">Avg. Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">156</p>
                <p className="text-sm text-muted-foreground">Artifacts Created</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="rounded-lg bg-purple-500/10 p-3">
                <BarChart3 className="h-6 w-6 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">22%</p>
                <p className="text-sm text-muted-foreground">Completion Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Report Types */}
      <div className="grid gap-4 md:grid-cols-2">
        {reportTypes.map((report) => {
          const Icon = report.icon;
          return (
            <Card key={report.id}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{report.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {report.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Last generated: {new Date(report.lastGenerated).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button size="sm">
                    Generate New
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Class Summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Class Summary</CardTitle>
              <CardDescription>Overview of all your classes</CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Printer className="mr-2 h-4 w-4" />
              Print Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="p-3 text-left font-medium">Class</th>
                <th className="p-3 text-left font-medium">Students</th>
                <th className="p-3 text-left font-medium">Avg. Progress</th>
                <th className="p-3 text-left font-medium">Completion Rate</th>
                <th className="p-3 text-left font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {classStats.map((cls) => (
                <tr key={cls.class} className="border-b">
                  <td className="p-3 font-medium">{cls.class}</td>
                  <td className="p-3">{cls.students}</td>
                  <td className="p-3">
                    <Badge variant={cls.avgProgress > 50 ? 'success' : 'secondary'}>
                      {cls.avgProgress}%
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Badge variant={cls.completionRate > 30 ? 'success' : 'secondary'}>
                      {cls.completionRate}%
                    </Badge>
                  </td>
                  <td className="p-3">
                    <Button size="sm" variant="outline">View Details</Button>
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
