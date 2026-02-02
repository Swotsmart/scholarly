'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  Plus,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Download,
  Upload,
  School,
  BookOpen,
} from 'lucide-react';

const syncStats = {
  users: { synced: 2847, total: 2850, errors: 3 },
  classes: { synced: 156, total: 156, errors: 0 },
  enrollments: { synced: 8945, total: 8950, errors: 5 },
  courses: { synced: 42, total: 42, errors: 0 },
};

const recentSyncs = [
  { type: 'Full Sync', status: 'completed', time: '2 hours ago', records: 12500 },
  { type: 'Delta Sync', status: 'completed', time: '30 minutes ago', records: 45 },
  { type: 'Manual Import', status: 'completed', time: '1 day ago', records: 2300 },
];

export default function OneRosterPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Users className="h-8 w-8" />
            OneRoster
          </h1>
          <p className="text-muted-foreground">
            Student Information System rostering and provisioning
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Upload className="mr-2 h-4 w-4" />
            Import CSV
          </Button>
          <Button>
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Now
          </Button>
        </div>
      </div>

      {/* Sync Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Users</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{syncStats.users.synced.toLocaleString()}</div>
            <Progress value={(syncStats.users.synced / syncStats.users.total) * 100} className="h-2 mt-2" />
            {syncStats.users.errors > 0 && (
              <p className="text-xs text-red-500 mt-1">{syncStats.users.errors} errors</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <School className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Classes</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{syncStats.classes.synced}</div>
            <Progress value={100} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Courses</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{syncStats.courses.synced}</div>
            <Progress value={100} className="h-2 mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Enrollments</span>
            </div>
            <div className="mt-2 text-2xl font-bold">{syncStats.enrollments.synced.toLocaleString()}</div>
            <Progress value={(syncStats.enrollments.synced / syncStats.enrollments.total) * 100} className="h-2 mt-2" />
          </CardContent>
        </Card>
      </div>

      {/* Connection Settings */}
      <Card>
        <CardHeader>
          <CardTitle>OneRoster Connection</CardTitle>
          <CardDescription>API connection to your Student Information System</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-4 rounded-lg border bg-green-50">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-500" />
              <div>
                <p className="font-medium">Connected to PowerSchool SIS</p>
                <p className="text-sm text-muted-foreground">OneRoster 1.2 REST API</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Last sync: 30 minutes ago</Badge>
              <Button variant="outline" size="sm">Settings</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sync History */}
      <Card>
        <CardHeader>
          <CardTitle>Sync History</CardTitle>
          <CardDescription>Recent synchronization activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSyncs.map((sync, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  {sync.status === 'completed' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Clock className="h-5 w-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="font-medium">{sync.type}</p>
                    <p className="text-sm text-muted-foreground">{sync.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">
                    {sync.records.toLocaleString()} records
                  </span>
                  <Badge variant={sync.status === 'completed' ? 'default' : 'secondary'}>
                    {sync.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Mapping Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Field Mapping</CardTitle>
          <CardDescription>Map OneRoster fields to Scholarly attributes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { source: 'users.givenName', target: 'firstName', status: 'mapped' },
              { source: 'users.familyName', target: 'lastName', status: 'mapped' },
              { source: 'users.email', target: 'email', status: 'mapped' },
              { source: 'users.role', target: 'role', status: 'mapped' },
              { source: 'classes.title', target: 'className', status: 'mapped' },
            ].map((mapping) => (
              <div key={mapping.source} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                <div className="flex items-center gap-4">
                  <code className="text-sm bg-background px-2 py-1 rounded">{mapping.source}</code>
                  <span className="text-muted-foreground">→</span>
                  <code className="text-sm bg-background px-2 py-1 rounded">{mapping.target}</code>
                </div>
                <Badge variant="secondary">{mapping.status}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
