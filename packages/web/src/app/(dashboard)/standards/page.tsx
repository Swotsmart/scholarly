'use client';

/**
 * Standards Compliance Dashboard
 * Monitor compliance across ACARA, AITSL, EYLF, EYFS, and HES/TEQSA frameworks
 */

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ClipboardCheck,
  Calendar,
  Download,
  FileText,
  Lightbulb,
  ArrowRight,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import type { ComplianceFramework } from '@/types/standards';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

interface ExtendedFramework extends ComplianceFramework {
  color: 'green' | 'amber' | 'red';
  description: string;
  gaps: GapItem[];
  recommendations: Recommendation[];
}

interface GapItem {
  id: string;
  code: string;
  requirement: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

interface Recommendation {
  id: string;
  action: string;
  impact: string;
  effort: 'low' | 'medium' | 'high';
}

const frameworks: Record<string, ExtendedFramework> = {
  acara: {
    id: 'fw-acara',
    abbreviation: 'ACARA',
    name: 'Australian Curriculum',
    version: '9.0',
    complianceScore: 88,
    totalRequirements: 177,
    metRequirements: 156,
    lastAudit: '10 Jan 2024',
    status: 'compliant',
    color: 'green',
    description: 'Australian Curriculum, Assessment and Reporting Authority standards for K-12 education.',
    gaps: [
      { id: 'g1', code: 'ACARA-SC-7.2', requirement: 'Science inquiry skills Year 7-10', priority: 'medium' },
      { id: 'g2', code: 'ACARA-MA-9.3', requirement: 'Mathematics reasoning proficiency', priority: 'high' },
      { id: 'g3', code: 'ACARA-EN-8.1', requirement: 'English text analysis criteria', priority: 'low' },
    ],
    recommendations: [
      { id: 'r1', action: 'Update science assessment rubrics to include inquiry skills', impact: '+3% compliance', effort: 'medium' },
      { id: 'r2', action: 'Add reasoning evidence to maths portfolios', impact: '+5% compliance', effort: 'low' },
    ],
  },
  aitsl: {
    id: 'fw-aitsl',
    abbreviation: 'AITSL',
    name: 'Australian Professional Standards for Teachers',
    version: '2.0',
    complianceScore: 78,
    totalRequirements: 32,
    metRequirements: 25,
    lastAudit: '8 Jan 2024',
    status: 'partial',
    color: 'amber',
    description: 'Professional standards for teachers set by the Australian Institute for Teaching and School Leadership.',
    gaps: [
      { id: 'g4', code: 'AITSL-3.2', requirement: 'Plan, structure and sequence learning programs', priority: 'high' },
      { id: 'g5', code: 'AITSL-5.1', requirement: 'Assess student learning', priority: 'critical' },
      { id: 'g6', code: 'AITSL-6.3', requirement: 'Engage with colleagues and improve practice', priority: 'medium' },
      { id: 'g7', code: 'AITSL-7.2', requirement: 'Comply with legislative requirements', priority: 'high' },
    ],
    recommendations: [
      { id: 'r3', action: 'Implement lesson planning templates with sequencing', impact: '+8% compliance', effort: 'medium' },
      { id: 'r4', action: 'Enable peer review features in assessment module', impact: '+6% compliance', effort: 'high' },
      { id: 'r5', action: 'Add compliance tracking for teacher certifications', impact: '+5% compliance', effort: 'low' },
    ],
  },
  eylf: {
    id: 'fw-eylf',
    abbreviation: 'EYLF',
    name: 'Early Years Learning Framework',
    version: '2.0',
    complianceScore: 92,
    totalRequirements: 45,
    metRequirements: 41,
    lastAudit: '12 Jan 2024',
    status: 'compliant',
    color: 'green',
    description: 'National framework for early childhood educators in Australia (Belonging, Being, Becoming).',
    gaps: [
      { id: 'g8', code: 'EYLF-4.1', requirement: 'Children develop dispositions for learning', priority: 'medium' },
      { id: 'g9', code: 'EYLF-5.3', requirement: 'Children express ideas using media', priority: 'low' },
    ],
    recommendations: [
      { id: 'r6', action: 'Add learning disposition tracking to observations', impact: '+4% compliance', effort: 'low' },
      { id: 'r7', action: 'Include media expression activities in curriculum', impact: '+2% compliance', effort: 'low' },
    ],
  },
  eyfs: {
    id: 'fw-eyfs',
    abbreviation: 'EYFS',
    name: 'Early Years Foundation Stage',
    version: '2024',
    complianceScore: 85,
    totalRequirements: 52,
    metRequirements: 44,
    lastAudit: '15 Jan 2024',
    status: 'compliant',
    color: 'green',
    description: 'UK statutory framework for early years providers setting standards for learning and development.',
    gaps: [
      { id: 'g10', code: 'EYFS-3.4', requirement: 'Staff qualifications and ratios', priority: 'critical' },
      { id: 'g11', code: 'EYFS-2.1', requirement: 'Communication and language development', priority: 'high' },
      { id: 'g12', code: 'EYFS-3.6', requirement: 'Risk assessment procedures', priority: 'medium' },
    ],
    recommendations: [
      { id: 'r8', action: 'Document staff qualification verification process', impact: '+6% compliance', effort: 'medium' },
      { id: 'r9', action: 'Add language milestone tracking features', impact: '+4% compliance', effort: 'medium' },
    ],
  },
  hes: {
    id: 'fw-hes',
    abbreviation: 'HES/TEQSA',
    name: 'Higher Education Standards',
    version: '2021',
    complianceScore: 72,
    totalRequirements: 49,
    metRequirements: 35,
    lastAudit: '5 Jan 2024',
    status: 'partial',
    color: 'amber',
    description: 'Tertiary Education Quality and Standards Agency framework for higher education providers.',
    gaps: [
      { id: 'g13', code: 'HES-1.4', requirement: 'Academic governance structures', priority: 'critical' },
      { id: 'g14', code: 'HES-2.1', requirement: 'Course design and approval', priority: 'critical' },
      { id: 'g15', code: 'HES-3.2', requirement: 'Research training environment', priority: 'high' },
      { id: 'g16', code: 'HES-4.1', requirement: 'Corporate governance', priority: 'high' },
      { id: 'g17', code: 'HES-5.3', requirement: 'Institutional quality assurance', priority: 'medium' },
    ],
    recommendations: [
      { id: 'r10', action: 'Implement academic board workflow module', impact: '+10% compliance', effort: 'high' },
      { id: 'r11', action: 'Add course approval tracking system', impact: '+8% compliance', effort: 'high' },
      { id: 'r12', action: 'Enable research supervision logging', impact: '+5% compliance', effort: 'medium' },
    ],
  },
};

const overallScore = Math.round(
  Object.values(frameworks).reduce((sum, fw) => sum + fw.complianceScore, 0) / Object.keys(frameworks).length
);

const priorityColors = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  high: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  medium: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  low: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
};

