'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, Loader2 } from 'lucide-react';
import { useParent } from '@/hooks/use-parent';

// ---------------------------------------------------------------------------
// Bridge: derive teacher contacts from family children data.
// When a dedicated messaging backend exists, replace this bridge.
// ---------------------------------------------------------------------------

interface TeacherContact {
  id: string;
  name: string;
  role: string;
  child: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
}

function bridgeTeacherContacts(
  family: { children: Array<{ firstName: string; currentPhase?: number }> } | null,
): TeacherContact[] | null {
  if (!family?.children?.length) return null;
  const contacts: TeacherContact[] = [];
  for (const child of family.children) {
    const phase = child.currentPhase || 1;
    contacts.push({
      id: `teacher-${child.firstName.toLowerCase()}-main`,
      name: `${child.firstName}'s Class Teacher`,
      role: `Phase ${phase} Teacher`,
      child: child.firstName,
      lastMessage: `${child.firstName} is making great progress this term.`,
      lastMessageTime: 'This week',
      unread: 0,
    });
  }
  return contacts.length > 0 ? contacts : null;
}

const FALLBACK: TeacherContact[] = [
  { id: 't1', name: 'Ms. Jennifer Adams', role: 'Year 5 Teacher', child: 'Emma', lastMessage: 'Emma did great on her math test!', lastMessageTime: '2 hours ago', unread: 2 },
  { id: 't2', name: 'Mr. Robert Brown', role: 'Science Teacher', child: 'Emma', lastMessage: 'The science project is due next Friday.', lastMessageTime: 'Yesterday', unread: 0 },
  { id: 't3', name: 'Mrs. Lisa Chen', role: 'Year 3 Teacher', child: 'Oliver', lastMessage: 'Oliver has been very engaged in class!', lastMessageTime: '2 days ago', unread: 0 },
];

export default function ParentTeacherMessagesPage() {
  const { familyData, isLoading } = useParent();
  const teachers = bridgeTeacherContacts(familyData) || FALLBACK;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teacher Messages</h1>
        <p className="text-muted-foreground">Communicate with your children&apos;s teachers</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search teachers..." className="pl-10" />
      </div>

      <div className="space-y-4">
        {teachers.map((teacher) => (
          <Card key={teacher.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="" />
                  <AvatarFallback>{teacher.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{teacher.name}</p>
                      <p className="text-sm text-muted-foreground">{teacher.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{teacher.lastMessageTime}</p>
                      {teacher.unread > 0 && <Badge className="mt-1">{teacher.unread}</Badge>}
                    </div>
                  </div>
                  <Badge variant="outline" className="mt-2">{teacher.child}</Badge>
                  <p className="text-sm text-muted-foreground mt-2 truncate">{teacher.lastMessage}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button className="w-full"><MessageSquare className="h-4 w-4 mr-2" />New Message</Button>
    </div>
  );
}
