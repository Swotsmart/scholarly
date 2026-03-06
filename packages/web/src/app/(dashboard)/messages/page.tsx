'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  MessageSquare,
  Search,
  Plus,
  Circle,
  Send,
  ArrowLeft,
  Loader2,
  Paperclip,
  Check,
  CheckCheck,
  X,
} from 'lucide-react';
import { useTeacher } from '@/hooks/use-teacher';
import { teacherApi } from '@/lib/teacher-api';
import type { Notification } from '@/types/teacher';

// =============================================================================
// TYPES
// =============================================================================

interface Conversation {
  id: string;
  name: string;
  role: string;
  initials: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  online: boolean;
  messages: Message[];
}

interface Message {
  id: string;
  content: string;
  sender: 'me' | 'them';
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

// =============================================================================
// DEMO / FALLBACK DATA
// =============================================================================

const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

function getTimestamp(minutesAgo: number): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - minutesAgo);
  return d.toISOString();
}

function formatMessageTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString('en-AU', { day: 'numeric', month: 'short' });
}

function formatChatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

const FALLBACK_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1',
    name: 'Dr. Sarah Chen',
    role: 'Mathematics Teacher',
    initials: 'SC',
    lastMessage: 'Great progress on the algebra test! The students really improved.',
    timestamp: getTimestamp(2),
    unread: 2,
    online: true,
    messages: [
      { id: 'm1', content: 'Hi! I wanted to share some good news about the Year 5 maths results.', sender: 'them', timestamp: getTimestamp(45), status: 'read' },
      { id: 'm2', content: 'That sounds promising! What were the highlights?', sender: 'me', timestamp: getTimestamp(40), status: 'read' },
      { id: 'm3', content: 'Average scores improved by 15% compared to last term. The new problem-solving approach is really working.', sender: 'them', timestamp: getTimestamp(35), status: 'read' },
      { id: 'm4', content: 'Excellent! Should we share this with the department?', sender: 'me', timestamp: getTimestamp(30), status: 'read' },
      { id: 'm5', content: 'Absolutely. I\'ll prepare a brief summary for the staff meeting.', sender: 'them', timestamp: getTimestamp(10), status: 'delivered' },
      { id: 'm6', content: 'Great progress on the algebra test! The students really improved.', sender: 'them', timestamp: getTimestamp(2), status: 'delivered' },
    ],
  },
  {
    id: 'c2',
    name: 'John Smith',
    role: 'Science Tutor',
    initials: 'JS',
    lastMessage: 'See you at our session tomorrow at 10am.',
    timestamp: getTimestamp(60),
    unread: 1,
    online: true,
    messages: [
      { id: 'm7', content: 'Hi, just confirming our lab prep session for tomorrow.', sender: 'them', timestamp: getTimestamp(120), status: 'read' },
      { id: 'm8', content: 'Yes, I\'ll have the materials ready. Same room as last time?', sender: 'me', timestamp: getTimestamp(90), status: 'read' },
      { id: 'm9', content: 'See you at our session tomorrow at 10am.', sender: 'them', timestamp: getTimestamp(60), status: 'delivered' },
    ],
  },
  {
    id: 'c3',
    name: 'Emily Davis',
    role: 'Study Group Coordinator',
    initials: 'ED',
    lastMessage: 'Anyone free to review chapter 5 this afternoon?',
    timestamp: getTimestamp(180),
    unread: 0,
    online: false,
    messages: [
      { id: 'm10', content: 'The study group session went really well yesterday.', sender: 'them', timestamp: getTimestamp(1440), status: 'read' },
      { id: 'm11', content: 'Glad to hear it! How many attended?', sender: 'me', timestamp: getTimestamp(1380), status: 'read' },
      { id: 'm12', content: 'We had 8 students — the biggest turnout yet!', sender: 'them', timestamp: getTimestamp(1320), status: 'read' },
      { id: 'm13', content: 'Anyone free to review chapter 5 this afternoon?', sender: 'them', timestamp: getTimestamp(180), status: 'read' },
    ],
  },
  {
    id: 'c4',
    name: 'Support Team',
    role: 'Scholarly Support',
    initials: 'ST',
    lastMessage: 'Your support ticket #4521 has been resolved. Let us know if you need anything else.',
    timestamp: getTimestamp(1440),
    unread: 0,
    online: false,
    messages: [
      { id: 'm14', content: 'Hi, I\'m having trouble with the assessment module. The rubric editor isn\'t saving changes.', sender: 'me', timestamp: getTimestamp(2880), status: 'read' },
      { id: 'm15', content: 'Thanks for reporting this. We\'ve created ticket #4521 and are investigating.', sender: 'them', timestamp: getTimestamp(2820), status: 'read' },
      { id: 'm16', content: 'We\'ve identified the issue — it was related to a caching problem. A fix has been deployed.', sender: 'them', timestamp: getTimestamp(1500), status: 'read' },
      { id: 'm17', content: 'Your support ticket #4521 has been resolved. Let us know if you need anything else.', sender: 'them', timestamp: getTimestamp(1440), status: 'read' },
    ],
  },
  {
    id: 'c5',
    name: 'Lisa Wang',
    role: 'Head of English',
    initials: 'LW',
    lastMessage: 'The curriculum alignment report is ready for review.',
    timestamp: getTimestamp(360),
    unread: 0,
    online: true,
    messages: [
      { id: 'm18', content: 'I\'ve finished the curriculum alignment report for this term.', sender: 'them', timestamp: getTimestamp(420), status: 'read' },
      { id: 'm19', content: 'Perfect timing. I\'ll review it before the meeting.', sender: 'me', timestamp: getTimestamp(390), status: 'read' },
      { id: 'm20', content: 'The curriculum alignment report is ready for review.', sender: 'them', timestamp: getTimestamp(360), status: 'read' },
    ],
  },
];

