'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Archive, Trash2, Clock, Reply, ReplyAll, Forward, MoreHorizontal,
  RefreshCw, Search, CheckSquare, Star,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface EmailToolbarProps {
  selectedCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onArchive: () => void;
  onDelete: () => void;
  onSnooze: () => void;
  onStar: () => void;
  onMarkRead: () => void;
  onRefresh: () => void;
}

export function EmailToolbar({
  selectedCount,
  searchQuery,
  onSearchChange,
  onArchive,
  onDelete,
  onSnooze,
  onStar,
  onMarkRead,
  onRefresh,
}: EmailToolbarProps) {
  return (
    <div className="flex items-center gap-2 border-b px-3 py-2">
      {selectedCount > 0 ? (
        <>
          <span className="text-sm text-muted-foreground mr-2">
            {selectedCount} selected
          </span>
          <Button variant="ghost" size="icon" onClick={onArchive} title="Archive">
            <Archive className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onDelete} title="Delete">
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onSnooze} title="Snooze">
            <Clock className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onStar} title="Star">
            <Star className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onMarkRead} title="Mark as read">
            <CheckSquare className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={onMarkRead}>
                Mark as read
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onArchive}>
                Move to archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      ) : (
        <>
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search emails..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="pl-9 h-9"
            />
          </div>
          <Button variant="ghost" size="icon" onClick={onRefresh} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </>
      )}
    </div>
  );
}
