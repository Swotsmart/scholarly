'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, Send, Search, Plus } from 'lucide-react';

const CONVERSATIONS = [
  {
    id: 'c1',
    name: 'Ms. Thompson',
    role: 'Year 4 Teacher',
    avatar: '/teachers/thompson.jpg',
    lastMessage: 'Emma did great on her math test today!',
    timestamp: '10:30 AM',
    unread: 2,
  },
  {
    id: 'c2',
    name: 'Mr. Williams',
    role: 'Drama Teacher',
    avatar: '/teachers/williams.jpg',
    lastMessage: 'Looking forward to the performance next week.',
    timestamp: 'Yesterday',
    unread: 0,
  },
  {
    id: 'c3',
    name: 'Dr. Sarah Chen',
    role: 'Math Tutor',
    avatar: '/tutors/sarah.jpg',
    lastMessage: 'Session confirmed for Friday 5pm.',
    timestamp: '2 days ago',
    unread: 0,
  },
  {
    id: 'c4',
    name: 'Admin Office',
    role: 'School Administration',
    avatar: null,
    lastMessage: 'February newsletter is now available.',
    timestamp: '3 days ago',
    unread: 1,
  },
];

export default function ParentMessagesPage() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredConversations = CONVERSATIONS.filter(c =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const unreadTotal = CONVERSATIONS.reduce((sum, c) => sum + c.unread, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">
            Communicate with teachers and tutors
            {unreadTotal > 0 && (
              <Badge className="ml-2 bg-red-500">{unreadTotal} unread</Badge>
            )}
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Message
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search conversations..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`flex items-start gap-4 p-4 cursor-pointer hover:bg-muted/50 transition-colors ${
                  conversation.unread > 0 ? 'bg-primary/5' : ''
                }`}
              >
                <Avatar className="h-12 w-12">
                  <AvatarImage src={conversation.avatar || undefined} alt={conversation.name} />
                  <AvatarFallback>{conversation.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className={`font-medium ${conversation.unread > 0 ? 'font-semibold' : ''}`}>
                        {conversation.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{conversation.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{conversation.timestamp}</p>
                      {conversation.unread > 0 && (
                        <Badge className="mt-1 bg-primary">{conversation.unread}</Badge>
                      )}
                    </div>
                  </div>
                  <p className={`text-sm mt-1 truncate ${conversation.unread > 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                    {conversation.lastMessage}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
