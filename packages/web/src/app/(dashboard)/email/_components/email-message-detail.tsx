'use client';

import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Reply, ReplyAll, Forward, Star, Archive, Trash2,
  BellOff, MoreHorizontal, Paperclip, Send,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import type { EmailMessage } from '@/types/email';

interface EmailMessageDetailProps {
  message: EmailMessage;
  threadMessages?: EmailMessage[];
  onReply: (messageId: string, body: string) => void;
  onReplyAll: (messageId: string, body: string) => void;
  onForward: (messageId: string) => void;
  onArchive: (messageId: string) => void;
  onDelete: (messageId: string) => void;
  onStarToggle: (messageId: string) => void;
  onMuteToggle: (messageId: string) => void;
}

function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return (email || '?')[0].toUpperCase();
}

function MessageView({
  msg,
  isExpanded,
  onToggle,
}: {
  msg: EmailMessage;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="space-y-3">
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-3 text-left"
      >
        <Avatar className="h-9 w-9 shrink-0">
          <AvatarFallback className="text-xs">
            {getInitials(msg.from.name, msg.from.email)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold truncate">
              {msg.from.name || msg.from.email}
            </span>
            <span className="text-xs text-muted-foreground">
              {format(new Date(msg.date), 'MMM d, yyyy h:mm a')}
            </span>
          </div>
          {!isExpanded && (
            <p className="text-xs text-muted-foreground truncate">{msg.snippet}</p>
          )}
        </div>
      </button>

      {isExpanded && (
        <div className="pl-12 space-y-3">
          <div className="text-xs text-muted-foreground space-y-0.5">
            <p>
              To: {msg.to.map((a) => a.name || a.email).join(', ')}
            </p>
            {msg.cc && msg.cc.length > 0 && (
              <p>Cc: {msg.cc.map((a) => a.name || a.email).join(', ')}</p>
            )}
          </div>

          <div
            className="prose prose-sm dark:prose-invert max-w-none text-sm"
            dangerouslySetInnerHTML={{
              __html: msg.bodyHtml || msg.body.replace(/\n/g, '<br />'),
            }}
          />

          {msg.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {msg.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs"
                >
                  <Paperclip className="h-3 w-3" />
                  <span className="truncate max-w-[150px]">{att.filename}</span>
                  <span className="text-muted-foreground">
                    {(att.size / 1024).toFixed(0)}KB
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function EmailMessageDetail({
  message,
  threadMessages,
  onReply,
  onReplyAll,
  onForward,
  onArchive,
  onDelete,
  onStarToggle,
  onMuteToggle,
}: EmailMessageDetailProps) {
  const [replyBody, setReplyBody] = useState('');
  const [showReply, setShowReply] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    new Set([message.id])
  );

  const allMessages = threadMessages?.length ? threadMessages : [message];

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleReply = () => {
    if (!replyBody.trim()) return;
    onReply(message.id, replyBody);
    setReplyBody('');
    setShowReply(false);
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="border-b px-6 py-4 space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-lg font-semibold leading-tight">
            {message.subject || '(No subject)'}
          </h2>
          <div className="flex items-center gap-1 shrink-0">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onStarToggle(message.id)}
              title={message.isStarred ? 'Unstar' : 'Star'}
            >
              <Star
                className={`h-4 w-4 ${message.isStarred ? 'fill-yellow-400 text-yellow-400' : ''}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onMuteToggle(message.id)}
              title={message.isMuted ? 'Unmute' : 'Mute'}
            >
              <BellOff
                className={`h-4 w-4 ${message.isMuted ? 'text-muted-foreground' : ''}`}
              />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onArchive(message.id)}
              title="Archive"
            >
              <Archive className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(message.id)}
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onForward(message.id)}>
                  <Forward className="h-4 w-4 mr-2" />
                  Forward
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {message.labels.length > 0 && (
          <div className="flex gap-1">
            {message.labels.map((label) => (
              <Badge
                key={label.id}
                variant="outline"
                className="text-xs"
                style={label.color ? { borderColor: label.color, color: label.color } : undefined}
              >
                {label.name}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Thread messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {allMessages.map((msg, idx) => (
          <div key={msg.id}>
            {idx > 0 && <Separator className="mb-4" />}
            <MessageView
              msg={msg}
              isExpanded={expandedIds.has(msg.id)}
              onToggle={() => toggleExpanded(msg.id)}
            />
          </div>
        ))}
      </div>

      {/* Reply area */}
      <div className="border-t px-6 py-3">
        {showReply ? (
          <div className="space-y-3">
            <Textarea
              placeholder="Write your reply..."
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              rows={4}
              className="resize-none"
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleReply} disabled={!replyBody.trim()}>
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowReply(false);
                  setReplyBody('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReply(true)}
            >
              <Reply className="h-4 w-4 mr-2" />
              Reply
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onReplyAll(message.id, '')}
            >
              <ReplyAll className="h-4 w-4 mr-2" />
              Reply All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onForward(message.id)}
            >
              <Forward className="h-4 w-4 mr-2" />
              Forward
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
