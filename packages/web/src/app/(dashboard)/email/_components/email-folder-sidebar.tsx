'use client';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Inbox, Send, FileEdit, Trash2, Archive, AlertTriangle, Star, Plus, Tag,
} from 'lucide-react';
import type { EmailFolder, EmailFolderInfo, EmailLabel } from '@/types/email';

const FOLDER_ICONS: Record<EmailFolder, React.ElementType> = {
  inbox: Inbox,
  sent: Send,
  drafts: FileEdit,
  trash: Trash2,
  archive: Archive,
  spam: AlertTriangle,
  starred: Star,
};

const FOLDER_LABELS: Record<EmailFolder, string> = {
  inbox: 'Inbox',
  sent: 'Sent',
  drafts: 'Drafts',
  trash: 'Trash',
  archive: 'Archive',
  spam: 'Spam',
  starred: 'Starred',
};

interface EmailFolderSidebarProps {
  folders: EmailFolderInfo[];
  selectedFolder: EmailFolder;
  labels: EmailLabel[];
  selectedLabel?: string;
  onFolderSelect: (folder: EmailFolder) => void;
  onLabelSelect: (labelId: string) => void;
  onCompose: () => void;
}

export function EmailFolderSidebar({
  folders,
  selectedFolder,
  labels,
  selectedLabel,
  onFolderSelect,
  onLabelSelect,
  onCompose,
}: EmailFolderSidebarProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="p-3">
        <Button onClick={onCompose} className="w-full gap-2">
          <Plus className="h-4 w-4" />
          Compose
        </Button>
      </div>

      <nav className="flex-1 space-y-1 px-2">
        {folders.map((folder) => {
          const Icon = FOLDER_ICONS[folder.id];
          const isSelected = selectedFolder === folder.id && !selectedLabel;
          return (
            <button
              key={folder.id}
              onClick={() => onFolderSelect(folder.id)}
              className={cn(
                'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                isSelected
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate text-left">
                {FOLDER_LABELS[folder.id]}
              </span>
              {folder.unreadCount > 0 && (
                <span className={cn(
                  'ml-auto text-xs font-semibold tabular-nums',
                  isSelected ? 'text-primary' : 'text-muted-foreground'
                )}>
                  {folder.unreadCount}
                </span>
              )}
            </button>
          );
        })}

        {labels.length > 0 && (
          <>
            <div className="px-3 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Labels
            </div>
            {labels.map((label) => (
              <button
                key={label.id}
                onClick={() => onLabelSelect(label.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  selectedLabel === label.id
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Tag
                  className="h-4 w-4 shrink-0"
                  style={label.color ? { color: label.color } : undefined}
                />
                <span className="flex-1 truncate text-left">{label.name}</span>
              </button>
            ))}
          </>
        )}
      </nav>
    </div>
  );
}
