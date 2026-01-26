'use client';

/**
 * LTI Advantage 1.3 Management
 * Manage LTI platforms, tools, and launch configurations
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
  MoreHorizontal,
  Copy,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import type { LTIPlatform, LTITool } from '@/types/interoperability';

// ---------------------------------------------------------------------------
// Mock Data
// ---------------------------------------------------------------------------

const mockPlatforms: LTIPlatform[] = [
  {
    id: 'plat-1',
    name: 'Canvas LMS',
    issuer: 'https://canvas.instructure.com',
    clientId: 'clnt_9f8e7d6c5b4a',
    deploymentId: 'dep_canvas_001',
    status: 'active',
    toolCount: 5,
    lastActivity: '2026-01-26T08:30:00Z',
  },
  {
    id: 'plat-2',
    name: 'Moodle',
    issuer: 'https://moodle.scholarly.edu',
    clientId: 'clnt_1a2b3c4d5e6f',
    deploymentId: 'dep_moodle_001',
    status: 'active',
    toolCount: 4,
    lastActivity: '2026-01-26T07:15:00Z',
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

const stats = [
  { label: 'Platforms', value: '3', icon: LinkIcon, color: 'blue' },
  { label: 'Tools', value: '12', icon: Settings, color: 'green' },
  { label: 'Active Launches', value: '47 today', icon: Rocket, color: 'purple' },
  { label: 'OIDC States', value: '3 pending', icon: Key, color: 'amber' },
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

export default function LTIManagementPage() {
  const [activeTab, setActiveTab] = useState('platforms');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPlatforms = mockPlatforms.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTools = mockTools.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
          <h1 className="heading-2">LTI Advantage 1.3</h1>
          <p className="text-muted-foreground">
            Manage LTI platforms, tool registrations, and launch configurations
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

      {/* Search */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search platforms and tools..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="platforms">Platforms</TabsTrigger>
          <TabsTrigger value="tools">Tools</TabsTrigger>
        </TabsList>

        {/* Platforms Tab */}
        <TabsContent value="platforms" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Platform Name</th>
                      <th className="px-4 py-3 text-left font-medium">Issuer</th>
                      <th className="px-4 py-3 text-left font-medium">Client ID</th>
                      <th className="px-4 py-3 text-left font-medium">Tools</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-left font-medium">Last Activity</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredPlatforms.map((platform) => (
                      <tr key={platform.id} className="hover:bg-muted/50">
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
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="secondary">{platform.toolCount} tools</Badge>
                        </td>
                        <td className="px-4 py-3">
                          {platform.status === 'active' ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle2 className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
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
        </TabsContent>

        {/* Tools Tab */}
        <TabsContent value="tools" className="space-y-4">
          <div className="flex items-center justify-end">
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Register Tool
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium">Tool Name</th>
                      <th className="px-4 py-3 text-left font-medium">Launch URL</th>
                      <th className="px-4 py-3 text-left font-medium">Platform</th>
                      <th className="px-4 py-3 text-left font-medium">Scopes</th>
                      <th className="px-4 py-3 text-left font-medium">Status</th>
                      <th className="px-4 py-3 text-right font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredTools.map((tool) => (
                      <tr key={tool.id} className="hover:bg-muted/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-green-500/10 p-2">
                              <Rocket className="h-4 w-4 text-green-500" />
                            </div>
                            <span className="font-medium">{tool.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px] inline-block">
                              {tool.launchUrl}
                            </span>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0">
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{getPlatformName(tool.platformId)}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {tool.scopes.map((scope) => (
                              <Badge key={scope} variant="secondary" className="text-xs">
                                {scope}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {tool.status === 'active' ? (
                            <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button variant="outline" size="sm">
                            <Settings className="h-4 w-4 mr-1" />
                            Configure
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
