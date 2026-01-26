'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ClipboardCheck,
  Calendar,
  ArrowRight,
} from 'lucide-react';
import Link from 'next/link';

const overallScore = 87;

const frameworks = [
  {
    id: 'fw-1',
    abbreviation: 'HES',
    name: 'Higher Education Standards',
    score: 92,
    totalRequirements: 49,
    metRequirements: 45,
    lastAudit: '15 Jan 2024',
    status: 'compliant' as const,
    color: 'green',
  },
  {
    id: 'fw-2',
    abbreviation: 'ACARA',
    name: 'Australian Curriculum',
    score: 88,
    totalRequirements: 177,
    metRequirements: 156,
    lastAudit: '10 Jan 2024',
    status: 'compliant' as const,
    color: 'green',
  },
  {
    id: 'fw-3',
    abbreviation: 'ST4S',
    name: 'Security Standards for Schools',
    score: 95,
    totalRequirements: 40,
    metRequirements: 38,
    lastAudit: '18 Jan 2024',
    status: 'compliant' as const,
    color: 'green',
  },
  {
    id: 'fw-4',
    abbreviation: 'AITSL',
    name: 'Australian Institute for Teaching and School Leadership',
    score: 78,
    totalRequirements: 32,
    metRequirements: 25,
    lastAudit: '8 Jan 2024',
    status: 'partial' as const,
    color: 'yellow',
  },
  {
    id: 'fw-5',
    abbreviation: 'AI Ethics',
    name: 'AI Ethics in Schools Framework',
    score: 85,
    totalRequirements: 20,
    metRequirements: 17,
    lastAudit: '12 Jan 2024',
    status: 'compliant' as const,
    color: 'green',
  },
];

const statusConfig = {
  compliant: { label: 'Compliant', icon: CheckCircle2, className: 'bg-green-500/10 text-green-700 border-green-200' },
  partial: { label: 'Partial', icon: AlertTriangle, className: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
  'non-compliant': { label: 'Non-Compliant', icon: XCircle, className: 'bg-red-500/10 text-red-700 border-red-200' },
};

export default function StandardsCompliancePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Standards Compliance</h1>
          <p className="text-muted-foreground">
            Monitor compliance with Australian education standards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/standards/audits">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              View Audits
            </Link>
          </Button>
          <Button>
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Audit
          </Button>
        </div>
      </div>

      {/* Overall Score */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="rounded-lg bg-green-500/10 p-4">
              <Shield className="h-10 w-10 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Overall Compliance Score</p>
              <div className="flex items-center gap-4">
                <p className="text-4xl font-bold text-green-600">{overallScore}%</p>
                <div className="flex-1 max-w-md">
                  <Progress value={overallScore} className="h-3" />
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on {frameworks.length} active compliance frameworks
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Framework Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {frameworks.map((framework) => {
          const config = statusConfig[framework.status];
          const StatusIcon = config.icon;

          return (
            <Card key={framework.id} className="relative overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs font-bold">
                    {framework.abbreviation}
                  </Badge>
                  <Badge className={config.className}>
                    <StatusIcon className="mr-1 h-3 w-3" />
                    {config.label}
                  </Badge>
                </div>
                <CardTitle className="text-base mt-2">{framework.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Compliance</span>
                    <span className={`font-bold ${
                      framework.score >= 90 ? 'text-green-600' :
                      framework.score >= 80 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {framework.score}%
                    </span>
                  </div>
                  <Progress
                    value={framework.score}
                    className="h-2"
                  />
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Requirements Met</span>
                  <span className="font-medium">
                    {framework.metRequirements} / {framework.totalRequirements}
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Last Audit</span>
                  <span className="font-medium">{framework.lastAudit}</span>
                </div>

                <Button variant="outline" size="sm" className="w-full">
                  <ClipboardCheck className="mr-2 h-4 w-4" />
                  Quick Audit
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Link href="/standards/audits">
          <Card className="cursor-pointer transition-shadow hover:shadow-lg">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <ClipboardCheck className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold">Audit History</h3>
                <p className="text-sm text-muted-foreground">
                  View past compliance audits and findings
                </p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <Shield className="h-6 w-6 text-purple-500" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Compliance Reports</h3>
              <p className="text-sm text-muted-foreground">
                Generate compliance reports for stakeholders
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
