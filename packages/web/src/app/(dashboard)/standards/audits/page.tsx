'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardCheck,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Calendar,
  FileText,
  Shield,
} from 'lucide-react';

const stats = [
  { label: 'Total Audits', value: '24', icon: ClipboardCheck, color: 'blue' },
  { label: 'Passed', value: '18', icon: CheckCircle2, color: 'green' },
  { label: 'Failed', value: '2', icon: XCircle, color: 'red' },
  { label: 'In Progress', value: '4', icon: Clock, color: 'orange' },
];

const audits = [
  {
    id: 'audit-1',
    framework: 'HES',
    auditor: 'Dr. Sarah Mitchell',
    date: '15 Jan 2024',
    status: 'passed' as const,
    findings: 4,
    criticalFindings: 0,
    requirements: [
      { id: 'r1', code: 'HES-1.1', description: 'Student governance and accountability', status: 'pass' as const, evidence: 'Policy document v3.2' },
      { id: 'r2', code: 'HES-1.2', description: 'Academic integrity framework', status: 'pass' as const, evidence: 'Framework published Aug 2023' },
      { id: 'r3', code: 'HES-1.3', description: 'Student complaints and appeals', status: 'partial' as const, evidence: 'Under review' },
      { id: 'r4', code: 'HES-2.1', description: 'Learning environment standards', status: 'pass' as const, evidence: 'Annual review completed' },
    ],
  },
  {
    id: 'audit-2',
    framework: 'ACARA',
    auditor: 'Prof. James O\'Brien',
    date: '10 Jan 2024',
    status: 'passed' as const,
    findings: 21,
    criticalFindings: 2,
    requirements: [
      { id: 'r5', code: 'ACARA-ENG-7', description: 'Year 7 English curriculum alignment', status: 'pass' as const, evidence: 'Curriculum mapping complete' },
      { id: 'r6', code: 'ACARA-MATH-10', description: 'Year 10 Mathematics alignment', status: 'fail' as const, evidence: 'Gap in statistics module' },
      { id: 'r7', code: 'ACARA-SCI-9', description: 'Year 9 Science alignment', status: 'pass' as const, evidence: 'Lab requirements verified' },
      { id: 'r8', code: 'ACARA-DT-11', description: 'Year 11 Design & Technology alignment', status: 'pass' as const, evidence: 'Alignment review Jan 2024' },
    ],
  },
  {
    id: 'audit-3',
    framework: 'ST4S',
    auditor: 'Michael Chen',
    date: '18 Jan 2024',
    status: 'passed' as const,
    findings: 2,
    criticalFindings: 0,
    requirements: [
      { id: 'r9', code: 'ST4S-SEC-01', description: 'Data encryption at rest', status: 'pass' as const, evidence: 'AES-256 verified' },
      { id: 'r10', code: 'ST4S-SEC-02', description: 'Data encryption in transit', status: 'pass' as const, evidence: 'TLS 1.3 enforced' },
      { id: 'r11', code: 'ST4S-ACC-01', description: 'Multi-factor authentication', status: 'pass' as const, evidence: 'MFA enabled school-wide' },
      { id: 'r12', code: 'ST4S-PRI-01', description: 'Student data privacy controls', status: 'partial' as const, evidence: 'Minor policy update needed' },
    ],
  },
  {
    id: 'audit-4',
    framework: 'AITSL',
    auditor: 'Dr. Karen Williams',
    date: '8 Jan 2024',
    status: 'in-progress' as const,
    findings: 7,
    criticalFindings: 1,
    requirements: [
      { id: 'r13', code: 'AITSL-1.1', description: 'Professional knowledge standards', status: 'pass' as const, evidence: 'PD records submitted' },
      { id: 'r14', code: 'AITSL-2.1', description: 'Professional practice standards', status: 'partial' as const, evidence: 'Observation records incomplete' },
      { id: 'r15', code: 'AITSL-3.1', description: 'Professional engagement standards', status: 'fail' as const, evidence: 'Community engagement lacking' },
      { id: 'r16', code: 'AITSL-4.1', description: 'Technology integration standards', status: 'pass' as const, evidence: 'Digital literacy verified' },
    ],
  },
  {
    id: 'audit-5',
    framework: 'AI Ethics',
    auditor: 'Dr. Lisa Park',
    date: '12 Jan 2024',
    status: 'passed' as const,
    findings: 3,
    criticalFindings: 0,
    requirements: [
      { id: 'r17', code: 'AIE-01', description: 'Transparency in AI decision-making', status: 'pass' as const, evidence: 'Explainability framework deployed' },
      { id: 'r18', code: 'AIE-02', description: 'Bias detection and mitigation', status: 'partial' as const, evidence: 'Quarterly reviews in place' },
      { id: 'r19', code: 'AIE-03', description: 'Student consent and data usage', status: 'pass' as const, evidence: 'Consent forms updated' },
      { id: 'r20', code: 'AIE-04', description: 'Human oversight requirements', status: 'pass' as const, evidence: 'Teacher review mandatory' },
    ],
  },
  {
    id: 'audit-6',
    framework: 'HES',
    auditor: 'Dr. Sarah Mitchell',
    date: '20 Oct 2023',
    status: 'passed' as const,
    findings: 6,
    criticalFindings: 1,
    requirements: [],
  },
  {
    id: 'audit-7',
    framework: 'ACARA',
    auditor: 'Prof. James O\'Brien',
    date: '15 Sep 2023',
    status: 'failed' as const,
    findings: 31,
    criticalFindings: 5,
    requirements: [],
  },
  {
    id: 'audit-8',
    framework: 'AITSL',
    auditor: 'Dr. Karen Williams',
    date: '5 Aug 2023',
    status: 'failed' as const,
    findings: 12,
    criticalFindings: 3,
    requirements: [],
  },
];