const effortColors = {
  low: 'text-green-600',
  medium: 'text-amber-600',
  high: 'text-red-600',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function StandardsCompliancePage() {
  const [activeFramework, setActiveFramework] = useState('acara');
  const currentFramework = frameworks[activeFramework];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-amber-600';
    return 'text-red-600';
  };

  const getProgressColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-amber-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Compliance Dashboard</h1>
          <p className="text-muted-foreground">
            Monitor compliance across Australian and international education standards
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/standards/audits">
              <ClipboardCheck className="mr-2 h-4 w-4" />
              View Audits
            </Link>
          </Button>
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Evidence Pack
          </Button>
          <Button>
            <Calendar className="mr-2 h-4 w-4" />
            Schedule Audit
          </Button>
        </div>
      </div>

      {/* Overall Score Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-6">
            <div className="rounded-lg bg-green-500/10 p-4">
              <Shield className="h-10 w-10 text-green-500" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Overall Compliance Score</p>
              <div className="flex items-center gap-4">
                <p className={`text-4xl font-bold ${getScoreColor(overallScore)}`}>{overallScore}%</p>
                <div className="flex-1 max-w-md">
                  <Progress value={overallScore} className="h-3" indicatorClassName={getProgressColor(overallScore)} />
                </div>
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                Based on {Object.keys(frameworks).length} active compliance frameworks
              </p>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh Scores
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Framework Tabs */}
      <Tabs value={activeFramework} onValueChange={setActiveFramework}>
        <TabsList className="grid w-full grid-cols-5">
          {Object.entries(frameworks).map(([key, fw]) => (
            <TabsTrigger key={key} value={key} className="gap-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  fw.status === 'compliant' ? 'bg-green-500' :
                  fw.status === 'partial' ? 'bg-amber-500' : 'bg-red-500'
                }`}
              />
              {fw.abbreviation}
            </TabsTrigger>
          ))}
        </TabsList>

        {Object.entries(frameworks).map(([key, fw]) => (
          <TabsContent key={key} value={key} className="space-y-6">
            {/* Framework Overview */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Score Card */}
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{fw.name}</CardTitle>
                    <StatusBadge status={fw.status} showDot />
                  </div>
                  <CardDescription>{fw.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Coverage</span>
                      <span className={`font-bold ${getScoreColor(fw.complianceScore)}`}>
                        {fw.complianceScore}%
                      </span>
                    </div>
                    <Progress
                      value={fw.complianceScore}
                      className="h-3"
                      indicatorClassName={getProgressColor(fw.complianceScore)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Requirements Met</p>
                      <p className="text-lg font-semibold">
                        {fw.metRequirements} / {fw.totalRequirements}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Audit</p>
                      <p className="text-lg font-semibold">{fw.lastAudit}</p>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Version: {fw.version}
                  </div>
                </CardContent>
              </Card>

              {/* Gaps Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5 text-amber-500" />
                    Compliance Gaps
                  </CardTitle>
                  <CardDescription>
                    {fw.gaps.length} requirements need attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fw.gaps.slice(0, 4).map((gap) => (
                      <div
                        key={gap.id}
                        className="flex items-start justify-between rounded-lg border p-3"
                      >
                        <div className="space-y-1">
                          <code className="text-xs font-medium">{gap.code}</code>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {gap.requirement}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${priorityColors[gap.priority]}`}>
                          {gap.priority}
                        </span>
                      </div>
                    ))}
                    {fw.gaps.length > 4 && (
                      <Button variant="ghost" size="sm" className="w-full">
                        View all {fw.gaps.length} gaps
                        <ChevronRight className="ml-1 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Recommendations Card */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Lightbulb className="h-5 w-5 text-blue-500" />
                    Remediation Actions
                  </CardTitle>
                  <CardDescription>
                    Recommended steps to improve compliance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {fw.recommendations.map((rec) => (
                      <div
                        key={rec.id}
                        className="rounded-lg border p-3 space-y-2"
                      >
                        <p className="text-sm font-medium">{rec.action}</p>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-green-600 font-medium">{rec.impact}</span>
                          <span className={`${effortColors[rec.effort]}`}>
                            Effort: {rec.effort}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-blue-500/10 p-3">
                    <ClipboardCheck className="h-6 w-6 text-blue-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Run Quick Audit</h3>
                    <p className="text-sm text-muted-foreground">
                      Automated compliance check for {fw.abbreviation}
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>

              <Card className="cursor-pointer transition-shadow hover:shadow-lg">
                <CardContent className="flex items-center gap-4 p-6">
                  <div className="rounded-lg bg-purple-500/10 p-3">
                    <FileText className="h-6 w-6 text-purple-500" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold">Generate Evidence Pack</h3>
                    <p className="text-sm text-muted-foreground">
                      Export documentation for {fw.abbreviation} audit
                    </p>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground" />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        {Object.entries(frameworks).map(([key, fw]) => (
          <Card
            key={key}
            className={`cursor-pointer transition-all ${
              activeFramework === key ? 'ring-2 ring-primary' : 'hover:shadow-md'
            }`}
            onClick={() => setActiveFramework(key)}
          >
            <CardContent className="p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                {fw.status === 'compliant' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {fw.status === 'partial' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                {fw.status === 'non-compliant' && <XCircle className="h-4 w-4 text-red-500" />}
                <span className="font-semibold">{fw.abbreviation}</span>
              </div>
              <p className={`text-2xl font-bold ${getScoreColor(fw.complianceScore)}`}>
                {fw.complianceScore}%
              </p>
              <Progress
                value={fw.complianceScore}
                className="h-1.5 mt-2"
                indicatorClassName={getProgressColor(fw.complianceScore)}
              />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
