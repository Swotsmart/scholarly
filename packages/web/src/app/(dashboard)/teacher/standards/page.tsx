'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  BookOpen,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Target,
  TrendingUp,
  ChevronRight,
  FileText,
} from 'lucide-react';

// Mock data
const curriculumAreas = [
  { id: 'english', name: 'English', standards: 45, covered: 32 },
  { id: 'maths', name: 'Mathematics', standards: 52, covered: 41 },
  { id: 'science', name: 'Science', standards: 38, covered: 28 },
  { id: 'tech', name: 'Design & Technology', standards: 24, covered: 20 },
  { id: 'hass', name: 'HASS', standards: 35, covered: 22 },
];

const standards = [
  {
    id: 's1',
    code: 'ACELY1709',
    description: 'Plan, draft and publish imaginative, informative and persuasive texts',
    area: 'English',
    yearLevel: 'Year 7',
    status: 'covered',
    lessons: 3,
  },
  {
    id: 's2',
    code: 'ACMNA188',
    description: 'Solve problems involving profit and loss, with and without digital technologies',
    area: 'Mathematics',
    yearLevel: 'Year 7',
    status: 'partial',
    lessons: 1,
  },
  {
    id: 's3',
    code: 'ACSSU116',
    description: 'Mixtures, including solutions, contain a combination of pure substances',
    area: 'Science',
    yearLevel: 'Year 7',
    status: 'not-started',
    lessons: 0,
  },
  {
    id: 's4',
    code: 'ACTDEK029',
    description: 'Investigate how forces and motion can be used in a designed solution',
    area: 'Design & Technology',
    yearLevel: 'Year 7-8',
    status: 'covered',
    lessons: 4,
  },
  {
    id: 's5',
    code: 'ACELY1723',
    description: 'Use a range of software to present texts in a variety of forms',
    area: 'English',
    yearLevel: 'Year 8',
    status: 'partial',
    lessons: 2,
  },
];

export default function TeacherStandardsPage() {
  const [selectedArea, setSelectedArea] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredStandards = standards.filter(s => {
    const matchesArea = selectedArea === 'all' || s.area.toLowerCase().includes(selectedArea);
    const matchesSearch = s.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesArea && matchesSearch;
  });

  const totalStandards = curriculumAreas.reduce((acc, area) => acc + area.standards, 0);
  const totalCovered = curriculumAreas.reduce((acc, area) => acc + area.covered, 0);
  const overallProgress = Math.round((totalCovered / totalStandards) * 100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Curriculum Standards</h1>
          <p className="text-muted-foreground">
            Track coverage of Australian Curriculum standards
          </p>
        </div>
        <Button>
          <FileText className="mr-2 h-4 w-4" />
          Generate Report
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Target className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStandards}</p>
                <p className="text-xs text-muted-foreground">Total Standards</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalCovered}</p>
                <p className="text-xs text-muted-foreground">Covered</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                <Clock className="h-5 w-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{totalStandards - totalCovered}</p>
                <p className="text-xs text-muted-foreground">Remaining</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{overallProgress}%</p>
                <p className="text-xs text-muted-foreground">Overall Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Coverage by Area */}
      <Card>
        <CardHeader>
          <CardTitle>Coverage by Learning Area</CardTitle>
          <CardDescription>Progress towards covering all curriculum standards</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {curriculumAreas.map(area => {
              const progress = Math.round((area.covered / area.standards) * 100);
              return (
                <div key={area.id} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{area.name}</span>
                    </div>
                    <span className="text-muted-foreground">
                      {area.covered}/{area.standards} standards ({progress}%)
                    </span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Search and Filter */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search standards by code or description..."
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={selectedArea} onValueChange={setSelectedArea}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by area" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Areas</SelectItem>
            <SelectItem value="english">English</SelectItem>
            <SelectItem value="math">Mathematics</SelectItem>
            <SelectItem value="science">Science</SelectItem>
            <SelectItem value="tech">Design & Technology</SelectItem>
            <SelectItem value="hass">HASS</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Standards List */}
      <Card>
        <CardHeader>
          <CardTitle>Standards</CardTitle>
          <CardDescription>Individual curriculum standards and their coverage status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredStandards.map(standard => (
              <div
                key={standard.id}
                className="flex items-center gap-4 rounded-lg border p-4 transition-colors hover:bg-muted/50 cursor-pointer"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm font-medium">{standard.code}</p>
                    <Badge variant="outline">{standard.yearLevel}</Badge>
                    <Badge
                      variant={
                        standard.status === 'covered'
                          ? 'default'
                          : standard.status === 'partial'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {standard.status === 'covered'
                        ? 'Covered'
                        : standard.status === 'partial'
                          ? 'Partial'
                          : 'Not Started'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                    {standard.description}
                  </p>
                </div>
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-medium">{standard.lessons} lessons</p>
                  <p className="text-xs text-muted-foreground">{standard.area}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
