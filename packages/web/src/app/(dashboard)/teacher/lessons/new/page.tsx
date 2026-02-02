'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  BookOpen,
  Save,
  Sparkles,
  Plus,
  Clock,
  Target,
  FileText,
  Video,
  Image,
  Link,
  Upload,
} from 'lucide-react';

export default function NewLessonPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <BookOpen className="h-8 w-8" />
            Create New Lesson
          </h1>
          <p className="text-muted-foreground">
            Design an engaging lesson for your students
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">Save Draft</Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Publish Lesson
          </Button>
        </div>
      </div>

      {/* AI Generate Banner */}
      <Card className="border-purple-200 bg-purple-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-purple-600" />
              <div>
                <h3 className="font-semibold">AI Lesson Generator</h3>
                <p className="text-sm text-muted-foreground">
                  Generate a complete lesson plan with activities and resources
                </p>
              </div>
            </div>
            <Button className="bg-purple-600 hover:bg-purple-700">
              <Sparkles className="mr-2 h-4 w-4" />
              Generate with AI
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <Card>
            <CardHeader>
              <CardTitle>Lesson Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Lesson Title</Label>
                <Input placeholder="Enter a descriptive title..." />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <select className="w-full p-2 rounded border">
                    <option>Mathematics</option>
                    <option>Science</option>
                    <option>English</option>
                    <option>History</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Year Level</Label>
                  <select className="w-full p-2 rounded border">
                    <option>Year 7</option>
                    <option>Year 8</option>
                    <option>Year 9</option>
                    <option>Year 10</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea placeholder="Describe what students will learn..." rows={3} />
              </div>
            </CardContent>
          </Card>

          {/* Learning Objectives */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Learning Objectives
              </CardTitle>
              <CardDescription>What students will be able to do after this lesson</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-2">
                <Input placeholder="Students will be able to..." className="flex-1" />
                <Button variant="outline" size="icon">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2">
                {['Understand the concept of quadratic equations', 'Solve basic quadratic equations using factoring'].map((obj, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 rounded bg-muted">
                    <span className="text-sm">• {obj}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Lesson Content */}
          <Card>
            <CardHeader>
              <CardTitle>Lesson Content</CardTitle>
              <CardDescription>Add your lesson materials and activities</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <Button variant="outline" className="h-24 flex-col">
                  <FileText className="h-6 w-6 mb-2" />
                  Add Text Content
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <Video className="h-6 w-6 mb-2" />
                  Add Video
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <Image className="h-6 w-6 mb-2" />
                  Add Images
                </Button>
                <Button variant="outline" className="h-24 flex-col">
                  <Link className="h-6 w-6 mb-2" />
                  Add External Link
                </Button>
              </div>

              <div className="border-2 border-dashed rounded-lg p-8 text-center">
                <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">
                  Drag and drop files here, or click to upload
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Lesson Timing
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Duration</Label>
                <select className="w-full p-2 rounded border">
                  <option>30 minutes</option>
                  <option>45 minutes</option>
                  <option>60 minutes</option>
                  <option>90 minutes</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Lesson Structure</Label>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between p-2 rounded bg-muted">
                    <span>Introduction</span>
                    <span>5 min</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted">
                    <span>Direct Instruction</span>
                    <span>15 min</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted">
                    <span>Guided Practice</span>
                    <span>15 min</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-muted">
                    <span>Wrap-up</span>
                    <span>5 min</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Standards Alignment</CardTitle>
            </CardHeader>
            <CardContent>
              <Button variant="outline" className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Link to Standards
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Align your lesson to curriculum standards
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Differentiation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {['Extension activities', 'Support materials', 'Alternative assessments'].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <input type="checkbox" />
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
