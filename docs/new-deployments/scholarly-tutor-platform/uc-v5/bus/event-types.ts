/**
 * Chekd Unified Communications 3.0 — Bus Event Types
 *
 * The shared vocabulary of the event bus. Every event type is documented
 * here so plugins know what they can emit and subscribe to. Think of this
 * as the "dictionary" that all plugins share.
 */

// ─── Platform Events ─────────────────────────────────────────────
export interface PlatformPluginRegistered { pluginId: string; name: string; version: string; }
export interface PlatformPluginInitialized { pluginId: string; name: string; }
export interface PlatformHealthCheck { requestedBy?: string; }

// ─── Video / Room Events ─────────────────────────────────────────
export interface RoomCreated { roomId: string; name: string; createdBy: string; dealId?: string; tenantId?: string; }
export interface RoomClosed { roomId: string; duration: number; participantCount: number; }
export interface RoomParticipantJoined { roomId: string; userId: string; userName: string; role: string; }
export interface RoomParticipantLeft { roomId: string; userId: string; reason?: string; }
export interface RoomRecordingStarted { roomId: string; recordingId: string; }
export interface RoomRecordingStopped { roomId: string; recordingId: string; recordingUrl?: string; }
export interface RoomLocked { roomId: string; }
export interface RoomUnlocked { roomId: string; }

// ─── Chat Events ─────────────────────────────────────────────────
export interface ChatChannelCreated { channelId: string; name: string; channelType: string; tenantId: string; }
export interface ChatMessageSent { channelId: string; messageId: string; senderId: string; senderName: string; content: string; messageType: string; threadId?: string; }
export interface ChatMessageEdited { messageId: string; content: string; }
export interface ChatMessageDeleted { messageId: string; channelId: string; }
export interface ChatReactionAdded { messageId: string; userId: string; emoji: string; }
export interface ChatReactionRemoved { messageId: string; userId: string; emoji: string; }
export interface ChatPresenceChanged { userId: string; status: string; statusMessage?: string; }
export interface ChatTypingStarted { channelId: string; userId: string; userName: string; }
export interface ChatTypingStopped { channelId: string; userId: string; }

// ─── Telephony Events ────────────────────────────────────────────
export interface CallInitiated { callId: string; direction: string; from: string; to: string; tenantId: string; }
export interface CallAnswered { callId: string; twilioCallSid: string; }
export interface CallCompleted { callId: string; duration: number; costCents?: number; }
export interface CallBridgedToRoom { callId: string; roomId: string; callerName?: string; }
export interface PhoneNumberProvisioned { numberId: string; phoneNumber: string; tenantId: string; }
export interface PhoneNumberReleased { numberId: string; phoneNumber: string; tenantId: string; }

// ─── Whiteboard Events ───────────────────────────────────────────
export interface WhiteboardCreated { whiteboardId: string; name: string; roomId?: string; channelId?: string; }
export interface WhiteboardStrokeAdded { whiteboardId: string; strokeId: string; userId: string; }
export interface WhiteboardElementAdded { whiteboardId: string; elementId: string; userId: string; elementType: string; }
export interface WhiteboardElementUpdated { whiteboardId: string; elementId: string; userId: string; }
export interface WhiteboardCleared { whiteboardId: string; userId: string; }
export interface WhiteboardCollaboratorJoined { whiteboardId: string; userId: string; }
export interface WhiteboardCollaboratorLeft { whiteboardId: string; userId: string; }

// ─── Cloud Files Events ──────────────────────────────────────────
export interface CloudConnectionEstablished { connectionId: string; provider: string; userId: string; }
export interface CloudConnectionDisconnected { connectionId: string; provider: string; userId: string; }
export interface CloudFileShared { shareId: string; provider: string; fileName: string; sharedBy: string; scope: string; channelId?: string; roomId?: string; }

// ─── AI Transcription Events ─────────────────────────────────────
export interface TranscriptionRequested { recordingId: string; roomId: string; provider: string; }
export interface TranscriptionCompleted { transcriptionId: string; recordingId: string; roomId: string; durationSeconds: number; wordCount: number; }
export interface TranscriptionFailed { recordingId: string; roomId: string; error: string; }
export interface MeetingNotesGenerated { transcriptionId: string; roomId: string; noteId: string; actionItemCount: number; decisionCount: number; }
export interface SpeakerIdentified { transcriptionId: string; speakerId: string; speakerName: string; segmentCount: number; }

