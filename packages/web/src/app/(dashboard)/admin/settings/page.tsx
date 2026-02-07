'use client';

/**
 * Admin Settings Page
 * Platform configuration: General, Branding, Feature Flags, Integrations, Security
 * Updated to follow UI/UX Design System v2.0
 */

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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PageHeader, StatusBadge } from '@/components/shared';
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
  Shield,
  Key,
  Lock,
  Clock,
  Eye,
  EyeOff,
  Copy,
  Save,
  RotateCcw,
  Building2,
  Image,
  Paintbrush,
  Info,
  AlertTriangle,
  Zap,
  ToggleLeft,
  Link2,
  Circle,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Feature flags
const featureFlagsData = [
  { id: 'ff1', name: 'AI Buddy Chat', enabled: true, description: 'AI-powered learning assistant for student queries', scope: 'global' as const },
  { id: 'ff2', name: 'LinguaFlow Module', enabled: true, description: 'CEFR-based language learning with IB integration', scope: 'tenant' as const },
  { id: 'ff3', name: 'Blockchain Credentials', enabled: false, description: 'Verified digital credentials on blockchain', scope: 'global' as const },
  { id: 'ff4', name: 'Early Years Module', enabled: true, description: 'EYLF-aligned early childhood learning tools', scope: 'tenant' as const },
  { id: 'ff5', name: 'Parent Portal', enabled: true, description: 'Parent access to student progress and communications', scope: 'global' as const },
  { id: 'ff6', name: 'Design Pitch AI', enabled: false, description: 'AI-assisted pitch deck creation and feedback', scope: 'user' as const },
  { id: 'ff7', name: 'Data Lake Analytics', enabled: true, description: 'Advanced analytics dashboard with data lake integration', scope: 'tenant' as const },
  { id: 'ff8', name: 'Gamification System', enabled: true, description: 'Achievement badges, leaderboards, and rewards', scope: 'tenant' as const },
  { id: 'ff9', name: 'Offline Mode', enabled: false, description: 'Progressive web app with offline capability', scope: 'global' as const },
];

// Integrations
const integrationsData = [
  {
    id: 'int1',
    name: 'Google Workspace',
    description: 'Single sign-on, Google Classroom sync, and Drive integration',
    iconColor: 'text-blue-500 fill-blue-500',
    status: 'connected' as const,
    lastSync: '2026-01-29T09:00:00Z',
  },
  {
    id: 'int2',
    name: 'Microsoft 365',
    description: 'Teams integration, OneDrive sync, and Azure AD authentication',
    iconColor: 'text-orange-500 fill-orange-500',
    status: 'connected' as const,
    lastSync: '2026-01-29T08:45:00Z',
  },
  {
    id: 'int3',
    name: 'Canvas LMS',
    description: 'Grade passback, assignment sync, and course import',
    iconColor: 'text-red-500 fill-red-500',
    status: 'disconnected' as const,
    lastSync: '2026-01-15T12:00:00Z',
  },
  {
    id: 'int4',
    name: 'NAPLAN Online',
    description: 'National assessment results import and analytics',
    iconColor: 'text-green-500 fill-green-500',
    status: 'connected' as const,
    lastSync: '2025-12-01T00:00:00Z',
  },
  {
    id: 'int5',
    name: 'Compass School Manager',
    description: 'Attendance sync, timetable integration, and parent communications',
    iconColor: 'text-purple-500 fill-purple-500',
    status: 'connected' as const,
    lastSync: '2026-01-29T07:30:00Z',
  },
  {
    id: 'int6',
    name: 'Xero Accounting',
    description: 'Invoice sync, payment reconciliation, and financial reporting',
    iconColor: 'text-blue-500 fill-blue-500',
    status: 'error' as const,
    lastSync: '2026-01-28T10:15:00Z',
  },
];

// Password policy options
const passwordPolicies = {
  minLength: 12,
  requireUppercase: true,
  requireLowercase: true,
  requireNumbers: true,
  requireSpecialChars: true,
  maxAge: 90,
  preventReuse: 5,
};

// Session settings
const sessionSettings = {
  sessionTimeout: 30,
  maxConcurrentSessions: 3,
  requireMFA: false,
  trustedDevices: true,
};

function getScopeBadge(scope: string) {
  switch (scope) {
    case 'global':
      return <Badge variant="destructive">Global</Badge>;
    case 'tenant':
      return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Tenant</Badge>;
    case 'user':
      return <Badge variant="secondary">User</Badge>;
    default:
      return <Badge variant="secondary">{scope}</Badge>;
  }
}

