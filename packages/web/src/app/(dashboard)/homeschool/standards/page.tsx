'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, CheckCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';
import { useHomeschool } from '@/hooks/use-homeschool';

const FALLBACK_STANDARDS = [
  { area: 'English', coverage: 85, aligned: 12, total: 15, status: 'good' },
  { area: 'Mathematics', coverage: 92, aligned: 18, total: 20, status: 'excellent' },
  { area: 'Science', coverage: 70, aligned: 8, total: 12, status: 'attention' },
  { area: 'HASS', coverage: 78, aligned: 7, total: 9, status: 'good' },
];

function deriveStandardStatus(coverage: number): string {
  if (coverage >= 90) return 'excellent';
  if (coverage >= 75) return 'good';
  return 'attention';
}

export default function HomeschoolStandardsPage() {
  const { family, isLoading } = useHomeschool();

  // Derive standards coverage per subject across all children
  const standards = family?.children?.length
    ? (() => {
        const subjectMap = new Map<string, { completed: number; total: number }>();
        for (const child of family.children) {
          for (const sp of child.subjectProgress ?? []) {
            const existing = subjectMap.get(sp.subject);
            if (existing) {
              existing.completed += sp.completedCodes.length;
              existing.total += sp.curriculumCodes.length;
            } else {
              subjectMap.set(sp.subject, {
                completed: sp.completedCodes.length,
                total: sp.curriculumCodes.length,
              });
            }
          }
        }
        if (subjectMap.size === 0) return FALLBACK_STANDARDS;
        return Array.from(subjectMap.entries()).map(([area, { completed, total }]) => {
          const coverage = total > 0 ? Math.round((completed / total) * 100) : 0;
          return {
            area,
            coverage,
            aligned: completed,
            total,
            status: deriveStandardStatus(coverage),
          };
        });
      })()
    : FALLBACK_STANDARDS;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'excellent': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'good': return <CheckCircle className="h-5 w-5 text-blue-500" />;
      case 'attention': return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default: return <Info className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Curriculum Standards</h1>
        <p className="text-muted-foreground">Track alignment with Australian Curriculum</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Overall Compliance
          </CardTitle>
          <CardDescription>Your curriculum coverage across all learning areas</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const totalAligned = standards.reduce((s, st) => s + st.aligned, 0);
            const totalStandards = standards.reduce((s, st) => s + st.total, 0);
            const overallPct = totalStandards > 0 ? Math.round((totalAligned / totalStandards) * 100) : 0;
            const complianceScore = family?.compliance?.complianceScore ?? overallPct;
            return (
              <>
                <div className="flex items-center gap-4 mb-6">
                  <div className="text-4xl font-bold">{complianceScore}%</div>
                  <div className="text-sm text-muted-foreground">
                    <p>{totalAligned} of {totalStandards} standards covered</p>
                    <p className="text-green-500">
                      {complianceScore >= 70 ? 'Meeting registration requirements' : 'Below compliance threshold'}
                    </p>
                  </div>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div className="bg-primary h-3 rounded-full" style={{ width: `${complianceScore}%` }} />
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {standards.map((standard) => (
          <Card key={standard.area}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{standard.area}</CardTitle>
                {getStatusIcon(standard.status)}
              </div>
              <CardDescription>
                {standard.aligned} of {standard.total} standards aligned
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Coverage</span>
                  <span className="font-medium">{standard.coverage}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      standard.status === 'excellent' ? 'bg-green-500' :
                      standard.status === 'good' ? 'bg-blue-500' : 'bg-orange-500'
                    }`}
                    style={{ width: `${standard.coverage}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Standards Gap Analysis</CardTitle>
          <CardDescription>Areas that need additional attention</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">Science - Earth and Space</p>
                <p className="text-sm text-muted-foreground">2 standards need additional activities</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">Science - Biological Sciences</p>
                <p className="text-sm text-muted-foreground">1 standard needs assessment evidence</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