// ─── Notification Events ─────────────────────────────────────────
export interface NotificationQueued { notificationId: string; userId: string; channel: string; type: string; priority: string; }
export interface NotificationDelivered { notificationId: string; userId: string; channel: string; deliveredAt: string; }
export interface NotificationFailed { notificationId: string; userId: string; channel: string; error: string; }
export interface NotificationPreferencesUpdated { userId: string; channels: string[]; }
export interface DigestScheduled { digestId: string; userId: string; frequency: string; nextDeliveryAt: string; }

// ─── Scheduling & Calendar Events ────────────────────────────────
export interface MeetingScheduled { meetingId: string; title: string; scheduledBy: string; startsAt: string; endsAt: string; roomId?: string; attendeeCount: number; }
export interface MeetingRescheduled { meetingId: string; oldStartsAt: string; newStartsAt: string; }
export interface MeetingCancelled { meetingId: string; cancelledBy: string; reason?: string; }
export interface MeetingRoomAutoCreated { meetingId: string; roomId: string; }
export interface CalendarSynced { userId: string; provider: string; eventCount: number; }
export interface MeetingReminderSent { meetingId: string; userId: string; minutesBefore: number; }

// ─── Search & Archive Events ─────────────────────────────────────
export interface ContentIndexed { documentId: string; source: string; contentType: string; }
export interface SearchExecuted { queryId: string; userId: string; query: string; resultCount: number; durationMs: number; }
export interface ContentArchived { documentId: string; source: string; archivedAt: string; }
export interface IndexRebuilt { source: string; documentCount: number; durationMs: number; }

// ─── Analytics & Insights Events ─────────────────────────────────
export interface AnalyticsSnapshotCreated { snapshotId: string; period: string; metricCount: number; }
export interface EngagementScoreCalculated { userId: string; score: number; period: string; }
export interface UsageReportGenerated { reportId: string; tenantId: string; period: string; }
export interface AnomalyDetected { metricName: string; value: number; threshold: number; severity: string; }

// ─── Compliance & Retention Events ───────────────────────────────
export interface LegalHoldApplied { holdId: string; scope: string; scopeId: string; appliedBy: string; reason: string; }
export interface LegalHoldReleased { holdId: string; releasedBy: string; }
export interface DeletionBlocked { entityType: string; entityId: string; holdId: string; attemptedBy: string; }
export interface RetentionPolicyApplied { policyId: string; tenantId: string; retentionDays: number; }
export interface ComplianceExportGenerated { exportId: string; tenantId: string; scope: string; recordCount: number; }
export interface AuditRecordCreated { auditId: string; action: string; entityType: string; entityId: string; userId: string; }

// ─── Event Map (for typed bus.emit and bus.on) ───────────────────
export interface UCEventMap {
  'platform:plugin-registered': PlatformPluginRegistered;
  'platform:plugin-initialized': PlatformPluginInitialized;
  'platform:health-check': PlatformHealthCheck;

  'room:created': RoomCreated;
  'room:closed': RoomClosed;
  'room:participant-joined': RoomParticipantJoined;
  'room:participant-left': RoomParticipantLeft;
  'room:recording-started': RoomRecordingStarted;
  'room:recording-stopped': RoomRecordingStopped;
  'room:locked': RoomLocked;
  'room:unlocked': RoomUnlocked;

  'chat:channel-created': ChatChannelCreated;
  'chat:message-sent': ChatMessageSent;
  'chat:message-edited': ChatMessageEdited;
  'chat:message-deleted': ChatMessageDeleted;
  'chat:reaction-added': ChatReactionAdded;
  'chat:reaction-removed': ChatReactionRemoved;
  'chat:presence-changed': ChatPresenceChanged;
  'chat:typing-started': ChatTypingStarted;
  'chat:typing-stopped': ChatTypingStopped;

  'call:initiated': CallInitiated;
  'call:answered': CallAnswered;
  'call:completed': CallCompleted;
  'call:bridged-to-room': CallBridgedToRoom;
  'phone:provisioned': PhoneNumberProvisioned;
  'phone:released': PhoneNumberReleased;