function getIntegrationStatusBadge(status: string) {
  switch (status) {
    case 'connected':
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Connected
        </Badge>
      );
    case 'disconnected':
      return (
        <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400">
          <XCircle className="mr-1 h-3 w-3" />
          Disconnected
        </Badge>
      );
    case 'error':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
          <AlertCircle className="mr-1 h-3 w-3" />
          Error
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function AdminSettingsPage() {
  const [flags, setFlags] = useState(featureFlagsData);
  const [integrations, setIntegrations] = useState(integrationsData);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);

  // General settings state
  const [generalSettings, setGeneralSettings] = useState({
    platformName: 'Scholarly Australia',
    supportEmail: 'support@scholarly.edu.au',
    timezone: 'australia-sydney',
    academicYear: '2026',
    schoolAddress: '42 Learning Drive, North Sydney NSW 2060',
    schoolPhone: '+61 2 9123 4567',
  });

  // Branding state
  const [brandingSettings, setBrandingSettings] = useState({
    primaryColor: '#2563EB',
    accentColor: '#7C3AED',
    customCSS: '',
  });

  // Security settings state
  const [securitySettings, setSecuritySettings] = useState({
    ...passwordPolicies,
    ...sessionSettings,
  });

  const toggleFlag = (id: string) => {
    setFlags((prev) =>
      prev.map((f) => (f.id === id ? { ...f, enabled: !f.enabled } : f))
    );
  };

  const handleSyncIntegration = (id: string) => {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, lastSync: new Date().toISOString() } : i))
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Settings"
        description="Configure platform behaviour, branding, features, and integrations"
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>
          <TabsTrigger value="branding" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">Branding</span>
          </TabsTrigger>
          <TabsTrigger value="features" className="gap-2">
            <Flag className="h-4 w-4" />
            <span className="hidden sm:inline">Features</span>
          </TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2">
            <Plug className="h-4 w-4" />
            <span className="hidden sm:inline">Integrations</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Security</span>
          </TabsTrigger>
        </TabsList>

        {/* General Tab */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                School Information
              </CardTitle>
              <CardDescription>Core platform configuration and contact details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="platformName">Platform Name</Label>
                  <Input
                    id="platformName"
                    value={generalSettings.platformName}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, platformName: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supportEmail">Support Email</Label>
                  <Input
                    id="supportEmail"
                    type="email"
                    value={generalSettings.supportEmail}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select
                    value={generalSettings.timezone}
                    onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, timezone: value }))}
                  >
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
                  <Select
                    value={generalSettings.academicYear}
                    onValueChange={(value) => setGeneralSettings(prev => ({ ...prev, academicYear: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="2025">2025</SelectItem>
                      <SelectItem value="2026">2026</SelectItem>
                      <SelectItem value="2027">2027</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="schoolAddress">School Address</Label>
                  <Input
                    id="schoolAddress"
                    value={generalSettings.schoolAddress}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, schoolAddress: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolPhone">School Phone</Label>
                  <Input
                    id="schoolPhone"
                    value={generalSettings.schoolPhone}
                    onChange={(e) => setGeneralSettings(prev => ({ ...prev, schoolPhone: e.target.value }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Maintenance Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Maintenance Mode
              </CardTitle>
              <CardDescription>Control platform access during maintenance windows</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <p className="font-medium">Enable Maintenance Mode</p>
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

              {maintenanceMode && (
                <div className="mt-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-amber-800 dark:text-amber-200">Maintenance Mode Active</p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Non-admin users cannot access the platform. Remember to disable when maintenance is complete.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset
            </Button>
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </TabsContent>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                Logo & Identity
              </CardTitle>
              <CardDescription>Upload your school logo and favicon</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Logo upload */}
                <div className="space-y-4">
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
                      <p className="mt-2 text-xs text-muted-foreground">
                        SVG, PNG or JPG. Recommended 200x200px. Max 1MB.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Favicon upload */}
                <div className="space-y-4">
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
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paintbrush className="h-5 w-5" />
                Colors & Theme
              </CardTitle>
              <CardDescription>Customise the platform look and feel for your school</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Primary Colour</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="primaryColor"
                      value={brandingSettings.primaryColor}
                      onChange={(e) => setBrandingSettings(prev => ({ ...prev, primaryColor: e.target.value }))}
                      className="flex-1"
                    />
                    <div
                      className="h-10 w-10 rounded-md border cursor-pointer"
                      style={{ backgroundColor: brandingSettings.primaryColor }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for buttons, links, and primary actions</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Colour</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      id="accentColor"
                      value={brandingSettings.accentColor}
                      onChange={(e) => setBrandingSettings(prev => ({ ...prev, accentColor: e.target.value }))}
                      className="flex-1"
                    />
                    <div
                      className="h-10 w-10 rounded-md border cursor-pointer"
                      style={{ backgroundColor: brandingSettings.accentColor }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Used for highlights and secondary elements</p>
                </div>
              </div>

              {/* Color preview */}
              <div className="rounded-lg border p-4">
                <p className="text-sm font-medium mb-3">Preview</p>
                <div className="flex items-center gap-3">
                  <Button style={{ backgroundColor: brandingSettings.primaryColor }}>Primary Button</Button>
                  <Button variant="outline" style={{ borderColor: brandingSettings.primaryColor, color: brandingSettings.primaryColor }}>
                    Outline Button
                  </Button>
                  <Badge style={{ backgroundColor: brandingSettings.accentColor }}>Badge</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Custom CSS</CardTitle>
              <CardDescription>Advanced: Add custom CSS to override default platform styles</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={brandingSettings.customCSS}
                onChange={(e) => setBrandingSettings(prev => ({ ...prev, customCSS: e.target.value }))}
                placeholder="/* Add custom CSS overrides here */&#10;&#10;.heading-2 {&#10;  /* Custom heading styles */&#10;}"
                className="font-mono min-h-[160px]"
              />
              <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 mt-0.5 text-blue-600" />
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    Changes apply globally to all users. Test thoroughly before saving.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Save Branding
            </Button>
          </div>
        </TabsContent>

        {/* Feature Flags Tab */}
        <TabsContent value="features" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <ToggleLeft className="h-5 w-5" />
                    Feature Flags
                  </CardTitle>
                  <CardDescription>
                    Enable or disable platform features. Changes take effect immediately.
                  </CardDescription>
                </div>
                <Badge variant="secondary">{flags.filter(f => f.enabled).length} of {flags.length} enabled</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {flags.map((flag) => (
                <div
                  key={flag.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`rounded-lg p-2 ${flag.enabled ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
                      <Zap className={`h-5 w-5 ${flag.enabled ? 'text-green-500' : 'text-gray-400'}`} />
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
                    className="min-w-[90px]"
                  >
                    {flag.enabled ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Scope Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="destructive">Global</Badge>
                  <p className="text-sm text-muted-foreground">Affects all tenants and users platform-wide</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">Tenant</Badge>
                  <p className="text-sm text-muted-foreground">Can be configured per school/organisation</p>
                </div>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                  <Badge variant="secondary">User</Badge>
                  <p className="text-sm text-muted-foreground">Can be enabled per individual user</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Integrations Tab */}
        <TabsContent value="integrations" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Connected Services
                  </CardTitle>
                  <CardDescription>
                    Manage third-party integrations and data synchronisation
                  </CardDescription>
                </div>
                <Button>
                  <Plug className="mr-2 h-4 w-4" />
                  Add Integration
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {integrations.map((integration) => (
                <div
                  key={integration.id}
                  className="flex items-start justify-between rounded-lg border p-4"
                >
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      <Circle className={`h-6 w-6 ${integration.iconColor}`} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{integration.name}</h3>
                        {getIntegrationStatusBadge(integration.status)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {integration.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Last synced: {formatDate(integration.lastSync)}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {integration.status === 'connected' && (
                      <Button size="sm" variant="outline" onClick={() => handleSyncIntegration(integration.id)}>
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
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                API Configuration
              </CardTitle>
              <CardDescription>Manage API keys and webhook endpoints</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>API Base URL</Label>
                  <div className="flex gap-2">
                    <Input defaultValue="https://api.scholarly.edu.au/v1" readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Webhook Endpoint</Label>
                  <div className="flex gap-2">
                    <Input defaultValue="https://api.scholarly.edu.au/webhooks" readOnly className="font-mono text-sm" />
                    <Button variant="outline" size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">API Key</p>
                    <p className="text-sm text-muted-foreground">
                      Used for external integrations and third-party access
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <div className="flex items-center gap-2">
                      <Input
                        value={showApiKey ? 'sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx' : 'sk_live_************************'}
                        readOnly
                        className="w-[280px] font-mono text-sm"
                      />
                      <Button variant="ghost" size="icon" onClick={() => setShowApiKey(!showApiKey)}>
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button variant="outline" onClick={() => setApiKeyDialogOpen(true)}>
                      Regenerate
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Password Policies
              </CardTitle>
              <CardDescription>Configure password requirements for all users</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="minLength">Minimum Password Length</Label>
                  <Select
                    value={String(securitySettings.minLength)}
                    onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, minLength: Number(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="8">8 characters</SelectItem>
                      <SelectItem value="10">10 characters</SelectItem>
                      <SelectItem value="12">12 characters</SelectItem>
                      <SelectItem value="14">14 characters</SelectItem>
                      <SelectItem value="16">16 characters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxAge">Password Expiry</Label>
                  <Select
                    value={String(securitySettings.maxAge)}
                    onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, maxAge: Number(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                      <SelectItem value="90">90 days</SelectItem>
                      <SelectItem value="180">180 days</SelectItem>
                      <SelectItem value="365">365 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Password Requirements</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {[
                    { key: 'requireUppercase', label: 'Require uppercase letters' },
                    { key: 'requireLowercase', label: 'Require lowercase letters' },
                    { key: 'requireNumbers', label: 'Require numbers' },
                    { key: 'requireSpecialChars', label: 'Require special characters' },
                  ].map((req) => (
                    <label key={req.key} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer hover:bg-muted/50">
                      <input
                        type="checkbox"
                        checked={securitySettings[req.key as keyof typeof securitySettings] as boolean}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, [req.key]: e.target.checked }))}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <span className="text-sm">{req.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Password Reuse Prevention</Label>
                <Select
                  value={String(securitySettings.preventReuse)}
                  onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, preventReuse: Number(value) }))}
                >
                  <SelectTrigger className="w-full md:w-[280px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">No restriction</SelectItem>
                    <SelectItem value="3">Prevent last 3 passwords</SelectItem>
                    <SelectItem value="5">Prevent last 5 passwords</SelectItem>
                    <SelectItem value="10">Prevent last 10 passwords</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Session Settings
              </CardTitle>
              <CardDescription>Configure session timeouts and device management</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Session Timeout (minutes)</Label>
                  <Select
                    value={String(securitySettings.sessionTimeout)}
                    onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: Number(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 minutes</SelectItem>
                      <SelectItem value="30">30 minutes</SelectItem>
                      <SelectItem value="60">1 hour</SelectItem>
                      <SelectItem value="120">2 hours</SelectItem>
                      <SelectItem value="480">8 hours</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Concurrent Sessions</Label>
                  <Select
                    value={String(securitySettings.maxConcurrentSessions)}
                    onValueChange={(value) => setSecuritySettings(prev => ({ ...prev, maxConcurrentSessions: Number(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 session</SelectItem>
                      <SelectItem value="3">3 sessions</SelectItem>
                      <SelectItem value="5">5 sessions</SelectItem>
                      <SelectItem value="10">10 sessions</SelectItem>
                      <SelectItem value="0">Unlimited</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Require Multi-Factor Authentication</p>
                    <p className="text-sm text-muted-foreground">
                      Enforce MFA for all admin and teacher accounts
                    </p>
                  </div>
                  <Button
                    variant={securitySettings.requireMFA ? 'default' : 'outline'}
                    onClick={() => setSecuritySettings(prev => ({ ...prev, requireMFA: !prev.requireMFA }))}
                  >
                    {securitySettings.requireMFA ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>

                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium">Remember Trusted Devices</p>
                    <p className="text-sm text-muted-foreground">
                      Allow users to skip MFA on trusted devices for 30 days
                    </p>
                  </div>
                  <Button
                    variant={securitySettings.trustedDevices ? 'default' : 'outline'}
                    onClick={() => setSecuritySettings(prev => ({ ...prev, trustedDevices: !prev.trustedDevices }))}
                  >
                    {securitySettings.trustedDevices ? 'Enabled' : 'Disabled'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2">
            <Button variant="outline">
              <RotateCcw className="mr-2 h-4 w-4" />
              Reset to Defaults
            </Button>
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Save Security Settings
            </Button>
          </div>
        </TabsContent>
      </Tabs>

      {/* API Key Regeneration Dialog */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Regenerate API Key</DialogTitle>
            <DialogDescription>
              Are you sure you want to regenerate your API key? The current key will be invalidated immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-3">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 text-amber-600" />
                <div className="text-sm text-amber-700 dark:text-amber-300">
                  <p className="font-medium">Warning</p>
                  <p className="mt-1">All existing integrations using the current API key will stop working until updated with the new key.</p>
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApiKeyDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => setApiKeyDialogOpen(false)}>
              Regenerate Key
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
