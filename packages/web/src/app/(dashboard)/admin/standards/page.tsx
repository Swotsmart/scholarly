'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileCheck,
  Plus,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Globe,
  BookOpen,
  Shield,
} from 'lucide-react';

const frameworks = [
  {
    name: 'ACARA',
    fullName: 'Australian Curriculum',
    coverage: 94,
    standards: 1247,
    mapped: 1172,
    status: 'active',
  },
  {
    name: 'AITSL',
    fullName: 'Australian Institute for Teaching',
    coverage: 88,
    standards: 37,
    mapped: 33,
    status: 'active',
  },
  {
    name: 'EYLF',
    fullName: 'Early Years Learning Framework',
    coverage: 100,
    standards: 89,
    mapped: 89,
    status: 'active',
  },
  {
    name: 'IB MYP',
    fullName: 'International Baccalaureate MYP',
    coverage: 72,
    standards: 156,
    mapped: 112,
    status: 'partial',
  },
  {
    name: 'Common Core',
    fullName: 'US Common Core Standards',
    coverage: 45,
    standards: 1089,
    mapped: 490,
    status: 'partial',
  },
];

export default function StandardsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileCheck className="h-8 w-8" />
            Standards Management
          </h1>
          <p className="text-muted-foreground">
            Manage curriculum frameworks and standards mapping
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
            <div className="mt-2 text-2xl font-bold">5</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Total Standards</span>
            </div>
            <div className="mt-2 text-2xl font-bold">2,618</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Mapped</span>
            </div>
            <div className="mt-2 text-2xl font-bold">1,896</div>
            <p className="text-xs text-muted-foreground mt-1">72% coverage</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Gaps</span>
            </div>
            <div className="mt-2 text-2xl font-bold">722</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="frameworks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="frameworks">Frameworks</TabsTrigger>
          <TabsTrigger value="mapping">Content Mapping</TabsTrigger>
          <TabsTrigger value="gaps">Gap Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="frameworks" className="space-y-4">
          {frameworks.map((framework) => (
            <Card key={framework.name}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                      <Shield className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold">{framework.name}</h3>
                        <Badge variant={framework.status === 'active' ? 'default' : 'secondary'}>
                          {framework.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{framework.fullName}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm">
                        <span>{framework.mapped} / {framework.standards} standards mapped</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">{framework.coverage}%</div>
                    <Progress value={framework.coverage} className="h-2 w-32 mt-2" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4 pt-4 border-t">
                  <Button variant="outline" size="sm">View Standards</Button>
                  <Button variant="outline" size="sm">Edit Mappings</Button>
                  <Button variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="mapping">
          <Card>
            <CardHeader>
              <CardTitle>Content Mapping</CardTitle>
              <CardDescription>Map learning content to curriculum standards</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { content: 'Algebra Fundamentals', framework: 'ACARA', standard: 'ACMNA291', status: 'mapped' },
                  { content: 'Climate Science', framework: 'ACARA', standard: 'ACSSU115', status: 'mapped' },
                  { content: 'Creative Writing', framework: 'ACARA', standard: 'ACELY1746', status: 'review' },
                  { content: 'Phonics Phase 2', framework: 'EYLF', standard: 'EYLF-L4.1', status: 'mapped' },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">{item.content}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.framework} → {item.standard}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={item.status === 'mapped' ? 'default' : 'secondary'}>
                        {item.status}
                      </Badge>
                      <Button variant="outline" size="sm">Edit</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="gaps">
          <Card>
            <CardHeader>
              <CardTitle>Gap Analysis</CardTitle>
              <CardDescription>Standards with missing or incomplete content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { standard: 'ACMSP293', desc: 'Data representation and interpretation (Year 8)', priority: 'high' },
                  { standard: 'ACSHE226', desc: 'Science as a human endeavour (Year 9)', priority: 'medium' },
                  { standard: 'ACELY1749', desc: 'Oral presentations (Year 10)', priority: 'low' },
                ].map((gap) => (
                  <div key={gap.standard} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-3">
                      {gap.priority === 'high' ? (
                        <XCircle className="h-5 w-5 text-red-500" />
                      ) : gap.priority === 'medium' ? (
                        <AlertTriangle className="h-5 w-5 text-yellow-500" />
                      ) : (
                        <AlertTriangle className="h-5 w-5 text-blue-500" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{gap.standard}</Badge>
                          <Badge variant={
                            gap.priority === 'high' ? 'destructive' :
                            gap.priority === 'medium' ? 'secondary' : 'outline'
                          }>
                            {gap.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{gap.desc}</p>
                      </div>
                    </div>
                    <Button size="sm">Create Content</Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
