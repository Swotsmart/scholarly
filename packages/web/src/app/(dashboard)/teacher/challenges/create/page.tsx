'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Lightbulb,
  Target,
  Users,
  Calendar,
  Palette,
  Settings,
  ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

const designPhases = [
  { id: 'empathize', label: 'Empathize', icon: Users, color: 'pink' },
  { id: 'define', label: 'Define', icon: Target, color: 'purple' },
  { id: 'ideate', label: 'Ideate', icon: Lightbulb, color: 'yellow' },
  { id: 'prototype', label: 'Prototype', icon: Settings, color: 'blue' },
  { id: 'test', label: 'Test', icon: Settings, color: 'green' },
  { id: 'pitch', label: 'Pitch', icon: Palette, color: 'orange' },
];

const mockClasses = [
  { id: 'class-1', name: 'Year 10 Design & Technology - Period 1/2' },
  { id: 'class-2', name: 'Year 11 Innovation & Design - Period 3/4' },
  { id: 'class-3', name: 'Year 12 Major Project - Period 6' },
];

export default function CreateChallengePage() {
  const [selectedPhases, setSelectedPhases] = useState<string[]>(['empathize', 'define', 'ideate', 'prototype', 'test']);

  const togglePhase = (phaseId: string) => {
    setSelectedPhases((prev) =>
      prev.includes(phaseId) ? prev.filter((p) => p !== phaseId) : [...prev, phaseId]
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" asChild>
            <Link href="/teacher/challenges">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <div>
            <h1 className="heading-2">Create Design Challenge</h1>
            <p className="text-muted-foreground">
              Define a new design thinking challenge for your students
            </p>
          </div>
        </div>
      </div>

      {/* Basic Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Basic Information
          </CardTitle>
          <CardDescription>
            Set the core details for this design challenge
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Challenge Title</Label>
            <Input
              id="title"
              placeholder="e.g., Sustainable Campus Design"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="Describe the challenge context, goals, and expected outcomes..."
              className="min-h-[120px]"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject Area</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="design-tech">Design & Technology</SelectItem>
                  <SelectItem value="digital-tech">Digital Technologies</SelectItem>
                  <SelectItem value="engineering">Engineering Studies</SelectItem>
                  <SelectItem value="visual-arts">Visual Arts</SelectItem>
                  <SelectItem value="stem">STEM Integration</SelectItem>
                  <SelectItem value="business">Business Innovation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="year-level">Year Level</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select year level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Year 7</SelectItem>
                  <SelectItem value="8">Year 8</SelectItem>
                  <SelectItem value="9">Year 9</SelectItem>
                  <SelectItem value="10">Year 10</SelectItem>
                  <SelectItem value="11">Year 11</SelectItem>
                  <SelectItem value="12">Year 12</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Design Phases */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Design Phases
          </CardTitle>
          <CardDescription>
            Select the design thinking phases students will follow
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-3">
            {designPhases.map((phase) => {
              const isSelected = selectedPhases.includes(phase.id);
              const Icon = phase.icon;
              return (
                <Button
                  key={phase.id}
                  variant={isSelected ? 'default' : 'outline'}
                  className="h-auto flex-col gap-2 py-4"
                  onClick={() => togglePhase(phase.id)}
                >
                  <Icon className="h-6 w-6" />
                  <span className="font-medium">{phase.label}</span>
                  {isSelected && (
                    <Badge variant="secondary" className="text-xs">
                      Selected
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {selectedPhases.length} of {designPhases.length} phases selected
          </p>
        </CardContent>
      </Card>

      {/* Constraints */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Constraints
          </CardTitle>
          <CardDescription>
            Set boundaries and resource limits for the challenge
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="team-size">Max Team Size</Label>
              <Input
                id="team-size"
                type="number"
                placeholder="e.g., 4"
                defaultValue={4}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (Weeks)</Label>
              <Input
                id="duration"
                type="number"
                placeholder="e.g., 6"
                defaultValue={6}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Budget ($AUD)</Label>
              <Input
                id="budget"
                type="number"
                placeholder="e.g., 50"
                defaultValue={50}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Class Assignment */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Class Assignment
          </CardTitle>
          <CardDescription>
            Assign this challenge to a class
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class">Select Class</Label>
            <Select>
              <SelectTrigger>
                <SelectValue placeholder="Choose a class..." />
              </SelectTrigger>
              <SelectContent>
                {mockClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="deadline">Submission Deadline</Label>
            <Input
              id="deadline"
              type="date"
              defaultValue="2024-03-15"
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-4">
        <Button variant="outline" asChild>
          <Link href="/teacher/challenges">Cancel</Link>
        </Button>
        <Button>
          <Palette className="mr-2 h-4 w-4" />
          Create Challenge
        </Button>
      </div>
    </div>
  );
}