const statusConfig = {
  passed: { label: 'Passed', icon: CheckCircle2, className: 'bg-green-500/10 text-green-700 border-green-200' },
  failed: { label: 'Failed', icon: XCircle, className: 'bg-red-500/10 text-red-700 border-red-200' },
  'in-progress': { label: 'In Progress', icon: Clock, className: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
};

const requirementStatusConfig = {
  pass: { label: 'Pass', className: 'bg-green-500/10 text-green-700 border-green-200' },
  fail: { label: 'Fail', className: 'bg-red-500/10 text-red-700 border-red-200' },
  partial: { label: 'Partial', className: 'bg-yellow-500/10 text-yellow-700 border-yellow-200' },
  'not-applicable': { label: 'N/A', className: 'bg-gray-500/10 text-gray-700 border-gray-200' },
};

export default function ComplianceAuditsPage() {
  const [expandedAudit, setExpandedAudit] = useState<string | null>(null);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Compliance Audits</h1>
          <p className="text-muted-foreground">
            Review audit history and compliance findings
          </p>
        </div>
        <Button>
          <Calendar className="mr-2 h-4 w-4" />
          Schedule Audit
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Audit History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Audit History
          </CardTitle>
          <CardDescription>
            {audits.length} audits across all compliance frameworks
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b text-left text-sm text-muted-foreground">
                  <th className="pb-3 pr-4 font-medium">Framework</th>
                  <th className="pb-3 pr-4 font-medium">Auditor</th>
                  <th className="pb-3 pr-4 font-medium">Date</th>
                  <th className="pb-3 pr-4 font-medium">Status</th>
                  <th className="pb-3 pr-4 font-medium text-center">Findings</th>
                  <th className="pb-3 pr-4 font-medium text-center">Critical</th>
                  <th className="pb-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {audits.map((audit) => {
                  const config = statusConfig[audit.status];
                  const StatusIcon = config.icon;
                  const isExpanded = expandedAudit === audit.id;

                  return (
                    <>
                      <tr key={audit.id} className="text-sm">
                        <td className="py-4 pr-4">
                          <Badge variant="outline" className="font-bold">
                            {audit.framework}
                          </Badge>
                        </td>
                        <td className="py-4 pr-4">
                          <p className="font-medium">{audit.auditor}</p>
                        </td>
                        <td className="py-4 pr-4">
                          <p className="text-muted-foreground">{audit.date}</p>
                        </td>
                        <td className="py-4 pr-4">
                          <Badge className={config.className}>
                            <StatusIcon className="mr-1 h-3 w-3" />
                            {config.label}
                          </Badge>
                        </td>
                        <td className="py-4 pr-4 text-center">
                          <span className="font-medium">{audit.findings}</span>
                        </td>
                        <td className="py-4 pr-4 text-center">
                          <span className={`font-medium ${audit.criticalFindings > 0 ? 'text-red-600' : 'text-muted-foreground'}`}>
                            {audit.criticalFindings}
                          </span>
                        </td>
                        <td className="py-4">
                          {audit.requirements.length > 0 ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setExpandedAudit(isExpanded ? null : audit.id)}
                            >
                              {isExpanded ? (
                                <>
                                  <ChevronUp className="mr-1 h-3 w-3" />
                                  Hide
                                </>
                              ) : (
                                <>
                                  <ChevronDown className="mr-1 h-3 w-3" />
                                  Details
                                </>
                              )}
                            </Button>
                          ) : (
                            <Button variant="ghost" size="sm" disabled>
                              No Details
                            </Button>
                          )}
                        </td>
                      </tr>
                      {isExpanded && audit.requirements.length > 0 && (
                        <tr key={`${audit.id}-details`}>
                          <td colSpan={7} className="pb-4">
                            <div className="ml-4 rounded-lg border bg-muted/30 p-4">
                              <div className="mb-3 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-muted-foreground" />
                                <p className="text-sm font-medium">Requirement Checklist</p>
                              </div>
                              <div className="space-y-2">
                                {audit.requirements.map((req) => {
                                  const reqConfig = requirementStatusConfig[req.status];
                                  return (
                                    <div
                                      key={req.id}
                                      className="flex items-center justify-between rounded-lg border bg-background p-3"
                                    >
                                      <div className="flex items-center gap-3">
                                        <Badge variant="outline" className="text-xs font-mono">
                                          {req.code}
                                        </Badge>
                                        <p className="text-sm">{req.description}</p>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {req.evidence && (
                                          <span className="text-xs text-muted-foreground">
                                            {req.evidence}
                                          </span>
                                        )}
                                        <Badge className={reqConfig.className}>
                                          {reqConfig.label}
                                        </Badge>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
