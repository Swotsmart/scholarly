'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  FileText,
  Plus,
  Save,
  Sparkles,
  GripVertical,
  Trash2,
  Copy,
  Settings,
  CheckSquare,
  List,
  Type,
  Hash,
  Image,
} from 'lucide-react';

const questionTypes = [
  { id: 'multiple_choice', name: 'Multiple Choice', icon: CheckSquare },
  { id: 'true_false', name: 'True/False', icon: List },
  { id: 'short_answer', name: 'Short Answer', icon: Type },
  { id: 'essay', name: 'Essay', icon: FileText },
  { id: 'numeric', name: 'Numeric', icon: Hash },
  { id: 'image_based', name: 'Image Based', icon: Image },
];

export default function AssessmentBuilderPage() {
  const [questions, setQuestions] = useState([
    { id: 1, type: 'multiple_choice', text: 'What is the capital of Australia?', points: 1 },
    { id: 2, type: 'short_answer', text: 'Explain the water cycle in your own words.', points: 5 },
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <FileText className="h-8 w-8" />
            Assessment Builder
          </h1>
          <p className="text-muted-foreground">
            Create and customize assessments for your students
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </Button>
          <Button variant="outline">Preview</Button>
          <Button>
            <Save className="mr-2 h-4 w-4" />
            Save Assessment
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Builder */}
        <div className="lg:col-span-3 space-y-4">
          {/* Assessment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Assessment Title</Label>
                  <Input placeholder="Enter assessment title..." />
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <select className="w-full p-2 rounded border">
                    <option>Mathematics</option>
                    <option>Science</option>
                    <option>English</option>
                    <option>History</option>
                  </select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Instructions</Label>
                <Textarea placeholder="Enter instructions for students..." rows={2} />
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Time Limit</Label>
                  <Input type="number" placeholder="Minutes" />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input type="date" />
                </div>
                <div className="space-y-2">
                  <Label>Total Points</Label>
                  <Input type="number" value={questions.reduce((sum, q) => sum + q.points, 0)} readOnly />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* AI Generate */}
          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-6 w-6 text-purple-600" />
                  <div>
                    <h3 className="font-semibold">AI Question Generator</h3>
                    <p className="text-sm text-muted-foreground">
                      Generate questions automatically based on learning objectives
                    </p>
                  </div>
                </div>
                <Button className="bg-purple-600 hover:bg-purple-700">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Questions
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Questions */}
          <div className="space-y-4">
            {questions.map((question, index) => (
              <Card key={question.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="cursor-move">
                      <GripVertical className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Q{index + 1}</Badge>
                          <Badge variant="secondary">{question.type.replace('_', ' ')}</Badge>
                          <Badge>{question.points} pts</Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon">
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon">
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                      <Textarea
                        value={question.text}
                        placeholder="Enter question text..."
                        rows={2}
                      />
                      {question.type === 'multiple_choice' && (
                        <div className="space-y-2">
                          <Label>Answer Options</Label>
                          {['A', 'B', 'C', 'D'].map((opt) => (
                            <div key={opt} className="flex items-center gap-2">
                              <input type="radio" name={`q${question.id}`} />
                              <Input placeholder={`Option ${opt}`} className="flex-1" />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add Question */}
          <Button variant="outline" className="w-full" onClick={() => setQuestions([...questions, { id: Date.now(), type: 'multiple_choice', text: '', points: 1 }])}>
            <Plus className="mr-2 h-4 w-4" />
            Add Question
          </Button>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Question Types</CardTitle>
              <CardDescription>Drag to add to assessment</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {questionTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div
                      key={type.id}
                      className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted"
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-sm">{type.name}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Standards Alignment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Button variant="outline" className="w-full">
                  <Plus className="mr-2 h-4 w-4" />
                  Align to Standards
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Link questions to curriculum standards
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
