'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Map, Target, Lightbulb, ArrowRight } from 'lucide-react';

export default function NewJourneyPage() {
  const [step, setStep] = useState(1);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Journey</h1>
        <p className="text-muted-foreground">Design your learning journey step by step</p>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium ${
              s <= step ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
            }`}>
              {s}
            </div>
            {s < 3 && <div className={`w-12 h-0.5 ${s < step ? 'bg-primary' : 'bg-muted'}`} />}
          </div>
        ))}
      </div>

      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Journey Details
            </CardTitle>
            <CardDescription>What would you like to explore?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Journey Title</label>
              <Input placeholder="e.g., Building a Sustainable Future" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea placeholder="Describe what you want to learn..." className="mt-1" />
            </div>
            <Button onClick={() => setStep(2)} className="w-full">
              Continue
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Set Your Goals
            </CardTitle>
            <CardDescription>What do you want to achieve?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Primary Goal</label>
              <Input placeholder="e.g., Create a working prototype" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Skills to Develop</label>
              <Input placeholder="e.g., Design thinking, prototyping" className="mt-1" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={() => setStep(3)} className="flex-1">
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {step === 3 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              Review & Launch
            </CardTitle>
            <CardDescription>Ready to start your journey?</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">Your journey will be created with AI-powered milestones and resources tailored to your goals.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
              <Button className="flex-1">Launch Journey</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
