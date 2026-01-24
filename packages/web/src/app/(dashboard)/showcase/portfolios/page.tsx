'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Plus,
  MoreVertical,
  Eye,
  Edit,
  Trash2,
  Share2,
  Globe,
  Lock,
  ExternalLink,
  Copy,
  TrendingUp,
  MessageSquare,
  Sparkles,
  FolderOpen,
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

const portfolios = [
  {
    id: '1',
    title: 'Sustainable Campus Innovation',
    headline: 'My journey designing eco-friendly solutions for university life',
    customSlug: 'alex-green-campus-2024',
    fullUrl: 'https://portfolio.scholarly.ai/u/alex-green-campus-2024',
    status: 'published',
    isPublic: true,
    itemCount: 8,
    totalViews: 127,
    uniqueViews: 89,
    guestbookCount: 5,
    skillTags: ['Rapid Prototyping', 'User Empathy', 'Sustainability'],
    thumbnailUrl: '/placeholder-portfolio-1.jpg',
    createdAt: '2024-01-10',
    publishedAt: '2024-01-20',
  },
  {
    id: '2',
    title: 'Student Wellness Platform',
    headline: 'Designing for mental health support in higher education',
    customSlug: 'alex-wellness-project',
    fullUrl: 'https://portfolio.scholarly.ai/u/alex-wellness-project',
    status: 'draft',
    isPublic: false,
    itemCount: 5,
    totalViews: 0,
    uniqueViews: 0,
    guestbookCount: 0,
    skillTags: ['User Research', 'Empathy Mapping'],
    thumbnailUrl: '/placeholder-portfolio-2.jpg',
    createdAt: '2024-01-15',
    publishedAt: null,
  },
];

function getStatusBadge(status: string, isPublic: boolean) {
  if (status === 'draft') {
    return <Badge variant="secondary">Draft</Badge>;
  }
  return isPublic ? (
    <Badge variant="success" className="gap-1">
      <Globe className="h-3 w-3" />
      Public
    </Badge>
  ) : (
    <Badge variant="outline" className="gap-1">
      <Lock className="h-3 w-3" />
      Private
    </Badge>
  );
}

export default function PortfoliosPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredPortfolios = portfolios.filter((portfolio) => {
    const matchesSearch =
      portfolio.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      portfolio.headline.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === 'all' ||
      (activeTab === 'published' && portfolio.status === 'published') ||
      (activeTab === 'draft' && portfolio.status === 'draft');
    return matchesSearch && matchesTab;
  });

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Link copied!',
      description: 'Portfolio link has been copied to clipboard.',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Showcase Portfolios</h1>
          <p className="text-muted-foreground">
            Transform your design journeys into professional showcases
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Portfolio
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Portfolio</DialogTitle>
              <DialogDescription>
                Choose a completed journey to transform into a professional showcase.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Select Journey</Label>
                <select className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                  <option value="">Choose a journey...</option>
                  <option value="1">Sustainable Campus App (Completed)</option>
                  <option value="4">Community Food Sharing (Completed)</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Portfolio Title</Label>
                <Input placeholder="My Innovation Journey" />
              </div>
              <div className="space-y-2">
                <Label>Headline</Label>
                <Textarea
                  placeholder="A brief tagline for your portfolio..."
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Custom URL Slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    portfolio.scholarly.ai/u/
                  </span>
                  <Input placeholder="your-name-project" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(false)}>
                Create Portfolio
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search portfolios..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="published">Published</TabsTrigger>
            <TabsTrigger value="draft">Drafts</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Portfolio Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        {filteredPortfolios.map((portfolio) => (
          <Card key={portfolio.id} hover className="overflow-hidden">
            {/* Thumbnail */}
            <div className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5">
              <div className="absolute inset-0 flex items-center justify-center">
                <FolderOpen className="h-16 w-16 text-primary/30" />
              </div>
              <div className="absolute right-4 top-4">
                {getStatusBadge(portfolio.status, portfolio.isPublic)}
              </div>
            </div>

            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <CardTitle>
                    <Link
                      href={`/showcase/portfolios/${portfolio.id}`}
                      className="hover:underline"
                    >
                      {portfolio.title}
                    </Link>
                  </CardTitle>
                  <CardDescription>{portfolio.headline}</CardDescription>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link href={`/showcase/portfolios/${portfolio.id}`}>
                        <Eye className="mr-2 h-4 w-4" />
                        View & Edit
                      </Link>
                    </DropdownMenuItem>
                    {portfolio.status === 'published' && (
                      <>
                        <DropdownMenuItem asChild>
                          <a
                            href={portfolio.fullUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View Public Page
                          </a>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => copyToClipboard(portfolio.fullUrl)}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy Link
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem>
                      <Share2 className="mr-2 h-4 w-4" />
                      Share Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* Skill Tags */}
              <div className="flex flex-wrap gap-2">
                {portfolio.skillTags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>

              {/* Stats */}
              {portfolio.status === 'published' ? (
                <div className="grid grid-cols-3 gap-4 rounded-lg bg-muted/50 p-3">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      {portfolio.totalViews}
                    </div>
                    <p className="text-xs text-muted-foreground">Total Views</p>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">{portfolio.uniqueViews}</div>
                    <p className="text-xs text-muted-foreground">Unique Views</p>
                  </div>
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-1 text-lg font-semibold">
                      <MessageSquare className="h-4 w-4 text-primary" />
                      {portfolio.guestbookCount}
                    </div>
                    <p className="text-xs text-muted-foreground">Guestbook</p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg bg-muted/50 p-3 text-center text-sm text-muted-foreground">
                  <p>Publish your portfolio to start tracking views</p>
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between border-t pt-4">
                <div className="text-sm text-muted-foreground">
                  {portfolio.itemCount} curated items
                </div>
                <div className="flex gap-2">
                  {portfolio.status === 'draft' && (
                    <Button size="sm" asChild>
                      <Link href={`/showcase/portfolios/${portfolio.id}`}>
                        Continue Editing
                      </Link>
                    </Button>
                  )}
                  {portfolio.status === 'published' && (
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/showcase/portfolios/${portfolio.id}/analytics`}>
                        <TrendingUp className="mr-2 h-4 w-4" />
                        Analytics
                      </Link>
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPortfolios.length === 0 && (
        <Card className="p-12 text-center">
          <FolderOpen className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No portfolios found</h3>
          <p className="mt-2 text-muted-foreground">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Create your first showcase portfolio from a completed journey'}
          </p>
          <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Portfolio
          </Button>
        </Card>
      )}
    </div>
  );
}
