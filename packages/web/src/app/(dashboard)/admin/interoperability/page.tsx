'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Plug,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Settings,
} from 'lucide-react';

const integrations = [
  {
    id: 'lti',
    name: 'LTI Advantage',
    description: 'Learning Tools Interoperability for LMS integration',
    status: 'active',
    connections: 12,
    lastSync: '5 minutes ago',
    href: '/admin/interoperability/lti',
  },
  {
    id: 'oneroster',
    name: 'OneRoster',
    description: 'Student information system rostering and provisioning',
    status: 'active',
    connections: 8,
    lastSync: '1 hour ago',
    href: '/admin/interoperability/oneroster',
  },
  {
    id: 'case',
    name: 'CASE Network',
    description: 'Competency and Academic Standards Exchange',
    status: 'active',
    connections: 5,
    lastSync: '2 hours ago',
    href: '/admin/interoperability/case',
  },
  {
    id: 'badges',
    name: 'OpenBadges / CLR',
    description: 'Digital credentials and Comprehensive Learner Records',
    status: 'partial',
    connections: 3,
    lastSync: '1 day ago',
    href: '/admin/interoperability/badges',
  },
  {
    id: 'edfi',
    name: 'Ed-Fi',
    description: 'Education data standard for K-12 data exchange',
    status: 'inactive',
    connections: 0,
    lastSync: 'Never',
    href: '/admin/interoperability/edfi',
  },
];

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active':
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case 'partial':
      return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
    default:
      return <XCircle className="h-5 w-5 text-gray-400" />;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500">Active</Badge>;
    case 'partial':
      return <Badge className="bg-yellow-500">Partial</Badge>;
    default:
      return <Badge variant="secondary">Inactive</Badge>;
  }
};

export default function InteroperabilityPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Plug className="h-8 w-8" />
            Interoperability Hub
          </h1>
          <p className="text-muted-foreground">
            Manage 1EdTech and education data standard integrations
          </p>
        </div>
        <Button>
          <Settings className="mr-2 h-4 w-4" />
          Global Settings
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">5</div>
            <p className="text-sm text-muted-foreground">Integrations</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">3</div>
            <p className="text-sm text-muted-foreground">Fully Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">28</div>
            <p className="text-sm text-muted-foreground">Total Connections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">99.2%</div>
            <p className="text-sm text-muted-foreground">Sync Success Rate</p>
          </CardContent>
        </Card>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-4">
        {integrations.map((integration) => (
          <Card key={integration.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {getStatusIcon(integration.status)}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{integration.name}</h3>
                      {getStatusBadge(integration.status)}
                    </div>
                    <p className="text-sm text-muted-foreground">{integration.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                      <span>{integration.connections} connections</span>
                      <span>•</span>
                      <span>Last sync: {integration.lastSync}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Now
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={integration.href}>
                      Configure
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common interoperability tasks</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <Button variant="outline" className="h-auto py-4 flex-col">
              <RefreshCw className="h-6 w-6 mb-2" />
              <span>Sync All Integrations</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col">
              <Settings className="h-6 w-6 mb-2" />
              <span>API Key Management</span>
            </Button>
            <Button variant="outline" className="h-auto py-4 flex-col">
              <AlertTriangle className="h-6 w-6 mb-2" />
              <span>View Sync Errors</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
