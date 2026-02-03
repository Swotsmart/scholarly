'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lightbulb, Target, Users, Presentation, CheckCircle, ArrowRight } from 'lucide-react';

export default function PitchGuidePage() {
  const sections = [
    {
      icon: Lightbulb,
      title: 'The Hook',
      description: 'Start with a compelling problem statement that captures attention.',
      tips: ['Use statistics or stories', 'Make it relatable', 'Create urgency'],
    },
    {
      icon: Target,
      title: 'Your Solution',
      description: 'Clearly explain how your idea solves the problem.',
      tips: ['Be specific and clear', 'Show the unique value', 'Demonstrate feasibility'],
    },
    {
      icon: Users,
      title: 'Know Your Audience',
      description: 'Tailor your pitch to who you are presenting to.',
      tips: ['Research your audience', 'Anticipate questions', 'Speak their language'],
    },
    {
      icon: Presentation,
      title: 'Visual Storytelling',
      description: 'Use visuals to enhance your narrative.',
      tips: ['Less text, more impact', 'Consistent design', 'High-quality images'],
    },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pitch Guide</h1>
        <p className="text-muted-foreground">Master the art of presenting your ideas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>The Perfect Pitch Formula</CardTitle>
          <CardDescription>Follow these steps to create a winning presentation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-sm mb-6">
            {['Hook', 'Problem', 'Solution', 'Demo', 'Ask'].map((step, i) => (
              <div key={step} className="flex items-center">
                <span className="px-3 py-1 bg-primary/10 text-primary rounded-full">{step}</span>
                {i < 4 && <ArrowRight className="h-4 w-4 mx-2 text-muted-foreground" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Icon className="h-5 w-5 text-primary" />
                  {section.title}
                </CardTitle>
                <CardDescription>{section.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {section.tips.map((tip) => (
                    <li key={tip} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      {tip}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
