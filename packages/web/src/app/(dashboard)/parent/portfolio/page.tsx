'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Download, Eye, Calendar, Award, Loader2 } from 'lucide-react';
import { useParent } from '@/hooks/use-parent';
import type { FamilyChild } from '@/types/parent';

// ---------------------------------------------------------------------------
// Fallback data (original mock — used when API returns null)
// ---------------------------------------------------------------------------
const PORTFOLIO_ITEMS_FALLBACK = [
  {
    id: 'p1',
    title: 'Science Fair Project - Solar System Model',
    type: 'project',
    subject: 'Science',
    date: '2026-01-20',
    grade: 'A',
    description: 'Created a 3D model of the solar system with accurate scale representations.',
  },
  {
    id: 'p2',
    title: 'Creative Writing - Short Story',
    type: 'assignment',
    subject: 'English',
    date: '2026-01-15',
    grade: 'A-',
    description: 'Original short story exploring themes of friendship and adventure.',
  },
  {
    id: 'p3',
    title: 'Math Problem Solving Challenge',
    type: 'challenge',
    subject: 'Mathematics',
    date: '2026-01-10',
    grade: 'B+',
    description: 'Participated in school-wide math challenge, solved 15/20 problems.',
  },
  {
    id: 'p4',
    title: 'Art Project - Watercolor Landscape',
    type: 'project',
    subject: 'Art',
    date: '2026-01-05',
    grade: 'A+',
    description: 'Beautiful watercolor painting of a sunset landscape.',
  },
];

// ---------------------------------------------------------------------------
// Bridge: API FamilyChild → portfolio items
// The backend doesn't have a dedicated portfolio endpoint (yet), but we can
// synthesise meaningful portfolio items from a child's progress milestones:
// mastered graphemes become "achievements", phonics phase completion becomes
// a "milestone", and high accuracy scores become "accomplishments".
// ---------------------------------------------------------------------------
function bridgeChildToPortfolio(child: FamilyChild) {
  const items: Array<{
    id: string;
    title: string;
    type: string;
    subject: string;
    date: string;
    grade: string;
    description: string;
  }> = [];

  const dateStr = child.lastActiveAt
    ? new Date(child.lastActiveAt).toISOString().split('T')[0]
    : new Date().toISOString().split('T')[0];

  const name = child.preferredName || child.firstName;

  if (child.phonicsProgress) {
    const pp = child.phonicsProgress;

    // Phase achievement
    items.push({
      id: `${child.id}-phase`,
      title: `Phonics Phase ${pp.currentPhase} — In Progress`,
      type: 'milestone',
      subject: 'Phonics',
      date: dateStr,
      grade: pp.currentPhase >= 3 ? 'A' : pp.currentPhase >= 2 ? 'B+' : 'B',
      description: `${name} has mastered ${pp.masteredGraphemes} graphemes and ${pp.sightWordsMastered} sight words.`,
    });

    // Blending achievement
    if (pp.blendingAccuracy >= 0.7) {
      const grade = pp.blendingAccuracy >= 0.9 ? 'A+' : pp.blendingAccuracy >= 0.8 ? 'A' : 'B+';
      items.push({
        id: `${child.id}-blending`,
        title: 'Blending Skills Achievement',
        type: 'achievement',
        subject: 'Phonics',
        date: dateStr,
        grade,
        description: `${name} can blend sounds together with ${Math.round(pp.blendingAccuracy * 100)}% accuracy.`,
      });
    }

    // Sight words milestone
    if (pp.sightWordsMastered >= 10) {
      items.push({
        id: `${child.id}-sightwords`,
        title: `${pp.sightWordsMastered} Sight Words Mastered`,
        type: 'achievement',
        subject: 'Reading',
        date: dateStr,
        grade: pp.sightWordsMastered >= 20 ? 'A+' : pp.sightWordsMastered >= 15 ? 'A' : 'B+',
        description: `${name} can recognise ${pp.sightWordsMastered} high-frequency words on sight.`,
      });
    }
  }

  if (child.numeracyProgress) {
    const np = child.numeracyProgress;

    // Numeracy level achievement
    items.push({
      id: `${child.id}-numeracy`,
      title: `Numeracy Level ${np.currentLevel}`,
      type: 'milestone',
      subject: 'Numeracy',
      date: dateStr,
      grade: np.currentLevel >= 3 ? 'A' : np.currentLevel >= 2 ? 'B+' : 'B',
      description: `${name} knows ${np.shapesKnown} shapes and counts reliably.`,
    });

    // Subitizing achievement
    if (np.subitizingAccuracy >= 0.75) {
      items.push({
        id: `${child.id}-subitizing`,
        title: 'Quick Number Recognition',
        type: 'achievement',
        subject: 'Numeracy',
        date: dateStr,
        grade: np.subitizingAccuracy >= 0.9 ? 'A+' : 'A',
        description: `${name} can identify small quantities instantly with ${Math.round(np.subitizingAccuracy * 100)}% accuracy.`,
      });
    }
  }

  // Streak achievement
  if (child.currentStreak >= 7) {
    items.push({
      id: `${child.id}-streak`,
      title: `${child.currentStreak} Day Learning Streak`,
      type: 'challenge',
      subject: 'Engagement',
      date: dateStr,
      grade: child.currentStreak >= 21 ? 'A+' : child.currentStreak >= 14 ? 'A' : 'B+',
      description: `${name} has been learning consistently for ${child.currentStreak} days in a row!`,
    });
  }

  // Total stars achievement
  if (child.totalStars >= 500) {
    items.push({
      id: `${child.id}-stars`,
      title: `${child.totalStars.toLocaleString()} Stars Collected`,
      type: 'achievement',
      subject: 'Overall',
      date: dateStr,
      grade: child.totalStars >= 2000 ? 'A+' : child.totalStars >= 1000 ? 'A' : 'B+',
      description: `${name} has earned ${child.totalStars.toLocaleString()} stars across all learning activities.`,
    });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ParentPortfolioPage() {
  const { family, isLoading } = useParent();

  // Merge portfolio items from all children, sorted by date (newest first)
  const PORTFOLIO_ITEMS = family
    ? family.children
        .flatMap(bridgeChildToPortfolio)
        .sort((a, b) => b.date.localeCompare(a.date))
    : PORTFOLIO_ITEMS_FALLBACK;

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
          <h1 className="text-2xl font-semibold tracking-tight">Portfolio</h1>
          <p className="text-muted-foreground">View your children&apos;s achievements and milestones</p>
        </div>
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Download All
        </Button>
      </div>

      {PORTFOLIO_ITEMS.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Award className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <p className="text-muted-foreground">No portfolio items yet. Start learning to build achievements!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {PORTFOLIO_ITEMS.map((item) => (
            <Card key={item.id}>
              <CardContent className="flex items-start gap-4 p-6">
                <div className="rounded-lg bg-primary/10 p-3">
                  <Briefcase className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-medium">{item.title}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary">{item.subject}</Badge>
                        <Badge variant="outline" className="capitalize">{item.type}</Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-lg px-3">
                        {item.grade}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{item.description}</p>
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      {item.date}
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="ghost" size="sm">
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
