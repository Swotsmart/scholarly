'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { MessageSquare, Send, Search } from 'lucide-react';

const TEACHERS = [
  {
    id: 't1',
    name: 'Ms. Jennifer Adams',
    role: 'Year 5 Teacher',
    child: 'Emma',
    lastMessage: 'Emma did great on her math test!',
    lastMessageTime: '2 hours ago',
    unread: 2,
  },
  {
    id: 't2',
    name: 'Mr. Robert Brown',
    role: 'Science Teacher',
    child: 'Emma',
    lastMessage: 'The science project is due next Friday.',
    lastMessageTime: 'Yesterday',
    unread: 0,
  },
  {
    id: 't3',
    name: 'Mrs. Lisa Chen',
    role: 'Year 3 Teacher',
    child: 'Oliver',
    lastMessage: 'Oliver has been very engaged in class!',
    lastMessageTime: '2 days ago',
    unread: 0,
  },
];

export default function ParentTeacherMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Teacher Messages</h1>
        <p className="text-muted-foreground">Communicate with your children's teachers</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search teachers..." className="pl-10" />
      </div>

      <div className="space-y-4">
        {TEACHERS.map((teacher) => (
          <Card key={teacher.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="" />
                  <AvatarFallback>
                    {teacher.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{teacher.name}</p>
                      <p className="text-sm text-muted-foreground">{teacher.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{teacher.lastMessageTime}</p>
                      {teacher.unread > 0 && (
                        <Badge className="mt-1">{teacher.unread}</Badge>
                      )}
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

      <Button className="w-full">
        <MessageSquare className="h-4 w-4 mr-2" />
        New Message
      </Button>
    </div>
  );
}
