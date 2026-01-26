'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  Search,
  Upload,
  Grid3X3,
  List,
  FileText,
  Image,
  Video,
  Code,
  Presentation,
  Palette,
  Calendar,
  HardDrive,
  Tag,
} from 'lucide-react';

const typeIcon: Record<string, React.ComponentType<{ className?: string }>> = {
  document: FileText,
  image: Image,
  video: Video,
  code: Code,
  presentation: Presentation,
  design: Palette,
};

const typeColor: Record<string, string> = {
  document: 'blue',
  image: 'pink',
  video: 'red',
  code: 'emerald',
  presentation: 'amber',
  design: 'violet',
};

const typeBadgeVariant: Record<string, 'default' | 'secondary' | 'info' | 'warning' | 'outline'> = {
  document: 'info',
  image: 'default',
  video: 'default',
  code: 'secondary',
  presentation: 'warning',
  design: 'outline',
};

const artifacts = [
  {
    id: 'art-1',
    title: 'Climate Change Research Paper',
    type: 'document',
    description: 'A comprehensive analysis of climate change impacts on coastal ecosystems with data-driven conclusions.',
    createdAt: 'Feb 8, 2024',
    updatedAt: 'Feb 10, 2024',
    tags: ['science', 'research', 'environment'],
    fileSize: '2.4 MB',
  },
  {
    id: 'art-2',
    title: 'Geometric Art Composition',
    type: 'image',
    description: 'Digital artwork combining mathematical patterns with artistic expression using generative algorithms.',
    createdAt: 'Feb 5, 2024',
    updatedAt: 'Feb 5, 2024',
    tags: ['art', 'mathematics', 'digital'],
    fileSize: '8.1 MB',
  },
  {
    id: 'art-3',
    title: 'Physics Experiment Demo',
    type: 'video',
    description: 'Recording of a pendulum wave experiment demonstrating harmonic motion principles.',
    createdAt: 'Feb 1, 2024',
    updatedAt: 'Feb 2, 2024',
    tags: ['physics', 'experiment', 'video'],
    fileSize: '145 MB',
  },
  {
    id: 'art-4',
    title: 'Data Visualization Dashboard',
    type: 'code',
    description: 'Interactive dashboard built with Python and Plotly for visualizing student performance data.',
    createdAt: 'Jan 28, 2024',
    updatedAt: 'Feb 9, 2024',
    tags: ['coding', 'data-science', 'python'],
    fileSize: '340 KB',
  },
  {
    id: 'art-5',
    title: 'History of Innovation Presentation',
    type: 'presentation',
    description: 'Slide deck exploring key innovations from the Industrial Revolution to the Digital Age.',
    createdAt: 'Jan 25, 2024',
    updatedAt: 'Jan 26, 2024',
    tags: ['history', 'innovation', 'presentation'],
    fileSize: '15.2 MB',
  },
  {
    id: 'art-6',
    title: 'Mobile App UI Mockup',
    type: 'design',
    description: 'Complete UI/UX design mockup for a student wellness tracking mobile application.',
    createdAt: 'Jan 20, 2024',
    updatedAt: 'Feb 3, 2024',
    tags: ['design', 'ui-ux', 'mobile'],
    fileSize: '22.8 MB',
  },
  {
    id: 'art-7',
    title: 'Shakespearean Sonnet Analysis',
    type: 'document',
    description: 'Literary analysis exploring themes of time and mortality in Shakespeare Sonnet 18.',
    createdAt: 'Jan 18, 2024',
    updatedAt: 'Jan 19, 2024',
    tags: ['english', 'literature', 'analysis'],
    fileSize: '1.1 MB',
  },
  {
    id: 'art-8',
    title: 'Sorting Algorithm Visualizer',
    type: 'code',
    description: 'Interactive web app that visualizes bubble sort, merge sort, and quicksort algorithms.',
    createdAt: 'Jan 15, 2024',
    updatedAt: 'Jan 22, 2024',
    tags: ['coding', 'algorithms', 'javascript'],
    fileSize: '180 KB',
  },
];

