'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Users, Plus, TrendingUp, Trophy, Star, ChevronRight, School } from 'lucide-react';
import Link from 'next/link';

const CHILDREN = [
  {
    id: 'child-1',
    firstName: 'Emma',
    lastName: 'Johnson',
    avatarUrl: '/avatars/emma.jpg',
    grade: 'Year 4',
    school: 'Sunshine Primary',
    overallProgress: 78,
    streak: 14,
    xp: 2450,
    level: 8,
    status: 'active',
  },
  {
    id: 'child-2',
    firstName: 'Oliver',
    lastName: 'Johnson',
    avatarUrl: '/avatars/oliver.jpg',
    grade: 'Year 2',
    school: 'Sunshine Primary',
    overallProgress: 65,
    streak: 7,
    xp: 1280,
    level: 5,
    status: 'active',
  },
  {
    id: 'child-3',
    firstName: 'Sophie',
    lastName: 'Johnson',
    avatarUrl: '/avatars/sophie.jpg',
    grade: 'Year 7',
    school: 'Riverside Secondary',
    overallProgress: 82,
    streak: 21,
    xp: 4100,
    level: 12,
    status: 'active',
  },
];

export default function ParentChildrenPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Children</h1>
          <p className="text-muted-foreground">Manage and monitor your children&apos;s accounts</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Child
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {CHILDREN.map((child) => (
          <Card key={child.id} className="hover:shadow-lg transition-shadow">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={child.avatarUrl} alt={child.firstName} />
                  <AvatarFallback className="text-lg">
                    {child.firstName[0]}{child.lastName[0]}
                  </AvatarFallback>
                </Avatar>
                <Badge variant="secondary" className="bg-green-100 text-green-700">
                  Active
                </Badge>
              </div>
              <CardTitle className="mt-3">{child.firstName} {child.lastName}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <School className="h-3 w-3" />
                {child.school} - {child.grade}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Progress */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Overall Progress</span>
                  <span className="text-sm font-medium">{child.overallProgress}%</span>
                </div>
                <Progress value={child.overallProgress} className="h-2" />
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-muted p-2">
                  <div className="flex items-center justify-center gap-1 text-orange-500">
                    <Trophy className="h-4 w-4" />
                    <span className="font-bold">{child.streak}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Streak</p>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <div className="flex items-center justify-center gap-1 text-yellow-500">
                    <Star className="h-4 w-4" />
                    <span className="font-bold">{child.xp.toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">XP</p>
                </div>
                <div className="rounded-lg bg-muted p-2">
                  <div className="flex items-center justify-center gap-1 text-purple-500">
                    <TrendingUp className="h-4 w-4" />
                    <span className="font-bold">{child.level}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Level</p>
                </div>
              </div>

              <Button variant="outline" className="w-full" asChild>
                <Link href={`/parent/progress?child=${child.id}`}>
                  View Details <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
