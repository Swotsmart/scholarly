/**
 * Scholarly Unified Communications 4.0 — Plugin Barrel Export
 *
 * All 13 plugins: 5 original + 7 extended (including webinar) + 1 new (approval workflow)
 *
 * Import all:
 *   import { VideoPlugin, ChatPlugin, ApprovalWorkflowPlugin, ... } from '@scholarly/unified-communications/plugins';
 *
 * Import individually:
 *   import { ApprovalWorkflowPlugin } from '@scholarly/unified-communications/plugins/approval-workflow';
 */

// ── Original 5 ──
export { VideoPlugin } from './video';
export { ChatPlugin } from './chat';
export { TelephonyPlugin } from './telephony';
export { WhiteboardPlugin } from './whiteboard';
export { CloudFilesPlugin } from './cloud-files';

// ── Extended 6 ──
export { AITranscriptionPlugin } from './ai-transcription';
export { NotificationsPlugin } from './notifications';
export { SchedulingPlugin } from './scheduling';
export { SearchArchivePlugin } from './search-archive';
export { AnalyticsPlugin } from './analytics';
export { CompliancePlugin } from './compliance';

// ── Webinar ──
export { WebinarPlugin } from './webinar';

// ── v4.0: New Plugins ──
export { ApprovalWorkflowPlugin } from './approval-workflow';
export { ResourceAccessPlugin } from './resource-access';
export { CrmConnectorPlugin } from './crm-connector';
export { OmnichannelInboxPlugin } from './omnichannel-inbox';
