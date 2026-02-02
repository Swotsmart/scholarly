'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  HelpCircle,
  BookOpen,
  MessageSquare,
  Video,
  FileText,
  ExternalLink,
  ChevronRight,
  Mail,
  Phone,
  Clock,
  Sparkles,
} from 'lucide-react';

const helpCategories = [
  {
    title: 'Getting Started',
    icon: Sparkles,
    color: 'bg-blue-500',
    articles: 12,
    description: 'Learn the basics of using Scholarly',
  },
  {
    title: 'Account & Settings',
    icon: HelpCircle,
    color: 'bg-purple-500',
    articles: 8,
    description: 'Manage your profile and preferences',
  },
  {
    title: 'Learning Features',
    icon: BookOpen,
    color: 'bg-green-500',
    articles: 15,
    description: 'Explore courses, AI buddy, and more',
  },
  {
    title: 'Tutoring',
    icon: Video,
    color: 'bg-orange-500',
    articles: 10,
    description: 'Book sessions and manage tutoring',
  },
  {
    title: 'Billing & Payments',
    icon: FileText,
    color: 'bg-red-500',
    articles: 6,
    description: 'Subscriptions, invoices, and refunds',
  },
  {
    title: 'Technical Support',
    icon: MessageSquare,
    color: 'bg-cyan-500',
    articles: 9,
    description: 'Troubleshooting and technical issues',
  },
];

const popularArticles = [
  { title: 'How to reset your password', views: 1234 },
  { title: 'Getting started with AI Buddy', views: 987 },
  { title: 'Booking your first tutoring session', views: 856 },
  { title: 'Understanding your learning dashboard', views: 743 },
  { title: 'Managing notification preferences', views: 621 },
  { title: 'How to track your progress', views: 589 },
];

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-background p-8 text-center">
        <h1 className="text-3xl font-bold tracking-tight mb-2">How can we help you?</h1>
        <p className="text-muted-foreground mb-6">
          Search our knowledge base or browse categories below
        </p>
        <div className="max-w-xl mx-auto relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search for help articles..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 h-12 text-lg"
          />
        </div>
      </div>

      {/* Help Categories */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Browse by Category</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {helpCategories.map((category) => {
            const Icon = category.icon;
            return (
              <Card key={category.title} className="cursor-pointer hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className={`${category.color} rounded-lg p-3`}>
                      <Icon className="h-6 w-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{category.title}</h3>
                      <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
                      <Badge variant="secondary" className="mt-2">
                        {category.articles} articles
                      </Badge>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Popular Articles */}
        <Card>
          <CardHeader>
            <CardTitle>Popular Articles</CardTitle>
            <CardDescription>Most viewed help articles this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {popularArticles.map((article, index) => (
                <div
                  key={article.title}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium">
                      {index + 1}
                    </span>
                    <span className="text-sm">{article.title}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">{article.views} views</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Contact Support */}
        <Card>
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
            <CardDescription>Can't find what you're looking for?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="rounded-lg bg-blue-500/10 p-3">
                <MessageSquare className="h-6 w-6 text-blue-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Live Chat</h4>
                <p className="text-sm text-muted-foreground">Chat with our support team</p>
              </div>
              <Button>Start Chat</Button>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="rounded-lg bg-green-500/10 p-3">
                <Mail className="h-6 w-6 text-green-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Email Support</h4>
                <p className="text-sm text-muted-foreground">support@scholarly.app</p>
              </div>
              <Button variant="outline">Send Email</Button>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="rounded-lg bg-purple-500/10 p-3">
                <Phone className="h-6 w-6 text-purple-500" />
              </div>
              <div className="flex-1">
                <h4 className="font-medium">Phone Support</h4>
                <p className="text-sm text-muted-foreground">1800 SCHOLAR (1800 724 652)</p>
              </div>
              <Button variant="outline">Call Now</Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Support hours: Mon-Fri 8am-8pm AEST</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resources */}
      <Card>
        <CardHeader>
          <CardTitle>Additional Resources</CardTitle>
          <CardDescription>Explore more ways to learn about Scholarly</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted cursor-pointer">
              <Video className="h-8 w-8 text-red-500" />
              <div>
                <h4 className="font-medium">Video Tutorials</h4>
                <p className="text-sm text-muted-foreground">Watch step-by-step guides</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted cursor-pointer">
              <FileText className="h-8 w-8 text-blue-500" />
              <div>
                <h4 className="font-medium">Documentation</h4>
                <p className="text-sm text-muted-foreground">Detailed feature guides</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>
            <div className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted cursor-pointer">
              <MessageSquare className="h-8 w-8 text-green-500" />
              <div>
                <h4 className="font-medium">Community Forum</h4>
                <p className="text-sm text-muted-foreground">Ask the community</p>
              </div>
              <ExternalLink className="h-4 w-4 text-muted-foreground ml-auto" />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
