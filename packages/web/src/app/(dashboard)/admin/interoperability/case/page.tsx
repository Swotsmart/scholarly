'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Network,
  Plus,
  RefreshCw,
  CheckCircle2,
  Download,
  Search,
  FileText,
  Globe,
} from 'lucide-react';
import { Input } from '@/components/ui/input';

const connectedFrameworks = [
  {
    name: 'Australian Curriculum (ACARA)',
    publisher: 'ACARA',
    version: '9.0',
    competencies: 1247,
    lastUpdated: '2 weeks ago',
    status: 'active',
  },
  {
    name: 'Common Core State Standards',
    publisher: 'CCSSO',
    version: '2023',
    competencies: 1089,
    lastUpdated: '1 month ago',
    status: 'active',
  },
  {
    name: 'Next Generation Science Standards',
    publisher: 'NGSS',
    version: '2022',
    competencies: 398,
    lastUpdated: '3 weeks ago',
    status: 'active',
  },
];

export default function CASEPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Network className="h-8 w-8" />
            CASE Network
          </h1>
          <p className="text-muted-foreground">
            Competency and Academic Standards Exchange
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Mappings
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Framework
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Globe className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Frameworks</span>
            </div>
            <div className="mt-2 text-2xl font-bold">3</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Competencies</span>
            </div>
            <div className="mt-2 text-2xl font-bold">2,734</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Network className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Crosswalks</span>
            </div>
            <div className="mt-2 text-2xl font-bold">1,456</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Coverage</span>
            </div>
            <div className="mt-2 text-2xl font-bold">89%</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search competencies across frameworks..." className="pl-10" />
      </div>

      {/* Connected Frameworks */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Frameworks</CardTitle>
          <CardDescription>Standards frameworks synced via CASE Network</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {connectedFrameworks.map((framework) => (
              <div key={framework.name} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{framework.name}</h4>
                      <Badge variant="outline">v{framework.version}</Badge>
                      <Badge className="bg-green-500">Active</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Published by {framework.publisher} • {framework.competencies.toLocaleString()} competencies
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Last updated: {framework.lastUpdated}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Sync
                    </Button>
                    <Button variant="outline" size="sm">Browse</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Crosswalk Builder */}
      <Card>
        <CardHeader>
          <CardTitle>Crosswalk Builder</CardTitle>
          <CardDescription>Create alignments between different standards frameworks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium mb-2">Source Framework</h4>
              <select className="w-full p-2 rounded border">
                <option>Australian Curriculum (ACARA)</option>
                <option>Common Core State Standards</option>
                <option>NGSS</option>
              </select>
            </div>
            <div className="p-4 rounded-lg border">
              <h4 className="font-medium mb-2">Target Framework</h4>
              <select className="w-full p-2 rounded border">
                <option>Common Core State Standards</option>
                <option>Australian Curriculum (ACARA)</option>
                <option>NGSS</option>
              </select>
            </div>
          </div>
          <Button className="mt-4">
            <Network className="mr-2 h-4 w-4" />
            Generate Crosswalk
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
