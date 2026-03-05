'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MessageSquare, Search, Star, Loader2, Send, ArrowLeft, Phone, Video } from 'lucide-react';
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

interface Message {
  id: string;
  from: 'parent' | 'tutor';
  text: string;
  time: string;
}

// Generate conversation thread from a tutor contact
function generateThread(tutor: TutorContact): Message[] {
  return [
    { id: '1', from: 'tutor', text: `Hi! I'm ${tutor.name}. I wanted to update you on ${tutor.child}'s progress.`, time: '2 hours ago' },
    { id: '2', from: 'tutor', text: tutor.lastMessage, time: tutor.lastMessageTime },
    { id: '3', from: 'parent', text: `Thanks for the update! How is ${tutor.child} doing overall?`, time: '30 min ago' },
    { id: '4', from: 'tutor', text: `${tutor.child} is making excellent progress in ${tutor.subject}. Very engaged and asking great questions.`, time: '15 min ago' },
  ];
}

export default function ParentTutorMessagesPage() {
  const { data, isLoading } = useTutoring();
  const tutors = bridgeTutorContacts(data?.allBookings || []) || FALLBACK;
  const [selectedTutor, setSelectedTutor] = useState<TutorContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelectTutor = (tutor: TutorContact) => {
    setSelectedTutor(tutor);
    setMessages(generateThread(tutor));
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedTutor) return;
    setMessages((prev) => [...prev, {
      id: `msg-${Date.now()}`,
      from: 'parent',
      text: newMessage.trim(),
      time: 'Just now',
    }]);
    setNewMessage('');
  };

  const handleBack = () => {
    setSelectedTutor(null);
    setMessages([]);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  // Conversation view
  if (selectedTutor) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={handleBack}>
            <ArrowLeft className="h-4 w-4 mr-1" />Back
          </Button>
          <Avatar className="h-10 w-10">
            <AvatarFallback>{selectedTutor.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <p className="font-medium">{selectedTutor.name}</p>
            <p className="text-sm text-muted-foreground">{selectedTutor.subject} — {selectedTutor.child}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm"><Phone className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm"><Video className="h-4 w-4" /></Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6 space-y-4 min-h-[400px] max-h-[500px] overflow-y-auto">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.from === 'parent' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-2 ${
                  msg.from === 'parent'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
                }`}>
                  <p className="text-sm">{msg.text}</p>
                  <p className={`text-xs mt-1 ${msg.from === 'parent' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>{msg.time}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Textarea
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); } }}
            className="min-h-[44px] resize-none"
            rows={1}
          />
          <Button onClick={handleSendMessage} disabled={!newMessage.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  // Contact list view
  const filteredTutors = tutors.filter((t) =>
    !searchQuery || t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.subject.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tutor Messages</h1>
        <p className="text-muted-foreground">Communicate with your children&apos;s tutors</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search tutors..." className="pl-10" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
      </div>

      <div className="space-y-4">
        {filteredTutors.map((tutor) => (
          <Card key={tutor.id} className="cursor-pointer hover:bg-accent/50 transition-colors" onClick={() => handleSelectTutor(tutor)}>
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

      <Button className="w-full" onClick={() => handleSelectTutor(tutors[0])}>
        <MessageSquare className="h-4 w-4 mr-2" />New Message
      </Button>
    </div>
  );
}
