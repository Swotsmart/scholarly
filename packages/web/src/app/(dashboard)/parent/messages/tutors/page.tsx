'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, Star, Loader2 } from 'lucide-react';
import { useTutoring } from '@/hooks/use-tutoring';
import type { Booking } from '@/types/tutoring';

// ---------------------------------------------------------------------------
// Bridge: derive tutor message contacts from booking history
// ---------------------------------------------------------------------------

interface TutorContact {
  id: string;
  name: string;
  subject: string;
  child: string;
  lastMessage: string;
  lastMessageTime: string;
  unread: number;
  rating: number;
}

function bridgeTutorContacts(bookings: Booking[]): TutorContact[] | null {
  if (!bookings.length) return null;
  const tutorMap = new Map<string, TutorContact>();
  for (const b of bookings) {
    const name = b.tutor.user.displayName;
    if (tutorMap.has(name)) continue;
    const topic = b.topicsNeedingHelp?.[0] || b.subjectId;
    const isActive = b.status === 'confirmed' || b.status === 'pending';
    const childName = b.learnerIds[0]?.includes('amelia') ? 'Amelia' : b.learnerIds[0]?.includes('liam') ? 'Liam' : 'Child';
    tutorMap.set(name, {
      id: `tutor-msg-${b.tutor.userId}`, name,
      subject: b.subjectId.charAt(0).toUpperCase() + b.subjectId.slice(1),
      child: childName,
      lastMessage: isActive ? `Session ${b.status} — ${topic}` : `Last session: ${topic}`,
      lastMessageTime: isActive ? 'Recent' : 'Last week',
      unread: b.status === 'pending' ? 1 : 0,
      rating: 4.8,
    });
  }
  const contacts = Array.from(tutorMap.values());
  return contacts.length > 0 ? contacts : null;
}

const FALLBACK: TutorContact[] = [
  { id: 't1', name: 'Dr. Sarah Chen', subject: 'Mathematics', child: 'Emma', lastMessage: 'Great progress on quadratic equations!', lastMessageTime: '1 hour ago', unread: 1, rating: 4.9 },
  { id: 't2', name: 'James Wilson', subject: 'English Literature', child: 'Emma', lastMessage: 'Essay outline looks good. Ready to review.', lastMessageTime: '3 hours ago', unread: 0, rating: 4.8 },
];

export default function ParentTutorMessagesPage() {
  const { data, isLoading } = useTutoring();
  const tutors = bridgeTutorContacts(data?.allBookings || []) || FALLBACK;

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tutor Messages</h1>
        <p className="text-muted-foreground">Communicate with your children&apos;s tutors</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search tutors..." className="pl-10" />
      </div>

      <div className="space-y-4">
        {tutors.map((tutor) => (
          <Card key={tutor.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="" />
                  <AvatarFallback>{tutor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{tutor.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{tutor.subject}</span>
                        <span className="flex items-center text-sm">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />{tutor.rating}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{tutor.lastMessageTime}</p>
                      {tutor.unread > 0 && <Badge className="mt-1">{tutor.unread}</Badge>}
                    </div>
                  </div>
                  <Badge variant="outline" className="mt-2">{tutor.child}</Badge>
                  <p className="text-sm text-muted-foreground mt-2 truncate">{tutor.lastMessage}</p>
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
