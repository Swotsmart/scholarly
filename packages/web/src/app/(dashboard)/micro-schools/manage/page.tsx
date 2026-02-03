'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building, Users, Settings, TrendingUp, Calendar, FileText } from 'lucide-react';

export default function ManageMicroSchoolPage() {
  const stats = [
    { label: 'Total Students', value: '24', icon: Users, trend: '+3 this term' },
    { label: 'Active Programs', value: '5', icon: FileText, trend: '2 waitlisted' },
    { label: 'Avg Satisfaction', value: '4.8', icon: TrendingUp, trend: '+0.2 vs last term' },
    { label: 'Upcoming Events', value: '3', icon: Calendar, trend: 'This week' },
  ];

  const quickActions = [
    { label: 'Student Roster', href: '/micro-schools/manage/roster', icon: Users },
    { label: 'Schedule', href: '/micro-schools/manage/schedule', icon: Calendar },
    { label: 'Settings', href: '/hosting/settings', icon: Settings },
    { label: 'Reports', href: '/micro-schools/manage/reports', icon: FileText },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Manage Micro-School</h1>
          <p className="text-muted-foreground">Sunshine Learning Hub administration</p>
        </div>
        <Button variant="outline">
          <Settings className="mr-2 h-4 w-4" />
          Settings
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">{stat.trend}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common management tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Button key={action.label} variant="outline" className="h-auto py-4 flex-col gap-2">
                    <Icon className="h-5 w-5" />
                    <span>{action.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates at your school</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-green-500 mt-2" />
                <div>
                  <p className="text-sm font-medium">New enrolment accepted</p>
                  <p className="text-xs text-muted-foreground">Sophie Williams joined Year 2 • 2 hours ago</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-blue-500 mt-2" />
                <div>
                  <p className="text-sm font-medium">Term calendar updated</p>
                  <p className="text-xs text-muted-foreground">Added 3 new events • Yesterday</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-2 w-2 rounded-full bg-orange-500 mt-2" />
                <div>
                  <p className="text-sm font-medium">New enquiry received</p>
                  <p className="text-xs text-muted-foreground">From Chen family • 2 days ago</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
