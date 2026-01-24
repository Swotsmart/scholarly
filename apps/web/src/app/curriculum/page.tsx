'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  BookOpen,
  ChevronRight,
  Filter,
  GraduationCap,
  Layers,
  Tag,
  FileText,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { DashboardLayout } from '@/components/layout/dashboard-layout';
import { api, CurriculumStandard, PaginatedResponse } from '@/lib/api';

const learningAreas = [
  'All Learning Areas',
  'English',
  'Mathematics',
  'Science',
  'Humanities and Social Sciences',
  'The Arts',
  'Technologies',
  'Health and Physical Education',
  'Languages',
];

const yearLevels = [
  'All Year Levels',
  'Foundation',
  'Year 1',
  'Year 2',
  'Year 3',
  'Year 4',
  'Year 5',
  'Year 6',
  'Year 7',
  'Year 8',
  'Year 9',
  'Year 10',
];

const generalCapabilities = [
  'Literacy',
  'Numeracy',
  'ICT Capability',
  'Critical and Creative Thinking',
  'Personal and Social Capability',
  'Ethical Understanding',
  'Intercultural Understanding',
];

const crossCurriculumPriorities = [
  'Aboriginal and Torres Strait Islander Histories and Cultures',
  'Asia and Australia\'s Engagement with Asia',
  'Sustainability',
];

export default function CurriculumPage() {
  const [search, setSearch] = useState('');
  const [learningArea, setLearningArea] = useState('All Learning Areas');
  const [yearLevel, setYearLevel] = useState('All Year Levels');
  const [activeTab, setActiveTab] = useState('standards');

  const { data, isLoading } = useQuery({
    queryKey: ['curriculum', search, learningArea, yearLevel],
    queryFn: () =>
      api.get<PaginatedResponse<CurriculumStandard>>('/curriculum/standards', {
        search: search || undefined,
        learningArea: learningArea !== 'All Learning Areas' ? learningArea : undefined,
        yearLevel: yearLevel !== 'All Year Levels' ? yearLevel : undefined,
      }),
  });

  const standards = data?.data ?? [];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Curriculum Curator</h1>
            <p className="text-muted-foreground">
              Browse and align with the Australian Curriculum (ACARA) v9.0
            </p>
          </div>
          <Badge variant="outline" className="w-fit">
            <BookOpen className="h-3 w-3 mr-1" />
            Australian Curriculum F-10
          </Badge>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="standards">Content Descriptions</TabsTrigger>
            <TabsTrigger value="capabilities">General Capabilities</TabsTrigger>
            <TabsTrigger value="priorities">Cross-Curriculum Priorities</TabsTrigger>
          </TabsList>

          <TabsContent value="standards" className="space-y-4 mt-4">
            {/* Search and Filters */}
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col lg:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search curriculum standards, codes, or keywords..."
                      className="pl-10"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select value={learningArea} onValueChange={setLearningArea}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Learning Area" />
                      </SelectTrigger>
                      <SelectContent>
                        {learningAreas.map((area) => (
                          <SelectItem key={area} value={area}>
                            {area}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={yearLevel} onValueChange={setYearLevel}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Year Level" />
                      </SelectTrigger>
                      <SelectContent>
                        {yearLevels.map((level) => (
                          <SelectItem key={level} value={level}>
                            {level}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results */}
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <CurriculumCardSkeleton key={i} />
                ))}
              </div>
            ) : standards.length > 0 ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Showing {standards.length} content descriptions
                  {data?.pagination?.total && ` of ${data.pagination.total}`}
                </p>
                <div className="space-y-4">
                  {standards.map((standard) => (
                    <CurriculumCard key={standard.id} standard={standard} />
                  ))}
                </div>
              </>
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No standards found</h3>
                  <p className="text-muted-foreground">
                    Try adjusting your search criteria or filters
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="capabilities" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {generalCapabilities.map((capability) => (
                <Card key={capability} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-scholarly-100">
                        <GraduationCap className="h-5 w-5 text-scholarly-600" />
                      </div>
                      <CardTitle className="text-lg">{capability}</CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Explore how {capability.toLowerCase()} is integrated across learning areas.
                    </p>
                    <Button variant="link" className="px-0 mt-2">
                      View standards <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="priorities" className="space-y-4 mt-4">
            <div className="space-y-4">
              {crossCurriculumPriorities.map((priority) => (
                <Card key={priority} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-green-100">
                        <Layers className="h-5 w-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{priority}</CardTitle>
                        <CardDescription>
                          Cross-curriculum priority embedded across all learning areas
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button variant="outline">
                      Explore Content <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}

function CurriculumCard({ standard }: { standard: CurriculumStandard }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline" className="font-mono text-xs">
                {standard.code}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {standard.learningArea}
              </Badge>
              {standard.yearLevels.map((level) => (
                <Badge key={level} variant="outline" className="text-xs">
                  {level}
                </Badge>
              ))}
            </div>
            <h3 className="font-semibold mb-2">{standard.title}</h3>
            <p className="text-sm text-muted-foreground">{standard.description}</p>

            {(standard.strand || standard.substrand) && (
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <Layers className="h-4 w-4" />
                {standard.strand}
                {standard.substrand && (
                  <>
                    <ChevronRight className="h-4 w-4" />
                    {standard.substrand}
                  </>
                )}
              </div>
            )}

            {standard.generalCapabilities.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {standard.generalCapabilities.map((cap) => (
                  <Badge key={cap} variant="outline" className="text-xs bg-blue-50">
                    <Tag className="h-3 w-3 mr-1" />
                    {cap}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Button size="sm" variant="outline">
              <FileText className="h-4 w-4 mr-1" />
              Resources
            </Button>
            <Button size="sm" variant="ghost">
              <ExternalLink className="h-4 w-4 mr-1" />
              ACARA
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CurriculumCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex gap-2 mb-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-5 w-3/4 mb-2" />
        <Skeleton className="h-16 w-full" />
        <div className="flex gap-2 mt-3">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-5 w-32" />
        </div>
      </CardContent>
    </Card>
  );
}
