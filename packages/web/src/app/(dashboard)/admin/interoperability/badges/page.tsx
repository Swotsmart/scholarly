'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Award,
  Plus,
  Download,
  CheckCircle2,
  ExternalLink,
  Settings,
  Shield,
  FileText,
} from 'lucide-react';

const issuedBadges = [
  {
    name: '7-Day Learning Streak',
    category: 'Engagement',
    issued: 1234,
    revoked: 12,
    verifications: 89,
  },
  {
    name: 'Mathematics Proficiency',
    category: 'Achievement',
    issued: 567,
    revoked: 3,
    verifications: 234,
  },
  {
    name: 'Peer Tutor Certification',
    category: 'Credential',
    issued: 45,
    revoked: 0,
    verifications: 156,
  },
];

export default function BadgesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Award className="h-8 w-8" />
            OpenBadges & CLR
          </h1>
          <p className="text-muted-foreground">
            Digital credentials and Comprehensive Learner Records
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export CLR
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Badge
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Badge Types</span>
            </div>
            <div className="mt-2 text-2xl font-bold">24</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Total Issued</span>
            </div>
            <div className="mt-2 text-2xl font-bold">12,456</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Verifications</span>
            </div>
            <div className="mt-2 text-2xl font-bold">3,421</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">CLR Records</span>
            </div>
            <div className="mt-2 text-2xl font-bold">2,847</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="badges" className="space-y-4">
        <TabsList>
          <TabsTrigger value="badges">OpenBadges</TabsTrigger>
          <TabsTrigger value="clr">CLR</TabsTrigger>
          <TabsTrigger value="issuer">Issuer Profile</TabsTrigger>
        </TabsList>

        <TabsContent value="badges">
          <Card>
            <CardHeader>
              <CardTitle>Badge Definitions</CardTitle>
              <CardDescription>OpenBadges 3.0 compliant credentials</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {issuedBadges.map((badge) => (
                  <div key={badge.name} className="p-4 rounded-lg border">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-yellow-100">
                          <Award className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div>
                          <h4 className="font-semibold">{badge.name}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline">{badge.category}</Badge>
                          </div>
                          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                            <span>{badge.issued} issued</span>
                            <span>{badge.revoked} revoked</span>
                            <span>{badge.verifications} verifications</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          <Settings className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">Issue</Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clr">
          <Card>
            <CardHeader>
              <CardTitle>Comprehensive Learner Records</CardTitle>
              <CardDescription>Full academic achievement records</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border bg-blue-50">
                  <div className="flex items-center gap-3">
                    <FileText className="h-6 w-6 text-blue-600" />
                    <div>
                      <h4 className="font-semibold">CLR 2.0 Standard</h4>
                      <p className="text-sm text-muted-foreground">
                        Comprehensive Learner Records following 1EdTech CLR 2.0 specification
                      </p>
                    </div>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-medium">CLR Components</h4>
                    <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Achievements & Badges
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Course Completions
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Competency Attestations
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        Assessment Results
                      </li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-lg border">
                    <h4 className="font-medium">Export Options</h4>
                    <div className="mt-2 space-y-2">
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Export as JSON-LD
                      </Button>
                      <Button variant="outline" className="w-full justify-start">
                        <Download className="mr-2 h-4 w-4" />
                        Export as PDF
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issuer">
          <Card>
            <CardHeader>
              <CardTitle>Issuer Profile</CardTitle>
              <CardDescription>Your organization's badge issuer configuration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary/10">
                    <Award className="h-8 w-8 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg">Scholarly Platform</h4>
                    <p className="text-sm text-muted-foreground">Verified Badge Issuer</p>
                    <a href="#" className="text-sm text-primary flex items-center gap-1 mt-1">
                      https://scholarly.app/issuer
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </div>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Issuer Name</label>
                  <input className="w-full p-2 rounded border" value="Scholarly Platform" readOnly />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Issuer URL</label>
                  <input className="w-full p-2 rounded border" value="https://scholarly.app" readOnly />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Verification Email</label>
                  <input className="w-full p-2 rounded border" value="badges@scholarly.app" readOnly />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Public Key</label>
                  <input className="w-full p-2 rounded border" value="did:web:scholarly.app" readOnly />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
