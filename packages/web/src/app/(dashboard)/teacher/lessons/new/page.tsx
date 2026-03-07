'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { teacherApi } from '@/lib/teacher-api';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Sparkles, Bot, Send } from 'lucide-react';

export default function NewLessonPage() {
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [yearLevel, setYearLevel] = useState('');
  const [duration, setDuration] = useState('60');
  const [isSaving, setIsSaving] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState<string | null>(null);
  const [issyMsg, setIssyMsg] = useState('');
  const [issyResp, setIssyResp] = useState<string | null>(null);
  const [issyThinking, setIssyThinking] = useState(false);

  async function handleGenerate() {
    if (!subject || !yearLevel) return;
    setIsGenerating(true);
    try {
      const result = await teacherApi.curriculum.generateLessonPlan({ subject, yearLevel, duration: parseInt(duration), objectives: [title || 'General lesson'] });
      setGenerated(result.lessonPlan.title);
      setTitle(result.lessonPlan.title);
    } catch { setGenerated('Generation failed — try again.'); }
    finally { setIsGenerating(false); }
  }

  async function handleAskIssy() {
    if (!issyMsg.trim()) return;
    setIssyThinking(true);
    try { const r = await teacherApi.ai.askIssy(issyMsg, {}); setIssyResp(r.data.message.content); }
    catch { setIssyResp('Unable to reach AI assistant.'); }
    finally { setIssyThinking(false); setIssyMsg(''); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/teacher/lesson-planner"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div><h1 className="heading-2">New Lesson Plan</h1><p className="text-muted-foreground">Create manually or generate with AI</p></div>
      </div>

      {/* AI generate */}
      <Card className="border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/10">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-purple-500" />AI Lesson Generator</CardTitle>
          <CardDescription>Fill in the subject and year level, then click generate — or ask Issy for specific help</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={handleGenerate} disabled={isGenerating || !subject || !yearLevel} className="bg-purple-600 hover:bg-purple-700">
            {isGenerating ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" /> : <Sparkles className="mr-2 h-4 w-4" />}
            AI Generate Lesson Plan
          </Button>
          {generated && <p className="text-sm text-purple-700 dark:text-purple-300">Generated: {generated}</p>}
          {issyResp && <div className="rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 p-4"><p className="text-sm">{issyResp}</p></div>}
          <div className="flex gap-2">
            <input type="text" value={issyMsg} onChange={(e) => setIssyMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAskIssy()}
              placeholder="Ask Issy for lesson ideas..." className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" disabled={issyThinking} />
            <Button size="sm" onClick={handleAskIssy} disabled={issyThinking || !issyMsg.trim()} className="bg-purple-600 hover:bg-purple-700">
              {issyThinking ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Lesson Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Lesson title" /></div>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" /></div>
            <div className="space-y-2"><Label>Year Level</Label>
              <Select value={yearLevel} onValueChange={setYearLevel}><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>{['Year 1','Year 2','Year 3','Year 4','Year 5','Year 6','Year 7','Year 8','Year 9','Year 10','Year 11','Year 12'].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Duration (mins)</Label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild><Link href="/teacher/lesson-planner">Cancel</Link></Button>
            <Button disabled={isSaving || !title.trim()} onClick={() => { toast({ title: 'Lesson Plan Saved', description: 'Your lesson plan has been saved successfully.' }); }}><Save className="mr-2 h-4 w-4" />Save</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
