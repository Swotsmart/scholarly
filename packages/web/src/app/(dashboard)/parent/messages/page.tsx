'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  MessageSquare, Send, Search, Plus, Mail, Phone, CheckCircle2, Clock,
} from 'lucide-react';

type MessageChannel = 'email' | 'sms' | 'whatsapp';

const CHANNEL_ICONS: Record<MessageChannel, React.ElementType> = {
  email: Mail,
  sms: Phone,
  whatsapp: MessageSquare,
};

const CHANNEL_LABELS: Record<MessageChannel, string> = {
  email: 'Email',
  sms: 'SMS',
  whatsapp: 'WhatsApp',
};

const CONVERSATIONS = [
  {
    id: 'c1',
    name: 'Ms. Thompson',
    role: 'Year 4 Teacher',
    avatar: '/teachers/thompson.jpg',
    lastMessage: 'Emma did great on her math test today!',
    timestamp: '10:30 AM',
    unread: 2,
    channel: 'email' as MessageChannel,
    deliveryStatus: 'delivered' as const,
  },
  {
    id: 'c2',
    name: 'Mr. Williams',
    role: 'Drama Teacher',
    avatar: '/teachers/williams.jpg',
    lastMessage: 'Looking forward to the performance next week.',
    timestamp: 'Yesterday',
    unread: 0,
    channel: 'email' as MessageChannel,
    deliveryStatus: 'read' as const,
  },
  {
    id: 'c3',
    name: 'Dr. Sarah Chen',
    role: 'Math Tutor',
    avatar: '/tutors/sarah.jpg',
    lastMessage: 'Session confirmed for Friday 5pm.',
    timestamp: '2 days ago',
    unread: 0,
    channel: 'whatsapp' as MessageChannel,
    deliveryStatus: 'delivered' as const,
  },
  {
    id: 'c4',
    name: 'Admin Office',
    role: 'School Administration',
    avatar: null,
    lastMessage: 'February newsletter is now available.',
    timestamp: '3 days ago',
    unread: 1,
    channel: 'sms' as MessageChannel,
    deliveryStatus: 'sent' as const,
  },
];

function DeliveryStatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'delivered':
    case 'read':
      return (
        <Badge variant="outline" className="text-[10px] text-green-600 border-green-300 gap-1">
          <CheckCircle2 className="h-2.5 w-2.5" />
          {status === 'read' ? 'Read' : 'Delivered'}
        </Badge>
      );
    case 'sent':
      return (
        <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-300 gap-1">
          <Send className="h-2.5 w-2.5" />
          Sent
        </Badge>
      );
    default:
      return (
        <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
          <Clock className="h-2.5 w-2.5" />
          Pending
        </Badge>
      );
  }
}

export default function ParentMessagesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeChannel, setComposeChannel] = useState<MessageChannel>('email');
  const [composeBody, setComposeBody] = useState('');

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
        <Button onClick={() => setComposeOpen(true)}>
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
            {filteredConversations.map((conversation) => {
              const ChannelIcon = CHANNEL_ICONS[conversation.channel];
              return (
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
                      <div className="text-right space-y-1">
                        <p className="text-xs text-muted-foreground">{conversation.timestamp}</p>
                        {conversation.unread > 0 ? (
                          <Badge className="bg-primary">{conversation.unread}</Badge>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            <ChannelIcon className="h-3 w-3 text-muted-foreground" />
                            <DeliveryStatusBadge status={conversation.deliveryStatus} />
                          </div>
                        )}
                      </div>
                    </div>
                    <p className={`text-sm mt-1 truncate ${conversation.unread > 0 ? 'font-medium' : 'text-muted-foreground'}`}>
                      {conversation.lastMessage}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Compose dialog with channel selector */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Message</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Recipient</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select a teacher or tutor" />
                </SelectTrigger>
                <SelectContent>
                  {CONVERSATIONS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name} — {c.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Channel</Label>
              <div className="flex gap-2">
                {(['email', 'sms', 'whatsapp'] as MessageChannel[]).map((ch) => {
                  const Icon = CHANNEL_ICONS[ch];
                  return (
                    <Button
                      key={ch}
                      variant={composeChannel === ch ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => setComposeChannel(ch)}
                      className="gap-1.5"
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {CHANNEL_LABELS[ch]}
                    </Button>
                  );
                })}
              </div>
            </div>

            {composeChannel === 'email' && (
              <div className="space-y-2">
                <Label>Subject</Label>
                <Input placeholder="Message subject" />
              </div>
            )}

            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                value={composeBody}
                onChange={(e) => setComposeBody(e.target.value)}
                placeholder={
                  composeChannel === 'sms'
                    ? 'SMS message (160 characters recommended)...'
                    : 'Write your message...'
                }
                rows={composeChannel === 'sms' ? 3 : 6}
              />
              {composeChannel === 'sms' && (
                <p className="text-xs text-muted-foreground">
                  {composeBody.length}/160 characters
                </p>
              )}
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setComposeOpen(false)}>
                Cancel
              </Button>
              <Button disabled={!composeBody.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Send via {CHANNEL_LABELS[composeChannel]}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
