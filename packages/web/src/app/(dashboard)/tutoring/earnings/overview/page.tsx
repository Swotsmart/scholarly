'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  DollarSign,
  TrendingUp,
  Calendar,
  Clock,
  ArrowUpRight,
  Download,
  CreditCard,
} from 'lucide-react';

const monthlyData = [
  { month: 'Sep', earnings: 2400 },
  { month: 'Oct', earnings: 2800 },
  { month: 'Nov', earnings: 3200 },
  { month: 'Dec', earnings: 2100 },
  { month: 'Jan', earnings: 3800 },
  { month: 'Feb', earnings: 3450 },
];

const recentSessions = [
  { student: 'Emma Smith', subject: 'Algebra', duration: 60, amount: 65, date: 'Today' },
  { student: 'Liam Chen', subject: 'Calculus', duration: 90, amount: 112.50, date: 'Yesterday' },
  { student: 'Sophie Garcia', subject: 'Statistics', duration: 60, amount: 70, date: '2 days ago' },
  { student: 'James Wilson', subject: 'Algebra', duration: 45, amount: 48.75, date: '3 days ago' },
];

export default function EarningsOverviewPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <DollarSign className="h-8 w-8" />
            Earnings Overview
          </h1>
          <p className="text-muted-foreground">
            Track your tutoring income
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button>
            <CreditCard className="mr-2 h-4 w-4" />
            Request Payout
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                <span className="text-sm text-muted-foreground">This Month</span>
              </div>
              <Badge variant="secondary" className="text-green-600">
                <ArrowUpRight className="h-3 w-3 mr-1" />
                12%
              </Badge>
            </div>
            <div className="mt-2 text-2xl font-bold">$3,450</div>
            <p className="text-xs text-muted-foreground mt-1">46 sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Lifetime</span>
            </div>
            <div className="mt-2 text-2xl font-bold">$24,580</div>
            <p className="text-xs text-muted-foreground mt-1">342 sessions</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Hours This Month</span>
            </div>
            <div className="mt-2 text-2xl font-bold">52.5</div>
            <p className="text-xs text-muted-foreground mt-1">Avg $65.71/hr</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Pending Payout</span>
            </div>
            <div className="mt-2 text-2xl font-bold">$892.50</div>
            <p className="text-xs text-muted-foreground mt-1">Next payout: Feb 15</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Earnings Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Earnings</CardTitle>
            <CardDescription>Last 6 months</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-end gap-2">
              {monthlyData.map((data) => (
                <div key={data.month} className="flex-1 flex flex-col items-center gap-2">
                  <div
                    className="w-full bg-primary rounded-t transition-all hover:bg-primary/80"
                    style={{ height: `${(data.earnings / 4000) * 100}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{data.month}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Sessions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Sessions</CardTitle>
            <CardDescription>Your latest completed sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentSessions.map((session, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{session.student}</p>
                    <p className="text-sm text-muted-foreground">
                      {session.subject} • {session.duration} min • {session.date}
                    </p>
                  </div>
                  <span className="font-bold text-green-600">+${session.amount.toFixed(2)}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full mt-4">View All Sessions</Button>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Breakdown */}
      <Card>
        <CardHeader>
          <CardTitle>Earnings by Subject</CardTitle>
          <CardDescription>This month's breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[
              { subject: 'Algebra', sessions: 20, earnings: 1300, percentage: 38 },
              { subject: 'Calculus', sessions: 15, earnings: 1125, percentage: 33 },
              { subject: 'Statistics', sessions: 11, earnings: 770, percentage: 22 },
              { subject: 'Other', sessions: 3, earnings: 255, percentage: 7 },
            ].map((item) => (
              <div key={item.subject}>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium">{item.subject}</span>
                  <span className="text-sm text-muted-foreground">
                    {item.sessions} sessions • ${item.earnings}
                  </span>
                </div>
                <Progress value={item.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
