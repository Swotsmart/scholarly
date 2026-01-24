'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Sparkles,
  Clock,
  Users,
  ArrowRight,
  Leaf,
  Heart,
  Accessibility,
  Globe,
} from 'lucide-react';

const challenges = [
  {
    id: 'challenge_sustainability_1',
    title: 'Sustainable Campus Life',
    description: 'Design an innovative solution that promotes sustainability on your school campus. Identify a specific environmental problem and create a practical solution.',
    difficulty: 'Intermediate',
    duration: '3-4 weeks',
    participants: 156,
    icon: Leaf,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    tags: ['Sustainability', 'Environment', 'Campus'],
  },
  {
    id: 'challenge_wellness_1',
    title: 'Student Wellness Innovation',
    description: 'Design a solution that addresses mental health and wellness challenges faced by students. Create an accessible solution that improves wellbeing.',
    difficulty: 'Intermediate',
    duration: '3-4 weeks',
    participants: 89,
    icon: Heart,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    tags: ['Health', 'Wellness', 'Mental Health'],
  },
  {
    id: 'challenge_accessibility_1',
    title: 'Inclusive Learning Design',
    description: 'Create tools and solutions that make educational content more accessible to students with diverse learning needs.',
    difficulty: 'Advanced',
    duration: '4-5 weeks',
    participants: 67,
    icon: Accessibility,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    tags: ['Accessibility', 'Education', 'Inclusion'],
  },
  {
    id: 'challenge_community_1',
    title: 'Community Connection',
    description: 'Design solutions that strengthen community bonds and help neighbors support each other in meaningful ways.',
    difficulty: 'Beginner',
    duration: '2-3 weeks',
    participants: 203,
    icon: Globe,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    tags: ['Community', 'Social Impact', 'Connection'],
  },
];

export default function ChallengesPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Design Challenges</h1>
          <p className="text-muted-foreground">
            Choose a challenge and start your design thinking journey
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {challenges.map((challenge) => {
          const Icon = challenge.icon;
          return (
            <Card key={challenge.id} className="group transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className={`rounded-lg p-3 ${challenge.bgColor}`}>
                    <Icon className={`h-6 w-6 ${challenge.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle>{challenge.title}</CardTitle>
                    <CardDescription className="mt-1">
                      {challenge.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {challenge.tags.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Sparkles className="h-4 w-4" />
                    {challenge.difficulty}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {challenge.duration}
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {challenge.participants} participants
                  </div>
                </div>

                <Button className="w-full" asChild>
                  <Link href={`/design-pitch/challenges/${challenge.id}`}>
                    Start Challenge
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
