'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import { ArrowLeft, Save, Bot, Send, Sparkles } from 'lucide-react';

export default function CreateChallengePage() {
  const { data: teacherData } = useTeacher({ page: 'challenges-create' });
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [issyMsg, setIssyMsg] = useState('');
  const [issyResp, setIssyResp] = useState<string | null>(null);
  const [issyThinking, setIssyThinking] = useState(false);

  const classBreakdown = teacherData?.analytics?.data?.classBreakdown ?? [];

  async function handleSave() {
    if (!title.trim()) return;
    setIsSaving(true);
    try { await teacherApi.content.create({ title, type: 'activity', subject, description: '', content: {} }); }
    catch {} finally { setIsSaving(false); }
  }

  async function handleAskIssy() {
    if (!issyMsg.trim()) return;
    setIssyThinking(true);
    try { const r = await teacherApi.ai.askIssy(issyMsg, {}); setIssyResp(r.data.message.content); }
    catch { setIssyResp('Unable to reach AI.'); }
    finally { setIssyThinking(false); setIssyMsg(''); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild><Link href="/teacher/challenges"><ArrowLeft className="mr-2 h-4 w-4" />Back</Link></Button>
        <div><h1 className="heading-2">Create Challenge</h1><p className="text-muted-foreground">Design a new learning challenge for your students</p></div>
      </div>

      <Card className="border-purple-200 dark:border-purple-800/50 bg-gradient-to-br from-purple-50/50 to-transparent dark:from-purple-900/10">
        <CardHeader className="pb-3"><CardTitle className="flex items-center gap-2"><Bot className="h-5 w-5 text-purple-500" />Challenge Ideas</CardTitle></CardHeader>
        <CardContent>
          {issyResp && <div className="mb-4 rounded-lg border border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-900/20 p-4"><p className="text-sm">{issyResp}</p></div>}
          <div className="flex gap-2">
            <input type="text" value={issyMsg} onChange={(e) => setIssyMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleAskIssy()}
              placeholder="e.g. Suggest a design thinking challenge for Year 10" className="flex-1 rounded-lg border bg-background px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" disabled={issyThinking} />
            <Button size="sm" onClick={handleAskIssy} disabled={issyThinking || !issyMsg.trim()} className="bg-purple-600 hover:bg-purple-700">
              {issyThinking ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Challenge Details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2"><Label>Title</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Challenge title" /></div>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2"><Label>Subject</Label><Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Design & Technology" /></div>
            <div className="space-y-2"><Label>Assign to Class</Label>
              <Select><SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent>
                  {classBreakdown.map(c => <SelectItem key={c.classId} value={c.classId}>{c.className}</SelectItem>)}
                  {classBreakdown.length === 0 && <SelectItem value="none" disabled>No classes available</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild><Link href="/teacher/challenges">Cancel</Link></Button>
            <Button onClick={handleSave} disabled={isSaving || !title.trim()}><Save className="mr-2 h-4 w-4" />Create Challenge</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
