'use client';

/**
 * LTI Advantage 1.3 Management
 * Platform registration, secure credentials, connection testing, and deep linking
 */

import { useState } from 'react';
import Link from 'next/link';
import {
  Link as LinkIcon,
  Plus,
  Settings,
  Trash2,
  ExternalLink,
  Shield,
  Key,
  Rocket,
  Clock,
  ArrowLeft,
  Copy,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Play,
  AlertTriangle,
  FileText,
  Layers,
  MoreHorizontal,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StatusBadge } from '@/components/shared';
import type { LTIPlatform, LTITool } from '@/types/interoperability';

// ---------------------------------------------------------------------------
// Types & Mock Data
// ---------------------------------------------------------------------------

interface LTICredentials {
  platformId: string;
  clientId: string;
  publicKeyset: string;
  accessTokenUrl: string;
  authorizationUrl: string;
  jwksUrl: string;
}

interface DeepLinkConfig {
  id: string;
  name: string;
  resourceType: 'ltiResourceLink' | 'file' | 'html' | 'image';
  title: string;
  url: string;
  isActive: boolean;
}

interface ConnectionTest {
  step: string;
  status: 'pending' | 'running' | 'success' | 'error';
  message?: string;
  duration?: string;
}

const mockPlatforms: LTIPlatform[] = [
  {
    id: 'plat-1',
    name: 'Canvas LMS',
    issuer: 'https://canvas.instructure.com',
    clientId: 'clnt_9f8e7d6c5b4a',
    deploymentId: 'dep_canvas_001',
    status: 'active',
    toolCount: 5,
    lastActivity: '2026-01-29T08:30:00Z',
  },
  {
    id: 'plat-2',
    name: 'Moodle',
    issuer: 'https://moodle.scholarly.edu',
    clientId: 'clnt_1a2b3c4d5e6f',
    deploymentId: 'dep_moodle_001',
    status: 'active',
    toolCount: 4,
    lastActivity: '2026-01-29T07:15:00Z',
  },
  {
    id: 'plat-3',
    name: 'Blackboard Learn',
    issuer: 'https://bb.scholarly.edu',
    clientId: 'clnt_aa11bb22cc33',
    deploymentId: 'dep_bb_001',
    status: 'inactive',
    toolCount: 3,
    lastActivity: '2026-01-20T14:45:00Z',
  },
];

const mockTools: LTITool[] = [
  {
    id: 'tool-1',
    name: 'Scholarly Assessment Engine',
    launchUrl: 'https://scholarly.edu/lti/assessment/launch',
    platformId: 'plat-1',
    scopes: ['lineitem', 'result.readonly', 'score'],
    status: 'active',
  },
  {
    id: 'tool-2',
    name: 'AI Tutor Widget',
    launchUrl: 'https://scholarly.edu/lti/ai-tutor/launch',
    platformId: 'plat-1',
    scopes: ['lineitem', 'result.readonly'],
    status: 'active',
  },
  {
    id: 'tool-3',
    name: 'LinguaFlow Practice',
    launchUrl: 'https://scholarly.edu/lti/linguaflow/launch',
    platformId: 'plat-2',
    scopes: ['lineitem', 'score', 'result.readonly'],
    status: 'active',
  },
  {
    id: 'tool-4',
    name: 'Digital Portfolio Viewer',
    launchUrl: 'https://scholarly.edu/lti/portfolio/launch',
    platformId: 'plat-2',
    scopes: ['lineitem'],
    status: 'active',
  },
  {
    id: 'tool-5',
    name: 'Standards Alignment Tool',
    launchUrl: 'https://scholarly.edu/lti/standards/launch',
    platformId: 'plat-3',
    scopes: ['lineitem', 'result.readonly', 'score'],
    status: 'inactive',
  },
];

