'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { MessageSquare, Search, Star } from 'lucide-react';

const TUTORS = [
  {
    id: 't1',
    name: 'Dr. Sarah Chen',
    subject: 'Mathematics',
    child: 'Emma',
    lastMessage: 'Great progress on quadratic equations!',
    lastMessageTime: '1 hour ago',
    unread: 1,
    rating: 4.9,
  },
  {
    id: 't2',
    name: 'James Wilson',
    subject: 'English Literature',
    child: 'Emma',
    lastMessage: 'Essay outline looks good. Ready to review.',
    lastMessageTime: '3 hours ago',
    unread: 0,
    rating: 4.8,
  },
];

export default function ParentTutorMessagesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tutor Messages</h1>
        <p className="text-muted-foreground">Communicate with your children's tutors</p>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search tutors..." className="pl-10" />
      </div>

      <div className="space-y-4">
        {TUTORS.map((tutor) => (
          <Card key={tutor.id} className="cursor-pointer hover:bg-accent/50 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="" />
                  <AvatarFallback>
                    {tutor.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{tutor.name}</p>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{tutor.subject}</span>
                        <span className="flex items-center text-sm">
                          <Star className="h-3 w-3 fill-yellow-400 text-yellow-400 mr-1" />
                          {tutor.rating}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground">{tutor.lastMessageTime}</p>
                      {tutor.unread > 0 && (
                        <Badge className="mt-1">{tutor.unread}</Badge>
                      )}
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

      <Button className="w-full">
        <MessageSquare className="h-4 w-4 mr-2" />
        New Message
      </Button>
    </div>
  );
}
