'use client';

import { useState, useCallback, useEffect } from 'react';
import { Mail } from 'lucide-react';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import { EmailFolderSidebar } from './_components/email-folder-sidebar';
import { EmailToolbar } from './_components/email-toolbar';
import { EmailMessageList } from './_components/email-message-list';
import { EmailMessageDetail } from './_components/email-message-detail';
import { EmailCompose } from './_components/email-compose';
import { api } from '@/lib/api';
import type {
  EmailFolder,
  EmailFolderInfo,
  EmailMessage,
  EmailLabel,
  EmailComposeData,
} from '@/types/email';

// =============================================================================
// DEMO DATA
// =============================================================================
// When the backend email routes aren't connected yet, this provides a
// realistic preview of the 3-panel email interface.
// =============================================================================

const DEMO_LABELS: EmailLabel[] = [
  { id: 'lbl-1', name: 'Important', color: '#ef4444', type: 'user' },
  { id: 'lbl-2', name: 'School', color: '#8839ef', type: 'user' },
  { id: 'lbl-3', name: 'Parents', color: '#40a02b', type: 'user' },
];

const DEMO_FOLDERS: EmailFolderInfo[] = [
  { id: 'inbox', name: 'Inbox', unreadCount: 4, totalCount: 28 },
  { id: 'starred', name: 'Starred', unreadCount: 0, totalCount: 5 },
  { id: 'sent', name: 'Sent', unreadCount: 0, totalCount: 142 },
  { id: 'drafts', name: 'Drafts', unreadCount: 0, totalCount: 3 },
  { id: 'archive', name: 'Archive', unreadCount: 0, totalCount: 892 },
  { id: 'spam', name: 'Spam', unreadCount: 0, totalCount: 12 },
  { id: 'trash', name: 'Trash', unreadCount: 0, totalCount: 7 },
];

const DEMO_MESSAGES: EmailMessage[] = [
  {
    id: 'msg-1',
    threadId: 'thread-1',
    folder: 'inbox',
    from: { name: 'Dr. Sarah Mitchell', email: 'sarah.mitchell@school.edu.au' },
    to: [{ name: 'James Wilson', email: 'james.wilson@scholarly.app' }],
    subject: 'Year 10 Maths - Upcoming Assessment Week',
    snippet: 'Hi James, I wanted to touch base about the Year 10 assessment schedule. The mid-term exams are set for...',
    body: 'Hi James,\n\nI wanted to touch base about the Year 10 assessment schedule. The mid-term exams are set for Week 8 (March 17-21). Could we coordinate the assessment timetable to ensure students aren\'t overloaded?\n\nI\'ve drafted a proposed schedule that spreads the assessments across the week. Let me know if Tuesday works for a quick meeting to finalise.\n\nBest,\nSarah',
    date: '2026-02-21T09:15:00Z',
    isRead: false,
    isStarred: true,
    isMuted: false,
    labels: [DEMO_LABELS[0], DEMO_LABELS[1]],
    attachments: [
      { id: 'att-1', filename: 'assessment_schedule_draft.pdf', mimeType: 'application/pdf', size: 245760 },
    ],
    provider: 'gmail',
  },
  {
    id: 'msg-2',
    threadId: 'thread-2',
    folder: 'inbox',
    from: { name: 'David Smith', email: 'david.smith@parent.example.com' },
    to: [{ name: 'James Wilson', email: 'james.wilson@scholarly.app' }],
    subject: 'Re: Emma\'s Progress Report',
    snippet: 'Thank you for the detailed report. We\'re really pleased to see Emma\'s improvement in...',
    body: 'Thank you for the detailed report. We\'re really pleased to see Emma\'s improvement in mathematics this term. Could we schedule a quick chat about the extension opportunities you mentioned?\n\nBest regards,\nDavid',
    date: '2026-02-21T08:30:00Z',
    isRead: false,
    isStarred: false,
    isMuted: false,
    labels: [DEMO_LABELS[2]],
    attachments: [],
    provider: 'gmail',
  },
  {
    id: 'msg-3',
    threadId: 'thread-3',
    folder: 'inbox',
    from: { name: 'Scholarly Platform', email: 'notifications@scholarly.app' },
    to: [{ name: 'James Wilson', email: 'james.wilson@scholarly.app' }],
    subject: 'New assignment submission: Portfolio Artifact - Sustainable Design',
    snippet: 'Emma Smith has submitted a new portfolio artifact for your review. The submission includes...',
    body: 'Emma Smith has submitted a new portfolio artifact for your review.\n\nTitle: Sustainable Design Challenge\nType: Design Brief\nSubmitted: 21 Feb 2026, 7:45 AM\n\nView the submission in your Grading dashboard.',
    date: '2026-02-21T07:45:00Z',
    isRead: false,
    isStarred: false,
    isMuted: false,
    labels: [DEMO_LABELS[1]],
    attachments: [],
    provider: 'gmail',
  },
  {
    id: 'msg-4',
    threadId: 'thread-4',
    folder: 'inbox',
    from: { name: 'Principal Roberts', email: 'a.roberts@school.edu.au' },
    to: [{ name: 'All Staff', email: 'staff@school.edu.au' }],
    subject: 'Staff Meeting - Friday 2pm',
    snippet: 'A reminder that our regular staff meeting will be held this Friday at 2pm in the library...',
    body: 'Dear staff,\n\nA reminder that our regular staff meeting will be held this Friday at 2pm in the library. Agenda items include:\n\n1. Term 1 assessment moderation\n2. NAPLAN preparation update\n3. Professional development day planning\n4. Any other business\n\nPlease come prepared with your subject area updates.\n\nRegards,\nAndrew Roberts\nPrincipal',
    date: '2026-02-20T14:00:00Z',
    isRead: true,
    isStarred: false,
    isMuted: false,
    labels: [DEMO_LABELS[1]],
    attachments: [],
    provider: 'gmail',
  },
  {
    id: 'msg-5',
    threadId: 'thread-5',
    folder: 'inbox',
    from: { name: 'Lisa Chen', email: 'lisa.chen@parent.example.com' },
    to: [{ name: 'James Wilson', email: 'james.wilson@scholarly.app' }],
    subject: 'Question about homework expectations',
    snippet: 'Hi Dr Wilson, I have a quick question about the weekly homework expectations for Year 9...',
    body: 'Hi Dr Wilson,\n\nI have a quick question about the weekly homework expectations for Year 9 Science. My son mentioned that there\'s a project due next week but I can\'t find the details on the portal. Could you point me in the right direction?\n\nThanks,\nLisa',
    date: '2026-02-20T11:22:00Z',
    isRead: true,
    isStarred: false,
    isMuted: false,
    labels: [DEMO_LABELS[2]],
    attachments: [],
    provider: 'gmail',
  },
  {
    id: 'msg-6',
    threadId: 'thread-6',
    folder: 'inbox',
    from: { name: 'IT Department', email: 'it@school.edu.au' },
    to: [{ name: 'All Staff', email: 'staff@school.edu.au' }],
    subject: 'System maintenance scheduled - Saturday',
    snippet: 'The school network will undergo scheduled maintenance this Saturday from 6am to 12pm...',
    body: 'Dear all,\n\nThe school network will undergo scheduled maintenance this Saturday from 6am to 12pm. During this time, the following services will be unavailable:\n\n- Email\n- Student portal\n- Learning management system\n\nPlease plan accordingly.\n\nIT Support',
    date: '2026-02-19T16:00:00Z',
    isRead: true,
    isStarred: false,
    isMuted: true,
    labels: [],
    attachments: [],
    provider: 'gmail',
  },
];

