'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  ArrowRight,
  Eye,
} from 'lucide-react';
import { applications } from '@/lib/micro-schools-api';

const stats = [
  { label: 'Submitted', value: '3', icon: FileText },
  { label: 'Under Review', value: '1', icon: Clock },
  { label: 'Accepted', value: '1', icon: CheckCircle2 },
  { label: 'Waitlisted', value: '1', icon: AlertCircle },
];

const statusConfig: Record<
  string,
  { label: string; className: string; dotColor: string }
> = {
  accepted: {
    label: 'Accepted',
    className: 'bg-green-500/10 text-green-600',
    dotColor: 'bg-green-500',
  },
  waitlisted: {
    label: 'Waitlisted',
    className: 'bg-amber-500/10 text-amber-600',
    dotColor: 'bg-amber-500',
  },
  'under-review': {
    label: 'Under Review',
    className: 'bg-blue-500/10 text-blue-600',
    dotColor: 'bg-blue-500',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-500/10 text-red-600',
    dotColor: 'bg-red-500',
  },
};

export default function ApplicationsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">My Applications</h1>
          <p className="text-muted-foreground">
            Track your micro-school applications and enrollment status
          </p>
        </div>
        <Button asChild>
          <Link href="/micro-schools">
            <Plus className="mr-2 h-4 w-4" />
            Apply to New School
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="flex items-center gap-4 p-6">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Icon className="h-6 w-6 text-primary" />
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

      {/* Application Cards */}
      <div className="space-y-4">
        {applications.map((app) => {
          const status = statusConfig[app.status];
          return (
            <Card key={app.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{app.schoolName}</CardTitle>
                    <CardDescription className="mt-1">
                      Applicant: {app.childName}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={status.className}>
                      {status.label}
                      {app.waitlistPosition && ` (Position #${app.waitlistPosition})`}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Dates */}
                <div className="flex flex-wrap gap-6 text-sm">
                  <div>
                    <span className="text-muted-foreground">Applied:</span>{' '}
                    <span className="font-medium">{app.appliedDate}</span>
                  </div>
                  {app.responseDate && (
                    <div>
                      <span className="text-muted-foreground">Response:</span>{' '}
                      <span className="font-medium">{app.responseDate}</span>
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div className="space-y-3">
                  <p className="text-sm font-medium">Application Timeline</p>
                  <div className="flex items-center gap-0">
                    {app.timelineSteps.map((step, index) => (
                      <div key={step.label} className="flex items-center">
                        <div className="flex flex-col items-center">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                              step.completed
                                ? 'border-primary bg-primary text-primary-foreground'
                                : 'border-muted-foreground/30 bg-background text-muted-foreground/50'
                            }`}
                          >
                            {step.completed ? (
                              <CheckCircle2 className="h-4 w-4" />
                            ) : (
                              <span className="text-xs">{index + 1}</span>
                            )}
                          </div>
                          <div className="mt-2 w-24 text-center">
                            <p
                              className={`text-xs ${
                                step.completed
                                  ? 'font-medium text-foreground'
                                  : 'text-muted-foreground'
                              }`}
                            >
                              {step.label}
                            </p>
                            {step.date && (
                              <p className="text-xs text-muted-foreground">
                                {step.date}
                              </p>
                            )}
                          </div>
                        </div>
                        {index < app.timelineSteps.length - 1 && (
                          <div
                            className={`mb-8 h-0.5 w-8 ${
                              step.completed
                                ? 'bg-primary'
                                : 'bg-muted-foreground/20'
                            }`}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/micro-schools/${app.schoolId}`}>
                      <Eye className="mr-2 h-4 w-4" />
                      View Details
                    </Link>
                  </Button>
                  {app.status === 'accepted' && (
                    <Button size="sm">
                      Confirm Enrolment
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
