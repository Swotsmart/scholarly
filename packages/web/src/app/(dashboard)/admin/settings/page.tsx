'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Settings,
  Palette,
  Flag,
  Plug,
  Upload,
  Globe,
  Mail,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

const featureFlags = [
  { id: 'ff1', name: 'AI Buddy Chat', enabled: true, description: 'AI-powered learning assistant for student queries', scope: 'global' as const },
  { id: 'ff2', name: 'LinguaFlow Module', enabled: true, description: 'CEFR-based language learning with IB integration', scope: 'tenant' as const },
  { id: 'ff3', name: 'Blockchain Credentials', enabled: false, description: 'Verified digital credentials on blockchain', scope: 'global' as const },
  { id: 'ff4', name: 'Early Years Module', enabled: true, description: 'EYLF-aligned early childhood learning tools', scope: 'tenant' as const },
  { id: 'ff5', name: 'Parent Portal', enabled: true, description: 'Parent access to student progress and communications', scope: 'global' as const },
  { id: 'ff6', name: 'Design Pitch AI', enabled: false, description: 'AI-assisted pitch deck creation and feedback', scope: 'user' as const },
  { id: 'ff7', name: 'Data Lake Analytics', enabled: true, description: 'Advanced analytics dashboard with data lake integration', scope: 'tenant' as const },
];

const integrations = [
  {
    id: 'int1',
    name: 'Google Workspace',
    description: 'Single sign-on, Google Classroom sync, and Drive integration',
    status: 'connected' as const,
    lastSync: '2026-01-26T09:00:00Z',
  },
  {
    id: 'int2',
    name: 'Microsoft 365',
    description: 'Teams integration, OneDrive sync, and Azure AD authentication',
    status: 'connected' as const,
    lastSync: '2026-01-26T08:45:00Z',
  },
  {
    id: 'int3',
    name: 'Canvas LMS',
    description: 'Grade passback, assignment sync, and course import',
    status: 'disconnected' as const,
    lastSync: '2026-01-15T12:00:00Z',
  },
  {
    id: 'int4',
    name: 'NAPLAN Online',
    description: 'National assessment results import and analytics',
    status: 'connected' as const,
    lastSync: '2025-12-01T00:00:00Z',
  },
];

function getScopeBadge(scope: string) {
  switch (scope) {
    case 'global':
      return <Badge variant="destructive">Global</Badge>;
    case 'tenant':
      return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Tenant</Badge>;
    case 'user':
      return <Badge variant="secondary">User</Badge>;
    default:
      return <Badge variant="secondary">{scope}</Badge>;
  }
}

