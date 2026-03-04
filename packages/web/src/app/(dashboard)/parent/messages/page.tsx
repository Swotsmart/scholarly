'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, Loader2 } from 'lucide-react';
import { useParent } from '@/hooks/use-parent';
import { useTutoring } from '@/hooks/use-tutoring';
import type { Booking } from '@/types/tutoring';

// ---------------------------------------------------------------------------
// Bridge: synthesise conversation list from family + booking contacts.
// No dedicated messaging backend exists yet (UC v5 chat plugin is not
// integrated into the main API). When it is, replace this bridge with
// direct API calls — zero JSX changes needed.
// ---------------------------------------------------------------------------

interface Conversation {
  id: string;
  name: string;
  role: string;
  avatar: string | null;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

function bridgeConversations(
  family: { children: Array<{ firstName: string }> } | null,
  bookings: Booking[],
): Conversation[] | null {
  if (!family && bookings.length === 0) return null;
  const conversations: Conversation[] = [];
  const childNames = family?.children?.map(c => c.firstName) || [];

  // Derive tutor contacts from bookings (deduplicated)
  const seen = new Set<string>();
  for (const b of bookings) {
    const name = b.tutor.user.displayName;
    if (seen.has(name)) continue;
    seen.add(name);
    const topic = b.topicsNeedingHelp?.[0] || 'your sessions';
    conversations.push({
      id: `tutor-${b.id}`, name, role: 'Tutor', avatar: b.tutor.user.avatarUrl,
      lastMessage: b.status === 'confirmed' ? `Session confirmed — ${topic}` : `Last topic: ${topic}`,
      timestamp: 'Recent', unread: b.status === 'pending' ? 1 : 0,
    });
  }

  // School admin contact derived from children
  if (childNames.length > 0) {
    conversations.push({
      id: 'school-admin', name: 'School Administration', role: 'Admin Office', avatar: null,
      lastMessage: `Updates for ${childNames.join(' & ')}`, timestamp: 'This week', unread: 0,
    });
  }
  return conversations.length > 0 ? conversations : null;
}

// Fallback (original hardcoded data)
const FALLBACK: Conversation[] = [
  { id: 'c1', name: 'Class Teacher', role: 'Phonics Teacher', avatar: null, lastMessage: 'Emma did great on her phonics session today!', timestamp: 'Today', unread: 0 },
  { id: 'c2', name: 'Tutor', role: 'Tutoring Centre', avatar: null, lastMessage: 'Looking forward to the next session.', timestamp: 'Yesterday', unread: 0 },
  { id: 'c3', name: 'Dr. Sarah Chen', role: 'Math Tutor', avatar: '/tutors/sarah.jpg', lastMessage: 'Session confirmed for Friday 5pm.', timestamp: '2 days ago', unread: 0 },
  { id: 'c4', name: 'Admin Office', role: 'School Administration', avatar: null, lastMessage: 'February newsletter is now available.', timestamp: '3 days ago', unread: 1 },
];

export default function ParentMessagesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const { familyData, isLoading: parentLoading } = useParent();
  const { data: tutoringData, isLoading: tutoringLoading } = useTutoring();
  const isLoading = parentLoading || tutoringLoading;

  const conversations = bridgeConversations(familyData, tutoringData?.allBookings || []) || FALLBACK;
  const filtered = conversations.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const unreadTotal = conversations.reduce((sum, c) => sum + c.unread, 0);

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with teachers and tutors
            {unreadTotal > 0 && <Badge className="ml-2 bg-red-500">{unreadTotal} unread</Badge>}
          </p>
        </div>
        <Button><Plus className="h-4 w-4 mr-2" />New Message</Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search conversations..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.map((c) => (
              <div key={c.id} className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${c.unread > 0 ? 'bg-primary/5' : ''}`}>
                <Avatar className="h-12 w-12">
                  <AvatarImage src={c.avatar || undefined} alt={c.name} />
                  <AvatarFallback>{c.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-medium ${c.unread > 0 ? 'font-semibold' : ''}`}>{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{c.timestamp}</p>
                      {c.unread > 0 && <Badge className="mt-1 bg-primary">{c.unread}</Badge>}
                    </div>
                  </div>
                  <p className={`text-sm mt-1 truncate ${c.unread > 0 ? 'font-medium' : 'text-muted-foreground'}`}>{c.lastMessage}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
