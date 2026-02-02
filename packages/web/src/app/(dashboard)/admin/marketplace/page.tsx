'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Store,
  Search,
  Plus,
  Star,
  Download,
  CheckCircle2,
  Clock,
  XCircle,
  Package,
  Code,
  Puzzle,
  BarChart3,
} from 'lucide-react';

const apps = [
  {
    id: 1,
    name: 'Math Visualizer Pro',
    developer: 'EduTech Labs',
    category: 'Learning Tools',
    rating: 4.8,
    installs: 12500,
    status: 'approved',
    price: 'Free',
    icon: '📐',
  },
  {
    id: 2,
    name: 'Science Lab Simulator',
    developer: 'Virtual Labs Inc',
    category: 'Simulations',
    rating: 4.6,
    installs: 8900,
    status: 'approved',
    price: '$4.99/mo',
    icon: '🔬',
  },
  {
    id: 3,
    name: 'Language Flashcards',
    developer: 'PolyglotApps',
    category: 'Languages',
    rating: 4.9,
    installs: 23400,
    status: 'approved',
    price: 'Free',
    icon: '🗣️',
  },
  {
    id: 4,
    name: 'Code Playground',
    developer: 'DevEdu',
    category: 'Programming',
    rating: 4.7,
    installs: 15600,
    status: 'pending',
    price: '$2.99/mo',
    icon: '💻',
  },
];

const pendingReviews = [
  { name: 'Music Theory Tutor', developer: 'HarmonyApps', submitted: '2 days ago' },
  { name: 'Geography Explorer', developer: 'WorldMap Studios', submitted: '3 days ago' },
  { name: 'Chemistry Balancer', developer: 'ScienceTools', submitted: '5 days ago' },
];

export default function MarketplacePage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Store className="h-8 w-8" />
            App Marketplace
          </h1>
          <p className="text-muted-foreground">
            Manage third-party integrations and educational apps
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Submit App
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Total Apps</span>
            </div>
            <div className="mt-2 text-2xl font-bold">47</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Download className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Total Installs</span>
            </div>
            <div className="mt-2 text-2xl font-bold">89.4K</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Code className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Developers</span>
            </div>
            <div className="mt-2 text-2xl font-bold">23</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <span className="text-sm text-muted-foreground">Pending Review</span>
            </div>
            <div className="mt-2 text-2xl font-bold">3</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search apps..." className="pl-10" />
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">All Apps</TabsTrigger>
          <TabsTrigger value="pending">
            Pending Review
            <Badge variant="secondary" className="ml-2">3</Badge>
          </TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {apps.map((app) => (
              <Card key={app.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="text-4xl">{app.icon}</div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{app.name}</h3>
                        {app.status === 'approved' ? (
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        ) : (
                          <Clock className="h-4 w-4 text-yellow-500" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">{app.developer}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="secondary">{app.category}</Badge>
                        <span className="text-sm font-medium">{app.price}</span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm font-medium">{app.rating}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {app.installs.toLocaleString()} installs
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1">View</Button>
                    <Button variant="outline" size="sm" className="flex-1">Settings</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="pending">
          <Card>
            <CardHeader>
              <CardTitle>Apps Pending Review</CardTitle>
              <CardDescription>Review and approve new app submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingReviews.map((app) => (
                  <div key={app.name} className="flex items-center justify-between p-4 rounded-lg border">
                    <div>
                      <p className="font-medium">{app.name}</p>
                      <p className="text-sm text-muted-foreground">
                        by {app.developer} • Submitted {app.submitted}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">Review</Button>
                      <Button size="sm" className="bg-green-600 hover:bg-green-700">Approve</Button>
                      <Button size="sm" variant="destructive">Reject</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Marketplace Analytics</CardTitle>
              <CardDescription>Usage statistics and trends</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h4 className="font-medium mb-4">Top Categories</h4>
                  <div className="space-y-3">
                    {[
                      { name: 'Learning Tools', count: 15, percentage: 32 },
                      { name: 'Languages', count: 12, percentage: 26 },
                      { name: 'Simulations', count: 10, percentage: 21 },
                      { name: 'Programming', count: 6, percentage: 13 },
                      { name: 'Other', count: 4, percentage: 8 },
                    ].map((cat) => (
                      <div key={cat.name} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{cat.name}</span>
                          <span className="text-muted-foreground">{cat.count} apps</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${cat.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-medium mb-4">Recent Activity</h4>
                  <div className="space-y-3">
                    {[
                      { action: 'New app submitted', app: 'Music Theory Tutor', time: '2 hours ago' },
                      { action: 'App approved', app: 'Code Playground', time: '1 day ago' },
                      { action: 'Update released', app: 'Math Visualizer Pro', time: '2 days ago' },
                      { action: 'App removed', app: 'Outdated Quiz', time: '3 days ago' },
                    ].map((activity, i) => (
                      <div key={i} className="flex items-center gap-3 text-sm">
                        <Puzzle className="h-4 w-4 text-muted-foreground" />
                        <div className="flex-1">
                          <span className="font-medium">{activity.action}</span>
                          <span className="text-muted-foreground"> - {activity.app}</span>
                        </div>
                        <span className="text-muted-foreground">{activity.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
