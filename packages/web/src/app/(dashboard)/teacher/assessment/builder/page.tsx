'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { teacherApi } from '@/lib/teacher-api';
import { ArrowLeft, Plus, Save, Brain, Sparkles, Send, Bot } from 'lucide-react';

export default function AssessmentBuilderPage() {
  const [title, setTitle] = useState('');
  const [type, setType] = useState('quiz');
  const [subject, setSubject] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [issyMessage, setIssyMessage] = useState('');
  const [issyResponse, setIssyResponse] = useState<string | null>(null);
  const [issyThinking, setIssyThinking] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setIsSaving(true);
    try {
      await teacherApi.content.create({ title, type: type as 'assessment', subject, description: '', content: {} });
    } catch { /* handled by UI */ }
    finally { setIsSaving(false); }
  }

  async function handleAskIssy() {
    if (!issyMessage.trim()) return;
    setIssyThinking(true);
    try {
      const result = await teacherApi.ai.askIssy(issyMessage, {});
      setIssyResponse(result.data.message.content);
    } catch { setIssyResponse('Unable to reach AI assistant.'); }
    finally { setIssyThinking(false); setIssyMessage(''); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/teacher/assessment"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div>
          <h1 className="heading-2">Assessment Builder</h1>
          <p className="text-muted-foreground">Create a new assessment with AI assistance</p>
        </div>
      </div>

      {/* Ask Issy for assessment help */}
      <Card className="border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-purple-500" />Ask Issy</CardTitle>
          <CardDescription>Get AI help designing your assessment questions, rubric criteria, or alignment suggestions</CardDescription>
        </CardHeader>
        <CardContent>
          {issyResponse && <div className="mb-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 p-4"><p className="text-sm">{issyResponse}</p></div>}
          <div className="flex gap-2">
            <input type="text" value={issyMessage} onChange={(e) => setIssyMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAskIssy()}
              placeholder="e.g. Generate 5 comprehension questions for Year 4 reading assessment"
              className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" disabled={issyThinking} />
            <Button size="sm" onClick={handleAskIssy} disabled={issyThinking || !issyMessage.trim()} className="bg-purple-600 hover:bg-purple-700">
              {issyThinking ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Assessment Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Design Thinking Process Quiz" /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="rubric">Rubric Assessment</SelectItem>
                  <SelectItem value="worksheet">Worksheet</SelectItem>
                  <SelectItem value="activity">Activity</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Design & Technology" /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild><Link href="/teacher/assessment">Cancel</Link></Button>
            <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
              {isSaving ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" /> : <Save className="mr-2 h-4 w-4" />}
              Save Assessment
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
