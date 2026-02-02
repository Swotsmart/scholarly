'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Share2,
  Search,
  Link,
  Users,
  FileText,
  Clock,
  Eye,
  Copy,
  Trash2,
  MoreHorizontal,
  ExternalLink,
  Lock,
  Globe,
} from 'lucide-react';

const sharedResources = [
  {
    id: 1,
    name: 'Quadratic Equations Practice Set',
    type: 'document',
    sharedWith: ['Emma Smith', 'James Wilson'],
    shareType: 'specific',
    views: 45,
    lastAccessed: '2 hours ago',
    expiresIn: '7 days',
  },
  {
    id: 2,
    name: 'Calculus Formula Reference',
    type: 'document',
    sharedWith: ['Liam Chen', 'Olivia Brown'],
    shareType: 'specific',
    views: 32,
    lastAccessed: 'Yesterday',
    expiresIn: '14 days',
  },
  {
    id: 3,
    name: 'Statistics Video Playlist',
    type: 'folder',
    sharedWith: [],
    shareType: 'public',
    views: 128,
    lastAccessed: '3 hours ago',
    expiresIn: 'Never',
  },
  {
    id: 4,
    name: 'Homework Help Resources',
    type: 'folder',
    sharedWith: ['All Students'],
    shareType: 'all',
    views: 256,
    lastAccessed: 'Today',
    expiresIn: 'Never',
  },
  {
    id: 5,
    name: 'Practice Test - Derivatives',
    type: 'document',
    sharedWith: ['Liam Chen'],
    shareType: 'specific',
    views: 12,
    lastAccessed: '1 day ago',
    expiresIn: '3 days',
  },
];

const sharedLinks = [
  {
    id: 1,
    name: 'Algebra Study Guide',
    link: 'https://scholarly.app/share/abc123',
    created: 'Jan 28, 2026',
    clicks: 67,
    status: 'active',
  },
  {
    id: 2,
    name: 'Practice Problems Collection',
    link: 'https://scholarly.app/share/def456',
    created: 'Jan 25, 2026',
    clicks: 34,
    status: 'active',
  },
  {
    id: 3,
    name: 'Old Exam Papers',
    link: 'https://scholarly.app/share/ghi789',
    created: 'Jan 15, 2026',
    clicks: 89,
    status: 'expired',
  },
];

export default function SharedResourcesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Share2 className="h-8 w-8" />
            Shared Resources
          </h1>
          <p className="text-muted-foreground">
            Manage resources shared with your students
          </p>
        </div>
        <Button>
          <Share2 className="mr-2 h-4 w-4" />
          Share New Resource
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Share2 className="h-5 w-5 text-blue-500" />
              <span className="text-sm text-muted-foreground">Shared Items</span>
            </div>
            <div className="mt-2 text-2xl font-bold">24</div>
            <p className="text-xs text-muted-foreground mt-1">files & folders</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Link className="h-5 w-5 text-green-500" />
              <span className="text-sm text-muted-foreground">Active Links</span>
            </div>
            <div className="mt-2 text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground mt-1">shareable links</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-purple-500" />
              <span className="text-sm text-muted-foreground">Total Views</span>
            </div>
            <div className="mt-2 text-2xl font-bold">1,847</div>
            <p className="text-xs text-muted-foreground mt-1">this month</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-orange-500" />
              <span className="text-sm text-muted-foreground">Students Reached</span>
            </div>
            <div className="mt-2 text-2xl font-bold">18</div>
            <p className="text-xs text-muted-foreground mt-1">active students</p>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shared resources..."
                className="pl-10"
              />
            </div>
            <select className="p-2 rounded border">
              <option>All Types</option>
              <option>Documents</option>
              <option>Folders</option>
              <option>Links</option>
            </select>
            <select className="p-2 rounded border">
              <option>All Sharing</option>
              <option>Public</option>
              <option>Specific Students</option>
              <option>All Students</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Shared Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Shared with Students</CardTitle>
          <CardDescription>Resources currently shared with your students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sharedResources.map((resource) => (
              <div
                key={resource.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100">
                    <FileText className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{resource.name}</p>
                      <Badge variant="outline" className="capitalize">{resource.type}</Badge>
                      {resource.shareType === 'public' ? (
                        <Badge className="bg-green-500">
                          <Globe className="mr-1 h-3 w-3" />
                          Public
                        </Badge>
                      ) : resource.shareType === 'all' ? (
                        <Badge className="bg-blue-500">
                          <Users className="mr-1 h-3 w-3" />
                          All Students
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <Lock className="mr-1 h-3 w-3" />
                          {resource.sharedWith.length} students
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {resource.views} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last accessed {resource.lastAccessed}
                      </span>
                      {resource.expiresIn !== 'Never' && (
                        <span>Expires in {resource.expiresIn}</span>
                      )}
                    </div>
                    {resource.sharedWith.length > 0 && resource.shareType === 'specific' && (
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-muted-foreground">Shared with:</span>
                        <div className="flex -space-x-2">
                          {resource.sharedWith.slice(0, 3).map((name, i) => (
                            <Avatar key={i} className="h-6 w-6 border-2 border-background">
                              <AvatarFallback className="text-xs">{name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                            </Avatar>
                          ))}
                        </div>
                        {resource.sharedWith.length > 3 && (
                          <span className="text-xs text-muted-foreground">+{resource.sharedWith.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Shared Links */}
      <Card>
        <CardHeader>
          <CardTitle>Shareable Links</CardTitle>
          <CardDescription>Quick access links you have created</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {sharedLinks.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between p-4 rounded-lg border"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100">
                    <Link className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{link.name}</p>
                      <Badge className={link.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}>
                        {link.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground font-mono">{link.link}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Created {link.created} &bull; {link.clicks} clicks
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm">
                    <Copy className="mr-1 h-3 w-3" />
                    Copy
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
