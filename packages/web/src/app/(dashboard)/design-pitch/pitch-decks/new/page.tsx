'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Presentation, FileText, Sparkles, Upload } from 'lucide-react';

export default function NewPitchDeckPage() {
  const templates = [
    { id: 1, name: 'Startup Pitch', description: 'Classic 10-slide startup format' },
    { id: 2, name: 'Project Proposal', description: 'Academic project presentation' },
    { id: 3, name: 'Innovation Challenge', description: 'Competition-ready format' },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create Pitch Deck</h1>
        <p className="text-muted-foreground">Build a compelling presentation for your idea</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Deck Details
            </CardTitle>
            <CardDescription>Basic information about your pitch</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium">Pitch Title</label>
              <Input placeholder="e.g., EcoTrack - Sustainable Living App" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Problem Statement</label>
              <Textarea placeholder="What problem are you solving?" className="mt-1" />
            </div>
            <div>
              <label className="text-sm font-medium">Your Solution</label>
              <Textarea placeholder="How does your idea solve this problem?" className="mt-1" />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Presentation className="h-5 w-5" />
                Choose Template
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className="p-3 rounded-lg border cursor-pointer hover:border-primary transition-colors"
                >
                  <p className="font-medium">{template.name}</p>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Assistance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Let AI help you create compelling slides based on your content.
              </p>
              <Button variant="outline" className="w-full">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate with AI
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="outline">Save Draft</Button>
        <Button>Create Pitch Deck</Button>
      </div>
    </div>
  );
}
