'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Plus, TrendingUp, Trophy, Star, ChevronRight, School, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useParent } from '@/hooks/use-parent';
import type { FamilyChild } from '@/types/parent';

// ---------------------------------------------------------------------------
// Bridge: API FamilyChild → display format
// ---------------------------------------------------------------------------
function bridgeChild(child: FamilyChild) {
  const pp = child.phonicsProgress;
  const avgAccuracy = pp ? Math.round((pp.blendingAccuracy + pp.segmentingAccuracy) / 2 * 100) : 0;
  return {
    id: child.id,
    firstName: child.preferredName || child.firstName,
    lastName: '',
    avatarUrl: child.avatarId ? `/avatars/${child.avatarId}.jpg` : '/avatars/default.jpg',
    grade: pp ? `Phase ${pp.currentPhase}` : 'Phase 1',
    school: child.currentWorld.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
    overallProgress: Math.max(avgAccuracy, 10),
    streak: child.currentStreak,
    xp: child.totalStars,
    level: Math.floor(child.totalStars / 300) + 1,
  };
}

const CHILDREN_FALLBACK = [
  { id: 'child-emma-001', firstName: 'Emma', lastName: 'Patterson', avatarUrl: '/avatars/avatar-unicorn.jpg', grade: 'Phase 3', school: 'Enchanted Forest', overallProgress: 78, streak: 12, xp: 2450, level: 8 },
  { id: 'child-jack-002', firstName: 'Jack', lastName: 'Patterson', avatarUrl: '/avatars/avatar-dinosaur.jpg', grade: 'Phase 1', school: 'Jungle Adventure', overallProgress: 42, streak: 5, xp: 680, level: 3 },
];

export default function ParentChildrenPage() {
  const { family, isLoading } = useParent();
  const CHILDREN = family ? family.children.map(bridgeChild) : CHILDREN_FALLBACK;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
                    {child.firstName[0]}{(child.lastName || '?')[0]}
                  </AvatarFallback>
                </Avatar>
                <Badge variant="secondary" className="bg-green-100 text-green-700">Active</Badge>
              </div>
              <CardTitle className="mt-3">{child.firstName} {child.lastName}</CardTitle>
              <CardDescription className="flex items-center gap-1">
                <School className="h-3 w-3" />
                {child.school} - {child.grade}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-muted-foreground">Overall Progress</span>
                  <span className="text-sm font-medium">{child.overallProgress}%</span>
                </div>
                <Progress value={child.overallProgress} className="h-2" />
              </div>
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
