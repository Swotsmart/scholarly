'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, Calendar, CheckCircle, Clock, Loader2 } from 'lucide-react';
import { useHomeschool } from '@/hooks/use-homeschool';

const FALLBACK_REPORTS = [
  { id: 1, title: 'Term 1 Progress Report', date: '2026-03-15', status: 'completed', type: 'progress' },
  { id: 2, title: 'Annual Learning Summary', date: '2025-12-20', status: 'completed', type: 'summary' },
  { id: 3, title: 'Curriculum Compliance Report', date: '2026-01-10', status: 'completed', type: 'compliance' },
  { id: 4, title: 'Term 2 Progress Report', date: '2026-06-15', status: 'pending', type: 'progress' },
];

export default function HomeschoolReportsPage() {
  const { family, isLoading } = useHomeschool();

  // Derive report data from family compliance + children when available
  const reports = family
    ? (() => {
        const derived = [...FALLBACK_REPORTS];
        // Update compliance report with real data if available
        if (family.compliance) {
          const complianceIdx = derived.findIndex((r) => r.type === 'compliance');
          if (complianceIdx >= 0) {
            derived[complianceIdx] = {
              ...derived[complianceIdx],
              date: family.compliance.lastReportSubmitted ?? derived[complianceIdx].date,
              status: family.compliance.complianceScore >= 80 ? 'completed' : 'pending',
            };
          }
        }
        return derived;
      })()
    : FALLBACK_REPORTS;

  // Derive child summary for display
  const childSummary = family?.children?.map((c) => ({
    name: c.name,
    yearLevel: c.currentYearLevel,
    subjectsCount: c.subjectProgress?.length ?? 0,
  })) ?? null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Reports</h1>
          <p className="text-muted-foreground">Generate and download homeschool reports</p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Generate New Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-12 w-12 mx-auto rounded-lg bg-blue-500/10 flex items-center justify-center mb-3">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{reports.length}</p>
              <p className="text-sm text-muted-foreground">Total Reports</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-12 w-12 mx-auto rounded-lg bg-green-500/10 flex items-center justify-center mb-3">
                <CheckCircle className="h-6 w-6 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{reports.filter((r) => r.status === 'completed').length}</p>
              <p className="text-sm text-muted-foreground">Completed</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="h-12 w-12 mx-auto rounded-lg bg-orange-500/10 flex items-center justify-center mb-3">
                <Clock className="h-6 w-6 text-orange-500" />
              </div>
              <p className="text-2xl font-bold">{reports.filter((r) => r.status === 'pending').length}</p>
              <p className="text-sm text-muted-foreground">Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {childSummary && childSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Learner Summary</CardTitle>
            <CardDescription>Children included in reports</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              {childSummary.map((child) => (
                <div key={child.name} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="font-medium">{child.name}</p>
                    <p className="text-sm text-muted-foreground">{child.yearLevel}</p>
                  </div>
                  <span className="text-sm text-muted-foreground">{child.subjectsCount} subjects</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Report History</CardTitle>
          <CardDescription>View and download your reports</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{report.title}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{report.date}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${
                        report.status === 'completed'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                          : 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                  </div>
                </div>
                {report.status === 'completed' ? (
                  <Button variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" disabled>
                    Generating...
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
