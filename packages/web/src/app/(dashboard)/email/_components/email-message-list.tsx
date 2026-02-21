'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Star, Paperclip } from 'lucide-react';
import { formatDistanceToNow, format, isToday, isThisYear } from 'date-fns';
import type { EmailMessage } from '@/types/email';

interface EmailMessageListProps {
  messages: EmailMessage[];
  selectedId?: string;
  onSelect: (message: EmailMessage) => void;
  onStarToggle: (messageId: string) => void;
}

function formatEmailDate(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return format(date, 'h:mm a');
  }
  if (isThisYear(date)) {
    return format(date, 'MMM d');
  }
  return format(date, 'MMM d, yyyy');
}

export function EmailMessageList({
  messages,
  selectedId,
  onSelect,
  onStarToggle,
}: EmailMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 text-muted-foreground">
        No messages
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      {messages.map((message) => (
        <button
          key={message.id}
          onClick={() => onSelect(message)}
          className={cn(
            'flex w-full items-start gap-3 border-b px-4 py-3 text-left transition-colors',
            selectedId === message.id
              ? 'bg-primary/5'
              : 'hover:bg-muted/50',
            !message.isRead && 'bg-primary/[0.02]'
          )}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              onStarToggle(message.id);
            }}
            className="mt-0.5 shrink-0"
          >
            <Star
              className={cn(
                'h-4 w-4',
                message.isStarred
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground/40 hover:text-muted-foreground'
              )}
            />
          </button>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'truncate text-sm',
                  !message.isRead ? 'font-semibold text-foreground' : 'text-foreground'
                )}
              >
                {message.from.name || message.from.email}
              </span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {formatEmailDate(message.date)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'truncate text-sm',
                  !message.isRead ? 'font-medium text-foreground' : 'text-muted-foreground'
                )}
              >
                {message.subject || '(No subject)'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <span className="truncate text-xs text-muted-foreground">
                {message.snippet}
              </span>
              {message.attachments.length > 0 && (
                <Paperclip className="h-3 w-3 shrink-0 text-muted-foreground" />
              )}
            </div>

            {message.labels.length > 0 && (
              <div className="flex gap-1 pt-0.5">
                {message.labels.slice(0, 3).map((label) => (
                  <Badge
                    key={label.id}
                    variant="outline"
                    className="text-[10px] px-1.5 py-0"
                    style={label.color ? { borderColor: label.color, color: label.color } : undefined}
                  >
                    {label.name}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </button>
      ))}
    </div>
  );
}
