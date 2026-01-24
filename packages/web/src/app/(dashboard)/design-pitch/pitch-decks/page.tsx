'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Presentation,
  Plus,
  Clock,
  FileText,
  CheckCircle2,
  AlertCircle,
  Play,
  Edit,
} from 'lucide-react';

const pitchDecks = [
  {
    id: 'deck_1',
    title: 'EcoSip: Sustainable Campus Solution',
    journey: 'Sustainable Campus App',
    slides: 8,
    maxSlides: 10,
    duration: 15,
    maxDuration: 20,
    minFont: 32,
    status: 'ready',
    readinessScore: 85,
    lastEdited: '2024-01-20',
  },
  {
    id: 'deck_2',
    title: 'WellnessHub Pitch',
    journey: 'Student Wellness Platform',
    slides: 6,
    maxSlides: 10,
    duration: 12,
    maxDuration: 20,
    minFont: 30,
    status: 'draft',
    readinessScore: 60,
    lastEdited: '2024-01-18',
  },
];

function getComplianceStatus(deck: typeof pitchDecks[0]) {
  const slideOk = deck.slides <= deck.maxSlides;
  const durationOk = deck.duration <= deck.maxDuration;
  const fontOk = deck.minFont >= 30;
  return { slideOk, durationOk, fontOk, allOk: slideOk && durationOk && fontOk };
}

export default function PitchDecksPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="heading-2">Pitch Decks</h1>
          <p className="text-muted-foreground">
            Create and practice your presentations using the 10/20/30 rule
          </p>
        </div>
        <Button asChild>
          <Link href="/design-pitch/pitch-decks/new">
            <Plus className="mr-2 h-4 w-4" />
            New Pitch Deck
          </Link>
        </Button>
      </div>

      {/* 10/20/30 Rule Reminder */}
      <Card className="bg-primary/5">
        <CardContent className="flex items-center gap-4 p-4">
          <Presentation className="h-8 w-8 text-primary" />
          <div>
            <p className="font-medium">The 10/20/30 Rule</p>
            <p className="text-sm text-muted-foreground">
              10 slides maximum • 20 minutes maximum • 30pt minimum font size
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {pitchDecks.map((deck) => {
          const compliance = getComplianceStatus(deck);
          return (
            <Card key={deck.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle>{deck.title}</CardTitle>
                    <CardDescription>{deck.journey}</CardDescription>
                  </div>
                  <Badge variant={deck.status === 'ready' ? 'success' : 'secondary'}>
                    {deck.status === 'ready' ? 'Ready' : 'Draft'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Compliance Checks */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    {compliance.slideOk ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span>{deck.slides}/{deck.maxSlides} slides</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {compliance.durationOk ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span>{deck.duration}/{deck.maxDuration} minutes</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    {compliance.fontOk ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <span>{deck.minFont}pt minimum font</span>
                  </div>
                </div>

                {/* Readiness Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Readiness Score</span>
                    <span className="font-medium">{deck.readinessScore}%</span>
                  </div>
                  <Progress value={deck.readinessScore} />
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Last edited: {new Date(deck.lastEdited).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" className="flex-1" asChild>
                    <Link href={`/design-pitch/pitch-decks/${deck.id}/edit`}>
                      <Edit className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button className="flex-1" asChild>
                    <Link href={`/design-pitch/pitch-decks/${deck.id}/present`}>
                      <Play className="mr-2 h-4 w-4" />
                      Present
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {pitchDecks.length === 0 && (
        <Card className="p-12 text-center">
          <Presentation className="mx-auto h-12 w-12 text-muted-foreground" />
          <h3 className="mt-4 text-lg font-medium">No pitch decks yet</h3>
          <p className="mt-2 text-muted-foreground">
            Complete a design journey to create your first pitch deck
          </p>
        </Card>
      )}
    </div>
  );
}