  'whiteboard:created': WhiteboardCreated;
  'whiteboard:stroke-added': WhiteboardStrokeAdded;
  'whiteboard:element-added': WhiteboardElementAdded;
  'whiteboard:element-updated': WhiteboardElementUpdated;
  'whiteboard:cleared': WhiteboardCleared;
  'whiteboard:collaborator-joined': WhiteboardCollaboratorJoined;
  'whiteboard:collaborator-left': WhiteboardCollaboratorLeft;

  'cloud:connection-established': CloudConnectionEstablished;
  'cloud:connection-disconnected': CloudConnectionDisconnected;
  'cloud:file-shared': CloudFileShared;

  // AI Transcription
  'transcription:requested': TranscriptionRequested;
  'transcription:completed': TranscriptionCompleted;
  'transcription:failed': TranscriptionFailed;
  'transcription:notes-generated': MeetingNotesGenerated;
  'transcription:speaker-identified': SpeakerIdentified;

  // Notifications
  'notification:queued': NotificationQueued;
  'notification:delivered': NotificationDelivered;
  'notification:failed': NotificationFailed;
  'notification:preferences-updated': NotificationPreferencesUpdated;
  'notification:digest-scheduled': DigestScheduled;

  // Scheduling & Calendar
  'meeting:scheduled': MeetingScheduled;
  'meeting:rescheduled': MeetingRescheduled;
  'meeting:cancelled': MeetingCancelled;
  'meeting:room-auto-created': MeetingRoomAutoCreated;
  'meeting:calendar-synced': CalendarSynced;
  'meeting:reminder-sent': MeetingReminderSent;

  // Search & Archive
  'search:content-indexed': ContentIndexed;
  'search:executed': SearchExecuted;
  'search:content-archived': ContentArchived;
  'search:index-rebuilt': IndexRebuilt;

  // Analytics & Insights
  'analytics:snapshot-created': AnalyticsSnapshotCreated;
  'analytics:engagement-calculated': EngagementScoreCalculated;
  'analytics:report-generated': UsageReportGenerated;
  'analytics:anomaly-detected': AnomalyDetected;

  // Compliance & Retention
  'compliance:hold-applied': LegalHoldApplied;
  'compliance:hold-released': LegalHoldReleased;
  'compliance:deletion-blocked': DeletionBlocked;
  'compliance:retention-applied': RetentionPolicyApplied;
  'compliance:export-generated': ComplianceExportGenerated;
  'compliance:audit-created': AuditRecordCreated;

  // Webinar
  'webinar:created': WebinarCreated;
  'webinar:updated': WebinarUpdated;
  'webinar:cancelled': WebinarCancelled;
  'webinar:deleted': WebinarDeleted;
  'webinar:registration-opened': WebinarRegistrationOpened;
  'webinar:registration-closed': WebinarRegistrationClosed;
  'webinar:attendee-registered': WebinarAttendeeRegistered;
  'webinar:attendee-unregistered': WebinarAttendeeUnregistered;
  'webinar:rehearsal-started': WebinarRehearsalStarted;
  'webinar:rehearsal-ended': WebinarRehearsalEnded;
  'webinar:broadcast-started': WebinarBroadcastStarted;
  'webinar:broadcast-ended': WebinarBroadcastEnded;
  'webinar:participant-joined': WebinarParticipantJoined;
  'webinar:participant-left': WebinarParticipantLeft;
  'webinar:participant-promoted': WebinarParticipantPromoted;
  'webinar:participant-demoted': WebinarParticipantDemoted;
  'webinar:question-submitted': WebinarQuestionSubmitted;
  'webinar:question-answered': WebinarQuestionAnswered;
  'webinar:question-dismissed': WebinarQuestionDismissed;
  'webinar:question-highlighted': WebinarQuestionHighlighted;
  'webinar:poll-created': WebinarPollCreated;
  'webinar:poll-launched': WebinarPollLaunched;
  'webinar:poll-closed': WebinarPollClosed;
  'webinar:poll-vote-cast': WebinarPollVoteCast;
  'webinar:poll-results-shared': WebinarPollResultsShared;
  'webinar:reaction-sent': WebinarReactionSent;
  'webinar:chat-message-sent': WebinarChatMessageSent;
  'webinar:recording-started': WebinarRecordingStarted;
  'webinar:recording-stopped': WebinarRecordingStopped;
  'webinar:breakout-created': WebinarBreakoutCreated;
  'webinar:breakout-started': WebinarBreakoutStarted;
  'webinar:breakout-ended': WebinarBreakoutEnded;
  'webinar:breakout-recalled': WebinarBreakoutRecalled;
  'webinar:ai-insight-generated': WebinarAIInsightGenerated;
  'webinar:ai-question-triaged': WebinarAIQuestionTriaged;
  'webinar:ai-sentiment-updated': WebinarAISentimentUpdated;
  'webinar:ai-engagement-alert': WebinarAIEngagementAlert;
  'webinar:ai-timing-alert': WebinarAITimingAlert;
  'webinar:resource-shared': WebinarResourceShared;
  'webinar:cta-triggered': WebinarCTATriggered;
  'webinar:post-event-report-generated': WebinarPostEventReportGenerated;
  'webinar:persistence-degraded': WebinarPersistenceDegraded;
  'webinar:flush-metrics': WebinarFlushMetrics;
  'webinar:email-dispatch': WebinarEmailDispatch;

