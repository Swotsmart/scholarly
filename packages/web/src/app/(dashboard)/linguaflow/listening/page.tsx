'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Headphones, Play, Pause, Volume2, Clock } from 'lucide-react';

export default function LinguaflowListeningPage() {
  const exercises = [
    { id: 1, title: 'Daily Conversation', level: 'Beginner', duration: '5 min', completed: true },
    { id: 2, title: 'News Report', level: 'Intermediate', duration: '8 min', completed: false },
    { id: 3, title: 'Podcast Discussion', level: 'Advanced', duration: '12 min', completed: false },
    { id: 4, title: 'Movie Dialogue', level: 'Intermediate', duration: '6 min', completed: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Listening Practice</h1>
        <p className="text-muted-foreground">Improve your comprehension with audio exercises</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Headphones className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-sm text-muted-foreground">Exercises Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                <Clock className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">2.5h</p>
                <p className="text-sm text-muted-foreground">Total Listening Time</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                <Volume2 className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">85%</p>
                <p className="text-sm text-muted-foreground">Comprehension Score</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listening Exercises</CardTitle>
          <CardDescription>Choose an exercise to practice</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {exercises.map((exercise) => (
              <div key={exercise.id} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-4">
                  <Button variant="outline" size="icon" className="rounded-full">
                    <Play className="h-4 w-4" />
                  </Button>
                  <div>
                    <p className="font-medium">{exercise.title}</p>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                      <span className="px-2 py-0.5 bg-primary/10 text-primary rounded-full text-xs">
                        {exercise.level}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {exercise.duration}
                      </span>
                    </div>
                  </div>
                </div>
                {exercise.completed ? (
                  <span className="text-green-500 text-sm">Completed</span>
                ) : (
                  <Button size="sm">Start</Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
