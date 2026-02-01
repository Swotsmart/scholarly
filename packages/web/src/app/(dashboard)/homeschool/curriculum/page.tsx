'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageHeader, StatsCard } from '@/components/shared';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  Clock,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Printer,
  Download,
  LinkIcon,
  FileText,
  ChevronRight,
  ExternalLink,
  Target,
  ArrowRight,
  Calendar,
  GraduationCap,
} from 'lucide-react';
import { subjects, resources } from '@/lib/homeschool-api';

// Year level data
const yearLevels = [
  { value: 'year5', label: 'Year 5' },
  { value: 'year6', label: 'Year 6' },
  { value: 'year7', label: 'Year 7' },
  { value: 'year8', label: 'Year 8' },
];

// Term data with specific units
const termData = {
  term1: {
    label: 'Term 1',
    dates: '29 Jan - 12 Apr 2026',
    weeks: 11,
    subjects: subjects.map((s) => ({
      ...s,
      termProgress: Math.round(s.progress * 0.95),
      termUnits: s.units.slice(0, 2),
      linkedResources: resources.filter((r) => r.subject === s.name).slice(0, 2),
    })),
  },
  term2: {
    label: 'Term 2',
    dates: '28 Apr - 4 Jul 2026',
    weeks: 10,
    subjects: subjects.map((s) => ({
      ...s,
      termProgress: Math.round(s.progress * 0.7),
      termUnits: s.units.slice(1, 3),
      linkedResources: resources.filter((r) => r.subject === s.name).slice(0, 2),
    })),
  },
  term3: {
    label: 'Term 3',
    dates: '21 Jul - 26 Sep 2026',
    weeks: 10,
    subjects: subjects.map((s) => ({
      ...s,
      termProgress: Math.round(s.progress * 0.4),
      termUnits: s.units.slice(2, 4) || s.units.slice(0, 2),
      linkedResources: resources.filter((r) => r.subject === s.name).slice(0, 2),
    })),
  },
  term4: {
    label: 'Term 4',
    dates: '13 Oct - 18 Dec 2026',
    weeks: 10,
    subjects: subjects.map((s) => ({
      ...s,
      termProgress: 0,
      termUnits: s.units.slice(-2),
      linkedResources: resources.filter((r) => r.subject === s.name).slice(0, 2),
    })),
  },
};

const subjectColorMap: Record<string, { bg: string; text: string; border: string }> = {
  Mathematics: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  English: { bg: 'bg-green-500/10', text: 'text-green-600', border: 'border-green-500/30' },
  Science: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30' },
  HASS: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
  Technologies: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/30' },
  Arts: { bg: 'bg-pink-500/10', text: 'text-pink-600', border: 'border-pink-500/30' },
};

const overallCoverage = Math.round(
  subjects.reduce((sum, s) => sum + s.standardsCoverage, 0) / subjects.length
);

