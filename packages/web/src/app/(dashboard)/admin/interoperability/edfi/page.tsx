'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Database,
  Settings,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Link,
} from 'lucide-react';

export default function EdFiPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Database className="h-8 w-8" />
            Ed-Fi Integration
          </h1>
          <p className="text-muted-foreground">
            Education data standard for K-12 data exchange
          </p>
        </div>
        <Button>
          <Settings className="mr-2 h-4 w-4" />
          Configure
        </Button>
      </div>

      {/* Status */}
      <Card className="border-yellow-200 bg-yellow-50">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <div>
              <h3 className="font-semibold">Integration Not Configured</h3>
              <p className="text-sm text-muted-foreground">
                Ed-Fi ODS/API connection has not been set up. Configure your Ed-Fi endpoint to enable data synchronization.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Ed-Fi ODS/API Configuration</CardTitle>
          <CardDescription>Connect to your Ed-Fi ODS/API instance</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>API Base URL</Label>
            <Input placeholder="https://api.ed-fi.org/v7.0/api" />
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Client ID (Key)</Label>
              <Input placeholder="Enter your Ed-Fi API key" />
            </div>
            <div className="space-y-2">
              <Label>Client Secret</Label>
              <Input type="password" placeholder="Enter your Ed-Fi API secret" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Ed-Fi Version</Label>
            <select className="w-full p-2 rounded border">
              <option>Ed-Fi Data Standard v5.0</option>
              <option>Ed-Fi Data Standard v4.0</option>
              <option>Ed-Fi Data Standard v3.3</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button>
              <Link className="mr-2 h-4 w-4" />
              Test Connection
            </Button>
            <Button variant="outline">Save Configuration</Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Domains */}
      <Card>
        <CardHeader>
          <CardTitle>Ed-Fi Data Domains</CardTitle>
          <CardDescription>Configure which data domains to synchronize</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { domain: 'Student', entities: ['Student', 'StudentSchoolAssociation', 'StudentEducationOrganizationAssociation'], enabled: false },
              { domain: 'Staff', entities: ['Staff', 'StaffSchoolAssociation', 'StaffEducationOrganizationAssociation'], enabled: false },
              { domain: 'Assessment', entities: ['Assessment', 'StudentAssessment', 'ObjectiveAssessment'], enabled: false },
              { domain: 'Enrollment', entities: ['Course', 'CourseOffering', 'Section', 'StudentSectionAssociation'], enabled: false },
              { domain: 'Grades', entities: ['Grade', 'GradebookEntry', 'StudentGradebookEntry'], enabled: false },
            ].map((item) => (
              <div key={item.domain} className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{item.domain}</h4>
                    <Badge variant="secondary">
                      {item.entities.length} entities
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {item.entities.join(', ')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {item.enabled ? (
                    <Badge className="bg-green-500">Enabled</Badge>
                  ) : (
                    <Badge variant="secondary">Disabled</Badge>
                  )}
                  <Button variant="outline" size="sm" disabled={!item.enabled}>
                    Configure
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Ed-Fi Resources</CardTitle>
          <CardDescription>Helpful links and documentation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <a href="https://techdocs.ed-fi.org" target="_blank" rel="noopener noreferrer" className="p-4 rounded-lg border hover:bg-muted transition-colors">
              <h4 className="font-medium">Ed-Fi Tech Docs</h4>
              <p className="text-sm text-muted-foreground">Official technical documentation</p>
            </a>
            <a href="https://api.ed-fi.org" target="_blank" rel="noopener noreferrer" className="p-4 rounded-lg border hover:bg-muted transition-colors">
              <h4 className="font-medium">API Sandbox</h4>
              <p className="text-sm text-muted-foreground">Test Ed-Fi API endpoints</p>
            </a>
            <a href="https://www.ed-fi.org/what-is-ed-fi/ed-fi-data-standard" target="_blank" rel="noopener noreferrer" className="p-4 rounded-lg border hover:bg-muted transition-colors">
              <h4 className="font-medium">Data Standard</h4>
              <p className="text-sm text-muted-foreground">Ed-Fi Data Standard documentation</p>
            </a>
            <a href="https://academy.ed-fi.org" target="_blank" rel="noopener noreferrer" className="p-4 rounded-lg border hover:bg-muted transition-colors">
              <h4 className="font-medium">Ed-Fi Academy</h4>
              <p className="text-sm text-muted-foreground">Training and certification</p>
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