const mockCredentials: LTICredentials = {
  platformId: 'plat-1',
  clientId: 'clnt_9f8e7d6c5b4a',
  publicKeyset: 'https://scholarly.edu/.well-known/jwks.json',
  accessTokenUrl: 'https://canvas.instructure.com/login/oauth2/token',
  authorizationUrl: 'https://canvas.instructure.com/api/lti/authorize_redirect',
  jwksUrl: 'https://canvas.instructure.com/api/lti/security/jwks',
};

const mockDeepLinks: DeepLinkConfig[] = [
  { id: 'dl-1', name: 'Assessment Launch', resourceType: 'ltiResourceLink', title: 'Start Assessment', url: '/lti/assessment', isActive: true },
  { id: 'dl-2', name: 'AI Tutor Session', resourceType: 'ltiResourceLink', title: 'Open AI Tutor', url: '/lti/ai-tutor', isActive: true },
  { id: 'dl-3', name: 'Portfolio View', resourceType: 'ltiResourceLink', title: 'View Portfolio', url: '/lti/portfolio', isActive: true },
  { id: 'dl-4', name: 'Resource Library', resourceType: 'file', title: 'Browse Resources', url: '/lti/resources', isActive: false },
];

const stats = [
  { label: 'Platforms', value: '3', icon: LinkIcon, color: 'blue' },
  { label: 'Tools', value: '12', icon: Settings, color: 'green' },
  { label: 'Launches Today', value: '47', icon: Rocket, color: 'purple' },
  { label: 'Active Sessions', value: '8', icon: Key, color: 'amber' },
];

