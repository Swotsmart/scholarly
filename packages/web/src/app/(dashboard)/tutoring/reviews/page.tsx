'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import {
  Star,
  TrendingUp,
  ThumbsUp,
  MessageSquare,
  Filter,
  Quote,
} from 'lucide-react';

const reviews = [
  {
    id: 1,
    student: 'Emma Smith',
    initials: 'ES',
    rating: 5,
    date: 'Jan 30, 2026',
    subject: 'Algebra',
    comment: 'Sarah is an amazing tutor! She explains concepts so clearly and is always patient. My understanding of quadratic equations improved significantly after just a few sessions.',
    helpful: 12,
  },
  {
    id: 2,
    student: 'Liam Chen',
    initials: 'LC',
    rating: 5,
    date: 'Jan 28, 2026',
    subject: 'Calculus',
    comment: 'Excellent tutor for calculus. She helped me prepare for my HSC exam and I feel much more confident now. Highly recommend!',
    helpful: 8,
  },
  {
    id: 3,
    student: 'Sophie Garcia',
    initials: 'SG',
    rating: 4,
    date: 'Jan 25, 2026',
    subject: 'Statistics',
    comment: 'Good explanations and very knowledgeable. Sometimes the pace is a bit fast but overall a great learning experience.',
    helpful: 5,
  },
  {
    id: 4,
    student: 'James Wilson',
    initials: 'JW',
    rating: 5,
    date: 'Jan 22, 2026',
    subject: 'Algebra',
    comment: 'My son has improved so much since starting sessions with Sarah. She makes math fun and engaging!',
    helpful: 15,
  },
  {
    id: 5,
    student: 'Olivia Brown',
    initials: 'OB',
    rating: 5,
    date: 'Jan 20, 2026',
    subject: 'Calculus',
    comment: 'Sarah is patient, knowledgeable, and genuinely cares about her students. Best tutor I have had!',
    helpful: 10,
  },
];

const ratingBreakdown = [
  { stars: 5, count: 105, percentage: 83 },
  { stars: 4, count: 18, percentage: 14 },
  { stars: 3, count: 3, percentage: 2 },
  { stars: 2, count: 1, percentage: 1 },
  { stars: 1, count: 0, percentage: 0 },
];

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Star className="h-8 w-8" />
            Reviews & Ratings
          </h1>
          <p className="text-muted-foreground">
            View feedback from your students
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Overall Rating */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-6">
              <div className="text-center">
                <div className="text-5xl font-bold">4.9</div>
                <div className="flex items-center justify-center gap-1 mt-2">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-1">127 reviews</p>
              </div>
              <div className="flex-1 space-y-2">
                {ratingBreakdown.map((item) => (
                  <div key={item.stars} className="flex items-center gap-2">
                    <span className="text-sm w-6">{item.stars}</span>
                    <Star className="h-3 w-3 text-yellow-400" />
                    <Progress value={item.percentage} className="h-2 flex-1" />
                    <span className="text-sm text-muted-foreground w-8">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Feedback Highlights */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Feedback Highlights</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { label: 'Patient & Clear', percentage: 94 },
                { label: 'Knowledgeable', percentage: 98 },
                { label: 'Well Prepared', percentage: 92 },
                { label: 'Good Communication', percentage: 95 },
              ].map((item) => (
                <div key={item.label}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{item.label}</span>
                    <span className="text-muted-foreground">{item.percentage}%</span>
                  </div>
                  <Progress value={item.percentage} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Quick Stats</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  <span className="text-sm">This month</span>
                </div>
                <span className="font-medium">12 reviews</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  <span className="text-sm">Average rating</span>
                </div>
                <span className="font-medium">4.9 / 5.0</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ThumbsUp className="h-5 w-5 text-blue-500" />
                  <span className="text-sm">Would recommend</span>
                </div>
                <span className="font-medium">98%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-purple-500" />
                  <span className="text-sm">Response rate</span>
                </div>
                <span className="font-medium">100%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Reviews Filter */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm">
              <Filter className="mr-2 h-4 w-4" />
              All Reviews
            </Button>
            <Button variant="ghost" size="sm">5 Stars (105)</Button>
            <Button variant="ghost" size="sm">4 Stars (18)</Button>
            <Button variant="ghost" size="sm">3 Stars (3)</Button>
            <Button variant="ghost" size="sm">With Comments</Button>
          </div>
        </CardContent>
      </Card>

      {/* Reviews List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Reviews</CardTitle>
          <CardDescription>Feedback from your students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {reviews.map((review) => (
              <div key={review.id} className="p-4 rounded-lg border">
                <div className="flex items-start gap-4">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10">{review.initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{review.student}</p>
                        <Badge variant="outline">{review.subject}</Badge>
                      </div>
                      <span className="text-sm text-muted-foreground">{review.date}</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1">
                      {[...Array(review.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                      {[...Array(5 - review.rating)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 text-gray-200" />
                      ))}
                    </div>
                    <div className="mt-3 flex items-start gap-2">
                      <Quote className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                      <p className="text-muted-foreground">{review.comment}</p>
                    </div>
                    <div className="mt-3 flex items-center gap-4">
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <ThumbsUp className="mr-1 h-3 w-3" />
                        Helpful ({review.helpful})
                      </Button>
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        <MessageSquare className="mr-1 h-3 w-3" />
                        Reply
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="w-full mt-4">Load More Reviews</Button>
        </CardContent>
      </Card>
    </div>
  );
}