function SubjectCard({
  subject,
  onLinkResources,
}: {
  subject: (typeof termData)['term1']['subjects'][0];
  onLinkResources: () => void;
}) {
  const colors = subjectColorMap[subject.name] || {
    bg: 'bg-gray-500/10',
    text: 'text-gray-600',
    border: 'border-gray-500/30',
  };

  return (
    <Card className={`overflow-hidden border-l-4 ${colors.border}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-lg">{subject.name}</CardTitle>
            <CardDescription className="flex items-center gap-2 mt-1">
              <Clock className="h-3 w-3" />
              {subject.hoursPerWeek} hrs/week
            </CardDescription>
          </div>
          <Badge className={`${colors.bg} ${colors.text}`}>Year {subject.yearLevel}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* ACARA Alignment */}
        <div className="flex items-center gap-2 rounded-lg bg-muted/50 p-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-xs font-medium">{subject.acaraAlignment}</span>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Term Progress</span>
            <span className="font-medium">{subject.termProgress}%</span>
          </div>
          <Progress value={subject.termProgress} className="h-2" />
        </div>

        {/* Units for this term */}
        <div>
          <p className="mb-2 text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-muted-foreground" />
            Units This Term
          </p>
          <ul className="space-y-1">
            {subject.termUnits.map((unit) => (
              <li key={unit} className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                {unit}
              </li>
            ))}
          </ul>
        </div>

        {/* Standards Coverage */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Standards Coverage</span>
            <span className="font-medium">{subject.standardsCoverage}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted">
            <div
              className="h-1.5 rounded-full bg-primary"
              style={{ width: `${subject.standardsCoverage}%` }}
            />
          </div>
        </div>

        {/* Linked Resources */}
        {subject.linkedResources.length > 0 && (
          <div>
            <p className="mb-2 text-sm font-medium flex items-center gap-2">
              <LinkIcon className="h-4 w-4 text-muted-foreground" />
              Linked Resources
            </p>
            <div className="space-y-1">
              {subject.linkedResources.map((resource) => (
                <div
                  key={resource.id}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ExternalLink className="h-3 w-3" />
                  <span className="truncate">{resource.title}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onLinkResources}>
            <LinkIcon className="mr-1 h-3 w-3" />
            Link Resources
          </Button>
          <Button size="sm" className="flex-1" asChild>
            <Link href={`/homeschool/curriculum/${subject.id}`}>
              Edit Plan
              <ChevronRight className="ml-1 h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function CurriculumPage() {
  const [selectedYear, setSelectedYear] = useState('year5');
  const [activeTerm, setActiveTerm] = useState('term1');

  const currentTermData = termData[activeTerm as keyof typeof termData];

  // Calculate term stats
  const termAvgProgress = Math.round(
    currentTermData.subjects.reduce((sum, s) => sum + s.termProgress, 0) /
      currentTermData.subjects.length
  );

  const handlePrintPlan = () => {
    window.print();
  };

  const handleExportPlan = () => {
    // In a real app, this would generate a PDF or export
    alert('Plan exported successfully!');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Curriculum Planner"
        description="Plan and track ACARA-aligned learning across all subjects"
        actions={
          <div className="flex items-center gap-2">
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[120px]">
                <GraduationCap className="mr-2 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearLevels.map((year) => (
                  <SelectItem key={year.value} value={year.value}>
                    {year.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handlePrintPlan}>
              <Printer className="mr-2 h-4 w-4" />
              Print Plan
            </Button>
            <Button variant="outline" onClick={handleExportPlan}>
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Subject
            </Button>
          </div>
        }
      />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatsCard
          label="Overall ACARA Coverage"
          value={`${overallCoverage}%`}
          icon={ShieldCheck}
          variant="primary"
          change={3}
        />
        <StatsCard
          label="Active Subjects"
          value={subjects.length}
          icon={BookOpen}
          variant="success"
        />
        <StatsCard
          label="Current Term Progress"
          value={`${termAvgProgress}%`}
          icon={Target}
          variant="warning"
        />
        <StatsCard
          label="Linked Resources"
          value={resources.length}
          icon={LinkIcon}
          variant="primary"
        />
      </div>

      {/* Overall Standards Coverage Banner */}
      <Card className="bg-gradient-to-r from-primary/5 via-primary/10 to-transparent">
        <CardContent className="flex items-center gap-6 p-6">
          <div className="rounded-lg bg-primary/10 p-4">
            <ShieldCheck className="h-8 w-8 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-lg">Overall ACARA Standards Coverage</p>
                <p className="text-sm text-muted-foreground">
                  Across all {subjects.length} subjects for{' '}
                  {yearLevels.find((y) => y.value === selectedYear)?.label}
                </p>
              </div>
              <p className="text-3xl font-bold">{overallCoverage}%</p>
            </div>
            <Progress value={overallCoverage} className="h-3" />
          </div>
        </CardContent>
      </Card>

      {/* Term Tabs */}
      <Tabs value={activeTerm} onValueChange={setActiveTerm}>
        <div className="flex items-center justify-between">
          <TabsList>
            {Object.entries(termData).map(([key, term]) => (
              <TabsTrigger key={key} value={key} className="gap-2">
                {term.label}
                {key === 'term1' && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    Current
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>{currentTermData.dates}</span>
            <span className="text-muted-foreground/50">|</span>
            <span>{currentTermData.weeks} weeks</span>
          </div>
        </div>

        {Object.entries(termData).map(([key, term]) => (
          <TabsContent key={key} value={key} className="mt-6">
            {/* Term Overview */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="rounded-lg bg-primary/10 p-2">
                      <Calendar className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">
                        {term.label}: {term.dates}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {term.weeks} weeks - {term.subjects.length} subjects
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">Term Progress</p>
                      <p className="text-xl font-bold">
                        {Math.round(
                          term.subjects.reduce((sum, s) => sum + s.termProgress, 0) /
                            term.subjects.length
                        )}
                        %
                      </p>
                    </div>
                    <Button variant="outline" size="sm">
                      <FileText className="mr-2 h-4 w-4" />
                      View Term Report
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subject Cards Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {term.subjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onLinkResources={() => {
                    // Handle resource linking
                  }}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Print-Ready Plan Section */}
      <Card className="print:block hidden">
        <CardHeader>
          <CardTitle>
            Curriculum Plan - {yearLevels.find((y) => y.value === selectedYear)?.label}
          </CardTitle>
          <CardDescription>
            {currentTermData.label}: {currentTermData.dates}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {currentTermData.subjects.map((subject) => (
              <div key={subject.id} className="border-b pb-4">
                <h3 className="font-semibold">{subject.name}</h3>
                <p className="text-sm text-muted-foreground">{subject.acaraAlignment}</p>
                <p className="text-sm">
                  Hours/week: {subject.hoursPerWeek} | Coverage: {subject.standardsCoverage}%
                </p>
                <p className="text-sm">Units: {subject.termUnits.join(', ')}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <Link href="/homeschool/resources">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-green-500/10 p-3">
                <BookOpen className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Resource Library</p>
                <p className="text-sm text-muted-foreground">Browse and link resources</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <Link href="/homeschool/standards">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <ShieldCheck className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">ACARA Standards</p>
                <p className="text-sm text-muted-foreground">View all content descriptions</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>

        <Card className="cursor-pointer transition-shadow hover:shadow-lg">
          <Link href="/homeschool/reports">
            <CardContent className="flex items-center gap-4 p-6">
              <div className="rounded-lg bg-purple-500/10 p-3">
                <FileText className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <p className="font-semibold">Progress Reports</p>
                <p className="text-sm text-muted-foreground">Generate compliance reports</p>
              </div>
              <ArrowRight className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Link>
        </Card>
      </div>
    </div>
  );
}
