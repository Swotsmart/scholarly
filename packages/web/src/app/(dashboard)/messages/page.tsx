'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { MessageSquare, Search, Plus, Circle } from 'lucide-react';

export default function MessagesPage() {
  const conversations = [
    { id: 1, name: 'Dr. Sarah Chen', role: 'Mathematics Teacher', lastMessage: 'Great progress on the algebra test!', time: '2 min ago', unread: true },
    { id: 2, name: 'John Smith', role: 'Science Tutor', lastMessage: 'See you at our session tomorrow', time: '1 hour ago', unread: true },
    { id: 3, name: 'Emily Davis', role: 'Study Group', lastMessage: 'Anyone free to review chapter 5?', time: '3 hours ago', unread: false },
    { id: 4, name: 'Support Team', role: 'Scholarly Support', lastMessage: 'Your ticket has been resolved', time: '1 day ago', unread: false },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
          <p className="text-muted-foreground">Communicate with teachers, tutors, and peers</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Message
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search messages..." className="pl-10" />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="flex items-start gap-3 p-4 hover:bg-muted/50 cursor-pointer transition-colors"
                >
                  <Avatar>
                    <AvatarFallback>{conversation.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className={`font-medium truncate ${conversation.unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {conversation.name}
                      </p>
                      <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                        {conversation.time}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{conversation.role}</p>
                    <p className={`text-sm truncate mt-0.5 ${conversation.unread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                      {conversation.lastMessage}
                    </p>
                  </div>
                  {conversation.unread && (
                    <Circle className="h-2 w-2 fill-primary text-primary shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardContent className="flex flex-col items-center justify-center h-[500px] text-center">
            <MessageSquare className="h-16 w-16 text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium">Select a conversation</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1">
              Choose a conversation from the left to view messages, or start a new conversation.
            </p>
            <Button variant="outline" className="mt-4">
              <Plus className="mr-2 h-4 w-4" />
              Start New Conversation
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
