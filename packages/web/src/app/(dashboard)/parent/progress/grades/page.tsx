'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Award, Loader2 } from 'lucide-react';
import { useParent } from '@/hooks/use-parent';
import type { FamilyChild } from '@/types/parent';

// ---------------------------------------------------------------------------
// Fallback data (original mock — used when API returns null)
// ---------------------------------------------------------------------------
const CHILDREN_FALLBACK = [
  {
    id: 'c1',
    name: 'Emma',
    gpa: 3.7,
    subjects: [
      { name: 'Mathematics', grade: 'A-', score: 88, trend: 'up' as const },
      { name: 'English Literature', grade: 'A', score: 92, trend: 'stable' as const },
      { name: 'Science', grade: 'B+', score: 85, trend: 'up' as const },
      { name: 'History', grade: 'B', score: 82, trend: 'down' as const },
      { name: 'Art', grade: 'A', score: 95, trend: 'stable' as const },
    ],
  },
  {
    id: 'c2',
    name: 'Oliver',
    gpa: 3.5,
    subjects: [
      { name: 'Reading', grade: 'A', score: 94, trend: 'up' as const },
      { name: 'Mathematics', grade: 'B+', score: 86, trend: 'up' as const },
      { name: 'Writing', grade: 'B', score: 83, trend: 'stable' as const },
      { name: 'Art', grade: 'A+', score: 98, trend: 'stable' as const },
    ],
  },
];

// ---------------------------------------------------------------------------
// Bridge: API FamilyChild → grades display shape
// ---------------------------------------------------------------------------
function scoreToGrade(score: number): string {
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 60) return 'D';
  return 'F';
}

function scoreToGpa(scores: number[]): number {
  if (scores.length === 0) return 0;
  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  // 4.0 scale: A=4.0, B=3.0, C=2.0, D=1.0
  return Math.round((avg / 25) * 10) / 10; // rough mapping: 100→4.0, 75→3.0
}

function bridgeGradesChild(child: FamilyChild) {
  const subjects: Array<{ name: string; grade: string; score: number; trend: 'up' | 'down' | 'stable' }> = [];

  if (child.phonicsProgress) {
    const blendingScore = Math.round(child.phonicsProgress.blendingAccuracy * 100);
    subjects.push({
      name: 'Blending',
      grade: scoreToGrade(blendingScore),
      score: blendingScore,
      trend: blendingScore >= 75 ? 'up' : 'stable',
    });

    const segmentingScore = Math.round(child.phonicsProgress.segmentingAccuracy * 100);
    subjects.push({
      name: 'Segmenting',
      grade: scoreToGrade(segmentingScore),
      score: segmentingScore,
      trend: segmentingScore >= 70 ? 'up' : segmentingScore >= 50 ? 'stable' : 'down',
    });

    const graphemeScore = Math.min(100, Math.round((child.phonicsProgress.masteredGraphemes / 44) * 100));
    subjects.push({
      name: 'Letter Sounds',
      grade: scoreToGrade(graphemeScore),
      score: graphemeScore,
      trend: 'up',
    });
  }

  if (child.numeracyProgress) {
    const subitScore = Math.round(child.numeracyProgress.subitizingAccuracy * 100);
    subjects.push({
      name: 'Number Sense',
      grade: scoreToGrade(subitScore),
      score: subitScore,
      trend: subitScore >= 75 ? 'up' : 'stable',
    });

    const addScore = Math.round(child.numeracyProgress.additionAccuracy * 100);
    subjects.push({
      name: 'Addition',
      grade: scoreToGrade(addScore),
      score: addScore,
      trend: addScore >= 70 ? 'up' : 'stable',
    });

    const subScore = Math.round(child.numeracyProgress.subtractionAccuracy * 100);
    subjects.push({
      name: 'Subtraction',
      grade: scoreToGrade(subScore),
      score: subScore,
      trend: subScore >= 60 ? 'stable' : 'down',
    });
  }

  if (subjects.length === 0) {
    subjects.push({ name: 'Getting Started', grade: '-', score: 0, trend: 'stable' });
  }

  const allScores = subjects.filter((s) => s.score > 0).map((s) => s.score);
  const gpa = scoreToGpa(allScores);

  return {
    id: child.id,
    name: child.preferredName || child.firstName,
    gpa,
    subjects,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getTrendIcon(trend: string) {
  switch (trend) {
    case 'up':
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    case 'down':
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    default:
      return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
}

function getGradeBadge(grade: string) {
  const color = grade.startsWith('A') ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' :
    grade.startsWith('B') ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
    grade.startsWith('C') ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' :
    grade === '-' ? 'bg-muted text-muted-foreground' :
    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
  return <Badge className={color}>{grade}</Badge>;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function ParentGradesPage() {
  const { family, isLoading } = useParent();

  const CHILDREN = family
    ? family.children.map(bridgeGradesChild)
    : CHILDREN_FALLBACK;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Grades</h1>
        <p className="text-muted-foreground">View your children's academic performance</p>
      </div>

      {CHILDREN.map((child) => (
        <Card key={child.id}>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                {child.name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">GPA</span>
                <span className="text-2xl font-bold">{child.gpa}</span>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {child.subjects.map((subject) => (
                <div key={subject.name} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{subject.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">{subject.score}%</span>
                    {getGradeBadge(subject.grade)}
                    {getTrendIcon(subject.trend)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