  // Approval Workflow (v4.0)
  'approval:request-submitted': ApprovalRequestSubmittedBusEvent;
  'approval:request-assigned': ApprovalRequestAssignedBusEvent;
  'approval:request-approved': ApprovalRequestApprovedBusEvent;
  'approval:request-rejected': ApprovalRequestRejectedBusEvent;
  'approval:request-escalated': ApprovalRequestEscalatedBusEvent;
  'approval:execution-started': ApprovalExecutionStartedBusEvent;
  'approval:execution-completed': ApprovalExecutionCompletedBusEvent;
  'approval:execution-failed': ApprovalExecutionFailedBusEvent;
  'approval:request-expired': ApprovalRequestExpiredBusEvent;
  'approval:request-cancelled': ApprovalRequestCancelledBusEvent;
}

// ─── Webinar Events ─────────────────────────────────────────────────────
export interface WebinarCreated { webinarId: string; title: string; createdBy: string; tenantId: string; maxParticipants: number; }
export interface WebinarUpdated { webinarId: string; title: string; }
export interface WebinarCancelled { webinarId: string; title: string; cancelledBy: string; reason?: string; }
export interface WebinarDeleted { webinarId: string; }
export interface WebinarRegistrationOpened { webinarId: string; title: string; }
export interface WebinarRegistrationClosed { webinarId: string; registrationCount: number; }
export interface WebinarAttendeeRegistered { webinarId: string; registrationId: string; email: string; name: string; status: string; }
export interface WebinarAttendeeUnregistered { webinarId: string; registrationId: string; }
export interface WebinarRehearsalStarted { webinarId: string; greenRoomId: string; }
export interface WebinarRehearsalEnded { webinarId: string; }
export interface WebinarBroadcastStarted { webinarId: string; title: string; roomId: string; maxParticipants: number; }
export interface WebinarBroadcastEnded { webinarId: string; title: string; durationMinutes: number; peakParticipants: number; }
export interface WebinarParticipantJoined { webinarId: string; participantId: string; userId: string; userName: string; role: string; mediaMode: string; }
export interface WebinarParticipantLeft { webinarId: string; participantId: string; userId: string; reason?: string; }
export interface WebinarParticipantPromoted { webinarId: string; participantId: string; oldRole: string; newRole: string; }
export interface WebinarParticipantDemoted { webinarId: string; participantId: string; oldRole: string; newRole: string; }
export interface WebinarQuestionSubmitted { webinarId: string; questionId: string; submittedBy: string; isAnonymous: boolean; }
export interface WebinarQuestionAnswered { webinarId: string; questionId: string; }
export interface WebinarQuestionDismissed { webinarId: string; questionId: string; }
export interface WebinarQuestionHighlighted { webinarId: string; questionId: string; content: string; submitterName: string; }
export interface WebinarPollCreated { webinarId: string; pollId: string; question: string; }
export interface WebinarPollLaunched { webinarId: string; pollId: string; question: string; }
export interface WebinarPollClosed { webinarId: string; pollId: string; totalVotes: number; responseRate: number; }
export interface WebinarPollVoteCast { webinarId: string; pollId: string; userId: string; }
export interface WebinarPollResultsShared { webinarId: string; pollId: string; results: { text: string; percentage: number }[]; }
export interface WebinarReactionSent { webinarId: string; userId: string; type: string; }
export interface WebinarChatMessageSent { webinarId: string; messageId: string; senderId: string; scope: string; isAnnouncement: boolean; }
export interface WebinarRecordingStarted { webinarId: string; recordingId: string; }
export interface WebinarRecordingStopped { webinarId: string; recordingId: string; }
export interface WebinarBreakoutCreated { webinarId: string; breakoutId: string; roomCount: number; }
export interface WebinarBreakoutStarted { webinarId: string; breakoutId: string; roomCount: number; participantCount: number; }
export interface WebinarBreakoutEnded { webinarId: string; breakoutId: string; }
export interface WebinarBreakoutRecalled { webinarId: string; breakoutId: string; }
export interface WebinarAIInsightGenerated { webinarId: string; insightId: string; type: string; severity: string; title: string; }
export interface WebinarAIQuestionTriaged { webinarId: string; clusterCount: number; duplicateGroupCount: number; flaggedCount: number; }
export interface WebinarAISentimentUpdated { webinarId: string; overall: number; trending: string; }
export interface WebinarAIEngagementAlert { webinarId: string; attentionScore: number; trending: string; suggestedAction: string; }
export interface WebinarAITimingAlert { webinarId: string; overByMinutes: number; }
export interface WebinarResourceShared { webinarId: string; resourceId: string; title: string; }
export interface WebinarCTATriggered { webinarId: string; ctaId: string; title: string; url: string; }
export interface WebinarPostEventReportGenerated { webinarId: string; attendanceRate: number; }
export interface WebinarPersistenceDegraded { webinarId: string; consecutiveFailures: number; lastError: string; timestamp: Date; }
export interface WebinarFlushMetrics { webinarId: string; cycleNumber: number; durationMs: number; storesFlushed: string[]; recordsWritten: number; errors: string[]; timestamp: Date; }
export interface WebinarEmailDispatch { notificationId: string; to: string; toName: string; from: string; fromName: string; subject: string; html: string; icsAttachment?: string; emailType: string; webinarId: string; registrationId: string; dispatchedAt: Date; }