export default function EmailPage() {
  const [selectedFolder, setSelectedFolder] = useState<EmailFolder>('inbox');
  const [selectedLabel, setSelectedLabel] = useState<string | undefined>();
  const [selectedMessage, setSelectedMessage] = useState<EmailMessage | null>(null);
  const [messages, setMessages] = useState<EmailMessage[]>(DEMO_MESSAGES);
  const [searchQuery, setSearchQuery] = useState('');
  const [composeOpen, setComposeOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Filter messages based on selected folder, label, and search
  const filteredMessages = messages.filter((msg) => {
    if (selectedLabel) {
      return msg.labels.some((l) => l.id === selectedLabel);
    }
    if (selectedFolder === 'starred') {
      return msg.isStarred;
    }
    if (msg.folder !== selectedFolder) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        msg.subject.toLowerCase().includes(q) ||
        msg.snippet.toLowerCase().includes(q) ||
        msg.from.email.toLowerCase().includes(q) ||
        (msg.from.name || '').toLowerCase().includes(q)
      );
    }
    return true;
  });

  const handleFolderSelect = useCallback((folder: EmailFolder) => {
    setSelectedFolder(folder);
    setSelectedLabel(undefined);
    setSelectedMessage(null);
  }, []);

  const handleLabelSelect = useCallback((labelId: string) => {
    setSelectedLabel(labelId);
    setSelectedMessage(null);
  }, []);

  const handleMessageSelect = useCallback((msg: EmailMessage) => {
    setSelectedMessage(msg);
    // Mark as read
    if (!msg.isRead) {
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isRead: true } : m))
      );
    }
  }, []);

  const handleStarToggle = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, isStarred: !m.isStarred } : m
      )
    );
  }, []);

  const handleMuteToggle = useCallback((messageId: string) => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, isMuted: !m.isMuted } : m
      )
    );
  }, []);

  const handleArchive = useCallback((messageId?: string) => {
    const ids = messageId ? [messageId] : Array.from(selectedIds);
    setMessages((prev) =>
      prev.map((m) => (ids.includes(m.id) ? { ...m, folder: 'archive' as EmailFolder } : m))
    );
    setSelectedIds(new Set());
    if (messageId && selectedMessage?.id === messageId) setSelectedMessage(null);
  }, [selectedIds, selectedMessage]);

  const handleDelete = useCallback((messageId?: string) => {
    const ids = messageId ? [messageId] : Array.from(selectedIds);
    setMessages((prev) =>
      prev.map((m) => (ids.includes(m.id) ? { ...m, folder: 'trash' as EmailFolder } : m))
    );
    setSelectedIds(new Set());
    if (messageId && selectedMessage?.id === messageId) setSelectedMessage(null);
  }, [selectedIds, selectedMessage]);

  const handleComposeSend = useCallback((data: EmailComposeData) => {
    // In production, this calls api.email.send(data)
    const newMessage: EmailMessage = {
      id: `msg-${Date.now()}`,
      threadId: data.threadId || `thread-${Date.now()}`,
      folder: 'sent',
      from: { name: 'James Wilson', email: 'james.wilson@scholarly.app' },
      to: data.to.map((e) => ({ email: e })),
      cc: data.cc?.map((e) => ({ email: e })),
      subject: data.subject,
      snippet: data.body.slice(0, 100),
      body: data.body,
      date: new Date().toISOString(),
      isRead: true,
      isStarred: false,
      isMuted: false,
      labels: [],
      attachments: [],
      provider: 'gmail',
    };
    setMessages((prev) => [newMessage, ...prev]);
  }, []);

  const handleReply = useCallback(
    (messageId: string, body: string) => {
      if (!body.trim()) return;
      const original = messages.find((m) => m.id === messageId);
      if (!original) return;
      handleComposeSend({
        to: [original.from.email],
        subject: `Re: ${original.subject}`,
        body,
        inReplyTo: messageId,
        threadId: original.threadId,
      });
    },
    [messages, handleComposeSend]
  );

  const handleReplyAll = useCallback(
    (messageId: string, body: string) => {
      const original = messages.find((m) => m.id === messageId);
      if (!original) return;
      if (!body) {
        // Open compose with pre-filled recipients
        setComposeOpen(true);
        return;
      }
      const allRecipients = [
        original.from.email,
        ...original.to.map((a) => a.email),
        ...(original.cc?.map((a) => a.email) || []),
      ];
      handleComposeSend({
        to: allRecipients,
        subject: `Re: ${original.subject}`,
        body,
        inReplyTo: messageId,
        threadId: original.threadId,
      });
    },
    [messages, handleComposeSend]
  );

  const handleForward = useCallback(
    (messageId: string) => {
      const original = messages.find((m) => m.id === messageId);
      if (!original) return;
      setComposeOpen(true);
    },
    [messages]
  );

  return (
    <div className="full-bleed-page flex h-[calc(100vh-3.5rem)] flex-col">
      <ResizablePanelGroup orientation="horizontal" className="flex-1">
        {/* Folder sidebar */}
        <ResizablePanel defaultSize={20} minSize={14} maxSize={28}>
          <EmailFolderSidebar
            folders={DEMO_FOLDERS}
            selectedFolder={selectedFolder}
            labels={DEMO_LABELS}
            selectedLabel={selectedLabel}
            onFolderSelect={handleFolderSelect}
            onLabelSelect={handleLabelSelect}
            onCompose={() => setComposeOpen(true)}
          />
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Message list */}
        <ResizablePanel defaultSize={32} minSize={25}>
          <div className="flex h-full flex-col">
            <EmailToolbar
              selectedCount={selectedIds.size}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              onArchive={() => handleArchive()}
              onDelete={() => handleDelete()}
              onSnooze={() => {}}
              onStar={() => {
                selectedIds.forEach((id) => handleStarToggle(id));
                setSelectedIds(new Set());
              }}
              onMarkRead={() => {
                setMessages((prev) =>
                  prev.map((m) =>
                    selectedIds.has(m.id) ? { ...m, isRead: true } : m
                  )
                );
                setSelectedIds(new Set());
              }}
              onRefresh={() => {}}
            />
            <EmailMessageList
              messages={filteredMessages}
              selectedId={selectedMessage?.id}
              onSelect={handleMessageSelect}
              onStarToggle={handleStarToggle}
            />
          </div>
        </ResizablePanel>

        <ResizableHandle withHandle />

        {/* Message detail / empty state */}
        <ResizablePanel defaultSize={50} minSize={30}>
          {selectedMessage ? (
            <EmailMessageDetail
              message={selectedMessage}
              onReply={handleReply}
              onReplyAll={handleReplyAll}
              onForward={handleForward}
              onArchive={handleArchive}
              onDelete={handleDelete}
              onStarToggle={handleStarToggle}
              onMuteToggle={handleMuteToggle}
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center space-y-2">
                <Mail className="h-12 w-12 mx-auto opacity-20" />
                <p className="text-sm">Select a message to read</p>
              </div>
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>

      <EmailCompose
        open={composeOpen}
        onOpenChange={setComposeOpen}
        onSend={handleComposeSend}
      />
    </div>
  );
}