const colorMap: Record<string, { bg: string; text: string }> = {
  blue: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
  green: { bg: 'bg-green-500/10', text: 'text-green-500' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-500' },
  amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
};

function getPlatformName(platformId: string): string {
  const platform = mockPlatforms.find((p) => p.id === platformId);
  return platform?.name ?? 'Unknown';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function LTIManagementPage() {
  const [activeTab, setActiveTab] = useState('platforms');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSecret, setShowSecret] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>('plat-1');
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<ConnectionTest[]>([
    { step: 'OIDC Login Initiation', status: 'pending' },
    { step: 'JWT Verification', status: 'pending' },
    { step: 'JWKS Endpoint', status: 'pending' },
    { step: 'Access Token', status: 'pending' },
    { step: 'Grade Passback', status: 'pending' },
  ]);

  const filteredPlatforms = mockPlatforms.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTools = mockTools.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const runConnectionTest = () => {
    setIsTestRunning(true);
    const steps = [...testResults];

    // Simulate test progression
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < steps.length) {
        steps[stepIndex] = {
          ...steps[stepIndex],
          status: 'running'
        };
        setTestResults([...steps]);

        setTimeout(() => {
          steps[stepIndex] = {
            ...steps[stepIndex],
            status: stepIndex < 4 ? 'success' : 'error',
            message: stepIndex < 4 ? 'Passed' : 'Scope not authorized',
            duration: `${(Math.random() * 200 + 50).toFixed(0)}ms`
          };
          setTestResults([...steps]);
        }, 500);

        stepIndex++;
      } else {
        clearInterval(interval);
        setIsTestRunning(false);
      }
    }, 800);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

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
          <h1 className="text-2xl font-semibold tracking-tight">LTI Advantage 1.3</h1>
          <p className="text-muted-foreground">
            Manage LTI platforms, credentials, and deep linking configuration
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Shield className="h-4 w-4 mr-2" />
            JWKS Settings
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Register Platform
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="platforms">Registration</TabsTrigger>
          <TabsTrigger value="keys">Keys & Credentials</TabsTrigger>
          <TabsTrigger value="test">Connection Test</TabsTrigger>
          <TabsTrigger value="deeplink">Deep Linking</TabsTrigger>
        </TabsList>

        {/* Platforms/Registration Tab */}
        <TabsContent value="platforms" className="space-y-4">
          <div className="flex items-center gap-4">
            <Input
              placeholder="Search platforms..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Platform Registration</CardTitle>
              <CardDescription>
                Register LTI 1.3 platforms to enable tool launches and grade passback
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Platform Name</th>
                      <th className="px-4 py-3 text-left font-medium">Issuer</th>
                      <th className="px-4 py-3 text-left font-medium">Client ID</th>
                      <th className="px-4 py-3 text-left font-medium">Deployment ID</th>
                      <th className="px-4 py-3 text-left font-medium">Tools</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Last Activity</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPlatforms.map((platform) => (
                      <tr
                        key={platform.id}
                        className={`hover:bg-muted/50 cursor-pointer ${
                          selectedPlatform === platform.id ? 'bg-muted/30' : ''
                        }`}
                        onClick={() => setSelectedPlatform(platform.id)}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-blue-500/10 p-2">
                              <LinkIcon className="h-4 w-4 text-blue-500" />
                            </div>
                            <span className="font-medium">{platform.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs text-muted-foreground">
                            {platform.issuer}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs">{platform.clientId}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(platform.clientId);
                              }}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs">{platform.deploymentId}</span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{platform.toolCount} tools</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={platform.status} showDot />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(platform.lastActivity).toLocaleDateString('en-AU', {
                            day: 'numeric',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm">
                              <Settings className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Registration Form */}
          <Card>
            <CardHeader>
              <CardTitle>Register New Platform</CardTitle>
              <CardDescription>
                Enter the platform details provided by your LMS administrator
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="platform-name">Platform Name</Label>
                    <Input id="platform-name" placeholder="e.g., Canvas LMS Production" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="issuer">Issuer URL</Label>
                    <Input id="issuer" placeholder="https://canvas.instructure.com" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="client-id">Client ID</Label>
                    <Input id="client-id" placeholder="Enter the client ID from LMS" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="deployment-id">Deployment ID</Label>
                    <Input id="deployment-id" placeholder="Enter deployment ID" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auth-url">Authorization URL</Label>
                    <Input id="auth-url" placeholder="https://canvas.instructure.com/api/lti/authorize_redirect" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="token-url">Access Token URL</Label>
                    <Input id="token-url" placeholder="https://canvas.instructure.com/login/oauth2/token" />
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-2">
                <Button variant="outline">Cancel</Button>
                <Button>Register Platform</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Keys & Credentials Tab */}
        <TabsContent value="keys" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Scholarly Keys */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Scholarly Public Keys
                </CardTitle>
                <CardDescription>
                  Provide these to your LMS for signature verification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>JWKS Endpoint</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value="https://scholarly.edu/.well-known/jwks.json"
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard('https://scholarly.edu/.well-known/jwks.json')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Tool Launch URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value="https://scholarly.edu/lti/launch"
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard('https://scholarly.edu/lti/launch')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>OIDC Login Initiation URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value="https://scholarly.edu/lti/oidc/login"
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard('https://scholarly.edu/lti/oidc/login')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Deep Linking Return URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value="https://scholarly.edu/lti/deep-link/return"
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard('https://scholarly.edu/lti/deep-link/return')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Platform Credentials */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Platform Credentials
                </CardTitle>
                <CardDescription>
                  Credentials for the selected platform ({getPlatformName(selectedPlatform || '')})
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Client ID</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={mockCredentials.clientId}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(mockCredentials.clientId)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Client Secret</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showSecret ? 'text' : 'password'}
                      value="sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSecret(!showSecret)}
                    >
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard('sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Platform JWKS URL</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={mockCredentials.jwksUrl}
                      readOnly
                      className="font-mono text-xs"
                    />
                    <Button variant="outline" size="sm" asChild>
                      <a href={mockCredentials.jwksUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>
                <div className="pt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Rotate Secret
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Public Key Display */}
          <Card>
            <CardHeader>
              <CardTitle>RSA Public Key (PEM Format)</CardTitle>
              <CardDescription>
                Use this if your LMS requires a PEM-formatted public key
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                readOnly
                className="font-mono text-xs h-40"
                value={`-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0M7sRwUXGf3T
Gt5qHpJGNrWzPJhGHTvJvF3xGFQMSd8oK3lMm5rSwJOWKxBfPMYFfWKh
vLq8ujGOlJQVc2FMJbKnJLG8YPPxtCVB6qHzpT8JGJCTWQa2tUUhJWsJ
...
-----END PUBLIC KEY-----`}
              />
              <div className="mt-4 flex justify-end">
                <Button variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Public Key
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Connection Test Tab */}
        <TabsContent value="test" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Connection Validation
              </CardTitle>
              <CardDescription>
                Test the LTI connection to {getPlatformName(selectedPlatform || '')}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Select value={selectedPlatform || ''} onValueChange={setSelectedPlatform}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Select platform" />
                    </SelectTrigger>
                    <SelectContent>
                      {mockPlatforms.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button onClick={runConnectionTest} disabled={isTestRunning}>
                    {isTestRunning ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Running Tests...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-2" />
                        Run Connection Test
                      </>
                    )}
                  </Button>
                </div>

                <div className="space-y-3 mt-6">
                  {testResults.map((test, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-lg border p-4"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-muted">
                          {test.status === 'pending' && (
                            <Clock className="h-4 w-4 text-muted-foreground" />
                          )}
                          {test.status === 'running' && (
                            <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />
                          )}
                          {test.status === 'success' && (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          )}
                          {test.status === 'error' && (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{test.step}</p>
                          {test.message && (
                            <p className={`text-sm ${
                              test.status === 'error' ? 'text-red-600' : 'text-muted-foreground'
                            }`}>
                              {test.message}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {test.duration && (
                          <span className="text-sm text-muted-foreground">{test.duration}</span>
                        )}
                        <StatusBadge status={test.status === 'success' ? 'completed' : test.status} />
                      </div>
                    </div>
                  ))}
                </div>

                {testResults.some(t => t.status === 'error') && (
                  <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-red-800 dark:text-red-400">Connection Issue Detected</h4>
                        <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                          The Grade Passback scope is not authorized. Please check your LMS configuration
                          and ensure the required AGS scopes are enabled.
                        </p>
                        <Button variant="link" className="text-red-700 dark:text-red-300 p-0 h-auto mt-2">
                          View troubleshooting guide
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Deep Linking Tab */}
        <TabsContent value="deeplink" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5" />
                Deep Linking Configuration
              </CardTitle>
              <CardDescription>
                Configure content items for LTI Deep Linking requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockDeepLinks.map((link) => (
                  <div
                    key={link.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg bg-purple-500/10 p-2">
                        {link.resourceType === 'ltiResourceLink' && <LinkIcon className="h-5 w-5 text-purple-500" />}
                        {link.resourceType === 'file' && <FileText className="h-5 w-5 text-purple-500" />}
                      </div>
                      <div>
                        <p className="font-medium">{link.name}</p>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Badge variant="outline" className="text-xs">{link.resourceType}</Badge>
                          <span>{link.url}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={link.isActive ? 'active' : 'inactive'} showDot />
                      <Button variant="ghost" size="sm">
                        <Settings className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium mb-4">Add Deep Link Resource</h4>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="dl-name">Resource Name</Label>
                    <Input id="dl-name" placeholder="e.g., Quiz Builder" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dl-type">Resource Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ltiResourceLink">LTI Resource Link</SelectItem>
                        <SelectItem value="file">File</SelectItem>
                        <SelectItem value="html">HTML</SelectItem>
                        <SelectItem value="image">Image</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dl-title">Display Title</Label>
                    <Input id="dl-title" placeholder="Title shown to users" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dl-url">Target URL</Label>
                    <Input id="dl-url" placeholder="/lti/resource-path" />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Resource
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
