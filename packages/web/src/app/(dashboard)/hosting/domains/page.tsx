'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe, Plus, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';

export default function HostingDomainsPage() {
  const domains = [
    { id: 1, domain: 'myschool.scholarly.ai', status: 'active', ssl: true, primary: true },
    { id: 2, domain: 'learn.myschool.edu.au', status: 'pending', ssl: false, primary: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Custom Domains</h1>
          <p className="text-muted-foreground">Manage your micro-school domain settings</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Domain
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Domains</CardTitle>
          <CardDescription>Custom domains connected to your micro-school</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {domains.map((domain) => (
              <div key={domain.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{domain.domain}</p>
                      {domain.primary && (
                        <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full">
                          Primary
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      {domain.status === 'active' ? (
                        <span className="flex items-center gap-1 text-green-500">
                          <CheckCircle className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-orange-500">
                          <AlertTriangle className="h-3 w-3" />
                          DNS Pending
                        </span>
                      )}
                      {domain.ssl && (
                        <span className="flex items-center gap-1">
                          <CheckCircle className="h-3 w-3 text-green-500" />
                          SSL Active
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Visit
                  </Button>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>DNS Configuration</CardTitle>
          <CardDescription>Add these records to your domain registrar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-2">
            <p>Type: CNAME</p>
            <p>Name: @ (or your subdomain)</p>
            <p>Value: hosting.scholarly.ai</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
