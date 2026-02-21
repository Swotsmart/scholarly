// =============================================================================
// EMAIL TYPES
// =============================================================================
// Types for the unified email client interface, supporting Gmail, Outlook,
// and Zimbra providers via the backend IntegrationsService.
// =============================================================================

export type EmailProvider = 'gmail' | 'outlook' | 'zimbra';

export interface EmailAddress {
  name?: string;
  email: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url?: string;
}

export interface EmailLabel {
  id: string;
  name: string;
  color?: string;
  type: 'system' | 'user';
}

export type EmailFolder =
  | 'inbox'
  | 'sent'
  | 'drafts'
  | 'trash'
  | 'archive'
  | 'spam'
  | 'starred';

export interface EmailFolderInfo {
  id: EmailFolder;
  name: string;
  unreadCount: number;
  totalCount: number;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  folder: EmailFolder;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  snippet: string;
  body: string;
  bodyHtml?: string;
  date: string;
  isRead: boolean;
  isStarred: boolean;
  isMuted: boolean;
  labels: EmailLabel[];
  attachments: EmailAttachment[];
  inReplyTo?: string;
  provider: EmailProvider;
}

export interface EmailThread {
  id: string;
  subject: string;
  messages: EmailMessage[];
  snippet: string;
  lastMessageDate: string;
  isRead: boolean;
  isStarred: boolean;
  isMuted: boolean;
  labels: EmailLabel[];
  participantCount: number;
}

export interface EmailComposeData {
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body: string;
  inReplyTo?: string;
  threadId?: string;
  attachments?: File[];
}

export interface EmailListFilters {
  folder?: EmailFolder;
  search?: string;
  label?: string;
  isRead?: boolean;
  isStarred?: boolean;
  page?: number;
  limit?: number;
}

export interface EmailListResponse {
  messages: EmailMessage[];
  total: number;
  hasMore: boolean;
  nextPageToken?: string;
}

export interface EmailFoldersResponse {
  folders: EmailFolderInfo[];
}
