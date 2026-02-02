'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Plug,
  Plus,
  CheckCircle2,
  Settings,
  Trash2,
  Copy,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

const ltiConnections = [
  {
    id: 1,
    name: 'Canvas LMS',
    platform: 'Instructure',
    status: 'active',
    launches: 1250,
    lastActivity: '5 minutes ago',
    services: ['Deep Linking', 'Assignment & Grades', 'Names & Roles'],
  },
  {
    id: 2,
    name: 'Moodle Production',
    platform: 'Moodle',
    status: 'active',
    launches: 890,
    lastActivity: '1 hour ago',
    services: ['Deep Linking', 'Assignment & Grades'],
  },
  {
    id: 3,
    name: 'Blackboard Test',
    platform: 'Blackboard',
    status: 'inactive',
    launches: 45,
    lastActivity: '2 weeks ago',
    services: ['Deep Linking'],
  },
];

export default function LTIPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Plug className="h-8 w-8" />
            LTI Advantage
          </h1>
          <p className="text-muted-foreground">
            Learning Tools Interoperability 1.3 configuration
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Platform
        </Button>
      </div>

      {/* Platform Credentials */}
      <Card>
        <CardHeader>
          <CardTitle>Platform Registration</CardTitle>
          <CardDescription>Your LTI 1.3 tool credentials</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Client ID</Label>
              <div className="flex gap-2">
                <Input value="scholarly-lti-prod-12345" readOnly />
                <Button variant="outline" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Deployment ID</Label>
              <div className="flex gap-2">
                <Input value="1:abc123def456" readOnly />
                <Button variant="outline" size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>OIDC Login URL</Label>
            <div className="flex gap-2">
              <Input value="https://api.scholarly.app/lti/oidc/login" readOnly />
              <Button variant="outline" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Launch URL</Label>
            <div className="flex gap-2">
              <Input value="https://api.scholarly.app/lti/launch" readOnly />
              <Button variant="outline" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="space-y-2">
            <Label>JWKS URL</Label>
            <div className="flex gap-2">
              <Input value="https://api.scholarly.app/.well-known/jwks.json" readOnly />
              <Button variant="outline" size="icon">
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Connected Platforms */}
      <Card>
        <CardHeader>
          <CardTitle>Connected Platforms</CardTitle>
          <CardDescription>LMS platforms integrated via LTI 1.3</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ltiConnections.map((connection) => (
              <div key={connection.id} className="p-4 rounded-lg border">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className={`h-5 w-5 ${
                      connection.status === 'active' ? 'text-green-500' : 'text-gray-400'
                    }`} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{connection.name}</h4>
                        <Badge variant="outline">{connection.platform}</Badge>
                        <Badge variant={connection.status === 'active' ? 'default' : 'secondary'}>
                          {connection.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {connection.launches.toLocaleString()} launches • Last activity: {connection.lastActivity}
                      </p>
                      <div className="flex gap-2 mt-2">
                        {connection.services.map((service) => (
                          <Badge key={service} variant="secondary" className="text-xs">
                            {service}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      <Settings className="mr-2 h-4 w-4" />
                      Configure
                    </Button>
                    <Button variant="outline" size="sm">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* LTI Services */}
      <Card>
        <CardHeader>
          <CardTitle>LTI Advantage Services</CardTitle>
          <CardDescription>Enabled LTI 1.3 service extensions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { name: 'Deep Linking 2.0', desc: 'Content selection and embedding', enabled: true },
              { name: 'Assignment & Grade Services', desc: 'Grade passback to LMS', enabled: true },
              { name: 'Names & Role Provisioning', desc: 'User roster synchronization', enabled: true },
              { name: 'Submission Review', desc: 'View student submissions', enabled: false },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <p className="font-medium">{service.name}</p>
                  <p className="text-sm text-muted-foreground">{service.desc}</p>
                </div>
                <Badge variant={service.enabled ? 'default' : 'secondary'}>
                  {service.enabled ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