function getIntegrationStatus(status: string) {
  switch (status) {
    case 'connected':
      return (
        <Badge className="bg-green-100 text-green-800 border-green-300">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Connected
        </Badge>
      );
    case 'disconnected':
      return (
        <Badge className="bg-gray-100 text-gray-800 border-gray-300">
          <XCircle className="mr-1 h-3 w-3" />
          Disconnected
        </Badge>
      );
    case 'error':
      return (
        <Badge className="bg-red-100 text-red-800 border-red-300">
          <AlertCircle className="mr-1 h-3 w-3" />
          Error
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState(featureFlags);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const toggleFlag = (id: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-2">Platform Settings</h1>
        <p className="text-muted-foreground">
          Configure platform behaviour, branding, features, and integrations
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            General
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Flag className="h-4 w-4" />
            Feature Flags
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="h-4 w-4" />
            Integrations
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
              <CardDescription>Core platform configuration and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input id="platformName" defaultValue="Scholarly Australia" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input id="supportEmail" type="email" defaultValue="support@scholarly.edu.au" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select defaultValue="australia-sydney">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="australia-sydney">Australia/Sydney (AEST)</SelectItem>
                      <SelectItem value="australia-melbourne">Australia/Melbourne (AEST)</SelectItem>
                      <SelectItem value="australia-brisbane">Australia/Brisbane (AEST)</SelectItem>
                      <SelectItem value="australia-perth">Australia/Perth (AWST)</SelectItem>
                      <SelectItem value="australia-adelaide">Australia/Adelaide (ACST)</SelectItem>
                      <SelectItem value="australia-darwin">Australia/Darwin (ACST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="academicYear">Academic Year</Label>
                  <Select defaultValue="2026">
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="schoolAddress">School Address</Label>
                <Input id="schoolAddress" defaultValue="42 Learning Drive, North Sydney NSW 2060" />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Maintenance Mode</p>
                  <p className="text-sm text-muted-foreground">
                    When enabled, only admins can access the platform. All other users see a maintenance page.
                  </p>
                </div>
                <Button
                  variant={maintenanceMode ? 'destructive' : 'outline'}
                  onClick={() => setMaintenanceMode(!maintenanceMode)}
                >
                  {maintenanceMode ? 'Enabled' : 'Disabled'}
                </Button>
              </div>

              <Button>Save Settings</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding & Appearance</CardTitle>
              <CardDescription>Customise the platform look and feel for your school</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Colour</Label>
                  <div className="flex items-center gap-3">
                    <Input id="primaryColor" defaultValue="#2563EB" className="flex-1" />
                    <div className="h-10 w-10 rounded-md border" style={{ backgroundColor: '#2563EB' }} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Colour</Label>
                  <div className="flex items-center gap-3">
                    <Input id="accentColor" defaultValue="#7C3AED" className="flex-1" />
                    <div className="h-10 w-10 rounded-md border" style={{ backgroundColor: '#7C3AED' }} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>School Logo</Label>
                <div className="flex items-center gap-6">
                  <div className="h-20 w-20 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed">
                    <Globe className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <div>
                    <Button variant="outline">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Logo
                    </Button>
                    <p className="mt-2 text-sm text-muted-foreground">
                      SVG, PNG or JPG. Recommended 200x200px. Max 1MB.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Favicon</Label>
                <div className="flex items-center gap-6">
                  <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center border-2 border-dashed">
                    <Globe className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <Button variant="outline" size="sm">
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Favicon
                    </Button>
                    <p className="mt-1 text-xs text-muted-foreground">
                      ICO or PNG. 32x32px recommended.
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="customCSS">Custom CSS</Label>
                <Textarea
                  id="customCSS"
                  placeholder="/* Add custom CSS overrides here */&#10;&#10;.heading-2 {&#10;  /* Custom heading styles */&#10;}"
                  className="font-mono min-h-[160px]"
                />
                <p className="text-xs text-muted-foreground">
                  Advanced: Add custom CSS to override default platform styles. Changes apply globally.
                </p>
              </div>

              <Button>Save Branding</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="features">
          <Card>
            <CardHeader>
              <CardTitle>Feature Flags</CardTitle>
              <CardDescription>
                Enable or disable platform features. Changes take effect immediately.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`rounded-lg p-2 ${flag.enabled ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
                      <Flag className={`h-5 w-5 ${flag.enabled ? 'text-green-500' : 'text-gray-400'}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{flag.name}</p>
                        {getScopeBadge(flag.scope)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5">{flag.description}</p>
                    </div>
                  </div>
                  <Button
                    variant={flag.enabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleFlag(flag.id)}
                  >
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Connected Services</CardTitle>
                <CardDescription>
                  Manage third-party integrations and data synchronisation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {integrations.map((integration) => (
                  <div
                    key={integration.id}
                    className="flex items-start justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Plug className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{integration.name}</h3>
                          {getIntegrationStatus(integration.status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {integration.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          Last synced: {new Date(integration.lastSync).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {integration.status === 'connected' && (
                        <Button size="sm" variant="outline">
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Sync
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant={integration.status === 'connected' ? 'outline' : 'default'}
                      >
                        {integration.status === 'connected' ? 'Configure' : 'Connect'}
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>API Configuration</CardTitle>
                <CardDescription>Manage API keys and webhook endpoints</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>API Base URL</Label>
                  <Input defaultValue="https://api.scholarly.edu.au/v1" readOnly />
                </div>
                <div className="space-y-2">
                  <Label>Webhook Endpoint</Label>
                  <Input defaultValue="https://api.scholarly.edu.au/webhooks" readOnly />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">API Key</p>
                    <p className="text-sm text-muted-foreground">
                      Used for external integrations and third-party access
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Input
                      defaultValue="sk_live_••••••••••••••••••••"
                      readOnly
                      className="w-[280px] font-mono text-sm"
                    />
                    <Button variant="outline" size="sm">
                      Regenerate
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
