'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { MessageSquare, Clock, CheckCircle, User, Mail } from 'lucide-react';

export default function HostingEnquiriesPage() {
  const enquiries = [
    { id: 1, name: 'Sarah Johnson', email: 's.johnson@email.com', subject: 'Enrolment for Year 3', date: '2 hours ago', status: 'new' },
    { id: 2, name: 'Michael Chen', email: 'm.chen@email.com', subject: 'Question about curriculum', date: '1 day ago', status: 'replied' },
    { id: 3, name: 'Emma Williams', email: 'e.williams@email.com', subject: 'Tour request', date: '2 days ago', status: 'replied' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Enquiries</h1>
          <p className="text-muted-foreground">Manage incoming questions and requests</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500">1</div>
              <p className="text-sm text-muted-foreground">New Enquiries</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-500">2</div>
              <p className="text-sm text-muted-foreground">Replied</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold">3</div>
              <p className="text-sm text-muted-foreground">Total This Month</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Enquiries</CardTitle>
          <CardDescription>Respond to prospective families</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {enquiries.map((enquiry) => (
              <div key={enquiry.id} className="flex items-start justify-between p-4 rounded-lg border">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{enquiry.name}</p>
                      {enquiry.status === 'new' && (
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 text-xs rounded-full">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{enquiry.subject}</p>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {enquiry.email}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {enquiry.date}
                      </span>
                    </div>
                  </div>
                </div>
                <Button size="sm">
                  {enquiry.status === 'new' ? 'Reply' : 'View'}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