// =============================================================================
// BRIDGE: notifications → conversations supplement
// =============================================================================

function notificationsToConversations(notifications: Notification[]): Conversation[] {
  if (!notifications || notifications.length === 0) return [];
  // Group notifications by type to create pseudo-conversations
  const byType = new Map<string, Notification[]>();
  for (const n of notifications) {
    const key = n.type || 'general';
    if (!byType.has(key)) byType.set(key, []);
    byType.get(key)!.push(n);
  }
  const convos: Conversation[] = [];
  for (const [type, items] of byType) {
    const latest = items[0];
    convos.push({
      id: `notif-${type}`,
      name: latest.title || type,
      role: 'Notification',
      initials: (latest.title || type).substring(0, 2).toUpperCase(),
      lastMessage: latest.message,
      timestamp: latest.createdAt,
      unread: items.filter((n) => !n.read).length,
      online: false,
      messages: items.map((n) => ({
        id: n.id,
        content: n.message,
        sender: 'them' as const,
        timestamp: n.createdAt,
        status: 'read' as const,
      })),
    });
  }
  return convos;
}

// =============================================================================
// COMPOSE DIALOG
// =============================================================================

function ComposePanel({ onClose }: { onClose: () => void }) {
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h3 className="font-semibold">New Message</h3>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex-1 p-4 space-y-3 overflow-auto">
        <div>
          <label className="text-xs font-medium text-muted-foreground">To</label>
          <Input
            placeholder="Search for a person..."
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Subject</label>
          <Input
            placeholder="Message subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">Message</label>
          <Textarea
            placeholder="Write your message..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={8}
            className="mt-1 resize-none"
          />
        </div>
      </div>
      <div className="flex items-center justify-between p-4 border-t">
        <Button variant="ghost" size="sm">
          <Paperclip className="h-4 w-4 mr-1" />
          Attach
        </Button>
        <Button size="sm" disabled={!to.trim() || !body.trim()}>
          <Send className="h-4 w-4 mr-1" />
          Send
        </Button>
      </div>
    </div>
  );
}

// =============================================================================
// MESSAGE STATUS ICON
// =============================================================================

