'use client';

/**
 * CASE Framework Browser
 * Browse and manage Competency and Academic Standards Exchange frameworks
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Shapes,
  ArrowLeft,
  Plus,
  Search,
  ChevronRight,
  ChevronDown,
  FileText,
  BookOpen,
  Layers,
  CheckCircle2,
  Clock,
  GitBranch,
  Upload,
  Filter,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { CASEFramework, CASEItem } from '@/types/interoperability';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockFrameworks: CASEFramework[] = [
  {
    id: 'cf-1',
    title: 'Australian Curriculum v9.0',
    creator: 'ACARA',
    version: '9.0',
    itemCount: 892,
    status: 'published',
    lastUpdated: '2026-01-15T00:00:00Z',
  },
  {
    id: 'cf-2',
    title: 'NSW Syllabus for the Australian Curriculum',
    creator: 'NESA',
    version: '2024.1',
    itemCount: 634,
    status: 'published',
    lastUpdated: '2026-01-10T00:00:00Z',
  },
  {
    id: 'cf-3',
    title: 'Victorian Curriculum F-10',
    creator: 'VCAA',
    version: '2.0',
    itemCount: 478,
    status: 'imported',
    lastUpdated: '2025-12-20T00:00:00Z',
  },
  {
    id: 'cf-4',
    title: 'IB Primary Years Programme',
    creator: 'International Baccalaureate',
    version: '2023',
    itemCount: 336,
    status: 'published',
    lastUpdated: '2025-11-01T00:00:00Z',
  },
];

const mockItems: CASEItem[] = [
  {
    id: 'ci-1',
    humanCodingScheme: 'AC9M',
    fullStatement: 'Mathematics',
    type: 'Domain',
    level: 0,
    children: [
      {
        id: 'ci-1-1',
        humanCodingScheme: 'AC9M7',
        fullStatement: 'Year 7 Mathematics',
        type: 'Grade Level',
        level: 1,
        children: [
          {
            id: 'ci-1-1-1',
            humanCodingScheme: 'AC9M7N',
            fullStatement: 'Number and Algebra',
            type: 'Strand',
            level: 2,
            children: [
              {
                id: 'ci-1-1-1-1',
                humanCodingScheme: 'AC9M7N01',
                fullStatement:
                  'Describe the relationship between perfect square numbers and square roots, and use squares of numbers and square roots of perfect square numbers to solve problems',
                type: 'Content Description',
                level: 3,
              },
              {
                id: 'ci-1-1-1-2',
                humanCodingScheme: 'AC9M7N02',
                fullStatement:
                  'Find equivalent representations of rational numbers and represent rational numbers on a number line',
                type: 'Content Description',
                level: 3,
              },
            ],
          },
          {
            id: 'ci-1-1-2',
            humanCodingScheme: 'AC9M7M',
            fullStatement: 'Measurement',
            type: 'Strand',
            level: 2,
            children: [
              {
                id: 'ci-1-1-2-1',
                humanCodingScheme: 'AC9M7M01',
                fullStatement:
                  'Solve problems involving the area of triangles and parallelograms using established formulas and appropriate units',
                type: 'Content Description',
                level: 3,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'ci-2',
    humanCodingScheme: 'AC9E',
    fullStatement: 'English',
    type: 'Domain',
    level: 0,
    children: [
      {
        id: 'ci-2-1',
        humanCodingScheme: 'AC9E7',
        fullStatement: 'Year 7 English',
        type: 'Grade Level',
        level: 1,
        children: [
          {
            id: 'ci-2-1-1',
            humanCodingScheme: 'AC9E7LA',
            fullStatement: 'Language',
            type: 'Strand',
            level: 2,
            children: [
              {
                id: 'ci-2-1-1-1',
                humanCodingScheme: 'AC9E7LA01',
                fullStatement:
                  'Analyse how the selection and combination of language features in spoken, written and multimodal texts can influence audiences',
                type: 'Content Description',
                level: 3,
              },
            ],
          },
        ],
      },
    ],
  },
];

const stats = [
  { label: 'Frameworks', value: '8', icon: Shapes, color: 'purple' },
  { label: 'Items', value: '2,340', icon: FileText, color: 'blue' },
  { label: 'Mapped to Curriculum', value: '1,856', icon: GitBranch, color: 'green' },
];

const colorMap: Record<string, { bg: string; text: string }> = {
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500' },
};

function getStatusBadge(status: string) {
  switch (status) {
    case 'published':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Published
        </Badge>
      );
    case 'imported':
      return (
        <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          <Upload className="h-3 w-3 mr-1" />
          Imported
        </Badge>
      );
    case 'draft':
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Draft
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function getTypeBadge(type: string) {
  const typeColors: Record<string, string> = {
    Domain: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    'Grade Level': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    Strand: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    'Content Description': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  };
  return (
    <Badge className={typeColors[type] ?? ''} variant="secondary">
      {type}
    </Badge>
  );
}

// ---------------------------------------------------------------------------
// Tree Item Component
// ---------------------------------------------------------------------------

function CASETreeItem({ item, depth = 0 }: { item: CASEItem; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = item.children && item.children.length > 0;

  return (
    <div>
      <div
        className="flex items-start gap-2 py-2 px-3 hover:bg-muted/50 rounded-md cursor-pointer"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <div className="mt-0.5 flex-shrink-0">
          {hasChildren ? (
            expanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )
          ) : (
            <div className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <code className="rounded bg-muted px-2 py-0.5 text-xs font-mono font-semibold">
              {item.humanCodingScheme}
            </code>
            {getTypeBadge(item.type)}
          </div>
          <p className="text-sm mt-1 text-muted-foreground">{item.fullStatement}</p>
        </div>
      </div>
      {expanded && hasChildren && (
        <div>
          {item.children!.map((child) => (
            <CASETreeItem key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function CASEPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFramework, setSelectedFramework] = useState<string>('cf-1');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/interoperability">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back
              </Link>
            </Button>
          </div>
          <h1 className="heading-2">CASE Framework Browser</h1>
          <p className="text-muted-foreground">
            Browse and manage Competency and Academic Standards Exchange frameworks
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Import Framework
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat) => {
          const Icon = stat.icon;
          const colors = colorMap[stat.color];
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className={`rounded-lg ${colors.bg} p-3`}>
                  <Icon className={`h-6 w-6 ${colors.text}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stat.value}</p>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Framework Cards */}
      <div>
        <h2 className="text-lg font-semibold mb-4">Frameworks</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {mockFrameworks.map((framework) => (
            <Card
              key={framework.id}
              className={`cursor-pointer transition-shadow ${
                selectedFramework === framework.id
                  ? 'ring-2 ring-primary shadow-md'
                  : 'hover:shadow-md'
              }`}
              onClick={() => setSelectedFramework(framework.id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-purple-500/10 p-3">
                      <BookOpen className="h-6 w-6 text-purple-500" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{framework.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {framework.creator} - v{framework.version}
                      </CardDescription>
                    </div>
                  </div>
                  {getStatusBadge(framework.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Items</span>
                    <span className="font-semibold">{framework.itemCount.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Last Updated</span>
                    <span className="text-muted-foreground">
                      {new Date(framework.lastUpdated).toLocaleDateString('en-AU', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>
                <Button
                  className="w-full mt-4"
                  variant={selectedFramework === framework.id ? 'default' : 'outline'}
                  size="sm"
                >
                  <Layers className="h-4 w-4 mr-2" />
                  Browse Items
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Item Browser */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5" />
                Item Browser
              </CardTitle>
              <CardDescription>
                {mockFrameworks.find((f) => f.id === selectedFramework)?.title ?? 'Select a framework'}
                {' - '}Navigate the standards hierarchy
              </CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg divide-y">
            {mockItems.map((item) => (
              <CASETreeItem key={item.id} item={item} />
            ))}
          </div>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
            <span>Showing 2 root domains with nested items</span>
            <Button variant="outline" size="sm">
              Load More Items
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
