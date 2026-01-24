'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  BarChart3,
  TrendingUp,
  Eye,
  Clock,
  Globe,
  Users,
  Calendar,
} from 'lucide-react';

const analyticsData = {
  totalViews: 127,
  uniqueViews: 89,
  avgTimeOnPage: '2m 34s',
  topCountries: [
    { country: 'Australia', views: 67, percentage: 53 },
    { country: 'United States', views: 28, percentage: 22 },
    { country: 'United Kingdom', views: 18, percentage: 14 },
    { country: 'Other', views: 14, percentage: 11 },
  ],
  viewsByDay: [
    { day: 'Mon', views: 12 },
    { day: 'Tue', views: 18 },
    { day: 'Wed', views: 24 },
    { day: 'Thu', views: 15 },
    { day: 'Fri', views: 21 },
    { day: 'Sat', views: 8 },
    { day: 'Sun', views: 6 },
  ],
  recentVisitors: [
    { time: '2 hours ago', location: 'Sydney, AU', duration: '3m 15s' },
    { time: '5 hours ago', location: 'Melbourne, AU', duration: '1m 45s' },
    { time: 'Yesterday', location: 'New York, US', duration: '4m 20s' },
    { time: 'Yesterday', location: 'London, UK', duration: '2m 10s' },
  ],
};

export default function ShowcaseAnalyticsPage() {
  const maxViews = Math.max(...analyticsData.viewsByDay.map(d => d.views));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="heading-2">Portfolio Analytics</h1>
        <p className="text-muted-foreground">
          Track engagement and views across all your portfolios
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-primary/10 p-3">
              <Eye className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analyticsData.totalViews}</p>
              <p className="text-sm text-muted-foreground">Total Views</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-green-500/10 p-3">
              <Users className="h-6 w-6 text-green-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analyticsData.uniqueViews}</p>
              <p className="text-sm text-muted-foreground">Unique Visitors</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-blue-500/10 p-3">
              <Clock className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">{analyticsData.avgTimeOnPage}</p>
              <p className="text-sm text-muted-foreground">Avg. Time</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-6">
            <div className="rounded-lg bg-purple-500/10 p-3">
              <TrendingUp className="h-6 w-6 text-purple-500" />
            </div>
            <div>
              <p className="text-2xl font-bold">+23%</p>
              <p className="text-sm text-muted-foreground">vs Last Week</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Views by Day */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Views This Week
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between gap-2 h-40">
              {analyticsData.viewsByDay.map((day) => (
                <div key={day.day} className="flex flex-col items-center gap-2 flex-1">
                  <div
                    className="w-full bg-primary/20 rounded-t transition-all hover:bg-primary/30"
                    style={{ height: `${(day.views / maxViews) * 100}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{day.day}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Countries */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Top Locations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analyticsData.topCountries.map((country) => (
              <div key={country.country} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>{country.country}</span>
                  <span className="text-muted-foreground">{country.views} views</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${country.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent Visitors */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Visitors</CardTitle>
          <CardDescription>Anonymous visitor activity</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analyticsData.recentVisitors.map((visitor, index) => (
              <div
                key={index}
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                    <Users className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">{visitor.location}</p>
                    <p className="text-sm text-muted-foreground">{visitor.time}</p>
                  </div>
                </div>
                <Badge variant="secondary">
                  <Clock className="mr-1 h-3 w-3" />
                  {visitor.duration}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