// ─── Approval Workflow Events (v4.0) ────────────────────────────────
export interface ApprovalRequestSubmittedBusEvent { requestId: string; workflowId: string; requesterId: string; requesterName: string; tenantId: string; priority: string; }
export interface ApprovalRequestAssignedBusEvent { requestId: string; assigneeId: string; assigneeName: string; step: number; workflowId: string; tenantId: string; }
export interface ApprovalRequestApprovedBusEvent { requestId: string; approverId: string; approverName: string; step: number; conditions?: string[]; isFinalApproval: boolean; workflowId: string; tenantId: string; }
export interface ApprovalRequestRejectedBusEvent { requestId: string; approverId: string; approverName: string; step: number; reason: string; workflowId: string; tenantId: string; }
export interface ApprovalRequestEscalatedBusEvent { requestId: string; fromStep: number; toStep: number; fromId: string; toId: string; reason: string; workflowId: string; tenantId: string; }
export interface ApprovalExecutionStartedBusEvent { requestId: string; hookId: string; hookName: string; workflowId: string; tenantId: string; }
export interface ApprovalExecutionCompletedBusEvent { requestId: string; hookId: string; hookName: string; result: { success: boolean; message?: string; data?: Record<string, unknown> }; workflowId: string; tenantId: string; }
export interface ApprovalExecutionFailedBusEvent { requestId: string; hookId: string; hookName: string; error: string; workflowId: string; tenantId: string; }
export interface ApprovalRequestExpiredBusEvent { requestId: string; expiryReason: string; workflowId: string; tenantId: string; }
export interface ApprovalRequestCancelledBusEvent { requestId: string; cancelledBy: string; reason?: string; workflowId: string; tenantId: string; }
