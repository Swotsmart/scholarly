'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Headphones, MessageSquare, BookOpen, PenLine, Mic, Eye } from 'lucide-react';

export default function LinguaflowSkillsPage() {
  const skills = [
    { name: 'Listening', icon: Headphones, level: 72, color: 'text-blue-500 bg-blue-500/10' },
    { name: 'Speaking', icon: Mic, level: 65, color: 'text-green-500 bg-green-500/10' },
    { name: 'Reading', icon: BookOpen, level: 80, color: 'text-purple-500 bg-purple-500/10' },
    { name: 'Writing', icon: PenLine, level: 58, color: 'text-orange-500 bg-orange-500/10' },
    { name: 'Vocabulary', icon: Eye, level: 75, color: 'text-pink-500 bg-pink-500/10' },
    { name: 'Conversation', icon: MessageSquare, level: 62, color: 'text-teal-500 bg-teal-500/10' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Language Skills</h1>
        <p className="text-muted-foreground">Track your proficiency across all skill areas</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Overall Proficiency</CardTitle>
          <CardDescription>Your combined language skill level</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="text-4xl font-bold">B1</div>
            <div>
              <p className="font-medium">Intermediate</p>
              <p className="text-sm text-muted-foreground">68% towards B2</p>
            </div>
          </div>
          <div className="w-full bg-muted rounded-full h-3 mt-4">
            <div className="bg-primary h-3 rounded-full" style={{ width: '68%' }} />
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {skills.map((skill) => {
          const Icon = skill.icon;
          return (
            <Card key={skill.name}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between mb-4">
                  <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${skill.color}`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <span className="text-2xl font-bold">{skill.level}%</span>
                </div>
                <p className="font-medium">{skill.name}</p>
                <div className="w-full bg-muted rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${skill.level}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Skill Recommendations</CardTitle>
          <CardDescription>Focus areas to improve faster</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
              <PenLine className="h-5 w-5 text-orange-500" />
              <div>
                <p className="font-medium">Writing Practice</p>
                <p className="text-sm text-muted-foreground">Your writing skills could use more practice. Try daily journaling.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-teal-50 dark:bg-teal-950 rounded-lg">
              <MessageSquare className="h-5 w-5 text-teal-500" />
              <div>
                <p className="font-medium">Conversation Practice</p>
                <p className="text-sm text-muted-foreground">Book a conversation session to boost your speaking confidence.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