export default function ArtifactsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const filteredArtifacts = artifacts.filter((artifact) => {
    const matchesSearch =
      searchQuery === '' ||
      artifact.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artifact.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      artifact.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesType = typeFilter === 'all' || artifact.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/portfolio">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="heading-2">Artifacts</h1>
            <p className="text-muted-foreground">
              Manage and organize your learning artifacts
            </p>
          </div>
        </div>
      </div>

      {/* Upload Area */}
      <div className="rounded-lg border-2 border-dashed border-muted-foreground/25 p-8 text-center">
        <div className="mx-auto flex flex-col items-center gap-3">
          <div className="rounded-lg bg-muted p-3">
            <Upload className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Drop files here or click to upload</p>
            <p className="text-xs text-muted-foreground">
              Supports documents, images, videos, code, presentations, and designs
            </p>
          </div>
          <Button variant="outline" size="sm">
            <Upload className="mr-2 h-4 w-4" />
            Browse Files
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search artifacts by name, description, or tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="h-4 w-4" />}
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="document">Document</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="video">Video</SelectItem>
            <SelectItem value="code">Code</SelectItem>
            <SelectItem value="presentation">Presentation</SelectItem>
            <SelectItem value="design">Design</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex items-center rounded-md border">
          <Button
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-r-none"
            onClick={() => setViewMode('grid')}
          >
            <Grid3X3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'secondary' : 'ghost'}
            size="icon"
            className="rounded-l-none"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Results count */}
      <p className="text-sm text-muted-foreground">
        Showing {filteredArtifacts.length} of {artifacts.length} artifacts
      </p>

      {/* Artifacts Grid View */}
      {viewMode === 'grid' ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {filteredArtifacts.map((artifact) => {
            const TypeIcon = typeIcon[artifact.type] || FileText;
            const color = typeColor[artifact.type] || 'blue';
            const badgeVar = typeBadgeVariant[artifact.type] || 'outline';
            return (
              <Card key={artifact.id} className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="p-4 space-y-3">
                  {/* Header with icon and type badge */}
                  <div className="flex items-start justify-between">
                    <div className={`rounded-lg bg-${color}-500/10 p-2.5`}>
                      <TypeIcon className={`h-6 w-6 text-${color}-500`} />
                    </div>
                    <Badge variant={badgeVar} className="text-xs capitalize">
                      {artifact.type}
                    </Badge>
                  </div>

                  {/* Title and description */}
                  <div>
                    <h3 className="text-sm font-semibold line-clamp-1">{artifact.title}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
                      {artifact.description}
                    </p>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1">
                    {artifact.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-[10px]">
                        {tag}
                      </Badge>
                    ))}
                  </div>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {artifact.updatedAt}
                    </div>
                    <div className="flex items-center gap-1">
                      <HardDrive className="h-3 w-3" />
                      {artifact.fileSize}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        /* Artifacts List View */
        <div className="space-y-2">
          {filteredArtifacts.map((artifact) => {
            const TypeIcon = typeIcon[artifact.type] || FileText;
            const color = typeColor[artifact.type] || 'blue';
            const badgeVar = typeBadgeVariant[artifact.type] || 'outline';
            return (
              <Card key={artifact.id} className="cursor-pointer transition-shadow hover:shadow-md">
                <CardContent className="flex items-center gap-4 p-4">
                  <div className={`rounded-lg bg-${color}-500/10 p-2.5`}>
                    <TypeIcon className={`h-5 w-5 text-${color}-500`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold truncate">{artifact.title}</h3>
                      <Badge variant={badgeVar} className="text-xs capitalize shrink-0">
                        {artifact.type}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {artifact.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0 text-xs text-muted-foreground">
                    <div className="flex flex-wrap gap-1">
                      {artifact.tags.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-[10px]">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <span>{artifact.updatedAt}</span>
                    <span>{artifact.fileSize}</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