function MessageStatus({ status }: { status: string }) {
  if (status === 'read') return <CheckCheck className="h-3 w-3 text-blue-500" />;
  if (status === 'delivered') return <CheckCheck className="h-3 w-3 text-muted-foreground" />;
  return <Check className="h-3 w-3 text-muted-foreground" />;
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [composing, setComposing] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [conversations, setConversations] = useState<Conversation[]>(FALLBACK_CONVERSATIONS);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { data, isLoading } = useTeacher({ page: 'messages' });

  // Merge notification-derived conversations with fallback
  useEffect(() => {
    if (!data) return;
    // We don't have a dedicated messaging API yet; supplement fallback with
    // notification data to show real platform activity.
    async function loadNotifications() {
      try {
        const res = await teacherApi.dashboard.getNotifications();
        const notifConvos = notificationsToConversations(res.notifications);
        if (notifConvos.length > 0) {
          setConversations((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const newConvos = notifConvos.filter((c) => !existingIds.has(c.id));
            return [...newConvos, ...prev];
          });
        }
      } catch {
        // Notifications endpoint may not be available — keep fallback
      }
    }
    loadNotifications();
  }, [data]);

  // Scroll to bottom when viewing messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [selectedConversation]);

  // Filtered conversations
  const filtered = useMemo(
    () =>
      conversations.filter(
        (c) =>
          c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [conversations, searchQuery],
  );

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0);

  // Handle sending a reply
  const handleSendReply = () => {
    if (!replyText.trim() || !selectedConversation) return;
    const newMessage: Message = {
      id: `msg-${Date.now()}`,
      content: replyText.trim(),
      sender: 'me',
      timestamp: new Date().toISOString(),
      status: 'sent',
    };
    const updated = conversations.map((c) =>
      c.id === selectedConversation.id
        ? { ...c, messages: [...c.messages, newMessage], lastMessage: replyText.trim(), timestamp: new Date().toISOString() }
        : c,
    );
    setConversations(updated);
    setSelectedConversation((prev) =>
      prev ? { ...prev, messages: [...prev.messages, newMessage], lastMessage: replyText.trim() } : prev,
    );
    setReplyText('');
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with teachers, tutors, and peers
            {totalUnread > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">{totalUnread} unread</Badge>
            )}
          </p>
        </div>
        <Button onClick={() => { setComposing(true); setSelectedConversation(null); }}>
          <Plus className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3" style={{ minHeight: 560 }}>
        {/* Conversation List */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search messages..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 flex-1 overflow-auto">
            <div className="divide-y">
              {filtered.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => {
                    setSelectedConversation(conversation);
                    setComposing(false);
                    // Mark as read
                    if (conversation.unread > 0) {
                      setConversations((prev) =>
                        prev.map((c) => (c.id === conversation.id ? { ...c, unread: 0 } : c)),
                      );
                    }
                  }}
                  className={`flex items-start gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors ${
                    selectedConversation?.id === conversation.id ? 'bg-muted/70' : ''
                  }`}
                >
                  <div className="relative">
                    <Avatar>
                      <AvatarFallback>{conversation.initials}</AvatarFallback>
                    </Avatar>
                    {conversation.online && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p
                        className={`font-medium truncate ${
                          conversation.unread > 0 ? 'text-foreground' : 'text-muted-foreground'
                        }`}
                      >
                        {conversation.name}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {formatMessageTime(conversation.timestamp)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{conversation.role}</p>
                    <p
                      className={`text-sm truncate mt-0.5 ${
                        conversation.unread > 0 ? 'text-foreground font-medium' : 'text-muted-foreground'
                      }`}
                    >
                      {conversation.lastMessage}
                    </p>
                  </div>
                  {conversation.unread > 0 && (
                    <Badge className="bg-primary text-primary-foreground shrink-0 mt-1">
                      {conversation.unread}
                    </Badge>
                  )}
                </div>
              ))}
              {filtered.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Search className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No conversations found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Message Thread / Compose */}
        <Card className="lg:col-span-2 flex flex-col">
          {composing ? (
            <ComposePanel onClose={() => setComposing(false)} />
          ) : selectedConversation ? (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 p-4 border-b">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 lg:hidden"
                  onClick={() => setSelectedConversation(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="relative">
                  <Avatar>
                    <AvatarFallback>{selectedConversation.initials}</AvatarFallback>
                  </Avatar>
                  {selectedConversation.online && (
                    <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">{selectedConversation.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {selectedConversation.online ? 'Online' : 'Offline'} &middot; {selectedConversation.role}
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-auto p-4 space-y-4" style={{ maxHeight: 400 }}>
                {selectedConversation.messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl px-4 py-2.5 ${
                        msg.sender === 'me'
                          ? 'bg-primary text-primary-foreground rounded-br-sm'
                          : 'bg-muted rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm">{msg.content}</p>
                      <div
                        className={`flex items-center gap-1 mt-1 ${
                          msg.sender === 'me' ? 'justify-end' : 'justify-start'
                        }`}
                      >
                        <span
                          className={`text-[10px] ${
                            msg.sender === 'me' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                          }`}
                        >
                          {formatChatTime(msg.timestamp)}
                        </span>
                        {msg.sender === 'me' && <MessageStatus status={msg.status} />}
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply input */}
              <div className="p-4 border-t">
                <div className="flex items-end gap-2">
                  <Textarea
                    placeholder="Type a message..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendReply();
                      }
                    }}
                    rows={1}
                    className="resize-none min-h-[40px]"
                  />
                  <Button
                    size="icon"
                    className="shrink-0"
                    disabled={!replyText.trim()}
                    onClick={handleSendReply}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </>
          ) : (
            <CardContent className="flex flex-col items-center justify-center h-full text-center py-20">
              <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
              <h3 className="text-lg font-medium">Select a conversation</h3>
              <p className="text-sm text-muted-foreground max-w-sm mt-1">
                Choose a conversation from the left to view messages, or start a new conversation.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setComposing(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Start New Conversation
              </Button>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}
